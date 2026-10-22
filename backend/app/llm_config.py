"""Central LLM configuration and the provider chain."""

import os

# Groq
PRIMARY_MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b")
FALLBACK_MODEL = os.environ.get("GROQ_FALLBACK_MODEL", "openai/gpt-oss-20b")

# "low" | "medium" | "high" - low keeps latency close to the old llama models
REASONING_EFFORT = os.environ.get("GROQ_REASONING_EFFORT", "low")

GROQ_MODELS = [PRIMARY_MODEL, FALLBACK_MODEL]

MODELS = GROQ_MODELS

GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3-flash-preview")

# Thinking off
GEMINI_THINKING_BUDGET = int(os.environ.get("GEMINI_THINKING_BUDGET", "0"))


def gemini_enabled() -> bool:
    """Whether a Gemini key is configured. Absent, the chain is Groq-only."""
    return bool(os.environ.get("GEMINI_API_KEY"))
