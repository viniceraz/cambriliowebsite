"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

/* ═══════════════════════════════════════════
   CONFIG
   ═══════════════════════════════════════════ */
const CONFIG = {
  BASESCAN_KEY: "NPD4GPV332XBNQ9CQNPYTDUA3YCS6UY2CF",
  OPENSEA_KEY: "f8c320a0be094849b65b94d1349e8dd5",
  ROYALTY_WALLET: "0x03485B65E10bbe3238384F13cB2E6416eF89Ad24",
  NFT_CONTRACT: "0x4d540dd5ee4dc4a92a027b206c45605794396fb5",
  COLLECTION_SLUG: "cambrilio",
  BURN_ADDRESSES: [
    "0x0000000000000000000000000000000000000000",
    "0x000000000000000000000000000000000000dead",
  ],
  BASESCAN_API: "https://api.basescan.org/api",
  OPENSEA_API: "https://api.opensea.io/api/v2",
  CHAIN: "Base",
  CHAIN_NAME: "base",
  ROYALTY_PCT: 5,
  OPENSEA_URL: "https://opensea.io/collection/cambrilio",
  BASESCAN_URL: "https://basescan.org",
  REFRESH_INTERVAL: 60000,
};

/* ═══════════════════════════════════════════
   THEME
   ═══════════════════════════════════════════ */
const T = {
  bg: "#050508", bgSection: "#0a0a10",
  card: "#0d0d15", border: "#1a1a28",
  accent: "#c8ff00", accentDim: "#8aad00",
  burn: "#ff4444", burnSoft: "#ff444430",
  sweep: "#00e5ff", sweepSoft: "#00e5ff25",
  gold: "#ffd700", goldSoft: "#ffd70020",
  white: "#f0f0f5", gray: "#8888a0",
  grayDim: "#55556a", grayDark: "#333345",
  success: "#00ff88", error: "#ff4444",
  holding: "#8888a0",
};

/* ═══════════════════════════════════════════
   API — BASESCAN
   ═══════════════════════════════════════════ */
async function fetchBaseScan(params) {
  const url = new URL(CONFIG.BASESCAN_API);
  Object.entries({ ...params, apikey: CONFIG.BASESCAN_KEY }).forEach(([k, v]) =>
    url.searchParams.append(k, v)
  );
  try {
    const res = await fetch(url.toString());
    const data = await res.json();
    if (data.status === "1" || data.message === "OK") return data.result;
    if (data.message?.includes("No transactions found")) return [];
    return typeof data.result === "string" && !isNaN(data.result) ? data.result : [];
  } catch (err) { console.error("BaseScan error:", err); return null; }
}

const getWalletBalance = () => fetchBaseScan({
  module: "account", action: "balance", address: CONFIG.ROYALTY_WALLET, tag: "latest",
}).then(r => r ? parseFloat(r) / 1e18 : null);

const getWalletTxs = () => fetchBaseScan({
  module: "account", action: "txlist", address: CONFIG.ROYALTY_WALLET,
  startblock: "0", endblock: "99999999", sort: "desc",
});

const getInternalTxs = () => fetchBaseScan({
  module: "account", action: "txlistinternal", address: CONFIG.ROYALTY_WALLET,
  startblock: "0", endblock: "99999999", sort: "desc",
});

const getNFTTransfers = () => fetchBaseScan({
  module: "account", action: "tokennfttx", contractaddress: CONFIG.NFT_CONTRACT,
  address: CONFIG.ROYALTY_WALLET, startblock: "0", endblock: "99999999", sort: "desc",
});

/* ═══════════════════════════════════════════
   API — OPENSEA
   ═══════════════════════════════════════════ */
