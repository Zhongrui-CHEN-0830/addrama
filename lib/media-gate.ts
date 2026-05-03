export const NON_SKIPPABLE_AD_SECONDS = 8

export function chooseInsertPoint(
  recommendedInsertPoints: number[] | undefined,
  duration: number
): number {
  const recommended = recommendedInsertPoints?.find(point => point > 0)
  if (recommended && Number.isFinite(duration) && recommended < duration - 1) return recommended
  if (Number.isFinite(duration) && duration > 0) return Math.max(3, Math.min(35, duration * 0.5))
  return 8
}

export function formatMediaTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00'
  const whole = Math.floor(seconds)
  const mins = Math.floor(whole / 60)
  const secs = whole % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function shouldTriggerNonSkippableAd({
  currentTime,
  insertPoint,
  alreadyTriggered,
}: {
  currentTime: number
  insertPoint: number
  alreadyTriggered: boolean
}): boolean {
  return !alreadyTriggered && Number.isFinite(currentTime) && currentTime >= insertPoint
}

export function getAdGateRemainingSeconds(startedAtMs: number, nowMs: number): number {
  const elapsed = Math.max(0, Math.floor((nowMs - startedAtMs) / 1000))
  return Math.max(0, NON_SKIPPABLE_AD_SECONDS - elapsed)
}

export function canDismissNonSkippableAd(startedAtMs: number, nowMs: number): boolean {
  return getAdGateRemainingSeconds(startedAtMs, nowMs) === 0
}
