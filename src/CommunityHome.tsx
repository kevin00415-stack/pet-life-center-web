import { useState } from 'react'
import {
  Chat,
  Users,
  Megaphone,
  VideoCamera,
  ArrowRight,
  ShieldCheck,
  SealCheck,
  Sparkle,
  Notification,
} from '@phosphor-icons/react'

type TabType = 'chat' | 'topics' | 'broadcasts' | 'events'

// 1. TopicCard Component
export function TopicCard({
  icon,
  title,
  description,
  members,
  moderator,
}: {
  icon: string
  title: string
  description: string
  members: string
  moderator?: string
}) {
  return (
    <div className="cozy-editor-card community-topic-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '24px' }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: 0, fontSize: '16px', color: '#173f3b', fontWeight: 'bold' }}>{title}</h4>
          <span style={{ fontSize: '11px', color: '#888' }}>{members} 個成員</span>
        </div>
        {moderator && (
          <span className="moderator-badge-placeholder" style={{ fontSize: '10px', background: '#eef3f1', color: '#426f69', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '2px' }}>
            <ShieldCheck size={12} weight="fill" /> {moderator} (預留)
          </span>
        )}
      </div>
      <p style={{ margin: 0, fontSize: '13px', color: '#5e746f', lineHeight: '1.45' }}>{description}</p>
      <button className="cozy-btn-small" style={{ width: '100%', border: '0', background: '#eef5f3', color: '#173f3b', padding: '8px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', marginTop: '6px', cursor: 'pointer', transition: 'background 0.2s' }}>
        進入討論群組 <ArrowRight size={13} weight="bold" style={{ marginLeft: '4px', verticalAlign: 'middle' }} />
      </button>
    </div>
  )
}