async function fetchOpenSea(endpoint) {
  try {
    const res = await fetch(`${CONFIG.OPENSEA_API}${endpoint}`, {
      headers: { "x-api-key": CONFIG.OPENSEA_KEY, "Accept": "application/json" },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) { console.error("OpenSea error:", err); return null; }
}

const getCollectionStats = () => fetchOpenSea(`/collections/${CONFIG.COLLECTION_SLUG}/stats`);
const getCollectionEvents = () => fetchOpenSea(`/events/collection/${CONFIG.COLLECTION_SLUG}?event_type=sale&limit=50`);
const getCollectionNFTs = () => fetchOpenSea(`/collection/${CONFIG.COLLECTION_SLUG}/nfts?limit=50`);

// Fetch active listings sorted by price (floor first)
const getActiveListings = () => fetchOpenSea(
  `/listings/collection/${CONFIG.COLLECTION_SLUG}/all?limit=50`
);

// Get best listings per NFT
const getBestListings = () => fetchOpenSea(
  `/listings/collection/${CONFIG.COLLECTION_SLUG}/best?limit=50`
);

/* ═══════════════════════════════════════════
   DATA PROCESSING
   ═══════════════════════════════════════════ */
function processNFTData(nftTransfers, walletTxs) {
  const burns = [], sweeps = [], royaltyTxs = [];
  const wallet = CONFIG.ROYALTY_WALLET.toLowerCase();
  const burnAddrs = CONFIG.BURN_ADDRESSES.map(a => a.toLowerCase());

  if (Array.isArray(nftTransfers)) {
    nftTransfers.forEach(tx => {
      const to = tx.to?.toLowerCase();
      if (burnAddrs.includes(to)) {
        burns.push({ type: "burn", nftId: `#${tx.tokenID}`, tokenId: tx.tokenID, tx: tx.hash,
          time: new Date(parseInt(tx.timeStamp) * 1000), block: parseInt(tx.blockNumber) });
      }
      if (to === wallet) {
        sweeps.push({ type: "sweep", nftId: `#${tx.tokenID}`, tokenId: tx.tokenID, tx: tx.hash,
          time: new Date(parseInt(tx.timeStamp) * 1000), block: parseInt(tx.blockNumber) });
      }
    });
  }

  if (Array.isArray(walletTxs)) {
    walletTxs.forEach(tx => {
      const to = tx.to?.toLowerCase();
      const value = parseFloat(tx.value) / 1e18;
      if (to === wallet && value > 0) {
        royaltyTxs.push({ type: "royalty", nftId: "", price: value.toFixed(6), tx: tx.hash,
          time: new Date(parseInt(tx.timeStamp) * 1000), block: parseInt(tx.blockNumber), value });
      }
    });
  }
  return { burns, sweeps, royaltyTxs };
}

function processListings(listingsData) {
  const listings = new Map(); // tokenId -> { price, currency }

  if (!listingsData) return listings;

  // Handle /listings/collection/{slug}/all format
  const items = listingsData.listings || listingsData.orders || [];
  items.forEach(listing => {
    const protocol = listing.protocol_data || listing;
    const offer = protocol?.parameters?.offer?.[0];
    const consideration = protocol?.parameters?.consideration;

    if (offer) {
      const tokenId = offer.identifierOrCriteria || offer.token_id || "";
      const priceWei = listing.price?.current?.value || listing.current_price || "0";
      const decimals = listing.price?.current?.decimals || 18;
      const price = parseFloat(priceWei) / Math.pow(10, decimals);

      if (tokenId && (!listings.has(tokenId) || price < listings.get(tokenId).price)) {
        listings.set(tokenId, {
          price,
          currency: listing.price?.current?.currency || "ETH",
          orderHash: listing.order_hash,
        });
      }
    }
  });

  return listings;
}

function buildActivityFeed(burns, sweeps, royaltyTxs, salesEvents) {
  const all = [
    ...burns.map(b => ({ ...b, price: "—" })),
    ...sweeps.map(s => ({ ...s, price: "—" })),
    ...royaltyTxs,
  ];
  if (Array.isArray(salesEvents?.asset_events)) {
    salesEvents.asset_events.forEach(ev => {
      const price = ev.payment?.quantity ? (parseFloat(ev.payment.quantity) / 1e18).toFixed(6) : "—";
      if (!all.find(a => a.tx === ev.transaction)) {
        all.push({ type: "sale", nftId: ev.nft?.name || `#${ev.nft?.identifier || "?"}`, price,
          tx: ev.transaction || "", time: new Date(ev.event_timestamp || Date.now()) });
      }
    });
  }
  all.sort((a, b) => b.time - a.time);
  return all.map(item => ({ ...item, timeLabel: formatTimeAgo(item.time),
    txShort: item.tx ? `${item.tx.slice(0, 6)}...${item.tx.slice(-4)}` : "—" }));
}

function buildChartData(burns, royaltyTxs) {
  const events = [...burns.map(b => ({ ...b, evt: "burn" })), ...royaltyTxs.map(r => ({ ...r, evt: "royalty" }))];
  if (!events.length) return [];
  events.sort((a, b) => a.time - b.time);
  const map = {};
  let cumB = 0, cumR = 0;
  events.forEach(e => {
    const key = `${e.time.getFullYear()}-${String(e.time.getMonth() + 1).padStart(2, "0")}`;
    if (!map[key]) map[key] = { period: key, burned: 0, royaltiesETH: 0, totalBurned: 0, royaltiesCum: 0 };
    if (e.evt === "burn") { map[key].burned++; cumB++; }
    if (e.evt === "royalty") { map[key].royaltiesETH += e.value || 0; cumR += e.value || 0; }
    map[key].totalBurned = cumB;
    map[key].royaltiesCum = +cumR.toFixed(6);
  });
  return Object.values(map);
}

function formatTimeAgo(date) {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/* ═══════════════════════════════════════════
   NFT CAROUSEL — with listing awareness
   ═══════════════════════════════════════════ */
function NFTCarousel({ nfts, burnedIds, listings, walletBalance }) {
  const scrollRef = useRef(null);
  const animRef = useRef(null);

  // Sort NFTs: listed (by price asc) first, then unlisted, burned last
  const sortedNfts = [...nfts].sort((a, b) => {
    const idA = a.identifier || a.token_id || "";
    const idB = b.identifier || b.token_id || "";
    const burnedA = burnedIds.has(idA);
    const burnedB = burnedIds.has(idB);
    const listA = listings.get(idA);
    const listB = listings.get(idB);

    if (burnedA && !burnedB) return 1;
    if (!burnedA && burnedB) return -1;
    if (listA && !listB) return -1;
    if (!listA && listB) return 1;
    if (listA && listB) return listA.price - listB.price;
    return 0;
  });

  const items = sortedNfts.length > 2 ? [...sortedNfts, ...sortedNfts, ...sortedNfts] : sortedNfts;

  useEffect(() => {
    if (items.length < 4) return;
    const el = scrollRef.current;
    if (!el) return;
    let pos = 0;
    const singleWidth = sortedNfts.length * 184;
    const animate = () => {
      pos += 0.5;
      if (pos >= singleWidth) pos = 0;
      el.scrollLeft = pos;
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [items.length, sortedNfts.length]);

  if (nfts.length === 0) {
    return (
      <div style={{ padding: "20px 0", textAlign: "center", fontSize: 11, fontFamily: "monospace", color: T.grayDim, letterSpacing: 2 }}>
        ⏳ LOADING NFTs...
      </div>
    );
  }

  const listedCount = sortedNfts.filter(n => {
    const id = n.identifier || n.token_id || "";
    return listings.has(id) && !burnedIds.has(id);
  }).length;

  return (
    <div>
      {/* Summary bar */}
      <div style={{
        display: "flex", gap: 16, marginBottom: 14, flexWrap: "wrap",
        fontSize: 10, fontFamily: "monospace", letterSpacing: 1,
      }}>
        <span style={{ color: T.accent }}>● {listedCount} LISTED (NEXT TO BURN)</span>
        <span style={{ color: T.holding }}>● {nfts.length - listedCount - burnedIds.size} NOT LISTED</span>
        <span style={{ color: T.burn }}>● {burnedIds.size} BURNED</span>
        {walletBalance !== null && (
          <span style={{ color: T.gold }}>💰 {walletBalance.toFixed(4)} ETH AVAILABLE</span>
        )}
      </div>

      {/* Carousel */}
      <div style={{ position: "relative", overflow: "hidden", margin: "0 -24px" }}>
        <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 60, zIndex: 2, background: `linear-gradient(90deg, ${T.bgSection}, transparent)`, pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 60, zIndex: 2, background: `linear-gradient(270deg, ${T.bgSection}, transparent)`, pointerEvents: "none" }} />

        <div ref={scrollRef} style={{
          display: "flex", gap: 12, padding: "8px 60px",
          overflow: "hidden", scrollBehavior: "auto",
        }}>
          {items.map((nft, i) => {
            const id = nft.identifier || nft.token_id || "";
            const isBurned = burnedIds.has(id);
            const listing = listings.get(id);
            const isListed = !!listing && !isBurned;
            const name = nft.name || `Cambrilio #${id}`;
            const img = nft.image_url || nft.display_image_url || nft.image_thumbnail_url || "";

            // Can the wallet afford this NFT?
            const canAfford = isListed && walletBalance !== null && walletBalance >= listing.price;

            // Determine status
            let status, statusColor, statusBg, borderColor;
            if (isBurned) {
              status = "BURNED"; statusColor = T.burn; statusBg = `${T.burn}20`; borderColor = `${T.burn}60`;
            } else if (isListed) {
              status = canAfford ? "NEXT 🔥" : "LISTED";
              statusColor = canAfford ? T.bg : T.accent;
              statusBg = canAfford ? T.accent : `${T.accent}20`;
              borderColor = canAfford ? T.accent : `${T.accent}50`;
            } else {
              status = "NOT LISTED"; statusColor = T.grayDim; statusBg = `${T.grayDark}40`; borderColor = T.border;
            }

            return (
              <div key={`${id}-${i}`} style={{
                flex: "0 0 172px", width: 172, borderRadius: 12,
                border: `1px solid ${borderColor}`,
                background: T.card, overflow: "hidden", position: "relative",
              }}>
                {/* Image */}
                <div style={{ width: 172, height: 172, position: "relative", overflow: "hidden", background: T.bg }}>
                  {img ? (
                    <img src={img} alt={name} loading="lazy" style={{
                      width: "100%", height: "100%", objectFit: "cover",
                      filter: isBurned ? "grayscale(0.7) brightness(0.4)" : !isListed ? "brightness(0.6) saturate(0.5)" : "none",
                    }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, background: `linear-gradient(135deg, ${T.card}, ${T.bg})` }}>🎨</div>
                  )}

                  {/* Burn overlay */}
                  {isBurned && (
                    <div style={{
                      position: "absolute", inset: 0,
                      background: `linear-gradient(180deg, transparent 20%, ${T.burn}40 60%, ${T.burn}90 100%)`,
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", paddingBottom: 12,
                    }}>
                      <span style={{ fontSize: 30 }}>🔥</span>
                      <span style={{ fontSize: 9, fontWeight: 900, fontFamily: "monospace", color: T.white, letterSpacing: 2, textShadow: `0 0 10px ${T.burn}` }}>BURNED</span>
                    </div>
                  )}

                  {/* Status badge */}
                  {!isBurned && (
                    <div style={{
                      position: "absolute", top: 6, right: 6,
                      background: statusBg, borderRadius: 4,
                      padding: "3px 7px", fontSize: 7, fontWeight: 900,
                      fontFamily: "monospace", color: statusColor, letterSpacing: 1,
                      border: `1px solid ${borderColor}`,
                      backdropFilter: "blur(4px)",
                    }}>{status}</div>
                  )}

                  {/* Position badge for listed items */}
                  {isListed && !isBurned && (
                    <div style={{
                      position: "absolute", top: 6, left: 6,
                      background: `${T.bg}cc`, borderRadius: 4,
                      padding: "3px 7px", fontSize: 8, fontWeight: 900,
                      fontFamily: "monospace", color: T.gold, letterSpacing: 0.5,
                      border: `1px solid ${T.gold}30`,
                    }}>
                      {listing.price.toFixed(4)} ETH
                    </div>
                  )}
                </div>

                {/* Info */}
                <div style={{ padding: "8px 10px 10px" }}>
                  <div style={{
                    fontSize: 10, fontWeight: 700, fontFamily: "monospace",
                    color: isBurned ? T.burn : isListed ? T.white : T.grayDim,
                    letterSpacing: 0.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>{name}</div>
                  <div style={{
                    fontSize: 8, fontFamily: "monospace", marginTop: 3,
                    color: isBurned ? `${T.burn}88` : isListed ? (canAfford ? T.accent : T.gold) : T.grayDark,
                    letterSpacing: 1,
                  }}>
                    {isBurned ? "DESTROYED FOREVER" :
                     isListed ? (canAfford ? "READY TO SWEEP & BURN" : `NEED ${(listing.price - (walletBalance || 0)).toFixed(4)} MORE ETH`) :
                     "HOLDER NOT SELLING"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SHARED UI COMPONENTS
   ═══════════════════════════════════════════ */
function Soonbria({ subtitle, height = 200 }) {
  return (
    <div style={{ height, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, border: `1px dashed ${T.grayDark}`, borderRadius: 12, background: T.bg }}>
      <span style={{ fontSize: 36 }}>🔮</span>
      <span style={{ fontSize: 28, fontWeight: 900, letterSpacing: 2, fontFamily: "monospace", color: T.accent, textShadow: `0 0 20px ${T.accent}44` }}>SOONBRIA!</span>
      {subtitle && <span style={{ color: T.grayDim, fontSize: 11, maxWidth: 280, textAlign: "center", lineHeight: 1.5 }}>{subtitle}</span>}
    </div>
  );
}

function Flywheel() {
  const [rot, setRot] = useState(0);
  const [pulse, setPulse] = useState(0);
  useEffect(() => { const id = setInterval(() => { setRot(r => (r + 0.3) % 360); setPulse(p => (p + 0.02) % (Math.PI * 2)); }, 25); return () => clearInterval(id); }, []);
  const cx = 220, cy = 220, r = 150;
  const pos = (a, R = r) => ({ x: cx + R * Math.cos((a * Math.PI) / 180), y: cy + R * Math.sin((a * Math.PI) / 180) });
  const glow = 0.4 + Math.sin(pulse) * 0.2;
  const steps = [
    { a: 270, label: "ROYALTIES", sub: `${CONFIG.ROYALTY_PCT}% OF TRADES`, icon: "💰", color: T.gold },
    { a: 30, label: "SWEEP", sub: "BUY FLOOR NFTS", icon: "🧹", color: T.sweep },
    { a: 150, label: "BURN", sub: "REDUCE SUPPLY", icon: "🔥", color: T.burn },
  ];
  return (
    <svg viewBox="0 0 440 440" style={{ width: "100%", maxWidth: 420, margin: "0 auto", display: "block" }}>
      <defs>
        <filter id="nG"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <filter id="sG"><feGaussianBlur stdDeviation="8" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <radialGradient id="cG" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor={T.accent} stopOpacity="0.15" /><stop offset="100%" stopColor={T.bg} stopOpacity="0" /></radialGradient>
        <marker id="aG" markerWidth="10" markerHeight="7" refX="5" refY="3.5" orient="auto"><polygon points="0 0,10 3.5,0 7" fill={T.accent} opacity={glow + 0.3} /></marker>
      </defs>
      <circle cx={cx} cy={cy} r={r + 60} fill="url(#cG)" />
      <circle cx={cx} cy={cy} r={r + 30} fill="none" stroke={T.border} strokeWidth="0.5" strokeDasharray="4 4" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={T.grayDark} strokeWidth="0.8" />
      {Array.from({ length: 36 }).map((_, i) => { const a = i * 10, s = pos(a, r - 4), e = pos(a, r + 4); return <line key={i} x1={s.x} y1={s.y} x2={e.x} y2={e.y} stroke={T.grayDark} strokeWidth="0.5" />; })}
      <g style={{ transform: `rotate(${rot}deg)`, transformOrigin: `${cx}px ${cy}px` }}>
        {[0, 120, 240].map((a, i) => { const s = pos(a, r), e = pos(a + 90, r), m = pos(a + 45, r + 22); return <path key={i} d={`M${s.x} ${s.y} Q${m.x} ${m.y} ${e.x} ${e.y}`} fill="none" stroke={T.accent} strokeWidth="1.5" strokeLinecap="round" markerEnd="url(#aG)" opacity={glow} filter="url(#nG)" />; })}
      </g>
      <circle cx={cx} cy={cy} r="44" fill={T.card} stroke={T.accent} strokeWidth="1.5" filter="url(#nG)" />
      <text x={cx} y={cy - 12} textAnchor="middle" fill={T.accent} fontSize="9" fontWeight="900" letterSpacing="3" fontFamily="monospace">PERPETUAL</text>
      <text x={cx} y={cy + 4} textAnchor="middle" fill={T.white} fontSize="12" fontWeight="900" letterSpacing="2" fontFamily="monospace">FLYWHEEL</text>
      <text x={cx} y={cy + 18} textAnchor="middle" fill={T.grayDim} fontSize="7" fontFamily="monospace" letterSpacing="1">CAMBRILIO</text>
      {steps.map((step, i) => { const p = pos(step.a, r); return (<g key={i}><circle cx={p.x} cy={p.y} r="38" fill={step.color} opacity="0.06" filter="url(#sG)" /><circle cx={p.x} cy={p.y} r="34" fill={T.card} stroke={step.color} strokeWidth="1.5" /><text x={p.x} y={p.y - 6} textAnchor="middle" fontSize="18">{step.icon}</text><text x={p.x} y={p.y + 12} textAnchor="middle" fill={step.color} fontSize="7.5" fontWeight="900" fontFamily="monospace" letterSpacing="1">{step.label}</text><text x={p.x} y={p.y + 23} textAnchor="middle" fill={T.grayDim} fontSize="5.5" fontFamily="monospace">{step.sub}</text></g>); })}
    </svg>
  );
}

function StepCard({ number, title, description, color }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "20px 18px", flex: "1 1 200px", minWidth: 180, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -8, right: -4, fontSize: 64, fontWeight: 900, fontFamily: "monospace", color: color || T.accent, opacity: 0.06 }}>{number}</div>
      <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, fontFamily: "monospace", marginBottom: 10, background: `${color || T.accent}18`, color: color || T.accent, border: `1px solid ${color || T.accent}40` }}>{number}</div>
      <div style={{ fontSize: 13, fontWeight: 800, color: T.white, marginBottom: 6, fontFamily: "monospace", letterSpacing: 0.5 }}>{title}</div>
      <div style={{ fontSize: 11, color: T.gray, lineHeight: 1.6 }}>{description}</div>
    </div>
  );
}

function Metric({ label, value, sub, color, icon, loading }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "18px 16px", flex: "1 1 180px", minWidth: 155 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        {icon && <span style={{ fontSize: 14 }}>{icon}</span>}
        <span style={{ fontSize: 10, fontWeight: 700, color: T.grayDim, fontFamily: "monospace", letterSpacing: 1.5, textTransform: "uppercase" }}>{label}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 900, fontFamily: "monospace", color: loading ? T.grayDark : (color || T.white), letterSpacing: -0.5, textShadow: !loading && color ? `0 0 20px ${color}33` : "none" }}>{loading ? "..." : value}</div>
      {sub && <div style={{ fontSize: 10, color: T.grayDim, marginTop: 5, fontFamily: "monospace" }}>{sub}</div>}
    </div>
  );
}

function SupplyBar({ burned, total }) {
  const burnPct = total > 0 ? (burned / total) * 100 : 0;
  const circPct = 100 - burnPct;
  return (
    <div>
      <div style={{ display: "flex", height: 32, borderRadius: 6, overflow: "hidden", border: `1px solid ${T.border}`, marginBottom: 14 }}>
        <div style={{ width: `${circPct}%`, background: `linear-gradient(90deg, ${T.accent}40, ${T.accent}20)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, fontFamily: "monospace", color: T.accent, borderRight: burnPct > 0 ? `1px solid ${T.border}` : "none" }}>{circPct.toFixed(1)}%</div>
        {burnPct > 0 && <div style={{ width: `${Math.max(burnPct, 3)}%`, background: `linear-gradient(90deg, ${T.burn}30, ${T.burn}15)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, fontFamily: "monospace", color: T.burn, minWidth: 40 }}>{burnPct.toFixed(1)}%</div>}
      </div>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        {[{ label: "CIRCULATING", val: total - burned, color: T.accent, pct: circPct }, { label: "BURNED 🔥", val: burned, color: T.burn, pct: burnPct }].map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color }} />
            <span style={{ fontSize: 10, fontFamily: "monospace", color: T.gray, letterSpacing: 1 }}>{s.label}</span>
            <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 800, color: T.white }}>{s.val.toLocaleString()}</span>
            <span style={{ fontSize: 10, fontFamily: "monospace", fontWeight: 800, color: s.color }}>{s.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityRow({ item }) {
  const cfg = { sweep: { icon: "🧹", color: T.sweep, label: "SWEEP" }, burn: { icon: "🔥", color: T.burn, label: "BURN" }, royalty: { icon: "💰", color: T.gold, label: "ROYALTY" }, sale: { icon: "💸", color: T.accent, label: "SALE" } };
  const c = cfg[item.type] || cfg.royalty;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: `1px solid ${T.border}`, fontSize: 12, fontFamily: "monospace" }}>
      <span style={{ background: `${c.color}12`, borderRadius: 6, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0, border: `1px solid ${c.color}25` }}>{c.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, color: c.color, letterSpacing: 1, fontSize: 11 }}>{c.label} {item.nftId && <span style={{ color: T.white }}>{item.nftId}</span>}</div>
        {item.tx && item.tx !== "—" && <a href={`${CONFIG.BASESCAN_URL}/tx/${item.tx}`} target="_blank" rel="noopener noreferrer" style={{ color: T.grayDim, fontSize: 9, textDecoration: "none" }}>{item.txShort} ↗</a>}
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ color: T.white, fontWeight: 700 }}>{item.price}{item.price !== "—" ? " ETH" : ""}</div>
        <div style={{ color: T.grayDim, fontSize: 9 }}>{item.timeLabel}</div>
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 11, fontFamily: "monospace" }}>
      <div style={{ fontWeight: 800, marginBottom: 4, color: T.white, letterSpacing: 1 }}>{label}</div>
      {payload.map((p, i) => (<div key={i} style={{ color: p.color, marginBottom: 2 }}>{p.name}: <strong>{typeof p.value === "number" ? (p.value < 1 ? p.value.toFixed(6) : p.value) : p.value}</strong></div>))}
    </div>
  );
}

