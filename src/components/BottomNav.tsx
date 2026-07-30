import { House, Images, Users, Heartbeat, BellRinging } from '@phosphor-icons/react'

export type View = 'care' | 'health' | 'memories' | 'calendar' | 'settings' | 'relax' | 'community'

interface BottomNavProps {
  active: View
  onChange: (view: View) => void
}

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="主要導覽" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
      <button className={active === 'care' ? 'active' : ''} onClick={() => onChange('care')}>
        <i><House size={22} weight={active === 'care' ? 'fill' : 'regular'} /></i><span style={{ fontSize: '11px' }}>今日</span>
      </button>
      <button className={active === 'memories' ? 'active' : ''} onClick={() => onChange('memories')}>
        <i><Images size={22} weight={active === 'memories' ? 'fill' : 'regular'} /></i><span style={{ fontSize: '11px' }}>紀錄</span>
      </button>
      <button className={active === 'community' ? 'active' : ''} onClick={() => onChange('community')}>
        <i><Users size={22} weight={active === 'community' ? 'fill' : 'regular'} /></i><span style={{ fontSize: '11px' }}>社群</span>
      </button>
      <button className={active === 'health' ? 'active' : ''} onClick={() => onChange('health')}>
        <i><Heartbeat size={22} weight={active === 'health' ? 'fill' : 'regular'} /></i><span style={{ fontSize: '11px' }}>健康</span>
      </button>
      <button className={active === 'calendar' || active === 'relax' ? 'active' : ''} onClick={() => onChange('calendar')}>
        <i><BellRinging size={22} weight={active === 'calendar' || active === 'relax' ? 'fill' : 'regular'} /></i><span style={{ fontSize: '11px' }}>提醒</span>
      </button>
    </nav>
  )
}
