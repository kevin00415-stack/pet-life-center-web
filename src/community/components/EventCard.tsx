import { Sparkle } from '@phosphor-icons/react'
import { useTranslation } from '../../i18n/translations'

interface EventCardProps {
  type: 'seminar' | 'live' | 'activity' | 'lecture'
  title: string
  date: string
  aiSummary?: string
  isMock?: boolean
}

export function EventCard({
  type,
  title,
  date,
  aiSummary,
}: EventCardProps) {
  const { t } = useTranslation()

  const typeLabel = {
    seminar: t('seminarLabel'),
    live: t('liveLabel'),
    activity: t('activityLabel'),
    lecture: t('lectureLabel'),
  }[type]

  const typeColor = {
    seminar: '#d3a665',
    live: '#e05a47',
    activity: '#426f69',
    lecture: '#6f91a7',
  }[type]

  return (
    <div className="cozy-editor-card community-event-card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* cover image placeholder */}
      <div style={{ height: '110px', background: `linear-gradient(135deg, ${typeColor}22, ${typeColor}44)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: typeColor, fontSize: '13px', fontWeight: 'bold' }}>
        <span style={{ background: '#fff', padding: '6px 12px', borderRadius: '20px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
          {typeLabel}
        </span>
      </div>
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h4 style={{ margin: 0, fontSize: '15px', color: '#173f3b', fontWeight: 'bold' }}>{title}</h4>
        <span style={{ fontSize: '12px', color: '#5e746f' }}>{t('eventTime')}：{date}</span>

        {aiSummary && (
          <div className="ai-summary-placeholder" style={{ background: '#fff9ee', border: '1px dashed #f2e1cc', borderRadius: '8px', padding: '8px 10px', fontSize: '11px', color: '#b27a30', display: 'flex', gap: '4px', marginTop: '4px' }}>
            <Sparkle size={14} weight="fill" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>{t('aiSummaryTitle')} (預留)：</strong>
              <span>{aiSummary}</span>
            </div>
          </div>
        )}

        <button className="save-reminder" style={{ width: '100%', margin: '6px 0 0 0', padding: '10px', fontSize: '13px', borderRadius: '8px' }}>
          {t('reserveEvent')}
        </button>
      </div>
    </div>
  )
}
