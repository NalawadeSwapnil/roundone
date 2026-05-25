"""
questions.py — Question Generator for Roundone
------------------------------------------------
Uses the Groq API (Llama 3 model) to generate tailored interview questions
based on the candidate's CV and the role they are applying for.

Why Groq?
  - Genuinely free tier, no credit card required
  - No UK/EU regional restrictions (unlike Gemini free tier)
  - Very fast inference thanks to Groq's custom LPU hardware
  - Llama 3 produces high-quality, contextual questions
"""

import os
import re
import httpx
from groq import Groq
from dotenv import load_dotenv

# Load GROQ_API_KEY from the .env file
load_dotenv()

# NOTE: verify=False disables SSL certificate verification.
# This is required when developing on a university/corporate network that uses
# SSL inspection (a proxy that re-signs HTTPS traffic with its own certificate).
# In production or on a normal network, change this to verify=True.
_http_client = httpx.Client(verify=False)
client = Groq(api_key=os.getenv("GROQ_API_KEY"), http_client=_http_client)

# ---------------------------------------------------------------------------
# Industry context map
# Tells the LLM what topics and skills to focus on per industry.
# ---------------------------------------------------------------------------
INDUSTRY_CONTEXT = {
    "data science": (
        "Focus on Python, SQL, machine learning algorithms, model evaluation metrics, "
        "data wrangling, statistics, A/B testing, and experience with tools like "
        "pandas, scikit-learn, TensorFlow, or PyTorch."
    ),
    "finance": (
        "Focus on financial modelling, DCF valuation, LBO analysis, Excel, "
        "accounting principles, investment thesis construction, risk management, "
        "and regulatory knowledge relevant to the role."
    ),
    "marketing": (
        "Focus on campaign strategy, ROI measurement, customer segmentation, "
        "digital marketing channels (SEO, PPC, social), brand positioning, "
        "content strategy, and analytics tools like Google Analytics."
    ),
    "software engineering": (
        "Focus on system design, data structures and algorithms, code quality, "
        "testing practices, CI/CD, cloud platforms, and relevant programming "
        "languages and frameworks mentioned in the CV."
    ),
    "consulting": (
        "Focus on structured problem solving, case frameworks (MECE, issue trees), "
        "stakeholder communication, project delivery, change management, "
        "and quantifying impact of past work."
    ),
    "healthcare": (
        "Focus on clinical knowledge relevant to the role, patient care standards, "
        "regulatory compliance (HIPAA, CQC), cross-functional collaboration, "
        "and evidence-based decision making."
    ),
    "product management": (
        "Focus on product strategy, roadmap prioritisation, user research, "
        "metrics definition (OKRs, KPIs), stakeholder alignment, Agile/Scrum, "
        "and go-to-market experience."
    ),
}

# Seniority guidance so questions scale in depth appropriately
SENIORITY_CONTEXT = {
    "intern":       "Keep questions straightforward and foundational. Focus on academic projects, curiosity, and learning mindset.",
    "junior":       "Focus on technical fundamentals, early career projects, and eagerness to grow.",
    "mid-level":    "Expect solid technical depth, independent delivery, and cross-team collaboration.",
    "senior":       "Probe for leadership, architectural decisions, mentoring, and driving outcomes at scale.",
    "lead/manager": "Focus on team leadership, strategic thinking, stakeholder management, and org-wide impact.",
}

# Interview type guidance
INTERVIEW_TYPE_CONTEXT = {
    "technical":   "Prioritise technical knowledge, problem-solving, and hands-on skills from the CV.",
    "behavioural": "Use the STAR framework. Ask about past situations, actions taken, and outcomes achieved.",
    "case study":  "Present business scenarios and ask the candidate to work through them structurally.",
    "hr/culture":  "Focus on values alignment, motivation, career goals, and team-fit indicators.",
    "mixed":       "Balance technical depth, behavioural examples, and motivation questions equally.",
}


