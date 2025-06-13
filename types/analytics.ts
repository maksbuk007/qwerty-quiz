export interface GameAnalytics {
  gameId: string
  totalPlayers: number
  averageScore: number
  medianScore: number
  completionRate: number
  averageTimePerQuestion: number
  questionStats: QuestionAnalytics[]
  playerStats: PlayerAnalytics[]
  sessionDuration: number
  engagementScore: number
  createdAt: number
  gameMetadata: {
    title: string
    categories: string[]
    totalQuestions: number
    difficulty: "easy" | "medium" | "hard"
  }
}

export interface QuestionAnalytics {
  questionId: string
  questionText: string
  questionIndex: number
  correctAnswers: number
  totalAnswers: number
  accuracy: number
  averageTime: number
  fastestAnswer: number
  slowestAnswer: number
  difficultyScore: number
  answerDistribution: Record<string, number>
  timeDistribution: {
    fast: number
    medium: number
    slow: number
  }
  abandonmentRate: number
}

export interface PlayerAnalytics {
  playerId: string
  nickname: string
  score: number
  correctAnswers: number
  totalAnswers: number
  accuracy: number
  averageTime: number
  fastestAnswer: number
  slowestAnswer: number
  completionTime: number
  rank: number
  scorePerMinute: number
}

export interface OverallAnalytics {
  totalGames: number
  totalPlayers: number
  averagePlayersPerGame: number
  mostPopularCategories: Array<{ category: string; count: number }>
  averageGameDuration: number
  topPerformingGames: Array<{ gameId: string; title: string; averageScore: number }>
  playerEngagement: {
    newPlayers: number
    returningPlayers: number
    averageSessionsPerPlayer: number
  }
}
