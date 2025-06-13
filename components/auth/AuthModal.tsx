"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/contexts/AuthContext"
import { Eye, EyeOff, Mail, Lock, Chrome, Loader2, X, CheckCircle, AlertTriangle } from "lucide-react"
import { sendEmailVerification } from "firebase/auth"
import EmailVerification from "./EmailVerification"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  defaultMode?: "login" | "register"
}

export function AuthModal({ isOpen, onClose, defaultMode = "login" }: AuthModalProps) {
  const { signIn, signUp, signInWithGoogle } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState(defaultMode)
  const [showEmailVerification, setShowEmailVerification] = useState(false)
  const [showEmailSent, setShowEmailSent] = useState(false)
  const [pendingUser, setPendingUser] = useState<any>(null)

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError("Пожалуйста, заполните все поля")
      return
    }

    setLoading(true)
    setError("")

    try {
      const userCredential = await signIn(email, password)

      // Проверяем, подтвержден ли email
      if (
        !userCredential.user.emailVerified &&
        !userCredential.user.providerData.some((p) => p.providerId === "google.com")
      ) {
        setPendingUser(userCredential.user)
        setShowEmailVerification(true)
        return
      }

      onClose()
      resetForm()
    } catch (error: any) {
      console.error("Ошибка входа:", error)
      setError(getErrorMessage(error.code))
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password || !confirmPassword) {
      setError("Пожалуйста, заполните все поля")
      return
    }

    if (password !== confirmPassword) {
      setError("Пароли не совпадают")
      return
    }

    if (password.length < 6) {
      setError("Пароль должен содержать минимум 6 символов")
      return
    }

    setLoading(true)
    setError("")

    try {
      const userCredential = await signUp(email, password)

      // Пытаемся отправить письмо подтверждения
      if (userCredential.user && !userCredential.user.emailVerified) {
        try {
          await sendEmailVerification(userCredential.user, {
            url: window.location.origin + "/verify-email",
            handleCodeInApp: true,
          })

          // Показываем уведомление об отправке письма
          setShowEmailSent(true)
          setPendingUser(userCredential.user)
        } catch (emailError: any) {
          console.error("Ошибка при отправке письма подтверждения:", emailError)

          // Если ошибка связана с лимитами, все равно показываем успех регистрации
          if (emailError.code === "auth/too-many-requests") {
            setShowEmailSent(true)
            setPendingUser(userCredential.user)
            setError("Письмо подтверждения будет отправлено позже. Аккаунт создан успешно.")
          } else {
            setError("Аккаунт создан, но не удалось отправить письмо подтверждения. Попробуйте позже.")
          }
        }
      } else {
        onClose()
        resetForm()
      }
    } catch (error: any) {
      console.error("Ошибка регистрации:", error)
      setError(getErrorMessage(error.code))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError("")

    try {
      await signInWithGoogle()
      onClose()
      resetForm()
    } catch (error: any) {
      console.error("Ошибка входа через Google:", error)
      setError(getErrorMessage(error.code))
    } finally {
      setLoading(false)
    }
  }

  const getErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case "auth/user-not-found":
        return "Пользователь с таким email не найден"
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "Неверный email или пароль"
      case "auth/email-already-in-use":
        return "Пользователь с таким email уже существует"
      case "auth/weak-password":
        return "Пароль слишком слабый"
      case "auth/invalid-email":
        return "Неверный формат email"
      case "auth/too-many-requests":
        return "Слишком много попыток. Попробуйте позже или сбросьте пароль"
      case "auth/network-request-failed":
        return "Ошибка сети. Проверьте подключение к интернету"
      case "auth/email-not-verified":
        return "Подтвердите email перед входом"
      case "auth/user-disabled":
        return "Аккаунт заблокирован"
      case "auth/operation-not-allowed":
        return "Данный способ входа отключен"
      case "auth/popup-closed-by-user":
        return "Окно входа было закрыто"
      case "auth/cancelled-popup-request":
        return "Запрос на вход был отменен"
      default:
        return "Произошла ошибка. Попробуйте еще раз"
    }
  }

  const resetForm = () => {
    setEmail("")
    setPassword("")
    setConfirmPassword("")
    setError("")
    setShowPassword(false)
    setShowConfirmPassword(false)
    setShowEmailSent(false)
  }

  const handleEmailVerified = () => {
    setShowEmailVerification(false)
    setShowEmailSent(false)
    setPendingUser(null)
    onClose()
    resetForm()
  }

  const handleResendEmail = async () => {
    if (pendingUser) {
      try {
        setLoading(true)
        await sendEmailVerification(pendingUser, {
          url: window.location.origin + "/verify-email",
          handleCodeInApp: true,
        })
        setError("")
      } catch (error: any) {
        console.error("Ошибка при повторной отправке письма:", error)
        setError("Ошибка при отправке письма. Попробуйте позже.")
      } finally {
        setLoading(false)
      }
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4 overflow-y-auto">
        <div className="w-full max-w-md my-8">
          <Card className="w-full shadow-2xl border-2">
            <CardHeader className="relative pb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="absolute right-2 top-2 h-8 w-8 p-0 hover:bg-muted"
                disabled={loading}
              >
                <X className="h-4 w-4" />
              </Button>
              <CardTitle className="text-center text-xl pr-8">
                {showEmailSent ? "Подтвердите email" : "Авторизация"}
              </CardTitle>
              <CardDescription className="text-center text-sm">
                {showEmailSent
                  ? "Мы отправили письмо с подтверждением на ваш email"
                  : "Войдите в аккаунт или создайте новый для доступа к админ-панели"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {showEmailSent ? (
                <div className="text-center space-y-4">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Аккаунт создан!</h3>
                    <p className="text-sm text-muted-foreground">
                      Мы отправили письмо с подтверждением на адрес <strong>{email}</strong>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Перейдите по ссылке в письме, чтобы подтвердить свой аккаунт
                    </p>
                    {error && (
                      <div className="flex items-center gap-2 text-orange-600 text-sm bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Button onClick={handleResendEmail} variant="outline" className="w-full" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Отправка...
                        </>
                      ) : (
                        "Отправить письмо повторно"
                      )}
                    </Button>
                    <Button onClick={onClose} className="w-full">
                      Понятно
                    </Button>
                  </div>
                </div>
              ) : (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login" className="text-sm">
                      Вход
                    </TabsTrigger>
                    <TabsTrigger value="register" className="text-sm">
                      Регистрация
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="login" className="space-y-4 mt-6">
                    <form onSubmit={handleSignIn} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signin-email" className="text-sm font-medium">
                          Email
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signin-email"
                            type="email"
                            placeholder="your@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="pl-10 h-11"
                            disabled={loading}
                            autoComplete="email"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signin-password" className="text-sm font-medium">
                          Пароль
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signin-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Введите пароль"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pl-10 pr-10 h-11"
                            disabled={loading}
                            autoComplete="current-password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-11 px-3 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                            disabled={loading}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {error && (
                        <div className="text-destructive text-sm bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                          {error}
                        </div>
                      )}

                      <Button type="submit" className="w-full h-11" disabled={loading}>
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Вход...
                          </>
                        ) : (
                          "Войти"
                        )}
                      </Button>
                    </form>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">Или</span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-11"
                      onClick={handleGoogleSignIn}
                      disabled={loading}
                    >
                      <Chrome className="mr-2 h-4 w-4" />
                      Войти через Google
                    </Button>
                  </TabsContent>

                  <TabsContent value="register" className="space-y-4 mt-6">
                    <form onSubmit={handleSignUp} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-email" className="text-sm font-medium">
                          Email
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-email"
                            type="email"
                            placeholder="your@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="pl-10 h-11"
                            disabled={loading}
                            autoComplete="email"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-password" className="text-sm font-medium">
                          Пароль
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Минимум 6 символов"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pl-10 pr-10 h-11"
                            disabled={loading}
                            autoComplete="new-password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-11 px-3 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                            disabled={loading}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirm-password" className="text-sm font-medium">
                          Подтвердите пароль
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="confirm-password"
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Повторите пароль"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="pl-10 pr-10 h-11"
                            disabled={loading}
                            autoComplete="new-password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-11 px-3 hover:bg-transparent"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            disabled={loading}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {error && (
                        <div className="text-destructive text-sm bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                          {error}
                        </div>
                      )}

                      <Button type="submit" className="w-full h-11" disabled={loading}>
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Регистрация...
                          </>
                        ) : (
                          "Зарегистрироваться"
                        )}
                      </Button>
                    </form>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">Или</span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-11"
                      onClick={handleGoogleSignIn}
                      disabled={loading}
                    >
                      <Chrome className="mr-2 h-4 w-4" />
                      Зарегистрироваться через Google
                    </Button>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <EmailVerification
        isOpen={showEmailVerification}
        onClose={() => setShowEmailVerification(false)}
        onVerified={handleEmailVerified}
      />
    </>
  )
}

// Добавляем экспорт по умолчанию для обратной совместимости
export default AuthModal
