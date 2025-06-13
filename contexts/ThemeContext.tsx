"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

type Theme = "light" | "dark"

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Только после монтирования читаем из localStorage
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("maxquiz-theme") as Theme
      if (savedTheme && ["light", "dark"].includes(savedTheme)) {
        setTheme(savedTheme)
      }
    }
  }, [])

  useEffect(() => {
    if (mounted && typeof window !== "undefined") {
      localStorage.setItem("maxquiz-theme", theme)
      // Удаляем все классы тем
      document.documentElement.classList.remove("light", "dark")
      // Добавляем текущую тему
      document.documentElement.classList.add(theme)
    }
  }, [theme, mounted])

  // Возвращаем children даже до монтирования, но с дефолтной темой
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
