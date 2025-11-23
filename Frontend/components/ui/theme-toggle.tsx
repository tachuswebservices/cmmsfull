"use client"

import * as React from "react"
import { Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { setTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-white hover:bg-white/10"
      onClick={() => setTheme("light")}
    >
      <Sun className="h-[1.2rem] w-[1.2rem]" />
      <span className="sr-only">Theme</span>
    </Button>
  )
}
