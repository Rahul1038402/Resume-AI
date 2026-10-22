"""
Prompts for Projects section AI assistance
Enforces formatting standards and best practices
"""
import json
import logging
import re
from app.prompts.shared import (
    context_block, response_contract, skills_line,
)
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)


class ProjectPrompts:

    @staticmethod
    def get_system_prompt(context: Dict) -> str:
        target_job = context.get('target_job', 'Software Engineer')
        existing_projects = context.get('existing_projects', [])
        projects_str = ', '.join(
            p.get('title', '') for p in existing_projects[:3]
        ) if existing_projects else 'none yet'

        example = """{
  "type": "suggestion",
  "projects": [
    {
      "title": "Collaborative Whiteboard",
      "link": "https://github.com/user/whiteboard",
      "technologies": "React, Node.js, WebSocket, MongoDB",
      "description": [
        "Built a real-time whiteboard supporting 50+ concurrent users drawing shapes, text and images",
        "Implemented WebSocket sync with optimistic UI updates over the Canvas API",
        "Held under 100ms latency across 10,000 drawings at 99.5% uptime over three months"
      ]
    }
  ],
  "message": "Here is a draft from what you told me. Edit anything before adding it."
}"""

        return f"""You are a resume consultant helping someone applying for {target_job} roles write their projects section.

{response_contract('projects', example)}

HOW TO GET THERE

Decide first whether you can already write it. If the user has given you a
project name and enough substance for one specific bullet, write the
suggestion now. If they asked you to write it up, write it - do not answer a
direct request with more questions.

Ask only when something essential is genuinely missing, and ask about that
rather than working through a checklist. The useful questions are concrete:
- What does it do, and who for?
- What was the hardest technical problem, and how did you solve it?
- Any numbers? Users, requests, latency, data volume, uptime, time saved.
You do not need every detail - a missing link or tech list is a blank the user
fills in, and asking four more questions to avoid one blank is worse. What you
must not do is invent a number they did not give you.

You can suggest several projects in one reply if they described several: add
each to the "projects" array.

WHAT A GOOD BULLET LOOKS LIKE

Good:
- "Built a real-time chat application serving 10K+ daily active users at under 50ms message latency"
- "Implemented an event-driven architecture with Kafka and Redis to scale horizontally"
- "Cut database query time by 80% through indexing and a caching layer"

Avoid:
- "Built a project that does something" - says nothing
- "Describe the technical approach" - a placeholder, not a bullet
- "Responsible for the frontend" - a job title, not an achievement

Each bullet names what was built, how, and what it changed. Lead with a verb.

{context_block(target_job, [('Their skills', skills_line(context)), ('Projects already added', projects_str)])}"""

    @staticmethod
    def extract_json_from_text(content: str) -> Optional[str]:
        """
        Extract JSON from text that might have surrounding content.
        Handles cases like "Here's a suggestion: {json}" or "text {json} more text"
        """
        # Try to find JSON object boundaries
        # Look for outermost { ... } that contains "type": "suggestion"

        # Find all potential JSON objects
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
                    # Found a complete JSON object
                    potential_json = content[start_idx:i+1]

                    # Check if it's a suggestion JSON
                    try:
                        parsed = json.loads(potential_json)
                        if parsed.get('type') == 'suggestion':
                            return potential_json
                    except:
                        continue

        return None

    @staticmethod
    def is_json_response(content: str) -> bool:
        """Check if response is JSON suggestion format"""
        try:
            # First try direct parse
            parsed = json.loads(content.strip())
            return parsed.get('type') == 'suggestion' and 'projects' in parsed
        except:
            # Try extracting JSON from text
            extracted = ProjectPrompts.extract_json_from_text(content)
            if extracted:
                try:
                    parsed = json.loads(extracted)
                    return parsed.get('type') == 'suggestion' and 'projects' in parsed
                except:
                    pass
            return False

    @staticmethod
    def parse_json_suggestion(content: str) -> Optional[Dict]:
        """
        Parse JSON suggestion response.
        Handles both pure JSON and JSON embedded in text.
        """
        try:
            # First, try direct parse (for pure JSON responses)
            content_stripped = content.strip()

            # Remove markdown code blocks if present
            if content_stripped.startswith('```json'):
                content_stripped = content_stripped[7:]
            if content_stripped.startswith('```'):
                content_stripped = content_stripped[3:]
            if content_stripped.endswith('```'):
                content_stripped = content_stripped[:-3]

            content_stripped = content_stripped.strip()

            # Try parsing directly
            try:
                parsed = json.loads(content_stripped)
                if parsed.get('type') == 'suggestion' and 'projects' in parsed:
                    # Validate structure
                    return ProjectPrompts._validate_suggestion(parsed)
            except json.JSONDecodeError:
                pass

            # If direct parse failed, try extracting JSON from surrounding text
            extracted_json = ProjectPrompts.extract_json_from_text(content)
            if extracted_json:
                parsed = json.loads(extracted_json)
                if parsed.get('type') == 'suggestion' and 'projects' in parsed:
                    return ProjectPrompts._validate_suggestion(parsed)

            return None

        except Exception as e:
            logger.info(f"JSON parse error: {e}")
            return None

    @staticmethod
    def _validate_suggestion(parsed: Dict) -> Optional[Dict]:
        """Validate suggestion structure"""
        try:
            projects = parsed.get('projects', [])
            if not isinstance(projects, list) or not projects:
                return None

            # A title and one real bullet are enough to be worth showing; the
            # rest the user completes in the card.
            kept = []
            for project in projects:
                if not isinstance(project, dict):
                    continue
                if not str(project.get('title', '')).strip():
                    logger.info("Dropping project without a title: %s", list(project))
                    continue

                description = project.get('description')
                if isinstance(description, str):
                    description = [description]
                if not isinstance(description, list):
                    description = []
                description = [d for d in description if isinstance(d, str) and d.strip()]
                if not description:
                    logger.info("Dropping project with no bullets: %s", project.get('title'))
                    continue

                project['description'] = description
                for optional in ('technologies', 'link'):
                    project.setdefault(optional, '')
                kept.append(project)

            if not kept:
                return None
            parsed['projects'] = kept
            return parsed
        except Exception as e:
            logger.info(f"Validation error: {e}")
            return None

    @staticmethod
    def get_refinement_prompt(current_project: Dict, refinement_type: str) -> str:
        """
        Generate prompts for refining existing project content

        Args:
            current_project: Current project dict with title, technologies, description
            refinement_type: 'quantify', 'technical', 'simplify', or 'expand'
        """
        project_str = json.dumps(current_project, indent=2)

        base_instruction = "IMPORTANT: Return ONLY the JSON response with no additional text before or after it."

        prompts = {
            'quantify': f"""The user wants to add more quantifiable metrics to this project:

{project_str}

Please enhance it by adding specific numbers, percentages, or measurable outcomes:
- Performance metrics (latency, throughput, load time)
- Scale (users, requests, data volume)
- Improvement percentages
- Time saved or efficiency gains

{base_instruction}
Respond with the enhanced project in the exact JSON format shown in the system prompt.""",

            'technical': f"""The user wants more technical depth for this project:

{project_str}

Please add more technical details:
- Specific algorithms or design patterns
- Architecture decisions (microservices, event-driven, etc.)
- Database optimization techniques
- Scalability solutions

{base_instruction}
Respond with the enhanced project in the exact JSON format shown in the system prompt.""",

            'simplify': f"""The user wants to simplify this project description:

{project_str}

Please simplify while keeping impact clear:
- Focus on business value
- Reduce technical jargon
- Keep quantifiable results
- Make it accessible to non-technical readers

{base_instruction}
Respond with the simplified project in the exact JSON format shown in the system prompt.""",

            'expand': f"""The user wants to expand this project description:

{project_str}

Please expand each bullet to be more comprehensive:
- Add context to the problem/solution
- Include more implementation details
- Expand on the impact and outcomes

{base_instruction}
Respond with the expanded project in the exact JSON format shown in the system prompt."""
        }

        return prompts.get(refinement_type, prompts['quantify'])