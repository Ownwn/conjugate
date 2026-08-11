import { useEffect, useRef, useState } from 'react'
import verbsRaw from './assets/verbs.txt?raw'
import './App.css'
import {
  SUBJECTS,
  TENSE_LABEL,
  TENSES,
  normalize,
  parseVerbs,
  stripDiacritics,
  type Tense,
  type Verb,
} from './lib/verbs'

type Phase = 'setup' | 'quiz'

interface Question {
  verb: Verb
  tense: Tense
  subject: number
}

type Status = 'idle' | 'correct' | 'wrong'

function Infinitive({ word }: { word: string }) {
  if (word.endsWith('se') && word.length > 2) {
    return (
      <>
        {word.slice(0, -2)}
        <span className="reflexive">se</span>
      </>
    )
  }
  return <>{word}</>
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function pickQuestion(
  verbs: Verb[],
  tense: Tense,
  avoidInfinitive: string | null,
): Question {
  const candidates = verbs.filter((v) => v[tense].length === 6)
  const choices = candidates.filter((v) => v.infinitive !== avoidInfinitive)
  const pool = choices.length ? choices : candidates
  const verb = pick(pool)
  return { verb, tense, subject: Math.floor(Math.random() * SUBJECTS.length) }
}

function App() {
  const [verbs, setVerbs] = useState<Verb[]>([])
  const [phase, setPhase] = useState<Phase>('setup')
  const [tense, setTense] = useState<Tense>('present')
  const [lenient, setLenient] = useState(false)
  const [question, setQuestion] = useState<Question | null>(null)
  const [answer, setAnswer] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [flash, setFlash] = useState<'correct' | null>(null)
  const [answered, setAnswered] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(0)

  const lastInfinitive = useRef<string | null>(null)
  const attempted = useRef(false)
  const flashTimer = useRef<number | undefined>(undefined)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setVerbs(parseVerbs(verbsRaw))
    return () => window.clearTimeout(flashTimer.current)
  }, [])

  function selectTense(t: Tense) {
    setTense(t)
  }

  function start() {
    const q = pickQuestion(verbs, tense, null)
    lastInfinitive.current = q.verb.infinitive
    attempted.current = false
    setAnswered(0)
    setCorrect(0)
    setStreak(0)
    setBest(0)
    setQuestion(q)
    setAnswer('')
    setStatus('idle')
    setPhase('quiz')
  }

  function next() {
    attempted.current = false
    const q = pickQuestion(verbs, tense, lastInfinitive.current)
    lastInfinitive.current = q.verb.infinitive
    setQuestion(q)
    setAnswer('')
    setStatus('idle')
    inputRef.current?.focus()
  }

  function submit() {
    if (!question || status === 'correct') return
    const correctAnswer = question.verb[question.tense][question.subject]
    const isCorrect = lenient
      ? stripDiacritics(normalize(answer)) === stripDiacritics(normalize(correctAnswer))
      : normalize(answer) === normalize(correctAnswer)
    const firstAttempt = !attempted.current

    if (firstAttempt) {
      attempted.current = true
      setAnswered((a) => a + 1)
      if (isCorrect) setCorrect((c) => c + 1)
    }

    if (isCorrect) {
      setStreak((s) => {
        const n = s + 1
        setBest((b) => Math.max(b, n))
        return n
      })
      setFlash('correct')
      window.clearTimeout(flashTimer.current)
      flashTimer.current = window.setTimeout(() => setFlash(null), 900)
      next()
    } else {
      setStreak(0)
      setStatus('wrong')
      setAnswer('')
      inputRef.current?.focus()
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Conjuga</h1>
      </header>

      {phase === 'setup' && (
        <section className="card setup">
          <div className="setup-block">
            <h2>Choose a tense</h2>
            <div className="chips">
              {TENSES.map((t) => (
                <button
                  key={t}
                  className={`chip ${tense === t ? 'on' : ''}`}
                  onClick={() => selectTense(t)}
                >
                  {TENSE_LABEL[t]}
                </button>
              ))}
            </div>
          </div>

          <div className="setup-block">
            <h2>Accent checking</h2>
            <div className="chips">
              <button
                className={`chip ${!lenient ? 'on' : ''}`}
                onClick={() => setLenient(false)}
              >
                Strict
              </button>
              <button
                className={`chip ${lenient ? 'on' : ''}`}
                onClick={() => setLenient(true)}
              >
                Ignore accents
              </button>
            </div>
            <p className="hint">
              Strict requires the exact tildes; Ignore accents accepts the word even if tildes are
              missing.
            </p>
          </div>

          <p className="hint">
            Practice will cycle through all {verbs.length} verbs in the{' '}
            {TENSE_LABEL[tense].toLowerCase()}.
          </p>
          <button className="primary" onClick={start}>
            Start practice
          </button>
        </section>
      )}

      {phase === 'quiz' && question && (
        <section className="card quiz">
          <div className="quiz-tense">{TENSE_LABEL[tense]}</div>

          <div className="stats">
            <div className="stat">
              <span className="stat-label">Score</span>
              <span className="stat-value">
                {correct}/{answered}
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">Streak</span>
              <span className="stat-value">{streak}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Best</span>
              <span className="stat-value">{best}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Verbs</span>
              <span className="stat-value">{verbs.length}</span>
            </div>
          </div>

          <div className="prompt">
            <span className="verb-line">
              <span className="subject">{SUBJECTS[question.subject]}</span>
              <span className="infinitive">
                <Infinitive word={question.verb.infinitive} />
              </span>
            </span>
            <span className="english">{question.verb.english}</span>
          </div>

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
              disabled={status === 'correct'}
            />
            <button className="primary" type="submit" disabled={!answer.trim() || status === 'correct'}>
              Check
            </button>
          </form>

          {status === 'wrong' && (
            <div className="feedback bad">
              <span className="feedback-answer">
                Correct answer: <strong>{question.verb[question.tense][question.subject]}</strong>. Try again!
              </span>
            </div>
          )}

          {flash === 'correct' && <div className="flash" />}
        </section>
      )}
    </div>
  )
}

export default App
