"use client"

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import type { Dispatch, SetStateAction } from "react"

type SearchLogic = "AND" | "OR"

interface SearchLogicToggleProps {
  logic: SearchLogic
  onLogicChange: Dispatch<SetStateAction<SearchLogic>>
}

export function SearchLogicToggle({ logic, onLogicChange }: SearchLogicToggleProps) {
  const isOr = logic === "OR"

  const handleToggle = (checked: boolean) => {
    onLogicChange(checked ? "OR" : "AND")
  }

  return (
    <div className="flex items-center space-x-2">
      <Label htmlFor="logic-switch" className="font-bold text-lg text-gray-700 dark:text-gray-300">
        {logic}
      </Label>
      <Switch
        id="logic-switch"
        checked={isOr}
        onCheckedChange={handleToggle}
        className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-green-600"
      />
    </div>
  )
}
