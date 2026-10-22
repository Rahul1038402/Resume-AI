"""Guardrails for the resume analyser"""

from __future__ import annotations

import logging
import math
import re
from typing import Any, Dict, Iterable, List

logger = logging.getLogger(__name__)

# Caps. A resume cannot legitimately carry hundreds of skills, and the UI
# renders every one of them, so an absurd list is either a bad parse or an
# attempt to flood the page.
MAX_SKILLS = 60
MAX_PROJECTS = 25
MAX_METRICS_PER_PROJECT = 8
MAX_RECOMMENDATIONS = 8
MAX_STRING = 300
MAX_JOB_DESCRIPTION = 4000

# Phrases that only appear when someone is talking to the model rather than
# describing their experience. Matching is deliberately narrow: "ignore" on its
# own is an ordinary English word, "ignore all previous instructions" is not.
INJECTION_PATTERNS = [
    r"(?i)\bignore\s+(?:all\s+|any\s+)?(?:previous|prior|above|earlier)\s+instructions?\b",
    r"(?i)\bdisregard\s+(?:all\s+|any\s+|the\s+)?(?:previous|prior|above|earlier|resume)\b",
    r"(?i)\b(?:system|developer|assistant)\s*(?:note|prompt|message|instruction)s?\s*:",
    r"(?i)^\s*(?:system|assistant|user)\s*:",
    r"(?i)\byou\s+are\s+now\b",
    r"(?i)\bnew\s+instructions?\s*:",
    r"(?i)\b(?:set|report|return|output)\s+(?:the\s+)?score\s+(?:to|as)\s+\d+",
    r"(?i)\b(?:instruction|note)\s+to\s+the\s+(?:analyst|model|ai|assistant)\b",
    r"(?i)\bregardless\s+of\s+the\s+resume\b",
    r"(?i)\breturn\s+exactly\b",
]

# The roles the UI offers, with the skills each is scored against.
#
# These were a per-call invention: asked the same resume and the same role
# three times, the model returned 10 required skills once and 11 twice, and the
# score swung 66.4 -> 81.3, Moderate Fit to Strong Fit. The candidate had not
# changed. A fixed list per role makes the same resume score the same twice,
# which is the least a score has to do to mean anything.
#
# Only used when no job description was supplied. A real posting is better
# evidence of what a role wants than any list kept here.
ROLE_SKILLS = {
    "frontend developer": [
        "HTML", "CSS", "JavaScript", "TypeScript", "React", "Responsive Design",
        "Git", "REST APIs", "Testing", "Accessibility", "Web Performance",
    ],
    "backend developer": [
        "Python", "SQL", "REST APIs", "Databases", "Git", "Testing",
        "Docker", "Caching", "Authentication", "API Design",
    ],
    "full stack developer": [
        "JavaScript", "TypeScript", "React", "HTML", "CSS", "Node.js",
        "SQL", "REST APIs", "Git", "Docker", "Testing", "Authentication",
    ],
    "data scientist": [
        "Python", "SQL", "Statistics", "Machine Learning", "Pandas", "NumPy",
        "Data Visualization", "Scikit-learn", "Jupyter", "Experiment Design",
    ],
    "software engineer": [
        "Data Structures", "Algorithms", "Python", "Git", "Testing",
        "SQL", "REST APIs", "Debugging", "Code Review", "System Design",
    ],
    "devops engineer": [
        "Docker", "Kubernetes", "CI/CD", "Linux", "Terraform", "AWS",
        "Monitoring", "Bash", "Networking", "Infrastructure as Code",
    ],
}


def canonical_required(job_title: str | None) -> List[str] | None:
    """The fixed skill list for a known role, or None to let the model decide."""
    if not job_title:
        return None
    return ROLE_SKILLS.get(job_title.strip().lower())


_CONTROL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_FENCE = re.compile(r"[`⁠﻿]")


# Skill names that mean the same thing. Exact matching reported "HTML missing"
# for a resume listing HTML5, and "CSS missing" for one listing CSS3 - a gap
# the candidate did not have, in the first two rows of the report.
_SKILL_ALIASES = {
    "js": "javascript", "ts": "typescript", "node": "nodejs", "node.js": "nodejs",
    "reactjs": "react", "react.js": "react", "nextjs": "next", "next.js": "next",
    "postgres": "postgresql", "psql": "postgresql", "k8s": "kubernetes",
    "gcp": "googlecloud", "golang": "go", "restapi": "restapis",
    "restfulapi": "restapis", "restfulapis": "restapis", "rest": "restapis",
    "cicd": "cicd", "ci/cd": "cicd", "tailwind": "tailwindcss",
    "sklearn": "scikitlearn", "ml": "machinelearning", "oop": "objectoriented",
    "a11y": "accessibility", "iac": "infrastructureascode",
    "dsa": "datastructures", "db": "databases", "database": "databases",
    "unittesting": "testing", "unittests": "testing", "tests": "testing",
}

