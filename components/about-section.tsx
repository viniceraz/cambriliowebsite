"use client"

import { RpgPanel } from "@/components/rpg-panel"
import { useLanguage } from "@/components/language-provider"

export function AboutSection() {
  const { t } = useLanguage()

  return (
    <section className="py-24 px-4">
      <div className="container mx-auto max-w-4xl">
        <RpgPanel glow>
          <h2 className="text-4xl md:text-5xl font-bold font-[family-name:var(--font-cinzel)] mb-6 text-primary">
            {t("about.title")}
          </h2>
          <p className="text-lg text-foreground/90 leading-relaxed">{t("about.desc")}</p>
        </RpgPanel>
      </div>
    </section>
  )
}
