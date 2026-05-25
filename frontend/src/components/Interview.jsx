/*
  Interview.jsx — Live Interview Screen (Revised)
  -------------------------------------------------
  Flow per question:
    1. Question shown + spoken aloud
    2. Candidate speaks → timer starts on first word
    3. Candidate clicks "Submit Answer" (or timer hits 0)
    4. Per-question feedback loads inline
    5. Two options: "Practice Again" (redo same) | "Next Question"
    6. After all 10 questions → onInterviewComplete()

  Changes from v1:
    - Timer starts only when candidate begins speaking
    - Timer is 3 minutes (180s)
    - Feedback shown inline after each answer
    - Practice Again / Next Question flow
*/

import { useEffect, useRef, useState, useCallback } from 'react'

const QUESTION_TIME = 180  // 3 minutes

// ---------------------------------------------------------------------------
// Voice selector — picks the most natural sounding voice available.
// Priority order: Microsoft Neural (Windows/Edge) > Google > any English voice.
// Voices load asynchronously so we wait for the voiceschanged event.
// ---------------------------------------------------------------------------
const PREFERRED_VOICES = [
  'Microsoft Libby Online (Natural)',   // UK English female — very natural
  'Microsoft Mia Online (Natural)',     // UK English female
  'Microsoft Aria Online (Natural)',    // US English female — excellent
  'Microsoft Jenny Online (Natural)',   // US English female
  'Microsoft Ryan Online (Natural)',    // UK English male
  'Microsoft Guy Online (Natural)',     // US English male
  'Google UK English Female',
  'Google UK English Male',
  'Google US English',
]

const getBestVoice = () => {
  const voices = window.speechSynthesis.getVoices()
  for (const name of PREFERRED_VOICES) {
    const match = voices.find(v => v.name.includes(name))
    if (match) return match
  }
  // Fall back to any English voice
  return voices.find(v => v.lang?.startsWith('en')) || null
}

