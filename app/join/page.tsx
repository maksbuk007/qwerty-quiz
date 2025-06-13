"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import ThemeToggle from "@/components/ui/ThemeToggle"
import { Hash, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

export default function JoinPage() {
  const [gameCode, setGameCode] = useState("")
  const router = useRouter()

  const handleCodeChange = (value: string) => {
    // Ограничиваем до 6 символов и делаем заглавными
    const formatted = value.toUpperCase().slice(0, 6)
    setGameCode(formatted)
  }

  const handleJoin = () => {
    if (gameCode.length === 6) {
      router.push(`/join/${gameCode}`)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 max-w-md">
        <div className="flex justify-between items-center mb-4">
          <Button variant="outline" onClick={() => router.push("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            На главную
          </Button>
          <ThemeToggle />
        </div>

        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="text-center">Присоединиться к игре</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="gameCode">Код игры</Label>
              <div className="relative">
                <Hash className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  id="gameCode"
                  value={gameCode}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  placeholder="ABC123"
                  className="pl-10 text-center text-lg font-mono tracking-wider form-input"
                  maxLength={6}
                />
              </div>
              <p className="text-sm text-muted-foreground mt-1">Введите 6-значный код игры</p>
            </div>

            <Button onClick={handleJoin} className="w-full theme-button" disabled={gameCode.length !== 6}>
              Присоединиться
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              <p>Получите код игры от организатора</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
