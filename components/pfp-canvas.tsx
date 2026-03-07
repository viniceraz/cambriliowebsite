"use client"

import { useEffect, useRef, useCallback } from "react"
import { TRAIT_CATEGORIES, getTraitPath } from "@/lib/traits"

const OUTPUT_SIZE = 1000

interface PfpCanvasProps {
  selections: Record<string, string | null>
  customBackground?: string | null
  topCaption?: string
  bottomCaption?: string
}

export function PfpCanvas({
  selections,
  customBackground,
  topCaption,
  bottomCaption,
}: PfpCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const drawCanvas = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.imageSmoothingEnabled = false

    // --- Draw custom background (cover mode) ---
    if (customBackground) {
      try {
        const bg = await loadImage(customBackground)
        drawCover(ctx, bg, canvas.width, canvas.height)
      } catch (err) {
        console.warn("Failed to load custom background:", err)
      }
    }

    // --- Draw trait layers in order ---
    for (const category of TRAIT_CATEGORIES) {
      const selected = selections[category.id]
      if (!selected) continue

      const path = getTraitPath(category.folder, selected)

      try {
        const img = await loadImage(path)
        drawCover(ctx, img, canvas.width, canvas.height)
      } catch (err) {
        console.warn(`Failed to load trait "${category.id}":`, err)
      }
    }

    // --- Draw captions (meme-style) ---
    drawMemeCaption(ctx, topCaption, "top", canvas.width, canvas.height)
    drawMemeCaption(ctx, bottomCaption, "bottom", canvas.width, canvas.height)
  }, [selections, customBackground, topCaption, bottomCaption])

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Image load failed: ${src}`))
    img.src = src
  })
}

/**
 * Draw an image using "cover" mode – fills the canvas without distortion,
 * cropping overflow from the center.
 */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  canvasW: number,
  canvasH: number
) {
  const imgRatio = img.width / img.height
  const canvasRatio = canvasW / canvasH

  let sx = 0
  let sy = 0
  let sw = img.width
  let sh = img.height

  if (imgRatio > canvasRatio) {
    // image is wider → crop sides
    sw = img.height * canvasRatio
    sx = (img.width - sw) / 2
  } else {
    // image is taller → crop top/bottom
    sh = img.width / canvasRatio
    sy = (img.height - sh) / 2
  }

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvasW, canvasH)
}

/**
 * Draw a meme-style caption with word-wrap, outline, and subtle drop shadow.
 */
function drawMemeCaption(
  ctx: CanvasRenderingContext2D,
  text: string | undefined,
  position: "top" | "bottom",
  canvasW: number,
  canvasH: number
) {
  if (!text || text.trim() === "") return

  const upperText = text.toUpperCase()
  const maxWidth = canvasW * 0.9
  const fontSize = Math.round(canvasW * 0.07) // 7% of canvas width
  const lineHeight = fontSize * 1.15

  ctx.font = `bold ${fontSize}px Impact, "Arial Black", sans-serif`
  ctx.textAlign = "center"
  ctx.textBaseline = "top"

  // Word-wrap
  const lines = wrapText(ctx, upperText, maxWidth)

  // Calculate vertical start
  const totalHeight = lines.length * lineHeight
  const padding = canvasH * 0.03

  let startY: number
  if (position === "top") {
    startY = padding
  } else {
    startY = canvasH - totalHeight - padding
  }

  // Draw each line with outline + fill
  const outlineWidth = Math.max(4, Math.round(fontSize * 0.08))

  for (let i = 0; i < lines.length; i++) {
    const x = canvasW / 2
    const y = startY + i * lineHeight

    // Shadow
    ctx.save()
    ctx.shadowColor = "rgba(0,0,0,0.6)"
    ctx.shadowBlur = 8
    ctx.shadowOffsetX = 2
    ctx.shadowOffsetY = 2
    ctx.fillStyle = "white"
    ctx.fillText(lines[i], x, y)
    ctx.restore()

    // Black outline
    ctx.lineWidth = outlineWidth
    ctx.strokeStyle = "black"
    ctx.lineJoin = "round"
    ctx.strokeText(lines[i], x, y)

    // White fill
    ctx.fillStyle = "white"
    ctx.fillText(lines[i], x, y)
  }
}

/**
 * Break text into lines that fit within maxWidth.
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ""

  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = test
    }
  }

  if (current) lines.push(current)

  return lines.length > 0 ? lines : [""]
}

// ---------------------------------------------------------------------------
// Download helper
// ---------------------------------------------------------------------------

export function downloadCanvas(
  canvasElement: HTMLCanvasElement | null,
  filename = "cambrilio-pfp.png"
) {
  if (!canvasElement) return

  const offscreen = document.createElement("canvas")
  offscreen.width = OUTPUT_SIZE
  offscreen.height = OUTPUT_SIZE

  const ctx = offscreen.getContext("2d")
  if (!ctx) return

  ctx.imageSmoothingEnabled = false
  ctx.drawImage(canvasElement, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE)

  const link = document.createElement("a")
  link.download = filename
  link.href = offscreen.toDataURL("image/png")
  link.click()
}
