"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

/* ═══ CONFIG ═══ */
const C = {
  ALCHEMY_KEY: "MIkjpi3axqLy1r0Z_yyln",
  OPENSEA_KEY: "f8c320a0be094849b65b94d1349e8dd5",
  WALLET: "0x03485B65E10bbe3238384F13cB2E6416eF89Ad24",
  NFT_CONTRACT: "0x4d540dd5ee4dc4a92a027b206c45605794396fb5",
  WETH: "0x4200000000000000000000000000000000000006",
  SLUG: "cambrilio",
  BURN_ADDRS: ["0x0000000000000000000000000000000000000000", "0x000000000000000000000000000000000000dead", "0x0000000000000000000000000000000000000001"],
  OPENSEA_API: "https://api.opensea.io/api/v2",
  OPENSEA_URL: "https://opensea.io/collection/cambrilio",
  BASESCAN: "https://basescan.org",
  REFRESH: 60000,
};
const ALC_RPC = `https://base-mainnet.g.alchemy.com/v2/${C.ALCHEMY_KEY}`;
const ALC_NFT = `https://base-mainnet.g.alchemy.com/nft/v3/${C.ALCHEMY_KEY}`;

const T = {
  bg: "#050508", bgS: "#0a0a10", card: "#0d0d15", border: "#1a1a28",
  accent: "#c8ff00", burn: "#ff4444", burnS: "#ff444430",
  sweep: "#00e5ff", gold: "#ffd700",
  weth: "#627eea", wethS: "#627eea25",
  white: "#f0f0f5", gray: "#8888a0", grayD: "#55556a", grayK: "#333345",
  success: "#00ff88",
};

