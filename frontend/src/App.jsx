/*
  App.jsx — Root component for Roundone
  --------------------------------------
  Controls which screen is shown.
  Screens:
    "form"      → InputForm  (Phase 4)
    "interview" → Interview  (Phase 5)
    "report"    → Report     (Phase 6)
*/

import { useState } from 'react'
import InputForm from './components/InputForm'
import Interview from './components/Interview'
import Report from './components/Report'

function App() {
  const [screen, setScreen]       = useState('form')
  const [questions, setQuestions] = useState([])
  const [sessionData, setSessionData] = useState(null)
  const [answers, setAnswers]     = useState([])

  // InputForm → Interview
  const handleInterviewReady = (generatedQuestions, data) => {
    setQuestions(generatedQuestions)
    setSessionData(data)
    setScreen('interview')
  }

  // Interview → Report (Phase 6)
  const handleInterviewComplete = (completedAnswers, data) => {
    setAnswers(completedAnswers)
    setSessionData(data)
    setScreen('report')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {screen === 'form' && (
        <InputForm onInterviewReady={handleInterviewReady} />
      )}

      {screen === 'interview' && (
        <Interview
          questions={questions}
          sessionData={sessionData}
          onInterviewComplete={handleInterviewComplete}
        />
      )}

      {screen === 'report' && (
        <Report
          answers={answers}
          sessionData={sessionData}
          onRestart={() => {
            setScreen('form')
            setQuestions([])
            setAnswers([])
            setSessionData(null)
          }}
        />
      )}
    </div>
  )
}

export default App