def generate_questions(
    cv_text: str,
    job_title: str,
    company: str,
    industry: str,
    interview_type: str,
    seniority: str,
) -> list[str]:
    """
    Generate 8–10 tailored interview questions using the Groq API.

    Args:
        cv_text        : Cleaned CV text from parse_cv()
        job_title      : e.g. "Data Analyst"
        company        : e.g. "Goldman Sachs"
        industry       : e.g. "data science"
        interview_type : e.g. "technical"
        seniority      : e.g. "mid-level"

    Returns:
        A list of 8–10 question strings.

    Raises:
        ValueError : If the API returns an empty or unparseable response.
    """

    # Normalise inputs for map lookups
    industry_key   = industry.lower().strip()
    interview_key  = interview_type.lower().strip()
    seniority_key  = seniority.lower().strip()

    # Pull relevant context — fall back gracefully if key not in map
    industry_guidance  = INDUSTRY_CONTEXT.get(
        industry_key,
        f"Focus on skills and experience highly relevant to the {industry} industry."
    )
    interview_guidance = INTERVIEW_TYPE_CONTEXT.get(
        interview_key,
        "Ask a balanced mix of technical and behavioural questions."
    )
    seniority_guidance = SENIORITY_CONTEXT.get(
        seniority_key,
        "Calibrate question depth to the stated seniority level."
    )

    # ---------------------------------------------------------------------------
    # Prompt construction
    # Being explicit about the CV, role, and format produces far more relevant
    # questions than a generic "generate interview questions" prompt.
    # ---------------------------------------------------------------------------
    prompt = f"""You are an expert interview coach preparing highly tailored interview questions.

CANDIDATE DETAILS:
- Applying for  : {job_title} at {company}
- Industry      : {industry}
- Interview type: {interview_type}
- Seniority     : {seniority}

CANDIDATE'S CV:
\"\"\"
{cv_text}
\"\"\"

INSTRUCTIONS:
1. Read the CV carefully. Reference specific experiences, projects, skills, and achievements mentioned in it when framing questions.
2. {industry_guidance}
3. {interview_guidance}
4. {seniority_guidance}
5. Make every question specific to this candidate — avoid generic questions that could apply to anyone.
6. Generate exactly 8 to 10 questions.
7. Return ONLY a numbered list. No introductions, no explanations, no commentary.
   Example format:
   1. Question one here
   2. Question two here

Generate the questions now:"""

    # Call Groq API using the chat completions format
    # llama-3.3-70b-versatile is Groq's most capable free model
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": "You are an expert interview coach. You generate precise, tailored interview questions based on a candidate's CV and target role. You return only numbered lists with no extra commentary."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.7,   # Some creativity but still focused
        max_tokens=1024,   # Plenty of room for 10 questions
    )

    raw_output = response.choices[0].message.content.strip()

    if not raw_output:
        raise ValueError("Groq returned an empty response. Please try again.")

    # Parse the numbered list into a clean Python list
    # Handles formats like "1. ", "1) ", "1 - " etc.
    questions = []
    for line in raw_output.splitlines():
        line = line.strip()
        if not line:
            continue
        cleaned = re.sub(r"^\d+[\.\)\-\s]+", "", line).strip()
        if cleaned:
            questions.append(cleaned)

    if len(questions) < 5:
        raise ValueError(
            f"Expected 8–10 questions but only parsed {len(questions)}. "
            f"Raw response:\n{raw_output}"
        )

    return questions


# ---------------------------------------------------------------------------
# Quick self-test — run this file directly:
#   python questions.py
# ---------------------------------------------------------------------------
if __name__ == "__main__":

    # Minimal sample CV for testing (replace with real parse_cv() output)
    sample_cv = """
    Jane Doe — Data Analyst
    MSc Data Science, University of Manchester, 2022
    BSc Mathematics, University of Leeds, 2020

    Experience:
    - Junior Data Analyst at RetailCo (2022–Present)
      Built sales forecasting models using Python and scikit-learn.
      Reduced inventory waste by 18% through demand prediction pipeline.
      Created Tableau dashboards for senior stakeholders.

    Skills: Python, SQL, pandas, scikit-learn, Tableau, Excel, Git
    """

    print("[Test] Generating questions...")
    print("-" * 60)

    questions = generate_questions(
        cv_text        = sample_cv,
        job_title      = "Data Analyst",
        company        = "HSBC",
        industry       = "data science",
        interview_type = "technical",
        seniority      = "mid-level",
    )

    for i, q in enumerate(questions, start=1):
        print(f"{i}. {q}")

    print("-" * 60)
    print(f"[Test] {len(questions)} questions generated.")
    print("[Test] PASSED - Question generator working correctly.")
