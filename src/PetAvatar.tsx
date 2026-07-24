import { useEffect, useState } from 'react'
import type { Pet } from './domain'

export default function PetAvatar({ pet, className = '' }: { pet: Pet; className?: string }) {
  const [url, setUrl] = useState('')
  useEffect(() => { if (!pet.avatarPhoto) { setUrl(''); return }; const next = URL.createObjectURL(pet.avatarPhoto); setUrl(next); return () => URL.revokeObjectURL(next) }, [pet.avatarPhoto])
  return <i className={`pet-avatar ${className}`}>{url ? <img src={url} alt={`${pet.name}的頭像`} style={{ objectPosition: `${pet.avatarPosition?.x ?? 50}% ${pet.avatarPosition?.y ?? 50}%`, transform: `scale(${pet.avatarPosition?.zoom ?? 1})` }} /> : pet.avatar}</i>
}
