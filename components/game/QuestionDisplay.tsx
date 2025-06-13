"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import type { Question } from "@/types/game"
import { useGame } from "@/contexts/GameContext"
import { Clock, CheckCircle } from "lucide-react"

interface QuestionDisplayProps {
  question: Question
  onAnswer: (answer: string | string[] | number[]) => void
}

export default function QuestionDisplay({ question, onAnswer }: QuestionDisplayProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([])
  const [textAnswer, setTextAnswer] = useState("")
  const [timeLeft, setTimeLeft] = useState(question.timeLimit)
  const [answered, setAnswered] = useState(false)
  const { gameSession } = useGame()

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (!answered) {
            handleSubmit()
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [answered])

  const handleOptionSelect = (optionIndex: number) => {
    if (answered) return

    if (question.type === "MULTIPLE_CHOICE") {
      setSelectedAnswers([optionIndex])
    } else if (question.type === "MULTIPLE_SELECT") {
      setSelectedAnswers((prev) =>
        prev.includes(optionIndex) ? prev.filter((i) => i !== optionIndex) : [...prev, optionIndex],
      )
    }
  }

  const handleSubmit = () => {
    if (answered) return

    let answer: string | string[] | number[]

    switch (question.type) {
      case "MULTIPLE_CHOICE":
      case "MULTIPLE_SELECT":
        answer = selectedAnswers
        break
      case "TEXT_INPUT":
        answer = textAnswer.trim()
        break
      default:
        answer = []
    }

    onAnswer(answer)
    setAnswered(true)
  }

  const progressPercentage = (timeLeft / question.timeLimit) * 100

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">Вопрос</CardTitle>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4" />
            <span className={timeLeft <= 5 ? "text-red-500 font-bold" : ""}>{timeLeft}с</span>
          </div>
        </div>
        <Progress value={progressPercentage} className="h-2 transition-all duration-1000 ease-linear" />
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="text-xl font-medium text-center p-4 bg-gray-50 rounded-lg">{question.question}</div>

        {question.type === "MULTIPLE_CHOICE" && (
          <div className="space-y-3">
            {question.options?.map((option, index) => (
              <Button
                key={index}
                variant={selectedAnswers.includes(index) ? "default" : "outline"}
                className="w-full text-left justify-start h-auto p-4"
                onClick={() => handleOptionSelect(index)}
                disabled={answered}
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center">
                    {selectedAnswers.includes(index) && <CheckCircle className="w-4 h-4" />}
                  </div>
                  <span>{option}</span>
                </div>
              </Button>
            ))}
          </div>
        )}

        {question.type === "MULTIPLE_SELECT" && (
          <div className="space-y-3">
            {question.options?.map((option, index) => (
              <Button
                key={index}
                variant={selectedAnswers.includes(index) ? "default" : "outline"}
                className="w-full text-left justify-start h-auto p-4"
                onClick={() => handleOptionSelect(index)}
                disabled={answered}
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded border-2 flex items-center justify-center">
                    {selectedAnswers.includes(index) && <CheckCircle className="w-4 h-4" />}
                  </div>
                  <span>{option}</span>
                </div>
              </Button>
            ))}
          </div>
        )}

        {question.type === "TEXT_INPUT" && (
          <div className="space-y-3">
            <Input
              type="text"
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              placeholder="Введите ваш ответ"
              className="w-full p-4 border rounded-lg text-lg"
              disabled={answered}
              onKeyPress={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>
        )}

        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">Баллов за правильный ответ: {question.points}</div>

          {!answered && timeLeft > 0 && (
            <Button
              onClick={handleSubmit}
              size="lg"
              disabled={
                (question.type === "TEXT_INPUT" && textAnswer.trim() === "") ||
                ((question.type === "MULTIPLE_CHOICE" || question.type === "MULTIPLE_SELECT") &&
                  selectedAnswers.length === 0)
              }
            >
              Ответить
            </Button>
          )}

          {answered && <div className="text-green-600 font-medium">Ответ отправлен!</div>}
        </div>
      </CardContent>
    </Card>
  )
}
