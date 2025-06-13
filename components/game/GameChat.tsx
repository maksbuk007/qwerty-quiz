"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { AVATARS } from "@/components/ui/AvatarSelector"
import { GameService } from "@/lib/firebase/gameService"
import { ref, onValue, off, push, set } from "firebase/database"
import { realtimeDb } from "@/lib/firebase/config"
import type { ChatMessage } from "@/types/game"
import { Send, X, MessageCircle, Crown, Trophy, AlertTriangle, Volume2, VolumeX, Users, ArrowDown } from "lucide-react"

interface GameChatProps {
  gameId: string
  playerId: string
  playerName: string
  playerAvatar: string
  isOpen: boolean
  onClose: () => void
  isHost?: boolean
  isMuted?: boolean
  className?: string
}

export default function GameChat({
  gameId,
  playerId,
  playerName,
  playerAvatar,
  isOpen,
  onClose,
  isHost = false,
  isMuted = false,
  className = ""
}: GameChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const [showScrollButton, setShowScrollButton] = useState(false)

  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Автоматическая прокрутка вниз
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    scrollAreaRef.current?.scrollTo({
      top: scrollAreaRef.current.scrollHeight,
      behavior
    })
  }, [])

  // Отслеживание положения прокрутки
  useEffect(() => {
    const scrollArea = scrollAreaRef.current
    if (!scrollArea) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollArea
      setShowScrollButton(scrollHeight - (scrollTop + clientHeight) > 100)
    }

    scrollArea.addEventListener('scroll', handleScroll)
    return () => scrollArea.removeEventListener('scroll', handleScroll)
  }, [])

  // Получение аватара
  const getAvatarDisplay = useCallback((avatarId: string) => {
    const avatar = AVATARS.find(a => a.id === avatarId)
    return avatar ? (
      <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-sm ${avatar.color}`}>
        {avatar.emoji}
      </div>
    ) : (
      <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs">
        ?
      </div>
    )
  }, [])

  // Воспроизведение звука
  const playSound = useCallback((type: "message" | "system" | "achievement") => {
    if (!soundEnabled) return

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      const frequencies = {
        message: 800,
        system: 600,
        achievement: 1000
      }

      oscillator.frequency.setValueAtTime(frequencies[type], audioContext.currentTime)
      gainNode.gain.setValueAtTime(type === 'achievement' ? 0.2 : 0.1, audioContext.currentTime)

      oscillator.start()
      oscillator.stop(audioContext.currentTime + 0.1)
    } catch (error) {
      console.warn("Не удалось воспроизвести звук:", error)
    }
  }, [soundEnabled])

  // Подписка на сообщения чата
  useEffect(() => {
    if (!gameId || !isOpen) return

    const chatRef = ref(realtimeDb, `sessions/${gameId}/chat`)
    const usersRef = ref(realtimeDb, `sessions/${gameId}/players`)

    const unsubscribeChat = onValue(chatRef, (snapshot) => {
      const data = snapshot.val()
      if (!data) {
        setMessages([])
        return
      }

      const messagesList = Object.entries(data)
        .filter(([key]) => key !== 'undefined')
        .map(([id, message]: [string, any]) => ({
          id,
          ...message,
          timestamp: message.timestamp || Date.now()
        }))
        .sort((a, b) => a.timestamp - b.timestamp)

      setMessages(prev => {
        if (messagesList.length > prev.length && prev.length > 0) {
          const lastMessage = messagesList[messagesList.length - 1]
          if (lastMessage.playerId !== playerId) {
            playSound(lastMessage.type === "achievement" ? "achievement" : 
                    lastMessage.type === "system" ? "system" : "message")
          }
        }
        return messagesList
      })
    })

    const unsubscribeUsers = onValue(usersRef, (snapshot) => {
      const players = snapshot.val()
      setOnlineUsers(players ? Object.keys(players).filter(id => players[id]?.isConnected) : [])
    })

    return () => {
      off(chatRef, "value", unsubscribeChat)
      off(usersRef, "value", unsubscribeUsers)
    }
  }, [gameId, isOpen, playerId, playSound])

  // Автопрокрутка при новых сообщениях
  useEffect(() => {
    if (!isOpen || messages.length === 0) return
    scrollToBottom('auto')
  }, [messages, isOpen, scrollToBottom])

  // Фокус на поле ввода при открытии
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Отправка сообщения
  const sendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || loading || isMuted) return

    setLoading(true)
    try {
      const messageData = {
        playerId,
        playerName,
        playerAvatar,
        message: newMessage.trim(),
        timestamp: Date.now(),
        type: "user"
      }

      const chatRef = ref(realtimeDb, `sessions/${gameId}/chat`)
      const newMessageRef = push(chatRef)
      await set(newMessageRef, messageData)

      setNewMessage("")
      setTimeout(() => inputRef.current?.focus(), 50)
    } catch (error) {
      console.error("Ошибка отправки сообщения:", error)
    } finally {
      setLoading(false)
    }
  }, [gameId, playerId, playerName, playerAvatar, newMessage, loading, isMuted])

  // Форматирование времени
  const formatTime = useCallback((timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }, [])

  // Получение иконки типа сообщения
  const getMessageIcon = useCallback((type?: string) => {
    switch (type) {
      case "system": return <AlertTriangle className="w-3 h-3" />
      case "achievement": return <Trophy className="w-3 h-3 text-yellow-500" />
      case "warning": return <AlertTriangle className="w-3 h-3 text-red-500" />
      default: return null
    }
  }, [])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className={`w-full max-w-md h-[80vh] flex flex-col ${className}`}>
        <CardHeader className="flex-shrink-0 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              <CardTitle className="text-lg">Чат игры</CardTitle>
              <Badge variant="outline" className="text-xs">
                <Users className="w-3 h-3 mr-1" />
                {onlineUsers.length}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSoundEnabled(!soundEnabled)} 
                className="h-8 w-8 p-0"
                aria-label={soundEnabled ? "Выключить звук" : "Включить звук"}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClose} 
                className="h-8 w-8 p-0"
                aria-label="Закрыть чат"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          <ScrollArea 
            ref={scrollAreaRef}
            className="flex-1 px-4"
            style={{ height: 'calc(100% - 64px)' }}
          >
            <div className="space-y-3 py-2 min-h-full">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Пока нет сообщений</p>
                  <p className="text-xs">Начните общение!</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-2 ${message.playerId === playerId ? "flex-row-reverse" : ""}`}
                  >
                    <div className="flex-shrink-0">
                      {message.playerId === "system" ? (
                        <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center">
                          {getMessageIcon(message.type)}
                        </div>
                      ) : (
                        getAvatarDisplay(message.playerAvatar)
                      )}
                    </div>
                    <div className={`flex-1 ${message.playerId === playerId ? "text-right" : "text-left"}`}>
                      <div className={`flex items-center gap-2 mb-1 ${message.playerId === playerId ? "flex-row-reverse" : ""}`}>
                        <span className="text-xs font-medium">
                          {message.playerId === "system" ? "Система" : message.playerName}
                          {message.playerId === playerId && " (Вы)"}
                        </span>
                        <span className="text-xs text-muted-foreground">{formatTime(message.timestamp)}</span>
                        {message.type === "achievement" && <Crown className="w-3 h-3 text-yellow-500" />}
                      </div>
                      <div
                        className={`inline-block px-3 py-2 rounded-lg text-sm break-words max-w-full ${
                          message.playerId === playerId
                            ? "bg-primary text-primary-foreground"
                            : message.type === "system"
                              ? "bg-muted text-muted-foreground"
                              : message.type === "achievement"
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                : "bg-muted"
                        }`}
                        style={{
                          wordBreak: 'break-word',
                          overflowWrap: 'break-word',
                          whiteSpace: 'pre-wrap'
                        }}
                      >
                        {message.message}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {showScrollButton && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => scrollToBottom()}
                className="sticky bottom-2 left-full transform -translate-x-12 z-10 shadow-md"
              >
                <ArrowDown className="w-4 h-4" />
              </Button>
            )}
          </ScrollArea>

          <div className="border-t p-4">
            {isMuted ? (
              <div className="text-center text-sm text-muted-foreground py-2">
                <VolumeX className="w-4 h-4 mx-auto mb-1" />
                Вы не можете отправлять сообщения
              </div>
            ) : (
              <form onSubmit={sendMessage} className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Введите сообщение..."
                  disabled={loading}
                  maxLength={500}
                  className="flex-1"
                />
                <Button 
                  type="submit" 
                  size="sm" 
                  disabled={loading || !newMessage.trim()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
