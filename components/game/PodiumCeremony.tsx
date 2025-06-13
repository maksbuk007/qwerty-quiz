"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, Medal, Award, Crown, Star, Sparkles, Zap, Heart } from "lucide-react"
import { AVATARS } from "@/components/ui/AvatarSelector"
import type { Player } from "@/types/game"

interface PodiumCeremonyProps {
  players: Player[]
  currentPlayer: Player
  onComplete: () => void
}

interface PodiumPosition {
  players: Player[]
  position: number
  displayPosition: string
}

export default function PodiumCeremony({ players, currentPlayer, onComplete }: PodiumCeremonyProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [showPosition, setShowPosition] = useState<number | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [fireworks, setFireworks] = useState(false)

  // Группируем игроков по очкам для обработки ничьих
  const groupPlayersByScore = (players: Player[]): PodiumPosition[] => {
    const scoreGroups = new Map<number, Player[]>()

    players.forEach((player) => {
      const score = player.score
      if (!scoreGroups.has(score)) {
        scoreGroups.set(score, [])
      }
      scoreGroups.get(score)!.push(player)
    })

    // Сортируем группы по очкам (убывание)
    const sortedScores = Array.from(scoreGroups.keys()).sort((a, b) => b - a)

    const positions: PodiumPosition[] = []
    let currentPosition = 1

    sortedScores.forEach((score) => {
      const playersWithScore = scoreGroups.get(score)!
      // Сортируем игроков с одинаковыми очками по алфавиту
      playersWithScore.sort((a, b) => a.nickname.localeCompare(b.nickname))

      let displayPosition: string
      if (playersWithScore.length === 1) {
        displayPosition = currentPosition.toString()
      } else {
        displayPosition = `${currentPosition}-${currentPosition + playersWithScore.length - 1}`
      }

      positions.push({
        players: playersWithScore,
        position: currentPosition,
        displayPosition,
      })

      currentPosition += playersWithScore.length
    })

    return positions.slice(0, 3) // Берем только топ-3 позиции
  }

  const podiumPositions = groupPlayersByScore(players)

  const getAvatarDisplay = (avatarId: string, size: "sm" | "md" | "lg" = "md") => {
    const avatar = AVATARS.find((a) => a.id === avatarId)
    if (!avatar) {
      const sizeClass = size === "sm" ? "w-10 h-10" : size === "md" ? "w-14 h-14" : "w-16 h-16"
      return <div className={`${sizeClass} rounded-full bg-gray-200 flex items-center justify-center`}>?</div>
    }

    const sizeClass = size === "sm" ? "w-10 h-10 text-xl" : size === "md" ? "w-14 h-14 text-2xl" : "w-16 h-16 text-3xl"
    return (
      <div className={`${sizeClass} rounded-lg flex items-center justify-center ${avatar.color} shadow-lg`}>
        {avatar.emoji}
      </div>
    )
  }

  const getPodiumHeight = (position: number) => {
    switch (position) {
      case 1:
        return "h-32 md:h-40" // 1 место
      case 2:
        return "h-24 md:h-32" // 2 место
      case 3:
        return "h-20 md:h-28" // 3 место
      default:
        return "h-16 md:h-24"
    }
  }

  const getPodiumColor = (position: number) => {
    switch (position) {
      case 1:
        return "bg-gradient-to-t from-yellow-400 via-yellow-300 to-yellow-200 border-yellow-500 shadow-yellow-300/50"
      case 2:
        return "bg-gradient-to-t from-gray-400 via-gray-300 to-gray-200 border-gray-500 shadow-gray-300/50"
      case 3:
        return "bg-gradient-to-t from-amber-600 via-amber-500 to-amber-400 border-amber-700 shadow-amber-400/50"
      default:
        return "bg-gray-200"
    }
  }

  const getMedal = (position: number, isAnimating = false) => {
    const animationClass = isAnimating ? "animate-bounce" : ""
    const sizeClass = "w-8 h-8 md:w-10 md:h-10"
    switch (position) {
      case 1:
        return <Crown className={`${sizeClass} text-yellow-500 ${animationClass}`} />
      case 2:
        return <Medal className={`${sizeClass} text-gray-400 ${animationClass}`} />
      case 3:
        return <Award className={`${sizeClass} text-amber-600 ${animationClass}`} />
      default:
        return null
    }
  }

  const getPositionText = (position: PodiumPosition) => {
    if (position.players.length === 1) {
      switch (position.position) {
        case 1:
          return "🥇 Первое место!"
        case 2:
          return "🥈 Второе место!"
        case 3:
          return "🥉 Третье место!"
        default:
          return `${position.position} место!`
      }
    } else {
      return `🏆 Разделили ${position.displayPosition} место!`
    }
  }

  useEffect(() => {
    const sequence = [
      () => {
        // Показываем 3 место (или последнее из топ-3)
        if (podiumPositions.length >= 3) {
          setShowPosition(2)
          setTimeout(() => setCurrentStep(1), 2500)
        } else if (podiumPositions.length === 2) {
          setShowPosition(1)
          setTimeout(() => setCurrentStep(1), 2500)
        } else {
          setShowPosition(0)
          setTimeout(() => setCurrentStep(3), 2500)
        }
      },
      () => {
        // Показываем 2 место
        if (podiumPositions.length >= 2) {
          setShowPosition(1)
          setTimeout(() => setCurrentStep(2), 2500)
        } else {
          setShowPosition(0)
          setTimeout(() => setCurrentStep(3), 2500)
        }
      },
      () => {
        // Показываем 1 место
        setShowPosition(0)
        setTimeout(() => setCurrentStep(3), 3000)
      },
      () => {
        // Показываем всех вместе с фейерверком
        setShowAll(true)
        setFireworks(true)
        setTimeout(() => setFireworks(false), 5000)
      },
    ]

    if (currentStep < sequence.length) {
      sequence[currentStep]()
    }
  }, [currentStep, podiumPositions.length])

  const renderPlayerGroup = (position: PodiumPosition, index: number) => {
    const isVisible = showPosition === index || showAll
    const isCurrentStep = showPosition === index && !showAll

    return (
      <div
        key={`position-${position.position}`}
        className={`flex flex-col items-center transition-all duration-1500 ${
          isVisible ? "opacity-100 transform translate-y-0 scale-100" : "opacity-0 transform translate-y-20 scale-75"
        } ${isCurrentStep ? "animate-pulse" : ""}`}
      >
        <div className="mb-2 md:mb-4 text-center">
          {getMedal(position.position, isCurrentStep)}

          {/* Отображаем игроков */}
          <div className={`mt-2 md:mt-4 ${position.players.length > 1 ? "flex gap-1 md:gap-2" : ""}`}>
            {position.players.map((player, playerIndex) => (
              <div key={player.id} className="flex flex-col items-center">
                {getAvatarDisplay(player.avatar, position.position === 1 ? "lg" : "md")}
                <div className="text-white font-bold mt-1 md:mt-2 text-center">
                  <div className="text-sm md:text-base">{player.nickname}</div>
                  {player.id === currentPlayer.id && (
                    <div className="text-yellow-400 text-xs md:text-sm mt-1">✨ Это вы! ✨</div>
                  )}
                </div>
                <div className="text-white/80 text-xs md:text-sm">{player.score} баллов</div>
              </div>
            ))}
          </div>
        </div>

        <div
          className={`w-20 md:w-32 ${getPodiumHeight(position.position)} ${getPodiumColor(position.position)} border-2 md:border-4 rounded-t-lg flex items-center justify-center text-white font-bold text-xl md:text-3xl relative shadow-2xl`}
        >
          {position.displayPosition}

          {/* Эффект сияния для первого места */}
          {position.position === 1 && isCurrentStep && (
            <div className="absolute -top-8 md:-top-12 left-1/2 transform -translate-x-1/2">
              <Sparkles className="w-12 h-12 md:w-16 md:h-16 text-yellow-400 animate-spin" />
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-2 md:p-4 relative overflow-hidden">
      {/* Постоянно анимированные звезды */}
      <div className="absolute inset-0">
        {[...Array(150)].map((_, i) => (
          <Star
            key={i}
            className={`absolute text-yellow-300 animate-pulse`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
              fontSize: `${Math.random() * 12 + 8}px`,
            }}
          />
        ))}
      </div>

      {/* Дополнительные эффекты */}
      <div className="absolute inset-0">
        {[...Array(50)].map((_, i) => (
          <Heart
            key={i}
            className={`absolute text-pink-300 animate-pulse`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 4}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
              fontSize: `${Math.random() * 8 + 6}px`,
            }}
          />
        ))}
      </div>

      {/* Фейерверк */}
      {fireworks && (
        <div className="absolute inset-0">
          {[...Array(30)].map((_, i) => (
            <Zap
              key={i}
              className="absolute text-yellow-400 animate-ping"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                fontSize: "20px",
              }}
            />
          ))}
        </div>
      )}

      <Card className="w-full max-w-6xl bg-white/10 backdrop-blur-lg border-white/20 shadow-2xl">
        <CardContent className="p-4 md:p-8">
          <div className="text-center mb-4 md:mb-8">
            <h1 className="text-2xl md:text-4xl lg:text-6xl font-bold text-white mb-2 md:mb-4 flex items-center justify-center gap-2 md:gap-4">
              <Trophy className="w-8 h-8 md:w-12 md:h-12 lg:w-16 lg:h-16 text-yellow-400" />
              <span className="hidden md:inline">Церемония награждения</span>
              <span className="md:hidden">Награждение</span>
              <Sparkles className="w-8 h-8 md:w-12 md:h-12 lg:w-16 lg:h-16 text-yellow-400" />
            </h1>
            <p className="text-base md:text-xl lg: text-2xl text-white/80">Поздравляем победителей!</p>
          </div>

          {/* Пьедестал */}
          <div className="podium-container mb-4 md:mb-8">
            {podiumPositions.map((position, index) => renderPlayerGroup(position, index))}
          </div>

          {/* Сообщение для текущего игрока */}
          {showAll && (
            <div className="text-center mb-4 md:mb-8 animate-slide-in-bottom">
              <div className="bg-white/20 backdrop-blur-lg rounded-lg p-4 md:p-6 border border-white/30">
                <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
                  {getPositionText(
                    podiumPositions.find((p) => p.players.some((player) => player.id === currentPlayer.id)) ||
                      podiumPositions[0],
                  )}
                </h2>
                <p className="text-base md:text-lg text-white/80">
                  {currentPlayer.score} баллов • {(currentPlayer.answers || []).filter((a) => a.isCorrect).length}{" "}
                  правильных ответов
                </p>
              </div>
            </div>
          )}

          {/* Кнопка продолжения */}
          {showAll && (
            <div className="text-center animate-slide-in-bottom">
              <Button
                onClick={onComplete}
                size="lg"
                className="bg-white text-purple-900 hover:bg-white/90 font-bold text-lg px-8 py-3"
              >
                Завершить игру
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
