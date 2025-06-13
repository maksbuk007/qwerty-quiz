"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Medal, Award, Crown, ChevronUp, ChevronDown, Plus } from "lucide-react"
import { AVATARS } from "@/components/ui/AvatarSelector"
import type { Player } from "@/types/game"
import { motion, AnimatePresence } from "framer-motion"

interface LeaderboardEntry extends Player {
  rank: number
  previousRank?: number
  rankChange?: number
  pointsGained: number
}

export default function AnimatedLeaderboard({
  players,
  currentPlayerId,
  showAnimation = false,
  previousPlayers = {},
  maxItems = 10
}: {
  players: Record<string, Player>
  currentPlayerId?: string
  showAnimation?: boolean
  previousPlayers?: Record<string, Player>
  maxItems?: number
}) {
  const [displayedPlayers, setDisplayedPlayers] = useState<LeaderboardEntry[]>([])
  const [animationPhase, setAnimationPhase] = useState<"points" | "movement" | "complete">("points")
  const prevPlayersRef = useRef<Record<string, Player>>(previousPlayers)
  const animationTimeoutRef = useRef<NodeJS.Timeout>()

  // Рассчитываем изменения позиций и очков
  const calculatePlayerChanges = () => {
    const currentPlayerList = Object.values(players)
      .filter(p => p.isConnected)
      .sort((a, b) => b.score - a.score || a.nickname.localeCompare(b.nickname))

    const previousPlayerList = Object.values(prevPlayersRef.current)
      .filter(p => p.isConnected)
      .sort((a, b) => b.score - a.score || a.nickname.localeCompare(b.nickname))

    return currentPlayerList.slice(0, maxItems).map((player, index): LeaderboardEntry => {
      const rank = index + 1
      const previousRank = previousPlayerList.findIndex(p => p.id === player.id) + 1
      const previousPlayer = previousPlayerList.find(p => p.id === player.id)
      const pointsGained = previousPlayer ? player.score - previousPlayer.score : 0

      return {
        ...player,
        rank,
        previousRank: previousRank > 0 ? previousRank : undefined,
        rankChange: previousRank > 0 ? previousRank - rank : 0,
        pointsGained: pointsGained > 0 ? pointsGained : 0
      }
    })
  }

  // Запуск анимации при изменении players
  useEffect(() => {
    const changes = calculatePlayerChanges()
    
    if (showAnimation && Object.keys(prevPlayersRef.current).length > 0) {
      startAnimationSequence(changes)
    } else {
      setDisplayedPlayers(changes)
      setAnimationPhase("complete")
    }

    prevPlayersRef.current = players

    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current)
      }
    }
  }, [players, showAnimation, maxItems])

  const startAnimationSequence = (changes: LeaderboardEntry[]) => {
    setAnimationPhase("points")
    setDisplayedPlayers(changes)
    
    // Фаза 1: Показываем прибавку очков (1.5 секунды)
    animationTimeoutRef.current = setTimeout(() => {
      // Фаза 2: Анимируем перемещение на новые позиции (1.5 секунды)
      setAnimationPhase("movement")
      
      animationTimeoutRef.current = setTimeout(() => {
        setAnimationPhase("complete")
      }, 1500)
    }, 1500)
  }

  const getAvatarDisplay = (avatarId: string, isTopThree: boolean) => {
    const avatar = AVATARS.find(a => a.id === avatarId)
    const sizeClass = isTopThree ? "w-10 h-10 text-xl" : "w-8 h-8 text-lg"
    
    return avatar ? (
      <div className={`${sizeClass} rounded-lg flex items-center justify-center ${avatar.color}`}>
        {avatar.emoji}
      </div>
    ) : (
      <div className={`${sizeClass} rounded-full bg-gray-200 flex items-center justify-center`}>?</div>
    )
  }

  const renderRankIndicator = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-b from-yellow-400 to-yellow-600 flex items-center justify-center shadow-md">
          <Crown className="w-5 h-5 text-yellow-500" />
        </div>
      )
    }
    if (rank === 2) {
      return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-b from-gray-300 to-gray-500 flex items-center justify-center shadow-md">
          <Medal className="w-5 h-5 text-gray-400" />
        </div>
      )
    }
    if (rank === 3) {
      return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-b from-amber-500 to-amber-700 flex items-center justify-center shadow-md">
          <Award className="w-5 h-5 text-amber-600" />
        </div>
      )
    }
    return (
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border shadow-sm">
        <span className="font-bold text-sm">{rank}</span>
      </div>
    )
  }

  const renderPointsChange = (pointsGained: number) => {
    if (!pointsGained || animationPhase !== "points") return null
    
    return (
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="absolute right-4 top-2 bg-green-100 dark:bg-green-900/80 px-2 py-1 rounded-full shadow-sm z-10"
      >
        <div className="flex items-center text-green-600 dark:text-green-300 text-xs font-bold">
          <Plus className="w-3 h-3 mr-1" />
          {pointsGained}
        </div>
      </motion.div>
    )
  }

  const renderRankChange = (rankChange?: number) => {
    if (!rankChange || rankChange === 0 || animationPhase !== "movement") return null
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`flex items-center ml-2 ${
          rankChange > 0 ? "text-green-600" : "text-red-600"
        }`}
      >
        {rankChange > 0 ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
        <span className="text-xs font-bold ml-0.5">{Math.abs(rankChange)}</span>
      </motion.div>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="overflow-hidden shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3">
          <CardTitle className="text-center flex items-center justify-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-300" />
            <span>Таблица лидеров</span>
            {animationPhase !== "complete" && (
              <Badge variant="secondary" className="ml-2 bg-white/20 text-white">
                Обновление...
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-0">
          <AnimatePresence>
            {displayedPlayers.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-muted-foreground py-12"
              >
                <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Пока нет игроков</p>
                <p className="text-sm">Ожидание участников...</p>
              </motion.div>
            ) : (
              <div className="divide-y divide-muted/50">
                {displayedPlayers.map((player) => {
                  const isCurrentPlayer = player.id === currentPlayerId
                  const isTopThree = player.rank <= 3

                  return (
                    <motion.div
                      key={player.id}
                      layout
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ 
                        opacity: 1, 
                        y: 0,
                        backgroundColor: animationPhase === "points" && player.pointsGained
                          ? "rgba(220, 252, 231, 0.5)" 
                          : "rgba(255, 255, 255, 0)"
                      }}
                      transition={{
                        type: "spring",
                        damping: 20,
                        stiffness: 300,
                        duration: 0.5
                      }}
                      className={`
                        relative flex items-center justify-between p-4
                        ${isCurrentPlayer ? "bg-blue-50/50 dark:bg-blue-900/20" : ""}
                        ${isTopThree ? "bg-gradient-to-r from-white to-muted/50 dark:from-gray-900 dark:to-gray-800" : ""}
                      `}
                    >
                      {renderPointsChange(player.pointsGained)}

                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex items-center">
                          {renderRankIndicator(player.rank)}
                          {renderRankChange(player.rankChange)}
                        </div>

                        {getAvatarDisplay(player.avatar, isTopThree)}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`font-medium truncate ${isTopThree ? "text-lg" : ""}`}>
                              {player.nickname}
                            </p>
                            {isCurrentPlayer && (
                              <Badge variant="outline" className="text-xs">
                                Вы
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {(player.answers || []).filter(a => a.isCorrect).length} правильных
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <motion.span
                            key={`score-${player.id}-${player.score}`}
                            initial={{ scale: 1 }}
                            animate={{ 
                              scale: animationPhase === "points" && player.pointsGained ? [1, 1.2, 1] : 1,
                              color: animationPhase === "points" && player.pointsGained 
                                ? "rgb(22, 163, 74)" 
                                : "inherit"
                            }}
                            transition={{ 
                              duration: 0.3,
                              times: [0, 0.5, 1]
                            }}
                            className={`font-bold ${isTopThree ? "text-xl" : "text-lg"}`}
                          >
                            {player.score}
                          </motion.span>
                        </div>
                        <p className="text-xs text-muted-foreground">баллов</p>

                      </div>

                      {isTopThree && (
                        <div className="absolute inset-0 pointer-events-none overflow-hidden">
                          {[...Array(5)].map((_, i) => (
                            <motion.div
                              key={i}
                              className={`absolute rounded-full ${
                                player.rank === 1 
                                  ? "bg-yellow-400/30" 
                                  : player.rank === 2 
                                    ? "bg-gray-400/30" 
                                    : "bg-amber-500/30"
                              }`}
                              initial={{ y: -10, opacity: 0 }}
                              animate={{ y: [0, -20, 0], opacity: [0, 1, 0] }}
                              transition={{
                                delay: i * 0.2,
                                duration: 2,
                                repeat: Infinity,
                                repeatDelay: 5
                              }}
                              style={{
                                width: `${Math.random() * 6 + 4}px`,
                                height: `${Math.random() * 6 + 4}px`,
                                left: `${Math.random() * 80 + 10}%`,
                                top: `${Math.random() * 100}%`
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            )}
          </AnimatePresence>

          {displayedPlayers.length > 0 && (
            <div className="p-3 text-center text-xs text-muted-foreground border-t">
              Показано топ-{Math.min(maxItems, displayedPlayers.length)} игроков
              {displayedPlayers.length === maxItems && " из всех участников"}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
