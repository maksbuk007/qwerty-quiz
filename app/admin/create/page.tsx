"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/AuthContext"
import ThemeToggle from "@/components/ui/ThemeToggle"
import { collection, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import { generateRandomCode } from "@/lib/utils/gameUtils"
import { ArrowLeft, Save, Plus, X, Tag, Loader2, LogOut } from "lucide-react"

export default function CreateGamePage() {
  const router = useRouter()
  const { user, isAdmin, loading: authLoading, logout } = useAuth()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [enableChat, setEnableChat] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [categories, setCategories] = useState<string[]>([])
  const [newCategory, setNewCategory] = useState("")

  // Проверка доступа
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push("/")
    }
  }, [authLoading, isAdmin, router])

  const handleCreateGame = async () => {
    if (!title.trim()) {
      setError("Название игры обязательно")
      return
    }

    try {
      setLoading(true)
      setError("")

      const gameCode = generateRandomCode()

      const gameData = {
        title: title.trim(),
        description: description.trim(),
        code: gameCode,
        createdAt: Date.now(),
        createdBy: user?.uid,
        questions: [],
        settings: {
          enableChat,
        },
        categories: categories.length > 0 ? categories : [],
      }

      const docRef = await addDoc(collection(db, "games"), gameData)
      router.push(`/admin/edit/${docRef.id}`)
    } catch (error) {
      console.error("Ошибка при создании игры:", error)
      setError("Ошибка при создании игры")
      setLoading(false)
    }
  }

  const handleAddCategory = () => {
    if (!newCategory.trim() || categories.includes(newCategory.trim())) {
      return
    }
    setCategories([...categories, newCategory.trim()])
    setNewCategory("")
  }

  const handleRemoveCategory = (category: string) => {
    setCategories(categories.filter((c) => c !== category))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && newCategory.trim()) {
      e.preventDefault()
      handleAddCategory()
    }
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
          <Button variant="outline" onClick={() => router.push("/admin")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>
          <h1 className="text-2xl font-bold">Создание новой игры</h1>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <div className="flex items-center gap-2">
            <span className="text-sm hidden sm:inline">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Основная информация</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Название игры *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Введите ��азвание игры"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Введите описание игры (необязательно)"
              maxLength={500}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="categories">Категории</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {categories.map((category) => (
                <Badge key={category} variant="secondary" className="flex items-center gap-1">
                  {category}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-1"
                    onClick={() => handleRemoveCategory(category)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
              {categories.length === 0 && <span className="text-sm text-muted-foreground">Нет категорий</span>}
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="categories"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Добавить категорию"
                  className="pl-10"
                  maxLength={30}
                />
              </div>
              <Button
                type="button"
                onClick={handleAddCategory}
                disabled={!newCategory.trim() || categories.includes(newCategory.trim())}
              >
                <Plus className="w-4 h-4 mr-2" />
                Добавить
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Категории помогут пользователям быстрее находить ваши игры</p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enableChat">Включить чат</Label>
              <p className="text-sm text-muted-foreground">Позволяет игрокам общаться во время игры</p>
            </div>
            <Switch id="enableChat" checked={enableChat} onCheckedChange={setEnableChat} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end pt-4">
            <Button onClick={handleCreateGame} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Создание...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Создать игру
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
