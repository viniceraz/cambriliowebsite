"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Download, Shuffle, RotateCcw } from "lucide-react"
import { TRAIT_CATEGORIES } from "@/lib/traits"
import { PfpCanvas, downloadCanvas } from "@/components/pfp-canvas"
import { TraitSelector } from "@/components/trait-selector"
import { RpgPanel } from "@/components/rpg-panel"
import { useLanguage } from "@/components/language-provider"

export function PfpGenerator() {
  const { language } = useLanguage()
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const [selections, setSelections] = useState<Record<string, string | null>>(() => {
    const initial: Record<string, string | null> = {}
    for (const cat of TRAIT_CATEGORIES) {
      initial[cat.id] = null
    }
    return initial
  })

  const [activeTab, setActiveTab] = useState(TRAIT_CATEGORIES[0].id)

  const handleSelect = useCallback((categoryId: string, item: string | null) => {
    setSelections((prev) => ({ ...prev, [categoryId]: item }))
  }, [])

  const handleRandomize = useCallback(() => {
    const newSelections: Record<string, string | null> = {}
    for (const cat of TRAIT_CATEGORIES) {
      const randomIndex = Math.floor(Math.random() * cat.items.length)
      newSelections[cat.id] = cat.items[randomIndex]
    }
    setSelections(newSelections)
  }, [])

  const handleReset = useCallback(() => {
    const empty: Record<string, string | null> = {}
    for (const cat of TRAIT_CATEGORIES) {
      empty[cat.id] = null
    }
    setSelections(empty)
  }, [])

  const handleDownload = useCallback(() => {
    const container = canvasContainerRef.current
    if (!container) return
    const canvas = container.querySelector("canvas")
    downloadCanvas(canvas, "cambrilio-pfp.png")
  }, [])

  // Count selected traits
  const selectedCount = Object.values(selections).filter(Boolean).length

  // Auto-randomize on first load
  const [hasInitialized, setHasInitialized] = useState(false)
  useEffect(() => {
    if (!hasInitialized) {
      handleRandomize()
      setHasInitialized(true)
    }
  }, [hasInitialized, handleRandomize])

  const activeCategory = TRAIT_CATEGORIES.find((c) => c.id === activeTab)

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-5xl font-serif font-bold text-primary text-glow mb-3 text-balance">
            {language === "zh" ? "PFP 生成器" : "PFP Generator"}
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto text-pretty">
            {language === "zh"
              ? "混合搭配特征来创建你独一无二的 Cambrilio 角色"
              : "Mix and match traits to forge your unique Cambrilio character"}
          </p>
        </div>

        {/* Main layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: Canvas preview */}
          <div className="lg:w-[400px] flex-shrink-0">
            <RpgPanel glow className="sticky top-24">
              <div ref={canvasContainerRef} className="mb-4">
                <PfpCanvas selections={selections} />
              </div>

              {/* Trait summary */}
              <div className="flex flex-wrap gap-1.5 mb-4 min-h-[28px]">
                {TRAIT_CATEGORIES.map((cat) => {
                  const sel = selections[cat.id]
                  if (!sel) return null
                  const name = sel.replace(/\.png$/i, "")
                  return (
                    <span
                      key={cat.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded border border-primary/30 bg-primary/10 text-primary"
                    >
                      <span className="font-semibold uppercase">
                        {language === "zh" ? cat.labelZh : cat.label}:
                      </span>
                      <span className="text-foreground/80 truncate max-w-[100px]">{name}</span>
                    </span>
                  )
                })}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={handleRandomize}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-serif font-semibold border-2 border-primary/50 bg-secondary text-foreground hover:bg-secondary/80 hover:border-primary transition-all duration-200 rounded-sm"
                >
                  <Shuffle size={16} />
                  {language === "zh" ? "随机" : "Randomize"}
                </button>
                <button
                  onClick={handleReset}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-serif border-2 border-border/50 bg-secondary/50 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all duration-200 rounded-sm"
                >
                  <RotateCcw size={16} />
                </button>
                <button
                  onClick={handleDownload}
                  disabled={selectedCount === 0}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-serif font-semibold border-2 border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 rounded-sm"
                >
                  <Download size={16} />
                  {language === "zh" ? "下载" : "Download"}
                </button>
              </div>
            </RpgPanel>
          </div>

          {/* Right: Trait selectors */}
          <div className="flex-1 min-w-0">
            <RpgPanel>
              {/* Category tabs */}
              <div className="flex gap-1 mb-4 overflow-x-auto pb-2 -mx-1 px-1">
                {TRAIT_CATEGORIES.map((cat) => {
                  const isActive = activeTab === cat.id
                  const hasSelection = !!selections[cat.id]
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveTab(cat.id)}
                      className={`relative flex-shrink-0 px-3 py-2 text-xs font-serif font-semibold uppercase tracking-wider rounded-sm border transition-all duration-200 ${
                        isActive
                          ? "border-primary bg-primary/15 text-primary shadow-[0_0_8px_rgba(196,159,70,0.2)]"
                          : "border-border/50 bg-secondary/30 text-muted-foreground hover:text-foreground hover:border-primary/30"
                      }`}
                    >
                      {language === "zh" ? cat.labelZh : cat.label}
                      {hasSelection && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary" />
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Active category selector */}
              {activeCategory && (
                <TraitSelector
                  category={activeCategory}
                  selected={selections[activeCategory.id]}
                  onSelect={(item) => handleSelect(activeCategory.id, item)}
                />
              )}
            </RpgPanel>
          </div>
        </div>
      </div>
    </div>
  )
}