function NavLink({ label, active, onClick }) {
  return <button onClick={onClick} style={{ background: "none", border: "none", cursor: "pointer", color: active ? T.accent : T.grayDim, fontSize: 11, fontWeight: 800, fontFamily: "monospace", letterSpacing: 2, padding: "8px 0", borderBottom: active ? `2px solid ${T.accent}` : "2px solid transparent", transition: "all 0.2s" }}>▸{label}</button>;
}

function SectionHeader({ title, subtitle }) {
  return (<div style={{ marginBottom: 20, paddingTop: 10 }}><h2 style={{ fontSize: 22, fontWeight: 900, margin: 0, fontFamily: "monospace", letterSpacing: 2, color: T.white, textTransform: "uppercase" }}>{title}</h2>{subtitle && <p style={{ fontSize: 12, color: T.gray, margin: "6px 0 0", fontFamily: "monospace", letterSpacing: 0.5 }}>{subtitle}</p>}</div>);
}

const panelStyle = { background: T.bgSection, border: `1px solid ${T.border}`, borderRadius: 14, padding: 24, marginBottom: 20 };
const panelLabel = { fontSize: 10, fontFamily: "monospace", color: T.grayDim, letterSpacing: 2, fontWeight: 700, marginBottom: 16 };

/* ═══════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════ */
export default function CambrilioDashboard() {
  const [section, setSection] = useState("home");
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const [walletBalance, setWalletBalance] = useState(null);
  const [totalBurned, setTotalBurned] = useState(0);
  const [totalSwept, setTotalSwept] = useState(0);
  const [totalRoyaltiesETH, setTotalRoyaltiesETH] = useState(0);
  const [activityFeed, setActivityFeed] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [burnedTokenIds, setBurnedTokenIds] = useState(new Set());

  const [floorPrice, setFloorPrice] = useState(null);
  const [totalVolume, setTotalVolume] = useState(null);
  const [totalSupply, setTotalSupply] = useState(null);
  const [numOwners, setNumOwners] = useState(null);
  const [oneDayVolume, setOneDayVolume] = useState(null);
  const [oneDaySales, setOneDaySales] = useState(null);
  const [nftList, setNftList] = useState([]);
  const [activeListings, setActiveListings] = useState(new Map());

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [balance, walletTxs, nftTx, internalTxs, osStats, osEvents, osNfts, osListings] = await Promise.all([
        getWalletBalance(), getWalletTxs(), getNFTTransfers(), getInternalTxs(),
        getCollectionStats(), getCollectionEvents(), getCollectionNFTs(), getActiveListings(),
      ]);

      setWalletBalance(balance);
      const allTxs = [...(Array.isArray(walletTxs) ? walletTxs : []), ...(Array.isArray(internalTxs) ? internalTxs : [])];
      const { burns, sweeps, royaltyTxs } = processNFTData(Array.isArray(nftTx) ? nftTx : [], allTxs);

      setTotalBurned(burns.length);
      setTotalSwept(sweeps.length);
      setBurnedTokenIds(new Set(burns.map(b => b.tokenId)));
      setTotalRoyaltiesETH(royaltyTxs.reduce((s, t) => s + (t.value || 0), 0));
      setActivityFeed(buildActivityFeed(burns, sweeps, royaltyTxs, osEvents));
      setChartData(buildChartData(burns, royaltyTxs));

      if (osStats) {
        const s = osStats.total || osStats;
        setFloorPrice(s.floor_price ?? null);
        setTotalVolume(s.volume ?? s.total_volume ?? null);
        setTotalSupply(s.total_supply ?? s.count ?? null);
        setNumOwners(s.num_owners ?? null);
        setOneDayVolume(s.one_day_volume ?? null);
        setOneDaySales(s.one_day_sales ?? null);
      }

      if (osNfts?.nfts) setNftList(osNfts.nfts);
      setActiveListings(processListings(osListings));

      setLastUpdate(new Date());
    } catch (err) { console.error("Fetch error:", err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchAllData();
    const id = setInterval(fetchAllData, CONFIG.REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [fetchAllData]);

  const hasData = chartData.length > 0;
  const hasActivity = activityFeed.length > 0;
  const supply = totalSupply || 0;
  const currentSupply = supply - totalBurned;

  return (
    <div style={{ background: T.bg, color: T.white, minHeight: "100vh", fontFamily: "'Inter', -apple-system, sans-serif" }}>

      {/* NAV */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: `${T.bg}ee`, backdropFilter: "blur(12px)", borderBottom: `1px solid ${T.border}`, padding: "0 24px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>🔥</span>
            <span style={{ fontSize: 16, fontWeight: 900, fontFamily: "monospace", letterSpacing: 3, color: T.accent }}>CAMBRILIO</span>
          </div>
          <div style={{ display: "flex", gap: 20, alignItems: "center", overflowX: "auto" }}>
            {[["home", "HOME"], ["analytics", "ANALYTICS"], ["activity", "ACTIVITY"]].map(([k, l]) => (
              <NavLink key={k} label={l} active={section === k} onClick={() => setSection(k)} />
            ))}
          </div>
          <a href={CONFIG.OPENSEA_URL} target="_blank" rel="noopener noreferrer" style={{ color: T.grayDim, fontSize: 9, textDecoration: "none", fontFamily: "monospace", fontWeight: 700, letterSpacing: 1, padding: "6px 10px", border: `1px solid ${T.border}`, borderRadius: 6 }}>OPENSEA↗</a>
        </div>
      </nav>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 20px 60px" }}>

        {/* ═══ HOME ═══ */}
        {section === "home" && (<>
          {/* Hero */}
          <div style={{ textAlign: "center", padding: "50px 20px 30px", position: "relative" }}>
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 300, height: 300, borderRadius: "50%", background: `radial-gradient(circle, ${T.accent}08 0%, transparent 70%)`, pointerEvents: "none" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 16 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: loading ? T.gold : T.success, boxShadow: `0 0 8px ${loading ? T.gold : T.success}` }} />
              <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "monospace", color: loading ? T.gold : T.success, letterSpacing: 2 }}>{loading ? "SYNCING..." : "LIVE DATA"}</span>
              {lastUpdate && !loading && <span style={{ fontSize: 9, color: T.grayDim, fontFamily: "monospace" }}>• {formatTimeAgo(lastUpdate)}</span>}
            </div>
            <h1 style={{ fontSize: 42, fontWeight: 900, margin: "0 0 12px", fontFamily: "monospace", letterSpacing: 3, lineHeight: 1.1 }}>
              <span style={{ color: T.accent }}>CAMBRILIO</span><br /><span style={{ color: T.white }}>FLYWHEEL</span>
            </h1>
            <p style={{ fontSize: 14, color: T.gray, maxWidth: 460, margin: "0 auto 20px", lineHeight: 1.7 }}>
              The deflationary sweep + burn engine on <strong style={{ color: T.white }}>{CONFIG.CHAIN}</strong>.{" "}
              {CONFIG.ROYALTY_PCT}% royalties automatically buy and burn NFTs forever.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 9, fontFamily: "monospace", color: T.grayDim, letterSpacing: 1, padding: "6px 14px", border: `1px solid ${T.border}`, borderRadius: 6 }}>NFT: {CONFIG.NFT_CONTRACT.slice(0, 8)}...{CONFIG.NFT_CONTRACT.slice(-4)}</span>
              <span style={{ fontSize: 9, fontFamily: "monospace", color: T.grayDim, letterSpacing: 1, padding: "6px 14px", border: `1px solid ${T.border}`, borderRadius: 6 }}>WALLET: {CONFIG.ROYALTY_WALLET.slice(0, 8)}...{CONFIG.ROYALTY_WALLET.slice(-4)}</span>
            </div>
            {!loading && <button onClick={fetchAllData} style={{ marginTop: 16, background: "none", border: `1px solid ${T.border}`, borderRadius: 6, padding: "6px 16px", color: T.accent, fontSize: 10, fontFamily: "monospace", fontWeight: 700, letterSpacing: 1, cursor: "pointer" }}>↻ REFRESH</button>}
          </div>

          {/* NFT CAROUSEL */}
          <div style={panelStyle}>
            <div style={panelLabel}>🔥 NFT BURN QUEUE — SWEEP TARGETS</div>
            <NFTCarousel nfts={nftList} burnedIds={burnedTokenIds} listings={activeListings} walletBalance={walletBalance} />
          </div>

          {/* How It Works */}
          <SectionHeader title="How It Works" subtitle="The perpetual deflationary flywheel" />
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 30 }}>
            <StepCard number="1" title="Trading Fees" description={`${CONFIG.ROYALTY_PCT}% royalties collected from every secondary sale.`} color={T.gold} />
            <StepCard number="2" title="Floor Sweep" description="Royalties buy the cheapest listed NFTs from the collection." color={T.sweep} />
            <StepCard number="3" title="Burn Forever" description="Swept NFTs sent to burn address, permanently removed from supply." color={T.burn} />
            <StepCard number="4" title="Flywheel Loop" description="Less supply = more scarcity. More trades = more royalties. Repeat." color={T.accent} />
          </div>

          <div style={panelStyle}><Flywheel /></div>

          {/* Stats */}
          <SectionHeader title="Dashboard" subtitle="Real-time metrics from BaseScan + OpenSea" />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            <Metric icon="🔥" label="BURNED" value={totalBurned || "0"} color={T.burn} sub={supply ? `${((totalBurned / supply) * 100).toFixed(1)}% of supply` : "SOONBRIA!"} loading={loading} />
            <Metric icon="🧹" label="SWEPT" value={totalSwept || "0"} color={T.sweep} sub={totalSwept ? `${totalSwept} NFTs` : "SOONBRIA!"} loading={loading} />
            <Metric icon="💰" label="ROYALTIES" value={totalRoyaltiesETH ? totalRoyaltiesETH.toFixed(6) : "0"} color={T.gold} sub={totalRoyaltiesETH ? "ETH" : "SOONBRIA!"} loading={loading} />
            <Metric icon="💎" label="FLOOR" value={floorPrice !== null ? `${floorPrice}` : "—"} color={T.accent} sub={floorPrice !== null ? "ETH" : "SOONBRIA!"} loading={loading} />
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
            <Metric icon="📊" label="VOLUME" value={totalVolume !== null ? `${parseFloat(totalVolume).toFixed(4)}` : "—"} color={T.white} sub="ETH ALL TIME" loading={loading} />
            <Metric icon="📦" label="SUPPLY" value={totalSupply ?? "—"} color={T.white} sub={totalSupply ? `${currentSupply} circ.` : "SOONBRIA!"} loading={loading} />
            <Metric icon="👥" label="OWNERS" value={numOwners ?? "—"} color={T.white} sub="UNIQUE" loading={loading} />
            <Metric icon="🏦" label="WALLET" value={walletBalance !== null ? walletBalance.toFixed(6) : "—"} color={T.gold} sub="ETH AVAIL." loading={loading} />
          </div>

          {/* Wallet */}
          <div style={panelStyle}>
            <div style={panelLabel}>ROYALTY WALLET</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
              <div>
                <div style={{ fontSize: 36, fontWeight: 900, fontFamily: "monospace", color: T.gold, textShadow: `0 0 30px ${T.gold}22` }}>
                  {loading ? "Loading..." : walletBalance !== null ? `${walletBalance.toFixed(6)} ETH` : "— ETH"}
                </div>
                <div style={{ fontSize: 10, color: T.grayDim, fontFamily: "monospace", marginTop: 6 }}>{CONFIG.ROYALTY_WALLET}</div>
              </div>
              <a href={`${CONFIG.BASESCAN_URL}/address/${CONFIG.ROYALTY_WALLET}`} target="_blank" rel="noopener noreferrer" style={{ color: T.accent, fontSize: 10, textDecoration: "none", fontFamily: "monospace", fontWeight: 700, letterSpacing: 1, padding: "10px 18px", border: `1px solid ${T.accent}40`, borderRadius: 8 }}>BASESCAN ↗</a>
            </div>
          </div>

          {/* Supply */}
          <div style={panelStyle}>
            <div style={panelLabel}>SUPPLY DISTRIBUTION</div>
            {supply > 0 ? <SupplyBar burned={totalBurned} total={supply} /> : <Soonbria subtitle="Supply data will appear when available" height={140} />}
          </div>
        </>)}

        {/* ═══ ANALYTICS ═══ */}
        {section === "analytics" && (<>
          <div style={{ paddingTop: 30 }}><SectionHeader title="Analytics" subtitle="BaseScan + OpenSea data" /></div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
            <Metric icon="💎" label="FLOOR" value={floorPrice !== null ? `${floorPrice} ETH` : "—"} color={T.accent} loading={loading} />
            <Metric icon="📊" label="24H VOL" value={oneDayVolume ? `${parseFloat(oneDayVolume).toFixed(4)} ETH` : "—"} color={T.sweep} loading={loading} />
            <Metric icon="💸" label="24H SALES" value={oneDaySales ?? "—"} color={T.gold} loading={loading} />
            <Metric icon="📈" label="ALL-TIME" value={totalVolume ? `${parseFloat(totalVolume).toFixed(4)} ETH` : "—"} color={T.white} loading={loading} />
          </div>
          <div style={panelStyle}>
            <div style={panelLabel}>CUMULATIVE BURNS</div>
            {hasData ? (<ResponsiveContainer width="100%" height={280}><AreaChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke={T.border} /><XAxis dataKey="period" tick={{ fill: T.grayDim, fontSize: 9, fontFamily: "monospace" }} /><YAxis tick={{ fill: T.grayDim, fontSize: 9, fontFamily: "monospace" }} /><Tooltip content={<ChartTooltip />} /><Area type="monotone" dataKey="totalBurned" name="Total Burned" stroke={T.burn} fill={T.burnSoft} strokeWidth={2} /></AreaChart></ResponsiveContainer>) : <Soonbria subtitle="Burn chart populates after first burns" />}
          </div>
          <div style={panelStyle}>
            <div style={panelLabel}>CUMULATIVE ROYALTIES (ETH)</div>
            {hasData ? (<ResponsiveContainer width="100%" height={280}><AreaChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke={T.border} /><XAxis dataKey="period" tick={{ fill: T.grayDim, fontSize: 9, fontFamily: "monospace" }} /><YAxis tick={{ fill: T.grayDim, fontSize: 9, fontFamily: "monospace" }} /><Tooltip content={<ChartTooltip />} /><Area type="monotone" dataKey="royaltiesCum" name="Royalties ETH" stroke={T.gold} fill={T.goldSoft} strokeWidth={2} /></AreaChart></ResponsiveContainer>) : <Soonbria subtitle="Royalties chart populates after first trades" />}
          </div>
          <div style={panelStyle}>
            <div style={panelLabel}>BURNS PER PERIOD</div>
            {hasData ? (<ResponsiveContainer width="100%" height={280}><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke={T.border} /><XAxis dataKey="period" tick={{ fill: T.grayDim, fontSize: 9, fontFamily: "monospace" }} /><YAxis tick={{ fill: T.grayDim, fontSize: 9, fontFamily: "monospace" }} /><Tooltip content={<ChartTooltip />} /><Bar dataKey="burned" name="Burned" fill={T.burn} radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>) : <Soonbria subtitle="Burn frequency" />}
          </div>
          <div style={panelStyle}>
            <div style={panelLabel}>DEFLATION RATE</div>
            {supply > 0 ? (
              <div style={{ display: "flex", gap: 30, justifyContent: "center", flexWrap: "wrap", padding: "10px 0" }}>
                {[{ val: `${((totalBurned / supply) * 100).toFixed(1)}%`, label: "REMOVED", color: T.burn }, { val: currentSupply.toLocaleString(), label: "CURRENT", color: T.sweep }, { val: supply.toLocaleString(), label: "INITIAL", color: T.gold }].map((m, i) => (
                  <div key={i} style={{ textAlign: "center" }}><div style={{ fontSize: 36, fontWeight: 900, fontFamily: "monospace", color: m.color, textShadow: `0 0 20px ${m.color}33` }}>{m.val}</div><div style={{ fontSize: 9, color: T.grayDim, marginTop: 6, fontFamily: "monospace", letterSpacing: 1.5 }}>{m.label}</div></div>
                ))}
              </div>
            ) : <Soonbria subtitle="After mint" height={160} />}
          </div>
        </>)}

        {/* ═══ ACTIVITY ═══ */}
        {section === "activity" && (<>
          <div style={{ paddingTop: 30 }}><SectionHeader title="Activity" subtitle={`${activityFeed.length} events • BaseScan + OpenSea`} /></div>
          <div style={{ ...panelStyle, padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "18px 20px 12px", fontSize: 10, fontFamily: "monospace", color: T.grayDim, letterSpacing: 2, fontWeight: 700, borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>RECENT TRANSACTIONS</span>
              {!loading && <button onClick={fetchAllData} style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 4, padding: "3px 8px", color: T.accent, fontSize: 9, fontFamily: "monospace", fontWeight: 700, cursor: "pointer" }}>↻ REFRESH</button>}
            </div>
            {loading ? (
              <div style={{ padding: 40, textAlign: "center", fontSize: 11, fontFamily: "monospace", color: T.grayDim, letterSpacing: 2 }}>⏳ SCANNING BLOCKCHAIN...</div>
            ) : hasActivity ? activityFeed.slice(0, 50).map((item, i) => <ActivityRow key={i} item={item} />) : (
              <div style={{ padding: 20 }}><Soonbria subtitle="Activity will populate with on-chain events" height={220} /></div>
            )}
          </div>
        </>)}

        {/* FOOTER */}
        <div style={{ textAlign: "center", padding: "40px 0 0", borderTop: `1px solid ${T.border}`, marginTop: 20 }}>
          <div style={{ fontSize: 9, fontFamily: "monospace", color: T.grayDim, letterSpacing: 2, lineHeight: 2.2 }}>
            <div>CAMBRILIO FLYWHEEL • {CONFIG.CHAIN} NETWORK</div>
            <div>POWERED BY BASESCAN + OPENSEA APIs</div>
            <div style={{ marginTop: 4 }}>
              <a href={`${CONFIG.BASESCAN_URL}/address/${CONFIG.NFT_CONTRACT}`} target="_blank" rel="noopener noreferrer" style={{ color: T.accent, textDecoration: "none" }}>CONTRACT ↗</a>
              {" • "}
              <a href={`${CONFIG.BASESCAN_URL}/address/${CONFIG.ROYALTY_WALLET}`} target="_blank" rel="noopener noreferrer" style={{ color: T.gold, textDecoration: "none" }}>WALLET ↗</a>
              {" • "}
              <a href={CONFIG.OPENSEA_URL} target="_blank" rel="noopener noreferrer" style={{ color: T.sweep, textDecoration: "none" }}>OPENSEA ↗</a>
            </div>
            <div style={{ marginTop: 8, color: T.grayDark }}>Auto-refresh 60s • © 2025 Cambrilio</div>
          </div>
        </div>
      </div>
    </div>
  );
}