/* ═══ ALCHEMY RPC (balances, transfers) ═══ */
async function alcRPC(method, params) {
  try {
    const r = await fetch(ALC_RPC, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    return (await r.json()).result ?? null;
  } catch (e) { console.error("RPC:", e); return null; }
}

async function getETHBal() {
  const r = await alcRPC("eth_getBalance", [C.WALLET, "latest"]);
  return r ? parseInt(r, 16) / 1e18 : 0;
}

async function getWETHBal() {
  const data = "0x70a08231" + C.WALLET.slice(2).padStart(64, "0");
  const r = await alcRPC("eth_call", [{ to: C.WETH, data }, "latest"]);
  return r ? parseInt(r, 16) / 1e18 : 0;
}

async function getWETHReceived() {
  const r = await alcRPC("alchemy_getAssetTransfers", [{
    fromBlock: "0x0", toBlock: "latest",
    toAddress: C.WALLET,
    contractAddresses: [C.WETH],
    category: ["erc20"],
    withMetadata: true,
    excludeZeroValue: true,
  }]);
  return r?.transfers || [];
}

async function getNFTsSentFromWallet() {
  const r = await alcRPC("alchemy_getAssetTransfers", [{
    fromBlock: "0x0", toBlock: "latest",
    fromAddress: C.WALLET,
    contractAddresses: [C.NFT_CONTRACT],
    category: ["erc721"],
    withMetadata: true,
  }]);
  return r?.transfers || [];
}

/* ═══ ALCHEMY NFT API (what wallet OWNS now) ═══ */
async function getOwnedNFTs() {
  try {
    const url = `${ALC_NFT}/getNFTsForOwner?owner=${C.WALLET}&contractAddresses[]=${C.NFT_CONTRACT}&withMetadata=true&pageSize=100`;
    const r = await fetch(url);
    const data = await r.json();
    return data.ownedNfts || [];
  } catch (e) { console.error("NFT API:", e); return []; }
}

/* ═══ OPENSEA ═══ */
async function osGet(ep) {
  try {
    const r = await fetch(`${C.OPENSEA_API}${ep}`, {
      headers: { "x-api-key": C.OPENSEA_KEY, Accept: "application/json" },
    });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}
const getStats = () => osGet(`/collections/${C.SLUG}/stats`);
const getEvents = () => osGet(`/events/collection/${C.SLUG}?event_type=sale&limit=50`);
const getListings = () => osGet(`/listings/collection/${C.SLUG}/all?limit=50`);
const getCollNFTs = () => osGet(`/collection/${C.SLUG}/nfts?limit=50`);
const getCollection = () => osGet(`/collections/${C.SLUG}`);

/* ═══ CONTRACT INTERACTION ═══ */
async function getTotalSupply() {
  // totalSupply() selector = 0x18160ddd
  const r = await alcRPC("eth_call", [{ to: C.NFT_CONTRACT, data: "0x18160ddd" }, "latest"]);
  return r ? parseInt(r, 16) : null;
}

/* ═══ PROCESS ═══ */
function parseTokenId(tx) {
  const raw = tx.tokenId || tx.erc721TokenId || "";
  if (!raw) return "";
  return String(parseInt(raw, 16));
}

function processRoyalties(wethTx) {
  return wethTx.map(tx => ({
    type: "royalty", nftId: "", price: (tx.value || 0).toFixed(6),
    value: tx.value || 0, tx: tx.hash, token: "WETH",
    time: new Date(tx.metadata?.blockTimestamp || Date.now()),
  }));
}

function processBurns(sentTx) {
  const ba = C.BURN_ADDRS.map(a => a.toLowerCase());
  return sentTx.filter(tx => ba.includes((tx.to || "").toLowerCase())).map(tx => ({
    type: "burn", nftId: `#${parseTokenId(tx)}`, tokenId: parseTokenId(tx),
    tx: tx.hash, time: new Date(tx.metadata?.blockTimestamp || Date.now()),
  }));
}

function buildFeed(royalties, ownedCount, burns, osEvents) {
  const all = [...royalties, ...burns.map(b => ({ ...b, price: "—" }))];
  if (Array.isArray(osEvents?.asset_events)) {
    osEvents.asset_events.forEach(ev => {
      const p = ev.payment?.quantity ? (parseFloat(ev.payment.quantity) / 1e18).toFixed(6) : "—";
      if (!all.find(a => a.tx === ev.transaction))
        all.push({ type: "sale", nftId: ev.nft?.name || `#${ev.nft?.identifier || "?"}`, price: p, tx: ev.transaction || "", time: new Date(ev.event_timestamp || Date.now()) });
    });
  }
  all.sort((a, b) => b.time - a.time);
  return all.map(i => ({ ...i, timeLabel: fmtAgo(i.time), txShort: i.tx ? `${i.tx.slice(0, 6)}...${i.tx.slice(-4)}` : "—" }));
}

function buildChart(burns, royalties) {
  const ev = [...burns.map(b => ({ ...b, e: "b" })), ...royalties.map(r => ({ ...r, e: "r" }))];
  if (!ev.length) return [];
  ev.sort((a, b) => a.time - b.time);
  const m = {}; let cb = 0, cr = 0;
  ev.forEach(e => {
    const k = `${e.time.getFullYear()}-${String(e.time.getMonth() + 1).padStart(2, "0")}`;
    if (!m[k]) m[k] = { period: k, burned: 0, totalBurned: 0, royCum: 0 };
    if (e.e === "b") { m[k].burned++; cb++; }
    if (e.e === "r") { cr += e.value || 0; }
    m[k].totalBurned = cb; m[k].royCum = +cr.toFixed(6);
  });
  return Object.values(m);
}

function parseListings(data) {
  const m = new Map();
  if (!data) return m;
  (data.listings || []).forEach(l => {
    const offer = (l.protocol_data || l)?.parameters?.offer?.[0];
    if (offer) {
      const id = offer.identifierOrCriteria || "";
      const pw = l.price?.current?.value || "0";
      const dec = l.price?.current?.decimals || 18;
      const p = parseFloat(pw) / Math.pow(10, dec);
      if (id && (!m.has(id) || p < m.get(id).price)) m.set(id, { price: p });
    }
  });
  return m;
}

function fmtAgo(d) {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s}s ago`; if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`; return `${Math.floor(s / 86400)}d ago`;
}

/* ═══ CAROUSEL — only swept NFTs ═══ */
function Carousel({ ownedNfts }) {
  const ref = useRef(null), aRef = useRef(null);
  const items = ownedNfts.length > 3 ? [...ownedNfts, ...ownedNfts] : ownedNfts;

  useEffect(() => {
    if (ownedNfts.length < 3) return;
    const el = ref.current; if (!el) return;
    let pos = 0;
    const totalW = ownedNfts.length * 184;
    const go = () => {
      pos += 0.4;
      if (pos >= totalW) pos = 0;
      el.scrollLeft = pos;
      aRef.current = requestAnimationFrame(go);
    };
    aRef.current = requestAnimationFrame(go);
    return () => { if (aRef.current) cancelAnimationFrame(aRef.current); };
  }, [ownedNfts.length]);

  if (!ownedNfts.length) return (
    <div style={{ padding: 30, textAlign: "center", fontSize: 11, fontFamily: "monospace", color: T.grayD }}>
      No swept NFTs in wallet yet — SOONBRIA!
    </div>
  );

  return (
    <div style={{ position: "relative", overflow: "hidden", margin: "0 -24px" }}>
      <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 60, zIndex: 2, background: `linear-gradient(90deg, ${T.bgS}, transparent)`, pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 60, zIndex: 2, background: `linear-gradient(270deg, ${T.bgS}, transparent)`, pointerEvents: "none" }} />
      <div ref={ref} style={{ display: "flex", gap: 12, padding: "8px 60px", overflow: "hidden" }}>
        {items.map((nft, i) => {
          const id = nft.tokenId || nft.id?.tokenId || "";
          const name = nft.name || nft.title || `Cambrilio #${id}`;
          const img = nft.image?.cachedUrl || nft.image?.thumbnailUrl || nft.image?.originalUrl || nft.media?.[0]?.thumbnail || nft.media?.[0]?.gateway || "";
          return (
            <div key={`${id}-${i}`} style={{ flex: "0 0 172px", width: 172, borderRadius: 12, border: `1px solid ${T.sweep}60`, background: T.card, overflow: "hidden" }}>
              <div style={{ width: 172, height: 172, position: "relative", overflow: "hidden", background: T.bg }}>
                {img ? <img src={img} alt={name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}>🎨</div>}
                <div style={{ position: "absolute", top: 6, right: 6, background: T.sweep, borderRadius: 4, padding: "3px 7px", fontSize: 7, fontWeight: 900, fontFamily: "monospace", color: T.bg, letterSpacing: 1 }}>SWEPT 🧹</div>
              </div>
              <div style={{ padding: "8px 10px 10px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, fontFamily: "monospace", color: T.sweep, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
                <div style={{ fontSize: 8, fontFamily: "monospace", marginTop: 3, color: T.sweep, letterSpacing: 1, opacity: 0.7 }}>AWAITING BURN</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══ UI ═══ */
const Soonbria = ({ subtitle, height = 200 }) => (<div style={{ height, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, border: `1px dashed ${T.grayK}`, borderRadius: 12, background: T.bg }}><span style={{ fontSize: 36 }}>🔮</span><span style={{ fontSize: 28, fontWeight: 900, letterSpacing: 2, fontFamily: "monospace", color: T.accent, textShadow: `0 0 20px ${T.accent}44` }}>SOONBRIA!</span>{subtitle && <span style={{ color: T.grayD, fontSize: 11, maxWidth: 280, textAlign: "center", lineHeight: 1.5 }}>{subtitle}</span>}</div>);

function Flywheel() {
  const [rot, setRot] = useState(0), [pulse, setPulse] = useState(0);
  useEffect(() => { const id = setInterval(() => { setRot(r => (r + 0.3) % 360); setPulse(p => (p + 0.02) % (Math.PI * 2)); }, 25); return () => clearInterval(id); }, []);
  const cx = 220, cy = 220, r = 150, pos = (a, R = r) => ({ x: cx + R * Math.cos((a * Math.PI) / 180), y: cy + R * Math.sin((a * Math.PI) / 180) }), glow = 0.4 + Math.sin(pulse) * 0.2;
  const steps = [{ a: 270, l: "ROYALTIES", s: "5% WETH", i: "💰", c: T.gold }, { a: 30, l: "SWEEP", s: "BUY FLOOR", i: "🧹", c: T.sweep }, { a: 150, l: "BURN", s: "DESTROY", i: "🔥", c: T.burn }];
  return (
    <svg viewBox="0 0 440 440" style={{ width: "100%", maxWidth: 420, margin: "0 auto", display: "block" }}>
      <defs><filter id="nG"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter><filter id="sG"><feGaussianBlur stdDeviation="8" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter><radialGradient id="cG" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor={T.accent} stopOpacity="0.15" /><stop offset="100%" stopColor={T.bg} stopOpacity="0" /></radialGradient><marker id="aG" markerWidth="10" markerHeight="7" refX="5" refY="3.5" orient="auto"><polygon points="0 0,10 3.5,0 7" fill={T.accent} opacity={glow + 0.3} /></marker></defs>
      <circle cx={cx} cy={cy} r={r + 60} fill="url(#cG)" /><circle cx={cx} cy={cy} r={r + 30} fill="none" stroke={T.border} strokeWidth="0.5" strokeDasharray="4 4" /><circle cx={cx} cy={cy} r={r} fill="none" stroke={T.grayK} strokeWidth="0.8" />
      {Array.from({ length: 36 }).map((_, i) => { const a = i * 10, s = pos(a, r - 4), e = pos(a, r + 4); return <line key={i} x1={s.x} y1={s.y} x2={e.x} y2={e.y} stroke={T.grayK} strokeWidth="0.5" />; })}
      <g style={{ transform: `rotate(${rot}deg)`, transformOrigin: `${cx}px ${cy}px` }}>{[0, 120, 240].map((a, i) => { const s = pos(a, r), e = pos(a + 90, r), m = pos(a + 45, r + 22); return <path key={i} d={`M${s.x} ${s.y} Q${m.x} ${m.y} ${e.x} ${e.y}`} fill="none" stroke={T.accent} strokeWidth="1.5" strokeLinecap="round" markerEnd="url(#aG)" opacity={glow} filter="url(#nG)" />; })}</g>
      <circle cx={cx} cy={cy} r="44" fill={T.card} stroke={T.accent} strokeWidth="1.5" filter="url(#nG)" />
      <text x={cx} y={cy - 12} textAnchor="middle" fill={T.accent} fontSize="9" fontWeight="900" letterSpacing="3" fontFamily="monospace">PERPETUAL</text>
      <text x={cx} y={cy + 4} textAnchor="middle" fill={T.white} fontSize="12" fontWeight="900" letterSpacing="2" fontFamily="monospace">FLYWHEEL</text>
      <text x={cx} y={cy + 18} textAnchor="middle" fill={T.grayD} fontSize="7" fontFamily="monospace">CAMBRILIO</text>
      {steps.map((st, i) => { const p = pos(st.a, r); return (<g key={i}><circle cx={p.x} cy={p.y} r="38" fill={st.c} opacity="0.06" filter="url(#sG)" /><circle cx={p.x} cy={p.y} r="34" fill={T.card} stroke={st.c} strokeWidth="1.5" /><text x={p.x} y={p.y - 6} textAnchor="middle" fontSize="18">{st.i}</text><text x={p.x} y={p.y + 12} textAnchor="middle" fill={st.c} fontSize="7.5" fontWeight="900" fontFamily="monospace" letterSpacing="1">{st.l}</text><text x={p.x} y={p.y + 23} textAnchor="middle" fill={T.grayD} fontSize="5.5" fontFamily="monospace">{st.s}</text></g>); })}
    </svg>
  );
}

const StepCard = ({ n, title, desc, color }) => (<div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "20px 18px", flex: "1 1 200px", minWidth: 180, position: "relative", overflow: "hidden" }}><div style={{ position: "absolute", top: -8, right: -4, fontSize: 64, fontWeight: 900, fontFamily: "monospace", color, opacity: 0.06 }}>{n}</div><div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, fontFamily: "monospace", marginBottom: 10, background: `${color}18`, color, border: `1px solid ${color}40` }}>{n}</div><div style={{ fontSize: 13, fontWeight: 800, color: T.white, marginBottom: 6, fontFamily: "monospace" }}>{title}</div><div style={{ fontSize: 11, color: T.gray, lineHeight: 1.6 }}>{desc}</div></div>);

const Metric = ({ label, value, sub, color, icon, loading: ld }) => (<div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "18px 16px", flex: "1 1 180px", minWidth: 155 }}><div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>{icon && <span style={{ fontSize: 14 }}>{icon}</span>}<span style={{ fontSize: 10, fontWeight: 700, color: T.grayD, fontFamily: "monospace", letterSpacing: 1.5, textTransform: "uppercase" }}>{label}</span></div><div style={{ fontSize: 26, fontWeight: 900, fontFamily: "monospace", color: ld ? T.grayK : (color || T.white), textShadow: !ld && color ? `0 0 20px ${color}33` : "none" }}>{ld ? "..." : value}</div>{sub && <div style={{ fontSize: 10, color: T.grayD, marginTop: 5, fontFamily: "monospace" }}>{sub}</div>}</div>);

function SupplyBar({ burned, total }) {
  const bp = total > 0 ? (burned / total) * 100 : 0, cp = 100 - bp;
  return (<div><div style={{ display: "flex", height: 32, borderRadius: 6, overflow: "hidden", border: `1px solid ${T.border}`, marginBottom: 14 }}><div style={{ width: `${cp}%`, background: `linear-gradient(90deg, ${T.accent}40, ${T.accent}20)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, fontFamily: "monospace", color: T.accent }}>{cp.toFixed(1)}%</div>{bp > 0 && <div style={{ width: `${Math.max(bp, 3)}%`, background: `linear-gradient(90deg, ${T.burn}30, ${T.burn}15)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, fontFamily: "monospace", color: T.burn, minWidth: 40 }}>{bp.toFixed(1)}%</div>}</div><div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>{[{ l: "CIRCULATING", v: total - burned, c: T.accent, p: cp }, { l: "BURNED 🔥", v: burned, c: T.burn, p: bp }].map((s, i) => (<div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: s.c }} /><span style={{ fontSize: 10, fontFamily: "monospace", color: T.gray }}>{s.l}</span><span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 800, color: T.white }}>{s.v.toLocaleString()}</span><span style={{ fontSize: 10, fontFamily: "monospace", fontWeight: 800, color: s.c }}>{s.p.toFixed(1)}%</span></div>))}</div></div>);
}

