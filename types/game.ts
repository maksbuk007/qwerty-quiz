export interface GameSession {
  id: string
  gameCode: string
  status: "waiting" | "active" | "paused" | "question_results" | "leaderboard" | "finished" | "restarting"
  players: Record<string, Player>
  currentQuestionIndex: number
  currentQuestion?: Question | null
  questionStartTime?: number | null
  questionEndTime?: number | null
  showResults?: boolean
  showLeaderboard?: boolean
  chatMessages?: ChatMessage[]
  chat?: Record<string, ChatMessage> // Для обратной совместимости
  notifications?: any[]
  createdAt: number
  updatedAt: number
  restartSignal?: number // Сигнал для перезапуска
}
