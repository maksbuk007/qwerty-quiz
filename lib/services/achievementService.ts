import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import type { Achievement, UserAchievements, UserAchievement } from "@/types/achievements"

export class AchievementService {
  private static achievements: Achievement[] = [
    // Базовые достижения (common)
    {
      id: "first_game_created",
      title: "Первые шаги",
      description: "Создайте свою первую игру",
      icon: "🎮",
      category: "games",
      rarity: "common",
      points: 10,
      condition: { type: "games_created", value: 1 },
      isSecret: false,
    },
    {
      id: "first_game_played",
      title: "Дебютант",
      description: "Сыграйте в свою первую игру",
      icon: "🎯",
      category: "participation",
      rarity: "common",
      points: 5,
      condition: { type: "games_played", value: 1 },
      isSecret: false,
    },
    {
      id: "first_correct_answer",
      title: "Первая кровь",
      description: "Дайте первый правильный ответ",
      icon: "✅",
      category: "score",
      rarity: "common",
      points: 5,
      condition: { type: "correct_answers", value: 1 },
      isSecret: false,
    },

    // Достижения участия (common-rare)
    {
      id: "games_played_5",
      title: "Активный игрок",
      description: "Сыграйте в 5 игр",
      icon: "🎲",
      category: "participation",
      rarity: "common",
      points: 25,
      condition: { type: "games_played", value: 5 },
      isSecret: false,
    },
    {
      id: "games_played_25",
      title: "Ветеран",
      description: "Сыграйте в 25 игр",
      icon: "🏆",
      category: "participation",
      rarity: "rare",
      points: 100,
      condition: { type: "games_played", value: 25 },
      isSecret: false,
    },
    {
      id: "games_played_100",
      title: "Легенда викторин",
      description: "Сыграйте в 100 игр",
      icon: "👑",
      category: "participation",
      rarity: "superrare",
      points: 500,
      condition: { type: "games_played", value: 100 },
      isSecret: false,
    },

    // Достижения по очкам (rare-epic)
    {
      id: "score_100",
      title: "Сотка",
      description: "Наберите 100 очков в одной игре",
      icon: "💯",
      category: "score",
      rarity: "rare",
      points: 50,
      condition: { type: "single_game_score", value: 100 },
      isSecret: false,
    },
    {
      id: "score_500",
      title: "Мастер очков",
      description: "Наберите 500 очков в одной игре",
      icon: "⭐",
      category: "score",
      rarity: "superrare",
      points: 150,
      condition: { type: "single_game_score", value: 500 },
      isSecret: false,
    },
    {
      id: "score_1000",
      title: "Тысячник",
      description: "Наберите 1000 очков в одной игре",
      icon: "🌟",
      category: "score",
      rarity: "epic",
      points: 300,
      condition: { type: "single_game_score", value: 1000 },
      isSecret: false,
    },

    // Достижения точности (rare-mythic)
    {
      id: "accuracy_80",
      title: "Снайпер",
      description: "Достигните 80% точности в игре с 10+ вопросами",
      icon: "🎯",
      category: "accuracy",
      rarity: "rare",
      points: 75,
      condition: { type: "accuracy_in_game", value: 80, minQuestions: 10 },
      isSecret: false,
    },
    {
      id: "perfect_game",
      title: "Идеальная игра",
      description: "Ответьте правильно на все вопросы в игре с 5+ вопросами",
      icon: "💎",
      category: "accuracy",
      rarity: "epic",
      points: 200,
      condition: { type: "perfect_accuracy", minQuestions: 5 },
      isSecret: false,
    },
    {
      id: "perfect_streak_5",
      title: "Непогрешимый",
      description: "Проведите 5 идеальных игр подряд",
      icon: "🔥",
      category: "streak",
      rarity: "mythic",
      points: 1000,
      condition: { type: "perfect_game_streak", value: 5 },
      isSecret: false,
    },

    // Достижения скорости (superrare-epic)
    {
      id: "speed_demon",
      title: "Демон скорости",
      description: "Ответьте на вопрос менее чем за 2 секунды",
      icon: "⚡",
      category: "speed",
      rarity: "superrare",
      points: 100,
      condition: { type: "answer_time", value: 2000, operator: "less" },
      isSecret: false,
    },
    {
      id: "lightning_fast",
      title: "Молниеносный",
      description: "Ответьте на 10 вопросов менее чем за 3 секунды каждый",
      icon: "⚡⚡",
      category: "speed",
      rarity: "epic",
      points: 250,
      condition: { type: "fast_answers_count", value: 10, maxTime: 3000 },
      isSecret: false,
    },

    // Социальные достижения (rare-superrare)
    {
      id: "social_butterfly",
      title: "Социальная бабочка",
      description: "Напишите 50 сообщений в чате игр",
      icon: "🦋",
      category: "social",
      rarity: "rare",
      points: 75,
      condition: { type: "chat_messages", value: 50 },
      isSecret: false,
    },
    {
      id: "chat_master",
      title: "Мастер общения",
      description: "Напишите 200 сообщений в чате игр",
      icon: "💬",
      category: "social",
      rarity: "superrare",
      points: 200,
      condition: { type: "chat_messages", value: 200 },
      isSecret: false,
    },

    // Достижения создания игр (common-legendary)
    {
      id: "games_created_5",
      title: "Создатель",
      description: "Создайте 5 игр",
      icon: "🛠️",
      category: "games",
      rarity: "rare",
      points: 100,
      condition: { type: "games_created", value: 5 },
      isSecret: false,
    },
    {
      id: "games_created_25",
      title: "Архитектор викторин",
      description: "Создайте 25 игр",
      icon: "🏗️",
      category: "games",
      rarity: "epic",
      points: 500,
      condition: { type: "games_created", value: 25 },
      isSecret: false,
    },
    {
      id: "games_created_100",
      title: "Мастер-создатель",
      description: "Создайте 100 игр",
      icon: "🎨",
      category: "games",
      rarity: "legendary",
      points: 2000,
      condition: { type: "games_created", value: 100 },
      isSecret: false,
    },

    // Временные достижения (rare-superrare)
    {
      id: "night_owl",
      title: "Полуночник",
      description: "Сыграйте в игру между 00:00 и 06:00",
      icon: "🦉",
      category: "special",
      rarity: "rare",
      points: 50,
      condition: { type: "play_time", startHour: 0, endHour: 6 },
      isSecret: false,
    },
    {
      id: "early_bird",
      title: "Ранняя пташка",
      description: "Сыграйте в игру между 05:00 и 08:00",
      icon: "🐦",
      category: "special",
      rarity: "rare",
      points: 50,
      condition: { type: "play_time", startHour: 5, endHour: 8 },
      isSecret: false,
    },

    // Марафонские достижения (epic-mythic)
    {
      id: "marathon_runner",
      title: "Марафонец",
      description: "Играйте непрерывно в течение 2 часов",
      icon: "🏃",
      category: "special",
      rarity: "epic",
      points: 300,
      condition: { type: "continuous_play_time", value: 7200000 }, // 2 часа в мс
      isSecret: false,
    },
    {
      id: "iron_will",
      title: "Железная воля",
      description: "Играйте непрерывно в течение 5 часов",
      icon: "🔩",
      category: "special",
      rarity: "mythic",
      points: 1000,
      condition: { type: "continuous_play_time", value: 18000000 }, // 5 часов в мс
      isSecret: false,
    },

    // Секретные достижения (legendary-secret)
    {
      id: "easter_egg",
      title: "Охотник за пасхалками",
      description: "Найдите скрытую пасхалку в игре",
      icon: "🥚",
      category: "special",
      rarity: "secret",
      points: 500,
      condition: { type: "easter_egg_found", value: 1 },
      isSecret: true,
    },
    {
      id: "developer_appreciation",
      title: "Благодарность разработчику",
      description: "Особое достижение для ценителей MaxQuiz",
      icon: "❤️",
      category: "special",
      rarity: "secret",
      points: 1000,
      condition: { type: "special_action", value: "developer_thanks" },
      isSecret: true,
    },
    {
      id: "first_place_comeback",
      title: "Великое возвращение",
      description: "Выиграйте игру, находясь на последнем месте в середине игры",
      icon: "🎭",
      category: "special",
      rarity: "legendary",
      points: 750,
      condition: { type: "comeback_victory", value: 1 },
      isSecret: false,
    },

    // Стрики и серии (superrare-mythic)
    {
      id: "win_streak_3",
      title: "Тройная победа",
      description: "Выиграйте 3 игры подряд",
      icon: "🔥",
      category: "streak",
      rarity: "superrare",
      points: 150,
      condition: { type: "win_streak", value: 3 },
      isSecret: false,
    },
    {
      id: "win_streak_10",
      title: "Непобедимый",
      description: "Выиграйте 10 игр подряд",
      icon: "👑",
      category: "streak",
      rarity: "mythic",
      points: 1500,
      condition: { type: "win_streak", value: 10 },
      isSecret: false,
    },
  ]