export default function Interview({ questions, sessionData, onInterviewComplete }) {
  const videoRef       = useRef(null)
  const streamRef      = useRef(null)
  const recognitionRef = useRef(null)

  // Which question we're on
  const [currentIndex, setCurrentIndex] = useState(0)

  // Phase per question: 'speaking' | 'feedback'
  const [phase, setPhase] = useState('speaking')

  // Timer — only counts down once candidate starts speaking
  const [timeLeft, setTimeLeft]       = useState(QUESTION_TIME)
  const [timerActive, setTimerActive] = useState(false)
  const timerRef = useRef(null)

  // Speech
  const [transcript, setTranscript]   = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking]   = useState(false)
  const [speechSupported, setSpeechSupported] = useState(true)

  // Camera
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState('')

  // Per-question feedback
  const [questionFeedback, setQuestionFeedback]     = useState(null)
  const [loadingFeedback, setLoadingFeedback]       = useState(false)
  const [feedbackError, setFeedbackError]           = useState('')

  // Accumulate all answers across questions
  const [allAnswers, setAllAnswers] = useState([])

  const currentQuestion = questions[currentIndex]
  const isLastQuestion  = currentIndex === questions.length - 1

  // -------------------------------------------------------------------------
  // Camera startup
  // -------------------------------------------------------------------------
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: true,
        })
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
        setCameraReady(true)
      } catch {
        setCameraError('Camera access denied. Please allow access and refresh.')
      }
    }
    startCamera()
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
      window.speechSynthesis.cancel()
      recognitionRef.current?.stop()
      clearInterval(timerRef.current)
    }
  }, [])

  // -------------------------------------------------------------------------
  // Speak the current question aloud, then start recognition
  // -------------------------------------------------------------------------
  const speakQuestion = useCallback((text) => {
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)

    // Pick the best available voice — Microsoft Neural voices sound far more
    // natural than the default. Voices may not be loaded yet on first call,
    // so we try immediately and also listen for voiceschanged.
    const trySpeak = () => {
      const voice = getBestVoice()
      if (voice) utterance.voice = voice

      utterance.rate  = 0.88   // slightly slower = more authoritative / natural
      utterance.pitch = 1.0
      utterance.lang  = voice?.lang || 'en-GB'

      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend   = () => { setIsSpeaking(false); startListening() }
      utterance.onerror = () => { setIsSpeaking(false); startListening() }

      window.speechSynthesis.speak(utterance)
    }

    // If voices aren't loaded yet, wait for them
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null
        trySpeak()
      }
    } else {
      trySpeak()
    }
  }, [startListening])

  // -------------------------------------------------------------------------
  // Speech recognition
  // -------------------------------------------------------------------------
  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setSpeechSupported(false); return }

    const r = new SR()
    r.lang             = 'en-GB'
    r.continuous       = true
    r.interimResults   = true

    r.onresult = (e) => {
      let full = ''
      for (let i = 0; i < e.results.length; i++) {
        full += e.results[i][0].transcript + ' '
      }
      setTranscript(full.trim())
    }
    r.onend   = () => setIsListening(false)
    r.onerror = (e) => {
      if (e.error === 'no-speech') r.start()
      else setIsListening(false)
    }

    recognitionRef.current = r
    r.start()
    setIsListening(true)
  }, [])

  // Start speaking when camera is ready or question changes
  useEffect(() => {
    if (cameraReady && phase === 'speaking') {
      setTranscript('')
      setTimeLeft(QUESTION_TIME)
      setTimerActive(false)
      clearInterval(timerRef.current)
      speakQuestion(currentQuestion)
    }
  }, [cameraReady, currentIndex, phase])

  // -------------------------------------------------------------------------
  // Timer — starts only when transcript becomes non-empty (candidate speaks)
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (transcript && !timerActive && phase === 'speaking') {
      setTimerActive(true)
    }
  }, [transcript])

  useEffect(() => {
    if (!timerActive) return
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          handleSubmitAnswer()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [timerActive])

  // -------------------------------------------------------------------------
  // Submit answer → fetch per-question feedback
  // -------------------------------------------------------------------------
  const handleSubmitAnswer = async () => {
    clearInterval(timerRef.current)
    recognitionRef.current?.stop()
    window.speechSynthesis.cancel()
    setIsListening(false)
    setIsSpeaking(false)
    setPhase('feedback')
    setLoadingFeedback(true)
    setFeedbackError('')

    try {
      const res = await fetch('/api/generate-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qa_pairs:  [{ question: currentQuestion, answer: transcript || '(No answer recorded)' }],
          job_title: sessionData?.jobTitle || 'the role',
          company:   sessionData?.company  || 'the company',
        }),
      })
      const data = await res.json()
      setQuestionFeedback(data?.questions_feedback?.[0] || null)
    } catch {
      setFeedbackError('Could not load feedback. You can still continue.')
    } finally {
      setLoadingFeedback(false)
    }
  }

  // -------------------------------------------------------------------------
  // Practice Again — redo the same question
  // -------------------------------------------------------------------------
  const handlePracticeAgain = () => {
    setPhase('speaking')
    setTranscript('')
    setTimeLeft(QUESTION_TIME)
    setTimerActive(false)
    setQuestionFeedback(null)
    setFeedbackError('')
    clearInterval(timerRef.current)
  }

  // -------------------------------------------------------------------------
  // Next Question (or Finish)
  // -------------------------------------------------------------------------
  const handleNext = () => {
    const updatedAnswers = [
      ...allAnswers,
      {
        question: currentQuestion,
        answer:   transcript || '(No answer recorded)',
        feedback: questionFeedback,
      },
    ]
    setAllAnswers(updatedAnswers)

    if (isLastQuestion) {
      streamRef.current?.getTracks().forEach(t => t.stop())
      onInterviewComplete(updatedAnswers, sessionData)
    } else {
      setPhase('speaking')
      setTranscript('')
      setTimeLeft(QUESTION_TIME)
      setTimerActive(false)
      setQuestionFeedback(null)
      setFeedbackError('')
      clearInterval(timerRef.current)
      setCurrentIndex(prev => prev + 1)
    }
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------
  const formatTime = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  const timerColor = timeLeft <= 30 ? 'text-red-400' : timeLeft <= 60 ? 'text-yellow-400' : 'text-green-400'

  const scoreColor = (n) => n >= 8 ? 'text-green-400' : n >= 5 ? 'text-yellow-400' : 'text-red-400'

  // -------------------------------------------------------------------------
  // Render — FEEDBACK phase
  // -------------------------------------------------------------------------
  if (phase === 'feedback') {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-2xl mx-auto space-y-5">

          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-white">
              Round<span className="text-blue-400">one</span>
            </h1>
            <span className="text-slate-400 text-sm">
              Question {currentIndex + 1} of {questions.length}
            </span>
          </div>

          {/* Question */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
            <p className="text-slate-400 text-xs uppercase tracking-wide mb-2">Question</p>
            <p className="text-white leading-relaxed">{currentQuestion}</p>
          </div>

          {/* Your answer */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
            <p className="text-slate-400 text-xs uppercase tracking-wide mb-2">Your Answer</p>
            <p className="text-slate-300 text-sm leading-relaxed">
              {transcript || '(No answer recorded)'}
            </p>
          </div>

          {/* Feedback */}
          {loadingFeedback ? (
            <div className="flex items-center gap-3 justify-center py-8">
              <svg className="animate-spin h-6 w-6 text-blue-400" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              <span className="text-slate-300">Analysing your answer...</span>
            </div>
          ) : feedbackError ? (
            <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 text-red-300 text-sm">
              {feedbackError}
            </div>
          ) : questionFeedback ? (
            <div className="space-y-4">
              {/* Score */}
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 flex items-center justify-between">
                <span className="text-white font-medium">Answer Score</span>
                <span className={`text-4xl font-bold ${scoreColor(questionFeedback.score)}`}>
                  {questionFeedback.score}<span className="text-xl text-slate-400">/10</span>
                </span>
              </div>

              {/* Feedback */}
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
                <p className="text-slate-400 text-xs uppercase tracking-wide mb-2">Feedback</p>
                <p className="text-slate-300 text-sm leading-relaxed">{questionFeedback.feedback}</p>
              </div>

              {/* STAR coaching */}
              <div className="bg-blue-900/30 border border-blue-700/40 rounded-2xl p-5">
                <p className="text-blue-300 text-xs font-semibold uppercase tracking-wide mb-2">
                  STAR Coaching
                </p>
                <p className="text-slate-300 text-sm leading-relaxed">{questionFeedback.star_coaching}</p>
              </div>

              {/* Better answer */}
              <div className="bg-green-900/20 border border-green-700/30 rounded-2xl p-5">
                <p className="text-green-300 text-xs font-semibold uppercase tracking-wide mb-2">
                  Sample Stronger Answer
                </p>
                <p className="text-slate-300 text-sm leading-relaxed">{questionFeedback.better_answer}</p>
              </div>
            </div>
          ) : null}

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-4 pt-2 pb-8">
            <button
              onClick={handlePracticeAgain}
              className="py-4 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-colors"
            >
              Practice Again
            </button>
            <button
              onClick={handleNext}
              disabled={loadingFeedback}
              className="py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
            >
              {isLastQuestion ? 'Finish Interview' : 'Next Question →'}
            </button>
          </div>

        </div>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Render — SPEAKING phase
  // -------------------------------------------------------------------------
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">
            Round<span className="text-blue-400">one</span>
            <span className="text-slate-400 text-base font-normal ml-3">Live Interview</span>
          </h1>
          <span className="text-slate-400 text-sm">
            Question {currentIndex + 1} of {questions.length}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Camera */}
          <div className="space-y-4">
            <div className="relative bg-slate-800 rounded-2xl overflow-hidden aspect-video border border-slate-700">
              {cameraError ? (
                <div className="absolute inset-0 flex items-center justify-center p-6">
                  <p className="text-red-400 text-sm text-center">{cameraError}</p>
                </div>
              ) : (
                <video ref={videoRef} autoPlay muted playsInline
                  className="w-full h-full object-cover scale-x-[-1]" />
              )}
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-white text-xs font-medium">LIVE</span>
              </div>
              {isSpeaking && (
                <div className="absolute bottom-3 left-3 bg-blue-600/80 text-white text-xs px-2 py-1 rounded-full">
                  Interviewer speaking...
                </div>
              )}
              {isListening && !isSpeaking && (
                <div className="absolute bottom-3 left-3 bg-green-600/80 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  Listening...
                </div>
              )}
            </div>

            {/* Timer */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Time remaining</p>
                {!timerActive && (
                  <p className="text-slate-500 text-xs">Starts when you speak</p>
                )}
              </div>
              <span className={`text-3xl font-mono font-bold ${timerActive ? timerColor : 'text-slate-500'}`}>
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>

          {/* Question + Answer */}
          <div className="space-y-4 flex flex-col">

            {/* Question */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center font-semibold">
                  {currentIndex + 1}
                </span>
                <span className="text-slate-400 text-sm">Question</span>
                {isSpeaking && (
                  <span className="ml-auto text-blue-400 text-xs flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217z"/>
                    </svg>
                    Speaking
                  </span>
                )}
              </div>
              <p className="text-white text-lg leading-relaxed">{currentQuestion}</p>
            </div>

            {/* Live transcript */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 flex-1">
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-400 text-sm">Your answer</span>
              </div>
              {speechSupported ? (
                <div className="min-h-28">
                  {transcript ? (
                    <p className="text-slate-200 text-sm leading-relaxed">{transcript}</p>
                  ) : (
                    <p className="text-slate-500 text-sm italic">
                      {isSpeaking ? 'Listen to the question...' : 'Start speaking — your answer will appear here'}
                    </p>
                  )}
                </div>
              ) : (
                <textarea
                  value={transcript}
                  onChange={e => setTranscript(e.target.value)}
                  placeholder="Type your answer here..."
                  className="w-full h-28 bg-slate-900 text-slate-200 text-sm rounded-lg p-3 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              )}
            </div>

            {/* Progress dots */}
            <div className="flex gap-2 justify-center">
              {questions.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${
                  i < currentIndex ? 'bg-green-500 w-6'
                  : i === currentIndex ? 'bg-blue-500 w-6'
                  : 'bg-slate-600 w-3'
                }`} />
              ))}
            </div>

            {/* Submit button */}
            <button
              onClick={handleSubmitAnswer}
              disabled={isSpeaking}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-lg transition-colors"
            >
              {isSpeaking ? 'Listen to the question first...' : 'Submit Answer'}
            </button>

          </div>
        </div>
      </div>
    </div>
  )
}
