import { describe, it, expect } from 'vitest'
import { calcLevel, xpForLevel, xpProgress, calcSessionXp } from './rpg.service'

describe('calcLevel', () => {
  it('starts at level 1 with 0 XP', () => expect(calcLevel(0)).toBe(1))
  it('reaches level 2 at 100 XP', () => expect(calcLevel(100)).toBe(2))
  it('reaches level 3 at 400 XP', () => expect(calcLevel(400)).toBe(3))
  it('reaches level 10 at 8100 XP', () => expect(calcLevel(8100)).toBe(10))
  it('stays level 2 just below 400 XP', () => expect(calcLevel(399)).toBe(2))
})

describe('xpForLevel', () => {
  it('level 1 requires 0 XP', () => expect(xpForLevel(1)).toBe(0))
  it('level 2 requires 100 XP', () => expect(xpForLevel(2)).toBe(100))
  it('level 3 requires 400 XP', () => expect(xpForLevel(3)).toBe(400))
})

describe('xpProgress', () => {
  it('correct progress within a level', () => {
    const r = xpProgress(150)
    expect(r.level).toBe(2)
    expect(r.progress).toBe(50)   // 150 - 100
    expect(r.needed).toBe(300)    // 400 - 100
    expect(r.percent).toBe(16)    // floor(50/300*100)
  })

  it('returns 100% at exact level boundary', () => {
    const r = xpProgress(400)
    expect(r.level).toBe(3)
    expect(r.progress).toBe(0)
    expect(r.percent).toBe(0)
  })
})

describe('calcSessionXp', () => {
  it('minimum: 1 minute, no notes, no blockers, no next steps', () => {
    expect(calcSessionXp({ durationMinutes: 1, hasNotes: false, blockerCount: 0, nextStepCount: 0 })).toBe(6)
  })

  it('adds notes bonus', () => {
    expect(calcSessionXp({ durationMinutes: 0, hasNotes: true, blockerCount: 0, nextStepCount: 0 })).toBe(10)
  })

  it('caps time bonus at 60 minutes', () => {
    const at60  = calcSessionXp({ durationMinutes: 60,  hasNotes: false, blockerCount: 0, nextStepCount: 0 })
    const at120 = calcSessionXp({ durationMinutes: 120, hasNotes: false, blockerCount: 0, nextStepCount: 0 })
    expect(at60).toBe(at120)
    expect(at60).toBe(65)  // 5 base + 60 time
  })

  it('caps blocker bonus at 15 (5 blockers)', () => {
    const at5 = calcSessionXp({ durationMinutes: 0, hasNotes: false, blockerCount: 5, nextStepCount: 0 })
    const at9 = calcSessionXp({ durationMinutes: 0, hasNotes: false, blockerCount: 9, nextStepCount: 0 })
    expect(at5).toBe(at9)
    expect(at5).toBe(20)  // 5 base + 15 blocker
  })

  it('caps next-step bonus at 10 (5 steps)', () => {
    const at5 = calcSessionXp({ durationMinutes: 0, hasNotes: false, blockerCount: 0, nextStepCount: 5 })
    const at9 = calcSessionXp({ durationMinutes: 0, hasNotes: false, blockerCount: 0, nextStepCount: 9 })
    expect(at5).toBe(at9)
    expect(at5).toBe(15)  // 5 base + 10 next-step
  })

  it('maximum possible XP in one session', () => {
    const max = calcSessionXp({ durationMinutes: 999, hasNotes: true, blockerCount: 99, nextStepCount: 99 })
    expect(max).toBe(95)  // 5 + 60 + 5 + 15 + 10
  })
})
