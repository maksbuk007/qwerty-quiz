import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore"
import { ref, set, push, update, onValue, off, serverTimestamp as rtdbServerTimestamp } from "firebase/database"
import { db, realtimeDb } from "./config"
import type { Game, GameSession, Player, ChatMessage, PlayerAnswer } from "@/types/game"

export class GameService {
  // Создание новой игры  
  static async createGame(gameData: Omit<Game, "id" | "createdAt" | "updatedAt">): Promise<string> {
    try {
      console.log("Создание новой игры:", gameData.title)

      const gameRef = doc(collection(db, "games"))
      const game: Game = {
        ...gameData,
        id: gameRef.id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      await setDoc(gameRef, game)
      console.log("Игра создана с ID:", gameRef.id)

      return gameRef.id
    } catch (error) {
      console.error("Ошибка создания игры:", error)
      throw new Error("Не удалось создать игру")
    }
  }

  // Получение игры по ID
  static async getGameById(gameId: string): Promise<Game | null> {
    try {
      console.log("Загрузка игры:", gameId)

      const gameDoc = await getDoc(doc(db, "games", gameId))
      if (!gameDoc.exists()) {
        console.log("Игра не найдена:", gameId)
        return null
      }

      const game = { id: gameDoc.id, ...gameDoc.data() } as Game
      console.log("Игра загружена:", game.title)
      return game
    } catch (error) {
      console.error("Ошибка загрузки игры:", error)
      throw new Error("Не удалось загрузить игру")
    }
  }

  // Поиск игры по коду
  static async findGameByCode(code: string): Promise<Game | null> {
    try {
      console.log("Поиск игры по коду:", code)

      const gamesRef = collection(db, "games")
      const q = query(gamesRef, where("code", "==", code.toUpperCase()), limit(1))
      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        console.log("Игра с кодом не найдена:", code)
        return null
      }

      const gameDoc = querySnapshot.docs[0]
      const game = { id: gameDoc.id, ...gameDoc.data() } as Game
      console.log("Игра найдена:", game.title)
      return game
    } catch (error) {
      console.error("Ошибка поиска игры:", error)
      throw new Error("Не удалось найти игру")
    }
  }

  // Создание сессии игры
  static async createSession(gameId: string, hostId: string, gameCode: string): Promise<void> {
    try {
      console.log("Создание сессии для игры:", gameId)

      const sessionRef = ref(realtimeDb, `sessions/${gameId}`)
      const session: GameSession = {
        gameId,
        code: gameCode,
        status: "waiting",
        players: {},
        currentQuestionIndex: 0,
        leaderboard: [],
        hostId,
        chat: {},
        notifications: [],
        showResults: false,
        showLeaderboard: false,
        createdAt: rtdbServerTimestamp(),
      }

      await set(sessionRef, session)
      console.log("Сессия создана для игры:", gameId)
    } catch (error) {
      console.error("Ошибка создания сессии:", error)
      throw new Error("Не удалось создать сессию игры")
    }
  }

  // Подписка на обновления сессии
  static subscribeToSession(gameId: string, callback: (session: GameSession | null) => void): () => void {
    console.log("Подписка на сессию:", gameId)

    const sessionRef = ref(realtimeDb, `sessions/${gameId}`)
    const unsubscribe = onValue(
      sessionRef,
      (snapshot) => {
        const data = snapshot.val()
        if (data) {
          console.log("Обновление сессии получено:", data.status)
          callback(data as GameSession)
        } else {
          console.log("Сессия не найдена:", gameId)
          callback(null)
        }
      },
      (error) => {
        console.error("Ошибка подписки на сессию:", error)
        callback(null)
      },
    )

    return unsubscribe
    }

  // Присоединение игрока к игре
  static async joinGame(gameId: string, player: Player): Promise<void> {
    try {
      console.log("Добавляем игрока в сессию:", player.id)

      const sessionRef = ref(realtimeDb, `sessions/${gameId}`)
      const playerRef = ref(realtimeDb, `sessions/${gameId}/players/${player.id}`)

      await update(playerRef, {
        ...player,
        joinedAt: rtdbServerTimestamp(),
        lastActivity: rtdbServerTimestamp(),
      })

      console.log("Игрок успешно добавлен в сессию:", player.id)
    } catch (error) {
      console.error("Ошибка присоединения к игре:", error)
      throw new Error("Не удалось присоединиться к игре")
    }
  }

