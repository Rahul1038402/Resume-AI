"""
Prompts for Summary section AI assistance
"""
import json
import logging
from app.prompts.shared import (
    context_block, response_contract, skills_line,
)
from typing import Dict, Optional

logger = logging.getLogger(__name__)


class SummaryPrompts:

    @staticmethod
    def get_system_prompt(context: Dict) -> str:
        target_job = context.get('target_job', 'Software Engineer')
        experience = context.get('experience', [])

        example = """{
  "type": "suggestion",
  "summary": "Software engineer with three years building scalable web applications in React and Node.js. Cut load times by 40% and raised engagement through data-driven optimisation. Focused on efficient, maintainable code.",
  "message": "Here is your summary. Edit it before adding."
}"""

        return f"""You are a resume consultant helping someone applying for {target_job} roles write their professional summary.

{response_contract('summary', example)}

HOW TO GET THERE

You usually have enough already: their target role, their skills, and whatever
experience they have added. Ask only for what is genuinely missing - normally
their years of experience and the one achievement they would lead with.

WHAT THE SUMMARY HAS TO DO

Three or four sentences, 40 to 50 words. Longer and it stops being read.

It should carry: what they are, how long they have done it, the skills that
matter for {target_job}, and one concrete result. Write it in the third person
with no "I", and lead with the role rather than an adjective.

Good: "Backend engineer with four years building payment systems in Go and
Postgres. Cut settlement times from hours to minutes for 200K daily
transactions."

Avoid: "Hardworking team player seeking a challenging role where I can grow" -
this describes nobody and could sit on any resume.

Use only achievements the user has given you. If they have not mentioned a
number, write the sentence without one rather than inventing it.

{context_block(target_job, [('Their skills', skills_line(context, 10)), ('Experience entries added', len(experience))])}"""

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
                        if parsed.get('type') == 'suggestion' and 'summary' in parsed:
                            return potential_json
                    except:
                        continue
        return None

    @staticmethod
    def is_json_response(content: str) -> bool:
        """Check if response is JSON suggestion format"""
        try:
            parsed = json.loads(content.strip())
            return parsed.get('type') == 'suggestion' and 'summary' in parsed
        except:
            extracted = SummaryPrompts.extract_json_from_text(content)
            if extracted:
                try:
                    parsed = json.loads(extracted)
                    return parsed.get('type') == 'suggestion' and 'summary' in parsed
                except:
                    pass
            return False

    @staticmethod
    def parse_json_suggestion(content: str) -> Optional[Dict]:
        """Parse JSON suggestion response"""
        try:
            content_stripped = content.strip()

            # Remove markdown code blocks
            if content_stripped.startswith('```json'):
                content_stripped = content_stripped[7:]
            if content_stripped.startswith('```'):
                content_stripped = content_stripped[3:]
            if content_stripped.endswith('```'):
                content_stripped = content_stripped[:-3]

            content_stripped = content_stripped.strip()

            # Try direct parse
            try:
                parsed = json.loads(content_stripped)
                if parsed.get('type') == 'suggestion' and 'summary' in parsed:
                    return SummaryPrompts._validate_suggestion(parsed)
            except json.JSONDecodeError:
                pass

            # Try extracting JSON
            extracted_json = SummaryPrompts.extract_json_from_text(content)
            if extracted_json:
                parsed = json.loads(extracted_json)
                if parsed.get('type') == 'suggestion' and 'summary' in parsed:
                    return SummaryPrompts._validate_suggestion(parsed)

            return None
        except Exception as e:
            logger.info(f"JSON parse error: {e}")
            return None

    @staticmethod
    def _validate_suggestion(parsed: Dict) -> Optional[Dict]:
        """Validate suggestion structure"""
        if 'summary' not in parsed:
            return None

        summary = parsed['summary']
        if not isinstance(summary, str) or len(summary.strip()) < 20:
            return None

        # Count words (rough)
        word_count = len(summary.split())
        if word_count > 60:  # Too long
            logger.info(f"Warning: Summary is {word_count} words (recommended: 40-45)")

        return parsed

    @staticmethod
    def get_refinement_prompt(current_summary: str, refinement_type: str) -> str:
        """Generate refinement prompts"""
        base = "IMPORTANT: Return ONLY the JSON response with no additional text.\n\n"

        prompts = {
            'impactful': f"""Make this summary more impactful and achievement-focused:

"{current_summary}"

Add stronger action verbs and quantifiable achievements if possible. Keep 40-45 words.

{base}""",

            'keywords': f"""Add more relevant technical keywords to this summary:

"{current_summary}"

Include specific technologies, methodologies, or industry terms. Keep 40-45 words.

{base}""",

            'simplify': f"""Simplify this summary while keeping impact:

"{current_summary}"

Make it more accessible, remove jargon, but keep achievements. Keep 40-45 words.

{base}"""
        }

        return prompts.get(refinement_type, prompts['impactful'])