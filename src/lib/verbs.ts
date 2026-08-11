export type Tense =
  | 'present'
  | 'preterite'
  | 'imperfect'
  | 'present perfect'
  | 'present progressive'

export type Regularity = 'regular' | 'stem-changing' | 'irregular'

export interface Verb {
  infinitive: string
  english: string
  reflexive: boolean
  regularity: Regularity
  forms: Partial<Record<Tense, string[]>>
}

export const TENSES: Tense[] = [
  'present',
  'preterite',
  'imperfect',
  'present perfect',
  'present progressive',
]

export const TENSE_LABEL: Record<Tense, string> = {
  present: 'Presente',
  preterite: 'Pretérito',
  imperfect: 'Imperfecto',
  'present perfect': 'Pretérito perfecto',
  'present progressive': 'Presente progresivo',
}

export const SUBJECTS = [
  'yo',
  'tú',
  'él / usted',
  'nosotros',
  'vosotros',
  'ellos / ustedes',
]

const REGULARITIES: Regularity[] = ['regular', 'stem-changing', 'irregular']

export function parseVerbs(text: string): Verb[] {
  const map = new Map<string, Verb>()
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const parts = line.split('.').map((s) => s.trim())
    const infinitive = parts[0]
    const tense = parts[1] as Tense
    const regularityField = parts[parts.length - 1]
    const english = parts[parts.length - 2]
    let forms = parts.slice(2, parts.length - 2)
    if (forms.length !== 6) continue

    const reflexive = infinitive.endsWith('se') || regularityField.startsWith('reflexive')
    if (reflexive) {
      forms = forms.map((f) => f.replace(/^\S+\s+/, ''))
    }

    let verb = map.get(infinitive)
    if (!verb) {
      verb = {
        infinitive,
        english,
        reflexive,
        regularity: 'regular',
        forms: {},
      }
      map.set(infinitive, verb)
    }
    verb.forms[tense] = forms

    const reg = regularityField.startsWith('reflexive')
      ? regularityField.slice('reflexive '.length)
      : regularityField
    if ((REGULARITIES as string[]).includes(reg)) verb.regularity = reg as Regularity
  }
  return [...map.values()]
}

export function normalize(value: string): string {
  return value.toLowerCase().trim()
}

export function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}