function ActivityRow({ item }) {
  const cfg = { sweep: { icon: "🧹", color: T.sweep, label: "SWEEP" }, burn: { icon: "🔥", color: T.burn, label: "BURN" }, royalty: { icon: "💰", color: T.weth, label: "ROYALTY" }, sale: { icon: "💸", color: T.accent, label: "SALE" } };
  const c = cfg[item.type] || cfg.royalty;
  return (<div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: `1px solid ${T.border}`, fontSize: 12, fontFamily: "monospace" }}>
    <span style={{ background: `${c.color}12`, borderRadius: 6, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0, border: `1px solid ${c.color}25` }}>{c.icon}</span>
    <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 700, color: c.color, letterSpacing: 1, fontSize: 11 }}>{c.label} {item.nftId && <span style={{ color: T.white }}>{item.nftId}</span>}</div>{item.tx && <a href={`${C.BASESCAN}/tx/${item.tx}`} target="_blank" rel="noopener noreferrer" style={{ color: T.grayD, fontSize: 9, textDecoration: "none" }}>{item.txShort} ↗</a>}</div>
    <div style={{ textAlign: "right", flexShrink: 0 }}><div style={{ color: T.white, fontWeight: 700 }}>{item.price}{item.price !== "—" ? (item.token === "WETH" ? " WETH" : " ETH") : ""}</div><div style={{ color: T.grayD, fontSize: 9 }}>{item.timeLabel}</div></div>
  </div>);
}

