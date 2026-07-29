export type PhotoPosition = {
  x: number
  y: number
}

export type PhotoTransform = PhotoPosition & {
  zoom: number
}

function clamp(value: number) {
  return Math.min(100, Math.max(0, value))
}

export function centerPhotoTransform(): PhotoTransform {
  return { x: 50, y: 50, zoom: 1 }
}

export function photoPanPercent(position: PhotoPosition, zoom: number): PhotoPosition {
  const extraScale = Math.max(0, zoom - 1)
  if (extraScale === 0) return { x: 0, y: 0 }
  return {
    x: (50 - position.x) * extraScale,
    y: (50 - position.y) * extraScale,
  }
}

export function movePhotoPosition(
  start: PhotoPosition,
  deltaX: number,
  deltaY: number,
  width: number,
  height: number,
): PhotoPosition {
  if (width <= 0 || height <= 0) return { x: clamp(start.x), y: clamp(start.y) }

  return {
    x: clamp(start.x - (deltaX / width) * 100),
    y: clamp(start.y - (deltaY / height) * 100),
  }
}

export function nudgePhotoPosition(
  current: PhotoPosition,
  key: string,
  step = 2,
): PhotoPosition {
  if (key === 'ArrowLeft') return { x: clamp(current.x + step), y: current.y }
  if (key === 'ArrowRight') return { x: clamp(current.x - step), y: current.y }
  if (key === 'ArrowUp') return { x: current.x, y: clamp(current.y + step) }
  if (key === 'ArrowDown') return { x: current.x, y: clamp(current.y - step) }
  return current
}
