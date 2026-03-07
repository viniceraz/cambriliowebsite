"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Download, Shuffle, RotateCcw, Upload, X, Type } from "lucide-react"
import { TRAIT_CATEGORIES } from "@/lib/traits"
import { PfpCanvas, downloadCanvas } from "@/components/pfp-canvas"
import { TraitSelector } from "@/components/trait-selector"
import { RpgPanel } from "@/components/rpg-panel"
import { useLanguage } from "@/components/language-provider"

export function PfpGenerator() {
  const { language } = useLanguage()
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selections, setSelections] = useState<Record<string, string | null>>(
    () => {
      const initial: Record<string, string | null> = {}
      for (const cat of TRAIT_CATEGORIES) {
        initial[cat.id] = null
      }
      return initial
    }
  )

  const [activeTab, setActiveTab] = useState(TRAIT_CATEGORIES[0].id)
  const [customBackground, setCustomBackground] = useState<string | null>(null)
  const [backgroundName, setBackgroundName] = useState<string | null>(null)
  const [topCaption, setTopCaption] = useState("")
  const [bottomCaption, setBottomCaption] = useState("")

  // ---- Handlers ----

  const handleSelect = useCallback(
    (categoryId: string, item: string | null) => {
      setSelections((prev) => ({ ...prev, [categoryId]: item }))
    },
    []
  )

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
    setCustomBackground(null)
    setBackgroundName(null)
    setTopCaption("")
    setBottomCaption("")
  }, [])

  const handleDownload = useCallback(() => {
    const container = canvasContainerRef.current
    if (!container) return
    const canvas = container.querySelector("canvas")
    downloadCanvas(canvas, "cambrilio-pfp.png")
  }, [])

  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) return

    // Validate file size (max 10 MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("Image too large. Maximum size is 10 MB.")
      return
    }

    setBackgroundName(file.name)

    const reader = new FileReader()
    reader.onload = () => {
      setCustomBackground(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Reset input so same file can be re-uploaded
    e.target.value = ""
  }

  const handleRemoveBackground = () => {
    setCustomBackground(null)
    setBackgroundName(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // ---- Init ----

  const [hasInitialized, setHasInitialized] = useState(false)
  useEffect(() => {
    if (!hasInitialized) {
      handleRandomize()
      setHasInitialized(true)
    }
  }, [hasInitialized, handleRandomize])

  const selectedCount = Object.values(selections).filter(Boolean).length
  const activeCategory = TRAIT_CATEGORIES.find((c) => c.id === activeTab)

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-5xl font-serif font-bold text-primary text-glow mb-3">
            PFP Generator
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Mix and match traits to create your unique Cambrilio character
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* ---- Left column: Preview ---- */}
          <div className="lg:w-[400px] flex-shrink-0">
            <RpgPanel glow className="sticky top-24">
              {/* Canvas */}
              <div ref={canvasContainerRef} className="mb-4">
                <PfpCanvas
                  selections={selections}
                  customBackground={customBackground}
                  topCaption={topCaption}
                  bottomCaption={bottomCaption}
                />
              </div>

              {/* Background upload */}
              <div className="mb-3">
                <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wide block mb-1.5">
                  Custom Background
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleBackgroundUpload}
                  id="backgroundUpload"
                  className="hidden"
                />

                {customBackground ? (
                  <div className="flex items-center gap-2 px-3 py-2 text-xs border border-primary/40 bg-primary/5 rounded">
                    <span className="flex-1 truncate text-foreground/80">
                      {backgroundName || "Custom image"}
                    </span>
                    <button
                      onClick={() =>
                        fileInputRef.current?.click()
                      }
                      className="text-primary hover:text-primary/80 font-semibold"
                    >
                      Change
                    </button>
                    <button
                      onClick={handleRemoveBackground}
                      className="text-destructive hover:text-destructive/80"
                      title="Remove background"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="backgroundUpload"
                    className="cursor-pointer flex items-center justify-center gap-2 px-3 py-2.5 text-xs border border-dashed border-primary/40 bg-secondary hover:bg-secondary/70 hover:border-primary/60 rounded transition-colors"
                  >
                    <Upload size={14} />
                    Upload Background Image
                  </label>
                )}
              </div>

              {/* Captions */}
              <div className="mb-4">
                <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                  <Type size={12} />
                  Meme Captions
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Top text..."
                    value={topCaption}
                    onChange={(e) => setTopCaption(e.target.value)}
                    maxLength={120}
                    className="w-full px-3 py-2 text-xs bg-secondary border border-border rounded focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-colors placeholder:text-muted-foreground/50"
                  />
                  <input
                    type="text"
                    placeholder="Bottom text..."
                    value={bottomCaption}
                    onChange={(e) => setBottomCaption(e.target.value)}
                    maxLength={120}
                    className="w-full px-3 py-2 text-xs bg-secondary border border-border rounded focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-colors placeholder:text-muted-foreground/50"
                  />
                </div>
              </div>

              {/* Selected traits pills */}
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
                        {cat.label}:
                      </span>
                      <span className="text-foreground/80 truncate max-w-[100px]">
                        {name}
                      </span>
                    </span>
                  )
                })}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleRandomize}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-serif font-semibold border-2 border-primary/50 bg-secondary hover:bg-secondary/80 rounded-sm transition-colors"
                >
                  <Shuffle size={16} />
                  Randomize
                </button>

                <button
                  onClick={handleReset}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm border-2 border-border/50 bg-secondary/50 rounded-sm hover:bg-secondary/70 transition-colors"
                  title="Reset all"
                >
                  <RotateCcw size={16} />
                </button>

                <button
                  onClick={handleDownload}
                  disabled={selectedCount === 0}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold border-2 border-primary bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 rounded-sm transition-colors"
                >
                  <Download size={16} />
                  Download
                </button>
              </div>
            </RpgPanel>
          </div>

          {/* ---- Right column: Trait selector ---- */}
          <div className="flex-1 min-w-0">
            <RpgPanel>
              <div className="flex gap-1 mb-4 overflow-x-auto pb-2">
                {TRAIT_CATEGORIES.map((cat) => {
                  const isActive = activeTab === cat.id
                  const hasSelection = !!selections[cat.id]

                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveTab(cat.id)}
                      className={`relative flex-shrink-0 px-3 py-2 text-xs font-semibold uppercase rounded-sm border transition-all duration-200 ${
                        isActive
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border/50 bg-secondary/30 hover:border-primary/30"
                      }`}
                    >
                      {cat.label}
                      {hasSelection && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary" />
                      )}
                    </button>
                  )
                })}
              </div>

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
