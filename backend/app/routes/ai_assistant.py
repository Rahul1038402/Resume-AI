"""
AI Assistant Routes for All Resume Sections
"""
from flask import Blueprint, request, jsonify, Response, stream_with_context
from app.routes.ai_service import AIService
from app.prompts.project_prompts import ProjectPrompts
from app.prompts.summary_prompts import SummaryPrompts
from app.prompts.skills_prompts import SkillsPrompts
from app.prompts.experience_prompts import ExperiencePrompts
import json
from datetime import datetime, timedelta
from app.rate_limit import (
    MAX_TRACKED_KEYS, RESET_HOURS, get_client_key, prune_expired,
)

ai_bp = Blueprint('ai_assistant', __name__, url_prefix='/api/ai-assist')

# Initialize AI service
ai_service = AIService()

# Rate limiting storage (in-process; keyed by caller IP, not by a
# client-supplied session id that resets on every page load)
user_request_counts = {}

# Session totals, keyed by caller alone. These deliberately do NOT live in
# user_request_counts: that dict is keyed "<client>:<section>", so a session
# counter stored there could never climb past SECTION_LIMIT and the session
# cap was unreachable - seven sections meant 7 x 15 calls per client per day.
user_session_counts = {}

# Rate limit constants
SECTION_LIMIT = 15
SESSION_LIMIT = 50

def prune_expired_counts(current_time) -> None:
    """Drop expired buckets so the dicts cannot grow without bound."""
    for store in (user_request_counts, user_session_counts):
        prune_expired(store, current_time)

def get_bucket(store: dict, key: str, field: str, current_time):
    """Fetch a counter bucket, creating it or rolling it over as needed."""
    bucket = store.get(key)
    if bucket is None:
        bucket = store[key] = {field: 0, 'last_reset': current_time}
    elif current_time - bucket['last_reset'] > timedelta(hours=RESET_HOURS):
        bucket[field] = 0
        bucket['last_reset'] = current_time
    return bucket

def check_rate_limit(section: str) -> tuple[bool, dict]:
    """Check rate limits"""
    client = get_client_key()
    key = f"{client}:{section}"
    current_time = datetime.now()
    
    prune_expired_counts(current_time)
    
    counts = get_bucket(user_request_counts, key, 'section', current_time)
    totals = get_bucket(user_session_counts, client, 'session', current_time)
    
    # Check limits
    if counts['section'] >= SECTION_LIMIT:
        return False, {
            'error': f'Section limit reached ({SECTION_LIMIT} requests)',
            'limit_type': 'section',
            'remaining_section': 0,
            'remaining_session': max(0, SESSION_LIMIT - totals['session'])
        }
    
    if totals['session'] >= SESSION_LIMIT:
        return False, {
            'error': f'Session limit reached ({SESSION_LIMIT} requests)',
            'limit_type': 'session',
            'remaining_section': max(0, SECTION_LIMIT - counts['section']),
            'remaining_session': 0
        }
    
    # Increment
    counts['section'] += 1
    totals['session'] += 1
    
    return True, {
        'remaining_section': max(0, SECTION_LIMIT - counts['section']),
        'remaining_session': max(0, SESSION_LIMIT - totals['session'])
    }

def peek_rate_limit(section: str) -> dict:
    """What is left, without spending any of it.

    The interface used to assume a fresh 15 whenever the assistant mounted,
    which is wrong the moment someone switches sections and comes back: the
    server has been counting all along, so the panel claimed a full allowance
    while the real one was nearly gone. Reading the counters without touching
    them lets the UI show the number the server will actually enforce.
    """
    client = get_client_key()
    current_time = datetime.now()
    prune_expired_counts(current_time)

    section_used = user_request_counts.get(f"{client}:{section}", {}).get('section', 0)
    session_used = user_session_counts.get(client, {}).get('session', 0)

    return {
        'section': section,
        'section_limit': SECTION_LIMIT,
        'session_limit': SESSION_LIMIT,
        'remaining_section': max(0, SECTION_LIMIT - section_used),
        'remaining_session': max(0, SESSION_LIMIT - session_used),
    }


