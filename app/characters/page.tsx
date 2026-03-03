import { CharactersHero } from "@/components/characters-hero"
import { CharacterGallery } from "@/components/character-gallery"
import { TraitsSection } from "@/components/traits-section"

export default function CharactersPage() {
  return (
    <div className="min-h-screen">
      <CharactersHero />
      <CharacterGallery />
      <TraitsSection />
    </div>
  )
}
