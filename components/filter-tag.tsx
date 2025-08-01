"use client"

import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"
interface FilterTagProps {
  label: string
  onRemove?: () => void
}
const TypeEmojis: Record<string, string> = {
  "한식": "🍚",
  "중식": "🍜",
  "양식": "🍝",
  "일식": "🍣",
  "카페": "☕",
  "치킨": "🍗",
  "매콤한맛": "🌶️",
  "짠맛": "🧂",
  "담백한맛": "🌿",
  "얼큰한맛": "🔥",
  "달콤한맛": "🍬",
  "이국적인맛": "🌍",
  "고소한맛": "🧀",
  "새콤한맛": "🍋",
  "시원한맛": "🧊",
  "진한맛": "🍲",
  "바삭한맛": "🍤",
  "쫄깃한맛": "🍮", 
  "부드러운맛": "🥛",
  "향긋한맛": "🌸", 
  "개운한맛": "🍃",
  "감칠맛": "💪"
}
export function FilterTag({ label, onRemove }: FilterTagProps) {
  const emoji=TypeEmojis[label]||"❓"
  const displayLabel=`${emoji} ${label}`
  return (
    <Badge
      variant="secondary"
      className="flex items-center gap-1.5 py-1.5 px-3 whitespace-nowrap bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200"
    >
      <span>{displayLabel}</span>
      {onRemove&&(
      <button
        onClick={onRemove}
        className="rounded-full hover:bg-black/10 dark:hover:bg-white/20 p-0.5"
        aria-label={`Remove ${label} filter`}
      >
        <X className="h-3.5 w-3.5" />
      </button>
      )}
    </Badge>
  )
}
