import { LoreHero } from "@/components/lore-hero"
import { LoreContent } from "@/components/lore-content"
import { FaqSection } from "@/components/faq-section"

export default function LorePage() {
  return (
    <div className="min-h-screen">
      <LoreHero />
      <LoreContent />
      <FaqSection />
    </div>
  )
}