@ai_bp.route('/limits/<section>', methods=['GET'])
def get_limits(section):
    """Current allowance for one section. Costs nothing and spends nothing."""
    if section not in ('projects', 'summary', 'skills', 'experience', 'education'):
        return jsonify({'error': 'Unknown section'}), 404
    return jsonify(peek_rate_limit(section))


def stream_ai_response(messages, prompt_class, section):
    """Generic streaming handler"""
    def generate():
        try:
            # Send rate limit first
            allowed, limit_info = check_rate_limit(section)
            
            if not allowed:
                yield f"data: {json.dumps({'type': 'error', 'data': limit_info['error']})}\n\n"
                return
            
            yield f"data: {json.dumps({'type': 'rate_limit', 'data': limit_info})}\n\n"
            
            # Stream AI response
            full_response = ""
            pre_json_content = ""
            json_detected = False
            
            for chunk in ai_service.stream_completion(messages):
                if chunk:
                    full_response += chunk
                    
                    # Check if JSON is starting
                    if not json_detected and '{"type": "suggestion"' in full_response:
                        json_detected = True
                        # Extract text before JSON
                        json_start = full_response.index('{"type": "suggestion"')
                        pre_json_content = full_response[:json_start].strip()
                    
                    # Only stream as content if no JSON detected yet
                    if not json_detected and not full_response.strip().startswith('{'):
                        yield f"data: {json.dumps({'type': 'content', 'data': chunk})}\n\n"
            
            # Check if JSON suggestion
            json_suggestion = prompt_class.parse_json_suggestion(full_response)
            
            if json_suggestion:
                # Send the pre-JSON conversational text as a message if it exists
                if pre_json_content:
                    yield f"data: {json.dumps({'type': 'content', 'data': pre_json_content})}\n\n"
                
                # Extract just the data fields
                data_payload = {}
                
                if 'projects' in json_suggestion:
                    data_payload['projects'] = json_suggestion['projects']
                if 'message' in json_suggestion:
                    data_payload['message'] = json_suggestion['message']
                if 'experiences' in json_suggestion:
                    data_payload['experiences'] = json_suggestion['experiences']
                if 'summary' in json_suggestion:
                    data_payload['summary'] = json_suggestion['summary']
                if 'skills' in json_suggestion:
                    data_payload['skills'] = json_suggestion['skills']
                
                yield f"data: {json.dumps({'type': 'suggestion', 'data': data_payload})}\n\n"
            else:
                # If it looks like JSON but didn't parse, send it as content
                if full_response.strip().startswith('{'):
                    yield f"data: {json.dumps({'type': 'content', 'data': full_response})}\n\n"
            
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'data': str(e)})}\n\n"
    
    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'}
    )

