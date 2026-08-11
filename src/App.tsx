import { useEffect, useMemo, useRef, useState } from 'react'
import verbsRaw from './assets/verbs.txt?raw'
import './App.css'
import {
  SUBJECTS,
  TENSE_LABEL,
  TENSES,
  normalize,
  parseVerbs,
  type Tense,
  type Verb,
} from './lib/verbs'

type Phase = 'setup' | 'quiz' | 'results'

interface Question {
  verb: Verb
  tense: Tense
  subject: number
}

interface ResultEntry {
  question: Question
  answer: string
  correct: boolean
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function buildQuestions(
  verbs: Verb[],
  tenses: Tense[],
  count: number,
): Question[] {
  const pool: Question[] = []
  for (const verb of verbs) {
    for (const tense of tenses) {
      if (verb[tense].length === 6) {
        for (let s = 0; s < 6; s++) pool.push({ verb, tense, subject: s })
      }
    }
  }
  if (pool.length === 0) return []
  const questions: Question[] = []
  for (let i = 0; i < count; i++) questions.push(pick(pool))
  return questions
}

function App() {
  const [verbs, setVerbs] = useState<Verb[]>([])
  const [phase, setPhase] = useState<Phase>('setup')
  const [tenses, setTenses] = useState<Tense[]>([...TENSES])
  const [included, setIncluded] = useState<Set<string>>(new Set())
  const [count, setCount] = useState(20)
  const [timeLimit, setTimeLimit] = useState(15)

  const [questions, setQuestions] = useState<Question[]>([])
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<ResultEntry[]>([])
  const [answer, setAnswer] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setVerbs(parseVerbs(verbsRaw))
  }, [])

  useEffect(() => {
    if (verbs.length) setIncluded(new Set(verbs.map((v) => v.infinitive)))
  }, [verbs])

  const availableVerbs = useMemo(
    () => verbs.filter((v) => tenses.some((t) => v[t].length === 6)),
    [verbs, tenses],
  )

  const selectedVerbs = useMemo(
    () => verbs.filter((v) => included.has(v.infinitive)),
    [verbs, included],
  )

  const question = questions[index]

  function toggleTense(tense: Tense) {
    setTenses((prev) =>
      prev.includes(tense) ? prev.filter((t) => t !== tense) : [...prev, tense],
    )
  }

  function toggleVerb(infinitive: string) {
    setIncluded((prev) => {
      const next = new Set(prev)
      if (next.has(infinitive)) next.delete(infinitive)
      else next.add(infinitive)
      return next
    })
  }

  function start() {
    const qs = buildQuestions(selectedVerbs, tenses, count)
    if (qs.length === 0) return
    setQuestions(qs)
    setAnswers([])
    setIndex(0)
    setAnswer('')
    setRevealed(false)
    setStreak(0)
    setBestStreak(0)
    setSecondsLeft(timeLimit)
    setPhase('quiz')
  }

  useEffect(() => {
    if (phase !== 'quiz' || !question) return
    inputRef.current?.focus()
    if (timeLimit <= 0) return
    setSecondsLeft(timeLimit)
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id)
          setRevealed(true)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [phase, index, timeLimit, question])

  function submit() {
    if (!question || revealed) return
    const correct = normalize(answer) === normalize(question.verb[question.tense][question.subject])
    const entry: ResultEntry = {
      question,
      answer: answer.trim(),
      correct,
    }
    setAnswers((prev) => [...prev, entry])
    setRevealed(true)
    setStreak((prev) => {
      const next = correct ? prev + 1 : 0
      if (next > bestStreak) setBestStreak(next)
      return next
    })
  }

  function next() {
    if (index + 1 >= questions.length) {
      setPhase('results')
      return
    }
    setIndex((i) => i + 1)
    setAnswer('')
    setRevealed(false)
  }

  function skip() {
    if (!question || revealed) return
    setAnswers((prev) => [
      ...prev,
      { question, answer: '', correct: false },
    ])
    setRevealed(true)
    setStreak(0)
  }

  const answered = answers.length
  const correctCount = answers.filter((a) => a.correct).length

  return (
    <div className="app">
      <header className="header">
        <h1>Conjuga</h1>
        <p className="tagline">Spanish verb conjugation practice</p>
      </header>

      {phase === 'setup' && (
        <section className="card setup">
          <div className="setup-block">
            <h2>Tenses</h2>
            <div className="chips">
              {TENSES.map((tense) => (
                <button
                  key={tense}
                  className={`chip ${tenses.includes(tense) ? 'on' : ''}`}
                  onClick={() => toggleTense(tense)}
                >
                  {TENSE_LABEL[tense]}
                </button>
              ))}
            </div>
            <p className="hint">{availableVerbs.length} verbs available for these tenses</p>
          </div>

          <div className="setup-block">
            <h2>Verbs ({selectedVerbs.length})</h2>
            <div className="verb-actions">
              <button
                className="ghost"
                onClick={() => setIncluded(new Set(verbs.map((v) => v.infinitive)))}
              >
                Select all
              </button>
              <button className="ghost" onClick={() => setIncluded(new Set())}>
                Clear
              </button>
            </div>
            <div className="verb-grid">
              {verbs.map((verb) => (
                <button
                  key={verb.infinitive}
                  className={`verb-pill ${included.has(verb.infinitive) ? 'on' : ''}`}
                  onClick={() => toggleVerb(verb.infinitive)}
                >
                  {verb.infinitive}
                </button>
              ))}
            </div>
          </div>

          <div className="setup-block">
            <h2>Options</h2>
            <div className="option-row">
              <label htmlFor="count">Questions: {count}</label>
              <input
                id="count"
                type="range"
                min={5}
                max={60}
                step={5}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
              />
            </div>
            <div className="option-row">
              <label htmlFor="time">Seconds / question: {timeLimit}</label>
              <input
                id="time"
                type="range"
                min={0}
                max={60}
                step={5}
                value={timeLimit}
                onChange={(e) => setTimeLimit(Number(e.target.value))}
              />
            </div>
          </div>

          <button className="primary" onClick={start} disabled={selectedVerbs.length === 0}>
            Start practice
          </button>
        </section>
      )}

      {phase === 'quiz' && question && (
        <section className="card quiz">
          <div className="stats">
            <div className="stat">
              <span className="stat-label">Question</span>
              <span className="stat-value">
                {index + 1}/{questions.length}
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">Score</span>
              <span className="stat-value">
                {correctCount}/{answered}
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">Streak</span>
              <span className="stat-value">{streak}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Best</span>
              <span className="stat-value">{bestStreak}</span>
            </div>
          </div>

          <div className="progress">
            <div
              className="progress-fill"
              style={{ width: `${((index + (revealed ? 1 : 0)) / questions.length) * 100}%` }}
            />
          </div>

          <div className="prompt">
            <span className="tense">{TENSE_LABEL[question.tense]}</span>
            <span className="infinitive">{question.verb.infinitive}</span>
            <span className="english">{question.verb.english}</span>
          </div>

          <div className="subject">{SUBJECTS[question.subject]}</div>

          {!revealed && (
            <form
              className="answer-form"
              onSubmit={(e) => {
                e.preventDefault()
                submit()
              }}
            >
              <input
                ref={inputRef}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type the conjugation…"
              />
              <button className="primary" type="submit" disabled={!answer.trim()}>
                Check
              </button>
            </form>
          )}

          {revealed && (
            <div className={`feedback ${answers[answered - 1]?.correct ? 'good' : 'bad'}`}>
              <div className="feedback-answer">
                {answers[answered - 1]?.correct
                  ? 'Correct!'
                  : `Correct answer: ${question.verb[question.tense][question.subject]}`}
              </div>
              <button className="primary" onClick={next}>
                {index + 1 >= questions.length ? 'See results' : 'Next'}
              </button>
            </div>
          )}

          {!revealed && (
            <button className="ghost skip" onClick={skip}>
              Skip
            </button>
          )}

          {timeLimit > 0 && !revealed && (
            <div className={`timer ${secondsLeft <= 5 ? 'low' : ''}`}>
              {secondsLeft}s
            </div>
          )}
        </section>
      )}

      {phase === 'results' && (
        <section className="card results">
          <h2>Results</h2>
          <div className="result-stats">
            <div className="stat">
              <span className="stat-label">Score</span>
              <span className="stat-value">
                {correctCount}/{answers.length}
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">Accuracy</span>
              <span className="stat-value">
                {answers.length ? Math.round((correctCount / answers.length) * 100) : 0}%
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">Best streak</span>
              <span className="stat-value">{bestStreak}</span>
            </div>
          </div>

          {answers.some((a) => !a.correct) && (
            <div className="review">
              <h3>Review mistakes</h3>
              <ul>
                {answers.map((a, i) =>
                  a.correct ? null : (
                    <li key={i}>
                      <span className="review-q">
                        {a.question.verb.infinitive} · {TENSE_LABEL[a.question.tense]} ·{' '}
                        {SUBJECTS[a.question.subject]}
                      </span>
                      {a.answer && (
                        <span className="review-wrong">{a.answer || '—'}</span>
                      )}
                      <span className="review-right">
                        {a.question.verb[a.question.tense][a.question.subject]}
                      </span>
                    </li>
                  ),
                )}
              </ul>
            </div>
          )}

          <button
            className="primary"
            onClick={() => {
              setPhase('setup')
            }}
          >
            Back to setup
          </button>
          <button
            className="ghost"
            onClick={() => {
              const qs = buildQuestions(selectedVerbs, tenses, count)
              setQuestions(qs)
              setAnswers([])
              setIndex(0)
              setAnswer('')
              setRevealed(false)
              setStreak(0)
              setBestStreak(0)
              setSecondsLeft(timeLimit)
              setPhase('quiz')
            }}
          >
            Practice again
          </button>
        </section>
      )}
    </div>
  )
}

export default App
