import os
import re
import json
import fitz  # PyMuPDF
from docx import Document
from typing import Dict, List, Any, Optional
import time
from dotenv import load_dotenv
from groq import Groq
from app.llm_config import MODELS, REASONING_EFFORT

load_dotenv()

# Global rate limiter
_last_api_call_time = 0
_min_seconds_between_calls = 1

# Timeout configurations
TIMEOUT_CONFIG = {
    "basic_extraction": 25,
    "full_analysis": 35,
    "job_matching": 45,
    "complex_analysis": 60,
}

# Model names live in app/llm_config.py so every call site migrates together
GROQ_MODELS = MODELS

def get_optimal_timeout(has_job_info: bool, include_recommendations: bool, prompt_length: int) -> int:
    """Calculate optimal timeout based on analysis complexity."""
    if include_recommendations and has_job_info:
        base_timeout = TIMEOUT_CONFIG["complex_analysis"]
    elif has_job_info:
        base_timeout = TIMEOUT_CONFIG["job_matching"]
    elif include_recommendations:
        base_timeout = TIMEOUT_CONFIG["full_analysis"]
    else:
        base_timeout = TIMEOUT_CONFIG["basic_extraction"]
    
    if prompt_length > 8000:
        base_timeout += 15
    elif prompt_length > 5000:
        base_timeout += 10
    elif prompt_length > 3000:
        base_timeout += 5
    
    return min(base_timeout, 90)

def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract plain text from a PDF resume."""
    doc = fitz.open(pdf_path)
    text = ""
    for page in doc:
        text += page.get_text("text") + "\n"
    return text

def extract_text_from_docx(docx_path: str) -> str:
    """Extract plain text from a DOCX resume."""
    doc = Document(docx_path)
    return "\n".join([para.text for para in doc.paragraphs])

def preprocess_for_speed(resume_text: str, max_length: int = 3000) -> str:
    """Clean and optimize resume text for faster processing."""
    text = re.sub(r'\s+', ' ', resume_text).strip()
    
    sections_to_minimize = [
        r'(?i)references?:.*?(?=\n[A-Z][a-z]+:|$)',
        r'(?i)hobbies?.*?(?=\n[A-Z][a-z]+:|$)',
        r'(?i)interests?.*?(?=\n[A-Z][a-z]+:|$)',
        r'(?i)personal\s+information.*?(?=\n[A-Z][a-z]+:|$)',
    ]
    
    for pattern in sections_to_minimize:
        text = re.sub(pattern, '', text, flags=re.DOTALL)
    
    if len(text) <= max_length:
        return text
    
    important_keywords = ['project', 'experience', 'skill', 'education', 'work', 'technical']
    truncated = text[:max_length]
    best_cut = max_length
    
    for keyword in important_keywords:
        last_occurrence = truncated.lower().rfind(keyword)
        if last_occurrence > max_length * 0.7:
            sentence_end = truncated.find('.', last_occurrence)
            if sentence_end != -1 and sentence_end < best_cut:
                best_cut = sentence_end + 1
    
    return text[:best_cut].strip() + "..."

def create_optimized_prompt(resume_text: str, job_title: str = None, job_description: str = None) -> str:
    """Create a streamlined, fast-processing prompt."""
    resume_text = preprocess_for_speed(resume_text, 2500)
    
    base_prompt = f"""You are an expert resume analyst with 10+ years of experience in technical recruitment and career counseling. Your task is to perform a comprehensive, detailed analysis of this resume assuming the candidate is a new grad applying for internship or junior roles.

RESUME CONTENT:
{resume_text}

JSON Structure (return ALL these fields):
{{
    "skills": ["skill1", "skill2"],
    "projects": ["Project 1", "Project 2"],
    "projects_with_skills": {{"Project Name": ["tech1", "tech2"]}},
    "quantifiable_impacts": {{"Project Name": ["metric with numbers"]}},
    "relevant_projects": ["relevant project names"],
    "analysis": {{
        "total_skills_found": 0,
        "total_projects": 0,
        "relevant_projects": 0,
        "skills_with_metrics": 0,
        "achieved_score": 0,
        "max_possible_score": 100
    }}
}}

