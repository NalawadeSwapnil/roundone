"""
feedback.py — Feedback Report Generator for Roundone
------------------------------------------------------
Sends all Q&A pairs to Groq and returns a structured
feedback report covering scores, strengths, improvements,
STAR coaching, and sample better answers.
"""

import os
import re
import json
import httpx
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

_http_client = httpx.Client(verify=False)
client = Groq(api_key=os.getenv("GROQ_API_KEY"), http_client=_http_client)


def generate_feedback(qa_pairs: list[dict], job_title: str, company: str) -> dict:
    """
    Generate a structured feedback report for a completed mock interview.

    Args:
        qa_pairs   : List of {"question": str, "answer": str}
        job_title  : e.g. "Data Analyst"
        company    : e.g. "HSBC"

    Returns:
        A dict with keys: overall_score, summary, strengths,
        improvements, questions_feedback
    """

    # Format Q&A pairs for the prompt
    qa_text = ""
    for i, pair in enumerate(qa_pairs, start=1):
        qa_text += f"\nQuestion {i}: {pair['question']}\n"
        qa_text += f"Answer {i}: {pair['answer']}\n"

    prompt = f"""You are an expert interview coach reviewing a mock interview for a {job_title} role at {company}.

Below are the interview questions and the candidate's spoken answers:
{qa_text}

Provide a detailed, honest, and constructive feedback report in the following JSON format ONLY.
Do not include any text outside the JSON.

{{
  "overall_score": <integer 1-10>,
  "summary": "<2-3 sentence overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": ["<area 1>", "<area 2>", "<area 3>"],
  "questions_feedback": [
    {{
      "question": "<the question>",
      "answer_given": "<brief summary of what was said>",
      "score": <integer 1-10>,
      "feedback": "<specific feedback on this answer>",
      "star_coaching": "<how to structure this answer using STAR: Situation, Task, Action, Result>",
      "better_answer": "<a sample stronger answer for this question>"
    }}
  ]
}}"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": "You are an expert interview coach. You provide honest, structured, actionable feedback in valid JSON only. No extra text outside JSON."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.4,
        max_tokens=2048,
    )

    raw = response.choices[0].message.content.strip()

    # Extract JSON — sometimes the model wraps it in ```json ... ```
    json_match = re.search(r'\{.*\}', raw, re.DOTALL)
    if not json_match:
        raise ValueError(f"Could not parse feedback JSON. Raw response:\n{raw}")

    return json.loads(json_match.group())
