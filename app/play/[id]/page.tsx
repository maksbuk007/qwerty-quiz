"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import { GameService } from "@/lib/firebase/gameService"
import ThemeToggle from "@/components/ui/ThemeToggle"
import GameChat from "@/components/game/GameChat"
import AnimatedLeaderboard from "@/components/game/AnimatedLeaderboard"
import PodiumCeremony from "@/components/game/PodiumCeremony"
import WaitingRoom from "@/components/game/WaitingRoom"
import { AVATARS } from "@/components/ui/AvatarSelector"
import type { Game, GameSession, Question, Player, PlayerAnswer, ChatMessage } from "@/types/game"
import {
  Clock,
  CheckCircle,
  XCircle,
  Trophy,
  Users,
  Wifi,
  WifiOff,
  Loader2,
  AlertTriangle,
  MessageCircle,
  Pause,
} from "lucide-react"
import { calculateScore } from "@/lib/utils/gameUtils"

export default function GamePage() {
  const { id } = useParams()
  const searchParams = useSearchParams()
  const playerId = searchParams.get("playerId")
  const router = useRouter()

  // Основное состояние
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [kickedInfo, setKickedInfo] = useState<{ message: string; reason: string } | null>(null)
  const [game, setGame] = useState<Game | null>(null)
  const [gameSession, setGameSession] = useState<GameSession | null>(null)
  const [previousGameSession, setPreviousGameSession] = useState<GameSession | null>(null)
  const [player, setPlayer] = useState<Player | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])

  // Состояние вопроса
  const [timeLeft, setTimeLeft] = useState(0)
  const [totalTime, setTotalTime] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([])
  const [textAnswer, setTextAnswer] = useState("")
  const [answered, setAnswered] = useState(false)

  // UI состояние
  const [chatOpen, setChatOpen] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected">("disconnected")
  const [showLeaderboardAnimation, setShowLeaderboardAnimation] = useState(false)
  const [showPodium, setShowPodium] = useState(false)

  // Refs для управления
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)
  const isInitializedRef = useRef(false)

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
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current)
      progressTimerRef.current = null
    }
  }, [])

  // Плавный прогресс-бар (обновление каждые 100мс)
  useEffect(() => {
    if (gameSession?.status === "active" && totalTime > 0) {
      const updateProgress = () => {
        setTimeLeft((prevTime) => {
          const newTime = Math.max(0, prevTime - 0.1)

          if (newTime <= 0 && !answered) {
            handleSubmitAnswer()
            return 0
          }

          return newTime
        })
      }

      progressTimerRef.current = setInterval(updateProgress, 100)
    }

    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current)
        progressTimerRef.current = null
      }
    }
  }, [gameSession?.status, totalTime, answered])

  // Инициализация игры (только один раз)
  useEffect(() => {
    if (!id || !playerId || isInitializedRef.current) return

    let mounted = true
    isInitializedRef.current = true

    const initializeGame = async () => {
      try {
        setLoading(true)
        setError("")

        console.log("Инициализация игры:", id, "для игрока:", playerId)

        // Загружаем данные игры
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

        // Подписываемся на обновления сессии
        const unsubscribe = GameService.subscribeToSession(gameData.id, (session) => {
          if (!mounted) return

          console.log("Обновление сессии:", session)

          if (session) {
            // Проверяем сигнал перезапуска
            if (session.restartSignal) {
              console.log("Получен сигнал перезапуска игры")
              router.push("/")
              return
            }

            // Проверяем игрока
            const updatedPlayer = session.players[playerId]
            if (!updatedPlayer) {
              setError("Игрок не найден в сессии")
              return
            }

            // Проверяем, не исключен ли игрок
            if ((updatedPlayer as any).isKicked) {
              const reason = (updatedPlayer as any).kickReason || "Нарушение правил"
              setKickedInfo({
                message: "Вы были исключены из игры администратором",
                reason: reason,
              })
              setTimeout(() => {
                router.push("/")
              }, 8000)
              return
            }

            // Проверяем отключение (но не исключение)
            if (!updatedPlayer.isConnected && player?.isConnected && !(updatedPlayer as any).isKicked) {
              // Это обычное отключение, переподключаемся
              GameService.updatePlayerStatus(gameData.id, playerId, { isConnected: true })
            }

            setPlayer(updatedPlayer)
            setConnectionStatus("connected")

            // Обновляем чат
            if (session.chat && typeof session.chat === "object") {
              const messages = Object.values(session.chat).sort((a: any, b: any) => a.timestamp - b.timestamp)
              setChatMessages(messages as ChatMessage[])
            } else {
              setChatMessages([])
            }

            // Сохраняем предыдущую сессию для анимации лидерборда
            if (gameSession && session.showLeaderboard && !gameSession.showLeaderboard) {
              setPreviousGameSession(gameSession)
              setShowLeaderboardAnimation(true)
              setTimeout(() => setShowLeaderboardAnimation(false), 4000)
            }

            // Проверяем завершение игры для показа пьедестала
            if (session.status === "finished" && gameSession?.status !== "finished") {
              setShowPodium(true)
            }

            setGameSession(session)

            // Обновляем текущий вопрос
            if (gameData.questions && gameData.questions[session.currentQuestionIndex]) {
              const question = gameData.questions[session.currentQuestionIndex]
              setCurrentQuestion(question)
              setTotalTime(question.timeLimit)

              // Проверяем, ответил ли уже игрок
              const playerAnswers = updatedPlayer.answers || []
              const hasAnswered = playerAnswers.some((a) => a.questionId === question.id)
              setAnswered(hasAnswered)

              if (!hasAnswered) {
                setSelectedAnswers([])
                setTextAnswer("")
              }

              // Обновляем таймер
              if (session.questionStartTime && session.status === "active") {
                const elapsed = (Date.now() - session.questionStartTime) / 1000
                const remaining = Math.max(0, question.timeLimit - elapsed)
                setTimeLeft(remaining)
              } else {
                setTimeLeft(question.timeLimit)
              }
            }
          } else {
            setError("Сессия игры не найдена")
          }

          if (mounted && loading) {
            setLoading(false)
          }
        })

        unsubscribeRef.current = unsubscribe

        // Обновляем статус подключения игрока
        await GameService.updatePlayerStatus(gameData.id, playerId, {
          isConnected: true,
        })
      } catch (error) {
        console.error("Ошибка при загрузке игры:", error)
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
  }, [id, playerId, router])

  // Обновление статуса при уходе
  useEffect(() => {
    const updatePlayerDisconnected = async () => {
      if (id && playerId) {
        try {
          await GameService.updatePlayerStatus(id as string, playerId, { isConnected: false })
        } catch (error) {
          console.error("Ошибка при обновлении статуса подключения:", error)
        }
      }
    }

    const handleBeforeUnload = () => {
      updatePlayerDisconnected()
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        updatePlayerDisconnected()
      } else if (id && playerId) {
        GameService.updatePlayerStatus(id as string, playerId, { isConnected: true })
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      updatePlayerDisconnected()
    }
  }, [id, playerId])

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      isMountedRef.current = false
      cleanup()
    }
  }, [cleanup])

  const handleOptionSelect = (optionIndex: number) => {
    if (answered || gameSession?.status !== "active") return

    if (currentQuestion?.type === "MULTIPLE_CHOICE" || currentQuestion?.type === "TRUE_FALSE") {
      setSelectedAnswers([optionIndex])
    } else if (currentQuestion?.type === "MULTIPLE_SELECT") {
      setSelectedAnswers((prev) =>
        prev.includes(optionIndex) ? prev.filter((i) => i !== optionIndex) : [...prev, optionIndex],
      )
    }
  }

  const handleSubmitAnswer = async () => {
    if (answered || !currentQuestion || !gameSession || !player) return

    try {
      let answer: string | string[] | number[]
      let isCorrect = false

      switch (currentQuestion.type) {
        case "MULTIPLE_CHOICE":
        case "MULTIPLE_SELECT":
        case "TRUE_FALSE":
          answer = selectedAnswers
          isCorrect = checkAnswer(selectedAnswers, currentQuestion.correctAnswers as number[])
          break
        case "TEXT_INPUT":
          answer = textAnswer.trim()
          isCorrect = checkAnswer(answer, currentQuestion.correctAnswers as string[])
          break
        default:
          answer = []
      }

      const timeSpent = gameSession.questionStartTime ? Date.now() - gameSession.questionStartTime : 0
      const points = isCorrect
        ? calculateScore(true, currentQuestion.points, timeSpent, currentQuestion.timeLimit * 1000)
        : 0

      const playerAnswer: PlayerAnswer = {
        questionId: currentQuestion.id,
        answer,
        timeSpent,
        isCorrect,
        points,
        submittedAt: Date.now(),
      }

      const currentAnswers = player.answers || []
      const newAnswers = [...currentAnswers, playerAnswer]
      const newScore = player.score + points

      await GameService.updatePlayerStatus(gameSession.gameId, player.id, {
        answers: newAnswers,
        score: newScore,
      })

      setAnswered(true)
      console.log("Ответ отправлен:", { answer, isCorrect, points, newScore })
    } catch (error) {
      console.error("Ошибка при отправке ответа:", error)
    }
  }

  const checkAnswer = (userAnswer: any, correctAnswers: any): boolean => {
    if (Array.isArray(userAnswer) && Array.isArray(correctAnswers)) {
      return (
        userAnswer.length === correctAnswers.length && userAnswer.every((answer) => correctAnswers.includes(answer))
      )
    }
    if (typeof userAnswer === "string" && Array.isArray(correctAnswers)) {
      return correctAnswers.some((answer) => answer.toString().toLowerCase() === userAnswer.toString().toLowerCase())
    }
    return userAnswer === correctAnswers
  }

  const getAnswerResult = (): { isCorrect: boolean; correctAnswer: any; pointsEarned: number } | null => {
    if (!currentQuestion || !player) return null

    const answer = player.answers?.find((a) => a.questionId === currentQuestion.id)
    if (!answer) return null

    return {
      isCorrect: answer.isCorrect,
      correctAnswer: currentQuestion.correctAnswers,
      pointsEarned: answer.points,
    }
  }

  const getAnswerDistribution = () => {
    if (!currentQuestion || !gameSession?.players) return []

    const distribution: { option: string; count: number; percentage: number; isCorrect: boolean }[] = []
    const totalAnswered = Object.values(gameSession.players).filter(
      (player) => player.isConnected && player.answers?.some((a) => a.questionId === currentQuestion.id),
    ).length

    if (
      currentQuestion.type === "MULTIPLE_CHOICE" ||
      currentQuestion.type === "MULTIPLE_SELECT" ||
      currentQuestion.type === "TRUE_FALSE"
    ) {
      currentQuestion.options?.forEach((option, index) => {
        const count = Object.values(gameSession.players).filter((player) => {
          const answer = player.answers?.find((a) => a.questionId === currentQuestion.id)
          if (!answer) return false
          if (Array.isArray(answer.answer)) {
            return answer.answer.includes(index)
          }
          return answer.answer === index
        }).length

        const percentage = totalAnswered > 0 ? Math.round((count / totalAnswered) * 100) : 0

        distribution.push({
          option,
          count,
          percentage,
          isCorrect: (currentQuestion.correctAnswers as number[]).includes(index),
        })
      })
    }

    return distribution
  }

  const handleSendMessage = async (message: string) => {
    if (!player || !gameSession) return

    try {
      const chatMessage: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        playerId: player.id,
        playerName: player.nickname,
        playerAvatar: player.avatar,
        message,
        timestamp: Date.now(),
        type: "message",
      }

      await GameService.sendChatMessage(gameSession.gameId, chatMessage)
      console.log("Сообщение отправлено:", message)
    } catch (error) {
      console.error("Ошибка отправки сообщения:", error)
    }
  }

  // Показ сообщения об исключении
  if (kickedInfo) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-md mx-4 border-red-500 border-2 shadow-2xl">
          <CardHeader className="bg-red-50 dark:bg-red-900/20">
            <CardTitle className="flex items-center gap-2 text-red-600 text-center justify-center">
              <AlertTriangle className="w-6 h-6" />
              Исключение из игры
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4 p-6">
            <div className="space-y-3">
              <p className="text-lg font-medium">{kickedInfo.message}</p>
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-1">Причина исключения:</p>
                <p className="text-red-600 dark:text-red-400 font-medium">{kickedInfo.reason}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Вы будете перенаправлены на главную страницу через 8 секунд</p>
            <Button onClick={() => router.push("/")} className="w-full" variant="destructive">
              Вернуться на главную
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Рендеринг состояний
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Загрузка игры...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 min-h-screen bg-background">
        <Card className="border-destructive/50">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-xl font-bold mb-4 text-destructive">{error}</h2>
            <Button onClick={() => router.push("/")} className="mt-4">
              Вернуться на главную
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!game || !gameSession || !player) {
    return (
      <div className="container mx-auto p-4 min-h-screen bg-background">
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8">
            <h2 className="text-xl font-bold mb-4">Игра не найдена</h2>
            <Button onClick={() => router.push("/")}>Вернуться на главную</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Комната ожидания
  if (gameSession.status === "waiting") {
    const connectedPlayers = Object.values(gameSession.players).filter((p) => p.isConnected && !p.isHost)

    return (
  <div className="min-h-screen bg-background">
    <div className="container mx-auto p-4 max-w-6xl">
      {/* Заголовок */}
      <div className="flex justify-between items-center mb-6 gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold">{game.title}</h1>
          <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
            {gameSession.status === "waiting" ? "Ожидание игроков" : "Игра началась"}
          </Badge>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {connectionStatus === "connected" ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
            <Badge variant="outline">Код: {game.code}</Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowChat(!showChat)}
              className="relative"
              aria-label="Чат"
            >
              <MessageCircle className="w-4 h-4" />
              {showChat && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full"></span>
              )}
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Основное содержимое */}
      <div className="relative">
        {/* Комната ожидания */}
        <div className="lg:pr-80"> {/* Оставляем место для чата на десктопе */}
          <WaitingRoom
            gameCode={game.code}
            players={gameSession.players}
            currentPlayerId={player.id}
            isHost={false}
          />
        </div>

        {/* Чат (открывается по клику) */}
        {showChat && (
          <div className="fixed inset-0 z-40 lg:z-auto lg:relative lg:inset-auto">
            {/* Оверлей для мобильных */}
            <div 
              className="fixed inset-0 bg-black/50 lg:hidden"
              onClick={() => setShowChat(false)}
            />
            
            {/* Панель чата */}
            <div className="fixed bottom-0 right-0 top-16 w-full max-w-md bg-card border-l shadow-lg flex flex-col lg:absolute lg:right-4 lg:top-4 lg:bottom-auto lg:h-[calc(100vh-8rem)] lg:w-80 lg:rounded-lg lg:border">
              <GameChat
                gameId={game.id}
                playerId={playerId!}
                playerName={player.nickname}
                playerAvatar={player.avatar}
                isOpen={showChat}
                onClose={() => setShowChat(false)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
)
  }

  // Игра завершена - показываем пьедестал
  if (gameSession.status === "finished") {
    const sortedPlayers = Object.values(gameSession.players)
      .filter((p) => p.isConnected && !p.isHost)
      .sort((a, b) => b.score - a.score)

    if (showPodium) {
      return <PodiumCeremony players={sortedPlayers} currentPlayer={player} onComplete={() => setShowPodium(false)} />
    }

    const playerRank = sortedPlayers.findIndex((p) => p.id === player.id) + 1

    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-4 max-w-6xl">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="flex justify-end mb-4">
                <ThemeToggle />
              </div>
              <Card className="shadow-lg border-2 border-yellow-200 dark:border-yellow-800">
                <CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20">
                  <CardTitle className="text-center">
                    <Trophy className="w-8 h-8 mx-auto mb-2 text-yellow-500 animate-bounce" />
                    Игра завершена!
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 text-center">
                  <div className="bg-primary/10 dark:bg-primary/20 p-4 rounded-lg">
                    <p className="text-lg font-medium">Ваш результат</p>
                    <p className="text-3xl font-bold text-primary animate-pulse">{player.score} баллов</p>
                    <p className="text-sm text-muted-foreground">
                      Место: {playerRank} из {sortedPlayers.length}
                    </p>
                  </div>

                  <Button onClick={() => setShowPodium(true)} className="w-full mb-4 animate-pulse">
                    Посмотреть церемонию награждения
                  </Button>

                  <div className="space-y-2">
                    <p className="font-medium">Топ-3 игроков:</p>
                    {sortedPlayers.slice(0, 3).map((p, index) => (
                      <div
                        key={p.id}
                        className={`flex items-center justify-between p-2 rounded-lg animate-pulse ${
                          p.id === player.id ? "bg-primary/20 dark:bg-primary/30" : "bg-muted dark:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold w-6">{index + 1}</span>
                          {getAvatarDisplay(p.avatar)}
                          <span className="font-medium">{p.nickname}</span>
                        </div>
                        <span className="font-bold">{p.score}</span>
                      </div>
                    ))}
                  </div>

                  <Button onClick={() => router.push("/")} className="w-full">
                    Вернуться на главную
                  </Button>
                </CardContent>
              </Card>
            </div>

            
            {/* Чат */}
            {showChat && (
              <GameChat
                gameId={game.id}
                playerId={playerId!}
                playerName={player.nickname}
                playerAvatar={player.avatar}
                isOpen={showChat}
                onClose={() => setShowChat(false)}
              />
            )}
          </div>
        </div>
      </div>
    )
  }

  // Показ результатов вопроса
  if (gameSession.showResults && currentQuestion) {
    const answerResult = getAnswerResult()
    const answerDistribution = getAnswerDistribution()

    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-4 max-w-6xl">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="flex justify-end mb-4">
                <ThemeToggle />
              </div>
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-center">Результаты вопроса</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Изображение вопроса */}
                  {currentQuestion.imageUrl && (
                    <div className="text-center">
                      <img
                        src={currentQuestion.imageUrl || "/placeholder.svg"}
                        alt="Изображение к вопросу"
                        className="max-w-full h-auto max-h-64 mx-auto rounded-lg shadow-md"
                      />
                    </div>
                  )}

                  <div className="text-xl font-medium p-4 bg-muted dark:bg-muted/50 rounded-lg text-center">
                    {currentQuestion.question}
                  </div>

                  {answerResult && (
                    <div
                      className={`p-4 rounded-lg text-center animate-pulse ${
                        answerResult.isCorrect
                          ? "bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800"
                          : "bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800"
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2 mb-2">
                        {answerResult.isCorrect ? (
                          <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 animate-bounce" />
                        ) : (
                          <XCircle className="w-6 h-6 text-red-600 dark:text-red-400 animate-bounce" />
                        )}
                        <span className="font-bold">{answerResult.isCorrect ? "Правильно!" : "Неправильно"}</span>
                      </div>
                      {answerResult.isCorrect && (
                        <p className="text-sm mb-2 text-green-700 dark:text-green-300 animate-pulse">
                          +{answerResult.pointsEarned} баллов
                        </p>
                      )}
                      {!answerResult.isCorrect && (
                        <p className="text-sm mb-2">
                          Правильный ответ:{" "}
                          {Array.isArray(answerResult.correctAnswer)
                            ? answerResult.correctAnswer
                                .map((index) => currentQuestion.options?.[index] || index)
                                .join(", ")
                            : answerResult.correctAnswer}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Объяснение */}
                  {currentQuestion.explanation && (
                    <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <h4 className="font-medium mb-2">Объяснение:</h4>
                      <p className="text-sm">{currentQuestion.explanation}</p>
                    </div>
                  )}

                  {/* Статистика ответов */}
                  {answerDistribution.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-center">Результаты ответов</h4>
                      {answerDistribution.map((item, index) => (
                        <div
                          key={index}
                          className={`p-3 border rounded-lg ${
                            item.isCorrect
                              ? "bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-600"
                              : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                          }`}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">{item.option}</span>
                            <Badge variant={item.isCorrect ? "default" : "outline"}>
                              {item.isCorrect ? "Правильный" : "Неправильный"}
                            </Badge>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-1000 ${
                                item.isCorrect ? "bg-green-500" : "bg-blue-500"
                              }`}
                              style={{ width: `${item.percentage}%` }}
                            ></div>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {item.count} ответов ({item.percentage}%)
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      Вопрос {gameSession.currentQuestionIndex + 1} из {game.questions.length}
                    </p>
                  </div>

                  <div className="text-center text-muted-foreground">
                    <p>Ожидание следующего вопроса...</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Чат */}
      {showChat && (
        <GameChat
          gameId={game.id}
          playerId={playerId!}
          playerName={player.nickname}
          playerAvatar={player.avatar}
          isOpen={showChat}
          onClose={() => setShowChat(false)}
        />
      )}
          </div>
        </div>
      </div>
    )
  }

  // Показ лидерборда
  if (gameSession.showLeaderboard) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-4 max-w-6xl">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="flex justify-end mb-4">
                <ThemeToggle />
              </div>

              <AnimatedLeaderboard
                players={gameSession.players}
                currentPlayerId={player.id}
                showAnimation={showLeaderboardAnimation}
                previousPlayers={previousGameSession?.players || {}}
              />

              <div className="mt-4 text-center text-muted-foreground">
                <p>Ожидание следующего вопроса...</p>
              </div>
            </div>

            {/* Чат */}
      {showChat && (
        <GameChat
          gameId={game.id}
          playerId={playerId!}
          playerName={player.nickname}
          playerAvatar={player.avatar}
          isOpen={showChat}
          onClose={() => setShowChat(false)}
        />
      )}
          </div>
        </div>
      </div>
    )
  }

  // Пауза
  if (gameSession.status === "paused") {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-4 max-w-6xl">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="flex justify-end mb-4">
                <ThemeToggle />
              </div>
              <Card className="shadow-lg border-orange-200 dark:border-orange-800">
                <CardHeader className="bg-orange-50 dark:bg-orange-900/20">
                  <CardTitle className="flex items-center justify-center gap-2">
                    <Pause className="w-6 h-6 text-orange-500 animate-pulse" />
                    Игра на паузе
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center p-8">
                  <p className="text-muted-foreground text-center mb-4">Ожидание ��ействий ведущего...</p>
                </CardContent>
              </Card>
            </div>

            {/* Чат */}
      {showChat && (
        <GameChat
          gameId={game.id}
          playerId={playerId!}
          playerName={player.nickname}
          playerAvatar={player.avatar}
          isOpen={showChat}
          onClose={() => setShowChat(false)}
        />
      )}
          </div>
        </div>
      </div>
    )
  }

  // Активная игра - отображение вопроса
  if (gameSession.status === "active" && currentQuestion) {
    const progressPercentage = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0

    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-4 max-w-6xl">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="flex justify-between items-center mb-4">
                <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                  Вопрос {gameSession.currentQuestionIndex + 1} из {game.questions.length}
                </Badge>
                <div className="flex items-center gap-2">
                  {connectionStatus === "connected" ? (
                    <Wifi className="w-4 h-4 text-green-500" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-red-500" />
                  )}
                  <ThemeToggle />
                </div>
              </div>

              <Card className="shadow-lg">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Вопрос</CardTitle>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span className={`font-bold ${timeLeft <= 5 ? "text-red-500 animate-pulse" : ""}`}>
                        {Math.ceil(timeLeft)}с
                      </span>
                    </div>
                  </div>
                  <Progress
                    value={progressPercentage}
                    className={`h-3 transition-all duration-100 ${
                      timeLeft <= 5
                        ? "[&>div]:bg-red-500"
                        : timeLeft <= 10
                          ? "[&>div]:bg-yellow-500"
                          : "[&>div]:bg-green-500"
                    }`}
                  />
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Изображение вопроса */}
                  {currentQuestion.imageUrl && (
                    <div className="text-center">
                      <img
                        src={currentQuestion.imageUrl || "/placeholder.svg"}
                        alt="Изображение к вопросу"
                        className="max-w-full h-auto max-h-64 mx-auto rounded-lg shadow-md"
                      />
                    </div>
                  )}

                  <div className="text-xl font-medium text-center p-4 bg-muted dark:bg-muted/50 rounded-lg">
                    {currentQuestion.question}
                  </div>

                  {(currentQuestion.type === "MULTIPLE_CHOICE" || currentQuestion.type === "TRUE_FALSE") && (
                    <div className="space-y-3">
                      {currentQuestion.options?.map((option, index) => (
                        <Button
                          key={index}
                          variant={selectedAnswers.includes(index) ? "default" : "outline"}
                          className="w-full text-left justify-start h-auto p-4 transition-all duration-200 hover:scale-[1.02]"
                          onClick={() => handleOptionSelect(index)}
                          disabled={answered}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center">
                              {selectedAnswers.includes(index) && <CheckCircle className="w-4 h-4" />}
                            </div>
                            <span>{option}</span>
                          </div>
                        </Button>
                      ))}
                    </div>
                  )}

                  {currentQuestion.type === "MULTIPLE_SELECT" && (
                    <div className="space-y-3">
                      {currentQuestion.options?.map((option, index) => (
                        <Button
                          key={index}
                          variant={selectedAnswers.includes(index) ? "default" : "outline"}
                          className="w-full text-left justify-start h-auto p-4 transition-all duration-200 hover:scale-[1.02]"
                          onClick={() => handleOptionSelect(index)}
                          disabled={answered}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded border-2 flex items-center justify-center">
                              {selectedAnswers.includes(index) && <CheckCircle className="w-4 h-4" />}
                            </div>
                            <span>{option}</span>
                          </div>
                        </Button>
                      ))}
                    </div>
                  )}

                  {currentQuestion.type === "TEXT_INPUT" && (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={textAnswer}
                        onChange={(e) => setTextAnswer(e.target.value)}
                        placeholder="Введите ваш ответ"
                        className="w-full p-4 border rounded-lg text-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background"
                        disabled={answered}
                        onKeyPress={(e) => e.key === "Enter" && handleSubmitAnswer()}
                      />
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                      Баллов за правильный ответ: {currentQuestion.points}
                    </div>

                    {!answered && timeLeft > 0 && (
                      <Button onClick={handleSubmitAnswer} size="lg" className="px-8">
                        Ответить
                      </Button>
                    )}

                    {answered && (
                      <div className="text-green-600 dark:text-green-400 font-medium animate-pulse">
                        Ответ отправлен!
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Чат */}
      {showChat && (
        <GameChat
          gameId={game.id}
          playerId={playerId!}
          playerName={player.nickname}
          playerAvatar={player.avatar}
          isOpen={showChat}
          onClose={() => setShowChat(false)}
        />
      )}
          </div>
        </div>
      </div>
    )
  }

  // Неизвестное состояние
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 max-w-6xl">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="flex justify-end mb-4">
              <ThemeToggle />
            </div>
            <Card className="shadow-lg">
              <CardContent className="flex flex-col items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <h2 className="text-xl font-bold mb-4">Ожидание...</h2>
                <p className="text-muted-foreground text-center">Ожидание действий ведущего...</p>
              </CardContent>
            </Card>
          </div>

          {/* Чат */}
      {showChat && (
        <GameChat
          gameId={game.id}
          playerId={playerId!}
          playerName={player.nickname}
          playerAvatar={player.avatar}
          isOpen={showChat}
          onClose={() => setShowChat(false)}
        />
      )}
        </div>
      </div>
    </div>
  )
}
