"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AVATARS } from "@/components/ui/AvatarSelector"
import QRCode from "react-qr-code"
import { Copy, Users, RefreshCw } from "lucide-react"
import type { Player } from "@/types/game"

interface WaitingRoomProps {
  gameCode: string
  players: Record<string, Player>
  currentPlayerId?: string
  isHost?: boolean
  onStart?: () => void
}

export default function WaitingRoom({ gameCode, players, currentPlayerId, isHost = false, onStart }: WaitingRoomProps) {
  const [copied, setCopied] = useState(false)
  const [qrRefresh, setQrRefresh] = useState(0)

  const joinUrl = typeof window !== "undefined" ? `${window.location.origin}/join/${gameCode}` : ""

  useEffect(() => {
    // if (typeof window !== "undefined") {
    //   setJoinUrl(`${window.location.origin}/join/${gameCode}`)
    // }
  }, [gameCode])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getAvatarDisplay = (avatarId: string) => {
    const avatar = AVATARS.find((a) => a.id === avatarId)
    if (!avatar) return <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">?</div>

    return (
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${avatar.color}`}>
        {avatar.emoji}
      </div>
    )
  }

  const activePlayers = Object.values(players).filter((player) => player.isConnected && !player.isHost)

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Ожидание игроков</span>
            <span className="text-sm font-normal text-muted-foreground">
              {activePlayers.length} {activePlayers.length === 1 ? "игрок" : "игроков"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              {activePlayers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Пока нет игроков</p>
                  <p className="text-sm">Поделитесь кодом игры, чтобы пригласить участников</p>
                </div>
              ) : (
                activePlayers.map((player) => (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      player.id === currentPlayerId ? "bg-primary/10 border-primary" : "bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {getAvatarDisplay(player.avatar)}
                      <div>
                        <div className="font-medium">{player.nickname}</div>
                        <div className="text-xs text-muted-foreground">
                          {player.id === currentPlayerId ? "Вы" : "Присоединился"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {isHost && (
              <Button onClick={onStart} className="w-full" disabled={activePlayers.length === 0}>
                Начать игру
              </Button>
            )}

            {!isHost && (
              <div className="text-center text-sm text-muted-foreground">Ожидайте начала игры администратором...</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Присоединение к игре</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setQrRefresh((prev) => prev + 1)}
              title="Обновить QR-код"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center space-y-4">
            <div className="text-center">
              <p className="text-lg font-medium mb-2">Код игры:</p>
              <div className="text-2xl sm:text-3xl font-bold tracking-wider bg-primary/10 py-2 px-4 rounded-lg font-mono">
                {gameCode}
              </div>
            </div>

            {joinUrl && (
              <>
                <div className="p-4 bg-white rounded-lg shadow-sm">
                  <QRCode value={joinUrl} size={150} key={`qr-${qrRefresh}`} />
                </div>

                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">Отсканируйте QR-код или поделитесь кодом игры</p>
                  <div className="flex gap-2 justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(gameCode)}
                      className={copied ? "bg-green-100 text-green-800" : ""}
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      {copied ? "Скопировано!" : "Код"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(joinUrl)}
                      className={copied ? "bg-green-100 text-green-800" : ""}
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Ссылка
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
