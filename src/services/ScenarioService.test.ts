import { describe, test, expect, beforeEach } from 'vitest'
import { scenarioService } from './ScenarioService'

describe('Guardian Scenario Foundation Engine Tests', () => {
  beforeEach(() => {
    scenarioService.clear()
  })

  test('creates a scenario and pre-populates default ordered steps', () => {
    const scenario = scenarioService.createScenario({
      petId: 'pet-dog-1',
      type: 'abnormal-event',
      title: '突發嘔吐紀錄',
      description: '嚕嚕突然吐出酸水時的引導照護情境',
      icon: '🤮',
    })

    expect(scenario.id).toBeDefined()
    expect(scenario.petId).toBe('pet-dog-1')
    expect(scenario.type).toBe('abnormal-event')
    expect(scenario.title).toBe('突發嘔吐紀錄')
    expect(scenario.steps).toHaveLength(3)

    // Check ordering
    expect(scenario.steps[0].order).toBe(1)
    expect(scenario.steps[1].order).toBe(2)
    expect(scenario.steps[2].order).toBe(3)

    expect(scenario.attachmentSupport).toBe(true) // Abnormal Event supports attachments
    expect(scenario.completionStatus).toBe('pending')
  })

  test('manages step completion and auto-completes scenario when required steps are finished', () => {
    const scenario = scenarioService.createScenario({
      petId: 'pet-dog-1',
      type: 'walking',
      title: '每日散步',
      description: '繫上牽繩、戶外活动與清理排泄',
      icon: '🐕',
    })

    // Walk scenario has 2 required steps, 0 optional steps
    expect(scenario.steps.filter(s => !s.optional)).toHaveLength(2)

    scenarioService.startScenario(scenario.id)

    const active1 = scenarioService.getActiveStep(scenario.id)
    expect(active1?.id).toBe('wlk-1')

    // Complete Step 1
    const s1 = scenarioService.completeStep(scenario.id, 'wlk-1')
    expect(s1.steps[0].completed).toBe(true)
    expect(s1.completionStatus).toBe('active') // Still active because step 2 is outstanding

    const active2 = scenarioService.getActiveStep(scenario.id)
    expect(active2?.id).toBe('wlk-2')

    // Complete Step 2
    const s2 = scenarioService.completeStep(scenario.id, 'wlk-2')
    expect(s2.steps[1].completed).toBe(true)
    expect(s2.completionStatus).toBe('completed') // Auto completed!
  })

  test('manages manual cancel and resume operations', () => {
    const scenario = scenarioService.createScenario({
      petId: 'pet-dog-1',
      type: 'boarding',
      title: '週末寄宿保母',
      description: '外出交接餵飼與定時回報',
      icon: '🏡',
    })

    scenarioService.startScenario(scenario.id)
    expect(scenario.completionStatus).toBe('active')

    // Cancel
    const cancelled = scenarioService.cancelScenario(scenario.id)
    expect(cancelled.completionStatus).toBe('cancelled')

    // Resume
    const resumed = scenarioService.resumeScenario(scenario.id)
    expect(resumed.completionStatus).toBe('active')
  })

  test('ensures correct pet context isolation', () => {
    scenarioService.createScenario({
      petId: 'dog-lulu',
      type: 'lost-pet',
      title: '嚕嚕協尋',
      description: '協尋特徵打包',
      icon: '🚨',
    })

    scenarioService.createScenario({
      petId: 'cat-mimi',
      type: 'medication',
      title: '咪咪餵藥',
      description: '降眼壓藥水',
      icon: '👁️',
    })

    const luluScenarios = scenarioService.getScenariosForPet('dog-lulu')
    const mimiScenarios = scenarioService.getScenariosForPet('cat-mimi')

    expect(luluScenarios).toHaveLength(1)
    expect(luluScenarios[0].title).toBe('嚕嚕協尋')

    expect(mimiScenarios).toHaveLength(1)
    expect(mimiScenarios[0].title).toBe('咪咪餵藥')
  })

  test('nextStep and previousStep correctly traverse ordered steps', () => {
    const scenario = scenarioService.createScenario({
      petId: 'dog-lulu',
      type: 'abnormal-event',
      title: '突發嘔吐紀錄',
      description: '嚕嚕突然吐出酸水時的引導照護情境',
      icon: '🤮',
    })

    // Steps should be: abn-1 (order: 1), abn-2 (order: 2), abn-3 (order: 3)
    const nextOf1 = scenarioService.nextStep(scenario.id, 'abn-1')
    expect(nextOf1?.id).toBe('abn-2')

    const nextOf2 = scenarioService.nextStep(scenario.id, 'abn-2')
    expect(nextOf2?.id).toBe('abn-3')

    const nextOf3 = scenarioService.nextStep(scenario.id, 'abn-3')
    expect(nextOf3).toBeNull()

    const prevOf3 = scenarioService.previousStep(scenario.id, 'abn-3')
    expect(prevOf3?.id).toBe('abn-2')

    const prevOf2 = scenarioService.previousStep(scenario.id, 'abn-2')
    expect(prevOf2?.id).toBe('abn-1')

    const prevOf1 = scenarioService.previousStep(scenario.id, 'abn-1')
    expect(prevOf1).toBeNull()
  })
})
