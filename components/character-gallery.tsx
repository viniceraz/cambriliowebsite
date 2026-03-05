"use client"

import { RpgPanel } from "@/components/rpg-panel"

export function CharacterGallery() {
  const names = ["geo", "1ogic", "benzz", "astariste", "cyril", "accipiter"]

  const characters = names.map((name, i) => {
    const id = i + 1
    return {
      id,
      name,
      image: `/gallery/${id}.png`,
    }
  })

  return (
    <section className="py-16 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {characters.map((character) => (
            <RpgPanel
              key={character.id}
              className="group cursor-pointer hover:scale-105 transition-transform duration-300"
            >
              <div className="aspect-square bg-secondary/50 rounded mb-4 overflow-hidden">
                <img
                  src={character.image}
                  alt={character.name}
                  className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
                  draggable={false}
                />
              </div>

              <h3 className="text-xl font-bold font-[family-name:var(--font-cinzel)] text-primary text-center">
                {character.name}
              </h3>
            </RpgPanel>
          ))}
        </div>
      </div>
    </section>
  )
}