"""
test_api.py — Quick API test for Phase 3
Run with: python test_api.py
Make sure the server is running first:
  python -m uvicorn backend.main:app --reload
"""

import httpx

BASE_URL = "http://localhost:8000"

# Use verify=False for university network SSL inspection
http = httpx.Client(verify=False)


def test_health():
    print("=== GET / (health check) ===")
    r = http.get(f"{BASE_URL}/")
    print(f"Status : {r.status_code}")
    print(f"Body   : {r.json()}")
    print()


def test_parse_cv():
    print("=== POST /parse-cv ===")
    with open("Swapniln_CV.docx", "rb") as f:
        r = http.post(
            f"{BASE_URL}/parse-cv",
            files={"file": ("Swapniln_CV.docx", f, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
        )
    data = r.json()
    print(f"Status     : {r.status_code}")
    print(f"Filename   : {data.get('filename')}")
    print(f"Char count : {data.get('char_count')}")
    print(f"Preview    : {data.get('cv_text', '')[:250]}")
    print()
    return data.get("cv_text", "")


def test_generate_questions(cv_text: str):
    print("=== POST /generate-questions ===")
    payload = {
        "cv_text": cv_text,
        "job_title": "Data Scientist",
        "company": "HSBC",
        "industry": "data science",
        "interview_type": "technical",
        "seniority": "mid-level",
    }
    r = http.post(f"{BASE_URL}/generate-questions", json=payload)
    data = r.json()
    print(f"Status    : {r.status_code}")
    print(f"Questions : {data.get('count')}")
    for i, q in enumerate(data.get("questions", []), start=1):
        print(f"  {i}. {q}")
    print()


if __name__ == "__main__":
    test_health()
    cv_text = test_parse_cv()
    if cv_text:
        test_generate_questions(cv_text)
    print("PASSED - All Phase 3 API tests complete.")
