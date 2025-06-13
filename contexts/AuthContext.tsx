"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  reload,
  type User,
} from "firebase/auth"
import { auth } from "@/lib/firebase/config"

interface AuthContextType {
  user: User | null
  isAdmin: boolean
  loading: boolean
  emailVerified: boolean
  signIn: (email: string, password: string) => Promise<any>
  signUp: (email: string, password: string) => Promise<any>
  signInWithGoogle: () => Promise<any>
  logout: () => Promise<void>
  sendVerificationEmail: () => Promise<void>
  refreshUser: () => Promise<void>
  requireEmailVerification: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const ADMIN_EMAIL = "bukatinmaksimilian6@gmail.com"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [emailVerified, setEmailVerified] = useState(false)

  const isAdmin = user?.email === ADMIN_EMAIL
  const requireEmailVerification = user && !user.emailVerified && !isAdmin

  useEffect(() => {
    setMounted(true)

    // Проверяем, что auth инициализирован
    if (!auth) {
      console.error("Firebase auth не инициализирован")
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          // Обновляем данные пользователя для получения актуального статуса верификации
          await reload(user)
          setUser(user)
          setEmailVerified(user.emailVerified)
        } else {
          setUser(null)
          setEmailVerified(false)
        }
      } catch (error) {
        console.error("Ошибка при обновлении пользователя:", error)
      } finally {
        setLoading(false)
      }
    })

    return unsubscribe
  }, [])

  const signIn = async (email: string, password: string) => {
    if (!auth) throw new Error("Firebase auth не инициализирован")

    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    // Обновляем данные пользователя после входа
    await reload(userCredential.user)
    return userCredential
  }

  const signUp = async (email: string, password: string) => {
    if (!auth) throw new Error("Firebase auth не инициализирован")

    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    // Автоматически отправляем письмо подтверждения
    if (userCredential.user && !userCredential.user.emailVerified) {
      await sendEmailVerification(userCredential.user)
    }
    return userCredential
  }

  const signInWithGoogle = async () => {
    if (!auth) throw new Error("Firebase auth не инициализирован")

    const provider = new GoogleAuthProvider()
    const userCredential = await signInWithPopup(auth, provider)
    return userCredential
  }

  const logout = async () => {
    if (!auth) throw new Error("Firebase auth не инициализирован")
    await signOut(auth)
  }

  const sendVerificationEmail = async () => {
    if (user && !user.emailVerified) {
      await sendEmailVerification(user)
    }
  }

  const refreshUser = async () => {
    if (user) {
      await reload(user)
      setEmailVerified(user.emailVerified)
    }
  }

  // Показываем loading до монтирования
  if (!mounted) {
    return (
      <AuthContext.Provider
        value={{
          user: null,
          isAdmin: false,
          loading: true,
          emailVerified: false,
          signIn,
          signUp,
          signInWithGoogle,
          logout,
          sendVerificationEmail,
          refreshUser,
          requireEmailVerification: false,
        }}
      >
        {children}
      </AuthContext.Provider>
    )
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        loading,
        emailVerified: user?.emailVerified || false,
        signIn,
        signUp,
        signInWithGoogle,
        logout,
        sendVerificationEmail,
        refreshUser,
        requireEmailVerification: !!requireEmailVerification,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
