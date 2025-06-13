export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  category: "games" | "score" | "participation" | "special" | "social" | "speed" | "accuracy" | "streak"
  condition: {
    type:
      | "games_created"
      | "games_played"
      | "total_score"
      | "best_score"
      | "streak"
      | "special"
      | "perfect_games"
      | "speed_demon"
      | "social_butterfly"
      | "night_owl"
      | "early_bird"
      | "marathon_player"
      | "accuracy_master"
      | "comeback_king"
      | "first_place_finishes"
      | "questions_answered"
      | "categories_mastered"
    value: number
    operator: "gte" | "eq" | "lte"
    metadata?: Record<string, any>
  }
  rarity: "common" | "rare" | "epic" | "legendary" | "mythic"
  points: number
  unlocked?: boolean
  unlockedAt?: number
  progress?: number
  maxProgress?: number
  isSecret?: boolean
  prerequisites?: string[]
}

export interface UserAchievement {
  achievementId: string
  unlockedAt: number
  progress?: number
  metadata?: Record<string, any>
}

export interface UserAchievements {
  userId: string
  achievements: UserAchievement[]
  totalPoints: number
  lastUpdated: number
  streaks: {
    currentLoginStreak: number
    longestLoginStreak: number
    currentWinStreak: number
    longestWinStreak: number
  }
  statistics: {
    perfectGames: number
    comebackWins: number
    firstPlaceFinishes: number
    questionsAnswered: number
    categoriesMastered: string[]
    averageAccuracy: number
    fastestAnswer: number
    longestSession: number
  }
}

export interface AchievementNotification {
  achievement: Achievement
  timestamp: number
  seen: boolean
}
