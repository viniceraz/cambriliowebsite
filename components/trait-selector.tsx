"use client"

import { cn } from "@/lib/utils"
import { getTraitDisplayName, getTraitPath, type TraitCategory } from "@/lib/traits"
import { X } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

interface TraitSelectorProps {
  category: TraitCategory
  selected: string | null
  onSelect: (item: string | null) => void
}

export function TraitSelector({ category, selected, onSelect }: TraitSelectorProps) {
  const { language } = useLanguage()
  const label = language === "zh" ? category.labelZh : category.label

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold font-serif text-primary uppercase tracking-wider">
          {label}
        </h3>
        {selected && (
          <button
            onClick={() => onSelect(null)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
            aria-label={`Clear ${label}`}
          >
            <X size={12} />
            <span className="sr-only">Clear</span>
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
        {category.items.map((item) => {
          const isSelected = selected === item
          const displayName = getTraitDisplayName(item)
          const thumbPath = getTraitPath(category.folder, item)

          return (
            <button
              key={item}
              onClick={() => onSelect(isSelected ? null : item)}
              className={cn(
                "relative group flex flex-col items-center gap-1 p-1.5 rounded border transition-all duration-200",
                isSelected
                  ? "border-primary bg-primary/15 shadow-[0_0_8px_rgba(196,159,70,0.3)]"
                  : "border-border/50 bg-secondary/30 hover:border-primary/50 hover:bg-secondary/60"
              )}
              title={displayName}
            >
              <div className="relative w-full aspect-square rounded-sm overflow-hidden bg-secondary/50">
                <img
                  src={thumbPath}
                  alt={displayName}
                  className="w-full h-full object-cover"
                  style={{ imageRendering: "pixelated" }}
                  loading="lazy"
                />
              </div>
              <span className="text-[9px] leading-tight text-center text-muted-foreground group-hover:text-foreground truncate w-full">
                {displayName}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
