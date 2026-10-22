import os
import json
import logging
from flask import Blueprint, request, jsonify
from datetime import datetime

from app.gmail_service import GmailSyncService
from app.rate_limit import DailyLimiter

logger = logging.getLogger(__name__)

gmail_routes = Blueprint("gmail_routes", __name__)

# A sync is the most expensive thing a visitor can ask for: it can reach
# twenty-odd emails, each of which may cost a classification and a share of an
# extraction call, against a daily token budget shared with the analyser and
# the builder's assistant. Three a day is more than auto-sync needs and leaves
# room for the rest of the app.
SYNCS_PER_DAY = int(os.environ.get("GMAIL_SYNCS_PER_DAY", "3"))
sync_limiter = DailyLimiter(SYNCS_PER_DAY, name="Gmail sync")

_service = None


def get_service() -> GmailSyncService:
    """Built on first use, not at import.

    At module scope this read GROQ_API_KEY before the environment was
    necessarily loaded, so a missing key failed the whole blueprint import
    rather than the one request that needed it.
    """
    global _service
    if _service is None:
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY environment variable not set")
        _service = GmailSyncService(api_key)
    return _service


@gmail_routes.route("/gmail/sync", methods=["POST"])
def sync_gmail():
    """
    Sync job applications from Gmail

    Request body:
    {
        "credentials": {...},  // Google OAuth credentials
        "last_sync_time": "ISO datetime string or null",
        "cached_message_ids": ["msg_id_1", "msg_id_2", ...],
        "scan_days": 7  // Optional: How many days to scan (default: 7)
    }

    Response:
    {
        "status": "success" | "no_changes" | "reauth_required" | "error",
        "new_applications": [...],
        "message_ids": [...],   // the full set to store, old and new together
        "checked_count": int,
        "extracted_count": int,
        "rate_limit": {...},
        "updated_credentials": {...}
    }
    """
    allowed, quota = sync_limiter.check()
    if not allowed:
        return jsonify({
            "status": "rate_limited",
            "error": quota["error"],
            "rate_limit": quota,
            "new_applications": [],
            "message_ids": [],
            "checked_count": 0,
            "extracted_count": 0,
        }), 429

    try:
        data = request.get_json()

        if not data or 'credentials' not in data:
            sync_limiter.refund()
            return jsonify({"error": "Gmail credentials required"}), 400

        credentials = data['credentials']

        # Handle case where credentials might be nested or double-encoded
        if isinstance(credentials, str):
            try:
                credentials = json.loads(credentials)
            except json.JSONDecodeError:
                sync_limiter.refund()
                return jsonify({"error": "Invalid credentials format"}), 400

        if not isinstance(credentials, dict):
            sync_limiter.refund()
            return jsonify({
                "error": f"Credentials must be an object, got {type(credentials).__name__}"
            }), 400

        if 'refresh_token' not in credentials:
            # Not a bad request so much as a connection that never completed.
            sync_limiter.refund()
            return jsonify({
                "status": "reauth_required",
                "error": "No refresh token is stored for this account. Reconnect Gmail.",
                "new_applications": [],
                "message_ids": [],
                "checked_count": 0,
                "extracted_count": 0,
            }), 200

        last_sync_time = data.get('last_sync_time')
        cached_message_ids = data.get('cached_message_ids', [])
        scan_days = data.get('scan_days', 7)
        try:
            scan_days = max(1, min(30, int(scan_days)))
        except (TypeError, ValueError):
            scan_days = 7

        logger.info(
            "Starting Gmail sync (last_sync: %s, cached: %d, scan_days: %d)",
            last_sync_time, len(cached_message_ids), scan_days,
        )

        result = get_service().sync_emails(
            credentials_dict=credentials,
            last_sync_time=last_sync_time,
            cached_message_ids=cached_message_ids,
            scan_days=scan_days
        )

        # A sync that could not authenticate did no work, so it should not
        # cost the user one of their three.
        if result.get("status") in ("reauth_required", "error"):
            sync_limiter.refund()

        result["rate_limit"] = sync_limiter.peek()

        logger.info(f"Sync completed: {result['status']}, found {result['extracted_count']} applications")

        return jsonify(result)

    except Exception as e:
        sync_limiter.refund()
        logger.error(f"Error in /gmail/sync: {str(e)}", exc_info=True)
        return jsonify({
            "status": "error",
            "error": str(e),
            "error_type": type(e).__name__,
            "new_applications": [],
            "message_ids": [],
            "checked_count": 0,
            "extracted_count": 0
        }), 500

@gmail_routes.route("/gmail/test-connection", methods=["POST"])
def test_gmail_connection():
    """
    Test Gmail API connection with user credentials

    Request body:
    {
        "credentials": {...}
    }
    """
    try:
        data = request.get_json()

        if not data or 'credentials' not in data:
            return jsonify({"error": "Gmail credentials required"}), 400

        service, updated_creds = get_service().build_gmail_service(data['credentials'])

        # Test by fetching profile
        profile = service.users().getProfile(userId='me').execute()

        return jsonify({
            "status": "success",
            "email": profile.get('emailAddress'),
            "messages_total": profile.get('messagesTotal', 0),
            "updated_credentials": updated_creds
        })

    except Exception as e:
        logger.error(f"Gmail connection test failed: {str(e)}", exc_info=True)
        return jsonify({
            "status": "error",
            "error": str(e),
            "error_type": type(e).__name__
        }), 500

@gmail_routes.route("/gmail/parse-email", methods=["POST"])
def parse_single_email():
    """
    Parse a single email for testing/debugging

    Request body:
    {
        "subject": "...",
        "sender": "...",
        "body": "...",
        "date": "..."
    }
    """
    try:
        data = request.get_json()

        required_fields = ['subject', 'sender', 'body', 'date']
        if not all(field in data for field in required_fields):
            return jsonify({"error": "Missing required fields"}), 400

        email = {
            'message_id': 'test_' + datetime.now().isoformat(),
            'subject': data['subject'],
            'sender': data['sender'],
            'body': data['body'],
            'date': data['date']
        }

        extracted = get_service().extract_job_data([email])

        if not extracted:
            return jsonify({
                "status": "no_extraction",
                "message": "Could not extract job application data from email"
            })

        return jsonify({
            "status": "success",
            "extracted_data": extracted[0]
        })

    except Exception as e:
        logger.error(f"Error parsing email: {str(e)}", exc_info=True)
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

@gmail_routes.route("/gmail/health", methods=["GET"])
def gmail_health():
    """Check if Gmail service is properly configured"""
    try:
        groq_key_exists = bool(os.environ.get("GROQ_API_KEY"))
        google_client_id = bool(os.environ.get('GOOGLE_CLIENT_ID'))
        google_client_secret = bool(os.environ.get('GOOGLE_CLIENT_SECRET'))

        all_configured = groq_key_exists and google_client_id and google_client_secret

        return jsonify({
            "status": "healthy" if all_configured else "degraded",
            "groq_configured": groq_key_exists,
            "google_client_id_configured": google_client_id,
            "google_client_secret_configured": google_client_secret,
            "syncs_per_day": SYNCS_PER_DAY,
            "message": "Gmail sync service is ready" if all_configured else "Missing required configuration"
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500
