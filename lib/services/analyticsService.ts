import { db } from "../firebase/config"
import { collection, addDoc, getDocs, query, where, orderBy, limit, serverTimestamp } from "firebase/firestore"
import type { Player, Answer } from "@/types/game"
import type { GameAnalytics, PlayerAnalytics } from "@/types/analytics"

export class AnalyticsService {
  // Записать начало игры
  static async recordGameStart(gameId: string): Promise<void> {
    try {
      const analyticsRef = collection(db, "analytics")
      await addDoc(analyticsRef, {
        type: "game_start",
        gameId,
        timestamp: serverTimestamp(),
        data: {
          startTime: Date.now(),
        },
      })
    } catch (error) {
      console.error("Ошибка записи аналитики начала игры:", error)
    }
  }

  // Записать завершение игры
  static async recordGameEnd(gameId: string, session: any): Promise<void> {
    try {
      const analyticsRef = collection(db, "analytics")
      const playerCount = Object.keys(session.players || {}).length
      const completedPlayers = Object.values(session.players || {}).filter((p: any) => p.score > 0).length

      await addDoc(analyticsRef, {
        type: "game_end",
        gameId,
        timestamp: serverTimestamp(),
        data: {
          endTime: Date.now(),
          playerCount,
          completedPlayers,
          duration: session.startTime ? Date.now() - session.startTime : 0,
        },
      })
    } catch (error) {
      console.error("Ошибка записи аналитики завершения игры:", error)
    }
  }

  // Записать присоединение игрока
  static async recordPlayerJoin(gameId: string, player: Player): Promise<void> {
    try {
      const analyticsRef = collection(db, "analytics")
      await addDoc(analyticsRef, {
        type: "player_join",
        gameId,
        playerId: player.id,
        timestamp: serverTimestamp(),
        data: {
          nickname: player.nickname,
          avatar: player.avatar,
          joinTime: Date.now(),
        },
      })
    } catch (error) {
      console.error("Ошибка записи аналитики присоединения игрока:", error)
    }
  }

  // Записать ответ игрока
  static async recordPlayerAnswer(
    gameId: string,
    playerId: string,
    questionIndex: number,
    answer: Answer,
  ): Promise<void> {
    try {
      const analyticsRef = collection(db, "analytics")
      await addDoc(analyticsRef, {
        type: "player_answer",
        gameId,
        playerId,
        timestamp: serverTimestamp(),
        data: {
          questionIndex,
          answer: answer.selectedOption,
          isCorrect: answer.isCorrect,
          timeSpent: answer.timeSpent,
          points: answer.points,
        },
      })
    } catch (error) {
      console.error("Ошибка записи аналитики ответа игрока:", error)
    }
  }

  // Получить аналитику игры
  static async getGameAnalytics(gameId: string): Promise<GameAnalytics | null> {
    try {
      const analyticsRef = collection(db, "analytics")
      const q = query(analyticsRef, where("gameId", "==", gameId), orderBy("timestamp", "desc"))
      const querySnapshot = await getDocs(q)

      const events = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      // Обрабатываем события для создания аналитики
      const gameStart = events.find((e) => e.type === "game_start")
      const gameEnd = events.find((e) => e.type === "game_end")
      const playerJoins = events.filter((e) => e.type === "player_join")
      const playerAnswers = events.filter((e) => e.type === "player_answer")

      if (!gameStart) return null

      return {
        gameId,
        startTime: gameStart.data.startTime,
        endTime: gameEnd?.data.endTime || null,
        duration: gameEnd?.data.duration || 0,
        totalPlayers: playerJoins.length,
        completedPlayers: gameEnd?.data.completedPlayers || 0,
        totalAnswers: playerAnswers.length,
        correctAnswers: playerAnswers.filter((a: any) => a.data.isCorrect).length,
        averageScore: 0, // Вычислить отдельно
        questionAnalytics: [],
        playerAnalytics: [],
      }
    } catch (error) {
      console.error("Ошибка получения аналитики игры:", error)
      return null
    }
  }

