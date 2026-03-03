"use client"

import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/language-provider"

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage()

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setLanguage(language === "en" ? "zh" : "en")}
      className="border-primary/30 bg-secondary/50 hover:bg-primary/20 text-foreground font-medium"
    >
      {language === "en" ? "中文" : "EN"}
    </Button>
  )
}
