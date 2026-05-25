/*
  Report.jsx — Final Feedback Report
  ------------------------------------
  Receives allAnswers (each with question, answer, feedback)
  already collected during the interview. No extra API call needed.
  Computes overall score as average of per-question scores.
*/

export default function Report({ answers, sessionData, onRestart }) {

  // Compute overall score from per-question scores
  const scoredAnswers = answers.filter(a => a.feedback?.score)
  const overallScore  = scoredAnswers.length
    ? Math.round(scoredAnswers.reduce((sum, a) => sum + a.feedback.score, 0) / scoredAnswers.length)
    : null

  const scoreColor = (n) => {
    if (n >= 8) return 'text-green-400'
    if (n >= 5) return 'text-yellow-400'
    return 'text-red-400'
  }

  const scoreBg = (n) => {
    if (n >= 8) return 'bg-green-500/20 border-green-500/40'
    if (n >= 5) return 'bg-yellow-500/20 border-yellow-500/40'
    return 'bg-red-500/20 border-red-500/40'
  }

  // Collect all strengths and improvements across questions
  const allStrengths    = answers.flatMap(a => a.feedback?.strengths    || [])
  const allImprovements = answers.flatMap(a => a.feedback?.improvements || [])

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">
            Round<span className="text-blue-400">one</span>
            <span className="text-slate-400 text-lg font-normal ml-3">Feedback Report</span>
          </h1>
          <button
            onClick={onRestart}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
          >
            New Interview
          </button>
        </div>

        {/* Role info */}
        {sessionData?.jobTitle && (
          <p className="text-slate-400 text-sm">
            {sessionData.name && <span className="text-white font-medium">{sessionData.name} · </span>}
            {sessionData.jobTitle}
            {sessionData.company && <span> at {sessionData.company}</span>}
          </p>
        )}

        {/* Overall score */}
        {overallScore !== null && (
          <div className={`rounded-2xl border p-6 ${scoreBg(overallScore)}`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-white text-xl font-semibold">Overall Score</h2>
                <p className="text-slate-400 text-sm mt-1">
                  Average across {answers.length} question{answers.length > 1 ? 's' : ''}
                </p>
              </div>
              <span className={`text-5xl font-bold ${scoreColor(overallScore)}`}>
                {overallScore}<span className="text-2xl text-slate-400">/10</span>
              </span>
            </div>
          </div>
        )}

        {/* Strengths + Improvements summary */}
        {(allStrengths.length > 0 || allImprovements.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allStrengths.length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
                <h3 className="text-green-400 font-semibold mb-3">✓ Strengths</h3>
                <ul className="space-y-2">
                  {allStrengths.slice(0, 5).map((s, i) => (
                    <li key={i} className="text-slate-300 text-sm flex gap-2">
                      <span className="text-green-400 flex-shrink-0">•</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {allImprovements.length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
                <h3 className="text-yellow-400 font-semibold mb-3">↑ Areas to Improve</h3>
                <ul className="space-y-2">
                  {allImprovements.slice(0, 5).map((item, i) => (
                    <li key={i} className="text-slate-300 text-sm flex gap-2">
                      <span className="text-yellow-400 flex-shrink-0">•</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Per-question breakdown */}
        <h2 className="text-white text-xl font-semibold">Question Breakdown</h2>

        {answers.map((item, i) => (
          <div key={i} className="bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-4">

            {/* Question + score */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3 flex-1">
                <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center font-semibold flex-shrink-0">
                  {i + 1}
                </span>
                <p className="text-white font-medium leading-snug">{item.question}</p>
              </div>
              {item.feedback?.score && (
                <span className={`text-2xl font-bold flex-shrink-0 ${scoreColor(item.feedback.score)}`}>
                  {item.feedback.score}/10
                </span>
              )}
            </div>

            {/* Answer */}
            <div className="bg-slate-900 rounded-xl p-4">
              <p className="text-slate-400 text-xs mb-1 uppercase tracking-wide">Your Answer</p>
              <p className="text-slate-300 text-sm leading-relaxed">{item.answer}</p>
            </div>

            {item.feedback ? (
              <>
                {/* Feedback */}
                <div>
                  <p className="text-slate-400 text-xs mb-1 uppercase tracking-wide">Feedback</p>
                  <p className="text-slate-300 text-sm leading-relaxed">{item.feedback.feedback}</p>
                </div>

                {/* STAR coaching */}
                <div className="bg-blue-900/30 border border-blue-700/40 rounded-xl p-4">
                  <p className="text-blue-300 text-xs font-semibold mb-1 uppercase tracking-wide">
                    STAR Coaching
                  </p>
                  <p className="text-slate-300 text-sm leading-relaxed">{item.feedback.star_coaching}</p>
                </div>

                {/* Better answer */}
                <div className="bg-green-900/20 border border-green-700/30 rounded-xl p-4">
                  <p className="text-green-300 text-xs font-semibold mb-1 uppercase tracking-wide">
                    Sample Stronger Answer
                  </p>
                  <p className="text-slate-300 text-sm leading-relaxed">{item.feedback.better_answer}</p>
                </div>
              </>
            ) : (
              <p className="text-slate-500 text-sm italic">No feedback available for this question.</p>
            )}
          </div>
        ))}

        {/* Footer */}
        <div className="text-center pb-10">
          <button
            onClick={onRestart}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-lg transition-colors"
          >
            Practice Again
          </button>
        </div>

      </div>
    </div>
  )
}
