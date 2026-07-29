import type { ReminderKind } from './domain'
import medicationIcon from './assets/reminder-icons/medicine-3d.webp'
import feedingIcon from './assets/reminder-icons/meal-3d.webp'
import vetIcon from './assets/reminder-icons/vet-visit-3d.webp'
import vaccineIcon from './assets/reminder-icons/vaccine-3d.webp'
import careIcon from './assets/reminder-icons/daily-passport-3d.webp'

export const kindIconAssets: Record<ReminderKind, string> = {
  medication: medicationIcon,
  feeding: feedingIcon,
  vet: vetIcon,
  vaccine: vaccineIcon,
  care: careIcon,
}