  // Получить аналитику игрока
  static async getPlayerAnalytics(playerId: string): Promise<PlayerAnalytics[]> {
    try {
      const analyticsRef = collection(db, "analytics")
      const q = query(analyticsRef, where("playerId", "==", playerId), orderBy("timestamp", "desc"))
      const querySnapshot = await getDocs(q)

      const events = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      // Группируем по играм
      const gameGroups = events.reduce((acc: any, event: any) => {
        if (!acc[event.gameId]) {
          acc[event.gameId] = []
        }
        acc[event.gameId].push(event)
        return acc
      }, {})

      return Object.entries(gameGroups).map(([gameId, gameEvents]: [string, any]) => {
        const answers = gameEvents.filter((e: any) => e.type === "player_answer")
        const correctAnswers = answers.filter((a: any) => a.data.isCorrect)

        return {
          playerId,
          gameId,
          totalAnswers: answers.length,
          correctAnswers: correctAnswers.length,
          totalScore: answers.reduce((sum: number, a: any) => sum + (a.data.points || 0), 0),
          averageResponseTime:
            answers.reduce((sum: number, a: any) => sum + (a.data.timeSpent || 0), 0) / answers.length,
          accuracy: answers.length > 0 ? correctAnswers.length / answers.length : 0,
        }
      })
    } catch (error) {
      console.error("Ошибка получения аналитики игрока:", error)
      return []
    }
  }

  // Получить топ игроков
  static async getTopPlayers(limit = 10): Promise<any[]> {
    try {
      const analyticsRef = collection(db, "analytics")
      const q = query(analyticsRef, where("type", "==", "player_answer"), orderBy("timestamp", "desc"), limit(1000))
      const querySnapshot = await getDocs(q)

      const playerStats: Record<string, any> = {}

      querySnapshot.docs.forEach((doc) => {
        const data = doc.data()
        const playerId = data.playerId

        if (!playerStats[playerId]) {
          playerStats[playerId] = {
            playerId,
            totalGames: new Set(),
            totalScore: 0,
            totalAnswers: 0,
            correctAnswers: 0,
          }
        }

        playerStats[playerId].totalGames.add(data.gameId)
        playerStats[playerId].totalScore += data.data.points || 0
        playerStats[playerId].totalAnswers += 1
        if (data.data.isCorrect) {
          playerStats[playerId].correctAnswers += 1
        }
      })

      return Object.values(playerStats)
        .map((stats: any) => ({
          ...stats,
          totalGames: stats.totalGames.size,
          accuracy: stats.totalAnswers > 0 ? stats.correctAnswers / stats.totalAnswers : 0,
        }))
        .sort((a, b) => b.totalScore - a.totalScore)
        .slice(0, limit)
    } catch (error) {
      console.error("Ошибка получения топ игроков:", error)
      return []
    }
  }

  // Получить статистику по играм
  static async getGamesStatistics(): Promise<any> {
    try {
      const analyticsRef = collection(db, "analytics")
      const q = query(analyticsRef, orderBy("timestamp", "desc"), limit(1000))
      const querySnapshot = await getDocs(q)

      const events = querySnapshot.docs.map((doc) => doc.data())
      const gameStarts = events.filter((e) => e.type === "game_start")
      const gameEnds = events.filter((e) => e.type === "game_end")
      const playerJoins = events.filter((e) => e.type === "player_join")

      return {
        totalGames: gameStarts.length,
        completedGames: gameEnds.length,
        totalPlayers: new Set(playerJoins.map((e: any) => e.playerId)).size,
        averagePlayersPerGame: playerJoins.length / Math.max(gameStarts.length, 1),
      }
    } catch (error) {
      console.error("Ошибка получения статистики игр:", error)
      return {
        totalGames: 0,
        completedGames: 0,
        totalPlayers: 0,
        averagePlayersPerGame: 0,
      }
    }
  }
}
