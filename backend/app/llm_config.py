"""Central Groq/LLM configuration.

Groq retired the llama-3.x models (llama-3.3-70b-versatile,
llama-3.1-8b-instant) on 2026-08-16, which broke every AI feature at once
because the model names were hardcoded in four different files. Every call
site now reads them from here, so the next migration is a one-line change
(or an environment variable, without a redeploy of the code).

The gpt-oss models are reasoning models: part of the completion budget is
spent on reasoning tokens before any content is emitted. Keep the effort
low and leave headroom in max_tokens, otherwise the response comes back
with an empty `content` and finish_reason "length".
"""
import os

PRIMARY_MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b")
FALLBACK_MODEL = os.environ.get("GROQ_FALLBACK_MODEL", "openai/gpt-oss-20b")

# "low" | "medium" | "high" - low keeps latency close to the old llama models
REASONING_EFFORT = os.environ.get("GROQ_REASONING_EFFORT", "low")

# Tried in order; the fallback is used when the primary errors out.
MODELS = [PRIMARY_MODEL, FALLBACK_MODEL]
