import { useTranslation } from '../../i18n/translations'

interface PrivateChatViewProps {
  isMock?: boolean
}

export function PrivateChatView({ isMock = true }: PrivateChatViewProps) {
  const { t } = useTranslation()

  return (
    <div className="cozy-editor-card private-chat-placeholder-card" style={{ padding: '30px 20px', textAlign: 'center', color: '#5e746f' }}>
      <div style={{ fontSize: '48px', marginBottom: '14px' }}>👤</div>
      <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#173f3b', fontWeight: 'bold' }}>{t('privateChatTitle')}</h3>
      <p style={{ margin: '0 0 20px 0', fontSize: '13px', lineHeight: '1.5', color: '#888' }}>
        {t('privateChatDesc')}
      </p>
      <div style={{ background: '#fbf4e8', border: '1px solid #f2e9dc', padding: '12px 14px', borderRadius: '10px', fontSize: '12px', color: '#b27a30', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
        <span>🔒 {t('privateChatPre')} {isMock ? '(預留)' : ''}</span>
      </div>
      {isMock && (
        <div style={{ fontSize: '10px', color: '#aaa', marginTop: '14px' }}>
          * {t('unreadMockDisclaimer')}
        </div>
      )}
    </div>
  )
}
