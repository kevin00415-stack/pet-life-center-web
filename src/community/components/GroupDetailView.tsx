import { useState, useEffect } from 'react'
import { CaretLeft, Plus, CheckCircle, ShieldCheck } from '@phosphor-icons/react'
import type { CommunityTopic } from '../community-types'

interface GroupPost {
  id: string
  groupId: string
  title: string
  content: string
  author: string
  date: string
}

const INITIAL_POSTS: GroupPost[] = [
  // topic-1: 高齡犬貓照護
  {
    id: 'post-1-1',
    groupId: 'topic-1',
    title: '老貓關節保健品推薦？',
    author: '小皮家長',
    content: '我們家的橘貓 14 歲了，最近走路速度變慢，起身時有點吃力，大家有推薦的關節保健品或日常照護方法嗎？',
    date: '2026-07-28',
  },
  {
    id: 'post-1-2',
    groupId: 'topic-1',
    title: '老狗居家防滑心得分享',
    author: '哈士奇阿諾',
    content: '家裡換了防滑墊並修剪腳底毛之後，阿諾站起來順暢多了，比較不容易打滑，推薦給所有老犬家長！',
    date: '2026-07-29',
  },
  // topic-2: 腎臟病交流
  {
    id: 'post-2-1',
    groupId: 'topic-2',
    title: '皮下輸液安撫技巧請益',
    author: '咪咪媽媽',
    content: '每次幫咪咪打皮下他都很抗拒、一直動。請問大家有什麼安撫絕招或比較細的針頭推薦嗎？',
    date: '2026-07-27',
  },
  {
    id: 'post-2-2',
    groupId: 'topic-2',
    title: '低磷鮮食食譜分享',
    author: '波波爸',
    content: '醫生建議控制磷攝取，我自己做了南瓜雞肉泥，波波很愛吃，精神也變好了。大家有推薦的其他低磷食材嗎？',
    date: '2026-07-29',
  },
  // topic-3: 癲癇與神經科
  {
    id: 'post-3-1',
    groupId: 'topic-3',
    title: '發作時的安撫與居家安全防護',
    author: '樂樂家人',
    content: '最近樂樂又發作了一次，好在提前鋪了軟墊沒有受傷。請問大家平時都是用什麼軟體記錄發作頻率與時間的？',
    date: '2026-07-26',
  },
  // topic-4: 皮膚敏感過敏
  {
    id: 'post-4-1',
    groupId: 'topic-4',
    title: '異位性皮膚炎燕麥洗劑推薦',
    author: '柴犬多比',
    content: '多比一到夏天肚子跟腳趾就容易發紅、一直啃。自從換了溫和的燕麥舒緩洗劑之後，抓癢頻率減少很多！',
    date: '2026-07-25',
  },
  // topic-5: 心臟病關懷
  {
    id: 'post-5-1',
    groupId: 'topic-5',
    title: '心臟服藥時間間隔討論',
    author: '馬爾濟斯糖糖',
    content: '醫生開了強心跟利尿劑，請問大家都是固定間隔 12 小時餵藥嗎？如果遲到一小時大家會怎麼補餵？',
    date: '2026-07-28',
  },
  // topic-6: 飲食與營養
  {
    id: 'post-6-1',
    groupId: 'topic-6',
    title: '主食罐與副食罐如何分辨？',
    author: '新手貓奴阿強',
    content: '剛開始養貓，好怕買錯讓貓咪營養不均衡。請問大家包裝上要看什麼標示或AAFCO認證比較保險？',
    date: '2026-07-24',
  },
  // topic-7: 幼犬幼貓成長
  {
    id: 'post-7-1',
    groupId: 'topic-7',
    title: '幼犬社會化黃金期建議',
    author: '黃金Cookie',
    content: 'Cookie目前三個月大，剛打完第二劑疫苗，大家都帶去哪裡進行安全又無壓力的社會化訓練呢？',
    date: '2026-07-29',
  },
]

interface GroupDetailViewProps {
  topic: CommunityTopic
  onBack: () => void
}

