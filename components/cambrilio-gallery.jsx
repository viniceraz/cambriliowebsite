"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/* ═══════════════════════════════════════════
   CONFIG
   ═══════════════════════════════════════════ */
const CFG = {
  OPENSEA_KEY: "f8c320a0be094849b65b94d1349e8dd5",
  ALCHEMY_KEY: "MIkjpi3axqLy1r0Z_yyln",
  SLUG: "cambrilio",
  CONTRACT: "0x4d540dd5ee4dc4a92a027b206c45605794396fb5",
  TREASURY: "0x03485B65E10bbe3238384F13cB2E6416eF89Ad24",
  OS_API: "https://api.opensea.io/api/v2",
  OS_URL: "https://opensea.io/assets/base",
  ALC_NFT: "https://base-mainnet.g.alchemy.com/nft/v3",
  PER_PAGE: 50,
};

const T = {
  bg: "#06060b", bgS: "#0b0b14", card: "#0e0e18", cardHov: "#121220",
  border: "#1a1a2c", borderL: "#252540",
  accent: "#c8ff00", accentD: "#9abf00",
  burn: "#ff4444", sweep: "#00e5ff",
  gold: "#ffd700", weth: "#627eea",
  listed: "#00ff88", notListed: "#55556a",
  white: "#f0f0f5", gray: "#8888a0",
  grayD: "#55556a", grayK: "#333345",
};

/* ═══════════════════════════════════════════
   API CALLS
   ═══════════════════════════════════════════ */
