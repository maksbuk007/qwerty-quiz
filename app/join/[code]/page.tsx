"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, AlertTriangle } from "lucide-react"
import AvatarSelector from "@/components/ui/AvatarSelector"
import { GameService } from "@/lib/firebase/gameService"
import { toast } from "@/hooks/use-toast"

export default function JoinGamePage() {
  const params = useParams()
  const router = useRouter()
  const gameCode = params.code as string

  const [loading, setLoading] = useState(false)
  const [gameLoading, setGameLoading] = useState(true)
  const [nickname, setNickname] = useState("")
  const [selectedAvatar, setSelectedAvatar] = useState("cat")
  const [error, setError] = useState("")
  const [gameExists, setGameExists] = useState(false)
  const [gameTitle, setGameTitle] = useState("")

  // Проверяем существование игры при загрузке
  useEffect(() => {
    const checkGame = async () => {
      try {
        setGameLoading(true)
        setError("")

        if (!gameCode) {
          setError("Код игры не указан")
          return
        }

        console.log("Проверяем игру с кодом:", gameCode)
        const game = await GameService.findGameByCode(gameCode)

        if (game) {
          setGameExists(true)
          setGameTitle(game.title)
          console.log("Игра найдена:", game.title)
        } else {
          setError("Игра с таким кодом не найдена")
        }
      } catch (error) {
        console.error("Ошибка при проверке игры:", error)
        setError("Ошибка при проверке игры")
      } finally {
        setGameLoading(false)
      }
    }

    checkGame()
  }, [gameCode])

  const handleJoinGame = async () => {
    if (!nickname.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите ваше имя",
        variant: "destructive",
      })
      return
    }

    if (nickname.trim().length < 2) {
      toast({
        title: "Ошибка",
        description: "Имя должно содержать минимум 2 символа",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    setError("")

    try {
      console.log("Присоединяемся к игре:", gameCode)

      // Сначала находим игру по коду
      const game = await GameService.findGameByCode(gameCode)
      if (!game) {
        throw new Error("Игра не найдена")
      }

      // Создаем объект игрока
      const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const player = {
        id: playerId,
        nickname: nickname.trim(),
        avatar: selectedAvatar,
        score: 0,
        answers: [],
        joinedAt: Date.now(),
        isConnected: true,
        lastActivity: Date.now(),
        warnings: 0,
        isMuted: false,
      }

      // Присоединяемся к игре
      await GameService.joinGame(game.id, player)

      console.log("Результат присоединения:", { gameId: game.id, playerId })

      toast({
        title: "Успешно присоединились!",
        description: "Переход в игру...",
      })

      // Переходим на страницу игры с параметрами
      const playUrl = `/game/${game.id}?playerId=${playerId}&nickname=${encodeURIComponent(nickname.trim())}`
      console.log("Переходим на:", playUrl)

      // Небольшая задержка для показа уведомления
      setTimeout(() => {
        router.push(playUrl)
      }, 1000)
    } catch (error: any) {
      console.error("Ошибка присоединения:", error)
      setError(error.message || "Ошибка при присоединении к игре")
      toast({
        title: "Ошибка присоединения",
        description: error.message || "Не удалось присоединиться к игре",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading && nickname.trim()) {
      handleJoinGame()
    }
  }

  if (gameLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p className="text-muted-foreground">Проверяем игру...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!gameExists || error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
            <h2 className="text-xl font-bold mb-2 text-center">{error || "Игра не найдена"}</h2>
            <p className="text-muted-foreground text-center mb-4">
              Проверьте правильность кода игры или обратитесь к организатору
            </p>
            <Button onClick={() => router.push("/")} variant="outline">
              На главную
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Присоединиться к игре</CardTitle>
          <div className="space-y-2">
            <p className="text-muted-foreground">{gameTitle}</p>
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary font-mono text-sm">
              Код: {gameCode}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="nickname" className="text-sm font-medium">
              Ваше имя
            </label>
            <Input
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Введите ваше имя"
              maxLength={20}
              onKeyPress={handleKeyPress}
              disabled={loading}
              className="text-center"
            />
            <p className="text-xs text-muted-foreground text-center">От 2 до 20 символов</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Выберите аватар</label>
            <AvatarSelector selectedAvatar={selectedAvatar} onAvatarSelect={setSelectedAvatar} disabled={loading} />
          </div>

          <Button onClick={handleJoinGame} disabled={!nickname.trim() || loading} className="w-full" size="lg">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Присоединяемся...
              </>
            ) : (
              "Присоединиться к игре"
            )}
          </Button>

          <div className="text-center">
            <Button variant="ghost" onClick={() => router.push("/")} disabled={loading}>
              Отмена
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