  static async getAllAchievements(): Promise<Achievement[]> {
    return this.achievements
  }

  static async getUserAchievements(userId: string): Promise<UserAchievements> {
    try {
      const userAchievementsDoc = await getDoc(doc(db, "user_achievements", userId))

      if (userAchievementsDoc.exists()) {
        const data = userAchievementsDoc.data()
        return {
          userId,
          achievements: data.achievements || [],
          totalPoints: data.totalPoints || 0,
          lastUpdated: data.lastUpdated || Date.now(),
        }
      }

      // Создаем новый документ достижений
      const newUserAchievements: UserAchievements = {
        userId,
        achievements: [],
        totalPoints: 0,
        lastUpdated: Date.now(),
      }

      await setDoc(doc(db, "user_achievements", userId), newUserAchievements)
      return newUserAchievements
    } catch (error) {
      console.error("Ошибка получения достижений пользователя:", error)
      return {
        userId,
        achievements: [],
        totalPoints: 0,
        lastUpdated: Date.now(),
      }
    }
  }

  static async unlockAchievement(userId: string, achievementId: string): Promise<boolean> {
    try {
      const userAchievements = await this.getUserAchievements(userId)
      const achievement = this.achievements.find((a) => a.id === achievementId)

      if (!achievement) return false

      // Проверяем, не разблокировано ли уже
      if (userAchievements.achievements.some((a) => a.achievementId === achievementId)) {
        return false
      }

      const newAchievement: UserAchievement = {
        achievementId,
        unlockedAt: Date.now(),
        progress: 100,
      }

      const updatedAchievements = [...userAchievements.achievements, newAchievement]
      const updatedTotalPoints = userAchievements.totalPoints + achievement.points

      await updateDoc(doc(db, "user_achievements", userId), {
        achievements: updatedAchievements,
        totalPoints: updatedTotalPoints,
        lastUpdated: Date.now(),
      })

      return true
    } catch (error) {
      console.error("Ошибка разблокировки достижения:", error)
      return false
    }
  }

