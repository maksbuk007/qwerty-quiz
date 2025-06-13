"use client"

interface AvatarSelectorProps {
  selectedAvatar: string
  onAvatarSelect: (avatar: string) => void
  disabled?: boolean
}

// Система аватаров с животными
export const AVATARS = [
  { id: "cat", emoji: "🐱", name: "Котик", color: "bg-orange-100 dark:bg-orange-900/30" },
  { id: "dog", emoji: "🐶", name: "Собачка", color: "bg-amber-100 dark:bg-amber-900/30" },
  { id: "fox", emoji: "🦊", name: "Лисичка", color: "bg-orange-200 dark:bg-orange-800/30" },
  { id: "wolf", emoji: "🐺", name: "Волк", color: "bg-gray-200 dark:bg-gray-800/30" },
  { id: "bear", emoji: "🐻", name: "Медведь", color: "bg-amber-200 dark:bg-amber-800/30" },
  { id: "panda", emoji: "🐼", name: "Панда", color: "bg-gray-100 dark:bg-gray-900/30" },
  { id: "koala", emoji: "🐨", name: "Коала", color: "bg-gray-200 dark:bg-gray-800/30" },
  { id: "tiger", emoji: "🐯", name: "Тигр", color: "bg-orange-200 dark:bg-orange-800/30" },
  { id: "lion", emoji: "🦁", name: "Лев", color: "bg-yellow-200 dark:bg-yellow-800/30" },
  { id: "cow", emoji: "🐮", name: "Корова", color: "bg-pink-100 dark:bg-pink-900/30" },
  { id: "pig", emoji: "🐷", name: "Свинка", color: "bg-pink-200 dark:bg-pink-800/30" },
  { id: "frog", emoji: "🐸", name: "Лягушка", color: "bg-green-200 dark:bg-green-800/30" },
  { id: "monkey", emoji: "🐵", name: "Обезьянка", color: "bg-amber-200 dark:bg-amber-800/30" },
  { id: "chicken", emoji: "🐥", name: "Цыпленок", color: "bg-yellow-100 dark:bg-yellow-900/30" },
  { id: "penguin", emoji: "🐧", name: "Пингвин", color: "bg-blue-100 dark:bg-blue-900/30" },
  { id: "bird", emoji: "🐦", name: "Птичка", color: "bg-blue-200 dark:bg-blue-800/30" },
  { id: "owl", emoji: "🦉", name: "Сова", color: "bg-amber-100 dark:bg-amber-900/30" },
  { id: "eagle", emoji: "🦅", name: "Орел", color: "bg-gray-300 dark:bg-gray-700/30" },
  { id: "duck", emoji: "🦆", name: "Утка", color: "bg-yellow-200 dark:bg-yellow-800/30" },
  { id: "swan", emoji: "🦢", name: "Лебедь", color: "bg-gray-100 dark:bg-gray-900/30" },
  { id: "peacock", emoji: "🦚", name: "Павлин", color: "bg-blue-200 dark:bg-blue-800/30" },
  { id: "parrot", emoji: "🦜", name: "Попугай", color: "bg-green-200 dark:bg-green-800/30" },
  { id: "flamingo", emoji: "🦩", name: "Фламинго", color: "bg-pink-200 dark:bg-pink-800/30" },
  { id: "turtle", emoji: "🐢", name: "Черепаха", color: "bg-green-100 dark:bg-green-900/30" },
  { id: "snake", emoji: "🐍", name: "Змея", color: "bg-green-300 dark:bg-green-700/30" },
  { id: "lizard", emoji: "🦎", name: "Ящерица", color: "bg-green-200 dark:bg-green-800/30" },
  { id: "crocodile", emoji: "🐊", name: "Крокодил", color: "bg-green-300 dark:bg-green-700/30" },
  { id: "whale", emoji: "🐋", name: "Кит", color: "bg-blue-200 dark:bg-blue-800/30" },
  { id: "dolphin", emoji: "🐬", name: "Дельфин", color: "bg-blue-300 dark:bg-blue-700/30" },
  { id: "fish", emoji: "🐠", name: "Рыбка", color: "bg-blue-100 dark:bg-blue-900/30" },
  { id: "octopus", emoji: "🐙", name: "Осьминог", color: "bg-purple-200 dark:bg-purple-800/30" },
  { id: "crab", emoji: "🦀", name: "Краб", color: "bg-red-200 dark:bg-red-800/30" },
  { id: "shrimp", emoji: "🦐", name: "Креветка", color: "bg-pink-100 dark:bg-pink-900/30" },
  { id: "lobster", emoji: "🦞", name: "Омар", color: "bg-red-100 dark:bg-red-900/30" },
  { id: "squid", emoji: "🦑", name: "Кальмар", color: "bg-purple-100 dark:bg-purple-900/30" },
  { id: "shark", emoji: "🦈", name: "Акула", color: "bg-gray-300 dark:bg-gray-700/30" },
  { id: "horse", emoji: "🐴", name: "Лошадь", color: "bg-amber-200 dark:bg-amber-800/30" },
  { id: "unicorn", emoji: "🦄", name: "Единорог", color: "bg-pink-200 dark:bg-pink-800/30" },
  { id: "zebra", emoji: "🦓", name: "Зебра", color: "bg-gray-200 dark:bg-gray-800/30" },
  { id: "deer", emoji: "🦌", name: "Олень", color: "bg-amber-100 dark:bg-amber-900/30" },
  { id: "giraffe", emoji: "🦒", name: "Жираф", color: "bg-yellow-200 dark:bg-yellow-800/30" },
  { id: "elephant", emoji: "🐘", name: "Слон", color: "bg-gray-200 dark:bg-gray-800/30" },
  { id: "rhino", emoji: "🦏", name: "Носорог", color: "bg-gray-300 dark:bg-gray-700/30" },
  { id: "hippo", emoji: "🦛", name: "Бегемот", color: "bg-gray-200 dark:bg-gray-800/30" },
  { id: "camel", emoji: "🐪", name: "Верблюд", color: "bg-amber-200 dark:bg-amber-800/30" },
  { id: "llama", emoji: "🦙", name: "Лама", color: "bg-amber-100 dark:bg-amber-900/30" },
  { id: "goat", emoji: "🐐", name: "Козел", color: "bg-gray-100 dark:bg-gray-900/30" },
  { id: "sheep", emoji: "🐑", name: "Овца", color: "bg-gray-100 dark:bg-gray-900/30" },
  { id: "rabbit", emoji: "🐰", name: "Кролик", color: "bg-pink-100 dark:bg-pink-900/30" },
  { id: "hamster", emoji: "🐹", name: "Хомяк", color: "bg-amber-100 dark:bg-amber-900/30" },
  { id: "mouse", emoji: "🐭", name: "Мышка", color: "bg-gray-100 dark:bg-gray-900/30" },
  { id: "rat", emoji: "🐀", name: "Крыса", color: "bg-gray-200 dark:bg-gray-800/30" },
  { id: "chipmunk", emoji: "🐿️", name: "Бурундук", color: "bg-amber-100 dark:bg-amber-900/30" },
  { id: "hedgehog", emoji: "🦔", name: "Ежик", color: "bg-amber-200 dark:bg-amber-800/30" },
  { id: "bat", emoji: "🦇", name: "Летучая мышь", color: "bg-gray-300 dark:bg-gray-700/30" },
  { id: "bee", emoji: "🐝", name: "Пчелка", color: "bg-yellow-200 dark:bg-yellow-800/30" },
  { id: "butterfly", emoji: "🦋", name: "Бабочка", color: "bg-purple-100 dark:bg-purple-900/30" },
  { id: "spider", emoji: "🕷️", name: "Паук", color: "bg-gray-300 dark:bg-gray-700/30" },
  { id: "ant", emoji: "🐜", name: "Муравей", color: "bg-red-100 dark:bg-red-900/30" },
  { id: "ladybug", emoji: "🐞", name: "Божья коровка", color: "bg-red-200 dark:bg-red-800/30" },
  { id: "snail", emoji: "🐌", name: "Улитка", color: "bg-green-100 dark:bg-green-900/30" },
  { id: "worm", emoji: "🪱", name: "Червяк", color: "bg-pink-100 dark:bg-pink-900/30" },
  { id: "scorpion", emoji: "🦂", name: "Скорпион", color: "bg-yellow-300 dark:bg-yellow-700/30" },
  { id: "mosquito", emoji: "🦟", name: "Комар", color: "bg-gray-200 dark:bg-gray-800/30" },
  { id: "fly", emoji: "🪰", name: "Муха", color: "bg-gray-300 dark:bg-gray-700/30" },
  { id: "cricket", emoji: "🦗", name: "Сверчок", color: "bg-green-200 dark:bg-green-800/30" },
  { id: "cockroach", emoji: "🪳", name: "Таракан", color: "bg-amber-300 dark:bg-amber-700/30" },
  { id: "beetle", emoji: "🪲", name: "Жук", color: "bg-green-300 dark:bg-green-700/30" },
]

export default function AvatarSelector({ selectedAvatar, onAvatarSelect, disabled = false }: AvatarSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg bg-muted/20">
        {AVATARS.map((avatar) => (
          <button
            key={avatar.id}
            type="button"
            className={`
              w-12 h-12 rounded-lg flex items-center justify-center text-2xl transition-all duration-200 border-2
              ${avatar.color}
              ${
                selectedAvatar === avatar.id
                  ? "border-primary shadow-lg scale-110 ring-2 ring-primary/50"
                  : "border-transparent hover:border-primary/50 hover:scale-105"
              }
              ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            `}
            onClick={() => !disabled && onAvatarSelect(avatar.id)}
            title={avatar.name}
            disabled={disabled}
          >
            {avatar.emoji}
          </button>
        ))}
      </div>
      {selectedAvatar && (
        <div className="text-center">
          <span className="text-sm text-muted-foreground">
            Выбран: {AVATARS.find((a) => a.id === selectedAvatar)?.name}
          </span>
        </div>
      )}
    </div>
  )
}
