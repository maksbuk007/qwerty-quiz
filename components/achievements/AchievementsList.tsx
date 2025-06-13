"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { AchievementService } from "@/lib/services/achievementService"
import type { Achievement, UserAchievements } from "@/types/achievements"
import { Trophy, Lock, Search, Star, Filter, Award, Zap, Target, Users, Flame } from "lucide-react"

interface AchievementsListProps {
  userId: string
}

export default function AchievementsList({ userId }: AchievementsListProps) {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [userAchievements, setUserAchievements] = useState<UserAchievements | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedRarity, setSelectedRarity] = useState<string>("all")

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        setLoading(true)
        const [allAchievements, userAchievementsData] = await Promise.all([
          AchievementService.getAllAchievements(),
          AchievementService.getUserAchievements(userId),
        ])

        setAchievements(allAchievements)
        setUserAchievements(userAchievementsData)
      } catch (error) {
        console.error("Ошибка загрузки достижений:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAchievements()
  }, [userId])

  const unlockedAchievementIds = new Set(userAchievements?.achievements.map((a) => a.achievementId) || [])

  const filteredAchievements = achievements.filter((achievement) => {
    // Фильтр по поиску
    if (
      searchTerm &&
      !achievement.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !achievement.description.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false
    }

    // Фильтр по категории
    if (selectedCategory !== "all" && achievement.category !== selectedCategory) {
      return false
    }

    // Фильтр по редкости
    if (selectedRarity !== "all" && achievement.rarity !== selectedRarity) {
      return false
    }

    // Скрываем секретные достижения, если они не разблокированы
    if (achievement.isSecret && !unlockedAchievementIds.has(achievement.id)) {
      return false
    }

    return true
  })

  const getAchievementProgress = (achievement: Achievement): number => {
    if (unlockedAchievementIds.has(achievement.id)) return 100

    // Здесь можно добавить логику для отображения прогресса
    // Пока возвращаем 0 для неразблокированных
    return 0
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "games":
        return <Trophy className="w-4 h-4" />
      case "score":
        return <Star className="w-4 h-4" />
      case "participation":
        return <Users className="w-4 h-4" />
      case "speed":
        return <Zap className="w-4 h-4" />
      case "accuracy":
        return <Target className="w-4 h-4" />
      case "social":
        return <Users className="w-4 h-4" />
      case "streak":
        return <Flame className="w-4 h-4" />
      case "special":
        return <Award className="w-4 h-4" />
      default:
        return <Trophy className="w-4 h-4" />
    }
  }

  const getCategoryName = (category: string): string => {
    switch (category) {
      case "games":
        return "Создание игр"
      case "score":
        return "Очки"
      case "participation":
        return "Участие"
      case "speed":
        return "Скорость"
      case "accuracy":
        return "Точность"
      case "social":
        return "Социальные"
      case "streak":
        return "Серии"
      case "special":
        return "Особые"
      default:
        return "Неизвестно"
    }
  }

  const categories = [...new Set(achievements.map((a) => a.category))]
  const rarities = [...new Set(achievements.map((a) => a.rarity))]

  const unlockedCount = achievements.filter((a) => unlockedAchievementIds.has(a.id)).length
  const totalPoints = userAchievements?.totalPoints || 0

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Загрузка достижений...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Статистика достижений */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Разблокировано</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unlockedCount}</div>
            <p className="text-xs text-muted-foreground">из {achievements.length} достижений</p>
            <Progress value={(unlockedCount / achievements.length) * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Очки достижений</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPoints}</div>
            <p className="text-xs text-muted-foreground">всего заработано</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Редкие достижения</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                achievements.filter(
                  (a) =>
                    unlockedAchievementIds.has(a.id) &&
                    (a.rarity === "epic" || a.rarity === "legendary" || a.rarity === "mythic"),
                ).length
              }
            </div>
            <p className="text-xs text-muted-foreground">эпических и выше</p>
          </CardContent>
        </Card>
      </div>

      {/* Фильтры */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Фильтры
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Поиск достижений..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border rounded-md bg-background"
              >
                <option value="all">Все категории</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {getCategoryName(category)}
                  </option>
                ))}
              </select>
              <select
                value={selectedRarity}
                onChange={(e) => setSelectedRarity(e.target.value)}
                className="px-3 py-2 border rounded-md bg-background"
              >
                <option value="all">Все редкости</option>
                {rarities.map((rarity) => (
                  <option key={rarity} value={rarity}>
                    {AchievementService.getRarityName(rarity)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Список достижений */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">Все ({filteredAchievements.length})</TabsTrigger>
          <TabsTrigger value="unlocked">
            Разблокированные ({filteredAchievements.filter((a) => unlockedAchievementIds.has(a.id)).length})
          </TabsTrigger>
          <TabsTrigger value="locked">
            Заблокированные ({filteredAchievements.filter((a) => !unlockedAchievementIds.has(a.id)).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <AchievementGrid
            achievements={filteredAchievements}
            unlockedIds={unlockedAchievementIds}
            getProgress={getAchievementProgress}
            getCategoryIcon={getCategoryIcon}
          />
        </TabsContent>

        <TabsContent value="unlocked" className="space-y-4">
          <AchievementGrid
            achievements={filteredAchievements.filter((a) => unlockedAchievementIds.has(a.id))}
            unlockedIds={unlockedAchievementIds}
            getProgress={getAchievementProgress}
            getCategoryIcon={getCategoryIcon}
          />
        </TabsContent>

        <TabsContent value="locked" className="space-y-4">
          <AchievementGrid
            achievements={filteredAchievements.filter((a) => !unlockedAchievementIds.has(a.id))}
            unlockedIds={unlockedAchievementIds}
            getProgress={getAchievementProgress}
            getCategoryIcon={getCategoryIcon}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface AchievementGridProps {
  achievements: Achievement[]
  unlockedIds: Set<string>
  getProgress: (achievement: Achievement) => number
  getCategoryIcon: (category: string) => React.ReactNode
}

function AchievementGrid({ achievements, unlockedIds, getProgress, getCategoryIcon }: AchievementGridProps) {
  if (achievements.length === 0) {
    return (
      <div className="text-center py-12">
        <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Достижения не найдены</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {achievements.map((achievement) => {
        const isUnlocked = unlockedIds.has(achievement.id)
        const progress = getProgress(achievement)

        return (
          <Card
            key={achievement.id}
            className={`relative transition-all duration-200 hover:shadow-md ${
              isUnlocked ? "border-green-200 bg-green-50/50" : "border-gray-200"
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`text-2xl ${isUnlocked ? "" : "grayscale opacity-50"}`}>{achievement.icon}</div>
                  <div className="flex-1">
                    <CardTitle className={`text-base ${isUnlocked ? "" : "text-muted-foreground"}`}>
                      {achievement.title}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      {getCategoryIcon(achievement.category)}
                      <Badge
                        variant="outline"
                        className={`text-xs ${AchievementService.getRarityColor(achievement.rarity)}`}
                      >
                        {AchievementService.getRarityName(achievement.rarity)}
                      </Badge>
                    </div>
                  </div>
                </div>
                {isUnlocked ? (
                  <Trophy className="w-5 h-5 text-green-600" />
                ) : (
                  <Lock className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <CardDescription className={`text-sm mb-3 ${isUnlocked ? "" : "text-muted-foreground"}`}>
                {achievement.description}
              </CardDescription>

              {!isUnlocked && progress > 0 && (
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Прогресс</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Очки:</span>
                <Badge variant="secondary">{achievement.points}</Badge>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
