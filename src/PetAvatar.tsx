import { useEffect, useState } from 'react'
import type { Pet } from './domain'
import { photoPanPercent } from './photo-position'

export default function PetAvatar({ pet, className = '' }: { pet: Pet; className?: string }) {
  const [url, setUrl] = useState('')
  useEffect(() => { if (!pet.avatarPhoto) { setUrl(''); return }; const next = URL.createObjectURL(pet.avatarPhoto); setUrl(next); return () => URL.revokeObjectURL(next) }, [pet.avatarPhoto])
  const position = { x: pet.avatarPosition?.x ?? 50, y: pet.avatarPosition?.y ?? 50 }
  const zoom = pet.avatarPosition?.zoom ?? 1
  const pan = photoPanPercent(position, zoom)
  return <i className={`pet-avatar ${className}`}>{url ? <img src={url} alt={`${pet.name}的頭像`} style={{ objectPosition: `${position.x}% ${position.y}%`, transform: `translate3d(${pan.x}%, ${pan.y}%, 0) scale(${zoom})` }} /> : pet.avatar}</i>
}
