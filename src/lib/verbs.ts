export type Tense = 'present' | 'preterite'
export type Ending = 'ar' | 'er' | 'ir'
export type Regularity = 'regular' | 'stem-changing' | 'irregular'

export interface Verb {
  infinitive: string
  english: string
  present: string[]
  preterite: string[]
  reflexive: boolean
  ending: Ending
  regularity: Regularity
}

export const TENSES: Tense[] = ['present', 'preterite']

export const TENSE_LABEL: Record<Tense, string> = {
  present: 'Presente',
  preterite: 'Pretérito',
}

export const SUBJECTS = [
  'yo',
  'tú',
  'él / usted',
  'nosotros',
  'vosotros',
  'ellos / ustedes',
]

const VOWEL_CHANGES: [string, string][] = [
  ['e', 'ie'],
  ['o', 'ue'],
  ['e', 'i'],
  ['u', 'ue'],
]

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

function regularForms(ending: Ending, tense: Tense, base: string): string[] {
  if (tense === 'present') {
    if (ending === 'ar') return [base + 'o', base + 'as', base + 'a', base + 'amos', base + 'áis', base + 'an']
    if (ending === 'er') return [base + 'o', base + 'es', base + 'e', base + 'emos', base + 'éis', base + 'en']
    return [base + 'o', base + 'es', base + 'e', base + 'imos', base + 'ís', base + 'en']
  }
  if (ending === 'ar') {
    const forms = [base + 'é', base + 'aste', base + 'ó', base + 'amos', base + 'asteis', base + 'aron']
    if (base.endsWith('c')) forms[0] = base.slice(0, -1) + 'qué'
    else if (base.endsWith('g')) forms[0] = base + 'ué'
    else if (base.endsWith('z')) forms[0] = base.slice(0, -1) + 'cé'
    return forms
  }
  const forms = [base + 'í', base + 'iste', base + 'ió', base + 'imos', base + 'isteis', base + 'ieron']
  if (/[aeiou]$/.test(base)) {
    forms[2] = base + 'yó'
    forms[5] = base + 'yeron'
  }
  return forms
}

function matches(core: string[], expected: string[]): boolean {
  return expected.every((f, i) => norm(f) === norm(core[i]))
}

function stemChanged(base: string, form: string): boolean {
  const b = norm(base)
  const f = norm(form)
  for (const [from, to] of VOWEL_CHANGES) {
    for (let i = b.length - 1; i >= 0; i--) {
      if (b[i] === from) {
        const candidate = b.slice(0, i) + to + b.slice(i + 1)
        if (candidate === f) return true
      }
    }
  }
  return false
}

export function classifyVerb(infinitive: string, present: string[], preterite: string[]): {
  reflexive: boolean
  ending: Ending
  regularity: Regularity
} {
  const reflexive = infinitive.endsWith('se') && infinitive.length > 2
  const base = reflexive ? infinitive.slice(0, -2) : infinitive
  let ending: Ending = 'ir'
  for (const e of ['ar', 'er', 'ir'] as Ending[]) {
    if (base.endsWith(e)) {
      ending = e
      break
    }
  }
  const stem = base.slice(0, -2)
  const core = (form: string) =>
    reflexive ? form.trim().replace(/^(me|te|se|nos|os)\s+/, '') : form

  const pres = present.map(core)
  const pret = preterite.map(core)

  if (matches(pres, regularForms(ending, 'present', stem)) && matches(pret, regularForms(ending, 'preterite', stem))) {
    return { reflexive, ending, regularity: 'regular' }
  }
  const singular = [
    pres[0].slice(0, -1),
    pres[1].slice(0, -2),
    pres[2].slice(0, -1),
  ]
  if (singular.some((s) => stemChanged(stem, s))) {
    return { reflexive, ending, regularity: 'stem-changing' }
  }
  return { reflexive, ending, regularity: 'irregular' }
}

export function parseVerbs(text: string): Verb[] {
  const map = new Map<string, Verb>()
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const parts = line.split('.').map((s) => s.trim())
    const infinitive = parts[0]
    const tense = parts[1]
    const english = parts[parts.length - 1]
    const forms = parts.slice(2, 8)
    if (forms.length !== 6) continue
    let verb = map.get(infinitive)
    if (!verb) {
      verb = { infinitive, english, present: [], preterite: [], reflexive: false, ending: 'ar', regularity: 'regular' }
      map.set(infinitive, verb)
    }
    if (tense === 'present') verb.present = forms
    else if (tense === 'preterite') verb.preterite = forms
  }
  for (const verb of map.values()) {
    const c = classifyVerb(verb.infinitive, verb.present, verb.preterite)
    verb.reflexive = c.reflexive
    verb.ending = c.ending
    verb.regularity = c.regularity
  }
  return [...map.values()]
}

export function normalize(value: string): string {
  return value.toLowerCase().trim()
}

export function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}
