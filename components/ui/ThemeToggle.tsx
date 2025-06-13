"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useTheme } from "@/contexts/ThemeContext"
import { Sun, Moon, Monitor } from "lucide-react"

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const themes = [
    { value: "light", label: "Светлая", icon: Sun },
    { value: "dark", label: "Темная", icon: Moon },
  ]

  const currentTheme = themes.find((t) => t.value === theme)
  const CurrentIcon = currentTheme?.icon || Monitor

  // Показываем базовую кнопку до монтирования
  if (!mounted) {
    return (
      <Button variant="outline" size="sm" className="profile-button gap-2">
        <Monitor className="h-4 w-4" />
        <span className="hidden sm:inline">Тема</span>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="profile-button gap-2">
          <CurrentIcon className="h-4 w-4" />
          <span className="hidden sm:inline">{currentTheme?.label || "Тема"}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {themes.map((t) => {
          const Icon = t.icon
          return (
            <DropdownMenuItem key={t.value} onClick={() => setTheme(t.value as any)} className="gap-2">
              <Icon className="h-4 w-4" />
              {t.label}
              {theme === t.value && <span className="ml-auto">✓</span>}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