const ChartTip = ({ active, payload, label }) => { if (!active || !payload?.length) return null; return (<div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 11, fontFamily: "monospace" }}><div style={{ fontWeight: 800, marginBottom: 4, color: T.white }}>{label}</div>{payload.map((p, i) => (<div key={i} style={{ color: p.color }}>{p.name}: <strong>{typeof p.value === "number" ? (p.value < 1 ? p.value.toFixed(6) : p.value) : p.value}</strong></div>))}</div>); };
const NavLink = ({ label, active, onClick }) => <button onClick={onClick} style={{ background: "none", border: "none", cursor: "pointer", color: active ? T.accent : T.grayD, fontSize: 11, fontWeight: 800, fontFamily: "monospace", letterSpacing: 2, padding: "8px 0", borderBottom: active ? `2px solid ${T.accent}` : "2px solid transparent" }}>▸{label}</button>;
const SH = ({ title, subtitle }) => (<div style={{ marginBottom: 20, paddingTop: 10 }}><h2 style={{ fontSize: 22, fontWeight: 900, margin: 0, fontFamily: "monospace", letterSpacing: 2, color: T.white, textTransform: "uppercase" }}>{title}</h2>{subtitle && <p style={{ fontSize: 12, color: T.gray, margin: "6px 0 0", fontFamily: "monospace" }}>{subtitle}</p>}</div>);
const PS = { background: T.bgS, border: `1px solid ${T.border}`, borderRadius: 14, padding: 24, marginBottom: 20 };
const PL = { fontSize: 10, fontFamily: "monospace", color: T.grayD, letterSpacing: 2, fontWeight: 700, marginBottom: 16 };

