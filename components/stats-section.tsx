"use client"

import { RpgPanel } from "@/components/rpg-panel"
import { useLanguage } from "@/components/language-provider"

export function StatsSection() {
  const { t } = useLanguage()

  const stats = [
    { label: t("stats.supply"), value: "3,333" },
    { label: t("stats.price"), value: "FREE" },
    { label: t("stats.network"), value: "BASE" },
    { label: t("stats.status"), value: "Community Project" },
  ]

  return (
    <section className="py-24 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <RpgPanel key={index}>
              <div className="text-center">
                <div className="text-4xl font-bold font-[family-name:var(--font-cinzel)] text-primary mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground uppercase tracking-wider">{stat.label}</div>
              </div>
            </RpgPanel>
          ))}
        </div>
      </div>
    </section>
  )
}
