"use client"

import { useState } from "react"

interface WLItem {
  address: string
  type: "GTD" | "FCFS"
  phase: string
  maxMint: number
}

export default function WLChecker() {
  const [address, setAddress] = useState("")
  const [results, setResults] = useState<WLItem[]>([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function checkWL() {
  setError("")
  setResults([])
  setLoading(true)

  const wallet = address.trim().toLowerCase()

  if (!wallet.startsWith("0x") || wallet.length !== 42) {
    setLoading(false)
    setError("Invalid wallet address")
    return
  }

  try {
    const files = [
      "/wl/founders.json",
      "/wl/islands.json",
      "/wl/collabs.json",
    ]

    const responses = await Promise.all(
      files.map(async (file) => {
        try {
          const res = await fetch(file)
          if (!res.ok) return []
          const text = await res.text()
          return JSON.parse(text)
        } catch {
          return []
        }
      })
    )

    const matches: WLItem[] = []

    for (const list of responses) {
      const found = list.find((w: WLItem) => w.address === wallet)
      if (found) matches.push(found)
    }

    if (matches.length === 0) {
      setError("Address not eligible in any phase")
    } else {
      setResults(matches)
    }
  } finally {
    setLoading(false)
  }
}
  return (
    <div className="max-w-md mx-auto space-y-4">
      <input
        type="text"
        placeholder="Enter your wallet address"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        className="w-full px-4 py-2 border rounded"
      />

      <button
        onClick={checkWL}
        disabled={loading}
        className="w-full bg-yellow-500 text-black py-2 rounded font-bold disabled:opacity-50"
      >
        {loading ? "Checking..." : "Check Eligibility"}
      </button>

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((r) => (
            <div
              key={r.phase}
              className="border p-4 rounded bg-black text-yellow-400"
            >
              <p className="font-bold">✅ {r.phase} Phase</p>
              <p>Type: {r.type}</p>
              <p>Max Mint: {r.maxMint}</p>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="text-red-500 font-semibold">
          {error}
        </div>
      )}
    </div>
  )
}