import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase/config"

export function generateGameCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export async function generateUniqueGameCode(): Promise<string> {
  let code: string
  let isUnique = false
  let attempts = 0
  const maxAttempts = 10

  do {
    code = generateGameCode()
    try {
      const gamesRef = collection(db, "games")
      const q = query(gamesRef, where("code", "==", code))
      const querySnapshot = await getDocs(q)
      isUnique = querySnapshot.empty
      attempts++
    } catch (error) {
      console.error("Ошибка проверки уникальности кода:", error)
      attempts++
    }
  } while (!isUnique && attempts < maxAttempts)

  if (!isUnique) {
    throw new Error("Не удалось сгенерировать уникальный код игры")
  }

  return code
}

export function shuffleArray<T>(array: T[]): T[] {
  if (!Array.isArray(array)) return []

  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * Рассчитывает баллы за ответ на основе времени
 */
export function calculateScore(isCorrect: boolean, basePoints: number, timeSpent: number, timeLimit: number): number {
  if (!isCorrect || typeof basePoints !== "number" || basePoints <= 0) return 0
  if (typeof timeSpent !== "number" || typeof timeLimit !== "number") return basePoints

  // Если ответил за первые 3% времени - максимальные баллы
  const minTimeForMax = timeLimit * 0.03

  if (timeSpent <= minTimeForMax) {
    return basePoints
  }

  // Линейная обратная зависимость от времени
  const timeRatio = Math.max(0, (timeLimit - timeSpent) / (timeLimit - minTimeForMax))
  const minPoints = Math.floor(basePoints * 0.1) // Минимум 10% от базовых баллов

  return Math.max(minPoints, Math.round(basePoints * timeRatio))
}

/**
 * Форматирует время в читаемый вид
 */
export function formatTime(milliseconds: number): string {
  if (typeof milliseconds !== "number" || milliseconds < 0) return "0с"

  const seconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (minutes > 0) {
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  return `${remainingSeconds}с`
}

/**
 * Проверяет правильность ответа
 */
export function checkAnswer(userAnswer: any, correctAnswers: any[]): boolean {
  if (!correctAnswers || !Array.isArray(correctAnswers) || correctAnswers.length === 0) return false

  if (Array.isArray(userAnswer)) {
    // Для множественного выбора
    if (userAnswer.length !== correctAnswers.length) return false
    return userAnswer.every((answer) => correctAnswers.includes(answer))
  }

  if (typeof userAnswer === "string") {
    // Для текстовых ответов (регистронезависимо)
    const normalizedUserAnswer = userAnswer.toLowerCase().trim()
    return correctAnswers.some((answer) => {
      if (typeof answer === "string") {
        return answer.toLowerCase().trim() === normalizedUserAnswer
      }
      return answer.toString().toLowerCase().trim() === normalizedUserAnswer
    })
  }

  // Для одиночного выбора
  return correctAnswers.includes(userAnswer)
}

/**
 * Генерирует уникальный ID для игрока
 */
export function generatePlayerId(): string {
  return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Генерирует уникальный ID для вопроса
 */
export function generateQuestionId(): string {
  return `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Валидирует код игры
 */
export function validateGameCode(code: string): boolean {
  if (typeof code !== "string") return false
  return /^[A-Z0-9]{6}$/.test(code)
}

/**
 * Нормализует никнейм игрока
 */
export function normalizeNickname(nickname: string): string {
  if (typeof nickname !== "string") return ""
  return nickname.trim().slice(0, 20)
}

/**
 * Безопасно получает массив
 */
export function safeArray<T>(value: any): T[] {
  if (Array.isArray(value)) return value
  return []
}

/**
 * Безопасно получает объект
 */
export function safeObject<T>(value: any): Record<string, T> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value
  return {}
}

/**
 * Безопасно получает число
 */
export function safeNumber(value: any, defaultValue = 0): number {
  if (typeof value === "number" && !isNaN(value)) return value
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value)
    if (!isNaN(parsed)) return parsed
  }
  return defaultValue
}

/**
 * Безопасно получает строку
 */
export function safeString(value: any, defaultValue = ""): string {
  if (typeof value === "string") return value
  if (value !== null && value !== undefined) return String(value)
  return defaultValue
}

/**
 * Безопасно получает булево значение
 */
export function safeBoolean(value: any, defaultValue = false): boolean {
  if (typeof value === "boolean") return value
  if (typeof value === "string") return value.toLowerCase() === "true"
  if (typeof value === "number") return value !== 0
  return defaultValue
}

/**
 * Генерирует случайный код (алиас для generateGameCode для обратной совместимости)
 */
export function generateRandomCode(): string {
  return generateGameCode()
}

// Экспорт для обратной совместимости
