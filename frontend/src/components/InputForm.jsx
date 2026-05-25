/*
  InputForm.jsx — CV Upload & Job Details Form
  ---------------------------------------------
  Step 1 of the Roundone interview flow.

  What it does:
    1. Collects candidate name, CV file, job title, company,
       industry, interview type and seniority level
    2. Sends the CV to POST /parse-cv to extract text
    3. Sends the extracted text + job details to POST /generate-questions
    4. Calls onInterviewReady() with the questions so App.jsx can
       switch to the interview screen

  State breakdown:
    formData   → all text field values
    cvFile     → the selected File object
    loading    → true while API calls are in progress
    error      → any error message to display
    questions  → generated questions (shown before starting interview)
    cvText     → extracted CV text (stored for later use in feedback phase)
*/

import { useState } from 'react'

// Use Vite's proxy (/api → http://127.0.0.1:8000)
// This avoids CORS and browser proxy issues on university/corporate networks
const API_BASE = '/api'

// Dropdown options — easy to extend later
const INDUSTRIES = [
  'Data Science',
  'Software Engineering',
  'Finance',
  'Marketing',
  'Consulting',
  'Healthcare',
  'Product Management',
  'Other',
]

const INTERVIEW_TYPES = [
  'Technical',
  'Behavioural',
  'Mixed',
  'Case Study',
  'HR / Culture',
]

const SENIORITY_LEVELS = [
  'Intern',
  'Junior',
  'Mid-Level',
  'Senior',
  'Lead / Manager',
]

export default function InputForm({ onInterviewReady }) {
  const [formData, setFormData] = useState({
    name: '',
    jobTitle: '',
    company: '',
    industry: '',
    interviewType: '',
    seniority: '',
  })
  const [cvFile, setCvFile]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  // Generic handler for all text inputs and selects
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleFileChange = (e) => {
    setCvFile(e.target.files[0] || null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Basic validation
    if (!cvFile) return setError('Please upload your CV.')
    if (!formData.jobTitle.trim()) return setError('Please enter a job title.')
    if (!formData.industry) return setError('Please select an industry.')
    if (!formData.interviewType) return setError('Please select an interview type.')
    if (!formData.seniority) return setError('Please select a seniority level.')

    setLoading(true)

    try {
      // --- Step 1: Parse the CV ---
      const fileForm = new FormData()
      fileForm.append('file', cvFile)

      const parseRes = await fetch(`${API_BASE}/parse-cv`, {
        method: 'POST',
        body: fileForm,
      })
      if (!parseRes.ok) {
        const err = await parseRes.json()
        throw new Error(err.detail || 'Failed to parse CV.')
      }
      const parseData = await parseRes.json()

      // --- Step 2: Generate questions ---
      const questRes = await fetch(`${API_BASE}/generate-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cv_text:        parseData.cv_text,
          job_title:      formData.jobTitle,
          company:        formData.company || 'the company',
          industry:       formData.industry.toLowerCase(),
          interview_type: formData.interviewType.toLowerCase(),
          seniority:      formData.seniority.toLowerCase(),
        }),
      })
      if (!questRes.ok) {
        const err = await questRes.json()
        throw new Error(err.detail || 'Failed to generate questions.')
      }
      const questData = await questRes.json()

      // Go straight to interview — candidate should not see questions in advance
      onInterviewReady(questData.questions, {
        ...formData,
        cvText: parseData.cv_text,
      })

    } catch (err) {
      setError(err.message || 'Something went wrong. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold text-white tracking-tight">
            Round<span className="text-blue-400">one</span>
          </h1>
          <p className="text-slate-400 mt-3 text-lg">
            AI-powered interview preparation — tailored to your CV
          </p>
        </div>

        {/* Form panel */}
          <form
            onSubmit={handleSubmit}
            className="bg-slate-800 border border-slate-700 rounded-2xl p-8 space-y-5"
          >

            {/* Name */}
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1">
                Your Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Jane Smith"
                className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-3 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* CV Upload */}
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1">
                Upload CV <span className="text-red-400">*</span>
              </label>
              <div className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 flex items-center gap-3">
                <label className="cursor-pointer bg-blue-600 hover:bg-blue-500 text-white text-sm px-3 py-1.5 rounded-md transition-colors">
                  Choose File
                  <input
                    type="file"
                    accept=".pdf,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                <span className="text-slate-400 text-sm truncate">
                  {cvFile ? cvFile.name : 'No file chosen (.pdf or .docx)'}
                </span>
              </div>
            </div>

            {/* Job Title + Company */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-1">
                  Job Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="jobTitle"
                  value={formData.jobTitle}
                  onChange={handleChange}
                  placeholder="e.g. Data Analyst"
                  className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-3 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-1">
                  Company
                </label>
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  placeholder="e.g. Goldman Sachs"
                  className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-3 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Industry */}
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1">
                Industry <span className="text-red-400">*</span>
              </label>
              <select
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="" disabled>Select industry</option>
                {INDUSTRIES.map(i => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </div>

            {/* Interview Type + Seniority */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-1">
                  Interview Type <span className="text-red-400">*</span>
                </label>
                <select
                  name="interviewType"
                  value={formData.interviewType}
                  onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="" disabled>Select type</option>
                  {INTERVIEW_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-1">
                  Seniority Level <span className="text-red-400">*</span>
                </label>
                <select
                  name="seniority"
                  value={formData.seniority}
                  onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="" disabled>Select level</option>
                  {SENIORITY_LEVELS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm">
                {error}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-lg transition-colors duration-200 mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Generating your interview...
                </span>
              ) : (
                'Generate My Interview'
              )}
            </button>

          </form>
      </div>
    </div>
  )
}