# ============= PROJECTS SECTION =============
@ai_bp.route('/projects', methods=['POST'])
def assist_projects():
    """AI assistance for Projects"""
    try:
        data = request.get_json()
        user_message = data.get('user_message', '').strip()
        conversation_history = data.get('conversation_history', [])
        resume_context = data.get('resume_context', {})
        
        if not user_message:
            return jsonify({'error': 'user_message is required'}), 400
        
        system_prompt = ProjectPrompts.get_system_prompt(resume_context)
        
        messages = [{"role": "system", "content": system_prompt}]
        for msg in conversation_history[-8:]:
            messages.append({"role": msg.get('role', 'user'), "content": msg.get('content', '')})
        messages.append({"role": "user", "content": user_message})
        
        return stream_ai_response(messages, ProjectPrompts, 'projects')
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============= SUMMARY SECTION =============
@ai_bp.route('/summary', methods=['POST'])
def assist_summary():
    """AI assistance for Summary"""
    try:
        data = request.get_json()
        user_message = data.get('user_message', '').strip()
        conversation_history = data.get('conversation_history', [])
        resume_context = data.get('resume_context', {})
        
        if not user_message:
            return jsonify({'error': 'user_message is required'}), 400
        
        system_prompt = SummaryPrompts.get_system_prompt(resume_context)
        
        messages = [{"role": "system", "content": system_prompt}]
        for msg in conversation_history[-8:]:
            messages.append({"role": msg.get('role', 'user'), "content": msg.get('content', '')})
        messages.append({"role": "user", "content": user_message})
        
        return stream_ai_response(messages, SummaryPrompts, 'summary')
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============= SKILLS SECTION =============
@ai_bp.route('/skills', methods=['POST'])
def assist_skills():
    """AI assistance for Skills"""
    try:
        data = request.get_json()
        user_message = data.get('user_message', '').strip()
        conversation_history = data.get('conversation_history', [])
        resume_context = data.get('resume_context', {})
        
        if not user_message:
            return jsonify({'error': 'user_message is required'}), 400
        
        system_prompt = SkillsPrompts.get_system_prompt(resume_context)
        
        messages = [{"role": "system", "content": system_prompt}]
        for msg in conversation_history[-8:]:
            messages.append({"role": msg.get('role', 'user'), "content": msg.get('content', '')})
        messages.append({"role": "user", "content": user_message})
        
        return stream_ai_response(messages, SkillsPrompts, 'skills')
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============= EXPERIENCE SECTION =============
@ai_bp.route('/experience', methods=['POST'])
def assist_experience():
    """AI assistance for Experience"""
    try:
        data = request.get_json()
        user_message = data.get('user_message', '').strip()
        conversation_history = data.get('conversation_history', [])
        resume_context = data.get('resume_context', {})
        
        if not user_message:
            return jsonify({'error': 'user_message is required'}), 400
        
        system_prompt = ExperiencePrompts.get_system_prompt(resume_context)
        
        messages = [{"role": "system", "content": system_prompt}]
        for msg in conversation_history[-8:]:
            messages.append({"role": msg.get('role', 'user'), "content": msg.get('content', '')})
        messages.append({"role": "user", "content": user_message})
        
        return stream_ai_response(messages, ExperiencePrompts, 'experience')
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============= UTILITY ENDPOINTS =============
@ai_bp.route('/reset-limits', methods=['POST'])
def reset_limits():
    """Reset rate limits"""
    try:
        data = request.get_json(silent=True) or {}
        section = data.get('section', 'projects')
        
        client = get_client_key()
        key = f"{client}:{section}"
        counts = user_request_counts.get(key)
        session_used = user_session_counts.get(client, {}).get('session', 0)
        
        if not counts:
            return jsonify({
                'success': True,
                'new_limits': {
                    'remaining_section': SECTION_LIMIT,
                    'remaining_session': SESSION_LIMIT
                }
            })
        
        # Only honour a reset once the 24h window has actually elapsed,
        # otherwise this endpoint is just a limiter bypass.
        if datetime.now() - counts['last_reset'] <= timedelta(hours=RESET_HOURS):
            return jsonify({
                'success': False,
                'error': 'Limits reset automatically 24 hours after first use',
                'new_limits': {
                    'remaining_section': max(0, SECTION_LIMIT - counts['section']),
                    'remaining_session': max(0, SESSION_LIMIT - session_used)
                }
            }), 429
        
        del user_request_counts[key]
        user_session_counts.pop(client, None)
        
        return jsonify({
            'success': True,
            'new_limits': {
                'remaining_section': SECTION_LIMIT,
                'remaining_session': SESSION_LIMIT
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ai_bp.route('/health', methods=['GET'])
def health():
    """Health check"""
    return jsonify({
        'status': 'healthy',
        'service': 'ai-assistant',
        'models': ai_service.get_available_models(),
        'rate_limits': {
            'section_limit': SECTION_LIMIT,
            'session_limit': SESSION_LIMIT,
            'reset_hours': RESET_HOURS
        }
    })