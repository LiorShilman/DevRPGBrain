export interface StartSessionInput {
  projectId: string
  title?: string
}

export interface EndSessionInput {
  userNotes?: string
  blockers?: string[]
  decisions?: string[]
  nextSteps?: string[]
}