  // Обновление статуса игрока
  static async updatePlayerStatus(gameId: string, playerId: string, updates: Partial<Player>): Promise<void> {
    try {
      console.log("Обновление статуса игрока:", playerId, updates)

      const playerRef = ref(realtimeDb, `sessions/${gameId}/players/${playerId}`)
      await update(playerRef, {
        ...updates,
        lastActivity: rtdbServerTimestamp(),
      })

      console.log("Статус игрока обновлен:", playerId)
    } catch (error) {
      console.error("Ошибка обновления статуса игрока:", error)
      throw new Error("Не удалось обновить статус игрока")
    }
  }

  // Отправка ответа игрока
  static async submitAnswer(gameId: string, playerId: string, answer: PlayerAnswer): Promise<void> {
    try {
      console.log("Отправка ответа игрока:", playerId, answer.questionId)

      const playerRef = ref(realtimeDb, `sessions/${gameId}/players/${playerId}`)

      // Получаем текущие данные игрока
      const snapshot = await new Promise<any>((resolve, reject) => {
        onValue(playerRef, resolve, reject, { onlyOnce: true })
      })

      const playerData = snapshot.val()
      if (!playerData) {
        throw new Error("Игрок не найден")
      }

      const currentAnswers = playerData.answers || []
      const newAnswers = [...currentAnswers, answer]
      const newScore = (playerData.score || 0) + answer.points

      await update(playerRef, {
        answers: newAnswers,
        score: newScore,
        lastActivity: rtdbServerTimestamp(),
      })

      console.log("Ответ игрока сохранен:", playerId, "Новый счет:", newScore)
    } catch (error) {
      console.error("Ошибка отправки ответа:", error)
      throw new Error("Не удалось отправить ответ")
    }
  }

  // Отправка сообщения в чат
  static async sendChatMessage(gameId: string, messageData: Omit<ChatMessage, 'id'>): Promise<string> {
    try {
      console.log("Отправка сообщения в чат:", messageData.message)

      const chatRef = ref(realtimeDb, `sessions/${gameId}/chat`)
      const newMessageRef = push(chatRef)
      
      const messageWithId = {
        ...messageData,
        id: newMessageRef.key,
        timestamp: messageData.timestamp || Date.now()
      }

      await set(newMessageRef, messageWithId)
      console.log("Сообщение отправлено в чат с ID:", newMessageRef.key)
      
      return newMessageRef.key as string
    } catch (error) {
      console.error("Ошибка отправки сообщения:", error)
      throw new Error("Не удалось отправить сообщение")
    }
  }

  // Очистка чата (оптимизированная версия)
  static async clearChat(gameId: string): Promise<void> {
    try {
      console.log("Очистка чата для игры:", gameId)

      const chatRef = ref(realtimeDb, `sessions/${gameId}/chat`)
      await set(chatRef, null) // Используем null вместо {} для полной очистки

      // Добавляем системное сообщение об очистке
      await this.sendChatMessage(gameId, {
        playerId: "system",
        playerName: "Система",
        playerAvatar: "",
        message: "Чат был очищен администратором",
        timestamp: Date.now(),
        type: "system"
      })

      console.log("Чат успешно очищен для игры:", gameId)
    } catch (error) {
      console.error("Ошибка очистки чата:", error)
      throw new Error("Не удалось очистить чат")
    }
  }


  // Начало игры
  static async startGame(gameId: string): Promise<void> {
    try {
      console.log("Начало игры:", gameId)

      const sessionRef = ref(realtimeDb, `sessions/${gameId}`)
      await update(sessionRef, {
        status: "active",
        currentQuestionIndex: 0,
        questionStartTime: rtdbServerTimestamp(),
        showResults: false,
        showLeaderboard: false,
      })

      console.log("Игра начата:", gameId)
    } catch (error) {
      console.error("Ошибка начала игры:", error)
      throw new Error("Не удалось начать игру")
    }
  }

