export type Tense = 'present' | 'preterite'

export interface Verb {
  infinitive: string
  english: string
  present: string[]
  preterite: string[]
}

export const TENSES: Tense[] = ['present', 'preterite']

export const TENSE_LABEL: Record<Tense, string> = {
  present: 'Presente',
  preterite: 'Pretérito',
}

export const SUBJECTS = [
  'yo',
  'tú',
  'él / ella / usted',
  'nosotros',
  'vosotros',
  'ellos / ellas / ustedes',
]

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
      verb = { infinitive, english, present: [], preterite: [] }
      map.set(infinitive, verb)
    }
    if (tense === 'present') verb.present = forms
    else if (tense === 'preterite') verb.preterite = forms
  }
  return [...map.values()]
}

export function normalize(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}
