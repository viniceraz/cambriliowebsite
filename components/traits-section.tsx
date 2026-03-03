"use client"

import { RpgPanel } from "@/components/rpg-panel"
import { useLanguage } from "@/components/language-provider"

export function TraitsSection() {
  const { t } = useLanguage()

  const traits = [
    { name: "Backgrounds", count: 11 },
    { name: "Skins", count: 10 },
    { name: "Heads", count: 22 },
    { name: "Hairs", count: 12 },
    { name: "Armors", count: 13 },
    { name: "Objects", count: 16 },
    { name: "Weapons", count: 31 },
    { name: "1/1", count: 16 },
  ]

  return (
    <section className="py-24 px-4">
      <div className="container mx-auto max-w-6xl">
        <h2 className="text-4xl md:text-5xl font-bold font-[family-name:var(--font-cinzel)] mb-12 text-center text-primary">
          {t("traits.title")}
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {traits.map((trait, index) => (
            <RpgPanel key={index} className="text-center">
              <div className="text-2xl font-bold font-[family-name:var(--font-cinzel)] text-primary mb-1">
                {trait.count}
              </div>
              <div className="text-sm text-muted-foreground uppercase tracking-wider">{trait.name}</div>
            </RpgPanel>
          ))}
        </div>
      </div>
    </section>
  )
}