// 2. BroadcastCard Component
export function BroadcastCard({
  hospital,
  announcement,
  date,
  priority,
  verified,
  notificationEnabled,
}: {
  hospital: string
  announcement: string
  date: string
  priority: 'emergency' | 'normal'
  verified?: boolean
  notificationEnabled?: boolean
}) {
  const priorityColor = priority === 'emergency' ? '#e05a47' : '#5e746f'
  const priorityBg = priority === 'emergency' ? '#fdf2f0' : '#eef3f1'
  const priorityText = priority === 'emergency' ? '緊急公告' : '一般公告'

  return (
    <div className="cozy-editor-card community-broadcast-card" style={{ borderLeft: `4px solid ${priorityColor}`, padding: '16px', marginBottom: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <h4 style={{ margin: 0, fontSize: '15px', color: '#173f3b', fontWeight: 'bold' }}>{hospital}</h4>
          {verified && (
            <span className="hospital-verified-placeholder" style={{ color: '#4b9cd3', display: 'inline-flex', alignItems: 'center' }} title="官方認證醫院" aria-label="認證標章 placeholder">
              <SealCheck size={15} weight="fill" />
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {notificationEnabled && (
            <span className="notif-badge-placeholder" style={{ color: '#d3a665', display: 'inline-flex', alignItems: 'center' }} title="推播開啟 (預留)">
              <Notification size={15} weight="fill" />
            </span>
          )}
          <span style={{ fontSize: '10px', background: priorityBg, color: priorityColor, padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
            {priorityText}
          </span>
        </div>
      </div>
      <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#263b37', lineHeight: '1.5' }}>{announcement}</p>
      <div style={{ fontSize: '11px', color: '#888', textAlign: 'right' }}>發布日期：{date}</div>
    </div>
  )
}

// 3. EventCard Component
export function EventCard({
  type,
  title,
  date,
  aiSummary,
}: {
  type: 'seminar' | 'live' | 'activity' | 'lecture'
  title: string
  date: string
  aiSummary?: string
}) {
  const typeLabel = {
    seminar: '線上照護講座',
    live: '獸醫線上直播',
    activity: '線下萌寵聚會',
    lecture: '健康保健課程',
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
        <span style={{ fontSize: '12px', color: '#5e746f' }}>活動時間：{date}</span>

        {aiSummary && (
          <div className="ai-summary-placeholder" style={{ background: '#fff9ee', border: '1px dashed #f2e1cc', borderRadius: '8px', padding: '8px 10px', fontSize: '11px', color: '#b27a30', display: 'flex', gap: '4px', marginTop: '4px' }}>
            <Sparkle size={14} weight="fill" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>AI 智慧大綱 (預留)：</strong>
              <span>{aiSummary}</span>
            </div>
          </div>
        )}

        <button className="save-reminder" style={{ width: '100%', margin: '6px 0 0 0', padding: '10px', fontSize: '13px', borderRadius: '8px' }}>
          立即預約活動
        </button>
      </div>
    </div>
  )
}

// 4. CommunityHome Component
export default function CommunityHome({ onBack }: { onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<TabType>('topics')

  // Mock Topic categories
  const topicCategories = [
    { icon: '👵', title: '高齡犬貓照護', description: '伴隨愛寵優雅老去，專屬老毛孩的日常保養、關節照護與溫馨經驗分享。', members: '3.2K' },
    { icon: '💧', title: '腎臟病交流', description: '腎衰竭毛孩飲食調配、皮下輸液技巧、處方飼料與定期檢驗數據追蹤討論。', members: '2.5K', moderator: '專業獸醫林醫師' },
    { icon: '🧠', title: '癲癇與神經科', description: '提供癲癇毛孩照護日記交流、藥物控制心得、發作時的安全防護避難措施。', members: '1.1K' },
    { icon: '🍃', title: '皮膚敏感過敏', description: '異位性皮膚炎、濕疹、過敏原檢測經驗、抗敏飲食與洗劑保養推薦。', members: '4.8K' },
    { icon: '❤️', title: '心臟病關懷', description: '心臟肥大、二尖瓣退化毛孩的居家安靜照護、服藥記錄、喘息監測與心臟超音波分享。', members: '1.9K' },
    { icon: '🥩', title: '飲食與營養', description: '鮮食生食調配、主食罐挑選、高體重控管、各年齡階段毛孩所需營養素解析。', members: '5.4K', moderator: '營養師小陳' },
    { icon: '🍼', title: '幼犬幼貓成長', description: '新手家長必看！疫苗時程、社會化訓練、離乳期餵食、基礎定點大小便教導。', members: '6.1K' },
  ]

  // Mock Broadcast messages
  const broadcastList = [
    { hospital: '台北愛毛獸醫醫院', announcement: '配合端午連假，6/14 ~ 6/16 門診時間調整為僅提供上午急診服務，下午及夜間休診，請毛家長多加留意。', date: '2026-06-10', priority: 'normal' as const, verified: true, notificationEnabled: true },
    { hospital: '全心動物心臟專科', announcement: '【緊急通知】本院即時引進最新型心臟微創導管手術設備，若有急性心衰衰竭病患，請立即撥打緊急救援專線。', date: '2026-07-29', priority: 'emergency' as const, verified: true, notificationEnabled: true },
    { hospital: '萌寵皮膚康復中心', announcement: '季節性換季潮到來，預約過敏原檢測及洗劑治療目前門診量較大，建議提早一週線上排隊預約預防針。', date: '2026-07-28', priority: 'normal' as const, verified: false, notificationEnabled: false },
  ]

  // Mock Events & Live streams
  const eventList = [
    { type: 'seminar' as const, title: '腎臟病毛孩的每日水分與飲食調配指引', date: '2026-08-05 19:30', aiSummary: '本講座將由獸醫權威深度解析如何安全計算每日飲水量，並現場示範如何調配高嗜口性低磷鮮食。' },
    { type: 'live' as const, title: '【直播】高齡犬貓關節保養與居家無障礙改建', date: '2026-08-12 20:00', aiSummary: '現場線上解答老犬老貓關節炎藥物使用時機，並提供居家防滑、斜坡板鋪設的實用改造法。' },
    { type: 'activity' as const, title: '萌寵夏日草地奔跑同樂會 (線下聚會)', date: '2026-08-23 14:00' },
    { type: 'lecture' as const, title: '犬貓急救黃金三分鐘：CPR與噎到哈姆立克法實作', date: '2026-09-02 15:00', aiSummary: '手把手演練心肺復甦術與急救呼吸技巧，為緊急意外發生時建立最堅強的生命防護線。' },
  ]

  return (
    <section className="community-home-page" style={{ paddingBottom: '80px' }}>
      <header className="timeline-header" style={{ marginBottom: '16px' }}>
        <button onClick={onBack}>‹</button>
        <div>
          <span className="eyebrow">COMMUNITY CENTER</span>
          <h1>毛孩家長社群中心</h1>
          <p>與其他飼主交流心得、獲取官方診所廣播公告、預約精彩照護活動。</p>
        </div>
      </header>

      {/* Sub-navigation tabs inside Community Center */}
      <nav className="filters" style={{ display: 'flex', gap: '6px', margin: '0 16px 20px 16px', overflowX: 'auto', paddingBottom: '4px' }} aria-label="社群子分頁">
        <button className={activeTab === 'topics' ? 'active' : ''} onClick={() => setActiveTab('topics')} style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
          <Users size={16} /> 主題群組
        </button>
        <button className={activeTab === 'broadcasts' ? 'active' : ''} onClick={() => setActiveTab('broadcasts')} style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
          <Megaphone size={16} /> 醫院廣播
        </button>
        <button className={activeTab === 'events' ? 'active' : ''} onClick={() => setActiveTab('events')} style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
          <VideoCamera size={16} /> 活動直播
        </button>
        <button className={activeTab === 'chat' ? 'active' : ''} onClick={() => setActiveTab('chat')} style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', position: 'relative' }}>
          <Chat size={16} /> 1對1私訊
          {/* Unread Message Count Placeholder */}
          <span className="unread-badge-placeholder" style={{ position: 'absolute', top: '-6px', right: '-8px', background: '#e05a47', color: '#fff', fontSize: '9px', fontWeight: 'bold', minWidth: '15px', height: '15px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'scale(0.95)' }}>
            3
          </span>
        </button>
      </nav>

      {/* Render selected view content */}
      <div style={{ padding: '0 16px' }}>
        {activeTab === 'topics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ padding: '10px 0', fontSize: '13px', color: '#5e746f' }}>
              💡 選擇下方您感興趣的主題，即可與數千位家長共同探討照護經驗。
            </div>
            {topicCategories.map((cat, i) => (
              <TopicCard key={i} icon={cat.icon} title={cat.title} description={cat.description} members={cat.members} moderator={cat.moderator} />
            ))}
          </div>
        )}

        {activeTab === 'broadcasts' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ padding: '10px 0', fontSize: '13px', color: '#5e746f' }}>
              📢 串接全國合格動物醫院的即時推播，為您帶來第一手的診間公告與門診調整資訊。
            </div>
            {broadcastList.map((item, i) => (
              <BroadcastCard key={i} hospital={item.hospital} announcement={item.announcement} date={item.date} priority={item.priority} verified={item.verified} notificationEnabled={item.notificationEnabled} />
            ))}
          </div>
        )}

        {activeTab === 'events' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
            <div style={{ padding: '10px 0 0 0', fontSize: '13px', color: '#5e746f', gridColumn: '1/-1' }}>
              🎥 專家級獸醫與照護講師線上與線下活動，名額有限，請及早點選預約。
            </div>
            {eventList.map((item, i) => (
              <EventCard key={i} type={item.type} title={item.title} date={item.date} aiSummary={item.aiSummary} />
            ))}
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="cozy-editor-card" style={{ padding: '30px 20px', textAlign: 'center', color: '#5e746f' }}>
            <div style={{ fontSize: '48px', marginBottom: '14px' }}>👤</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#173f3b', fontWeight: 'bold' }}>1 對 1 家長私密通訊</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', lineHeight: '1.5', color: '#888' }}>
              為了 100% 保障您的裝置隱私，通訊系統即將採用去中心化的點對點加密技術。此功能目前正進行實機安全測試。
            </p>
            <div style={{ background: '#fbf4e8', border: '1px solid #f2e9dc', padding: '12px 14px', borderRadius: '10px', fontSize: '12px', color: '#b27a30', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span>🔒 點對點加密技術測試中 (預留)</span>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
