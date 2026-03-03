"use client"

import { RpgPanel } from "@/components/rpg-panel"
import { RuneButton } from "@/components/rune-button"
import { useLanguage } from "@/components/language-provider"
import { ExternalLink } from "lucide-react"

export function MintSection() {
  const { t } = useLanguage()

  return (
    <section className="py-24 px-4">
      <div className="container mx-auto max-w-3xl">
        <RpgPanel glow className="text-center">
          <h2 className="text-4xl md:text-5xl font-bold font-[family-name:var(--font-cinzel)] mb-4 text-primary">
            {t("mint.title")}
          </h2>
          <p className="text-lg text-foreground/80 mb-8 leading-relaxed">{t("mint.desc")}</p>
          <a href="" target="_blank" rel="noopener noreferrer" className="inline-block">
            <RuneButton variant="primary" className="group">
              <span className="flex items-center gap-2">
                {t("mint.button")}
                <ExternalLink className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </RuneButton>
          </a>
        </RpgPanel>
      </div>
    </section>
  )
}
