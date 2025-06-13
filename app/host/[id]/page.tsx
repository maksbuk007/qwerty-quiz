"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/AuthContext"
import ThemeToggle from "@/components/ui/ThemeToggle"
import { AVATARS } from "@/components/ui/AvatarSelector"
import { doc, getDoc } from "firebase/firestore"
import { db, realtimeDb } from "@/lib/firebase/config"
import { GameService } from "@/lib/firebase/gameService"
import type { Game, GameSession, Question, Player } from "@/types/game"
import QRCode from "react-qr-code"
import {
  Play,
  Pause,
  SkipForward,
  Square,
  Users,
  Clock,
  ArrowLeft,
  CheckCircle,
  XCircle,
  BarChart2,
  Trophy,
  LogOut,
  UserX,
  Copy,
  Wifi,
  WifiOff,
  AlertTriangle,
  Loader2,
  User,
  MessageSquare,
  Trash2,
  Eye,
  EyeOff,
  RotateCcw,
  Party-Popper,
} from "lucide-react"
import { ref, push, update } from "firebase/database"
import UserProfile from "@/components/ui/UserProfile"
import AdminGameChat from "@/components/game/AdminGameChat"
import { toast } from "@/hooks/use-toast"

export default function HostPanel() {
  const { id } = useParams()
  const router = useRouter()
  const { user, isAdmin, loading: authLoading, logout } = useAuth()

  // Основное состояние
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [game, setGame] = useState<Game | null>(null)
  const [gameSession, setGameSession] = useState<GameSession | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)

  // Состояние таймера
  const [timeLeft, setTimeLeft] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(false)

  // UI состояние
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected">("disconnected")
  const [kickReason, setKickReason] = useState("")
  const [kickingPlayer, setKickingPlayer] = useState<string | null>(null)
  const [showProfile, setShowProfile] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [showQuestionPreview, setShowQuestionPreview] = useState(true)
  const [isRestarting, setIsRestarting] = useState(false)

  // Refs для управления
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)

  const getAvatarDisplay = useCallback((avatarId: string) => {
    const avatar = AVATARS.find((a) => a.id === avatarId)
    if (!avatar) return <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">?</div>

    return (
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${avatar.color}`}>
        {avatar.emoji}
      </div>
    )
  }, [])

  // Очистка ресурсов
  const cleanup = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current()
      unsubscribeRef.current = null
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // Проверка доступа
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push("/")
    }
  }, [authLoading, isAdmin, router])

  // Инициализация игры
  useEffect(() => {
    if (!id || !user || !isAdmin || authLoading) return

    let mounted = true

    const initializeGame = async () => {
      try {
        setLoading(true)
        setError("")

        console.log("Загружаем игру:", id)

        // Загружаем данные игры из Firestore
        const gameDoc = await getDoc(doc(db, "games", id as string))

        if (!gameDoc.exists()) {
          if (mounted) {
            setError("Игра не найдена")
            setLoading(false)
          }
          return
        }

        const gameData = { id: gameDoc.id, ...gameDoc.data() } as Game
        console.log("Игра загружена:", gameData)

        if (!mounted) return
        setGame(gameData)

        // Создаем или подключаемся к сессии
        console.log("Инициализируем сессию...")

        // Подписываемся на обновления сессии
        const unsubscribe = GameService.subscribeToSession(gameData.id, (session) => {
          if (!mounted) return

          console.log("Обновление сессии:", session)
          setConnectionStatus("connected")

          if (session) {
            setGameSession(session)

            // Обновляем текущий вопрос
            if (
              gameData.questions &&
              session.currentQuestionIndex >= 0 &&
              gameData.questions[session.currentQuestionIndex]
            ) {
              const question = gameData.questions[session.currentQuestionIndex]
              setCurrentQuestion(question)

              // Обновляем таймер
              if (session.status === "active" && session.questionStartTime) {
                const elapsed = Math.floor((Date.now() - session.questionStartTime) / 1000)
                const remaining = Math.max(0, (question.timeLimit || 30) - elapsed)
                setTimeLeft(remaining)
                setIsTimerRunning(remaining > 0)
              } else {
                setTimeLeft(question.timeLimit || 30)
                setIsTimerRunning(false)
              }
            }
          } else {
            // Создаем новую сессию
            console.log("Создаем новую сессию...")
            GameService.addPlayerToSession(gameData.id, {
              id: "host",
              nickname: "Host",
              avatar: "host",
              score: 0,
              answers: [],
              warnings: 0,
              isMuted: false,
              isConnected: true,
              joinedAt: Date.now(),
            }).catch(console.error)
          }

          if (mounted) {
            setLoading(false)
          }
        })

        unsubscribeRef.current = unsubscribe
      } catch (error) {
        console.error("Ошибка инициализации:", error)
        if (mounted) {
          setError("Ошибка при загрузке игры")
          setLoading(false)
        }
      }
    }

    initializeGame()

    return () => {
      mounted = false
      cleanup()
    }
  }, [id, user, isAdmin, authLoading, cleanup])

  // Таймер для вопросов
  useEffect(() => {
    if (isTimerRunning && timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false)
            showQuestionResults()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isTimerRunning, timeLeft])

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      isMountedRef.current = false
      cleanup()
    }
  }, [cleanup])

  // Функции управления игрой
  const startGame = async () => {
    if (!game || !gameSession) return

    try {
      await GameService.startGame(game.id)
      toast({
        title: "Игра запущена",
        description: "Игра успешно началась",
      })
    } catch (error) {
      console.error("Ошибка запуска игры:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось запустить игру",
        variant: "destructive",
      })
    }
  }

  const pauseGame = async () => {
    if (!game) return

    try {
      const sessionRef = ref(realtimeDb, `sessions/${game.id}`)
      await update(sessionRef, {
        status: "paused",
      })
    } catch (error) {
      console.error("Ошибка паузы игры:", error)
    }
  }

  const resumeGame = async () => {
    if (!game || !currentQuestion) return

    try {
      const sessionRef = ref(realtimeDb, `sessions/${game.id}`)
      await update(sessionRef, {
        status: "active",
        questionStartTime: Date.now(),
      })
    } catch (error) {
      console.error("Ошибка возобновления игры:", error)
    }
  }

  const nextQuestion = async () => {
    if (!game || !gameSession) return

    try {
      const nextIndex = gameSession.currentQuestionIndex + 1
      if (nextIndex >= game.questions.length) {
        await GameService.endGame(game.id)
      } else {
        const sessionRef = ref(realtimeDb, `sessions/${game.id}`)
        await update(sessionRef, {
          currentQuestionIndex: nextIndex,
          questionStartTime: Date.now(),
          status: "active",
          showLeaderboard: false,
          showResults: false,
        })
      }
    } catch (error) {
      console.error("Ошибка перехода к следующему вопросу:", error)
    }
  }

  const ShowTop3 = async () => {
    if (!game || !gameSession) return

    try {

        const sessionRef = ref(realtimeDb, `sessions/${game.id}`)
        await update(sessionRef, {
          status: "finished",
          showLeaderboard: false,
          showResults: false,
        })
    } catch (error) {
      console.error("Ошибка показа пьедестала топ-3 игроков:", error)
    }
  }

  const endGame = async () => {
    if (!game) return

    try {
      await GameService.endGame(game.id)
      toast({
        title: "Игра завершена",
        description: "Игра успешно завершена",
      })
    } catch (error) {
      console.error("Ошибка завершения игры:", error)
    }
  }

  const restartGame = async () => {
    if (!game) return

    try {
      const sessionRef = ref(realtimeDb, `sessions/${game.id}`)
      await update(sessionRef, {
        status: "waiting",
        currentQuestionIndex: 0,
        startTime: null,
        endTime: null,
        questionStartTime: null,
      })

      // Сбрасываем очки и ответы всех игроков
      if (gameSession?.players) {
        const playersRef = ref(realtimeDb, `sessions/${game.id}/players`)
        const updates: Record<string, any> = {}

        Object.keys(gameSession.players).forEach((playerId) => {
          if (playerId !== "host") {
            updates[`${playerId}/score`] = 0
            updates[`${playerId}/answers`] = []
          }
        })

        await update(playersRef, updates)
      }

      // Очищаем чат
      await GameService.clearChat(game.id)

      toast({
        title: "Игра перезапущена",
        description: "Игра готова к новому раунду",
      })
    } catch (error) {
      console.error("Ошибка перезапуска игры:", error)
    }
  }

  const fullRestartGame = async () => {
    if (!game || isRestarting) return

    try {
      setIsRestarting(true)

      await GameService.fullRestartGame(game.id)

      toast({
        title: "Полный перезапуск",
        description: "Все игроки отключены, игра полностью перезапущена",
      })
    } catch (error) {
      console.error("Ошибка полного перезапуска игры:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось выполнить полный перезапуск",
        variant: "destructive",
      })
    } finally {
      setIsRestarting(false)
    }
  }

  const showQuestionResults = async () => {
    if (!game) return

    try {
      const sessionRef = ref(realtimeDb, `sessions/${game.id}`)
      await update(sessionRef, {
        showResults: true,
        showLeaderboard: false,
        status: "paused",
      })
    } catch (error) {
      console.error("Ошибка отображения результатов:", error)
    }
  }

  const showLeaderboardToPlayers = async () => {
    if (!game) return

    try {
      const sessionRef = ref(realtimeDb, `sessions/${game.id}`)
      await update(sessionRef, {
        showLeaderboard: true,
        showResults: false,
        status: "paused",
      })
    } catch (error) {
      console.error("Ошибка отображения лидерборда:", error)
    }
  }

  const sendSystemMessage = async (message: string, type: "system" | "kick" = "system") => {
    if (!game) return

    try {
      const chatRef = ref(realtimeDb, `sessions/${game.id}/chatMessages`)
      await push(chatRef, {
        id: `msg_${Date.now()}`,
        playerId: "system",
        playerName: "Система",
        playerAvatar: "",
        message,
        timestamp: Date.now(),
        type,
      })
    } catch (error) {
      console.error("Ошибка отправки системного сообщения:", error)
    }
  }

  const kickPlayer = async (playerId: string, reason: string) => {
    if (!game || !gameSession) return

    try {
      const player = gameSession.players[playerId]
      if (!player) return

      // Отправляем системное сообщение в чат
      await sendSystemMessage(`Администратор исключил ${player.nickname} из игры. Причина: ${reason}`, "kick")

      // Сначала отмечаем игрока как отключенного с причиной
      await GameService.updatePlayerStatus(game.id, playerId, {
        isConnected: false,
        kickReason: reason,
      })

      // Затем полностью удаляем его из сессии через небольшую задержку
      setTimeout(async () => {
        await GameService.removePlayerFromSession(game.id, playerId)
      }, 2000)

      setKickingPlayer(null)
      setKickReason("")

      toast({
        title: "Игрок исключен",
        description: `${player.nickname} исключен из игры`,
      })
    } catch (error) {
      console.error("Ошибка исключения игрока:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось исключить игрока",
        variant: "destructive",
      })
    }
  }

  const clearChatHandler = async () => {
    if (!game) return

    try {
      await GameService.clearChat(game.id)
      toast({
        title: "Чат очищен",
        description: "Все сообщения удалены",
      })
    } catch (error) {
      console.error("Ошибка очистки чата:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось очистить чат",
        variant: "destructive",
      })
    }
  }

  const getActivePlayers = (): Player[] => {
    if (!gameSession?.players) return []
    return Object.values(gameSession.players).filter((player) => player.isConnected && player.id !== "host")
  }

  const getAnsweredPlayers = (): Player[] => {
    if (!gameSession?.players || !currentQuestion) return []
    return Object.values(gameSession.players).filter(
      (player) =>
        player.isConnected && player.id !== "host" && player.answers?.some((a) => a.questionId === currentQuestion.id),
    )
  }

  const getPlayerAnswerStatus = (player: Player): { answered: boolean; correct: boolean; answer?: any } => {
    if (!currentQuestion) return { answered: false, correct: false }
    const answer = player.answers?.find((a) => a.questionId === currentQuestion.id)
    return {
      answered: !!answer,
      correct: answer?.isCorrect || false,
      answer: answer?.answer,
    }
  }

  const getAnswerDistribution = () => {
    if (!currentQuestion || !gameSession?.players) return []

    const distribution: { option: string; count: number; isCorrect: boolean }[] = []

    if (
      currentQuestion.type === "MULTIPLE_CHOICE" ||
      currentQuestion.type === "MULTIPLE_SELECT" ||
      currentQuestion.type === "TRUE_FALSE"
    ) {
      currentQuestion.options?.forEach((option, index) => {
        const count = Object.values(gameSession.players).filter((player) => {
          if (player.id === "host") return false
          const answer = player.answers?.find((a) => a.questionId === currentQuestion.id)
          if (!answer) return false
          if (Array.isArray(answer.answer)) {
            return answer.answer.includes(index)
          }
          return answer.answer === index
        }).length

        distribution.push({
          option,
          count,
          isCorrect: (currentQuestion.correctAnswers as number[]).includes(index),
        })
      })
    }

    return distribution
  }

  // Рендеринг состояний загрузки и ошибок
  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Загрузка панели ведущего...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8">
            <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
            <h2 className="text-xl font-bold mb-4 text-destructive">{error}</h2>
            <Button onClick={() => router.push("/admin")}>Вернуться к списку игр</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!game) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8">
            <h2 className="text-xl font-bold mb-4">Игра не найдена</h2>
            <Button onClick={() => router.push("/admin")}>Вернуться к списку игр</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!gameSession) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Инициализация игровой сессии...</p>
        </div>
      </div>
    )
  }

  const activePlayers = getActivePlayers()
  const answeredPlayers = getAnsweredPlayers()
  const joinUrl = typeof window !== "undefined" ? `${window.location.origin}/join/${game.code}` : ""
  const progressPercentage =
    currentQuestion && timeLeft > 0 ? ((currentQuestion.timeLimit - timeLeft) / currentQuestion.timeLimit) * 100 : 100

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Button variant="outline" onClick={() => router.push("/admin")}>
            <ArrowLeft className="w-4 h-4 mr-2" />К списку игр
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold">{game.title}</h1>
          <div className="flex flex-wrap items-center gap-2">
            {connectionStatus === "connected" ? (
              <Wifi className="w-5 h-5 text-green-500" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-500" />
            )}
            <Badge variant="outline">Код: {game.code}</Badge>
            <Badge variant="outline">Статус: {gameSession.status}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowChat(!showChat)}
            className="flex items-center gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            Чат
          </Button>
          <ThemeToggle />
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowProfile(true)}
              className="flex items-center gap-2 profile-button"
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Профиль</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Левая колонка - Управление игрой */}
        <div className="lg:col-span-2 space-y-6">
          {/* Панель управления */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <CardTitle>Управление игрой</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">
                    <Users className="w-4 h-4 mr-1" />
                    {activePlayers.length} игроков
                  </Badge>
                  <Badge variant="outline">
                    Вопрос {gameSession.currentQuestionIndex + 1} из {game.questions.length}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {gameSession.status === "waiting" && (
                  <Button onClick={startGame} size="lg" disabled={activePlayers.length === 0}>
                    <Play className="w-4 h-4 mr-2" />
                    Начать игру
                  </Button>
                )}

                {gameSession.status === "active" && (
                  <>
                    <Button onClick={pauseGame} variant="outline">
                      <Pause className="w-4 h-4 mr-2" />
                      Пауза
                    </Button>
                    <Button onClick={showQuestionResults} variant="outline">
                      <BarChart2 className="w-4 h-4 mr-2" />
                      Показать результаты
                    </Button>
                    <Button onClick={showLeaderboardToPlayers} variant="outline">
                      <Trophy className="w-4 h-4 mr-2" />
                      Показать лидерборд
                    </Button>
                    <Button onClick={nextQuestion}>
                      <SkipForward className="w-4 h-4 mr-2" />
                      Следующий вопрос
                    </Button>
                    <Button onClick={endGame} variant="destructive">
                      <Square className="w-4 h-4 mr-2" />
                      Завершить игру
                    </Button>
                  </>
                )}

                {gameSession.status === "paused" && (
                  <>
                    <Button onClick={resumeGame}>
                      <Play className="w-4 h-4 mr-2" />
                      Продолжить
                    </Button>
                    <Button onClick={showQuestionResults} variant="outline">
                      <BarChart2 className="w-4 h-4 mr-2" />
                      Показать результаты
                    </Button>
                    <Button onClick={showLeaderboardToPlayers} variant="outline">
                      <Trophy className="w-4 h-4 mr-2" />
                      Показать лидерборд
                    </Button>
                    <Button onClick={ShowTop3}>
                      <Party-Popper className="w-4 h-4 mr-2" />
                      Показать пьедестал топ-3
                    </Button>
                    <Button onClick={nextQuestion}>
                      <SkipForward className="w-4 h-4 mr-2" />
                      Следующий вопрос
                    </Button>
                  </>
                )}

                {gameSession.status === "finished" && (
                  <Button onClick={restartGame} size="lg">
                    <Play className="w-4 h-4 mr-2" />
                    Перезапустить игру
                  </Button>
                )}

                {/* Кнопки управления */}
                <div className="flex gap-2 ml-auto">
                  <Button variant="outline" size="sm" onClick={clearChatHandler}>
                    <Trash2 className="w-4 h-4 mr-1" />
                    Очистить чат
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={fullRestartGame}
                    disabled={isRestarting}
                    className="flex items-center gap-2"
                  >
                    {isRestarting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                    Полный перезапуск
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Текущий вопрос - то что видят игроки */}
          {currentQuestion && gameSession.status !== "waiting" && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <CardTitle>Текущий вопрос (что видят игроки)</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setShowQuestionPreview(!showQuestionPreview)}>
                      {showQuestionPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span className={`font-bold ${timeLeft <= 5 ? "text-red-500" : ""}`}>{timeLeft}с</span>
                  </div>
                </div>
                <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`absolute top-0 left-0 h-full transition-all duration-1000 ease-linear ${
                      timeLeft <= 5 ? "bg-red-500" : timeLeft <= 10 ? "bg-yellow-500" : "bg-green-500"
                    }`}
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </CardHeader>
              {showQuestionPreview && (
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-lg sm:text-xl font-medium p-4 bg-muted rounded-lg">
                      {currentQuestion.question}
                    </div>

                    {currentQuestion.imageUrl && (
                      <div className="flex justify-center">
                        <img
                          src={currentQuestion.imageUrl || "/placeholder.svg"}
                          alt="Изображение к вопросу"
                          className="max-w-full h-auto max-h-64 rounded-lg border"
                        />
                      </div>
                    )}

                    {(currentQuestion.type === "MULTIPLE_CHOICE" ||
                      currentQuestion.type === "MULTIPLE_SELECT" ||
                      currentQuestion.type === "TRUE_FALSE") && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {currentQuestion.options?.map((option, index) => (
                          <div
                            key={index}
                            className={`p-3 border rounded-lg ${
                              (currentQuestion.correctAnswers as number[]).includes(index)
                                ? "bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-600"
                                : "bg-gray-50 dark:bg-gray-800"
                            }`}
                          >
                            <span className="font-medium">{String.fromCharCode(65 + index)}.</span> {option}
                            {(currentQuestion.correctAnswers as number[]).includes(index) && (
                              <Badge variant="default" className="ml-2">
                                Правильный
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {currentQuestion.type === "TEXT_INPUT" && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Правильные ответы:</p>
                        <div className="flex flex-wrap gap-2">
                          {(currentQuestion.correctAnswers as string[]).map((answer, answerIndex) => (
                            <Badge key={answerIndex} variant="default">
                              {answer}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Тип: {currentQuestion.type}</span>
                      <span>Баллы: {currentQuestion.points}</span>
                    </div>

                    <div className="text-center text-sm text-muted-foreground">
                      <p>
                        Ответили: {answeredPlayers.length} из {activePlayers.length} игроков (
                        {activePlayers.length > 0
                          ? Math.round((answeredPlayers.length / activePlayers.length) * 100)
                          : 0}
                        %)
                      </p>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {/* Результаты ответов */}
          {gameSession.showResults && currentQuestion && (
            <Card>
              <CardHeader>
                <CardTitle>Результаты ответов</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {getAnswerDistribution().map((item, index) => (
                      <div
                        key={index}
                        className={`p-4 border rounded-lg ${
                          item.isCorrect
                            ? "bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-600"
                            : "bg-gray-50 dark:bg-gray-800"
                        }`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">{item.option}</span>
                          <Badge variant={item.isCorrect ? "default" : "outline"}>
                            {item.isCorrect ? "Правильный" : "Неправильный"}
                          </Badge>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                          <div
                            className={`h-2.5 rounded-full transition-all duration-1000 ${item.isCorrect ? "bg-green-500" : "bg-blue-500"}`}
                            style={{
                              width: `${activePlayers.length > 0 ? (item.count / activePlayers.length) * 100 : 0}%`,
                            }}
                          ></div>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {item.count} из {activePlayers.length} (
                          {activePlayers.length > 0 ? Math.round((item.count / activePlayers.length) * 100) : 0}%)
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="text-center text-sm text-muted-foreground">
                    <p>
                      Ответили: {answeredPlayers.length} из {activePlayers.length} игроков (
                      {activePlayers.length > 0 ? Math.round((answeredPlayers.length / activePlayers.length) * 100) : 0}
                      %)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Правая колонка */}
        <div className="space-y-6">
          {/* QR код для присоединения */}
          <Card>
            <CardHeader>
              <CardTitle>Присоединение к игре</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4">
              <div className="text-center">
                <p className="text-lg font-medium mb-2">Код игры:</p>
                <div className="text-2xl sm:text-3xl font-bold tracking-wider bg-primary/10 py-2 px-4 rounded-lg font-mono">
                  {game.code}
                </div>
              </div>

              {joinUrl && (
                <>
                  <div className="p-4 bg-white rounded-lg shadow-sm">
                    <QRCode value={joinUrl} size={150} />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(game.code)
                        toast({
                          title: "Скопировано",
                          description: "Код игры скопирован в буфер обмена",
                        })
                      }}
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Код
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(joinUrl)
                        toast({
                          title: "Скопировано",
                          description: "Ссылка скопирована в буфер обмена",
                        })
                      }}
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Ссылка
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Список игроков */}
          <Card>
            <CardHeader>
              <CardTitle>Игроки ({activePlayers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {activePlayers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Пока нет игроков</p>
                      <p className="text-sm">
                        Поделитесь кодом игры: <strong>{game.code}</strong>
                      </p>
                    </div>
                  ) : (
                    activePlayers.map((player) => {
                      const status = getPlayerAnswerStatus(player)
                      return (
                        <div key={player.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            {getAvatarDisplay(player.avatar)}
                            <div>
                              <div className="font-medium">{player.nickname}</div>
                              <div className="text-xs text-muted-foreground">
                                Счет: {player.score} • Ответов: {player.answers?.length || 0}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {gameSession.status === "active" && currentQuestion && (
                              <div>
                                {status.answered ? (
                                  <div className="flex items-center gap-1">
                                    {status.correct ? (
                                      <CheckCircle className="w-4 h-4 text-green-500" />
                                    ) : (
                                      <XCircle className="w-4 h-4 text-red-500" />
                                    )}
                                    <span className="text-xs">
                                      {Array.isArray(status.answer)
                                        ? status.answer.map((i) => String.fromCharCode(65 + i)).join(", ")
                                        : typeof status.answer === "number"
                                          ? String.fromCharCode(65 + status.answer)
                                          : status.answer}
                                    </span>
                                  </div>
                                ) : (
                                  <Badge variant="outline" className="text-xs">
                                    Думает...
                                  </Badge>
                                )}
                              </div>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setKickingPlayer(player.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <UserX className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Модальное окно исключения игрока */}
      {kickingPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Исключить игрока
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Игрок: {activePlayers.find((p) => p.id === kickingPlayer)?.nickname}
                </p>
                <Input
                  placeholder="Причина исключения"
                  value={kickReason}
                  onChange={(e) => setKickReason(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={() => kickPlayer(kickingPlayer, kickReason || "Нарушение правил")}
                  disabled={!kickReason.trim()}
                >
                  Исключить
                </Button>
                <Button variant="outline" onClick={() => setKickingPlayer(null)}>
                  Отмена
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {user && <UserProfile isOpen={showProfile} onClose={() => setShowProfile(false)} />}
      <AdminGameChat
        gameId={game.id}
        isOpen={showChat}
        onToggle={() => setShowChat(!showChat)}
        gameStatus={gameSession.status}
      />
    </div>
  )
}
