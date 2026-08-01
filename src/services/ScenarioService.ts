export type ScenarioType =
  | 'abnormal-event'
  | 'medication'
  | 'boarding'
  | 'walking'
  | 'senior-care'
  | 'daily-care'
  | 'home-visit'
  | 'lost-pet'

export interface ScenarioStep {
  id: string
  title: string
  description: string
  order: number
  optional: boolean
  completed: boolean
  attachment?: string // referenced attachment ID
  timestamp?: number
}

export interface GuardianScenario {
  id: string
  petId: string
  type: ScenarioType
  title: string
  description: string
  icon: string
  steps: ScenarioStep[]
  attachmentSupport: boolean
  reminderSupport: boolean
  timelineSupport: boolean
  notificationSupport: boolean
  completionStatus: 'pending' | 'active' | 'completed' | 'cancelled'
  createdAt: number
  updatedAt: number
}

class ScenarioService {
  private scenarios: Map<string, GuardianScenario> = new Map()

  /**
   * Factory function to create a new Scenario based on type.
   */
  createScenario(params: {
    id?: string
    petId: string
    type: ScenarioType
    title: string
    description: string
    icon: string
    steps?: ScenarioStep[]
  }): GuardianScenario {
    const now = Date.now()
    const defaultSteps = params.steps || this.getDefaultStepsForType(params.type)

    const scenario: GuardianScenario = {
      id: params.id || `scen-${crypto.randomUUID()}`,
      petId: params.petId,
      type: params.type,
      title: params.title,
      description: params.description,
      icon: params.icon,
      steps: defaultSteps.sort((a, b) => a.order - b.order),
      attachmentSupport: ['abnormal-event', 'boarding', 'home-visit', 'lost-pet'].includes(params.type),
      reminderSupport: ['medication', 'senior-care', 'daily-care'].includes(params.type),
      timelineSupport: true,
      notificationSupport: ['medication', 'lost-pet'].includes(params.type),
      completionStatus: 'pending',
      createdAt: now,
      updatedAt: now,
    }

    this.scenarios.set(scenario.id, scenario)
    return scenario
  }

  /**
   * Starts a scenario, changing completionStatus to 'active'
   */
  startScenario(id: string): GuardianScenario {
    const scenario = this.scenarios.get(id)
    if (!scenario) throw new Error(`Scenario ${id} not found`)

    scenario.completionStatus = 'active'
    scenario.updatedAt = Date.now()
    this.scenarios.set(id, scenario)
    return scenario
  }

  /**
   * Completes a specific step within a scenario and automatically transitions or completes.
   */
  completeStep(scenarioId: string, stepId: string, attachmentId?: string): GuardianScenario {
    const scenario = this.scenarios.get(scenarioId)
    if (!scenario) throw new Error(`Scenario ${scenarioId} not found`)

    scenario.steps = scenario.steps.map((step) => {
      if (step.id === stepId) {
        return {
          ...step,
          completed: true,
          attachment: attachmentId,
          timestamp: Date.now(),
        }
      }
      return step
    })

    // Auto-complete check: if all non-optional steps are completed, mark the scenario completed
    const allRequiredDone = scenario.steps
      .filter((step) => !step.optional)
      .every((step) => step.completed)

    if (allRequiredDone) {
      scenario.completionStatus = 'completed'
    }

    scenario.updatedAt = Date.now()
    this.scenarios.set(scenarioId, scenario)
    return scenario
  }

  /**
   * Gets the active step index of a scenario.
   */
  getActiveStep(scenarioId: string): ScenarioStep | null {
    const scenario = this.scenarios.get(scenarioId)
    if (!scenario) return null

    const sorted = [...scenario.steps].sort((a, b) => a.order - b.order)
    return sorted.find((step) => !step.completed) || null
  }

  /**
   * Manually cancels a scenario.
   */
  cancelScenario(id: string): GuardianScenario {
    const scenario = this.scenarios.get(id)
    if (!scenario) throw new Error(`Scenario ${id} not found`)

    scenario.completionStatus = 'cancelled'
    scenario.updatedAt = Date.now()
    this.scenarios.set(id, scenario)
    return scenario
  }

  /**
   * Resumes a previously pending or cancelled scenario.
   */
  resumeScenario(id: string): GuardianScenario {
    const scenario = this.scenarios.get(id)
    if (!scenario) throw new Error(`Scenario ${id} not found`)

    scenario.completionStatus = 'active'
    scenario.updatedAt = Date.now()
    this.scenarios.set(id, scenario)
    return scenario
  }

  /**
   * Returns the next step in order after the specified step ID.
   */
  nextStep(scenarioId: string, currentStepId: string): ScenarioStep | null {
    const scenario = this.scenarios.get(scenarioId)
    if (!scenario) return null

    const sorted = [...scenario.steps].sort((a, b) => a.order - b.order)
    const currentIndex = sorted.findIndex((step) => step.id === currentStepId)
    if (currentIndex === -1 || currentIndex === sorted.length - 1) return null

    return sorted[currentIndex + 1]
  }