async function osGet(ep) {
  try {
    const r = await fetch(`${CFG.OS_API}${ep}`, {
      headers: { "x-api-key": CFG.OPENSEA_KEY, Accept: "application/json" },
    });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

// Fetch all NFTs with pagination (200 max per call)
async function fetchAllNFTs(onProgress) {
  let all = [], cursor = null, page = 0;
  do {
    const ep = `/collection/${CFG.SLUG}/nfts?limit=200${cursor ? `&next=${cursor}` : ""}`;
    const data = await osGet(ep);
    if (!data?.nfts) break;
    all = [...all, ...data.nfts];
    cursor = data.next || null;
    page++;
    onProgress?.(all.length);
    // Small delay to avoid rate limits
    if (cursor) await new Promise(r => setTimeout(r, 300));
  } while (cursor);
  return all;
}

// Fetch traits for filters
async function fetchTraits() {
  const data = await osGet(`/traits/${CFG.SLUG}`);
  return data?.categories || data || {};
}

// Fetch all active listings
async function fetchAllListings() {
  let all = [], cursor = null;
  do {
    const ep = `/listings/collection/${CFG.SLUG}/all?limit=100${cursor ? `&next=${cursor}` : ""}`;
    const data = await osGet(ep);
    if (!data?.listings) break;
    all = [...all, ...data.listings];
    cursor = data.next || null;
    if (cursor) await new Promise(r => setTimeout(r, 300));
  } while (cursor);
  return all;
}

// Fetch treasury owned NFTs
async function fetchTreasuryNFTs() {
  try {
    const url = `${CFG.ALC_NFT}/${CFG.ALCHEMY_KEY}/getNFTsForOwner?owner=${CFG.TREASURY}&contractAddresses[]=${CFG.CONTRACT}&withMetadata=false&pageSize=100`;
    const r = await fetch(url);
    const data = await r.json();
    return new Set((data.ownedNfts || []).map(n => n.tokenId || String(parseInt(n.id?.tokenId || "0", 16))));
  } catch { return new Set(); }
}

// Fetch collection stats
async function fetchStats() {
  return osGet(`/collections/${CFG.SLUG}/stats`);
}

/* ═══════════════════════════════════════════
   PARSE LISTINGS INTO MAP
   ═══════════════════════════════════════════ */
function parseListingsMap(listings) {
  const m = new Map();
  listings.forEach(l => {
    const offer = (l.protocol_data || l)?.parameters?.offer?.[0];
    if (offer) {
      const id = offer.identifierOrCriteria || "";
      const pw = l.price?.current?.value || "0";
      const dec = l.price?.current?.decimals || 18;
      const p = parseFloat(pw) / Math.pow(10, dec);
      const currency = l.price?.current?.currency || "ETH";
      if (id && (!m.has(id) || p < m.get(id).price)) {
        m.set(id, { price: p, currency });
      }
    }
  });
  return m;
}

/* ═══════════════════════════════════════════
   NFT CARD
   ═══════════════════════════════════════════ */
function NFTCard({ nft, listing, isTreasury }) {
  const [hov, setHov] = useState(false);
  const id = nft.identifier || "";
  const name = nft.name || `Cambrilio #${id}`;
  const img = nft.image_url || nft.display_image_url || "";
  const traits = nft.traits || [];
  const isListed = !!listing;
  const rarity = nft.rarity?.rank;

  const opensea = `${CFG.OS_URL}/${CFG.CONTRACT}/${id}`;

  return (
    <a href={opensea} target="_blank" rel="noopener noreferrer"
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? T.cardHov : T.card,
        border: `1px solid ${isTreasury ? T.sweep + "60" : isListed ? T.listed + "40" : T.border}`,
        borderRadius: 14, overflow: "hidden", textDecoration: "none",
        transition: "all 0.2s", transform: hov ? "translateY(-3px)" : "none",
        boxShadow: hov ? `0 8px 24px ${isTreasury ? T.sweep : isListed ? T.listed : T.accent}11` : "none",
      }}>
      {/* Image */}
      <div style={{ aspectRatio: "1", position: "relative", overflow: "hidden", background: T.bg }}>
        {img ? (
          <img src={img} alt={name} loading="lazy" style={{
            width: "100%", height: "100%", objectFit: "cover",
            transition: "transform 0.3s",
            transform: hov ? "scale(1.05)" : "scale(1)",
          }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}>🎨</div>
        )}

        {/* Badges */}
        <div style={{ position: "absolute", top: 6, left: 6, display: "flex", flexDirection: "column", gap: 4 }}>
          {isListed && (
            <span style={{
              background: `${T.bg}dd`, borderRadius: 6, padding: "3px 8px",
              fontSize: 10, fontWeight: 800, fontFamily: "monospace",
              color: T.listed, border: `1px solid ${T.listed}40`,
              backdropFilter: "blur(4px)",
            }}>{listing.price.toFixed(4)} ETH</span>
          )}
          {rarity && (
            <span style={{
              background: `${T.bg}dd`, borderRadius: 6, padding: "3px 8px",
              fontSize: 8, fontWeight: 700, fontFamily: "monospace",
              color: T.gold, border: `1px solid ${T.gold}30`,
            }}>RANK #{rarity}</span>
          )}
        </div>

        <div style={{ position: "absolute", top: 6, right: 6, display: "flex", flexDirection: "column", gap: 4 }}>
          {isTreasury && (
            <span style={{
              background: T.sweep, borderRadius: 6, padding: "3px 8px",
              fontSize: 8, fontWeight: 900, fontFamily: "monospace",
              color: T.bg, letterSpacing: 1,
            }}>SWEPT 🧹</span>
          )}
          {isListed && !isTreasury && (
            <span style={{
              background: `${T.listed}`, borderRadius: 6, padding: "3px 8px",
              fontSize: 8, fontWeight: 900, fontFamily: "monospace",
              color: T.bg, letterSpacing: 1,
            }}>LISTED</span>
          )}
          {!isListed && !isTreasury && (
            <span style={{
              background: `${T.grayK}cc`, borderRadius: 6, padding: "3px 8px",
              fontSize: 8, fontWeight: 700, fontFamily: "monospace",
              color: T.grayD, letterSpacing: 1, backdropFilter: "blur(4px)",
            }}>NOT LISTED</span>
          )}
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: "10px 12px 12px" }}>
        <div style={{
          fontSize: 12, fontWeight: 700, fontFamily: "monospace",
          color: T.white, whiteSpace: "nowrap", overflow: "hidden",
          textOverflow: "ellipsis", marginBottom: 6,
        }}>{name}</div>

        {/* Traits preview */}
        {traits.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {traits.slice(0, 3).map((t, i) => (
              <span key={i} style={{
                background: `${T.accent}10`, border: `1px solid ${T.accent}20`,
                borderRadius: 4, padding: "2px 6px",
                fontSize: 8, fontFamily: "monospace",
                color: T.accent, letterSpacing: 0.5,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                maxWidth: 90,
              }}>{t.value || t.trait_type}</span>
            ))}
            {traits.length > 3 && (
              <span style={{ fontSize: 8, color: T.grayD, fontFamily: "monospace", padding: "2px 4px" }}>+{traits.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </a>
  );
}

/* ═══════════════════════════════════════════
   LEFT SIDEBAR — TRAIT FILTERS
   ═══════════════════════════════════════════ */
function TraitSidebar({ traits, allNfts, activeFilters, onFilterChange, onClear }) {
  const [openCat, setOpenCat] = useState(null);

  // Build trait counts from actual NFT data if API traits are empty
  const traitCounts = {};
  if (traits && typeof traits === "object" && Object.keys(traits).length > 0) {
    // Use OpenSea traits response
    Object.entries(traits).forEach(([cat, vals]) => {
      if (typeof vals === "object" && vals !== null && Object.keys(vals).length > 0) {
        traitCounts[cat] = vals;
      }
    });
  }
  // Fallback: build from NFT data
  if (Object.keys(traitCounts).length === 0 && allNfts.length > 0) {
    allNfts.forEach(nft => {
      (nft.traits || []).forEach(t => {
        const cat = t.trait_type || t.type || "Unknown";
        const val = t.value || "None";
        if (!traitCounts[cat]) traitCounts[cat] = {};
        traitCounts[cat][val] = (traitCounts[cat][val] || 0) + 1;
      });
    });
  }

  const traitEntries = Object.entries(traitCounts).sort((a, b) => a[0].localeCompare(b[0]));
  const activeCount = Object.values(activeFilters).reduce((s, arr) => s + arr.length, 0);

  return (
    <div style={{
      width: 240, flexShrink: 0, background: T.bgS,
      border: `1px solid ${T.border}`, borderRadius: 14,
      padding: 14, height: "fit-content", position: "sticky", top: 72,
      maxHeight: "calc(100vh - 90px)", overflowY: "auto",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontSize: 11, fontWeight: 800, fontFamily: "monospace", color: T.white, letterSpacing: 2 }}>TRAITS</span>
        {activeCount > 0 && (
          <button onClick={onClear} style={{
            background: `${T.burn}20`, border: `1px solid ${T.burn}40`, borderRadius: 6,
            padding: "3px 10px", color: T.burn, fontSize: 9, fontFamily: "monospace",
            fontWeight: 700, cursor: "pointer",
          }}>CLEAR ({activeCount})</button>
        )}
      </div>

      {traitEntries.length === 0 && (
        <div style={{ fontSize: 10, color: T.grayD, fontFamily: "monospace", padding: "10px 0" }}>Loading traits...</div>
      )}

      {traitEntries.map(([category, values]) => {
        const isOpen = openCat === category;
        const valEntries = Object.entries(values).sort((a, b) => b[1] - a[1]);
        const selected = activeFilters[category] || [];
        return (
          <div key={category} style={{ marginBottom: 2 }}>
            <button onClick={() => setOpenCat(isOpen ? null : category)} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              width: "100%", background: isOpen ? `${T.accent}08` : "transparent", border: "none",
              padding: "8px 6px", cursor: "pointer", borderRadius: 6,
              color: selected.length > 0 ? T.accent : T.white,
            }}>
              <span style={{ fontSize: 10, fontFamily: "monospace", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>
                {category} {selected.length > 0 && <span style={{ color: T.accent }}>({selected.length})</span>}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 9, color: T.grayK, fontFamily: "monospace" }}>{valEntries.length}</span>
                <span style={{ fontSize: 10, color: T.grayD, transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "none" }}>▾</span>
              </div>
            </button>

            {isOpen && (
              <div style={{ maxHeight: 220, overflowY: "auto", paddingLeft: 4, marginBottom: 6, marginTop: 2 }}>
                {valEntries.map(([val, count]) => {
                  const active = selected.includes(val);
                  return (
                    <button key={val} onClick={() => onFilterChange(category, val)} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      width: "100%", background: active ? `${T.accent}12` : "transparent",
                      border: active ? `1px solid ${T.accent}25` : `1px solid transparent`,
                      borderRadius: 5, padding: "5px 8px", marginBottom: 2,
                      cursor: "pointer", transition: "all 0.15s",
                    }}>
                      <span style={{
                        fontSize: 10, fontFamily: "monospace",
                        color: active ? T.accent : T.gray,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 140,
                      }}>{val}</span>
                      <span style={{ fontSize: 9, fontFamily: "monospace", color: T.grayK, flexShrink: 0 }}>{count}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════
   STATUS FILTER (inline, goes above grid on right)
   ═══════════════════════════════════════════ */
function StatusFilter({ statusFilter, onStatusChange }) {
  const items = [
    { key: "all", label: "All", color: T.white },
    { key: "listed", label: "Listed", color: T.listed },
    { key: "not_listed", label: "Not Listed", color: T.grayD },
    { key: "swept", label: "Swept", color: T.sweep },
  ];
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {items.map(s => (
        <button key={s.key} onClick={() => onStatusChange(s.key)} style={{
          background: statusFilter === s.key ? `${s.color}18` : "transparent",
          border: `1px solid ${statusFilter === s.key ? s.color + "50" : T.border}`,
          borderRadius: 8, padding: "6px 14px",
          color: statusFilter === s.key ? s.color : T.grayD,
          fontSize: 10, fontFamily: "monospace", fontWeight: 700,
          cursor: "pointer", transition: "all 0.15s", letterSpacing: 1,
        }}>● {s.label}</button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   STATS BAR
   ═══════════════════════════════════════════ */
function StatsBar({ total, listed, swept, floor, vol }) {
  const stats = [
    { label: "TOTAL", value: total.toLocaleString(), color: T.white },
    { label: "LISTED", value: listed.toLocaleString(), color: T.listed },
    { label: "SWEPT", value: swept, color: T.sweep },
    { label: "FLOOR", value: floor ? `${floor} ETH` : "—", color: T.accent },
    { label: "VOLUME", value: vol ? `${parseFloat(vol).toFixed(2)} ETH` : "—", color: T.gold },
  ];
  return (
    <div style={{
      display: "flex", gap: 20, flexWrap: "wrap", padding: "12px 20px",
      background: T.bgS, border: `1px solid ${T.border}`, borderRadius: 10,
      marginBottom: 20,
    }}>
      {stats.map((s, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 9, fontFamily: "monospace", color: T.grayD, letterSpacing: 1.5, fontWeight: 700 }}>{s.label}</span>
          <span style={{ fontSize: 14, fontFamily: "monospace", fontWeight: 900, color: s.color }}>{s.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   SEARCH BAR
   ═══════════════════════════════════════════ */
function SearchSort({ search, onSearch, sort, onSort, count, total }) {
  return (
    <div style={{
      display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap",
    }}>
      <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
        <input
          type="text" placeholder="Search by name or #ID..."
          value={search} onChange={e => onSearch(e.target.value)}
          style={{
            width: "100%", background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 8, padding: "10px 14px 10px 36px",
            color: T.white, fontSize: 12, fontFamily: "monospace",
            outline: "none",
          }}
        />
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: T.grayD }}>🔍</span>
      </div>

      <select value={sort} onChange={e => onSort(e.target.value)} style={{
        background: T.card, border: `1px solid ${T.border}`, borderRadius: 8,
        padding: "10px 14px", color: T.white, fontSize: 11,
        fontFamily: "monospace", outline: "none", cursor: "pointer",
      }}>
        <option value="id_asc">ID ↑</option>
        <option value="id_desc">ID ↓</option>
        <option value="price_asc">Price ↑</option>
        <option value="price_desc">Price ↓</option>
        <option value="listed_first">Listed First</option>
      </select>

      <span style={{ fontSize: 10, fontFamily: "monospace", color: T.grayD }}>
        Sort:
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════ */
export default function CambrilioGallery() {
  // Data
  const [allNfts, setAllNfts] = useState([]);
  const [traits, setTraits] = useState({});
  const [listingsMap, setListingsMap] = useState(new Map());
  const [treasuryIds, setTreasuryIds] = useState(new Set());
  const [stats, setStats] = useState(null);

  // UI
  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("id_asc");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeFilters, setActiveFilters] = useState({});
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(true);

  // Load all data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [nfts, traitData, listings, treasury, collStats] = await Promise.all([
        fetchAllNFTs(setLoadProgress),
        fetchTraits(),
        fetchAllListings(),
        fetchTreasuryNFTs(),
        fetchStats(),
      ]);
      setAllNfts(nfts);
      setTraits(traitData);
      setListingsMap(parseListingsMap(listings));
      setTreasuryIds(treasury);
      setStats(collStats);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Filter logic
  const toggleFilter = (category, value) => {
    setActiveFilters(prev => {
      const curr = prev[category] || [];
      const next = curr.includes(value) ? curr.filter(v => v !== value) : [...curr, value];
      const out = { ...prev };
      if (next.length === 0) delete out[category]; else out[category] = next;
      return out;
    });
    setPage(1);
  };

  const clearFilters = () => { setActiveFilters({}); setStatusFilter("all"); setSearch(""); setPage(1); };

  // Apply filters
  const filtered = allNfts.filter(nft => {
    const id = nft.identifier || "";
    const name = (nft.name || `Cambrilio #${id}`).toLowerCase();

    // Search
    if (search && !name.includes(search.toLowerCase()) && !id.includes(search)) return false;

    // Status
    const isListed = listingsMap.has(id);
    const isSwept = treasuryIds.has(id);
    if (statusFilter === "listed" && !isListed) return false;
    if (statusFilter === "not_listed" && isListed) return false;
    if (statusFilter === "swept" && !isSwept) return false;

    // Trait filters
    for (const [cat, vals] of Object.entries(activeFilters)) {
      const nftTraits = nft.traits || [];
      const hasMatch = nftTraits.some(t =>
        (t.trait_type === cat || t.trait_type?.toLowerCase() === cat.toLowerCase()) &&
        vals.includes(t.value)
      );
      if (!hasMatch) return false;
    }

    return true;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    const idA = parseInt(a.identifier || "0");
    const idB = parseInt(b.identifier || "0");
    const listA = listingsMap.get(a.identifier || "");
    const listB = listingsMap.get(b.identifier || "");

    switch (sort) {
      case "id_asc": return idA - idB;
      case "id_desc": return idB - idA;
      case "price_asc":
        if (!listA && !listB) return idA - idB;
        if (!listA) return 1; if (!listB) return -1;
        return listA.price - listB.price;
      case "price_desc":
        if (!listA && !listB) return idA - idB;
        if (!listA) return 1; if (!listB) return -1;
        return listB.price - listA.price;
      case "listed_first":
        if (listA && !listB) return -1; if (!listA && listB) return 1;
        return idA - idB;
      default: return 0;
    }
  });

  // Pagination
  const totalPages = Math.ceil(sorted.length / CFG.PER_PAGE);
  const paginated = sorted.slice((page - 1) * CFG.PER_PAGE, page * CFG.PER_PAGE);

  const osStats = stats?.total || stats || {};

  return (
    <div style={{ background: T.bg, color: T.white, minHeight: "100vh", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* NAV */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: `${T.bg}ee`, backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${T.border}`, padding: "0 24px",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>🔥</span>
            <span style={{ fontSize: 16, fontWeight: 900, fontFamily: "monospace", letterSpacing: 3, color: T.accent }}>CAMBRILIO</span>
            <span style={{ fontSize: 11, fontFamily: "monospace", color: T.grayD, letterSpacing: 1 }}>GALLERY</span>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button onClick={() => setShowFilters(p => !p)} style={{
              background: showFilters ? `${T.accent}15` : "transparent",
              border: `1px solid ${showFilters ? T.accent + "40" : T.border}`,
              borderRadius: 6, padding: "6px 12px", cursor: "pointer",
              color: showFilters ? T.accent : T.grayD, fontSize: 10,
              fontFamily: "monospace", fontWeight: 700, letterSpacing: 1,
            }}>☰ FILTERS</button>
            <a href={`https://opensea.io/collection/${CFG.SLUG}`} target="_blank" rel="noopener noreferrer" style={{
              color: T.grayD, fontSize: 9, textDecoration: "none", fontFamily: "monospace",
              fontWeight: 700, padding: "6px 10px", border: `1px solid ${T.border}`, borderRadius: 6,
            }}>OPENSEA↗</a>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 20px 60px" }}>
        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "80px 20px" }}>
            <div style={{ fontSize: 40, marginBottom: 20 }}>🔮</div>
            <div style={{
              fontSize: 22, fontWeight: 900, fontFamily: "monospace",
              color: T.accent, letterSpacing: 2, marginBottom: 12,
            }}>LOADING COLLECTION...</div>
            <div style={{ fontSize: 12, fontFamily: "monospace", color: T.grayD, marginBottom: 20 }}>
              {loadProgress > 0 ? `${loadProgress} NFTs loaded` : "Connecting to OpenSea..."}
            </div>
            <div style={{ width: 300, height: 4, background: T.border, borderRadius: 2, margin: "0 auto", overflow: "hidden" }}>
              <div style={{
                width: `${Math.min((loadProgress / 3333) * 100, 100)}%`,
                height: "100%", background: T.accent, borderRadius: 2,
                transition: "width 0.3s",
              }} />
            </div>
          </div>
        )}

        {!loading && (
          <>
            {/* Stats */}
            <StatsBar
              total={allNfts.length}
              listed={listingsMap.size}
              swept={treasuryIds.size}
              floor={osStats.floor_price}
              vol={osStats.volume || osStats.total_volume}
            />

            {/* Search + Sort */}
            <SearchSort
              search={search} onSearch={v => { setSearch(v); setPage(1); }}
              sort={sort} onSort={setSort}
              count={sorted.length} total={allNfts.length}
            />

            {/* Active filter tags */}
            {Object.entries(activeFilters).length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                {Object.entries(activeFilters).map(([cat, vals]) =>
                  vals.map(v => (
                    <button key={`${cat}-${v}`} onClick={() => toggleFilter(cat, v)} style={{
                      background: `${T.accent}15`, border: `1px solid ${T.accent}30`,
                      borderRadius: 20, padding: "4px 12px 4px 10px",
                      color: T.accent, fontSize: 10, fontFamily: "monospace",
                      fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                    }}>
                      <span style={{ opacity: 0.6, fontSize: 8 }}>{cat}:</span> {v} <span style={{ opacity: 0.5, marginLeft: 4 }}>✕</span>
                    </button>
                  ))
                )}
              </div>
            )}

            <div style={{ display: "flex", gap: 20 }}>
              {/* LEFT — Trait Filters */}
              {showFilters && (
                <TraitSidebar
                  traits={traits}
                  allNfts={allNfts}
                  activeFilters={activeFilters}
                  onFilterChange={toggleFilter}
                  onClear={() => setActiveFilters({})}
                />
              )}

              {/* RIGHT — Status + Grid */}
              <div style={{ flex: 1 }}>
                {/* Status filter bar */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                  <StatusFilter statusFilter={statusFilter} onStatusChange={s => { setStatusFilter(s); setPage(1); }} />
                  <span style={{ fontSize: 10, fontFamily: "monospace", color: T.grayD }}>
                    {sorted.length === allNfts.length ? `${allNfts.length} NFTs` : `${sorted.length} of ${allNfts.length}`}
                  </span>
                </div>

              {/* Grid */}
              <div style={{ flex: 1 }}>
                {paginated.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 60 }}>
                    <span style={{ fontSize: 36 }}>🔮</span>
                    <div style={{ fontSize: 18, fontWeight: 900, fontFamily: "monospace", color: T.accent, marginTop: 12, letterSpacing: 2 }}>NO RESULTS</div>
                    <div style={{ fontSize: 11, color: T.grayD, fontFamily: "monospace", marginTop: 8 }}>Try adjusting your filters</div>
                  </div>
                ) : (
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(auto-fill, minmax(${showFilters ? "175px" : "200px"}, 1fr))`,
                    gap: 12,
                  }}>
                    {paginated.map(nft => (
                      <NFTCard
                        key={nft.identifier}
                        nft={nft}
                        listing={listingsMap.get(nft.identifier || "")}
                        isTreasury={treasuryIds.has(nft.identifier || "")}
                      />
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    gap: 8, marginTop: 24, flexWrap: "wrap",
                  }}>
                    <button onClick={() => setPage(1)} disabled={page === 1} style={{
                      background: T.card, border: `1px solid ${T.border}`, borderRadius: 6,
                      padding: "6px 12px", color: page === 1 ? T.grayK : T.white,
                      fontSize: 10, fontFamily: "monospace", fontWeight: 700, cursor: page === 1 ? "default" : "pointer",
                    }}>FIRST</button>

                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{
                      background: T.card, border: `1px solid ${T.border}`, borderRadius: 6,
                      padding: "6px 12px", color: page === 1 ? T.grayK : T.white,
                      fontSize: 10, fontFamily: "monospace", fontWeight: 700, cursor: page === 1 ? "default" : "pointer",
                    }}>← PREV</button>

                    {/* Page numbers */}
                    {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                      let p;
                      if (totalPages <= 7) p = i + 1;
                      else if (page <= 4) p = i + 1;
                      else if (page >= totalPages - 3) p = totalPages - 6 + i;
                      else p = page - 3 + i;
                      return (
                        <button key={p} onClick={() => setPage(p)} style={{
                          background: p === page ? T.accent : T.card,
                          border: `1px solid ${p === page ? T.accent : T.border}`,
                          borderRadius: 6, padding: "6px 10px", minWidth: 36,
                          color: p === page ? T.bg : T.white,
                          fontSize: 10, fontFamily: "monospace", fontWeight: 800, cursor: "pointer",
                        }}>{p}</button>
                      );
                    })}

                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{
                      background: T.card, border: `1px solid ${T.border}`, borderRadius: 6,
                      padding: "6px 12px", color: page === totalPages ? T.grayK : T.white,
                      fontSize: 10, fontFamily: "monospace", fontWeight: 700, cursor: page === totalPages ? "default" : "pointer",
                    }}>NEXT →</button>

                    <button onClick={() => setPage(totalPages)} disabled={page === totalPages} style={{
                      background: T.card, border: `1px solid ${T.border}`, borderRadius: 6,
                      padding: "6px 12px", color: page === totalPages ? T.grayK : T.white,
                      fontSize: 10, fontFamily: "monospace", fontWeight: 700, cursor: page === totalPages ? "default" : "pointer",
                    }}>LAST</button>
                  </div>
                )}
              </div>
            </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center", padding: "40px 0 0", borderTop: `1px solid ${T.border}`, marginTop: 30 }}>
          <div style={{ fontSize: 9, fontFamily: "monospace", color: T.grayD, letterSpacing: 2, lineHeight: 2.2 }}>
            <div>CAMBRILIO GALLERY • BASE NETWORK</div>
            <div>POWERED BY OPENSEA + ALCHEMY</div>
          </div>
        </div>
      </div>
    </div>
  );
}
