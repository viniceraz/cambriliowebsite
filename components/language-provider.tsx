"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

type Language = "en" | "zh"

interface Translations {
  [key: string]: {
    en: string
    zh: string
  }
}

const translations: Translations = {
  "nav.home": { en: "Home", zh: "首页" },
  "nav.lore": { en: "Lore", zh: "设定" },
  "nav.characters": { en: "Characters", zh: "角色" },
  "nav.generator": { en: "Generator", zh: "生成器" },

  "hero.title": { en: "Cambrilio", zh: "Cambrilio" },
  "hero.subtitle": {
    en: "3,333 degen PFPs built inside the Cambria universe",
    zh: "基于 Cambria 游戏宇宙的 3,333 个 PFP",
  },
  "hero.cta": { en: "Explore the Codex", zh: "探索法典" },

  "about.title": { en: "The Legend Begins", zh: "传说开始" },
  "about.desc": {
    en: "Cambrilio is a collection of 3,333 PFPs built for the Cambria ecosystem. Every character is composed entirely of real in-game items — weapons, armor, gear and cosmetics pulled directly from Cambria. This collection is made for degens, grinders and players who actually understand the game.",
    zh: "Cambrilio 是一个由 3,333 个 PFP 组成的系列，专为 Cambria 生态打造。每个角色都由真实的游戏内物品组成，包括武器、护甲、装备和外观，适合真正的玩家和硬核用户。",
  },

  "stats.supply": { en: "Total Supply", zh: "总供应量" },
  "stats.price": { en: "Free Mint", zh: "免费铸造" },
  "stats.network": { en: "Network", zh: "网络" },
  "stats.status": { en: "Fan-Made", zh: "社区创作" },

  "mint.title": { en: "Claim Your Character", zh: "领取你的角色" },
  "mint.desc": {
    en: "Mint your Cambrilio and represent your playstyle, grind and identity inside Cambria.",
    zh: "铸造你的 Cambrilio，代表你在 Cambria 世界中的风格与身份。",
  },
  "mint.button": { en: "Go to Mint", zh: "前往铸造" },

  "lore.hero.title": { en: "The Lore Codex", zh: "设定法典" },
  "lore.hero.subtitle": {
    en: "Game items, onchain identity, degen culture",
    zh: "游戏道具 · 链上身份 · Degen 文化",
  },

  "lore.origin.title": { en: "Origin of Cambrilio", zh: "Cambrilio 的起源" },
  "lore.origin.text": {
    en: "Cambrilio was born directly from Cambria. This is not generic fantasy lore — every trait you see is a real item from the game. Holding a Cambrilio means repping your playstyle, your grind and your status inside the Cambria universe.",
    zh: "Cambrilio 直接诞生于 Cambria 游戏本身。这里没有虚构设定，每一个特征都是游戏中的真实物品，代表玩家的风格与地位。",
  },

  "lore.world.title": { en: "The World", zh: "世界" },
  "lore.world.text": {
    en: "Cambrilio lives inside Cambria — a high-stakes, risk-to-earn MMO built for degens. This collection is for players, traders, guilds and collectors who want an onchain identity directly tied to the game.",
    zh: "Cambrilio 存在于 Cambria 的高风险 MMO 世界中，适合追求真实竞争和链上身份的玩家与收藏者。",
  },

  "faq.title": { en: "Scroll of Knowledge", zh: "知识卷轴" },

  "characters.hero.title": { en: "The Characters", zh: "角色" },
  "characters.hero.subtitle": {
    en: "Every trait is a real Cambria item",
    zh: "每个特征都是 Cambria 的真实道具",
  },

  "traits.title": { en: "Character Traits", zh: "角色特征" },
}

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("en")

  const t = (key: string): string => {
    return translations[key]?.[language] || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider")
  }
  return context
}