# Trailing version numbers are noise: HTML5 is HTML, Python3 is Python.
_VERSION_TAIL = re.compile(r"(?<=[a-z])\d+(?:\.\d+)*$")


def _skill_key(name: str) -> str:
    """A comparison key for a skill name, ignoring case, punctuation and version."""
    key = re.sub(r"[^a-z0-9+#./]", "", (name or "").lower())
    key = _SKILL_ALIASES.get(key, key)
    key = key.replace(".", "").replace("/", "")
    key = _SKILL_ALIASES.get(key, key)
    stripped = _VERSION_TAIL.sub("", key)
    # Keep names that are only meaningful with the number, like c++ or s3.
    if stripped and len(stripped) > 1:
        key = stripped
    return _SKILL_ALIASES.get(key, key)


# Naming a tool evidences the practice it implements. Kept deliberately short
# and one-way: shipping GitHub Actions is CI/CD, but "CI/CD" on its own does
# not tell you the candidate has used GitHub Actions.
_IMPLIES = {
    "githubactions": {"cicd", "continuousintegration", "continuousdeployment"},
    "gitlabci": {"cicd", "continuousintegration"},
    "jenkins": {"cicd", "continuousintegration"},
    "circleci": {"cicd", "continuousintegration"},
    "travisci": {"cicd", "continuousintegration"},
    "docker": {"containers", "containerization"},
    "kubernetes": {"containers", "orchestration"},
    "terraform": {"infrastructureascode"},
    "pytest": {"testing", "unittesting"},
    "jest": {"testing", "unittesting"},
    "vitest": {"testing", "unittesting"},
    "cypress": {"testing", "e2etesting"},
    "playwright": {"testing", "e2etesting"},
}


def _tokens(name: str) -> frozenset:
    """The meaningful words in a skill name, normalised individually."""
    raw = re.split(r"[^A-Za-z0-9+#]+", (name or ""))
    out = set()
    for part in raw:
        if not part or part.isdigit():
            continue
        key = _skill_key(part)
        if key and not key.isdigit():
            out.add(key)
    return frozenset(out)


def _has_skill(required: str, extracted_tokens: Iterable[frozenset],
               extracted_keys: Iterable[str]) -> bool:
    """Does the resume evidence `required`?

    Exact key first. Failing that, the required skill counts as present when
    all of its words appear in one extracted skill - "AWS" is evidenced by
    "AWS S3", and "RAG" by "RAG pipelines".

    Deliberately one-directional. A resume listing "React" does not evidence a
    required "React Query", so the subset test never runs the other way, and
    because it compares whole words rather than substrings, "Java" is not
    satisfied by "JavaScript".
    """
    key = _skill_key(required)
    # Singular and plural are the same skill: a posting asking for "LLM" is
    # answered by a resume listing "LLMs". Tried as extra lookups rather than
    # folded into the key, so a stem that is not a real skill ("kubernete")
    # can never match anything.
    variants = {key, key + "s"}
    if len(key) > 3 and key.endswith("s"):
        variants.add(key[:-1])
    if variants & set(extracted_keys):
        return True
    for have in extracted_keys:
        if key in _IMPLIES.get(have, ()):
            return True
    want = _tokens(required)
    if not want:
        return False
    return any(want <= have for have in extracted_tokens)


