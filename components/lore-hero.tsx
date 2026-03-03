"use client"

import { useLanguage } from "@/components/language-provider"

export function LoreHero() {
  const { t } = useLanguage()

  return (
    <section className="relative min-h-[60vh] flex items-center justify-center px-4 pt-32 pb-16">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />

      <div className="relative z-10 text-center max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-7xl font-bold font-[family-name:var(--font-cinzel)] mb-6 text-primary text-glow">
          {t("lore.hero.title")}
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground">{t("lore.hero.subtitle")}</p>
      </div>
    </section>
  )
}
