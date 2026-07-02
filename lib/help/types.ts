export type HelpAudience = 'all' | 'patient' | 'staff'

export type HelpImage = {
  src: string
  alt: string
  caption?: string
}

export type ManualSection = {
  id: string
  title: string
  audience: HelpAudience
  image?: HelpImage
  paragraphs: string[]
  bullets?: string[]
}

export type FaqItem = {
  id: string
  category: string
  question: string
  answer: string
}

export type ContextualHelpBlock = {
  id: string
  routePrefixes: string[]
  title: string
  summary: string
  tips: string[]
  /** Si aplica, solo mostrar en estos pasos del wizard de preadmisión (1-8). */
  preadmissionSteps?: number[]
}

export type HelpPageContext = {
  preadmissionStep?: number
}

export type HelpTab = 'context' | 'manual' | 'faq'