export function GroupDetailView({ topic, onBack }: GroupDetailViewProps) {
  const [posts, setPosts] = useState<GroupPost[]>(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('community_group_posts') : null
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        // ignore
      }
    }
    return INITIAL_POSTS
  })

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newAuthor, setNewAuthor] = useState('')
  const [newContent, setNewContent] = useState('')
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('community_group_posts', JSON.stringify(posts))
    }
  }, [posts])

  const groupPosts = posts.filter((p) => p.groupId === topic.id)

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim() || !newAuthor.trim() || !newContent.trim()) {
      setFormError('所有欄位皆為必填！')
      return
    }

    const newPost: GroupPost = {
      id: `post-${Date.now()}`,
      groupId: topic.id,
      title: newTitle.trim(),
      author: newAuthor.trim(),
      content: newContent.trim(),
      date: new Date().toISOString().slice(0, 10),
    }

    setPosts([newPost, ...posts])
    setNewTitle('')
    setNewAuthor('')
    setNewContent('')
    setFormError('')
    setShowCreateModal(false)
  }

  return (
    <div className="group-detail-view" style={{ animation: 'fadeIn 0.2s ease-out' }}>
      {/* Header with Back button */}
      <header className="timeline-header" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={onBack}
          className="back-btn"
          style={{
            background: '#edf6f3',
            border: 'none',
            borderRadius: '12px',
            width: '40px',
            height: '40px',
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
            color: 'var(--brand)',
          }}
          aria-label="返回社群列表"
        >
          <CaretLeft size={24} weight="bold" />
        </button>
        <div>
          <span className="eyebrow">GROUP DISCUSSION</span>
          <h2 style={{ margin: '4px 0', fontSize: '20px', color: 'var(--ink)' }}>{topic.title}</h2>
        </div>
      </header>

      {/* Group Info Card */}
      <div className="cozy-editor-card" style={{ marginBottom: '24px', background: '#fffaf2', borderColor: '#e1d5c7' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <span style={{ fontSize: '32px' }}>{topic.icon}</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#173f3b' }}>{topic.title}</h3>
            <span style={{ fontSize: '12px', color: '#888' }}>{topic.members} 個成員</span>
          </div>
          {topic.moderator && (
            <span style={{ marginLeft: 'auto', fontSize: '11px', background: '#eef3f1', color: '#426f69', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '2px' }}>
              <ShieldCheck size={14} weight="fill" /> {topic.moderator} 專業領袖
            </span>
          )}
        </div>
        <p style={{ margin: 0, fontSize: '14px', color: '#5e746f', lineHeight: '1.6' }}>{topic.description}</p>
      </div>

      {/* Post List Section Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--ink)', fontWeight: 'bold' }}>討論貼文 ({groupPosts.length})</h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="create-post-btn"
          style={{
            background: 'var(--brand)',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(111, 145, 167, 0.2)',
          }}
        >
          <Plus size={16} weight="bold" /> 發表新文章
        </button>
      </div>

      {/* Post List */}
      <div className="post-list" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {groupPosts.length > 0 ? (
          groupPosts.map((post) => (
            <article
              key={post.id}
              className="cozy-editor-card"
              style={{
                background: '#fff',
                borderColor: '#e8f0ee',
                padding: '16px',
                borderRadius: '16px',
                boxShadow: '0 4px 12px rgba(91, 69, 46, 0.03)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--brand-dark)' }}>{post.author}</span>
                <time style={{ fontSize: '11px', color: '#999' }}>{post.date}</time>
              </div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', color: 'var(--ink)', fontWeight: 'bold' }}>{post.title}</h4>
              <p style={{ margin: 0, fontSize: '14px', color: '#5e746f', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{post.content}</p>
            </article>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: '#999', background: '#fff', borderRadius: '16px', border: '1px dashed #e1d5c7' }}>
            目前此群組尚無任何討論貼文，快來發表第一篇吧！
          </div>
        )}
      </div>

      {/* Create Post Sheet / Backdrop Modal */}
      {showCreateModal && (
        <div className="sheet-backdrop" style={{ zIndex: 100 }} onClick={() => setShowCreateModal(false)}>
          <div
            className="editor-sheet"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
          >
            <header>
              <div>
                <span>NEW DISCUSSION POST</span>
                <h2>發表新貼文</h2>
              </div>
              <button className="close" onClick={() => setShowCreateModal(false)} aria-label="關閉表單">×</button>
            </header>

            <form onSubmit={handleCreatePost} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <label>
                作者暱稱 (必填)
                <input
                  type="text"
                  placeholder="例如：柴犬比比爸"
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  style={{
                    width: '100%',
                    border: '1.5px solid #dce7e4',
                    borderRadius: '10px',
                    padding: '12px',
                    fontSize: '15px',
                    background: '#fbfdfc',
                  }}
                />
              </label>

              <label>
                貼文標題 (必填)
                <input
                  type="text"
                  placeholder="請輸入吸引人的標題"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  style={{
                    width: '100%',
                    border: '1.5px solid #dce7e4',
                    borderRadius: '10px',
                    padding: '12px',
                    fontSize: '15px',
                    background: '#fbfdfc',
                  }}
                />
              </label>

              <label>
                貼文內容 (必填)
                <textarea
                  placeholder="請分享您的寶貴照護經驗或詢問問題..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  style={{
                    width: '100%',
                    height: '140px',
                    border: '1.5px solid #dce7e4',
                    borderRadius: '10px',
                    padding: '12px',
                    fontSize: '15px',
                    background: '#fbfdfc',
                    resize: 'vertical',
                  }}
                />
              </label>

              {formError && (
                <div style={{ color: '#a0443e', fontSize: '13px', fontWeight: 'bold' }}>
                  {formError}
                </div>
              )}

              <button
                type="submit"
                className="save-reminder"
                style={{
                  width: '100%',
                  background: 'var(--brand)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '16px',
                  padding: '14px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <CheckCircle size={20} weight="fill" /> 發布貼文
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