Rules:
- Extract only explicitly mentioned technical skills
- Include projects with clear technology stacks
- Only include metrics with actual numbers/percentages
- Score: project relevance (40%) + quantifiable metrics (30%) + total skills (30%)
- Return valid JSON only, no explanations"""

    # Add comprehensive job matching if provided
    if job_title:
        job_section = f"""

JOB: {job_title}"""
        
        if job_description:
            # Truncate job description aggressively for speed
            job_desc = preprocess_for_speed(job_description, 1000)
            job_section += f"""
DESCRIPTION: {job_desc}

Based on this job description, extract required skills and analyze match."""
        else:
            job_section += f"""

Analyze what skills are typically required for {job_title} role based on industry standards. Also analyze the resume strictly against the job description if provided."""
        
        # Add ALL missing fields from old logic with proper skill matching logic
        job_section += f"""

CRITICAL SKILL MATCHING INSTRUCTIONS:
1. First, determine required skills for {job_title}
2. Then, compare with the ALREADY EXTRACTED skills from the resume
3. matched_skills = skills that appear in BOTH required_skills AND the extracted skills array
4. missing_skills = required skills that are NOT found in the extracted skills array
5. extra_skills = extracted skills that are useful but not core requirements

Add these additional fields to JSON:
{{
    "job_match": {{
        "job_title": "{job_title}",
        "required_skills": ["skill1", "skill2"],
        "matched_skills": ["only skills from extracted skills that match requirements"],
        "missing_skills": ["required skills NOT in extracted skills"],
        "extra_skills": ["extracted skills that are bonus for this role"],
        "skill_match_score": (matched_skills.length / required_skills.length) * 100,
        "avg_project_relevance": 75,
        "overall_relevance_score": 80,
        "overall_fit": "Strong Fit",
        "project_relevance": {{
            "Project Name": {{
                "skills": ["tech1", "tech2"],
                "matched_skills": ["matched1"],
                "matched_skills_count": 1,
                "relevance_score": 80,
                "relevance_label": "Highly Relevant"
            }}
        }}
    }},
    "target_job": "{job_title}",
    "score": 85,
    "matched_skills": {{"skill_name": relevance_weight (0.1-1.0)}},
    "missing_skills": {{"skill_name": importance_weight (0.1-1.0)}},
    "recommendations": [
        "Learn missing skills: [only truly missing skills]",
        "Strengthen projects with [specific improvements]",
        "Focus on [domain-specific advice]"
    ]
}}

SKILL MATCHING EXAMPLES:
- If extracted skills = ["React", "Python", "Docker", "AWS"] 
- And required skills for full stack = ["React", "Node.js", "Python", "Docker", "AWS", "PostgreSQL"]
- Then matched_skills = ["React", "Python", "Docker", "AWS"]
- And missing_skills = ["Node.js", "PostgreSQL"]

Scoring Guidelines:
- Strong Fit (80-100): High skill match + relevant projects + quantifiable impact
- Moderate Fit (50-79): Good skill match OR good projects OR good metrics  
- Weak Fit (0-49): Low skill match AND limited relevant experience

Project Relevance:
- "Highly Relevant" (80-100): 3+ matching core skills
- "Somewhat Relevant" (40-79): 1-2 transferable skills
- "Not Relevant" (0-39): Skills don't align with job requirements"""
        
        base_prompt += job_section
    
    return base_prompt

