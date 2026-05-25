# Roundone 🎯

An AI-powered mock interview preparation platform that tailors questions to your CV and gives instant feedback after every answer.

---

## What it does

1. **Upload your CV** (PDF or DOCX)
2. **Enter the role details** — job title, company, industry, interview type, seniority level
3. **Live mock interview** — questions are read aloud, your camera is on, and your spoken answers are captured in real time
4. **Instant per-question feedback** — score, STAR coaching, and a sample stronger answer after every response
5. **Full report** at the end — overall score, strengths, areas to improve

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python, FastAPI |
| CV Parsing | pdfplumber, python-docx |
| AI / LLM | Groq API (Llama 3.3 70B) |
| Frontend | React, Tailwind CSS, Vite |
| Camera | WebRTC (browser native) |
| Speech to Text | Web Speech API (browser native) |
| Text to Speech | Web Speech Synthesis API (browser native) |

---

## Project Structure

```
roundone/
├── backend/
│   ├── main.py          # FastAPI app — all endpoints
│   ├── parser.py        # CV text extraction (PDF + DOCX)
│   ├── questions.py     # Interview question generator
│   └── feedback.py      # Per-question feedback generator
├── frontend/
│   └── src/
│       ├── App.jsx
│       └── components/
│           ├── InputForm.jsx   # CV upload + job details form
│           ├── Interview.jsx   # Live interview screen
│           └── Report.jsx      # Final feedback report
├── .env                 # API keys (not committed)
└── README.md
```

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- A free [Groq API key](https://console.groq.com)

### 1. Clone the repo

```bash
git clone https://github.com/NalawadeSwapnil/roundone.git
cd roundone
```

### 2. Set up environment variables

Create a `.env` file in the root folder:

```
GROQ_API_KEY=your_groq_api_key_here
```

### 3. Install Python dependencies

```bash
pip install pdfplumber python-docx groq python-dotenv fastapi uvicorn python-multipart httpx certifi truststore
```

### 4. Install frontend dependencies

```bash
cd frontend
npm install
```

### 5. Run the app

Open two terminals:

**Terminal 1 — Backend:**
```bash
python -m uvicorn backend.main:app --reload
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Health check |
| `POST` | `/parse-cv` | Upload a CV and extract text |
| `POST` | `/generate-questions` | Generate tailored interview questions |
| `POST` | `/generate-feedback` | Generate feedback for a Q&A pair |

---

## Notes

- Speech recognition and synthesis use the browser's built-in Web Speech API — no extra cost or setup
- The app prioritises Microsoft Neural voices (available on Windows in Chrome/Edge) for more natural question delivery
- Built and tested on Windows 11 with Python 3.13 and Node.js 24

---

## License

MIT