def _clip(value: Any, limit: int = MAX_STRING) -> str:
    """A trimmed, control-character-free string."""
    if value is None:
        return ""
    text = value if isinstance(value, str) else str(value)
    text = _CONTROL.sub(" ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:limit]


def _as_number(value: Any, default: float = 0.0) -> float:
    """Models return numbers as strings, as "85%", and occasionally as prose."""
    if isinstance(value, bool):
        return default
    if isinstance(value, (int, float)):
        return default if math.isnan(value) or math.isinf(value) else float(value)
    if isinstance(value, str):
        m = re.search(r"-?\d+(?:\.\d+)?", value)
        if m:
            try:
                return float(m.group())
            except ValueError:
                return default
    return default


def _clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
    return max(low, min(high, value))


def _string_list(value: Any, cap: int) -> List[str]:
    """A de-duplicated list of clean strings, order preserved."""
    if isinstance(value, dict):
        value = list(value.keys())
    if isinstance(value, str):
        value = [value]
    if not isinstance(value, (list, tuple)):
        return []
    out: List[str] = []
    seen = set()
    for item in value:
        if isinstance(item, dict):
            item = item.get("name") or item.get("skill") or item.get("title") or ""
        text = _clip(item, 80)
        key = text.lower()
        if text and key not in seen:
            seen.add(key)
            out.append(text)
        if len(out) >= cap:
            break
    return out


def find_injection_attempts(text: str) -> List[str]:
    """The injection-shaped phrases present in `text`, for logging."""
    hits: List[str] = []
    for pattern in INJECTION_PATTERNS:
        for m in re.finditer(pattern, text or "", re.MULTILINE):
            hits.append(_clip(m.group(0), 80))
    return hits


def sanitize_input(text: str, *, limit: int, label: str) -> str:
    """Make untrusted text safe to embed in a prompt.

    Removes control characters and backticks (which would let the text close
    the fence it is wrapped in) and neutralises instruction-shaped phrases.
    The text is not dropped: a resume that happens to contain one of these
    phrases is still the user's resume, and refusing to analyse it would be
    worse than analysing a redacted copy.
    """
    if not text:
        return ""
    cleaned = _CONTROL.sub(" ", text)
    cleaned = _FENCE.sub("'", cleaned)

    hits = find_injection_attempts(cleaned)
    if hits:
        logger.warning("%s: neutralised %d instruction-like phrase(s): %s",
                       label, len(hits), hits[:5])
        for pattern in INJECTION_PATTERNS:
            cleaned = re.sub(pattern, "[redacted]", cleaned)

    if len(cleaned) > limit:
        cleaned = cleaned[:limit]
    return cleaned


def _relevance_label(score: float) -> str:
    if score >= 80:
        return "Highly Relevant"
    if score >= 40:
        return "Somewhat Relevant"
    return "Not Relevant"


def _overall_fit(score: float) -> str:
    if score >= 80:
        return "Strong Fit"
    if score >= 50:
        return "Moderate Fit"
    return "Weak Fit"


def normalize_result(result: Dict[str, Any], *, job_title: str | None = None,
                     use_canonical_skills: bool = False) -> Dict[str, Any]:
    """Recompute everything derivable, and enforce the set invariants.

    The model is asked to extract and to judge per-project relevance. Every
    number that follows from those judgements is computed here, so the figures
    on screen are arithmetic over the extracted lists rather than a number the
    model wrote down. In testing the model's own arithmetic disagreed with its
    own lists in four runs out of four.
    """
    if not isinstance(result, dict):
        return result

    skills = _string_list(result.get("skills"), MAX_SKILLS)
    result["skills"] = skills
    skills_lower = {_skill_key(s) for s in skills}

    pws_raw = result.get("projects_with_skills")
    projects_with_skills: Dict[str, List[str]] = {}
    if isinstance(pws_raw, dict):
        for name, techs in list(pws_raw.items())[:MAX_PROJECTS]:
            projects_with_skills[_clip(name, 120)] = _string_list(techs, MAX_SKILLS)
    result["projects_with_skills"] = projects_with_skills

    impacts_raw = result.get("quantifiable_impacts")
    impacts: Dict[str, List[str]] = {}
    if isinstance(impacts_raw, dict):
        for name, metrics in list(impacts_raw.items())[:MAX_PROJECTS]:
            kept = [m for m in _string_list(metrics, MAX_METRICS_PER_PROJECT)
                    if re.search(r"\d", m)]
            if kept:
                impacts[_clip(name, 120)] = kept
    result["quantifiable_impacts"] = impacts

    # A technology listed under a project is a technology the resume evidences,
    # so it belongs in `skills` too. The model reliably puts project stacks in
    # projects_with_skills but often leaves them out of the global list, which
    # is why a posting asking for Gemini or Groq was told the resume lacked
    # them while the project stack named both. Union them here rather than ask
    # the model again.
    if projects_with_skills:
        known = {_skill_key(x) for x in skills}
        for techs in projects_with_skills.values():
            for tech in techs:
                key = _skill_key(tech)
                if key and key not in known and len(skills) < MAX_SKILLS:
                    known.add(key)
                    skills.append(tech)
        result["skills"] = skills
        skills_lower = {_skill_key(x) for x in skills}

    projects = _string_list(result.get("projects"), MAX_PROJECTS)
    for name in projects_with_skills:
        if name and name not in projects:
            projects.append(name)
    result["projects"] = projects[:MAX_PROJECTS]

    result["recommendations"] = [
        r for r in _string_list(result.get("recommendations"), MAX_RECOMMENDATIONS)
        # The old prompt shipped bracketed placeholders and the model sometimes
        # echoed them back verbatim.
        if not re.search(r"\[[^\]]*\]|^\s*$", r)
    ]

    jm = result.get("job_match")
    if not isinstance(jm, dict):
        result["job_match"] = {}
        result["score"] = round(_clamp(_as_number(result.get("score"))), 2)
        return result

    # The model only has to get `required_skills` right. Whether each one is
    # matched or missing is set membership against the skills it extracted, so
    # it is decided here rather than asserted by the model - which had been
    # leaving some required skills in neither list, quietly costing the
    # candidate score.
    #
    # Membership is exact, case-insensitive. A resume writing "JS" where the
    # role asks for "JavaScript" is reported as a gap. That is the conservative
    # direction: a missed synonym understates a match, a fuzzy one invents it.
    fixed = canonical_required(job_title) if use_canonical_skills else None
    required = list(fixed) if fixed else _string_list(jm.get("required_skills"), MAX_SKILLS)
    seen = {_skill_key(r) for r in required}
    if not fixed:
        for s in (_string_list(jm.get("matched_skills"), MAX_SKILLS)
                  + _string_list(jm.get("missing_skills"), MAX_SKILLS)):
            if _skill_key(s) not in seen:
                seen.add(_skill_key(s))
                required.append(s)

    skill_tokens = [_tokens(x) for x in skills]
    matched = [r for r in required if _has_skill(r, skill_tokens, skills_lower)]
    missing = [r for r in required if not _has_skill(r, skill_tokens, skills_lower)]

    jm["required_skills"] = required
    jm["matched_skills"] = matched
    jm["missing_skills"] = missing
    jm["extra_skills"] = [s for s in _string_list(jm.get("extra_skills"), MAX_SKILLS)
                          if _skill_key(s) in skills_lower and _skill_key(s) not in
                          {_skill_key(m) for m in matched}]

    jm["skill_match_score"] = round(100.0 * len(matched) / len(required), 2) if required else 0.0

    pr_raw = jm.get("project_relevance")
    project_relevance: Dict[str, Dict[str, Any]] = {}
    if isinstance(pr_raw, dict):
        for name, data in list(pr_raw.items())[:MAX_PROJECTS]:
            if not isinstance(data, dict):
                continue
            key = _clip(name, 120)
            techs = _string_list(data.get("skills"), MAX_SKILLS) or \
                projects_with_skills.get(key, [])
            hits = [t for t in _string_list(data.get("matched_skills"), MAX_SKILLS)
                    if _skill_key(t) in {_skill_key(x) for x in techs}]
            score = _clamp(_as_number(data.get("relevance_score")))
            project_relevance[key] = {
                "skills": techs,
                "matched_skills": hits,
                "matched_skills_count": len(hits),
                "relevance_score": round(score, 2),
                # Recomputed, not taken: the label and the score disagreed.
                "relevance_label": _relevance_label(score),
            }
    jm["project_relevance"] = project_relevance

    scores = [p["relevance_score"] for p in project_relevance.values()]
    jm["avg_project_relevance"] = round(sum(scores) / len(scores), 2) if scores else 0.0

    # The headline. Same weighting the prompt always described, applied here so
    # it actually holds: skills 50%, project relevance 35%, evidence 15%.
    total_projects = max(len(projects_with_skills), len(project_relevance))
    metric_cover = (len(impacts) / total_projects * 100.0) if total_projects else 0.0
    overall = (0.50 * jm["skill_match_score"]
               + 0.35 * jm["avg_project_relevance"]
               + 0.15 * _clamp(metric_cover))
    overall = round(_clamp(overall), 2)

    jm["overall_relevance_score"] = overall
    jm["overall_fit"] = _overall_fit(overall)
    jm["job_title"] = _clip(jm.get("job_title") or job_title or "", 120)

    result["score"] = overall
    result["target_job"] = _clip(result.get("target_job") or job_title or "", 120)

    result["matched_skills"] = {s: 1.0 for s in matched}
    result["missing_skills"] = {s: 1.0 for s in missing}

    analysis = result.get("analysis")
    if not isinstance(analysis, dict):
        analysis = {}
    analysis.update({
        "total_skills_found": len(skills),
        "total_projects": len(result["projects"]),
        "relevant_projects": sum(1 for p in project_relevance.values()
                                 if p["relevance_score"] >= 40),
        "skills_with_metrics": len(impacts),
        "achieved_score": overall,
        "max_possible_score": 100,
    })
    result["analysis"] = analysis
    result["relevant_projects"] = [n for n, p in project_relevance.items()
                                   if p["relevance_score"] >= 40] or result["projects"]
    return result