def call_groq_with_rate_limit(prompt: str, analysis_type: str = "basic") -> str:
    """Call Groq API with rate limiting, JSON mode and model fallback."""
    
    global _last_api_call_time
    
    # Enforce rate limit
    time_since_last_call = time.time() - _last_api_call_time
    if time_since_last_call < _min_seconds_between_calls:
        wait_time = _min_seconds_between_calls - time_since_last_call
        print(f"⏱️  Rate limiting: waiting {wait_time:.1f}s...")
        time.sleep(wait_time)
    
    has_job_info = "JOB:" in prompt
    include_recommendations = "recommendations" in prompt
    optimal_timeout = get_optimal_timeout(has_job_info, include_recommendations, len(prompt))
    
    client = Groq(api_key=os.environ.get('GROQ_API_KEY'), timeout=optimal_timeout)
    last_error = None
    
    for model in GROQ_MODELS:
        try:
            print(f"📡 Calling Groq API with {model} (timeout: {optimal_timeout}s)...")
            start_time = time.time()
            
            chat_completion = client.chat.completions.create(
                messages=[
                    {
                        "role": "user",
                        "content": prompt,
                    }
                ],
                model=model,
                temperature=0.0,
                # Reasoning tokens come out of this budget, so leave headroom
                max_tokens=4000,
                reasoning_effort=REASONING_EFFORT,
                response_format={"type": "json_object"},
            )
            
            response_text = chat_completion.choices[0].message.content
            
            if response_text and response_text.strip():
                elapsed = time.time() - start_time
                _last_api_call_time = time.time()
                print(f"✓ Success in {elapsed:.1f}s")
                return response_text
            
            # Empty content usually means the reasoning budget was exhausted
            last_error = Exception(
                f"{model} returned an empty response "
                f"(finish_reason: {chat_completion.choices[0].finish_reason})"
            )
            print(f"⚠️  {last_error}")
            
        except Exception as e:
            last_error = e
            error_msg = str(e).lower()
            
            # Rate limits will not be fixed by the fallback model
            if "429" in str(e) or "rate limit" in error_msg:
                raise Exception(
                    "⚠️ Groq API Rate Limit Exceeded\n\n"
                    "Free tier: 30 req/min, 14,400 req/day\n"
                    "Wait a moment and try again."
                )
            
            print(f"❌ {model} failed: {e}")
        
        _last_api_call_time = time.time()
    
    raise Exception(f"API call failed on all models ({', '.join(GROQ_MODELS)}): {last_error}")

def parse_groq_response(response_text: str) -> Dict[str, Any]:
    """Parse and validate Groq's JSON response."""
    try:
        response_text = response_text.strip()
        
        # Remove markdown code blocks if present
        if response_text.startswith("```"):
            response_text = re.sub(r'^```(?:json)?\s*', '', response_text)
            response_text = re.sub(r'\s*```$', '', response_text)
        
        json_start = response_text.find('{')
        json_end = response_text.rfind('}') + 1
        
        if json_start == -1 or json_end == 0:
            raise ValueError("No JSON object found")
        
        json_str = response_text[json_start:json_end]
        result = json.loads(json_str)
        
        # Ensure required fields
        required_fields = {
            "skills": [],
            "projects": [],
            "projects_with_skills": {},
            "quantifiable_impacts": {},
            "relevant_projects": [],
            "analysis": {
                "total_skills_found": 0,
                "total_projects": 0,
                "relevant_projects": 0,
                "skills_with_metrics": 0,
                "achieved_score": 0,
                "max_possible_score": 100
            }
        }
        
        for field, default_value in required_fields.items():
            if field not in result:
                result[field] = default_value
        
        if not result.get("relevant_projects"):
            result["relevant_projects"] = result.get("projects", [])
        
        # Update analysis counts
        if "analysis" in result:
            analysis = result["analysis"]
            analysis["total_skills_found"] = len(result.get("skills", []))
            analysis["total_projects"] = len(result.get("projects", []))
            analysis["relevant_projects"] = len(result.get("relevant_projects", []))
            analysis["skills_with_metrics"] = len(result.get("quantifiable_impacts", {}))
            
            if analysis.get("achieved_score", 0) == 0:
                total_projects = analysis["total_projects"]
                if total_projects > 0:
                    project_score = (analysis["relevant_projects"] / total_projects) * 40
                    metrics_score = min((analysis["skills_with_metrics"] / total_projects) * 30, 30)
                    skills_score = min((analysis["total_skills_found"] / 20) * 30, 30)
                    analysis["achieved_score"] = round(project_score + metrics_score + skills_score, 2)
        
        return result
        
    except json.JSONDecodeError as e:
        print(f"JSON parsing failed: {str(e)}")
        return create_comprehensive_fallback_analysis(response_text)
    except Exception as e:
        print(f"Response parsing error: {str(e)}")
        return create_comprehensive_fallback_analysis(response_text)

