import { useEffect, useMemo, useRef, useState } from 'react'
import verbsRaw from './assets/verbs3.txt?raw'
import './App.css'
import {
  SUBJECTS,
  TENSE_LABEL,
  TENSES,
  normalize,
  parseVerbs,
  stripDiacritics,
  type Regularity,
  type Tense,
  type Verb,
} from './lib/verbs'

type Phase = 'setup' | 'quiz'
type Mode = 'single' | 'all'
type Status = 'idle' | 'correct' | 'wrong'

interface Question {
  verb: Verb
  tense: Tense
  subject: number
}

const REGULARITIES: Regularity[] = ['regular', 'stem-changing', 'irregular']
const REGULARITY_LABEL: Record<Regularity, string> = {
  regular: 'Regular',
  'stem-changing': 'Stem-changing',
  irregular: 'Irregular',
}

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

function weightedPick<T>(items: T[], weight: (item: T) => number): T {
  const total = items.reduce((sum, i) => sum + weight(i), 0)
  let r = Math.random() * total
  for (const item of items) {
    r -= weight(item)
    if (r <= 0) return item
  }
  return items[items.length - 1]
}

function App() {
  const [verbs, setVerbs] = useState<Verb[]>([])
  const [phase, setPhase] = useState<Phase>('setup')
  const [tense, setTense] = useState<Tense>('present')
  const [lenient, setLenient] = useState(false)
  const [regularities, setRegularities] = useState<Set<Regularity>>(new Set(REGULARITIES))
  const [mode, setMode] = useState<Mode>('single')
  const [weightWeak, setWeightWeak] = useState(true)

  const [answered, setAnswered] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(0)
  const [flash, setFlash] = useState<'correct' | null>(null)

  const [question, setQuestion] = useState<Question | null>(null)
  const [answer, setAnswer] = useState('')
  const [status, setStatus] = useState<Status>('idle')

  const [allVerb, setAllVerb] = useState<Verb | null>(null)
  const [allAnswers, setAllAnswers] = useState<string[]>(Array(6).fill(''))
  const [allStatus, setAllStatus] = useState<Status[]>(Array(6).fill('idle'))
  const [allAttempted, setAllAttempted] = useState<boolean[]>(Array(6).fill(false))
  const [allWrongs, setAllWrongs] = useState<number[]>(Array(6).fill(0))

  const mistakes = useRef<Map<string, number>>(new Map())
  const lastInfinitive = useRef<string | null>(null)
  const singleAttempted = useRef(false)
  const singleWrongs = useRef(0)
  const flashTimer = useRef<number | undefined>(undefined)
  const inputRef = useRef<HTMLInputElement>(null)
  const allInputs = useRef<(HTMLInputElement | null)[]>([])

  const pool = useMemo(
    () =>
      verbs.filter((v) => regularities.has(v.regularity) && v.forms[tense]?.length === 6),
    [verbs, regularities, tense],
  )

  useEffect(() => {
    setVerbs(parseVerbs(verbsRaw))
    return () => window.clearTimeout(flashTimer.current)
  }, [])

  useEffect(() => {
    if (phase === 'quiz' && mode === 'all' && allVerb) {
      allInputs.current[0]?.focus()
    }
  }, [phase, mode, allVerb])

  function pickVerb(avoid: string | null): Verb {
    const choices = pool.filter((v) => v.infinitive !== avoid)
    const source = choices.length ? choices : pool
    if (weightWeak) {
      return weightedPick(source, (v) => 1 + (mistakes.current.get(v.infinitive) ?? 0) * 4)
    }
    return source[Math.floor(Math.random() * source.length)]
  }

  function isCorrect(answerText: string, correctAnswer: string): boolean {
    return lenient
      ? stripDiacritics(normalize(answerText)) === stripDiacritics(normalize(correctAnswer))
      : normalize(answerText) === normalize(correctAnswer)
  }

  function bumpStreak(amount: number) {
    setStreak((s) => {
      const n = s + amount
      setBest((b) => Math.max(b, n))
      return n
    })
  }

  function start() {
    mistakes.current.clear()
    lastInfinitive.current = null
    singleAttempted.current = false
    setAnswered(0)
    setCorrect(0)
    setStreak(0)
    setBest(0)
    if (mode === 'single') {
      advanceSingle()
    } else {
      newAllVerb()
    }
    setPhase('quiz')
  }

  function advanceSingle() {
    singleAttempted.current = false
    singleWrongs.current = 0
    const verb = pickVerb(lastInfinitive.current)
    lastInfinitive.current = verb.infinitive
    setQuestion({ verb, tense, subject: Math.floor(Math.random() * SUBJECTS.length) })
    setAnswer('')
    setStatus('idle')
    inputRef.current?.focus()
  }

  function submitSingle() {
    if (!question || status === 'correct') return
    const correctAnswer = question.verb.forms[question.tense]![question.subject]
    const ok = isCorrect(answer, correctAnswer)
    const firstAttempt = !singleAttempted.current

    if (firstAttempt) {
      singleAttempted.current = true
      setAnswered((a) => a + 1)
      if (ok) setCorrect((c) => c + 1)
    }

    if (ok) {
      const cur = mistakes.current.get(question.verb.infinitive) ?? 0
      if (cur > 0) mistakes.current.set(question.verb.infinitive, cur - 1)
      bumpStreak(1)
      setFlash('correct')
      window.clearTimeout(flashTimer.current)
      flashTimer.current = window.setTimeout(() => setFlash(null), 900)
      advanceSingle()
    } else {
      mistakes.current.set(
        question.verb.infinitive,
        (mistakes.current.get(question.verb.infinitive) ?? 0) + 1,
      )
      singleWrongs.current += 1
      setStreak(0)
      setStatus('wrong')
      setAnswer('')
      inputRef.current?.focus()
    }
  }

  function newAllVerb() {
    const verb = pickVerb(lastInfinitive.current)
    lastInfinitive.current = verb.infinitive
    setAllVerb(verb)
    setAllAnswers(Array(6).fill(''))
    setAllStatus(Array(6).fill('idle'))
    setAllAttempted(Array(6).fill(false))
    setAllWrongs(Array(6).fill(0))
  }

  function setAllAnswer(i: number, value: string) {
    setAllAnswers((prev) => {
      const next = [...prev]
      next[i] = value
      return next
    })
  }

  function checkAll() {
    if (!allVerb) return
    const nextStatus = [...allStatus]
    const nextAnswers = [...allAnswers]
    const nextAttempted = [...allAttempted]
    const nextWrongs = [...allWrongs]
    let newlyCorrect = 0
    let newlyAttempted = 0
    let anyWrong = false

    for (let i = 0; i < 6; i++) {
      if (allStatus[i] === 'correct') continue
      const correctAnswer = allVerb.forms[tense]![i]
      const ok = isCorrect(allAnswers[i], correctAnswer)
      const firstAttempt = !nextAttempted[i]
      if (firstAttempt) {
        nextAttempted[i] = true
        newlyAttempted++
      }
      if (ok) {
        if (firstAttempt) {
          setCorrect((c) => c + 1)
          newlyCorrect++
          const cur = mistakes.current.get(allVerb.infinitive) ?? 0
          if (cur > 0) mistakes.current.set(allVerb.infinitive, cur - 1)
        }
        nextStatus[i] = 'correct'
      } else {
        nextStatus[i] = 'wrong'
        nextAnswers[i] = ''
        nextWrongs[i] += 1
        anyWrong = true
        if (firstAttempt) {
          mistakes.current.set(
            allVerb.infinitive,
            (mistakes.current.get(allVerb.infinitive) ?? 0) + 1,
          )
        }
      }
    }

    if (newlyAttempted > 0) setAnswered((a) => a + newlyAttempted)

    setAllStatus(nextStatus)
    setAllAnswers(nextAnswers)
    setAllAttempted(nextAttempted)
    setAllWrongs(nextWrongs)

    if (newlyCorrect > 0) bumpStreak(newlyCorrect)
    if (anyWrong) setStreak(0)

    if (nextStatus.every((s) => s === 'correct')) {
      setFlash('correct')
      window.clearTimeout(flashTimer.current)
      flashTimer.current = window.setTimeout(() => setFlash(null), 900)
      newAllVerb()
    } else {
      const idx = nextStatus.findIndex((s) => s === 'wrong')
      allInputs.current[idx >= 0 ? idx : 0]?.focus()
    }
  }

  const allDone =
    allStatus.every((s) => s === 'correct') ||
    allStatus.some((s, i) => s !== 'correct' && allAnswers[i].trim() === '')

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
                  onClick={() => setTense(t)}
                >
                  {TENSE_LABEL[t]}
                </button>
              ))}
            </div>
          </div>

          <div className="setup-block">
            <h2>Verb types</h2>
            <div className="sub-label">Regularity</div>
            <div className="chips">
              {REGULARITIES.map((r) => (
                <button
                  key={r}
                  className={`chip ${regularities.has(r) ? 'on' : ''}`}
                  onClick={() =>
                    setRegularities((prev) => {
                      const n = new Set(prev)
                      if (n.has(r)) n.delete(r)
                      else n.add(r)
                      return n
                    })
                  }
                >
                  {REGULARITY_LABEL[r]}
                </button>
              ))}
            </div>
            <p className="hint">{pool.length} verbs match your selection.</p>
          </div>

          <div className="setup-block">
            <h2>Practice mode</h2>
            <div className="chips">
              <button
                className={`chip ${mode === 'single' ? 'on' : ''}`}
                onClick={() => setMode('single')}
              >
                One subject at a time
              </button>
              <button
                className={`chip ${mode === 'all' ? 'on' : ''}`}
                onClick={() => setMode('all')}
              >
                All subjects together
              </button>
            </div>
          </div>

          <div className="setup-block">
            <h2>Accent checking</h2>
            <div className="chips">
              <button className={`chip ${!lenient ? 'on' : ''}`} onClick={() => setLenient(false)}>
                Strict
              </button>
              <button className={`chip ${lenient ? 'on' : ''}`} onClick={() => setLenient(true)}>
                Ignore accents
              </button>
            </div>
          </div>

          <label className="toggle">
            <input
              type="checkbox"
              checked={weightWeak}
              onChange={(e) => setWeightWeak(e.target.checked)}
            />
            <span>Prioritize verbs I keep getting wrong</span>
          </label>

          <button className="primary" onClick={start} disabled={pool.length === 0}>
            Start practice
          </button>
        </section>
      )}

      {phase === 'quiz' && mode === 'single' && question && (
        <section className="card quiz">
          <QuizHeader tense={tense} answered={answered} correct={correct} streak={streak} best={best} poolSize={pool.length} />

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
              submitSingle()
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

          {status === 'wrong' && (
            <div className="feedback bad">
              <span className="feedback-answer">
                {singleWrongs.current >= 2 ? (
                  <>
                    Correct answer: <strong>{question.verb.forms[question.tense]![question.subject]}</strong>.
                    Try again!
                  </>
                ) : (
                  'Try again!'
                )}
              </span>
            </div>
          )}

          {flash === 'correct' && <div className="flash" />}
        </section>
      )}

      {phase === 'quiz' && mode === 'all' && allVerb && (
        <section className="card quiz">
          <QuizHeader tense={tense} answered={answered} correct={correct} streak={streak} best={best} poolSize={pool.length} />

          <div className="prompt all-prompt">
            <span className="verb-line">
              <span className="infinitive">
                <Infinitive word={allVerb.infinitive} />
              </span>
            </span>
            <span className="english">{allVerb.english}</span>
          </div>

          <div className="all-grid">
            {SUBJECTS.map((subject, i) => (
              <div key={subject} className={`all-row ${allStatus[i]}`}>
                <span className="all-subject">{subject}</span>
                {allStatus[i] === 'correct' ? (
                  <span className="all-correct">{allAnswers[i]}</span>
                ) : (
                  <input
                    ref={(el) => {
                      allInputs.current[i] = el
                    }}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    value={allAnswers[i]}
                    onChange={(e) => setAllAnswer(i, e.target.value)}
                    placeholder={allWrongs[i] >= 2 ? allVerb.forms[tense]![i] : '…'}
                  />
                )}
              </div>
            ))}
          </div>

          <form
            className="answer-form"
            onSubmit={(e) => {
              e.preventDefault()
              checkAll()
            }}
          >
            <button className="primary" type="submit" disabled={allDone}>
              Check
            </button>
          </form>

          {flash === 'correct' && <div className="flash" />}
        </section>
      )}
    </div>
  )
}

function QuizHeader({
  tense,
  answered,
  correct,
  streak,
  best,
  poolSize,
}: {
  tense: Tense
  answered: number
  correct: number
  streak: number
  best: number
  poolSize: number
}) {
  return (
    <>
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
          <span className="stat-value">{poolSize}</span>
        </div>
      </div>
    </>
  )
}

export default App
