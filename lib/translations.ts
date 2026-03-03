export type Language = "en" | "zh"

export interface TranslationKeys {
  "nav.home": string
  "nav.lore": string
  "nav.characters": string
  "nav.generator": string
  "hero.title": string
  "hero.subtitle": string
  "hero.cta": string
  "about.title": string
  "about.desc": string
  "stats.supply": string
  "stats.price": string
  "stats.network": string
  "stats.status": string
  "mint.title": string
  "mint.desc": string
  "mint.button": string
  "lore.hero.title": string
  "lore.hero.subtitle": string
  "lore.origin.title": string
  "lore.origin.text": string
  "lore.world.title": string
  "lore.world.text": string
  "faq.title": string
  "characters.hero.title": string
  "characters.hero.subtitle": string
  "traits.title": string
}

// Centralized translations for future expansion
export const translations: Record<keyof TranslationKeys, Record<Language, string>> = {
  "nav.home": { en: "Home", zh: "首页" },
  "nav.lore": { en: "Lore", zh: "传说" },
  "nav.characters": { en: "Characters", zh: "角色" },
  "nav.generator": { en: "Generator", zh: "生成器" },
  "hero.title": { en: "Enter the World of", zh: "进入世界" },
  "hero.subtitle": { en: "A Community project", zh: "Cambria 的粉丝致敬系列" },
  "hero.cta": { en: "Explore the Codex", zh: "探索法典" },
  "about.title": { en: "The Legend Begins", zh: "传奇开始" },
  "about.desc": {
    en: "In a realm where ancient magic meets digital artistry, 3,333 unique characters emerge. Each Cambrilio holds secrets of the Cambria universe, waiting to be discovered by worthy adventurers.",
    zh: "在古老魔法与数字艺术交汇的领域中，3,333 个独特的角色出现了。每个 Cambrilio 都拥有 Cambria 宇宙的秘密，等待着值得的冒险者去发现。",
  },
  "stats.supply": { en: "Total Supply", zh: "总供应量" },
  "stats.price": { en: "Free Mint", zh: "免费铸造" },
  "stats.network": { en: "Network", zh: "网络" },
  "stats.status": { en: "Fan-Made", zh: "粉丝创作" },
  "mint.title": { en: "Claim Your Character", zh: "领取你的角色" },
  "mint.desc": {
    en: "The portal is open. Step into the world of Cambrilio and claim your destiny.",
    zh: "传送门已开启。踏入 Cambrilio 的世界，领取你的命运。",
  },
  "mint.button": { en: "Go to Mint", zh: "前往铸造" },
  "lore.hero.title": { en: "The Lore Codex", zh: "传说法典" },
  "lore.hero.subtitle": { en: "Ancient tales inscribed in digital runes", zh: "刻在数字符文中的古老传说" },
  "lore.origin.title": { en: "Origin of Cambrilio", zh: "Cambrilio 的起源" },
  "lore.origin.text": {
    en: "Born from the mystical energies of the Cambria realm, the Cambrilio are guardians of ancient wisdom. Each character embodies unique traits passed down through generations of digital warriors.",
    zh: "诞生于 Cambria 领域的神秘能量，Cambrilio 是古老智慧的守护者。每个角色都体现了通过数代数字战士传承下来的独特特质。",
  },
  "lore.world.title": { en: "The World", zh: "世界" },
  "lore.world.text": {
    en: "A vast universe where blockchain technology meets fantasy lore. The Cambrilio inhabit various realms, each with its own mysteries and challenges.",
    zh: "区块链技术与奇幻传说交汇的广阔宇宙。Cambrilio 居住在各个领域，每个领域都有自己的秘密和挑战。",
  },
  "faq.title": { en: "Scroll of Knowledge", zh: "知识卷轴" },
  "characters.hero.title": { en: "The Characters", zh: "角色们" },
  "characters.hero.subtitle": { en: "Meet the heroes of Cambrilio", zh: "认识 Cambrilio 的英雄们" },
  "traits.title": { en: "Character Traits", zh: "角色特质" },
}
