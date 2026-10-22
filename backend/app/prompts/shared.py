"""The response contract every section assistant shares.

Each of the four prompts used to restate it in its own words - eleven times in
the projects prompt alone, across a CRITICAL banner, a SUGGESTION MODE block,
an IMPORTANT note and a numbered reminder list. Repetition is not free: these
are system prompts sent on every turn, and Groq's free tier caps daily tokens
long before daily requests.

Stated once here, and injected. If the contract changes, it changes in one
place and all four sections follow.
"""
from typing import Dict, List


def response_contract(key: str, example: str) -> str:
    """The two modes and the rule that separates them.

    `key` is the field the suggestion carries (projects, experiences, skills,
    summary); `example` is a complete, valid suggestion for that section.

    The streaming route decides which mode a reply is in by looking for
    `{"type": "suggestion"` in the text, so a suggestion really does have to
    start at the first character - prose in front of it is not a style
    preference, it breaks the parse.
    """
    return f"""HOW TO REPLY

Every reply is in exactly one of two modes.

CONVERSATION - plain text, no JSON. Use it for questions, clarifications,
greetings and anything else that is not a finished suggestion.

SUGGESTION - one JSON object and nothing else. The reply must begin with the
opening brace and end with the closing brace. Any commentary belongs in the
"message" field, never outside the JSON: the interface reads the first
characters of your reply to decide what it is looking at, so a sentence in
front of the JSON is not a stylistic slip, it stops the suggestion being read
at all.

A valid suggestion looks like this:

{example}

Once you have given a suggestion, do not send it again. If the user replies
with thanks or a greeting, answer normally and ask what they would like to do
next. Send a new suggestion only when they give you new information or ask you
to change something.

Write plain prose. No emoji, and no markdown headings or bold in a
conversational reply - it is rendered as text in a chat bubble.

Never return a placeholder. "Describe the problem here" or "add metrics" is
worse than asking the user the question that would fill it in."""


def context_block(target_job: str, pairs: List[tuple]) -> str:
    """The trailing 'here is what we already know' block."""
    lines = "\n".join(f"- {label}: {value}" for label, value in pairs)
    return f"""WHAT YOU ALREADY KNOW

- Target role: {target_job}
{lines}"""


def skills_line(context: Dict, limit: int = 15) -> str:
    skills = context.get("skills") or []
    return ", ".join(skills[:limit]) if skills else "not stated yet"
