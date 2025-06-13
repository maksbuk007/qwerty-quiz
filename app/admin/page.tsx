"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/contexts/AuthContext"
import ThemeToggle from "@/components/ui/ThemeToggle"
import UserProfile from "@/components/ui/UserProfile"
import { collection, getDocs, query, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import type { Game } from "@/types/game"
import {
  Plus,
  Search,
  Edit,
  Play,
  Tag,
  Clock,
  Calendar,
  SortAsc,
  Loader2,
  ArrowLeft,
  Settings,
  BarChart3,
} from "lucide-react"
import AnalyticsDashboard from "@/components/analytics/AnalyticsDashboard"

export default function AdminPage() {
  const router = useRouter()
  const { user, isAdmin, loading: authLoading } = useAuth()
  const [profileOpen, setProfileOpen] = useState(false)

  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("date-desc")
  const [activeTab, setActiveTab] = useState("all")

  // Получаем все уникальные категории из игр
  const categories = useMemo(() => {
    const allCategories = new Set<string>()
    games.forEach((game) => {
      if (game.categories && Array.isArray(game.categories)) {
        game.categories.forEach((category) => allCategories.add(category))
      }
    })
    return Array.from(allCategories).sort()
  }, [games])

  // Фильтрация и сортировка игр
  const filteredGames = useMemo(() => {
    let result = [...games]

    // Фильтрация по вкладке
    if (activeTab === "my" && user) {
      result = result.filter((game) => game.createdBy === user.uid)
    }

    // Фильтрация по поиску
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (game) =>
          game.title.toLowerCase().includes(query) ||
          (game.description && game.description.toLowerCase().includes(query)) ||
          (game.categories && game.categories.some((cat) => cat.toLowerCase().includes(query))),
      )
    }

    // Фильтрация по категории
    if (selectedCategory !== "all") {
      result = result.filter((game) => game.categories && game.categories.includes(selectedCategory))
    }

    // Сортировка
    switch (sortBy) {
      case "title-asc":
        result.sort((a, b) => a.title.localeCompare(b.title))
        break
      case "title-desc":
        result.sort((a, b) => b.title.localeCompare(a.title))
        break
      case "date-asc":
        result.sort((a, b) => a.createdAt - b.createdAt)
        break
      case "date-desc":
        result.sort((a, b) => b.createdAt - a.createdAt)
        break
      case "questions-asc":
        result.sort((a, b) => (a.questions?.length || 0) - (b.questions?.length || 0))
        break
      case "questions-desc":
        result.sort((a, b) => (b.questions?.length || 0) - (a.questions?.length || 0))
        break
    }

    return result
  }, [games, searchQuery, selectedCategory, sortBy, activeTab, user])

  // Проверка доступа
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push("/")
    }
  }, [authLoading, isAdmin, router])

  // Загрузка игр
  useEffect(() => {
    if (!user || !isAdmin) return

    const fetchGames = async () => {
      try {
        setLoading(true)
        const gamesQuery = query(collection(db, "games"), orderBy("createdAt", "desc"))
        const querySnapshot = await getDocs(gamesQuery)

        const gamesData: Game[] = []
        querySnapshot.forEach((doc) => {
          gamesData.push({ id: doc.id, ...doc.data() } as Game)
        })

        setGames(gamesData)
      } catch (error) {
        console.error("Ошибка при загрузке игр:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchGames()
  }, [user, isAdmin])

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Проверка авторизации...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Button variant="outline" onClick={() => router.push("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            На главную
          </Button>
          <h1 className="text-2xl font-bold">Панель администратора</h1>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Button variant="outline" size="sm" onClick={() => setProfileOpen(true)}>
            <Settings className="w-4 h-4 mr-2" />
            Профиль
          </Button>
        </div>
      </div>

      {/* Кнопка создания новой игры */}
      <div className="flex justify-end">
        <Button onClick={() => router.push("/admin/create")} className="gap-2">
          <Plus className="w-4 h-4" />
          Создать новую игру
        </Button>
      </div>

      {/* Фильтры и поиск */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Поиск игр..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          <Tag className="text-muted-foreground w-4 h-4" />
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Выберите категорию" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все категории</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <SortAsc className="text-muted-foreground w-4 h-4" />
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Сортировка" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Сначала новые</SelectItem>
              <SelectItem value="date-asc">Сначала старые</SelectItem>
              <SelectItem value="title-asc">По названию (А-Я)</SelectItem>
              <SelectItem value="title-desc">По названию (Я-А)</SelectItem>
              <SelectItem value="questions-desc">Больше вопросов</SelectItem>
              <SelectItem value="questions-asc">Меньше вопросов</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Вкладки и список игр */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">Все игры</TabsTrigger>
          <TabsTrigger value="my">Мои игры</TabsTrigger>
          <TabsTrigger value="analytics">Аналитика</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-muted-foreground">Загрузка игр...</p>
              </div>
            </div>
          ) : filteredGames.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                {searchQuery || selectedCategory !== "all" ? "Игры не найдены" : "Пока нет игр"}
              </p>
              <Button onClick={() => router.push("/admin/create")}>
                <Plus className="w-4 h-4 mr-2" />
                Создать первую игру
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGames.map((game) => (
                <Card key={game.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start gap-2">
                      <CardTitle className="text-lg line-clamp-2">{game.title}</CardTitle>
                      <Badge variant="outline" className="shrink-0">
                        {game.questions?.length || 0} вопросов
                      </Badge>
                    </div>
                    {game.description && <CardDescription className="line-clamp-2">{game.description}</CardDescription>}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {game.categories && game.categories.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {game.categories.slice(0, 3).map((category) => (
                            <Badge key={category} variant="secondary" className="text-xs">
                              {category}
                            </Badge>
                          ))}
                          {game.categories.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{game.categories.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(game.createdAt)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {game.questions?.reduce((total, q) => total + (q.timeLimit || 30), 0) || 0}с
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/admin/edit/${game.id}`)}
                      className="flex-1"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Редактировать
                    </Button>
                    <Button size="sm" onClick={() => router.push(`/host/${game.id}`)} className="flex-1">
                      <Play className="w-4 h-4 mr-2" />
                      Запустить
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-muted-foreground">Загрузка ваших игр...</p>
              </div>
            </div>
          ) : filteredGames.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                {searchQuery || selectedCategory !== "all" ? "Ваши игры не найдены" : "У вас пока нет игр"}
              </p>
              <Button onClick={() => router.push("/admin/create")}>
                <Plus className="w-4 h-4 mr-2" />
                Создать первую игру
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGames.map((game) => (
                <Card key={game.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start gap-2">
                      <CardTitle className="text-lg line-clamp-2">{game.title}</CardTitle>
                      <Badge variant="outline" className="shrink-0">
                        {game.questions?.length || 0} вопросов
                      </Badge>
                    </div>
                    {game.description && <CardDescription className="line-clamp-2">{game.description}</CardDescription>}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {game.categories && game.categories.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {game.categories.slice(0, 3).map((category) => (
                            <Badge key={category} variant="secondary" className="text-xs">
                              {category}
                            </Badge>
                          ))}
                          {game.categories.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{game.categories.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(game.createdAt)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {game.questions?.reduce((total, q) => total + (q.timeLimit || 30), 0) || 0}с
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/admin/edit/${game.id}`)}
                      className="flex-1"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Редактировать
                    </Button>
                    <Button size="sm" onClick={() => router.push(`/host/${game.id}`)} className="flex-1">
                      <Play className="w-4 h-4 mr-2" />
                      Запустить
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Общая аналитика
              </CardTitle>
              <CardDescription>Статистика по всем играм и пользователям</CardDescription>
            </CardHeader>
            <CardContent>
              <AnalyticsDashboard />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {user && <UserProfile isOpen={profileOpen} onClose={() => setProfileOpen(false)} />}
    </div>
  )
}
