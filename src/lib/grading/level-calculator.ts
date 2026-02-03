export type Level = 'beginner' | 'intermediate' | 'advanced'

export function calculateLevel(totalScore: number, maxScore: number): Level {
  if (maxScore === 0) return 'beginner'

  const percentage = (totalScore / maxScore) * 100

  if (percentage >= 80) return 'advanced'
  if (percentage >= 50) return 'intermediate'
  return 'beginner'
}

export function getLevelDisplayName(level: Level): string {
  const names: Record<Level, string> = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
  }
  return names[level]
}

export function getLevelColor(level: Level): string {
  const colors: Record<Level, string> = {
    beginner: 'bg-yellow-500',
    intermediate: 'bg-blue-500',
    advanced: 'bg-green-500',
  }
  return colors[level]
}
