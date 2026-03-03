"use client"

import { useEffect, useRef, useCallback } from "react"
import { TRAIT_CATEGORIES, getTraitPath } from "@/lib/traits"

const OUTPUT_SIZE = 1000

interface PfpCanvasProps {
  selections: Record<string, string | null>
}

export function PfpCanvas({ selections }: PfpCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const drawCanvas = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Pixel art: disable all image smoothing for crisp scaling
    ctx.imageSmoothingEnabled = false
    // @ts-expect-error -- vendor prefix for older browsers
    ctx.webkitImageSmoothingEnabled = false
    // @ts-expect-error -- vendor prefix for older browsers
    ctx.mozImageSmoothingEnabled = false
    // @ts-expect-error -- vendor prefix for older browsers
    ctx.msImageSmoothingEnabled = false

    // Draw layers in order: background, skins, hair, armor, head, weapon, objects
    for (const category of TRAIT_CATEGORIES) {
      const selected = selections[category.id]
      if (!selected) continue

      const path = getTraitPath(category.folder, selected)

      try {
        const img = await loadImage(path)

        // Use integer scaling for pixel-perfect rendering
        const scaleX = canvas.width / img.width
        const scaleY = canvas.height / img.height

        ctx.drawImage(
          img,
          0,
          0,
          img.width,
          img.height,
          0,
          0,
          img.width * scaleX,
          img.height * scaleY
        )
      } catch {
        // Skip if image fails to load
      }
    }
  }, [selections])

  useEffect(() => {
    drawCanvas()
  }, [drawCanvas])

  return (
    <canvas
      ref={canvasRef}
      width={OUTPUT_SIZE}
      height={OUTPUT_SIZE}
      className="w-full h-auto rounded-sm border-2 border-primary/30 bg-secondary/50"
      style={{ imageRendering: "pixelated" }}
    />
  )
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export function downloadCanvas(
  canvasElement: HTMLCanvasElement | null,
  filename = "cambrilio-pfp.png"
) {
  if (!canvasElement) return

  // Create an offscreen canvas at full 1000x1000 resolution for the download
  const offscreen = document.createElement("canvas")
  offscreen.width = OUTPUT_SIZE
  offscreen.height = OUTPUT_SIZE
  const offCtx = offscreen.getContext("2d")
  if (!offCtx) return

  // Disable smoothing on the offscreen canvas too
  offCtx.imageSmoothingEnabled = false
  // @ts-expect-error -- vendor prefix
  offCtx.webkitImageSmoothingEnabled = false
  // @ts-expect-error -- vendor prefix
  offCtx.mozImageSmoothingEnabled = false
  // @ts-expect-error -- vendor prefix
  offCtx.msImageSmoothingEnabled = false

  // Copy from the source canvas at full resolution
  offCtx.drawImage(canvasElement, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE)

  const link = document.createElement("a")
  link.download = filename
  link.href = offscreen.toDataURL("image/png")
  link.click()
}
