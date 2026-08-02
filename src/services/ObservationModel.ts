import type { PetObservation, ObservationCategory } from './ObservationTypes'

export class ObservationModel implements PetObservation {
  readonly id: string
  readonly petId: string
  readonly timestamp: number
  readonly eventType: string
  readonly category: ObservationCategory
  readonly value: number | string
  readonly severity: 'info' | 'normal' | 'low' | 'medium' | 'high'
  readonly metadata: Record<string, any>
  readonly sourceType: 'pet' | 'reminder' | 'growth' | 'senior-care' | 'health' | 'memory' | 'comparison' | 'case-journey'
  readonly sourceId: string
  readonly attachmentIds: string[]
  readonly location?: { latitude: number; longitude: number; name?: string }
  readonly notes?: string

  constructor(data: PetObservation) {
    this.id = data.id
    this.petId = data.petId
    this.timestamp = data.timestamp
    this.eventType = data.eventType
    this.category = data.category
    this.value = data.value
    this.severity = data.severity || 'normal'
    this.metadata = Object.freeze({ ...data.metadata })
    this.sourceType = data.sourceType
    this.sourceId = data.sourceId
    this.attachmentIds = [...(data.attachmentIds || [])]
    this.location = data.location ? { ...data.location } : undefined
    this.notes = data.notes
  }

  /**
   * Factory method to create an ObservationModel securely from a weight GrowthRecord.
   */
  static fromWeightRecord(grow: { id: string; petId: string; date: string; weightKg: number; note: string; createdAt: number }): ObservationModel {
    return new ObservationModel({
      id: `obs-weight-${grow.id}`,
      petId: grow.petId,
      timestamp: grow.createdAt || new Date(grow.date + 'T12:00:00').getTime(),
      eventType: 'WeightRecord',
      category: 'weight',
      value: grow.weightKg,
      severity: 'normal',
      metadata: { bodyLengthCm: undefined },
      sourceType: 'growth',
      sourceId: grow.id,
      attachmentIds: [],
      notes: grow.note,
    })
  }

  /**
   * Factory method to create an ObservationModel securely from an Abnormal Event occurrence.
   */
  static fromAbnormalEvent(petId: string, ev: { id: string; category: string; timestamp: number; notes: string; hasPhoto?: boolean; hasVideo?: boolean }): ObservationModel {
    return new ObservationModel({
      id: `obs-abnormal-${ev.id}`,
      petId,
      timestamp: ev.timestamp,
      eventType: `Abnormal:${ev.category}`,
      category: 'abnormal-event',
      value: ev.category,
      severity: 'high',
      metadata: { hasPhoto: !!ev.hasPhoto, hasVideo: !!ev.hasVideo },
      sourceType: 'health',
      sourceId: ev.id,
      attachmentIds: [],
      notes: ev.notes,
    })
  }

  /**
   * Factory method to create an ObservationModel securely from a Senior Care observation entry.
   */
  static fromSeniorCare(petId: string, dateStr: string, obs: any): ObservationModel {
    const timestamp = obs.savedAt || new Date(dateStr + 'T12:00:00').getTime()
    const attentionCount = Object.keys(obs).filter(
      (k) => k !== 'notes' && k !== 'medsStatus' && k !== 'savedAt' && obs[k] === 'attention'
    ).length

    return new ObservationModel({
      id: `obs-senior-${dateStr}`,
      petId,
      timestamp,
      eventType: 'SeniorCareObservation',
      category: 'senior-care',
      value: attentionCount,
      severity: attentionCount >= 2 ? 'medium' : 'normal',
      metadata: { attentionFieldsCount: attentionCount, obsMetrics: { ...obs } },
      sourceType: 'senior-care',
      sourceId: dateStr,
      attachmentIds: [],
      notes: obs.notes,
    })
  }

  /**
   * Factory method to create an ObservationModel securely from a care reminder occurrence record.
   */
  static fromReminderOccurrence(reminderId: string, petId: string, key: string, status: string, title: string, details: string, kind: string, voiceClipId?: string): ObservationModel {
    const timePart = key.substring(key.indexOf(':') + 1)
    const dateObj = new Date(timePart)
    const timestamp = !isNaN(dateObj.getTime()) ? dateObj.getTime() : Date.now()

    const category: ObservationCategory =
      kind === 'medication' ? 'medication' : kind === 'vaccine' ? 'vaccination' : status === 'completed' ? 'reminder-completed' : 'reminder-missed'

    return new ObservationModel({
      id: `obs-reminder-${reminderId}-${key}`,
      petId,
      timestamp,
      eventType: `Reminder:${kind}:${status}`,
      category,
      value: status,
      severity: status === 'skipped' ? 'low' : 'normal',
      metadata: { reminderTitle: title, reminderKind: kind, details },
      sourceType: 'reminder',
      sourceId: reminderId,
      attachmentIds: voiceClipId ? [voiceClipId] : [],
      notes: details,
    })
  }

  /**
   * Objective conversion back to a plain dictionary for compatibility with simple logging.
   */
  toJSON(): PetObservation {
    return {
      id: this.id,
      petId: this.petId,
      timestamp: this.timestamp,
      eventType: this.eventType,
      category: this.category,
      value: this.value,
      severity: this.severity,
      metadata: { ...this.metadata },
      sourceType: this.sourceType,
      sourceId: this.sourceId,
      attachmentIds: [...this.attachmentIds],
      location: this.location ? { ...this.location } : undefined,
      notes: this.notes,
    }
  }
}
export type { PetObservation, ObservationCategory }
