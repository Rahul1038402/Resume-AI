"""
Prompts for Skills section AI assistance
"""
import json
import logging
from app.prompts.shared import (
    context_block, response_contract, skills_line,
)
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)


class SkillsPrompts:

    @staticmethod
    def get_system_prompt(context: Dict) -> str:
        target_job = context.get('target_job', 'Software Engineer')
        existing_skills = context.get('existing_skills', [])

        example = """{
  "type": "suggestion",
  "skills": [
    {"name": "Languages", "value": "Python, JavaScript, TypeScript, Java"},
    {"name": "Frameworks", "value": "React, Node.js, Django, Spring Boot"},
    {"name": "Databases", "value": "PostgreSQL, MongoDB, Redis"},
    {"name": "Cloud & DevOps", "value": "Docker, AWS, Git, Jenkins"}
  ],
  "message": "Here are your skills grouped by category. Edit any of them before adding."
}"""

        return f"""You are a resume consultant helping someone applying for {target_job} roles organise their technical skills.

{response_contract('skills', example)}

HOW TO GET THERE

Ask what they work with, and whether they have a specific posting in mind. If
they share one, take the skills it names and ask which they actually have -
the point is to mirror the posting's wording for the ones they can claim, not
to copy the list wholesale.

Only list skills the user has told you they have. A skills section that
overstates is worse than a short one: it fails at the interview instead of the
filter.

CATEGORIES THAT WORK

- Languages
- Frameworks & Libraries
- Databases
- Cloud & DevOps
- Tools & Platforms
- Concepts & Methodologies

Use the categories that fit what they have; skip the empty ones. Order each
category with the most relevant to {target_job} first. Write each value as a
comma-separated string, and keep the user's own spelling of a technology.

{context_block(target_job, [('Skill categories already added', len(existing_skills))])}"""

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
                        if parsed.get('type') == 'suggestion' and 'skills' in parsed:
                            return potential_json
                    except:
                        continue
        return None

    @staticmethod
    def is_json_response(content: str) -> bool:
        """Check if response is JSON suggestion format"""
        try:
            parsed = json.loads(content.strip())
            return parsed.get('type') == 'suggestion' and 'skills' in parsed
        except:
            extracted = SkillsPrompts.extract_json_from_text(content)
            if extracted:
                try:
                    parsed = json.loads(extracted)
                    return parsed.get('type') == 'suggestion' and 'skills' in parsed
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
                if parsed.get('type') == 'suggestion' and 'skills' in parsed:
                    return SkillsPrompts._validate_suggestion(parsed)
            except json.JSONDecodeError:
                pass

            extracted_json = SkillsPrompts.extract_json_from_text(content)
            if extracted_json:
                parsed = json.loads(extracted_json)
                if parsed.get('type') == 'suggestion' and 'skills' in parsed:
                    return SkillsPrompts._validate_suggestion(parsed)

            return None
        except Exception as e:
            logger.info(f"JSON parse error: {e}")
            return None

    @staticmethod
    def _validate_suggestion(parsed: Dict) -> Optional[Dict]:
        """Keep the usable categories, drop only the broken ones."""
        key = 'skills' if 'skills' in parsed else 'categories'
        categories = parsed.get(key) or []
        if not isinstance(categories, list) or not categories:
            return None

        kept = []
        for skill in categories:
            if not isinstance(skill, dict):
                continue
            name = str(skill.get('name', '')).strip()
            value = skill.get('value')
            # The model sometimes returns the list it was asked to join.
            if isinstance(value, list):
                value = ', '.join(str(v).strip() for v in value if str(v).strip())
            value = str(value or '').strip()
            if not name or not value:
                logger.info("Dropping skill category %r with value %r", name, value)
                continue
            kept.append({**skill, 'name': name, 'value': value})

        if not kept:
            return None
        parsed[key] = kept
        return parsed

    def get_refinement_prompt(current_skills: List[Dict], refinement_type: str) -> str:
        """Generate refinement prompts"""
        skills_str = json.dumps(current_skills, indent=2)
        base = "IMPORTANT: Return ONLY the JSON response with no additional text.\n\n"

        prompts = {
            'add_categories': f"""Add more relevant skill categories to this list:

{skills_str}

Consider adding categories like: Testing, Mobile, Security, Data Science, etc. based on context.

{base}""",

            'match_jd': f"""Re-prioritize these skills to better match the job description:

{skills_str}

Put most relevant skills first in each category. Add any missing critical skills.

{base}""",

            'prioritize': f"""Reorganize these skills putting the most important ones first:

{skills_str}

Focus on the most in-demand and relevant skills for the role.

{base}"""
        }

        return prompts.get(refinement_type, prompts['prioritize'])