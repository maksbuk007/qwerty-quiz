"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Clock, Info, BarChart2 } from "lucide-react"
import type { Question, Player, PlayerAnswer } from "@/types/game"

interface QuestionResultsProps {
  question: Question
  players: Record<string, Player>
  currentPlayerId?: string
  showExplanation?: boolean
}

export default function QuestionResults({
  question,
  players,
  currentPlayerId,
  showExplanation = true,
}: QuestionResultsProps) {
  const [showStats, setShowStats] = useState(true)
  const [animateStats, setAnimateStats] = useState(false)

  useEffect(() => {
    // Запускаем анимацию статистики через небольшую задержку
    const timer = setTimeout(() => {
      setAnimateStats(true)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  const getCurrentPlayer = (): Player | undefined => {
    if (!currentPlayerId) return undefined
    return players[currentPlayerId]
  }

  const getCurrentPlayerAnswer = (): PlayerAnswer | undefined => {
    const player = getCurrentPlayer()
    if (!player) return undefined
    return player.answers?.find((a) => a.questionId === question.id)
  }

  const getAnswerDistribution = () => {
    const distribution: { option: string; count: number; percentage: number; isCorrect: boolean }[] = []

    if (question.type === "MULTIPLE_CHOICE" || question.type === "MULTIPLE_SELECT") {
      const totalPlayers = Object.values(players).filter((p) => p.isConnected).length
      const answeredPlayers = Object.values(players).filter(
        (p) => p.isConnected && p.answers?.some((a) => a.questionId === question.id),
      ).length

      question.options?.forEach((option, index) => {
        const playersWithThisAnswer = Object.values(players).filter((player) => {
          const answer = player.answers?.find((a) => a.questionId === question.id)
          if (!answer) return false

          if (Array.isArray(answer.answer)) {
            return answer.answer.includes(index)
          }
          return answer.answer === index
        }).length

        const percentage = answeredPlayers > 0 ? (playersWithThisAnswer / answeredPlayers) * 100 : 0

        distribution.push({
          option,
          count: playersWithThisAnswer,
          percentage,
          isCorrect: Array.isArray(question.correctAnswers) && question.correctAnswers.includes(index),
        })
      })
    }

    return distribution
  }

  const getCorrectAnswersText = () => {
    if (question.type === "MULTIPLE_CHOICE" || question.type === "MULTIPLE_SELECT") {
      const correctOptions = (question.correctAnswers as number[]).map((index) => question.options?.[index]).join(", ")
      return correctOptions
    }

    if (question.type === "TEXT_INPUT") {
      return Array.isArray(question.correctAnswers)
        ? question.correctAnswers.join(", ")
        : question.correctAnswers.toString()
    }

    return ""
  }

  const playerAnswer = getCurrentPlayerAnswer()
  const distribution = getAnswerDistribution()
  const totalAnswered = Object.values(players).filter(
    (p) => p.isConnected && p.answers?.some((a) => a.questionId === question.id),
  ).length

  const correctAnswers = Object.values(players).filter(
    (p) => p.isConnected && p.answers?.some((a) => a.questionId === question.id && a.isCorrect),
  ).length

  const averageTime =
    Object.values(players)
      .filter((p) => p.isConnected && p.answers?.some((a) => a.questionId === question.id))
      .map((p) => p.answers?.find((a) => a.questionId === question.id)?.timeSpent || 0)
      .reduce((sum, time) => sum + time, 0) / (totalAnswered || 1)

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Результаты вопроса</span>
          <Badge variant="outline" className="cursor-pointer" onClick={() => setShowStats(!showStats)}>
            {showStats ? <Info className="w-4 h-4" /> : <BarChart2 className="w-4 h-4" />}
            {showStats ? "Объяснение" : "Статистика"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-lg font-medium p-4 bg-muted rounded-lg">{question.question}</div>

        {showStats ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {distribution.map((item, index) => (
                <div
                  key={index}
                  className={`p-3 border rounded-lg ${
                    item.isCorrect
                      ? "bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-600"
                      : "bg-gray-50 dark:bg-gray-800"
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">{item.option}</span>
                    <Badge variant={item.isCorrect ? "default" : "outline"}>
                      {item.isCorrect ? "Правильный" : "Неправильный"}
                    </Badge>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-1000 ${
                        item.isCorrect ? "bg-green-500" : "bg-blue-500"
                      }`}
                      style={{
                        width: animateStats ? `${item.percentage}%` : "0%",
                      }}
                    ></div>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {item.count} из {totalAnswered} ({Math.round(item.percentage)}%)
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 border rounded-lg bg-muted text-center">
                <div className="text-sm text-muted-foreground">Ответили</div>
                <div className="text-lg font-bold">{totalAnswered}</div>
                <div className="text-xs text-muted-foreground">игроков</div>
              </div>
              <div className="p-3 border rounded-lg bg-muted text-center">
                <div className="text-sm text-muted-foreground">Правильно</div>
                <div className="text-lg font-bold">{correctAnswers}</div>
                <div className="text-xs text-muted-foreground">
                  {totalAnswered > 0 ? Math.round((correctAnswers / totalAnswered) * 100) : 0}%
                </div>
              </div>
              <div className="p-3 border rounded-lg bg-muted text-center">
                <div className="text-sm text-muted-foreground">Среднее время</div>
                <div className="text-lg font-bold">{(averageTime / 1000).toFixed(1)}с</div>
                <div className="text-xs text-muted-foreground">на ответ</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Правильный ответ
              </h3>
              <p className="text-muted-foreground">{getCorrectAnswersText()}</p>
            </div>

            {question.explanation && (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <h3 className="font-medium mb-2">Объяснение</h3>
                <p className="text-muted-foreground">{question.explanation}</p>
              </div>
            )}
          </div>
        )}

        {playerAnswer && (
          <div className="p-4 border rounded-lg bg-primary/10">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              {playerAnswer.isCorrect ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
              Ваш ответ
            </h3>
            <div className="flex justify-between items-center">
              <div>
                {question.type === "MULTIPLE_CHOICE" || question.type === "MULTIPLE_SELECT" ? (
                  <span>
                    {Array.isArray(playerAnswer.answer)
                      ? playerAnswer.answer.map((index) => question.options?.[index as number]).join(", ")
                      : question.options?.[playerAnswer.answer as number]}
                  </span>
                ) : (
                  <span>{playerAnswer.answer}</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                {(playerAnswer.timeSpent / 1000).toFixed(1)}с
              </div>
            </div>
            <div className="mt-2 text-right font-medium">
              {playerAnswer.isCorrect ? (
                <span className="text-green-600">+{playerAnswer.points} очков</span>
              ) : (
                <span className="text-red-600">+0 очков</span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
