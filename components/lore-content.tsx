"use client"

import { RpgPanel } from "@/components/rpg-panel"
import { useLanguage } from "@/components/language-provider"

export function LoreContent() {
  const { t } = useLanguage()

  const loreEntries = [
    {
      title: t("lore.origin.title"),
      content: t("lore.origin.text"),
    },
    {
      title: t("lore.world.title"),
      content: t("lore.world.text"),
    },
  ]

  return (
    <section className="py-16 px-4">
      <div className="container mx-auto max-w-4xl space-y-12">
        {loreEntries.map((entry, index) => (
          <RpgPanel key={index} className="scroll-panel">
            <h2 className="text-3xl md:text-4xl font-bold font-[family-name:var(--font-cinzel)] mb-6 text-primary">
              {entry.title}
            </h2>
            <p className="text-lg text-foreground/90 leading-relaxed">{entry.content}</p>
          </RpgPanel>
        ))}
      </div>
    </section>
  )
}