def create_comprehensive_fallback_analysis(text: str) -> Dict[str, Any]:
    """Create fallback analysis if parsing fails."""
    return {
        "skills": [],
        "projects": [],
        "projects_with_skills": {},
        "quantifiable_impacts": {},
        "relevant_projects": [],
        "analysis": {
            "total_skills_found": 0,
            "total_projects": 0,
            "relevant_projects": 0,
            "skills_with_metrics": 0,
            "achieved_score": 0,
            "max_possible_score": 100
        },
        "error": "Failed to parse AI response",
        "raw_response": text[:300] if text else "No response"
    }

def analyze_resume_with_groq(file_path: str, job_title: str = None, job_skills: List[str] = None, 
                             job_description: str = None, profile: str = "general") -> Dict[str, Any]:
    """Analyze resume using Groq API."""
    try:
        print("🚀 Starting resume analysis with Groq...")
        
        if file_path.endswith(".pdf"):
            text = extract_text_from_pdf(file_path)
        elif file_path.endswith(".docx"):
            text = extract_text_from_docx(file_path)
        else:
            raise ValueError("Unsupported file format")
        
        if not text.strip():
            raise ValueError("No text extracted from file")
        
        print(f"📄 Extracted {len(text)} characters")
        
        prompt = create_optimized_prompt(text, job_title, job_description)
        print(f"📝 Generated {len(prompt)} character prompt")
        
        analysis_type = "complex" if job_title and job_description else "basic"
        
        # Single API call
        response_text = call_groq_with_rate_limit(prompt, analysis_type)
        result = parse_groq_response(response_text)
        
        result["processing_info"] = {
            "resume_length": len(text),
            "prompt_length": len(prompt),
            "analysis_type": analysis_type,
            "timestamp": time.time(),
            "api": "groq"
        }
        
        print("✅ Analysis completed")
        return result
        
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Analysis failed: {error_msg}")
        
        return {
            "skills": [],
            "projects": [],
            "projects_with_skills": {},
            "quantifiable_impacts": {},
            "relevant_projects": [],
            "analysis": {
                "total_skills_found": 0,
                "total_projects": 0,
                "relevant_projects": 0,
                "skills_with_metrics": 0,
                "achieved_score": 0,
                "max_possible_score": 100
            },
            "error": error_msg,
            "processing_info": {
                "error_time": time.time(),
                "analysis_type": "failed",
                "api": "groq"
            }
        }

def test_groq_connection() -> bool:
    """Test Groq API connection."""
    try:
        print("🔧 Testing Groq connection...")
        
        client = Groq(api_key=os.environ.get('GROQ_API_KEY'))
        
        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": "Reply with just: 'OK'"}],
            model=GROQ_MODELS[0],
            temperature=0.0,
            # Reasoning models spend tokens before emitting content, so a
            # 10 token budget would always come back empty
            max_tokens=300,
            reasoning_effort=REASONING_EFFORT,
        )
        
        response_text = chat_completion.choices[0].message.content
        success = response_text and "ok" in response_text.lower()
        print(f"✅ Connection: {'PASSED' if success else 'FAILED'}")
        return success
        
    except Exception as e:
        print(f"❌ Connection failed: {str(e)}")
        print("Get your API key at: https://console.groq.com/keys")
        return False

# Backwards compatibility
analyze_resume = analyze_resume_with_groq