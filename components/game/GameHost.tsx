"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ref, onValue, update, set, serverTimestamp } from "firebase/database"
import { realtimeDb } from "@/lib/firebase/config"
import type { Game, GameSession, Player, Question } from "@/types/game"
import { AVATARS } from "@/components/ui/AvatarSelector"
import { Play, Pause, SkipForward, Users, Trophy, Clock, CheckCircle, Wifi, WifiOff } from "lucide-react"

interface GameHostProps {
  game: Game
  onGameEnd?: () => void
}

export default function GameHost({ game, onGameEnd }: GameHostProps) {
  const [gameSession, setGameSession] = useState<GameSession | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected">("connected")
  const [showResults, setShowResults] = useState(false)
  const [activeTab, setActiveTab] = useState("players")

  // Безопасная нормализация данных
  const normalizeSessionData = useCallback(
    (sessionData: any): GameSession => {
      const players: Record<string, Player> = {}

      if (sessionData?.players && typeof sessionData.players === "object") {
        Object.entries(sessionData.players).forEach(([playerId, playerData]: [string, any]) => {
          if (playerData && typeof playerData === "object") {
            players[playerId] = {
              id: playerData.id || playerId,
              nickname: playerData.nickname || "",
              avatar: playerData.avatar || "",
              score: typeof playerData.score === "number" ? playerData.score : 0,
              answers: Array.isArray(playerData.answers) ? playerData.answers : [],
              joinedAt: playerData.joinedAt || Date.now(),
              isConnected: Boolean(playerData.isConnected),
              lastActivity: playerData.lastActivity || Date.now(),
              warnings: typeof playerData.warnings === "number" ? playerData.warnings : 0,
              isMuted: Boolean(playerData.isMuted),
            }
          }
        })
      }

      return {
        gameId: sessionData?.gameId || game.id,
        code: sessionData?.code || game.code,
        status: sessionData?.status || "waiting",
        players,
        currentQuestionIndex:
          typeof sessionData?.currentQuestionIndex === "number" ? sessionData.currentQuestionIndex : 0,
        leaderboard: Array.isArray(sessionData?.leaderboard) ? sessionData.leaderboard : [],
        hostId: sessionData?.hostId || game.hostId,
        questionStartTime: sessionData?.questionStartTime,
        questionEndTime: sessionData?.questionEndTime,
        showResults: Boolean(sessionData?.showResults),
        showLeaderboard: Boolean(sessionData?.showLeaderboard),
        chat: sessionData?.chat && typeof sessionData.chat === "object" ? sessionData.chat : {},
        notifications: Array.isArray(sessionData?.notifications) ? sessionData.notifications : [],
      }
    },
    [game.id, game.code, game.hostId],
  )

  const getAvatarDisplay = useCallback((avatarId: string) => {
    const avatar = AVATARS.find((a) => a.id === avatarId)
    if (!avatar) return <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">?</div>

    return (
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${avatar.color}`}>
        {avatar.emoji}
      </div>
    )
  }, [])

  // Подписка на обновления сессии
  useEffect(() => {
    const sessionRef = ref(realtimeDb, `sessions/${game.id}`)

    const unsubscribe = onValue(
      sessionRef,
      (snapshot) => {
        try {
          const sessionData = snapshot.val()
          if (sessionData) {
            const normalizedSession = normalizeSessionData(sessionData)
            setGameSession(normalizedSession)
            setConnectionStatus("connected")

            // Обновляем текущий вопрос
            if (game.questions && game.questions[normalizedSession.currentQuestionIndex]) {
              setCurrentQuestion(game.questions[normalizedSession.currentQuestionIndex])
            }
          } else {
            // Создаем новую сессию если её нет
            const newSession = {
              gameId: game.id,
              code: game.code,
              status: "waiting",
              players: {},
              currentQuestionIndex: 0,
              leaderboard: [],
              hostId: game.hostId,
              chat: {},
              notifications: [],
              createdAt: serverTimestamp(),
            }
            set(sessionRef, newSession)
          }
        } catch (error) {
          console.error("Ошибка обработки данных сессии:", error)
          setConnectionStatus("disconnected")
        }
      },
      (error) => {
        console.error("Ошибка подключения к сессии:", error)
        setConnectionStatus("disconnected")
      },
    )

    return () => unsubscribe()
  }, [game, normalizeSessionData])

  // Таймер для вопросов
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false)
            handleTimeUp()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isTimerRunning, timeLeft])

  const startGame = async () => {
    if (!gameSession) return

    try {
      const sessionRef = ref(realtimeDb, `sessions/${game.id}`)
      await update(sessionRef, {
        status: "active",
        currentQuestionIndex: 0,
        questionStartTime: serverTimestamp(),
        showResults: false,
        showLeaderboard: false,
      })

      if (game.questions && game.questions[0]) {
        setCurrentQuestion(game.questions[0])
        setTimeLeft(game.questions[0].timeLimit)
        setIsTimerRunning(true)
      }
    } catch (error) {
      console.error("Ошибка запуска игры:", error)
    }
  }

  const nextQuestion = async () => {
    if (!gameSession || !game.questions) return

    const nextIndex = gameSession.currentQuestionIndex + 1

    if (nextIndex >= game.questions.length) {
      // Игра закончена
      await endGame()
      return
    }

    try {
      const sessionRef = ref(realtimeDb, `sessions/${game.id}`)
      await update(sessionRef, {
        currentQuestionIndex: nextIndex,
        questionStartTime: serverTimestamp(),
        showResults: false,
        showLeaderboard: false,
      })

      setCurrentQuestion(game.questions[nextIndex])
      setTimeLeft(game.questions[nextIndex].timeLimit)
      setIsTimerRunning(true)
      setShowResults(false)
    } catch (error) {
      console.error("Ошибка перехода к следующему вопросу:", error)
    }
  }

  const handleTimeUp = async () => {
    if (!gameSession) return

    try {
      const sessionRef = ref(realtimeDb, `sessions/${game.id}`)
      await update(sessionRef, {
        showResults: true,
        questionEndTime: serverTimestamp(),
      })
      setShowResults(true)
    } catch (error) {
      console.error("Ошибка завершения времени:", error)
    }
  }

  const endGame = async () => {
    if (!gameSession) return

    try {
      const sessionRef = ref(realtimeDb, `sessions/${game.id}`)
      await update(sessionRef, {
        status: "finished",
        showLeaderboard: true,
      })

      if (onGameEnd) {
        onGameEnd()
      }
    } catch (error) {
      console.error("Ошибка завершения игры:", error)
    }
  }

  const pauseGame = async () => {
    if (!gameSession) return

    try {
      const sessionRef = ref(realtimeDb, `sessions/${game.id}`)
      await update(sessionRef, {
        status: "paused",
      })
      setIsTimerRunning(false)
    } catch (error) {
      console.error("Ошибка паузы игры:", error)
    }
  }

  const resumeGame = async () => {
    if (!gameSession) return

    try {
      const sessionRef = ref(realtimeDb, `sessions/${game.id}`)
      await update(sessionRef, {
        status: "active",
        questionStartTime: serverTimestamp(),
      })
      setIsTimerRunning(true)
    } catch (error) {
      console.error("Ошибка возобновления игры:", error)
    }
  }

  if (!gameSession) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  const connectedPlayers = Object.values(gameSession.players).filter((p) => p.isConnected)
  const totalPlayers = Object.values(gameSession.players).length
  const progressPercentage = currentQuestion ? (timeLeft / currentQuestion.timeLimit) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Статус подключения */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {connectionStatus === "connected" ? (
            <Wifi className="w-5 h-5 text-green-500" />
          ) : (
            <WifiOff className="w-5 h-5 text-red-500" />
          )}
          <span className="text-sm text-muted-foreground">
            {connectionStatus === "connected" ? "Подключено" : "Нет подключения"}
          </span>
        </div>
        <Badge variant="outline">Код игры: {game.code}</Badge>
      </div>

      {/* Основная информация */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{game.title}</CardTitle>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>{connectedPlayers.length} игроков</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {gameSession.status === "waiting" && (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">Ожидание игроков...</p>
              <Button onClick={startGame} disabled={connectedPlayers.length === 0}>
                <Play className="w-4 h-4 mr-2" />
                Начать игру
              </Button>
            </div>
          )}

          {gameSession.status === "active" && currentQuestion && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">
                  Вопрос {gameSession.currentQuestionIndex + 1} из {game.questions.length}
                </h3>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span className="font-mono">{timeLeft}с</span>
                </div>
              </div>

              <Progress value={progressPercentage} className="w-full" />

              <div className="bg-muted p-4 rounded-lg">
                <p className="font-medium">{currentQuestion.question}</p>
                {currentQuestion.options && (
                  <div className="mt-2 space-y-1">
                    {currentQuestion.options.map((option, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{index + 1}.</span>
                        <span className="text-sm">{option}</span>
                        {currentQuestion.correctAnswers.includes(index) && showResults && (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button onClick={pauseGame} variant="outline">
                  <Pause className="w-4 h-4 mr-2" />
                  Пауза
                </Button>
                <Button onClick={nextQuestion} disabled={!showResults}>
                  <SkipForward className="w-4 h-4 mr-2" />
                  Следующий вопрос
                </Button>
                <Button onClick={endGame} variant="destructive">
                  Завершить игру
                </Button>
              </div>
            </div>
          )}

          {gameSession.status === "paused" && (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">Игра на паузе</p>
              <Button onClick={resumeGame}>
                <Play className="w-4 h-4 mr-2" />
                Продолжить
              </Button>
            </div>
          )}

          {gameSession.status === "finished" && (
            <div className="text-center space-y-4">
              <Trophy className="w-12 h-12 mx-auto text-yellow-500" />
              <p className="text-lg font-semibold">Игра завершена!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Вкладки с информацией */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="players">Игроки</TabsTrigger>
          <TabsTrigger value="stats">Статистика</TabsTrigger>
          <TabsTrigger value="settings">Настройки</TabsTrigger>
        </TabsList>

        <TabsContent value="players">
          <Card>
            <CardHeader>
              <CardTitle>Игроки ({connectedPlayers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {connectedPlayers.map((player) => (
                    <div key={player.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-3">
                        {getAvatarDisplay(player.avatar)}
                        <div>
                          <div className="font-medium">{player.nickname}</div>
                          <div className="text-sm text-muted-foreground">
                            Счет: {player.score} • Ответов: {player.answers.length}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {player.isConnected ? (
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                        ) : (
                          <div className="w-2 h-2 bg-red-500 rounded-full" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <Card>
            <CardHeader>
              <CardTitle>Статистика игры</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{totalPlayers}</div>
                    <div className="text-sm text-muted-foreground">Всего игроков</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{connectedPlayers.length}</div>
                    <div className="text-sm text-muted-foreground">Онлайн</div>
                  </div>
                </div>

                {currentQuestion && (
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {gameSession.currentQuestionIndex + 1} / {game.questions.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Прогресс вопросов</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Настройки игры</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Показывать лидерборд</span>
                  <Badge variant={game.settings.showLeaderboard ? "default" : "secondary"}>
                    {game.settings.showLeaderboard ? "Включено" : "Отключено"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Показывать правильные ответы</span>
                  <Badge variant={game.settings.showCorrectAnswers ? "default" : "secondary"}>
                    {game.settings.showCorrectAnswers ? "Включено" : "Отключено"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Позднее присоединение</span>
                  <Badge variant={game.settings.allowLateJoin ? "default" : "secondary"}>
                    {game.settings.allowLateJoin ? "Разрешено" : "Запрещено"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