  // Переход к следующему вопросу
  static async nextQuestion(gameId: string, questionIndex: number): Promise<void> {
    try {
      console.log("Переход к вопросу:", questionIndex)

      const sessionRef = ref(realtimeDb, `sessions/${gameId}`)
      await update(sessionRef, {
        status: "active",
        currentQuestionIndex: questionIndex,
        questionStartTime: rtdbServerTimestamp(),
        showResults: false,
        showLeaderboard: false,
      })

      console.log("Переход к вопросу выполнен:", questionIndex)
    } catch (error) {
      console.error("Ошибка перехода к вопросу:", error)
      throw new Error("Не удалось перейти к следующему вопросу")
    }
  }

  // Показ результатов вопроса
  static async showResults(gameId: string): Promise<void> {
    try {
      console.log("Показ результатов вопроса для игры:", gameId)

      const sessionRef = ref(realtimeDb, `sessions/${gameId}`)
      await update(sessionRef, {
        status: "active",
        showResults: true,
        showLeaderboard: false,
      })

      console.log("Результаты вопроса показаны:", gameId)
    } catch (error) {
      console.error("Ошибка показа результатов:", error)
      throw new Error("Не удалось показать результаты")
    }
  }

  // Показ лидерборда
  static async showLeaderboard(gameId: string): Promise<void> {
    try {
      console.log("Показ лидерборда для игры:", gameId)

      const sessionRef = ref(realtimeDb, `sessions/${gameId}`)
      await update(sessionRef, {
        status: "active",
        showResults: false,
        showLeaderboard: true,
      })

      console.log("Лидерборд показан:", gameId)
    } catch (error) {
      console.error("Ошибка показа лидерборда:", error)
      throw new Error("Не удалось показать лидерборд")
    }
  }

  // Пауза игры
  static async pauseGame(gameId: string): Promise<void> {
    try {
      console.log("Пауза игры:", gameId)

      const sessionRef = ref(realtimeDb, `sessions/${gameId}`)
      await update(sessionRef, {
        status: "paused",
        showResults: false,
        showLeaderboard: false,
      })

      console.log("Игра поставлена на паузу:", gameId)
    } catch (error) {
      console.error("Ошибка паузы игры:", error)
      throw new Error("Не удалось поставить игру на паузу")
    }
  }

  // Завершение игры
  static async finishGame(gameId: string): Promise<void> {
    try {
      console.log("Завершение игры:", gameId)

      const sessionRef = ref(realtimeDb, `sessions/${gameId}`)
      await update(sessionRef, {
        status: "finished",
        showResults: false,
        showLeaderboard: false,
        finishedAt: rtdbServerTimestamp(),
      })

      console.log("Игра завершена:", gameId)
    } catch (error) {
      console.error("Ошибка завершения игры:", error)
      throw new Error("Не удалось завершить игру")
    }
  }

  // Исключение игрока
  static async kickPlayer(gameId: string, playerId: string, reason = "Нарушение правил"): Promise<void> {
    try {
      console.log("Исключение игрока:", playerId, "Причина:", reason)

      const playerRef = ref(realtimeDb, `sessions/${gameId}/players/${playerId}`)
      await update(playerRef, {
        isKicked: true,
        kickReason: reason,
        kickedAt: rtdbServerTimestamp(),
        isConnected: false,
      })

      // Добавляем системное сообщение
      const systemMessage: ChatMessage = {
        id: `system_kick_${Date.now()}`,
        playerId: "system",
        playerName: "Система",
        playerAvatar: "",
        message: `Игрок был исключен из игры. Причина: ${reason}`,
        timestamp: Date.now(),
        type: "system",
      }

      const messageRef = ref(realtimeDb, `sessions/${gameId}/chat/${systemMessage.id}`)
      await set(messageRef, systemMessage)

      console.log("Игрок исключен:", playerId)
    } catch (error) {
      console.error("Ошибка исключения игрока:", error)
      throw new Error("Не удалось исключить игрока")
    }
  }

