"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Play,
  Users,
  Trophy,
  Zap,
  Star,
  ArrowRight,
  GamepadIcon,
  Brain,
  Target,
  Settings,
  KeyRound,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { AuthModal } from "@/components/auth/AuthModal"
import { toast } from "@/hooks/use-toast"
import ThemeToggle from "@/components/ui/ThemeToggle"
import { ProfileButton } from "@/components/ui/ProfileButton"

export default function HomePage() {
  const [gameCode, setGameCode] = useState("")
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<"login" | "register">("login")
  const { user, loading, logout, isAdmin } = useAuth()
  const router = useRouter()

  const handleJoinGame = async () => {
    if (!gameCode.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите код игры",
        variant: "destructive",
      })
      return
    }

    // Перенаправляем на страницу присоединения с кодом
    router.push(`/join/${gameCode.trim().toUpperCase()}`)
  }

  const features = [
    {
      icon: <Zap className="h-8 w-8 text-yellow-500" />,
      title: "Мгновенные викторины",
      description: "Создавайте и запускайте викторины за секунды",
    },
    {
      icon: <Users className="h-8 w-8 text-blue-500" />,
      title: "Многопользовательская игра",
      description: "До 100 игроков одновременно в реальном времени",
    },
    {
      icon: <Trophy className="h-8 w-8 text-purple-500" />,
      title: "Система достижений",
      description: "Зарабатывайте награды и отслеживайте прогресс",
    },
    {
      icon: <Brain className="h-8 w-8 text-green-500" />,
      title: "Умная аналитика",
      description: "Детальная статистика и анализ результатов",
    },
    {
      icon: <Target className="h-8 w-8 text-red-500" />,
      title: "Турнирный режим",
      description: "Организуйте соревнования на выбывание",
    },
    {
      icon: <GamepadIcon className="h-8 w-8 text-indigo-500" />,
      title: "Интерактивность",
      description: "Чат, реакции и живое взаимодействие",
    },
  ]

  const stats = [
    { label: "Активных игр", value: "1,234", icon: <Play className="h-5 w-5" /> },
    { label: "Игроков онлайн", value: "5,678", icon: <Users className="h-5 w-5" /> },
    { label: "Проведено викторин", value: "12,345", icon: <Trophy className="h-5 w-5" /> },
    { label: "Средний рейтинг", value: "4.9", icon: <Star className="h-5 w-5" /> },
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GamepadIcon className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              MaxQuiz
            </span>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />

            {user ? (
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <Link href="/admin">
                    <Button variant="outline" size="sm">
                      <Settings className="w-4 h-4 mr-2" />
                      Admin Tools
                    </Button>
                  </Link>
                )}
                <ProfileButton />
              </div>
            ) : (
              <Button
                size="sm"
                onClick={() => {
                  setAuthMode("login")
                  setShowAuthModal(true)
                }}
              >
                <KeyRound className="w-4 h-4 mr-2" />
                Авторизация
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10" />
        <div className="relative container mx-auto px-4 py-20">
          <div className="text-center max-w-4xl mx-auto">
            <Badge variant="secondary" className="mb-4 px-4 py-2">
              🎉 Новая версия 2.0.3 уже здесь! Обновление лидерборда.
            </Badge>

            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">
              MaxQuiz
            </h1>

            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
              Создавайте увлекательные викторины и играйте с друзьями в реальном времени. Современная платформа для
              интерактивного обучения и развлечений.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              {user ? (
                <Link href="/admin">
                  <Button size="lg" className="px-8 py-4 text-lg">
                    <Play className="mr-2 h-5 w-5" />
                    Создать викторину
                  </Button>
                </Link>
              ) : (
                <Button size="lg" className="px-8 py-4 text-lg" onClick={() => setShowAuthModal(true)}>
                  <Play className="mr-2 h-5 w-5" />
                  Начать играть
                </Button>
              )}

              <Link href="/join">
                <Button variant="outline" size="lg" className="px-8 py-4 text-lg">
                  <Users className="mr-2 h-5 w-5" />
                  Присоединиться к игре
                </Button>
              </Link>
            </div>

            {/* Quick Join */}
            <Card className="max-w-md mx-auto">
              <CardHeader>
                <CardTitle className="text-center">Быстрое подключение</CardTitle>
                <CardDescription className="text-center">Введите код игры для присоединения</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Код игры (например: ABC123)"
                  value={gameCode}
                  onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                  className="text-center text-lg font-mono"
                  maxLength={6}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleJoinGame()
                    }
                  }}
                />

                <Button onClick={handleJoinGame} disabled={!gameCode.trim()} className="w-full" size="lg">
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Присоединиться
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white/50 dark:bg-gray-800/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="flex justify-center mb-2 text-primary">{stat.icon}</div>
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">{stat.value}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">Почему выбирают MaxQuiz?</h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Мощные функции для создания незабываемого игрового опыта
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    {feature.icon}
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Готовы начать?</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Присоединяйтесь к тысячам пользователей, которые уже создают увлекательные викторины с MaxQuiz
          </p>

          {user ? (
            <Link href="/admin">
              <Button size="lg" variant="secondary" className="px-8 py-4 text-lg">
                <Play className="mr-2 h-5 w-5" />
                Создать первую викторину
              </Button>
            </Link>
          ) : (
            <Button size="lg" variant="secondary" className="px-8 py-4 text-lg" onClick={() => setShowAuthModal(true)}>
              <Play className="mr-2 h-5 w-5" />
              Зарегистрироваться бесплатно
            </Button>
          )}
        </div>
      </section>

      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} defaultMode={authMode} />
    </div>
  )
}
