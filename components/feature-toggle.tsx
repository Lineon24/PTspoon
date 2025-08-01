"use client"

import { cn } from "@/lib/utils"

interface FeatureToggleProps {
  id:string;
  type:string;
  description: string;
  emoji:string;
  isSelected: boolean;
  onToggle: () => void;
}

export function FeatureToggle({ type,emoji,description, isSelected, onToggle }: FeatureToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "border-2 bg-white dark:bg-gray-800 rounded-lg p-2 text-center transition-all duration-200 flex flex-col items-center justify-center h-28",
        isSelected
          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-md"
          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600",
      )}
    >
      <div className="text-2xl mb-1">{emoji}</div>
      <p className="font-bold text-xs text-gray-800 dark:text-gray-200">{type}</p>
      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">{description}</p>
    </button>
  )
}