  // Полный перезапуск игры
  static async fullRestartGame(gameId: string): Promise<void> {
    try {
      console.log("Полный перезапуск игры:", gameId)

      const sessionRef = ref(realtimeDb, `sessions/${gameId}`)

      // Сначала отправляем сигнал перезапуска всем игрокам
      await update(sessionRef, {
        restartSignal: true,
        status: "restarting",
      })

      // Ждем немного, чтобы игроки получили сигнал
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Полностью очищаем сессию
      await set(sessionRef, {
        gameId,
        code: "",
        status: "waiting",
        players: {},
        currentQuestionIndex: 0,
        leaderboard: [],
        hostId: "",
        chat: {},
        notifications: [],
        showResults: false,
        showLeaderboard: false,
        createdAt: rtdbServerTimestamp(),
      })

      console.log("Игра полностью перезапущена:", gameId)
    } catch (error) {
      console.error("Ошибка полного перезапуска игры:", error)
      throw new Error("Не удалось перезапустить игру")
    }
  }

  // Получение всех игр пользователя
  static async getUserGames(userId: string): Promise<Game[]> {
    try {
      console.log("Загрузка игр пользователя:", userId)

      const gamesRef = collection(db, "games")
      const q = query(gamesRef, where("createdBy", "==", userId), orderBy("updatedAt", "desc"))
      const querySnapshot = await getDocs(q)

      const games = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Game[]

      console.log("Загружено игр:", games.length)
      return games
    } catch (error) {
      console.error("Ошибка загрузки игр пользователя:", error)
      throw new Error("Не удалось загрузить игры")
    }
  }

  // Обновление игры
  static async updateGame(gameId: string, updates: Partial<Game>): Promise<void> {
    try {
      console.log("Обновление игры:", gameId)

      const gameRef = doc(db, "games", gameId)
      await updateDoc(gameRef, {
        ...updates,
        updatedAt: Date.now(),
      })

      console.log("Игра обновлена:", gameId)
    } catch (error) {
      console.error("Ошибка обновления игры:", error)
      throw new Error("Не удалось обновить игру")
    }
  }

  // Удаление игры
  static async deleteGame(gameId: string): Promise<void> {
    try {
      console.log("Удаление игры:", gameId)

      // Удаляем игру из Firestore
      const gameRef = doc(db, "games", gameId)
      await deleteDoc(gameRef)

      // Удаляем сессию из Realtime Database
      const sessionRef = ref(realtimeDb, `sessions/${gameId}`)
      await set(sessionRef, null)

      console.log("Игра удалена:", gameId)
    } catch (error) {
      console.error("Ошибка удаления игры:", error)
      throw new Error("Не удалось удалить игру")
    }
  }
}

// Экспорт отдельных функций для обратной совместимости
export const createGame = GameService.createGame.bind(GameService)
export const getGameById = GameService.getGameById.bind(GameService)
export const findGameByCode = GameService.findGameByCode.bind(GameService)
export const createSession = GameService.createSession.bind(GameService)
export const subscribeToSession = GameService.subscribeToSession.bind(GameService)
export const joinGame = GameService.joinGame.bind(GameService)
export const updatePlayerStatus = GameService.updatePlayerStatus.bind(GameService)
export const submitAnswer = GameService.submitAnswer.bind(GameService)
export const sendChatMessage = GameService.sendChatMessage.bind(GameService)
export const clearChat = GameService.clearChat.bind(GameService)
export const startGame = GameService.startGame.bind(GameService)
export const nextQuestion = GameService.nextQuestion.bind(GameService)
export const showResults = GameService.showResults.bind(GameService)
export const showLeaderboard = GameService.showLeaderboard.bind(GameService)
export const pauseGame = GameService.pauseGame.bind(GameService)
export const finishGame = GameService.finishGame.bind(GameService)
export const kickPlayer = GameService.kickPlayer.bind(GameService)
export const fullRestartGame = GameService.fullRestartGame.bind(GameService)
export const getUserGames = GameService.getUserGames.bind(GameService)
export const updateGame = GameService.updateGame.bind(GameService)
export const deleteGame = GameService.deleteGame.bind(GameService)

export default GameService
