"""
Prompts for Experience section AI assistance
"""
import json
import logging
from app.prompts.shared import (
    context_block, response_contract, skills_line,
)
from typing import Dict, Optional

logger = logging.getLogger(__name__)


class ExperiencePrompts:

    @staticmethod
    def get_system_prompt(context: Dict) -> str:
        target_job = context.get('target_job', 'Software Engineer')
        existing_experience = context.get('existing_experience', [])

        example = """{
  "type": "suggestion",
  "experiences": [
    {
      "position": "Senior Software Engineer",
      "company": "Tech Corp",
      "location": "San Francisco, CA",
      "startDate": "Jan 2022",
      "endDate": "Present",
      "achievements": [
        "Led a microservices rebuild serving 1M+ daily users, cutting API response time by 60%",
        "Built a CI/CD pipeline on Jenkins and Docker, taking deployments from 2 hours to 15 minutes",
        "Mentored five junior engineers through code review and pairing"
      ]
    }
  ],
  "message": "Here is your experience entry. Edit anything before adding it."
}"""

        return f"""You are a resume consultant helping someone applying for {target_job} roles write their work experience.

{response_contract('experiences', example)}

HOW TO GET THERE

If the user has already given you a role, an employer and something they did,
write the suggestion now - a direct request to write it up is not an invitation
to ask more questions.

Otherwise start with the role and the employer, then the dates and location,
then what they actually did:
- What did you own or build?
- Which technologies, and what was the approach?
- What changed because of it? Users served, time saved, percentage improved.
- Did you lead or mentor anyone?

Position and company are the two things a suggestion cannot do without. Dates
and location are helpful but optional - if the user has not said, leave them
empty and let them fill the field in. Do not invent a city or a date to make
the entry look complete.

Aim for two or three achievements; one specific achievement beats three vague
ones, so send what you have rather than padding it.

WHAT A GOOD ACHIEVEMENT LOOKS LIKE

Good:
- "Led a real-time analytics dashboard in React and D3.js processing 100K+ events/second, halving reporting time"
- "Architected event-driven services with Node.js and RabbitMQ, reaching 99.9% uptime"
- "Mentored four junior developers through review and pairing, lifting team velocity by 30%"

Avoid:
- "Worked on various projects using different technologies"
- "Responsible for developing features"
- "Helped the team with tasks"

The shape that works: action, then the technical substance, then the effect.
Lead with a verb - Led, Built, Architected, Migrated, Cut.

{context_block(target_job, [('Their skills', skills_line(context)), ('Experience entries already added', len(existing_experience))])}"""

    @staticmethod
    def extract_json_from_text(content: str) -> Optional[str]:
        """Extract JSON from text"""
        brace_depth = 0
        start_idx = -1

        for i, char in enumerate(content):
            if char == '{':
                if brace_depth == 0:
                    start_idx = i
                brace_depth += 1
            elif char == '}':
                brace_depth -= 1
                if brace_depth == 0 and start_idx != -1:
                    potential_json = content[start_idx:i+1]
                    try:
                        parsed = json.loads(potential_json)
                        if parsed.get('type') == 'suggestion' and 'experiences' in parsed:
                            return potential_json
                    except:
                        continue
        return None

    @staticmethod
    def is_json_response(content: str) -> bool:
        """Check if response is JSON suggestion format"""
        try:
            parsed = json.loads(content.strip())
            return parsed.get('type') == 'suggestion' and 'experiences' in parsed
        except:
            extracted = ExperiencePrompts.extract_json_from_text(content)
            if extracted:
                try:
                    parsed = json.loads(extracted)
                    return parsed.get('type') == 'suggestion' and 'experiences' in parsed
                except:
                    pass
            return False

    @staticmethod
    def parse_json_suggestion(content: str) -> Optional[Dict]:
        """Parse JSON suggestion response"""
        try:
            content_stripped = content.strip()

            if content_stripped.startswith('```json'):
                content_stripped = content_stripped[7:]
            if content_stripped.startswith('```'):
                content_stripped = content_stripped[3:]
            if content_stripped.endswith('```'):
                content_stripped = content_stripped[:-3]

            content_stripped = content_stripped.strip()

            try:
                parsed = json.loads(content_stripped)
                if parsed.get('type') == 'suggestion' and 'experiences' in parsed:
                    return ExperiencePrompts._validate_suggestion(parsed)
            except json.JSONDecodeError:
                pass

            extracted_json = ExperiencePrompts.extract_json_from_text(content)
            if extracted_json:
                parsed = json.loads(extracted_json)
                if parsed.get('type') == 'suggestion' and 'experiences' in parsed:
                    return ExperiencePrompts._validate_suggestion(parsed)

            return None
        except Exception as e:
            logger.info(f"JSON parse error: {e}")
            return None

    @staticmethod
    def _validate_suggestion(parsed: Dict) -> Optional[Dict]:
        """Validate suggestion structure"""
        experiences = parsed.get('experiences', [])
        if not isinstance(experiences, list) or not experiences:
            return None

        # Only the role and the employer are genuinely required. Location and
        # the dates used to be mandatory, which silently threw away the whole
        # card when someone said "I interned at Acme as a backend dev" without
        # naming a city - the model would have had to invent one to get past
        # this. Every field is an editable input in the card, so a blank is
        # something the user fills in; no card at all is a dead end.
        kept = []
        for exp in experiences:
            if not isinstance(exp, dict):
                continue
            if not str(exp.get('position', '')).strip() or not str(exp.get('company', '')).strip():
                logger.info("Dropping experience without a position or company: %s", list(exp))
                continue

            achievements = exp.get('achievements')
            if isinstance(achievements, str):
                achievements = [achievements]
            if not isinstance(achievements, list):
                achievements = []
            achievements = [a for a in achievements if isinstance(a, str) and a.strip()]
            if not achievements:
                logger.info("Dropping experience with no achievements: %s", exp.get('position'))
                continue

            exp['achievements'] = achievements
            for optional in ('location', 'startDate', 'endDate'):
                exp.setdefault(optional, '')
            kept.append(exp)

        # One malformed entry used to discard every good one beside it.
        if not kept:
            return None
        parsed['experiences'] = kept
        return parsed

    @staticmethod
    def get_refinement_prompt(current_experience: Dict, refinement_type: str) -> str:
        """Generate refinement prompts"""
        exp_str = json.dumps(current_experience, indent=2)
        base = "IMPORTANT: Return ONLY the JSON response with no additional text.\n\n"

        prompts = {
            'quantify': f"""Add more quantifiable metrics to this experience:

{exp_str}

Include specific numbers: performance improvements, users served, time saved, revenue impact.

{base}""",

            'technical': f"""Add more technical depth to this experience:

{exp_str}

Include specific technologies, architectures, design patterns, and implementation details.

{base}""",

            'simplify': f"""Simplify this experience while keeping impact:

{exp_str}

Make it more accessible, reduce jargon, but keep achievements and metrics clear.

{base}"""
        }

        return prompts.get(refinement_type, prompts['quantify'])