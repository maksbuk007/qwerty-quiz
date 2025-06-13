"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useAuth } from "@/contexts/AuthContext"
import { collection, query, where, getDocs, doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import type { Game } from "@/types/game"
import { User, Trophy, Gamepad2, Calendar, Star, LogOut, Loader2, TrendingUp } from "lucide-react"
import AchievementsList from "@/components/achievements/AchievementsList"

interface UserStats {
  gamesCreated: number
  gamesPlayed: number
  totalScore: number
  averageScore: number
  bestScore: number
  lastPlayed?: number
}

interface UserProfileProps {
  isOpen: boolean
  onClose: () => void
}

export default function UserProfile({ isOpen, onClose }: UserProfileProps) {
  const { user, logout, isAdmin } = useAuth()
  const [stats, setStats] = useState<UserStats>({
    gamesCreated: 0,
    gamesPlayed: 0,
    totalScore: 0,
    averageScore: 0,
    bestScore: 0,
  })
  const [recentGames, setRecentGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !isOpen) return

    const fetchUserStats = async () => {
      try {
        setLoading(true)

        // Получаем созданные игры
        const createdGamesQuery = query(collection(db, "games"), where("createdBy", "==", user.uid))
        const createdGamesSnapshot = await getDocs(createdGamesQuery)
        const createdGames = createdGamesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Game)

        // Получаем статистику пользователя из базы данных
        const userStatsDoc = await getDoc(doc(db, "user_stats", user.uid))
        let userStats: UserStats = {
          gamesCreated: createdGames.length,
          gamesPlayed: 0,
          totalScore: 0,
          averageScore: 0,
          bestScore: 0,
        }

        if (userStatsDoc.exists()) {
          const data = userStatsDoc.data()
          userStats = {
            gamesCreated: createdGames.length,
            gamesPlayed: data.gamesPlayed || 0,
            totalScore: data.totalScore || 0,
            averageScore: data.gamesPlayed > 0 ? Math.round(data.totalScore / data.gamesPlayed) : 0,
            bestScore: data.bestScore || 0,
            lastPlayed: data.lastPlayed,
          }
        } else {
          // Создаем документ статистики, если его нет
          await setDoc(doc(db, "user_stats", user.uid), {
            gamesPlayed: 0,
            totalScore: 0,
            bestScore: 0,
            lastPlayed: null,
          })
        }

        setStats(userStats)
        setRecentGames(createdGames.slice(0, 5)) // Показываем последние 5 созданных игр
      } catch (error) {
        console.error("Ошибка при загрузке статистики:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserStats()
  }, [user, isOpen])

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "Никогда"
    return new Date(timestamp).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  if (!user) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.photoURL || undefined} />
              <AvatarFallback>
                <User className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold">{user.displayName || "Пользователь"}</h2>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </DialogTitle>
          <DialogDescription>
            Ваш профиль и статистика в MaxQuiz
            {isAdmin && (
              <Badge variant="default" className="ml-2">
                Администратор
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-muted-foreground">Загрузка статистики...</p>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="stats" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="stats">Статистика</TabsTrigger>
              <TabsTrigger value="achievements">Достижения</TabsTrigger>
              <TabsTrigger value="games">Мои игры</TabsTrigger>
            </TabsList>

            <TabsContent value="stats" className="space-y-6">
              {/* Основная статистика */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Создано игр</CardTitle>
                    <Gamepad2 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.gamesCreated}</div>
                    <p className="text-xs text-muted-foreground">{isAdmin ? "Как администратор" : "Всего созданных"}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Игр сыграно</CardTitle>
                    <Trophy className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.gamesPlayed}</div>
                    <p className="text-xs text-muted-foreground">Как участник</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Лучший результат</CardTitle>
                    <Star className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.bestScore}</div>
                    <p className="text-xs text-muted-foreground">Максимальный счет</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Средний счет</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.averageScore}</div>
                    <p className="text-xs text-muted-foreground">За игру</p>
                  </CardContent>
                </Card>
              </div>

              {/* Дополнительная информация */}
              <Card>
                <CardHeader>
                  <CardTitle>Информация об аккаунте</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Email</p>
                      <p className="text-sm">{user.email}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Имя</p>
                      <p className="text-sm">{user.displayName || "Не указано"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Последняя игра</p>
                      <p className="text-sm">{formatDate(stats.lastPlayed)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Роль</p>
                      <p className="text-sm">{isAdmin ? "Администратор" : "Пользователь"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="achievements" className="space-y-6">
              <AchievementsList userId={user.uid} />
            </TabsContent>

            <TabsContent value="games" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Созданные игры</CardTitle>
                  <CardDescription>
                    {stats.gamesCreated === 0
                      ? "Вы еще не создали ни одной игры"
                      : `Всего создано игр: ${stats.gamesCreated}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {recentGames.length === 0 ? (
                    <div className="text-center py-8">
                      <Gamepad2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Нет созданных игр</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {recentGames.map((game) => (
                        <div
                          key={game.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1">
                            <h3 className="font-medium">{game.title}</h3>
                            {game.description && (
                              <p className="text-sm text-muted-foreground line-clamp-1">{game.description}</p>
                            )}
                            <div className="flex items-center gap-4 mt-2">
                              <Badge variant="outline">{game.questions?.length || 0} вопросов</Badge>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Calendar className="w-4 h-4" />
                                {formatDate(game.createdAt)}
                              </div>
                            </div>
                          </div>
                          {game.categories && game.categories.length > 0 && (
                            <div className="flex flex-wrap gap-1 ml-4">
                              {game.categories.slice(0, 2).map((category) => (
                                <Badge key={category} variant="secondary" className="text-xs">
                                  {category}
                                </Badge>
                              ))}
                              {game.categories.length > 2 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{game.categories.length - 2}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Закрыть
          </Button>
          <Button variant="destructive" onClick={logout}>
            <LogOut className="w-4 h-4 mr-2" />
            Выйти
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