/* ═══ MAIN ═══ */
export default function App() {
  const [sec, setSec] = useState("home"), [ld, setLd] = useState(true), [lastUp, setLastUp] = useState(null);
  const [ethBal, setEthBal] = useState(0), [wethBal, setWethBal] = useState(0);
  const [ownedNfts, setOwnedNfts] = useState([]); // NFTs wallet currently holds
  const [royalties, setRoyalties] = useState([]), [burns, setBurns] = useState([]);
  const [feed, setFeed] = useState([]), [chart, setChart] = useState([]);
  const [floor, setFloor] = useState(null), [vol, setVol] = useState(null), [supply, setSupply] = useState(null);
  const [owners, setOwners] = useState(null), [vol24, setVol24] = useState(null), [sales24, setSales24] = useState(null);

  const fetchAll = useCallback(async () => {
    setLd(true);
    try {
      const [eb, wb, wethTx, nftOut, owned, os, oe, coll, tsupply] = await Promise.all([
        getETHBal(), getWETHBal(), getWETHReceived(),
        getNFTsSentFromWallet(), getOwnedNFTs(),
        getStats(), getEvents(), getCollection(), getTotalSupply(),
      ]);

      setEthBal(eb); setWethBal(wb);
      setOwnedNfts(owned); // This is the REAL count of swept NFTs

      const roys = processRoyalties(wethTx);
      const brns = processBurns(nftOut);
      setRoyalties(roys); setBurns(brns);

      setFeed(buildFeed(roys, owned.length, brns, oe));
      setChart(buildChart(brns, roys));

      if (os) {
        const s = os.total || os;
        setFloor(s.floor_price ?? null); setVol(s.volume ?? s.total_volume ?? null);
        setOwners(s.num_owners ?? null);
        setVol24(s.one_day_volume ?? null); setSales24(s.one_day_sales ?? null);
      }
      // Supply: try OpenSea collection → then contract → fallback
      setSupply(coll?.total_supply ?? tsupply ?? null);
      setLastUp(new Date());
    } catch (err) { console.error(err); }
    finally { setLd(false); }
  }, []);

  useEffect(() => { fetchAll(); const id = setInterval(fetchAll, C.REFRESH); return () => clearInterval(id); }, [fetchAll]);

  const hd = chart.length > 0, ha = feed.length > 0;
  const sup = supply || 0, cur = sup - burns.length;
  const totalRoy = royalties.reduce((s, r) => s + (r.value || 0), 0);

  return (
    <div style={{ background: T.bg, color: T.white, minHeight: "100vh", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: `${T.bg}ee`, backdropFilter: "blur(12px)", borderBottom: `1px solid ${T.border}`, padding: "0 24px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: 20 }}>🔥</span><span style={{ fontSize: 16, fontWeight: 900, fontFamily: "monospace", letterSpacing: 3, color: T.accent }}>CAMBRILIO</span></div>
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>{[["home", "HOME"], ["analytics", "ANALYTICS"], ["activity", "ACTIVITY"]].map(([k, l]) => <NavLink key={k} label={l} active={sec === k} onClick={() => setSec(k)} />)}</div>
          <a href={C.OPENSEA_URL} target="_blank" rel="noopener noreferrer" style={{ color: T.grayD, fontSize: 9, textDecoration: "none", fontFamily: "monospace", fontWeight: 700, padding: "6px 10px", border: `1px solid ${T.border}`, borderRadius: 6 }}>OPENSEA↗</a>
        </div>
      </nav>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 20px 60px" }}>
        {sec === "home" && (<>
          {/* Hero */}
          <div style={{ textAlign: "center", padding: "50px 20px 30px", position: "relative" }}>
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 300, height: 300, borderRadius: "50%", background: `radial-gradient(circle, ${T.accent}08 0%, transparent 70%)`, pointerEvents: "none" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 16 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: ld ? T.gold : T.success, boxShadow: `0 0 8px ${ld ? T.gold : T.success}` }} />
              <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "monospace", color: ld ? T.gold : T.success, letterSpacing: 2 }}>{ld ? "SYNCING..." : "LIVE DATA"}</span>
              {lastUp && !ld && <span style={{ fontSize: 9, color: T.grayD, fontFamily: "monospace" }}>• {fmtAgo(lastUp)}</span>}
            </div>
            <h1 style={{ fontSize: 42, fontWeight: 900, margin: "0 0 12px", fontFamily: "monospace", letterSpacing: 3, lineHeight: 1.1 }}><span style={{ color: T.accent }}>CAMBRILIO</span><br /><span style={{ color: T.white }}>FLYWHEEL</span></h1>
            <p style={{ fontSize: 14, color: T.gray, maxWidth: 460, margin: "0 auto 20px", lineHeight: 1.7 }}>Deflationary sweep + burn on <strong style={{ color: T.white }}>Base</strong>. 5% WETH royalties buy and burn NFTs forever.</p>
            {!ld && <button onClick={fetchAll} style={{ marginTop: 8, background: "none", border: `1px solid ${T.border}`, borderRadius: 6, padding: "6px 16px", color: T.accent, fontSize: 10, fontFamily: "monospace", fontWeight: 700, cursor: "pointer" }}>↻ REFRESH</button>}
          </div>

          {/* Swept NFTs Carousel */}
          <div style={PS}>
            <div style={PL}>🧹 SWEPT NFTs — {ownedNfts.length} IN WALLET</div>
            <Carousel ownedNfts={ownedNfts} />
          </div>

          {/* How It Works */}
          <SH title="How It Works" />
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 30 }}>
            <StepCard n="1" title="Trading Fees" desc="5% WETH royalties auto-collected on every sale." color={T.gold} />
            <StepCard n="2" title="Floor Sweep" desc="Wallet buys cheapest listed NFTs." color={T.sweep} />
            <StepCard n="3" title="Burn" desc="Swept NFTs destroyed. Gone forever." color={T.burn} />
            <StepCard n="4" title="Repeat" desc="Less supply = more value. Cycle never stops." color={T.accent} />
          </div>
          <div style={PS}><Flywheel /></div>

          {/* Dashboard */}
          <SH title="Dashboard" subtitle="Alchemy + OpenSea" />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            <Metric icon="🧹" label="SWEPT" value={ownedNfts.length} color={T.sweep} sub="NFTs in wallet" loading={ld} />
            <Metric icon="🔥" label="BURNED" value={burns.length} color={T.burn} sub={sup ? `${((burns.length / sup) * 100).toFixed(1)}% supply` : "SOONBRIA!"} loading={ld} />
            <Metric icon="💰" label="ROYALTIES" value={totalRoy ? totalRoy.toFixed(4) : "0"} color={T.weth} sub="WETH collected" loading={ld} />
            <Metric icon="💎" label="FLOOR" value={floor !== null ? `${floor}` : "—"} color={T.accent} sub={floor !== null ? "ETH" : "SOONBRIA!"} loading={ld} />
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
            <Metric icon="📊" label="VOLUME" value={vol ? `${parseFloat(vol).toFixed(4)}` : "—"} color={T.white} sub="ETH ALL TIME" loading={ld} />
            <Metric icon="📦" label="SUPPLY" value={supply ?? "—"} color={T.white} sub={supply ? `${cur} circ.` : "SOONBRIA!"} loading={ld} />
            <Metric icon="👥" label="OWNERS" value={owners ?? "—"} color={T.white} sub="UNIQUE" loading={ld} />
            <Metric icon="🏦" label="ETH BAL." value={ethBal.toFixed(6)} color={T.gold} sub="IN WALLET" loading={ld} />
          </div>

          {/* Wallet */}
          <div style={PS}>
            <div style={PL}>ROYALTY WALLET</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
              <div>
                <div style={{ display: "flex", gap: 24, marginBottom: 6 }}>
                  <div><div style={{ fontSize: 10, color: T.grayD, fontFamily: "monospace", marginBottom: 4 }}>WETH</div><div style={{ fontSize: 32, fontWeight: 900, fontFamily: "monospace", color: T.weth }}>{wethBal.toFixed(6)}</div></div>
                  <div><div style={{ fontSize: 10, color: T.grayD, fontFamily: "monospace", marginBottom: 4 }}>ETH</div><div style={{ fontSize: 32, fontWeight: 900, fontFamily: "monospace", color: T.gold }}>{ethBal.toFixed(6)}</div></div>
                </div>
                <div style={{ fontSize: 10, color: T.grayD, fontFamily: "monospace" }}>{C.WALLET}</div>
              </div>
              <a href={`${C.BASESCAN}/address/${C.WALLET}`} target="_blank" rel="noopener noreferrer" style={{ color: T.accent, fontSize: 10, textDecoration: "none", fontFamily: "monospace", fontWeight: 700, padding: "10px 18px", border: `1px solid ${T.accent}40`, borderRadius: 8 }}>BASESCAN ↗</a>
            </div>
          </div>

          <div style={PS}><div style={PL}>SUPPLY DISTRIBUTION</div>{sup > 0 ? <SupplyBar burned={burns.length} total={sup} /> : <Soonbria subtitle="After mint" height={140} />}</div>
        </>)}

        {sec === "analytics" && (<>
          <div style={{ paddingTop: 30 }}><SH title="Analytics" /></div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
            <Metric icon="💎" label="FLOOR" value={floor ? `${floor} ETH` : "—"} color={T.accent} loading={ld} />
            <Metric icon="📊" label="24H VOL" value={vol24 ? `${parseFloat(vol24).toFixed(4)} ETH` : "—"} color={T.sweep} loading={ld} />
            <Metric icon="💸" label="24H SALES" value={sales24 ?? "—"} color={T.gold} loading={ld} />
            <Metric icon="📈" label="ALL-TIME" value={vol ? `${parseFloat(vol).toFixed(4)} ETH` : "—"} color={T.white} loading={ld} />
          </div>
          <div style={PS}><div style={PL}>CUMULATIVE BURNS</div>{hd ? <ResponsiveContainer width="100%" height={280}><AreaChart data={chart}><CartesianGrid strokeDasharray="3 3" stroke={T.border} /><XAxis dataKey="period" tick={{ fill: T.grayD, fontSize: 9 }} /><YAxis tick={{ fill: T.grayD, fontSize: 9 }} /><Tooltip content={<ChartTip />} /><Area type="monotone" dataKey="totalBurned" name="Burned" stroke={T.burn} fill={T.burnS} strokeWidth={2} /></AreaChart></ResponsiveContainer> : <Soonbria subtitle="After first burns" />}</div>
          <div style={PS}><div style={PL}>CUMULATIVE ROYALTIES (WETH)</div>{hd ? <ResponsiveContainer width="100%" height={280}><AreaChart data={chart}><CartesianGrid strokeDasharray="3 3" stroke={T.border} /><XAxis dataKey="period" tick={{ fill: T.grayD, fontSize: 9 }} /><YAxis tick={{ fill: T.grayD, fontSize: 9 }} /><Tooltip content={<ChartTip />} /><Area type="monotone" dataKey="royCum" name="WETH" stroke={T.weth} fill={T.wethS} strokeWidth={2} /></AreaChart></ResponsiveContainer> : <Soonbria subtitle="After first trades" />}</div>
          <div style={PS}><div style={PL}>BURNS PER PERIOD</div>{hd ? <ResponsiveContainer width="100%" height={280}><BarChart data={chart}><CartesianGrid strokeDasharray="3 3" stroke={T.border} /><XAxis dataKey="period" tick={{ fill: T.grayD, fontSize: 9 }} /><YAxis tick={{ fill: T.grayD, fontSize: 9 }} /><Tooltip content={<ChartTip />} /><Bar dataKey="burned" name="Burned" fill={T.burn} radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer> : <Soonbria subtitle="Frequency" />}</div>
        </>)}

        {sec === "activity" && (<>
          <div style={{ paddingTop: 30 }}><SH title="Activity" subtitle={`${feed.length} events`} /></div>
          <div style={{ ...PS, padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "18px 20px 12px", fontSize: 10, fontFamily: "monospace", color: T.grayD, letterSpacing: 2, fontWeight: 700, borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between" }}>
              <span>TRANSACTIONS</span>{!ld && <button onClick={fetchAll} style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 4, padding: "3px 8px", color: T.accent, fontSize: 9, fontFamily: "monospace", fontWeight: 700, cursor: "pointer" }}>↻</button>}
            </div>
            {ld ? <div style={{ padding: 40, textAlign: "center", fontSize: 11, fontFamily: "monospace", color: T.grayD }}>⏳ SCANNING...</div> :
              ha ? feed.slice(0, 50).map((item, i) => <ActivityRow key={i} item={item} />) :
              <div style={{ padding: 20 }}><Soonbria subtitle="Events will appear" height={220} /></div>}
          </div>
        </>)}

        <div style={{ textAlign: "center", padding: "40px 0 0", borderTop: `1px solid ${T.border}`, marginTop: 20 }}>
          <div style={{ fontSize: 9, fontFamily: "monospace", color: T.grayD, letterSpacing: 2, lineHeight: 2.2 }}>
            <div>CAMBRILIO FLYWHEEL • BASE • WETH ROYALTIES</div>
            <div>POWERED BY ALCHEMY + OPENSEA</div>
            <div style={{ marginTop: 4 }}>
              <a href={`${C.BASESCAN}/address/${C.NFT_CONTRACT}`} target="_blank" rel="noopener noreferrer" style={{ color: T.accent, textDecoration: "none" }}>CONTRACT↗</a>{" • "}
              <a href={`${C.BASESCAN}/address/${C.WALLET}`} target="_blank" rel="noopener noreferrer" style={{ color: T.weth, textDecoration: "none" }}>WALLET↗</a>{" • "}
              <a href={C.OPENSEA_URL} target="_blank" rel="noopener noreferrer" style={{ color: T.sweep, textDecoration: "none" }}>OPENSEA↗</a>
            </div>
            <div style={{ marginTop: 8, color: T.grayK }}>Auto-refresh 60s • © 2025 Cambrilio</div>
          </div>
        </div>
      </div>
    </div>
  );
}