  static async checkAndUnlockAchievements(userId: string, userStats: any): Promise<string[]> {
    const unlockedAchievements: string[] = []

    try {
      for (const achievement of this.achievements) {
        const isUnlocked = await this.checkAchievementCondition(achievement, userStats)
        if (isUnlocked) {
          const success = await this.unlockAchievement(userId, achievement.id)
          if (success) {
            unlockedAchievements.push(achievement.id)
          }
        }
      }
    } catch (error) {
      console.error("Ошибка проверки достижений:", error)
    }

    return unlockedAchievements
  }

  private static async checkAchievementCondition(achievement: Achievement, userStats: any): Promise<boolean> {
    const { condition } = achievement

    try {
      switch (condition.type) {
        case "games_created":
          return userStats.gamesCreated >= condition.value
        case "games_played":
          return userStats.gamesPlayed >= condition.value
        case "correct_answers":
          return userStats.correctAnswers >= condition.value
        case "single_game_score":
          return userStats.bestScore >= condition.value
        case "accuracy_in_game":
          return userStats.bestAccuracy >= condition.value
        case "perfect_accuracy":
          return userStats.perfectGames >= 1
        case "answer_time":
          return condition.operator === "less"
            ? userStats.fastestAnswer <= condition.value
            : userStats.fastestAnswer >= condition.value
        case "chat_messages":
          return userStats.chatMessages >= condition.value
        case "win_streak":
          return userStats.currentWinStreak >= condition.value
        default:
          return false
      }
    } catch (error) {
      console.error("Ошибка проверки условия достижения:", error)
      return false
    }
  }

  static getRarityColor(rarity: string): string {
    switch (rarity) {
      case "common":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
      case "rare":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "superrare":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200"
      case "epic":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
      case "mythic":
        return "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200"
      case "legendary":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "secret":
        return "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  static getRarityName(rarity: string): string {
    switch (rarity) {
      case "common":
        return "Обычное"
      case "rare":
        return "Редкое"
      case "superrare":
        return "Супер-редкое"
      case "epic":
        return "Эпическое"
      case "mythic":
        return "Мифическое"
      case "legendary":
        return "Легендарное"
      case "secret":
        return "Секретное"
      default:
        return "Неизвестно"
    }
  }

  // Инициализация достижений в базе данных
  static async initializeAchievements(): Promise<void> {
    try {
      const achievementsRef = collection(db, "achievements")
      const snapshot = await getDocs(achievementsRef)

      if (snapshot.empty) {
        // Добавляем все достижения в базу данных
        for (const achievement of this.achievements) {
          await setDoc(doc(db, "achievements", achievement.id), achievement)
        }
        console.log("Достижения инициализированы в базе данных")
      }
    } catch (error) {
      console.error("Ошибка инициализации достижений:", error)
    }
  }
}
