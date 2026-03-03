"use client"

import Link from "next/link"
import { RuneButton } from "@/components/rune-button"
import { useLanguage } from "@/components/language-provider"

export function HeroSection() {
  const { t } = useLanguage()

  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 pt-16">
      {/* Radial gradient overlay */}
      <div className="absolute inset-0 bg-gradient-radial from-primary/10 via-transparent to-transparent" />

      <div className="relative z-10 text-center max-w-5xl mx-auto">
        <div className="mb-6 inline-block">
          <div className="text-sm font-medium text-primary mb-4 tracking-widest">{t("hero.subtitle")}</div>
        </div>


        <div className="text-7xl md:text-9xl font-bold font-[family-name:var(--font-cinzel)] mb-8 text-primary text-glow">
          CAMBRILIO
        </div>

        <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
          3,333 degen PFPs forged inside the Cambria universe
        </p>

        <Link href="/lore">
          <RuneButton variant="primary">{t("hero.cta")}</RuneButton>
        </Link>
      </div>
    </section>
  )
}