  /**
   * Returns the previous step in order before the specified step ID.
   */
  previousStep(scenarioId: string, currentStepId: string): ScenarioStep | null {
    const scenario = this.scenarios.get(scenarioId)
    if (!scenario) return null

    const sorted = [...scenario.steps].sort((a, b) => a.order - b.order)
    const currentIndex = sorted.findIndex((step) => step.id === currentStepId)
    if (currentIndex <= 0) return null

    return sorted[currentIndex - 1]
  }

  /**
   * Retrieves all scenarios registered for a specific pet.
   */
  getScenariosForPet(petId: string): GuardianScenario[] {
    return Array.from(this.scenarios.values()).filter((scen) => scen.petId === petId)
  }

  /**
   * Resets Scenario Engine (useful for unit testing).
   */
  clear(): void {
    this.scenarios.clear()
  }

  /**
   * Companion template steps generator for initial scenarios
   */
  private getDefaultStepsForType(type: ScenarioType): ScenarioStep[] {
    switch (type) {
      case 'abnormal-event':
        return [
          { id: 'abn-1', title: '觀察症狀', description: '辨識抽搐、嘔吐或拉肚子等突發狀態。', order: 1, optional: false, completed: false },
          { id: 'abn-2', title: '即時拍照錄影', description: '利用鏡頭留下第一現場影像佐證。', order: 2, optional: true, completed: false },
          { id: 'abn-3', title: '填寫備忘並儲存', description: '輸入文字狀況、時間並發送至時間軸。', order: 3, optional: false, completed: false },
        ]
      case 'medication':
        return [
          { id: 'med-1', title: '核對藥袋指示', description: '確認藥品庫存、用量及服用頻率。', order: 1, optional: false, completed: false },
          { id: 'med-2', title: '配置餐點或餵藥', description: '將藥物置入飼料或使用針筒灌藥。', order: 2, optional: false, completed: false },
          { id: 'med-3', title: '標記完成服藥', description: '點選已服藥扣除庫存、記錄成功率。', order: 3, optional: false, completed: false },
        ]
      case 'boarding':
        return [
          { id: 'brd-1', title: '整理照護備忘錄', description: '備妥晶片資訊、過敏史、醫生聯絡方式。', order: 1, optional: false, completed: false },
          { id: 'brd-2', title: '交付飼料與藥物', description: '與寄宿保母進行交接，並提供提醒週期。', order: 2, optional: false, completed: false },
          { id: 'brd-3', title: '保母定期回報', description: '確認飲食與排便正常。', order: 3, optional: true, completed: false },
        ]
      case 'walking':
        return [
          { id: 'wlk-1', title: '繫妥牽繩與配件', description: '確認防暴衝背帶、拾便袋、飲水壺完備。', order: 1, optional: false, completed: false },
          { id: 'wlk-2', title: '散步排泄與清潔', description: '戶外嗅聞、活動、清理排泄物並擦腳。', order: 2, optional: false, completed: false },
        ]
      case 'senior-care':
        return [
          { id: 'snr-1', title: '高齡照護每日量測', description: '進行 10 項生理指標檢查（好/普通/需注意）。', order: 1, optional: false, completed: false },
          { id: 'snr-2', title: '記錄高齡照護備忘', description: '填寫心率、呼吸或行動備註。', order: 2, optional: true, completed: false },
        ]
      case 'daily-care':
        return [
          { id: 'day-1', title: '確認梳毛與清潔', description: '進行日常梳毛、剪指甲、潔牙保健。', order: 1, optional: false, completed: false },
          { id: 'day-2', title: '記錄今日照護日記', description: '在生活回憶日記本記下心情與狀態。', order: 2, optional: true, completed: false },
        ]
      case 'home-visit':
        return [
          { id: 'hvt-1', title: '迎接保母/到府看診', description: '確認醫護或保母到府簽到。', order: 1, optional: false, completed: false },
          { id: 'hvt-2', title: '記錄交接狀態', description: '記錄體溫、血壓等診治細節。', order: 2, optional: false, completed: false },
        ]
      case 'lost-pet':
        return [
          { id: 'lst-1', title: '確認最後走失地點', description: '記下走失的時間、路段、以及身上配件特徵。', order: 1, optional: false, completed: false },
          { id: 'lst-2', title: '匯出寵物晶片與晶片登記證', description: '打包本機身份、特徵照及醫療資料快速發布。', order: 2, optional: false, completed: false },
          { id: 'lst-3', title: '協尋啟事張貼與回報', description: '聯繫地方社群，並保留回報紀錄。', order: 3, optional: true, completed: false },
        ]
    }
  }
}

export const scenarioService = new ScenarioService()
