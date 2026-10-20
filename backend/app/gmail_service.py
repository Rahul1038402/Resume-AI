import os
import json
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import base64
import re
from groq import Groq
import time

from app.llm_config import PRIMARY_MODEL, FALLBACK_MODEL, REASONING_EFFORT

logger = logging.getLogger(__name__)

class GmailSyncService:
    """Service to sync job applications from Gmail using AI classification"""
    
    # Optimized keyword list (fewer = faster Gmail search)
    JOB_KEYWORDS = [
        # Core application terms
        'application', 'applied',
        
        # Interview terms
        'interview', 'screening',
        
        # Status terms
        'offer', 'selected',
        
        # Position terms
        'position', 'role', 'candidate',
        
        # Confirmation phrases
        'thank you for applying', 'application received'
    ]
    
    # Patterns to exclude (noise reduction)
    EXCLUDE_PATTERNS = [
        'newsletter', 'digest', 'unsubscribe', 
        'promotional', 'marketing', 'webinar'
    ]
    
    # High-confidence sender patterns (skip AI classification)
    TRUSTED_SENDERS = [
        'linkedin.com', 'indeed.com', 'glassdoor.com',
        'greenhouse.io', 'lever.co', 'workday.com',
        'myworkdayjobs.com', 'smartrecruiters.com',
        'taleo.net', 'jobvite.com', 'icims.com',
        'wellfound.com', 'angellist.com',
        'careers@', 'recruiting@', 'talent@', 
        'jobs@', 'jobapps@', 'hiring@'
    ]
    
    def __init__(self, groq_api_key: str):
        self.groq_client = Groq(api_key=groq_api_key)
        self.ai_call_count = 0  # Track API calls
        self.last_ai_call_time = 0  # Track timing
        
    def build_gmail_service(self, credentials_dict):
        """Build Gmail API service from stored credentials_dict (Supabase)"""
        try:
            logger.info(f"Credentials type: {type(credentials_dict)}")
            
            # Handle if credentials_dict is a JSON string
            if isinstance(credentials_dict, str):
                logger.info("Credentials is a string, parsing as JSON")
                try:
                    credentials_dict = json.loads(credentials_dict)
                except json.JSONDecodeError as e:
                    raise ValueError(f"Invalid JSON string in credentials: {e}")
            
            if not isinstance(credentials_dict, dict):
                raise ValueError(f"Credentials must be a dict or JSON string, got {type(credentials_dict)}")
            
            logger.info(f"Credentials keys: {list(credentials_dict.keys())}")
            
            # Read Google OAuth client from backend env
            client_id = os.environ.get("GOOGLE_CLIENT_ID")
            client_secret = os.environ.get("GOOGLE_CLIENT_SECRET")
            
            if not client_id or not client_secret:
                raise ValueError("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in environment")

            if "refresh_token" not in credentials_dict:
                raise ValueError(f"Missing refresh_token in stored Gmail credentials. Available keys: {list(credentials_dict.keys())}")

            authorized_info = {
                "client_id": client_id,
                "client_secret": client_secret,
                "refresh_token": credentials_dict["refresh_token"],
                "token": credentials_dict.get("token"),
                "token_uri": "https://oauth2.googleapis.com/token",
                "scopes": [
                    credentials_dict.get(
                        "scope",
                        "https://www.googleapis.com/auth/gmail.readonly",
                    )
                ],
                "type": "authorized_user",
            }

            creds = Credentials.from_authorized_user_info(authorized_info)

            # Refresh if expired
            if creds.expired and creds.refresh_token:
                logger.info("Token expired, refreshing...")
                creds.refresh(Request())

            service = build("gmail", "v1", credentials=creds)
            
            # Return updated credentials as dict
            updated_creds = json.loads(creds.to_json())
            return service, updated_creds

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse credentials JSON: {str(e)}")
            raise ValueError(f"Invalid JSON in credentials: {str(e)}")
        except Exception as e:
            logger.error(f"Failed to build Gmail service: {str(e)}")
            raise
    
    def fetch_job_emails(
        self, 
        service, 
        last_sync_time: Optional[str] = None,
        max_results: int = 20,
        scan_days: int = 7
    ) -> List[Dict[str, Any]]:
        """
        Fetch job-related emails using broad search + AI classification
        
        Args:
            service: Gmail API service
            last_sync_time: ISO datetime string of last sync
            max_results: Maximum emails to fetch (default: 20)
            scan_days: How many days back to scan (default: 7)
        """
        try:
            query_parts = []
            
            # Build optimized subject-based query (only 10 keywords for speed)
            subject_queries = [f'subject:"{keyword}"' for keyword in self.JOB_KEYWORDS[:10]]
            query_parts.append(f"({' OR '.join(subject_queries)})")
            
            # Add time filter
            if last_sync_time:
                try:
                    dt = datetime.fromisoformat(last_sync_time.replace('Z', '+00:00'))
                    gmail_date = dt.strftime('%Y/%m/%d')
                    query_parts.append(f'after:{gmail_date}')
                    logger.info(f"Scanning emails after last sync: {gmail_date}")
                except:
                    days_ago = (datetime.now() - timedelta(days=scan_days)).strftime('%Y/%m/%d')
                    query_parts.append(f'after:{days_ago}')
                    logger.info(f"Last sync parsing failed, scanning last {scan_days} days")
            else:
                # First sync: use scan_days parameter
                days_ago = (datetime.now() - timedelta(days=scan_days)).strftime('%Y/%m/%d')
                query_parts.append(f'after:{days_ago}')
                logger.info(f"First sync: scanning last {scan_days} days")
            
            # Exclude common noise patterns
            for pattern in self.EXCLUDE_PATTERNS[:3]:  # Only top 3 exclusions
                query_parts.append(f'-subject:"{pattern}"')
            
            query = ' '.join(query_parts)
            logger.info(f"Gmail search query: {query}")
            
            # Fetch message IDs
            results = service.users().messages().list(
                userId='me',
                q=query,
                maxResults=max_results
            ).execute()
            
            messages = results.get('messages', [])
            logger.info(f"Found {len(messages)} potential emails from Gmail search")
            
            # Fetch and classify each email
            job_emails = []
            for idx, msg in enumerate(messages):
                try:
                    logger.info(f"Processing email {idx+1}/{len(messages)}")
                    
                    email_data = service.users().messages().get(
                        userId='me',
                        id=msg['id'],
                        format='full'
                    ).execute()
                    
                    parsed_email = self._parse_email(email_data)
                    if not parsed_email:
                        continue
                    
                    # Check if this is a job-related email
                    if self._is_job_related_email(parsed_email):
                        job_emails.append(parsed_email)
                        logger.info(f"✓ Job email: {parsed_email['subject'][:50]}")
                    else:
                        logger.info(f"✗ Not job related: {parsed_email['subject'][:50]}")
                        
                except Exception as e:
                    logger.error(f"Error fetching email {msg['id']}: {str(e)}")
                    continue
            
            logger.info(f"After classification: {len(job_emails)} job-related emails")
            return job_emails
            
        except HttpError as error:
            logger.error(f"Gmail API error: {error}")
            raise
    
    def _is_job_related_email(self, email: Dict[str, Any]) -> bool:
        """Enhanced heuristic checks to reduce AI calls"""
        sender_lower = email['sender'].lower()
        subject_lower = email['subject'].lower()
        body_preview = email['body'][:1000].lower()
        
        # Exclude obvious non-job emails (no AI needed)
        exclude_patterns = self.EXCLUDE_PATTERNS + [
            'password', 'security alert', 'sign in', 'verify',
            'billing', 'invoice', 'payment', 'subscription',
            'social', 'friend request', 'comment', 'like'
        ]
        if any(pattern in subject_lower for pattern in exclude_patterns):
            logger.info(f"Quick exclude: {subject_lower}")
            return False
        
        # High-confidence sender domains (no AI needed)
        if any(pattern in sender_lower for pattern in self.TRUSTED_SENDERS):
            logger.info(f"High-confidence sender: {sender_lower}")
            return True
        
        # High-confidence subject phrases (no AI needed)
        high_confidence_phrases = [
            'application received', 'thank you for applying',
            'interview invitation', 'offer letter', 'congratulations',
            'we received your application', 'application status',
            'you have been selected', 'move forward', 'next steps',
            'schedule an interview', 'phone screen', 'technical interview',
            'unfortunately', 'not moving forward', 'other candidates'
        ]
        if any(phrase in subject_lower for phrase in high_confidence_phrases):
            logger.info(f"High-confidence subject: {subject_lower}")
            return True
        
        # Check body for strong job signals (no AI needed)
        strong_body_signals = [
            'we have received your application',
            'thank you for your interest in',
            'position you applied for',
            'would like to schedule',
            'invite you to interview',
            'pleased to offer you',
            'regret to inform you'
        ]
        if any(signal in body_preview for signal in strong_body_signals):
            logger.info(f"Strong body signal found")
            return True
        
        # Only use AI for truly ambiguous cases
        logger.info(f"Using AI for ambiguous email: {subject_lower[:50]}")
        return self._ai_classify_email(email)
    
    def _ai_classify_email(self, email: Dict[str, Any]) -> bool:
        """Use Groq LLM with rate limit handling"""
        try:
            # Rate limiting: Wait between calls
            current_time = time.time()
            time_since_last_call = current_time - self.last_ai_call_time
            
            # Ensure at least 0.5 seconds between API calls
            if time_since_last_call < 0.5:
                time.sleep(0.5 - time_since_last_call)
            
            self.ai_call_count += 1
            logger.info(f"AI call #{self.ai_call_count}")
            
            prompt = f"""Is this email related to a job application, job interview, job offer, or job recruitment?

Consider it a JOB EMAIL if:
- It's about applying to a job
- It's an interview invitation or scheduling
- It's a job offer or rejection
- It's from a recruiter about a position
- It's from a company's HR/careers team

Reply with ONLY "YES" or "NO".

Email Details:
Subject: {email['subject']}
From: {email['sender']}
Body preview: {email['body'][:500]}
"""
            
            # Add retry logic
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    response = self.groq_client.chat.completions.create(
                        model=FALLBACK_MODEL,
                        messages=[{"role": "user", "content": prompt}],
                        temperature=0.1,
                        # Reasoning tokens are billed to max_tokens, so a 10
                        # token budget would come back empty
                        max_tokens=512,
                        reasoning_effort=REASONING_EFFORT,
                    )
                    
                    self.last_ai_call_time = time.time()
                    
                    result = (response.choices[0].message.content or '').strip().upper()
                    is_job_email = 'YES' in result
                    
                    logger.info(f"AI classification: {result}")
                    return is_job_email
                    
                except Exception as e:
                    if '429' in str(e) and attempt < max_retries - 1:
                        wait_time = (attempt + 1) * 2  # 2s, 4s, 6s
                        logger.warning(f"Rate limit hit, waiting {wait_time}s...")
                        time.sleep(wait_time)
                        continue
                    else:
                        raise
            
            # All retries exhausted without a verdict
            return True
            
        except Exception as e:
            logger.error(f"AI classification error: {str(e)}")
            return True  # Default to True to avoid missing emails
    
    def _parse_email(self, email_data: dict) -> Optional[Dict[str, Any]]:
        """Parse Gmail API email response"""
        try:
            headers = {h['name'].lower(): h['value'] 
                      for h in email_data['payload'].get('headers', [])}
            
            # Extract basic info
            subject = headers.get('subject', '')
            sender = headers.get('from', '')
            date_str = headers.get('date', '')
            message_id = email_data['id']
            
            # Parse email body
            body = self._extract_email_body(email_data['payload'])
            
            # Parse date
            try:
                from email.utils import parsedate_to_datetime
                date = parsedate_to_datetime(date_str)
            except:
                date = datetime.now()
            
            return {
                'message_id': message_id,
                'subject': subject,
                'sender': sender,
                'date': date.isoformat(),
                'body': body[:5000]  # Limit body length
            }
        except Exception as e:
            logger.error(f"Error parsing email: {str(e)}")
            return None
    
    def _extract_email_body(self, payload: dict) -> str:
        """Extract text body from email payload"""
        body = ""
        
        if 'parts' in payload:
            for part in payload['parts']:
                if part['mimeType'] == 'text/plain':
                    if 'data' in part['body']:
                        body = base64.urlsafe_b64decode(
                            part['body']['data']
                        ).decode('utf-8', errors='ignore')
                        break
                elif part['mimeType'] == 'text/html' and not body:
                    if 'data' in part['body']:
                        html_body = base64.urlsafe_b64decode(
                            part['body']['data']
                        ).decode('utf-8', errors='ignore')
                        # Simple HTML stripping
                        body = re.sub('<[^<]+?>', '', html_body)
        elif 'body' in payload and 'data' in payload['body']:
            body = base64.urlsafe_b64decode(
                payload['body']['data']
            ).decode('utf-8', errors='ignore')
        
        return body.strip()
    
    def extract_job_data_from_email(self, email: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Use Groq LLM to extract structured job application data from email"""
        try:
            prompt = f"""Extract job application information from this email.

Email Subject: {email['subject']}
From: {email['sender']}
Date: {email['date']}
Body:
{email['body'][:3000]}

Extract the following information and respond ONLY with valid JSON:
{{
  "company_name": "Company name (or null if not found)",
  "job_title": "Job title/role (or null if not found)",
  "application_date": "Date in YYYY-MM-DD format (use email date if not specified)",
  "status": "One of: applied, in_progress, got_offer, not_selected",
  "platform": "One of: LinkedIn, Indeed, Glassdoor, Wellfound, Company Website, or Other",
  "confidence": "high, medium, or low",
  "notes": "Brief summary of the email content"
}}

Status guidelines:
- "applied" for application confirmations or submissions
- "in_progress" for interview invitations, screening calls, assessments
- "got_offer" for offer letters or job offers
- "not_selected" for rejections

Platform detection:
- Check email sender domain (e.g., @linkedin.com = LinkedIn)
- If from company domain directly, use "Company Website"
- Check email content for platform mentions

Respond ONLY with the JSON object, no additional text.
"""
            
            response = self.groq_client.chat.completions.create(
                model=PRIMARY_MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=2000,
                reasoning_effort=REASONING_EFFORT,
                response_format={"type": "json_object"},
            )
            
            result_text = (response.choices[0].message.content or '').strip()
            if not result_text:
                logger.error("Empty extraction response from model")
                return None
            
            # Clean up response (remove markdown code blocks if present)
            result_text = result_text.replace('```json', '').replace('```', '').strip()
            
            # Parse JSON
            data = json.loads(result_text)
            
            # Add message ID for tracking
            data['email_message_id'] = email['message_id']
            data['email_subject'] = email['subject']
            data['email_sender'] = email['sender']
            
            # Validate confidence
            if data.get('confidence') == 'low' or not data.get('company_name'):
                logger.info(f"Low confidence extraction for email: {email['subject']}")
                return None
            
            # Ensure required fields
            if not data.get('job_title') or not data.get('company_name'):
                logger.info(f"Missing required fields in email: {email['subject']}")
                return None
            
            return data
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response as JSON: {str(e)}")
            logger.error(f"Response was: {result_text if 'result_text' in locals() else 'N/A'}")
            return None
        except Exception as e:
            logger.error(f"Error extracting job data with LLM: {str(e)}")
            return None
    
    def sync_emails(
        self, 
        credentials_dict: dict,
        last_sync_time: Optional[str] = None,
        cached_message_ids: Optional[List[str]] = None,
        scan_days: int = 7
    ) -> Dict[str, Any]:
        """
        Main sync function: fetch emails and extract job applications
        
        Args:
            credentials_dict: Gmail OAuth credentials
            last_sync_time: ISO datetime of last sync
            cached_message_ids: List of already-processed message IDs
            scan_days: How many days back to scan (default: 7)
        
        Returns:
            {
                'status': 'success' | 'no_changes' | 'error',
                'new_applications': [...],
                'message_ids': [...],
                'checked_count': int,
                'extracted_count': int,
                'updated_credentials': {...}
            }
        """
        try:
            logger.info(f"Starting sync (scan_days: {scan_days})")
            
            # Build Gmail service
            service, updated_creds = self.build_gmail_service(credentials_dict)
            
            # Fetch job-related emails (with AI classification)
            emails = self.fetch_job_emails(
                service, 
                last_sync_time,
                max_results=20,  # Limit to 20 emails
                scan_days=scan_days
            )
            
            if not emails:
                return {
                    'status': 'no_changes',
                    'new_applications': [],
                    'message_ids': [],
                    'checked_count': 0,
                    'extracted_count': 0,
                    'updated_credentials': updated_creds
                }
            
            # Filter out cached emails
            cached_ids = set(cached_message_ids or [])
            new_emails = [e for e in emails if e['message_id'] not in cached_ids]
            
            logger.info(f"Found {len(new_emails)} new emails after filtering cache")
            
            if not new_emails:
                return {
                    'status': 'no_changes',
                    'new_applications': [],
                    'message_ids': [e['message_id'] for e in emails],
                    'checked_count': len(emails),
                    'extracted_count': 0,
                    'updated_credentials': updated_creds
                }
            
            # Extract job data from new emails
            applications = []
            for idx, email in enumerate(new_emails):
                logger.info(f"Extracting data from email {idx+1}/{len(new_emails)}")
                job_data = self.extract_job_data_from_email(email)
                if job_data:
                    applications.append(job_data)
            
            logger.info(f"Successfully extracted {len(applications)} job applications")
            
            return {
                'status': 'success',
                'new_applications': applications,
                'message_ids': [e['message_id'] for e in emails],
                'checked_count': len(emails),
                'extracted_count': len(applications),
                'updated_credentials': updated_creds
            }
            
        except Exception as e:
            logger.error(f"Sync error: {str(e)}", exc_info=True)
            return {
                'status': 'error',
                'error': str(e),
                'new_applications': [],
                'message_ids': [],
                'checked_count': 0,
                'extracted_count': 0
            }