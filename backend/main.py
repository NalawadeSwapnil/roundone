"""
main.py — FastAPI Backend for Roundone
----------------------------------------
Exposes two endpoints:

  POST /parse-cv
    Accepts a PDF or DOCX file upload.
    Returns the extracted clean text.

  POST /generate-questions
    Accepts CV text + job details as JSON.
    Returns 8-10 tailored interview questions.

Run with:
  uvicorn backend.main:app --reload
  (from the C:/ESSEX/projects/Roundone directory)
"""

import os
import shutil
import uuid

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.parser import parse_cv
from backend.questions import generate_questions
from backend.feedback import generate_feedback

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Roundone API",
    description="Backend for the Roundone AI interview preparation platform.",
    version="1.0.0",
)

# CORS — allows the React frontend (running on port 5173 or 3000) to call this API
# Without this, browsers block cross-origin requests entirely.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Temporary folder for uploaded CV files
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ---------------------------------------------------------------------------
# Request / Response models (Pydantic validates these automatically)
# ---------------------------------------------------------------------------

class QuestionRequest(BaseModel):
    cv_text: str
    job_title: str
    company: str
    industry: str
    interview_type: str
    seniority: str

class ParseResponse(BaseModel):
    cv_text: str
    filename: str
    char_count: int

class QuestionsResponse(BaseModel):
    questions: list[str]
    count: int

class QAPair(BaseModel):
    question: str
    answer: str

class FeedbackRequest(BaseModel):
    qa_pairs: list[QAPair]
    job_title: str
    company: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/")
def root():
    """Health check — confirms the API is running."""
    return {"status": "Roundone API is running"}


@app.post("/parse-cv", response_model=ParseResponse)
async def parse_cv_endpoint(file: UploadFile = File(...)):
    """
    Accept a CV file upload (PDF or DOCX) and return the extracted text.

    - Saves the file temporarily with a unique name to avoid collisions
    - Parses it using parse_cv()
    - Deletes the temp file immediately after parsing
    """

    # Validate file extension
    filename = file.filename or ""
    ext = os.path.splitext(filename)[1].lower()
    if ext not in [".pdf", ".docx"]:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Please upload a .pdf or .docx file."
        )

    # Save to a unique temp path to avoid filename collisions
    temp_filename = f"{uuid.uuid4().hex}{ext}"
    temp_path = os.path.join(UPLOAD_DIR, temp_filename)

    try:
        # Write uploaded file to disk
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Parse the CV
        cv_text = parse_cv(temp_path)

    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse CV: {str(e)}")
    finally:
        # Always clean up the temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)

    return ParseResponse(
        cv_text=cv_text,
        filename=filename,
        char_count=len(cv_text),
    )


@app.post("/generate-questions", response_model=QuestionsResponse)
async def generate_questions_endpoint(request: QuestionRequest):
    """
    Accept CV text and job details, return tailored interview questions.

    All fields are required. The LLM call happens here and may take 3-8 seconds.
    """

    # Basic input validation
    if not request.cv_text.strip():
        raise HTTPException(status_code=400, detail="cv_text cannot be empty.")
    if not request.job_title.strip():
        raise HTTPException(status_code=400, detail="job_title cannot be empty.")

    try:
        questions = generate_questions(
            cv_text        = request.cv_text,
            job_title      = request.job_title,
            company        = request.company,
            industry       = request.industry,
            interview_type = request.interview_type,
            seniority      = request.seniority,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate questions: {str(e)}")

    return QuestionsResponse(
        questions=questions,
        count=len(questions),
    )


@app.post("/generate-feedback")
async def generate_feedback_endpoint(request: FeedbackRequest):
    """
    Accept all Q&A pairs from a completed interview.
    Returns a structured feedback report from the LLM.
    """
    if not request.qa_pairs:
        raise HTTPException(status_code=400, detail="qa_pairs cannot be empty.")

    try:
        pairs = [{"question": p.question, "answer": p.answer} for p in request.qa_pairs]
        report = generate_feedback(
            qa_pairs  = pairs,
            job_title = request.job_title,
            company   = request.company,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate feedback: {str(e)}")

    return report
