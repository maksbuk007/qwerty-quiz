"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { MessageCircle, Send, X, Users, Crown, AlertTriangle, Trash2 } from "lucide-react"
import { ref, push, onValue, off } from "firebase/database"
import { realtimeDb } from "@/lib/firebase/config"
import { GameService } from "@/lib/firebase/gameService"
import { AVATARS } from "@/components/ui/AvatarSelector"

interface ChatMessage {
  id: string
  playerId: string
  playerName: string
  playerAvatar: string
  message: string
  timestamp: number
  type: "message" | "system" | "admin"
}

interface AdminGameChatProps {
  gameId: string
  isOpen: boolean
  onToggle: () => void
  gameStatus: string
}

export default function AdminGameChat({ gameId, isOpen, onToggle, gameStatus }: AdminGameChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [isClearing, setIsClearing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatRef = useRef(ref(realtimeDb, `sessions/${gameId}/chat`))

  const getAvatarDisplay = (avatarId: string) => {
    const avatar = AVATARS.find((a) => a.id === avatarId)
    if (!avatar)
      return <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">?</div>

    return (
      <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-sm ${avatar.color}`}>
        {avatar.emoji}
      </div>
    )
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    if (!isOpen) return

    setIsLoading(true)
    setIsConnected(false)

    const unsubscribe = onValue(
      chatRef.current,
      (snapshot) => {
        try {
          const data = snapshot.val()
          if (data) {
            const messagesList = Object.entries(data).map(([id, messageData]: [string, any]) => ({
              id,
              playerId: messageData.playerId || "",
              playerName: messageData.playerName || "Неизвестный",
              playerAvatar: messageData.playerAvatar || "",
              message: messageData.message || "",
              timestamp: messageData.timestamp || Date.now(),
              type: messageData.type || "message",
            }))

            // Сортируем по времени
            messagesList.sort((a, b) => a.timestamp - b.timestamp)

            // Обновляем счетчик непрочитанных если чат закрыт
            if (!isOpen) {
              const newMessages = messagesList.filter(
                (msg) => msg.timestamp > (messages[messages.length - 1]?.timestamp || 0),
              )
              setUnreadCount((prev) => prev + newMessages.length)
            } else {
              setUnreadCount(0)
            }

            setMessages(messagesList)
          } else {
            setMessages([])
          }
          setIsConnected(true)
          setIsLoading(false)
        } catch (error) {
          console.error("Ошибка обработки данных чата:", error)
          setIsConnected(false)
          setIsLoading(false)
        }
      },
      (error) => {
        console.error("Ошибка подключения к чату:", error)
        setIsConnected(false)
        setIsLoading(false)
      },
    )

    return () => {
      off(chatRef.current, "value", unsubscribe)
    }
  }, [isOpen, gameId])

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0)
    }
  }, [isOpen])

  useEffect(() => {
    if (messages.length > 0 && isOpen) {
      scrollToBottom()
    }
  }, [messages, isOpen])

  const sendMessage = async () => {
    if (!newMessage.trim() || !isConnected) return

    try {
      const messageData = {
        playerId: "admin",
        playerName: "Администратор",
        playerAvatar: "",
        message: newMessage.trim(),
        timestamp: Date.now(),
        type: "admin",
      }

      await push(chatRef.current, messageData)
      setNewMessage("")
    } catch (error) {
      console.error("Ошибка отправки сообщения:", error)
    }
  }

  const sendSystemMessage = async (message: string) => {
    try {
      const messageData = {
        playerId: "system",
        playerName: "Система",
        playerAvatar: "",
        message,
        timestamp: Date.now(),
        type: "system",
      }

      await push(chatRef.current, messageData)
    } catch (error) {
      console.error("Ошибка отправки системного сообщения:", error)
    }
  }

  const clearChat = async () => {
    if (!isConnected || isClearing) return

    try {
      setIsClearing(true)

      // Сначала очищаем чат
      await GameService.clearChat(gameId)

      // Ждем немного для обновления
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Отправляем системное сообщение об очистке
      await sendSystemMessage("Чат был очищен администратором")
    } catch (error) {
      console.error("Ошибка очистки чата:", error)
    } finally {
      setIsClearing(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const renderMessage = (message: ChatMessage) => {
    if (message.type === "system") {
      return (
        <div key={message.id} className="flex justify-center my-2">
          <div className="bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-600 rounded-lg px-3 py-2 max-w-[90%]">
            <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">{message.message}</span>
            </div>
            <div className="text-xs text-orange-600 dark:text-orange-400 mt-1 text-center">
              {formatTime(message.timestamp)}
            </div>
          </div>
        </div>
      )
    }

    if (message.type === "admin") {
      return (
        <div key={message.id} className="flex gap-2 mb-3 justify-end">
          <div className="max-w-[75%] rounded-lg p-3 bg-purple-600 text-white">
            <div className="text-xs font-medium mb-1 opacity-70 flex items-center gap-1">
              <Crown className="w-3 h-3" />
              {message.playerName}
            </div>
            <div className="text-sm break-words">{message.message}</div>
            <div className="text-xs opacity-50 mt-1">{formatTime(message.timestamp)}</div>
          </div>
          <div className="flex-shrink-0 mt-1">
            <div className="w-6 h-6 rounded-lg bg-purple-600 flex items-center justify-center">
              <Crown className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
      )
    }

    return (
      <div key={message.id} className="flex gap-2 mb-3 justify-start">
        <div className="flex-shrink-0 mt-1">{getAvatarDisplay(message.playerAvatar)}</div>
        <div className="max-w-[75%] rounded-lg p-3 bg-muted">
          <div className="text-xs font-medium mb-1 opacity-70">{message.playerName}</div>
          <div className="text-sm break-words">{message.message}</div>
          <div className="text-xs opacity-50 mt-1">{formatTime(message.timestamp)}</div>
        </div>
      </div>
    )
  }

  if (!isOpen) {
    return (
      <div className="fixed bottom-20 right-4 z-40">
        <Button
          onClick={onToggle}
          className="rounded-full w-14 h-14 shadow-lg bg-purple-600 hover:bg-purple-700 text-white relative"
          size="lg"
        >
          <MessageCircle className="w-6 h-6" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 w-6 h-6 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-20 right-4 z-40 w-80 h-96 md:w-96 md:h-[500px]">
      <Card className="h-full flex flex-col shadow-xl border-2">
        <CardHeader className="pb-2 px-3 py-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Crown className="w-4 h-4 text-purple-600" />
              Чат администратора
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearChat}
                disabled={!isConnected || isClearing || messages.length === 0}
                title="Очистить чат"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onToggle}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Users className="w-3 h-3 mr-1" />
              {
                messages.filter(
                  (m, i, arr) => m.type === "message" && arr.findIndex((msg) => msg.playerId === m.playerId) === i,
                ).length
              }{" "}
              участников
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Админ-чат
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-2 gap-2 min-h-0">
          <ScrollArea className="flex-1 pr-2">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-sm">Загрузка чата...</div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <div className="text-sm">Пока нет сообщений</div>
                  <div className="text-xs">Начните общение с игроками!</div>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {messages.map(renderMessage)}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          <div className="flex gap-2 pt-2 border-t">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={!isConnected ? "Подключение..." : "Сообщение игрокам..."}
              disabled={!isConnected}
              className="text-sm"
              maxLength={200}
            />
            <Button onClick={sendMessage} disabled={!newMessage.trim() || !isConnected} size="sm">
              <Send className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => sendSystemMessage("Игра скоро начнется!")}
              disabled={!isConnected}
              className="flex-1 text-xs"
            >
              Скоро старт
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => sendSystemMessage("Удачи всем игрокам!")}
              disabled={!isConnected}
              className="flex-1 text-xs"
            >
              Удачи!
            </Button>
          </div>

          {gameStatus === "finished" && (
            <div className="text-xs text-center text-muted-foreground pt-1">
              Игра завершена. Чат будет очищен при следующей игре.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
