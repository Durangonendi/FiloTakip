import { useState, useMemo, useEffect } from "react";

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const C = {
  bg: "#F7F8FA", navy: "#1B2E4B", panel: "#EEF1F5", card: "#FFFFFF",
  green: "#2ECC71", red: "#E74C3C", blue: "#3498DB", orange: "#E67E22",
  purple: "#9B59B6", smoke: "#7F8C8D", muted: "#BDC3C7", border: "#E0E6ED",
};

const PIE_COLORS = [C.blue, C.orange, C.purple, C.green, C.red, "#16A085", "#F1C40F", "#E84393", C.smoke, "#2980B9"];

const GIDER_KATEGORILERI = [
  "Market", "Kira", "Fatura", "Ulaşım", "Sağlık", "Eğlence", "Giyim", "Eğitim", "Abonelik",
  "Banka", "Personel", "Yakıt", "Araç", "Ofis", "Maliye ve Muhasebe", "Diğer",
];
const HATIRLATICI_TURLERI = ["Maaş", "SGK", "KDV", "Kredi", "Bakım", "Diğer"];
const BAKIM_UYARI_ESIGI = 10; // sayaç eşiğe bu kadar kala uyar
const KART_ODEME_UYARI_GUN = 5; // son ödeme gününe bu kadar gün kala uyar

const fmt = (n) => `₺${Number(n || 0).toLocaleString("tr-TR", { maximumFractionDigits: 2 })}`;
const todayStr = () => new Date().toISOString().split("T")[0];

function startOfPeriod(period) {
  const d = new Date();
  if (period === "gun") return todayStr();
  if (period === "hafta") {
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    return d.toISOString().split("T")[0];
  }
  if (period === "ay") return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  if (period === "yil") return `${d.getFullYear()}-01-01`;
  return "1970-01-01";
}

// ─── DB (Supabase client, otomatik user_id) ─────────────────────────────────
async function getUserId() {
  const { data } = await supabase.auth.getSession();
  return data && data.session ? data.session.user.id : null;
}

async function dbGet(table, orderCol, ascending = false) {
  try {
    let q = supabase.from(table).select("*");
    if (orderCol) q = q.order(orderCol, { ascending });
    const { data, error } = await q;
    if (error) { console.error(table, error); return []; }
    return data || [];
  } catch (e) { return []; }
}
async function dbInsert(table, row) {
  const uid = await getUserId();
  const { error } = await supabase.from(table).insert({ ...row, user_id: uid });
  if (error) console.error(table, error);
}
async function dbUpdate(table, id, row) {
  const { error } = await supabase.from(table).update(row).eq("id", id);
  if (error) console.error(table, error);
}
async function dbDelete(table, id) {
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) console.error(table, error);
}

// ─── STYLE HELPERS ───────────────────────────────────────────────────────────
const bs = (bg, color, ex = {}) => ({ background: bg, color, border: "none", borderRadius: 6, padding: "8px 18px", cursor: "pointer", fontSize: 13, fontWeight: 700, ...ex });
const ob = (color) => ({ background: "transparent", color, border: `1px solid ${color}44`, borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600 });
const cardSt = (ex = {}) => ({ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", ...ex });
const pill = (color) => ({ background: color + "20", color, border: `1px solid ${color}40`, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", display: "inline-block" });
const inpSt = { background: "#F8F9FA", color: C.navy, border: `1px solid ${C.border}`, borderRadius: 6, padding: "9px 12px", fontSize: 13, width: "100%", boxSizing: "border-box", outline: "none" };
const lbl = { fontSize: 11, color: C.smoke, fontWeight: 600, letterSpacing: 0.5 };
const row = { display: "flex", flexDirection: "column", gap: 5 };

// ─── AUTH (gerçek üyelik) ────────────────────────────────────────────────────
function AuthScreen({ onAuthed, onBack }) {
  const [mode, setMode] = useState("giris"); // giris | kayit
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [hesapTipi, setHesapTipi] = useState("bireysel"); // bireysel | isletme
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(""); setInfo("");
    if (!email || !pass) { setError("E-posta ve şifre gerekli."); return; }
    setBusy(true);
    try {
      if (mode === "giris") {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (err) { setError("Giriş başarısız: " + err.message); setBusy(false); return; }
        onAuthed();
      } else {
        const { data, error: err } = await supabase.auth.signUp({
          email, password: pass, options: { data: { hesap_tipi: hesapTipi } },
        });
        if (err) { setError("Kayıt başarısız: " + err.message); setBusy(false); return; }
        if (data && data.session) { onAuthed(); }
        else { setInfo("Kayıt alındı! E-postana gelen onay linkine tıklayıp giriş yap."); setMode("giris"); }
      }
    } finally { setBusy(false); }
  }

  return (
    <div style={{ fontFamily: "'Inter',sans-serif", background: "linear-gradient(135deg,#1B2E4B,#243447)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 40, width: 380, boxShadow: "0 20px 60px rgba(0,0,0,0.3)", position: "relative" }}>
        {onBack && (
          <button onClick={onBack} style={{ position: "absolute", top: 16, left: 16, background: "none", border: "none", color: C.smoke, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>← Anasayfa</button>
        )}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <img src="/logo-cebim.png" alt="Cebim" style={{ height: 64, marginBottom: 4 }} />
          <div style={{ fontSize: 11, color: C.smoke, letterSpacing: 2, marginTop: 4 }}>GELİR • GİDER • BÜTÇE • KART</div>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 20, background: C.panel, borderRadius: 8, padding: 4 }}>
          <button onClick={() => setMode("giris")} style={{ flex: 1, padding: 8, borderRadius: 6, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, background: mode === "giris" ? "#fff" : "transparent", color: mode === "giris" ? C.navy : C.smoke }}>Giriş Yap</button>
          <button onClick={() => setMode("kayit")} style={{ flex: 1, padding: 8, borderRadius: 6, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, background: mode === "kayit" ? "#fff" : "transparent", color: mode === "kayit" ? C.navy : C.smoke }}>Üye Ol</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={row}><label style={lbl}>E-POSTA</label><input style={inpSt} type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div style={row}><label style={lbl}>ŞİFRE</label><input style={inpSt} type="password" value={pass} onChange={(e) => setPass(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} /></div>

          {mode === "kayit" && (
            <div style={row}>
              <label style={lbl}>KULLANIM AMACI</label>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setHesapTipi("bireysel")} style={{ ...ob(hesapTipi === "bireysel" ? C.navy : C.smoke), flex: 1, background: hesapTipi === "bireysel" ? C.navy + "15" : "transparent" }}>👤 Bireysel</button>
                <button onClick={() => setHesapTipi("isletme")} style={{ ...ob(hesapTipi === "isletme" ? C.navy : C.smoke), flex: 1, background: hesapTipi === "isletme" ? C.navy + "15" : "transparent" }}>🏢 İşletme / Filo</button>
              </div>
              <div style={{ fontSize: 11, color: C.smoke, marginTop: 2 }}>{hesapTipi === "bireysel" ? "Kişisel gelir-gider, kart ve bütçe takibi." : "Kişisel takibe ek olarak araç/makine ve envanter modülleri de açılır."}</div>
            </div>
          )}

          {error && <div style={{ color: C.red, fontSize: 12 }}>{error}</div>}
          {info && <div style={{ color: C.green, fontSize: 12 }}>{info}</div>}

          <button onClick={submit} disabled={busy} style={{ ...bs(C.navy, "#fff"), width: "100%", padding: 12, fontSize: 14, opacity: busy ? 0.6 : 1 }}>
            {busy ? "..." : mode === "giris" ? "Giriş Yap" : "Üye Ol"}
          </button>
        </div>
      </div>
    </div>
  );
}

function WalletIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#2ECC71">
      <path d="M3 7a2 2 0 0 1 2-2h11l3 3v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
      <path d="M16 5H5a2 2 0 0 0-2 2v0a2 2 0 0 0 2 2h13" fill="#27AE60" />
      <circle cx="17" cy="13" r="1.8" fill="#fff" />
    </svg>
  );
}
function CardIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#3498DB">
      <rect x="2" y="5" width="20" height="14" rx="2.5" />
      <rect x="2" y="8.5" width="20" height="3" fill="#1B2E4B" />
      <rect x="4.5" y="14.5" width="6" height="2" rx="1" fill="#fff" />
    </svg>
  );
}
function TargetIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#9B59B6" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5.2" />
      <circle cx="12" cy="12" r="1.6" fill="#9B59B6" stroke="none" />
    </svg>
  );
}
function ScaleIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#E67E22">
      <rect x="11" y="2" width="2" height="15" rx="1" />
      <path d="M4 6h5l-2.5 5.5z" />
      <path d="M15 6h5l-2.5 5.5z" />
      <path d="M1.5 11.5a2.5 4 0 0 0 5 0z" />
      <path d="M16.5 11.5a2.5 4 0 0 0 5 0z" />
      <rect x="7" y="19" width="10" height="2" rx="1" />
      <rect x="11" y="17" width="2" height="3" />
    </svg>
  );
}
function CarIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#3498DB">
      <path d="M3 13l1.5-4.5A2 2 0 0 1 6.4 7h11.2a2 2 0 0 1 1.9 1.5L21 13v5a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H6v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-5z" />
      <circle cx="7" cy="17" r="1.6" fill="#1B2E4B" />
      <circle cx="17" cy="17" r="1.6" fill="#1B2E4B" />
    </svg>
  );
}
function ChartBarsIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect x="3" y="12" width="4" height="9" rx="1" fill="#3498DB" />
      <rect x="10" y="7" width="4" height="14" rx="1" fill="#2ECC71" />
      <rect x="17" y="3" width="4" height="18" rx="1" fill="#E67E22" />
    </svg>
  );
}
function GlobeIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#1B2E4B" strokeWidth="1.6">
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="4" ry="9" />
      <path d="M3 12h18M4.5 7h15M4.5 17h15" />
    </svg>
  );
}

function WindowsIcon({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect x="1" y="1" width="10" height="10" fill="#F25022" />
      <rect x="13" y="1" width="10" height="10" fill="#7FBA00" />
      <rect x="1" y="13" width="10" height="10" fill="#00A4EF" />
      <rect x="13" y="13" width="10" height="10" fill="#FFB900" />
    </svg>
  );
}

function AndroidIcon({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#3DDC84">
      <path d="M6.5 8.5v6a1 1 0 0 0 2 0v-6a1 1 0 0 0-2 0zM15.5 8.5v6a1 1 0 0 0 2 0v-6a1 1 0 0 0-2 0zM8 9v8a1.2 1.2 0 0 0 1.2 1.2h.3v2.3a1 1 0 0 0 2 0v-2.3h1v2.3a1 1 0 0 0 2 0v-2.3h.3A1.2 1.2 0 0 0 16 17V9H8z" />
      <path d="M8.3 7.2c.1-1.6 1.2-2.9 2.7-3.4l-.8-1.4a.35.35 0 0 1 .6-.35l.85 1.47a5.3 5.3 0 0 1 2.7 0l.85-1.47a.35.35 0 0 1 .6.35l-.8 1.4c1.5.5 2.6 1.8 2.7 3.4H8.3z" />
      <circle cx="10.3" cy="6" r="0.6" fill="#fff" />
      <circle cx="13.7" cy="6" r="0.6" fill="#fff" />
    </svg>
  );
}

// ─── AÇILIŞ SAYFASI (LANDING) ────────────────────────────────────────────────
function LandingPage({ onStart }) {
  const FEATURES = [
    { Icon: WalletIcon, title: "Gelir & Gider", text: "Nereye ne kadar harcadığını, ne kadar kazandığını tek ekranda gör." },
    { Icon: CardIcon, title: "Kart & Hesap", text: "Kredi kartı bakiyeni takip et, son ödeme gününden önce hatırlat." },
    { Icon: TargetIcon, title: "Bütçe", text: "Kategori bazlı aylık limit koy, aşınca anında uyarı al." },
    { Icon: ScaleIcon, title: "Borç & Alacak", text: "Kime borcun var, kimden alacağın var — tek listede." },
    { Icon: CarIcon, title: "Filo & Envanter", text: "İşletmen varsa araç/makine ve stok takibini de aynı yerden yönet." },
    { Icon: ChartBarsIcon, title: "Grafikli Özet", text: "Harcama dağılımını basit bir pasta grafikte gör." },
  ];
  const STEPS = [
    { n: "1", title: "Üye Ol", text: "E-posta ve şifreyle saniyeler içinde ücretsiz hesap aç." },
    { n: "2", title: "Bilgilerini Gir", text: "Gelir, gider, kart ve varsa araçlarını ekle." },
    { n: "3", title: "Her Yerden Takip Et", text: "Telefon, bilgisayar — nereden girersen gir aynı veriyi görürsün." },
  ];

  return (
    <div style={{ fontFamily: "'Inter',sans-serif", background: C.bg, minHeight: "100vh" }}>
      <div style={{ background: "#fff", borderBottom: `1px solid ${C.border}`, padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 20 }}>
        <img src="/logo-cebim.png" alt="Cebim" style={{ height: 34 }} />
        <button onClick={onStart} style={bs(C.navy, "#fff", { padding: "10px 20px" })}>Giriş Yap</button>
      </div>

      <div style={{ textAlign: "center", padding: "60px 20px 40px", background: "linear-gradient(180deg,#EEF3FF,transparent)" }}>
        <img src="/logo-cebim.png" alt="Cebim" style={{ height: 90, marginBottom: 18 }} />
        <div style={{ fontSize: 17, color: C.smoke, maxWidth: 560, margin: "0 auto", lineHeight: 1.6 }}>
          Gelir, gider, kart, bütçe ve borç takibini tek yerden yönet. Bireysel kullan ya da işletmenin
          filo ve envanterini de aynı sistemde tut — herkes için basit, herkes için ücretsiz başlangıç.
        </div>
        <button onClick={onStart} style={{ ...bs(C.green, "#fff", { padding: "14px 32px", fontSize: 15, marginTop: 28 }) }}>Ücretsiz Başla →</button>
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "20px 24px 60px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16, marginBottom: 60 }}>
          {FEATURES.map((f) => (
            <div key={f.title} style={cardSt({ padding: 22 })}>
              <div style={{ marginBottom: 10 }}><f.Icon /></div>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.navy, marginBottom: 6 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: C.smoke, lineHeight: 1.5 }}>{f.text}</div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", fontSize: 22, fontWeight: 900, color: C.navy, marginBottom: 30 }}>Nasıl Çalışır?</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 20, marginBottom: 60 }}>
          {STEPS.map((s) => (
            <div key={s.n} style={{ textAlign: "center" }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: C.navy, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, margin: "0 auto 12px" }}>{s.n}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.navy, marginBottom: 6 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: C.smoke, lineHeight: 1.5 }}>{s.text}</div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", fontSize: 22, fontWeight: 900, color: C.navy, marginBottom: 20 }}>Nereden Kullanmak İstersin?</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16 }}>
          <div style={cardSt({ padding: 24, textAlign: "center" })}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}><GlobeIcon /></div>
            <div style={{ fontWeight: 800, color: C.navy, marginBottom: 10 }}>Web'de Kullan</div>
            <button onClick={onStart} style={{ ...bs(C.navy, "#fff"), width: "100%" }}>Hemen Başla</button>
          </div>
          <div style={cardSt({ padding: 24, textAlign: "center" })}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}><WindowsIcon /></div>
            <div style={{ fontWeight: 800, color: C.navy, marginBottom: 10 }}>Windows</div>
            <button onClick={onStart} style={{ ...bs(C.navy, "#fff"), width: "100%" }}>Üye Ol</button>
          </div>
          <div style={cardSt({ padding: 24, textAlign: "center" })}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}><AndroidIcon /></div>
            <div style={{ fontWeight: 800, color: C.navy, marginBottom: 10 }}>Android</div>
            <button onClick={onStart} style={{ ...bs(C.navy, "#fff"), width: "100%" }}>Üye Ol</button>
          </div>
        </div>
      </div>

      <div style={{ textAlign: "center", padding: "20px", color: C.smoke, fontSize: 12, borderTop: `1px solid ${C.border}` }}>
        Cebim resmi bir muhasebe sistemi değildir, kişisel takip aracıdır.
      </div>
    </div>
  );
}

// ─── FORM MODAL (generic) ───────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ ...cardSt({ padding: 28 }), width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: C.navy }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.smoke, cursor: "pointer", fontSize: 22 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── BASİT PASTA GRAFİK (saf SVG, ek kütüphane yok) ─────────────────────────
function PieChart({ data, size = 160 }) {
  const total = data.reduce((a, d) => a + d.value, 0);
  if (total <= 0) return <div style={{ color: C.smoke, fontSize: 13, textAlign: "center", padding: 20 }}>Henüz veri yok</div>;
  let acc = 0;
  const r = size / 2;
  const slices = data.map((d, i) => {
    const start = (acc / total) * 2 * Math.PI;
    acc += d.value;
    const end = (acc / total) * 2 * Math.PI;
    const x1 = r + r * Math.sin(start), y1 = r - r * Math.cos(start);
    const x2 = r + r * Math.sin(end), y2 = r - r * Math.cos(end);
    const large = end - start > Math.PI ? 1 : 0;
    return { path: `M${r},${r} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`, color: PIE_COLORS[i % PIE_COLORS.length], ...d };
  });
  return (
    <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map((s, i) => <path key={i} d={s.path} fill={s.color} />)}
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color, display: "inline-block" }} />
            <span style={{ color: C.navy }}>{s.label}</span>
            <span style={{ color: C.smoke }}>{fmt(s.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ARAÇ FORM ───────────────────────────────────────────────────────────────
function AracForm({ onClose, onSave }) {
  const [ad, setAd] = useState("");
  const [tur, setTur] = useState("");
  const [plaka, setPlaka] = useState("");
  const [sayacTipi, setSayacTipi] = useState("saat");
  const [guncelSayac, setGuncelSayac] = useState("");
  const [bakimAraligi, setBakimAraligi] = useState("");

  async function save() {
    if (!ad) return;
    await onSave({ ad, tur, plaka, sayac_tipi: sayacTipi, guncel_sayac: Number(guncelSayac) || 0, bakim_araligi: bakimAraligi ? Number(bakimAraligi) : null, son_bakim_sayac: Number(guncelSayac) || 0, aktif: true });
  }
  return (
    <Modal title="Yeni Araç / Makine Ekle" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={row}><label style={lbl}>ARAÇ / MAKİNE ADI *</label><input style={inpSt} value={ad} onChange={(e) => setAd(e.target.value)} placeholder="Örn. Hitachi 48-U" /></div>
        <div style={row}><label style={lbl}>TÜR</label><input style={inpSt} value={tur} onChange={(e) => setTur(e.target.value)} placeholder="Ekskavatör, Kamyon, vb." /></div>
        <div style={row}><label style={lbl}>PLAKA / SERİ NO</label><input style={inpSt} value={plaka} onChange={(e) => setPlaka(e.target.value)} /></div>
        <div style={row}><label style={lbl}>SAYAÇ TİPİ</label>
          <select style={{ ...inpSt, cursor: "pointer" }} value={sayacTipi} onChange={(e) => setSayacTipi(e.target.value)}>
            <option value="saat">Motor Saati</option>
            <option value="km">Kilometre</option>
          </select>
        </div>
        <div style={row}><label style={lbl}>GÜNCEL SAYAÇ DEĞERİ</label><input style={inpSt} type="number" value={guncelSayac} onChange={(e) => setGuncelSayac(e.target.value)} placeholder="0" /></div>
        <div style={row}><label style={lbl}>BAKIM ARALIĞI (opsiyonel)</label><input style={inpSt} type="number" value={bakimAraligi} onChange={(e) => setBakimAraligi(e.target.value)} placeholder="Örn. 250 (saat/km)" /></div>
        <button onClick={save} style={{ ...bs(C.navy, "#fff"), padding: 12 }}>💾 Kaydet</button>
      </div>
    </Modal>
  );
}

// ─── ÇALIŞMA KAYDI FORM ─────────────────────────────────────────────────────
function CalismaForm({ arac, onClose, onSave }) {
  const [tarih, setTarih] = useState(todayStr());
  const [calismaMiktari, setCalismaMiktari] = useState("");
  const [sayacDegeri, setSayacDegeri] = useState("");
  const [mazotLitre, setMazotLitre] = useState("");
  const [mazotTl, setMazotTl] = useState("");
  const [digerGider, setDigerGider] = useState("");
  const [kazanc, setKazanc] = useState("");
  const [aciklama, setAciklama] = useState("");

  async function save() {
    await onSave({
      arac_id: arac.id, tarih, calisma_miktari: Number(calismaMiktari) || 0, sayac_degeri: sayacDegeri ? Number(sayacDegeri) : null,
      mazot_litre: Number(mazotLitre) || 0, mazot_tl: Number(mazotTl) || 0, diger_gider: Number(digerGider) || 0,
      kazanc: Number(kazanc) || 0, aciklama,
    });
  }
  return (
    <Modal title={`${arac.ad} — Yeni Çalışma Kaydı`} onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={row}><label style={lbl}>TARİH</label><input style={inpSt} type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} /></div>
        <div style={row}><label style={lbl}>{arac.sayac_tipi === "km" ? "KM" : "ÇALIŞMA SAATİ"}</label><input style={inpSt} type="number" value={calismaMiktari} onChange={(e) => setCalismaMiktari(e.target.value)} /></div>
        <div style={{ ...row, gridColumn: "1/-1" }}><label style={lbl}>GÜNCEL SAYAÇ OKUMASI (opsiyonel, açık kontrolü için)</label><input style={inpSt} type="number" value={sayacDegeri} onChange={(e) => setSayacDegeri(e.target.value)} placeholder={`Örn. ${arac.guncel_sayac}`} /></div>
        <div style={row}><label style={lbl}>MAZOT LİTRE</label><input style={inpSt} type="number" value={mazotLitre} onChange={(e) => setMazotLitre(e.target.value)} /></div>
        <div style={row}><label style={lbl}>MAZOT TL</label><input style={inpSt} type="number" value={mazotTl} onChange={(e) => setMazotTl(e.target.value)} /></div>
        <div style={row}><label style={lbl}>DİĞER GİDER</label><input style={inpSt} type="number" value={digerGider} onChange={(e) => setDigerGider(e.target.value)} /></div>
        <div style={row}><label style={lbl}>KAZANÇ</label><input style={inpSt} type="number" value={kazanc} onChange={(e) => setKazanc(e.target.value)} /></div>
        <div style={{ ...row, gridColumn: "1/-1" }}><label style={lbl}>AÇIKLAMA</label><input style={inpSt} value={aciklama} onChange={(e) => setAciklama(e.target.value)} /></div>
      </div>
      <button onClick={save} style={{ ...bs(C.navy, "#fff"), padding: 12, width: "100%", marginTop: 18 }}>💾 Kaydet</button>
    </Modal>
  );
}

// ─── FİLO ────────────────────────────────────────────────────────────────────
function FiloView({ araclar, calismaKayitlari, reload }) {
  const [showForm, setShowForm] = useState(false);
  const [secili, setSecili] = useState(null);
  const [showKayitForm, setShowKayitForm] = useState(false);

  async function saveArac(data) { await dbInsert("araclar", data); await reload(); setShowForm(false); }
  async function saveKayit(data) { await dbInsert("calisma_kayitlari", data); await reload(); setShowKayitForm(false); }

  if (secili) {
    const kayitlar = calismaKayitlari.filter((k) => k.arac_id === secili.id).sort((a, b) => (a.tarih < b.tarih ? 1 : -1));
    const buAy = kayitlar.filter((k) => k.tarih >= startOfPeriod("ay"));
    const loglananSaat = buAy.reduce((a, k) => a + Number(k.calisma_miktari || 0), 0);
    const sayacli = buAy.filter((k) => k.sayac_degeri != null);
    let sayacFarki = null;
    if (sayacli.length >= 2) {
      const degerler = sayacli.map((k) => Number(k.sayac_degeri)).sort((a, b) => a - b);
      sayacFarki = degerler[degerler.length - 1] - degerler[0];
    }
    const bakimKalan = secili.bakim_araligi ? secili.son_bakim_sayac + Number(secili.bakim_araligi) - Number(secili.guncel_sayac) : null;

    return (
      <div>
        {showKayitForm && <CalismaForm arac={secili} onClose={() => setShowKayitForm(false)} onSave={saveKayit} />}
        <button onClick={() => setSecili(null)} style={{ ...ob(C.smoke), marginBottom: 14 }}>← Filoya Dön</button>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: C.navy }}>{secili.ad}</div>
            <div style={{ fontSize: 12, color: C.smoke }}>{secili.tur} {secili.plaka ? `· ${secili.plaka}` : ""} · Güncel sayaç: {secili.guncel_sayac} {secili.sayac_tipi}</div>
          </div>
          <button onClick={() => setShowKayitForm(true)} style={bs(C.green, "#fff")}>+ Çalışma Kaydı Ekle</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 18 }}>
          <div style={cardSt({ padding: 16 })}>
            <div style={{ fontSize: 10, color: C.smoke, marginBottom: 4 }}>BU AY LOGLANAN {secili.sayac_tipi === "km" ? "KM" : "SAAT"}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.navy }}>{loglananSaat}</div>
          </div>
          <div style={cardSt({ padding: 16 })}>
            <div style={{ fontSize: 10, color: C.smoke, marginBottom: 4 }}>SAYAÇ FARKI (BU AY)</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: sayacFarki == null ? C.smoke : (Math.abs(sayacFarki - loglananSaat) > 2 ? C.red : C.green) }}>
              {sayacFarki == null ? "yetersiz veri" : sayacFarki}
            </div>
            {sayacFarki != null && Math.abs(sayacFarki - loglananSaat) > 2 && (
              <div style={{ fontSize: 11, color: C.red, marginTop: 4 }}>⚠ {Math.abs(sayacFarki - loglananSaat)} {secili.sayac_tipi} açık var</div>
            )}
          </div>
          <div style={cardSt({ padding: 16 })}>
            <div style={{ fontSize: 10, color: C.smoke, marginBottom: 4 }}>BAKIMA KALAN</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: bakimKalan == null ? C.smoke : (bakimKalan <= BAKIM_UYARI_ESIGI ? C.red : C.navy) }}>
              {bakimKalan == null ? "tanımsız" : `${bakimKalan} ${secili.sayac_tipi}`}
            </div>
          </div>
        </div>

        <div style={cardSt({ padding: 0 })}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr>{["Tarih", secili.sayac_tipi === "km" ? "Km" : "Saat", "Sayaç", "Mazot L", "Mazot ₺", "Diğer Gider", "Kazanç", "Açıklama"].map((h) => (
              <th key={h} style={{ background: C.panel, color: C.smoke, padding: "9px 12px", textAlign: "left", fontSize: 11, borderBottom: `1px solid ${C.border}` }}>{h}</th>
            ))}</tr></thead>
            <tbody>{kayitlar.map((k) => (
              <tr key={k.id}>
                <td style={{ padding: "9px 12px", borderBottom: `1px solid ${C.border}` }}>{k.tarih}</td>
                <td style={{ padding: "9px 12px", borderBottom: `1px solid ${C.border}` }}>{k.calisma_miktari}</td>
                <td style={{ padding: "9px 12px", borderBottom: `1px solid ${C.border}`, color: C.smoke }}>{k.sayac_degeri ?? "-"}</td>
                <td style={{ padding: "9px 12px", borderBottom: `1px solid ${C.border}` }}>{k.mazot_litre}</td>
                <td style={{ padding: "9px 12px", borderBottom: `1px solid ${C.border}` }}>{fmt(k.mazot_tl)}</td>
                <td style={{ padding: "9px 12px", borderBottom: `1px solid ${C.border}` }}>{fmt(k.diger_gider)}</td>
                <td style={{ padding: "9px 12px", borderBottom: `1px solid ${C.border}`, color: C.green, fontWeight: 700 }}>{fmt(k.kazanc)}</td>
                <td style={{ padding: "9px 12px", borderBottom: `1px solid ${C.border}`, color: C.smoke }}>{k.aciklama}</td>
              </tr>
            ))}</tbody>
          </table>
          {kayitlar.length === 0 && <div style={{ padding: 30, textAlign: "center", color: C.smoke }}>Henüz kayıt yok</div>}
        </div>
      </div>
    );
  }

  return (
    <div>
      {showForm && <AracForm onClose={() => setShowForm(false)} onSave={saveArac} />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.navy }}>Filo</div>
        <button onClick={() => setShowForm(true)} style={bs(C.green, "#fff")}>+ Araç / Makine Ekle</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 14 }}>
        {araclar.map((a) => {
          const bakimKalan = a.bakim_araligi ? a.son_bakim_sayac + Number(a.bakim_araligi) - Number(a.guncel_sayac) : null;
          return (
            <div key={a.id} onClick={() => setSecili(a)} style={{ ...cardSt({ padding: 18 }), cursor: "pointer" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.navy }}>{a.ad}</div>
              <div style={{ fontSize: 12, color: C.smoke, marginTop: 2 }}>{a.tur} {a.plaka ? `· ${a.plaka}` : ""}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                <span style={pill(C.blue)}>{a.guncel_sayac} {a.sayac_tipi}</span>
                {bakimKalan != null && bakimKalan <= BAKIM_UYARI_ESIGI && <span style={pill(C.red)}>Bakım yakın</span>}
              </div>
            </div>
          );
        })}
      </div>
      {araclar.length === 0 && <div style={{ textAlign: "center", padding: 60, color: C.smoke }}>Henüz araç/makine eklenmedi</div>}
    </div>
  );
}

// ─── GİDER FORM/VIEW ─────────────────────────────────────────────────────────
function GiderForm({ araclar, kartlar, onClose, onSave }) {
  const [tarih, setTarih] = useState(todayStr());
  const [kategori, setKategori] = useState(GIDER_KATEGORILERI[0]);
  const [aciklama, setAciklama] = useState("");
  const [tutar, setTutar] = useState("");
  const [aracId, setAracId] = useState("");
  const [kartId, setKartId] = useState("");
  const [odemeYontemi, setOdemeYontemi] = useState("Nakit");

  async function save() {
    if (!tutar) return;
    await onSave({ tarih, kategori, aciklama, tutar: Number(tutar), arac_id: aracId || null, kart_id: kartId || null, odeme_yontemi: odemeYontemi });
  }
  return (
    <Modal title="Yeni Gider" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={row}><label style={lbl}>TARİH</label><input style={inpSt} type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} /></div>
        <div style={row}><label style={lbl}>KATEGORİ</label>
          <select style={{ ...inpSt, cursor: "pointer" }} value={kategori} onChange={(e) => setKategori(e.target.value)}>
            {GIDER_KATEGORILERI.map((k) => <option key={k}>{k}</option>)}
          </select>
        </div>
        <div style={row}><label style={lbl}>AÇIKLAMA</label><input style={inpSt} value={aciklama} onChange={(e) => setAciklama(e.target.value)} /></div>
        <div style={row}><label style={lbl}>TUTAR (₺) *</label><input style={inpSt} type="number" value={tutar} onChange={(e) => setTutar(e.target.value)} /></div>
        {kartlar.length > 0 && (
          <div style={row}><label style={lbl}>HANGİ KART/HESAP (opsiyonel)</label>
            <select style={{ ...inpSt, cursor: "pointer" }} value={kartId} onChange={(e) => setKartId(e.target.value)}>
              <option value="">-</option>
              {kartlar.map((k) => <option key={k.id} value={k.id}>{k.ad}</option>)}
            </select>
          </div>
        )}
        {araclar.length > 0 && (
          <div style={row}><label style={lbl}>İLGİLİ ARAÇ (opsiyonel)</label>
            <select style={{ ...inpSt, cursor: "pointer" }} value={aracId} onChange={(e) => setAracId(e.target.value)}>
              <option value="">-</option>
              {araclar.map((a) => <option key={a.id} value={a.id}>{a.ad}</option>)}
            </select>
          </div>
        )}
        <div style={row}><label style={lbl}>ÖDEME YÖNTEMİ</label>
          <select style={{ ...inpSt, cursor: "pointer" }} value={odemeYontemi} onChange={(e) => setOdemeYontemi(e.target.value)}>
            {["Nakit", "Banka", "Kredi Kartı", "Veresiye"].map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>
        <button onClick={save} style={{ ...bs(C.navy, "#fff"), padding: 12 }}>💾 Kaydet</button>
      </div>
    </Modal>
  );
}

function GiderlerView({ giderler, araclar, kartlar, butceler, reload }) {
  const [showForm, setShowForm] = useState(false);
  const [fKategori, setFKategori] = useState("Tümü");
  const aracAdi = (id) => araclar.find((a) => a.id === id)?.ad || "-";

  async function save(data) { await dbInsert("giderler", data); await reload(); setShowForm(false); }
  async function sil(id) { if (window.confirm("Silinsin mi?")) { await dbDelete("giderler", id); await reload(); } }

  const filtered = giderler.filter((g) => fKategori === "Tümü" || g.kategori === fKategori).sort((a, b) => (a.tarih < b.tarih ? 1 : -1));
  const toplam = filtered.reduce((a, g) => a + Number(g.tutar || 0), 0);

  const buAyBaslangic = startOfPeriod("ay");
  const butceUyarilari = butceler.map((b) => {
    const harcanan = giderler.filter((g) => g.kategori === b.kategori && g.tarih >= buAyBaslangic).reduce((a, g) => a + Number(g.tutar || 0), 0);
    return { ...b, harcanan, oran: b.aylik_limit > 0 ? harcanan / b.aylik_limit : 0 };
  }).filter((b) => b.oran >= 0.8);

  return (
    <div>
      {showForm && <GiderForm araclar={araclar} kartlar={kartlar} onClose={() => setShowForm(false)} onSave={save} />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.navy }}>Giderler</div>
        <button onClick={() => setShowForm(true)} style={bs(C.red, "#fff")}>+ Gider Ekle</button>
      </div>

      {butceUyarilari.length > 0 && (
        <div style={{ ...cardSt({ padding: 14 }), marginBottom: 14, border: `1px solid ${C.orange}` }}>
          {butceUyarilari.map((b) => (
            <div key={b.id} style={{ fontSize: 12, color: b.oran >= 1 ? C.red : C.orange, marginBottom: 4 }}>
              {b.oran >= 1 ? "⚠ Bütçe aşıldı: " : "⚠ Bütçeye yaklaşıldı: "}
              <b>{b.kategori}</b> — {fmt(b.harcanan)} / {fmt(b.aylik_limit)} (%{Math.round(b.oran * 100)})
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
        <select style={{ ...inpSt, width: "auto", cursor: "pointer" }} value={fKategori} onChange={(e) => setFKategori(e.target.value)}>
          <option>Tümü</option>{GIDER_KATEGORILERI.map((k) => <option key={k}>{k}</option>)}
        </select>
        <span style={{ fontSize: 13, color: C.smoke }}>{filtered.length} kayıt · Toplam <b style={{ color: C.red }}>{fmt(toplam)}</b></span>
      </div>
      <div style={cardSt({ padding: 0 })}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr>{["Tarih", "Kategori", "Açıklama", "Araç", "Ödeme", "Tutar", ""].map((h) => (
            <th key={h} style={{ background: C.panel, color: C.smoke, padding: "9px 12px", textAlign: "left", fontSize: 11, borderBottom: `1px solid ${C.border}` }}>{h}</th>
          ))}</tr></thead>
          <tbody>{filtered.map((g) => (
            <tr key={g.id}>
              <td style={{ padding: "9px 12px", borderBottom: `1px solid ${C.border}` }}>{g.tarih}</td>
              <td style={{ padding: "9px 12px", borderBottom: `1px solid ${C.border}` }}><span style={pill(C.orange)}>{g.kategori}</span></td>
              <td style={{ padding: "9px 12px", borderBottom: `1px solid ${C.border}`, color: C.smoke }}>{g.aciklama}</td>
              <td style={{ padding: "9px 12px", borderBottom: `1px solid ${C.border}`, color: C.smoke }}>{g.arac_id ? aracAdi(g.arac_id) : "-"}</td>
              <td style={{ padding: "9px 12px", borderBottom: `1px solid ${C.border}`, color: C.smoke }}>{g.odeme_yontemi}</td>
              <td style={{ padding: "9px 12px", borderBottom: `1px solid ${C.border}`, fontWeight: 700, color: C.red }}>{fmt(g.tutar)}</td>
              <td style={{ padding: "9px 12px", borderBottom: `1px solid ${C.border}` }}><button onClick={() => sil(g.id)} style={ob(C.smoke)}>Sil</button></td>
            </tr>
          ))}</tbody>
        </table>
        {filtered.length === 0 && <div style={{ padding: 30, textAlign: "center", color: C.smoke }}>Kayıt yok</div>}
      </div>
    </div>
  );
}

// ─── GELİR FORM/VIEW ─────────────────────────────────────────────────────────
function GelirForm({ araclar, onClose, onSave }) {
  const [tarih, setTarih] = useState(todayStr());
  const [aciklama, setAciklama] = useState("");
  const [tutar, setTutar] = useState("");
  const [aracId, setAracId] = useState("");

  async function save() {
    if (!tutar) return;
    await onSave({ tarih, aciklama, tutar: Number(tutar), arac_id: aracId || null });
  }
  return (
    <Modal title="Yeni Gelir" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={row}><label style={lbl}>TARİH</label><input style={inpSt} type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} /></div>
        <div style={row}><label style={lbl}>AÇIKLAMA</label><input style={inpSt} value={aciklama} onChange={(e) => setAciklama(e.target.value)} placeholder="Örn. Maaş, ek iş, satış" /></div>
        <div style={row}><label style={lbl}>TUTAR (₺) *</label><input style={inpSt} type="number" value={tutar} onChange={(e) => setTutar(e.target.value)} /></div>
        {araclar.length > 0 && (
          <div style={row}><label style={lbl}>İLGİLİ ARAÇ (opsiyonel)</label>
            <select style={{ ...inpSt, cursor: "pointer" }} value={aracId} onChange={(e) => setAracId(e.target.value)}>
              <option value="">-</option>
              {araclar.map((a) => <option key={a.id} value={a.id}>{a.ad}</option>)}
            </select>
          </div>
        )}
        <button onClick={save} style={{ ...bs(C.navy, "#fff"), padding: 12 }}>💾 Kaydet</button>
      </div>
    </Modal>
  );
}

function GelirlerView({ gelirler, araclar, reload }) {
  const [showForm, setShowForm] = useState(false);
  const aracAdi = (id) => araclar.find((a) => a.id === id)?.ad || "-";
  async function save(data) { await dbInsert("gelirler", data); await reload(); setShowForm(false); }
  async function sil(id) { if (window.confirm("Silinsin mi?")) { await dbDelete("gelirler", id); await reload(); } }
  const sorted = [...gelirler].sort((a, b) => (a.tarih < b.tarih ? 1 : -1));
  const toplam = sorted.reduce((a, g) => a + Number(g.tutar || 0), 0);
  return (
    <div>
      {showForm && <GelirForm araclar={araclar} onClose={() => setShowForm(false)} onSave={save} />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.navy }}>Gelirler</div>
        <button onClick={() => setShowForm(true)} style={bs(C.green, "#fff")}>+ Gelir Ekle</button>
      </div>
      <div style={{ marginBottom: 14, fontSize: 13, color: C.smoke }}>{sorted.length} kayıt · Toplam <b style={{ color: C.green }}>{fmt(toplam)}</b></div>
      <div style={cardSt({ padding: 0 })}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr>{["Tarih", "Açıklama", "Araç", "Tutar", ""].map((h) => (
            <th key={h} style={{ background: C.panel, color: C.smoke, padding: "9px 12px", textAlign: "left", fontSize: 11, borderBottom: `1px solid ${C.border}` }}>{h}</th>
          ))}</tr></thead>
          <tbody>{sorted.map((g) => (
            <tr key={g.id}>
              <td style={{ padding: "9px 12px", borderBottom: `1px solid ${C.border}` }}>{g.tarih}</td>
              <td style={{ padding: "9px 12px", borderBottom: `1px solid ${C.border}`, color: C.smoke }}>{g.aciklama}</td>
              <td style={{ padding: "9px 12px", borderBottom: `1px solid ${C.border}`, color: C.smoke }}>{g.arac_id ? aracAdi(g.arac_id) : "-"}</td>
              <td style={{ padding: "9px 12px", borderBottom: `1px solid ${C.border}`, fontWeight: 700, color: C.green }}>{fmt(g.tutar)}</td>
              <td style={{ padding: "9px 12px", borderBottom: `1px solid ${C.border}` }}><button onClick={() => sil(g.id)} style={ob(C.smoke)}>Sil</button></td>
            </tr>
          ))}</tbody>
        </table>
        {sorted.length === 0 && <div style={{ padding: 30, textAlign: "center", color: C.smoke }}>Kayıt yok</div>}
      </div>
    </div>
  );
}

// ─── KARTLAR / HESAPLAR ──────────────────────────────────────────────────────
function KartForm({ onClose, onSave }) {
  const [ad, setAd] = useState("");
  const [tur, setTur] = useState("kredi_karti");
  const [bakiye, setBakiye] = useState("");
  const [sonOdemeGunu, setSonOdemeGunu] = useState("");

  async function save() {
    if (!ad) return;
    await onSave({ ad, tur, bakiye: Number(bakiye) || 0, son_odeme_gunu: tur === "kredi_karti" && sonOdemeGunu ? Number(sonOdemeGunu) : null });
  }
  return (
    <Modal title="Yeni Kart / Hesap Ekle" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={row}><label style={lbl}>AD *</label><input style={inpSt} value={ad} onChange={(e) => setAd(e.target.value)} placeholder="Örn. Ziraat Kredi Kartı" /></div>
        <div style={row}><label style={lbl}>TÜR</label>
          <select style={{ ...inpSt, cursor: "pointer" }} value={tur} onChange={(e) => setTur(e.target.value)}>
            <option value="kredi_karti">Kredi Kartı</option>
            <option value="banka_hesabi">Banka Hesabı</option>
            <option value="nakit">Nakit</option>
          </select>
        </div>
        <div style={row}><label style={lbl}>GÜNCEL BAKİYE (₺)</label><input style={inpSt} type="number" value={bakiye} onChange={(e) => setBakiye(e.target.value)} placeholder="Kredi kartıysa borç tutarı" /></div>
        {tur === "kredi_karti" && (
          <div style={row}><label style={lbl}>SON ÖDEME GÜNÜ (ayın kaçı, 1-31)</label><input style={inpSt} type="number" min="1" max="31" value={sonOdemeGunu} onChange={(e) => setSonOdemeGunu(e.target.value)} placeholder="Örn. 15" /></div>
        )}
        <button onClick={save} style={{ ...bs(C.navy, "#fff"), padding: 12 }}>💾 Kaydet</button>
      </div>
    </Modal>
  );
}

function gunFarki(tarih) {
  const bugun = new Date(todayStr());
  const hedef = new Date(tarih);
  return Math.round((hedef - bugun) / 86400000);
}

function odemeGunuKalan(sonOdemeGunu) {
  const bugun = new Date();
  let hedef = new Date(bugun.getFullYear(), bugun.getMonth(), sonOdemeGunu);
  if (hedef < bugun) hedef = new Date(bugun.getFullYear(), bugun.getMonth() + 1, sonOdemeGunu);
  return Math.round((hedef - bugun) / 86400000);
}

function KartlarView({ kartlar, reload }) {
  const [showForm, setShowForm] = useState(false);
  async function save(data) { await dbInsert("kartlar", data); await reload(); setShowForm(false); }
  async function guncelleBakiye(kart, yeniBakiye) { await dbUpdate("kartlar", kart.id, { bakiye: yeniBakiye }); await reload(); }
  async function sil(id) { if (window.confirm("Silinsin mi?")) { await dbDelete("kartlar", id); await reload(); } }

  return (
    <div>
      {showForm && <KartForm onClose={() => setShowForm(false)} onSave={save} />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.navy }}>Kartlar / Hesaplar</div>
        <button onClick={() => setShowForm(true)} style={bs(C.blue, "#fff")}>+ Kart / Hesap Ekle</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 14 }}>
        {kartlar.map((k) => {
          const kalan = k.son_odeme_gunu ? odemeGunuKalan(k.son_odeme_gunu) : null;
          const yakin = kalan != null && kalan <= KART_ODEME_UYARI_GUN;
          const turIkon = k.tur === "kredi_karti" ? "💳" : k.tur === "banka_hesabi" ? "🏦" : "💵";
          return (
            <div key={k.id} style={{ ...cardSt({ padding: 18 }), border: yakin ? `1px solid ${C.red}` : `1px solid ${C.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.navy }}>{turIkon} {k.ad}</div>
                <button onClick={() => sil(k.id)} style={{ background: "none", border: "none", color: C.smoke, cursor: "pointer" }}>✕</button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                <input type="number" defaultValue={k.bakiye} onBlur={(e) => guncelleBakiye(k, Number(e.target.value) || 0)} style={{ ...inpSt, width: 120 }} />
                <span style={{ fontSize: 12, color: C.smoke }}>₺ bakiye</span>
              </div>
              {k.son_odeme_gunu && (
                <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: yakin ? C.red : C.smoke }}>
                  {yakin ? "⚠ " : ""}Son ödeme: ayın {k.son_odeme_gunu}'i — {kalan} gün kaldı
                </div>
              )}
            </div>
          );
        })}
      </div>
      {kartlar.length === 0 && <div style={{ textAlign: "center", padding: 60, color: C.smoke }}>Henüz kart/hesap eklenmedi</div>}
    </div>
  );
}

// ─── BÜTÇE ────────────────────────────────────────────────────────────────────
function ButceForm({ onClose, onSave }) {
  const [kategori, setKategori] = useState(GIDER_KATEGORILERI[0]);
  const [limit, setLimit] = useState("");
  async function save() {
    if (!limit) return;
    await onSave({ kategori, aylik_limit: Number(limit) });
  }
  return (
    <Modal title="Yeni Bütçe Limiti" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={row}><label style={lbl}>KATEGORİ</label>
          <select style={{ ...inpSt, cursor: "pointer" }} value={kategori} onChange={(e) => setKategori(e.target.value)}>
            {GIDER_KATEGORILERI.map((k) => <option key={k}>{k}</option>)}
          </select>
        </div>
        <div style={row}><label style={lbl}>AYLIK LİMİT (₺) *</label><input style={inpSt} type="number" value={limit} onChange={(e) => setLimit(e.target.value)} /></div>
        <button onClick={save} style={{ ...bs(C.navy, "#fff"), padding: 12 }}>💾 Kaydet</button>
      </div>
    </Modal>
  );
}

function ButcelerView({ butceler, giderler, reload }) {
  const [showForm, setShowForm] = useState(false);
  async function save(data) { await dbInsert("butceler", data); await reload(); setShowForm(false); }
  async function sil(id) { if (window.confirm("Silinsin mi?")) { await dbDelete("butceler", id); await reload(); } }
  const buAyBaslangic = startOfPeriod("ay");

  return (
    <div>
      {showForm && <ButceForm onClose={() => setShowForm(false)} onSave={save} />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.navy }}>Bütçe</div>
        <button onClick={() => setShowForm(true)} style={bs(C.purple, "#fff")}>+ Bütçe Limiti Ekle</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {butceler.map((b) => {
          const harcanan = giderler.filter((g) => g.kategori === b.kategori && g.tarih >= buAyBaslangic).reduce((a, g) => a + Number(g.tutar || 0), 0);
          const oran = b.aylik_limit > 0 ? Math.min(1, harcanan / b.aylik_limit) : 0;
          const asildi = harcanan > b.aylik_limit;
          return (
            <div key={b.id} style={cardSt({ padding: 16 })}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontWeight: 700, color: C.navy }}>{b.kategori}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 13, color: asildi ? C.red : C.smoke, fontWeight: 700 }}>{fmt(harcanan)} / {fmt(b.aylik_limit)}</span>
                  <button onClick={() => sil(b.id)} style={ob(C.smoke)}>Sil</button>
                </div>
              </div>
              <div style={{ height: 8, background: C.panel, borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${oran * 100}%`, background: asildi ? C.red : oran > 0.8 ? C.orange : C.green, borderRadius: 4 }} />
              </div>
            </div>
          );
        })}
      </div>
      {butceler.length === 0 && <div style={{ textAlign: "center", padding: 60, color: C.smoke }}>Henüz bütçe limiti eklenmedi</div>}
    </div>
  );
}

// ─── BORÇ / ALACAK ────────────────────────────────────────────────────────────
function BorcForm({ onClose, onSave }) {
  const [tur, setTur] = useState("borc");
  const [kisi, setKisi] = useState("");
  const [tutar, setTutar] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [vadeTarihi, setVadeTarihi] = useState("");
  async function save() {
    if (!kisi || !tutar) return;
    await onSave({ tur, kisi, tutar: Number(tutar), aciklama, vade_tarihi: vadeTarihi || null, odendi: false });
  }
  return (
    <Modal title="Yeni Borç / Alacak" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={row}><label style={lbl}>TÜR</label>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setTur("borc")} style={{ ...ob(C.red), flex: 1, background: tur === "borc" ? C.red + "15" : "transparent" }}>Borcum (Ödeyeceğim)</button>
            <button onClick={() => setTur("alacak")} style={{ ...ob(C.green), flex: 1, background: tur === "alacak" ? C.green + "15" : "transparent" }}>Alacağım (Bana Ödenecek)</button>
          </div>
        </div>
        <div style={row}><label style={lbl}>KİŞİ / KURUM *</label><input style={inpSt} value={kisi} onChange={(e) => setKisi(e.target.value)} /></div>
        <div style={row}><label style={lbl}>TUTAR (₺) *</label><input style={inpSt} type="number" value={tutar} onChange={(e) => setTutar(e.target.value)} /></div>
        <div style={row}><label style={lbl}>VADE TARİHİ (opsiyonel)</label><input style={inpSt} type="date" value={vadeTarihi} onChange={(e) => setVadeTarihi(e.target.value)} /></div>
        <div style={row}><label style={lbl}>AÇIKLAMA</label><input style={inpSt} value={aciklama} onChange={(e) => setAciklama(e.target.value)} /></div>
        <button onClick={save} style={{ ...bs(C.navy, "#fff"), padding: 12 }}>💾 Kaydet</button>
      </div>
    </Modal>
  );
}

function BorclarView({ borclar, reload }) {
  const [showForm, setShowForm] = useState(false);
  async function save(data) { await dbInsert("borclar", data); await reload(); setShowForm(false); }
  async function odendiIsaretle(id, deger) { await dbUpdate("borclar", id, { odendi: deger }); await reload(); }
  async function sil(id) { if (window.confirm("Silinsin mi?")) { await dbDelete("borclar", id); await reload(); } }

  const borclarim = borclar.filter((b) => b.tur === "borc" && !b.odendi);
  const alacaklarim = borclar.filter((b) => b.tur === "alacak" && !b.odendi);
  const odenenler = borclar.filter((b) => b.odendi);

  function Liste({ items, renk }) {
    return items.map((b) => (
      <div key={b.id} style={{ ...cardSt({ padding: "12px 16px" }), display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>{b.kisi}</span>
          <span style={{ marginLeft: 10, fontSize: 13, fontWeight: 700, color: renk }}>{fmt(b.tutar)}</span>
          {b.vade_tarihi && <span style={{ marginLeft: 10, fontSize: 12, color: C.smoke }}>Vade: {b.vade_tarihi} ({gunFarki(b.vade_tarihi) >= 0 ? `${gunFarki(b.vade_tarihi)} gün kaldı` : `${-gunFarki(b.vade_tarihi)} gün geçti`})</span>}
          {b.aciklama && <div style={{ fontSize: 12, color: C.smoke, marginTop: 2 }}>{b.aciklama}</div>}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => odendiIsaretle(b.id, true)} style={ob(C.green)}>Ödendi</button>
          <button onClick={() => sil(b.id)} style={ob(C.smoke)}>Sil</button>
        </div>
      </div>
    ));
  }

  return (
    <div>
      {showForm && <BorcForm onClose={() => setShowForm(false)} onSave={save} />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.navy }}>Borç / Alacak</div>
        <button onClick={() => setShowForm(true)} style={bs(C.orange, "#fff")}>+ Ekle</button>
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, color: C.red, marginBottom: 10 }}>Borçlarım ({fmt(borclarim.reduce((a, b) => a + Number(b.tutar), 0))})</div>
      <div style={{ marginBottom: 20 }}>{borclarim.length ? <Liste items={borclarim} renk={C.red} /> : <div style={{ color: C.smoke, fontSize: 13 }}>Borç yok</div>}</div>

      <div style={{ fontSize: 13, fontWeight: 700, color: C.green, marginBottom: 10 }}>Alacaklarım ({fmt(alacaklarim.reduce((a, b) => a + Number(b.tutar), 0))})</div>
      <div style={{ marginBottom: 20 }}>{alacaklarim.length ? <Liste items={alacaklarim} renk={C.green} /> : <div style={{ color: C.smoke, fontSize: 13 }}>Alacak yok</div>}</div>

      {odenenler.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.smoke, marginBottom: 10 }}>Ödenenler / Kapananlar</div>
          {odenenler.map((b) => (
            <div key={b.id} style={{ ...cardSt({ padding: "10px 16px" }), display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, opacity: 0.6 }}>
              <span style={{ fontSize: 12, color: C.smoke, textDecoration: "line-through" }}>{b.kisi} — {fmt(b.tutar)}</span>
              <button onClick={() => sil(b.id)} style={ob(C.smoke)}>Sil</button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── ENVANTER ────────────────────────────────────────────────────────────────
function EnvanterForm({ onClose, onSave }) {
  const [urunAdi, setUrunAdi] = useState("");
  const [birim, setBirim] = useState("adet");
  const [miktar, setMiktar] = useState("");
  const [minUyari, setMinUyari] = useState("");
  async function save() {
    if (!urunAdi) return;
    await onSave({ urun_adi: urunAdi, birim, miktar: Number(miktar) || 0, min_uyari_seviyesi: minUyari ? Number(minUyari) : null });
  }
  return (
    <Modal title="Yeni Stok Kalemi" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={row}><label style={lbl}>ÜRÜN ADI *</label><input style={inpSt} value={urunAdi} onChange={(e) => setUrunAdi(e.target.value)} placeholder="Örn. Mazot" /></div>
        <div style={row}><label style={lbl}>BİRİM</label>
          <select style={{ ...inpSt, cursor: "pointer" }} value={birim} onChange={(e) => setBirim(e.target.value)}>
            {["adet", "litre", "teneke", "kg", "metre"].map((b) => <option key={b}>{b}</option>)}
          </select>
        </div>
        <div style={row}><label style={lbl}>MİKTAR</label><input style={inpSt} type="number" value={miktar} onChange={(e) => setMiktar(e.target.value)} /></div>
        <div style={row}><label style={lbl}>MİNİMUM UYARI SEVİYESİ (opsiyonel)</label><input style={inpSt} type="number" value={minUyari} onChange={(e) => setMinUyari(e.target.value)} /></div>
        <button onClick={save} style={{ ...bs(C.navy, "#fff"), padding: 12 }}>💾 Kaydet</button>
      </div>
    </Modal>
  );
}

function EnvanterView({ envanter, reload }) {
  const [showForm, setShowForm] = useState(false);
  async function save(data) { await dbInsert("envanter", data); await reload(); setShowForm(false); }
  async function guncelle(item, delta) { await dbUpdate("envanter", item.id, { miktar: Math.max(0, Number(item.miktar) + delta) }); await reload(); }
  async function sil(id) { if (window.confirm("Silinsin mi?")) { await dbDelete("envanter", id); await reload(); } }

  return (
    <div>
      {showForm && <EnvanterForm onClose={() => setShowForm(false)} onSave={save} />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.navy }}>Envanter / Stok</div>
        <button onClick={() => setShowForm(true)} style={bs(C.purple, "#fff")}>+ Stok Kalemi Ekle</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 14 }}>
        {envanter.map((e) => {
          const dusuk = e.min_uyari_seviyesi != null && Number(e.miktar) <= Number(e.min_uyari_seviyesi);
          return (
            <div key={e.id} style={{ ...cardSt({ padding: 16 }), border: dusuk ? `1px solid ${C.red}` : `1px solid ${C.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.navy }}>{e.urun_adi}</div>
                <button onClick={() => sil(e.id)} style={{ background: "none", border: "none", color: C.smoke, cursor: "pointer" }}>✕</button>
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: dusuk ? C.red : C.navy, marginTop: 8 }}>{e.miktar} <span style={{ fontSize: 13, color: C.smoke, fontWeight: 400 }}>{e.birim}</span></div>
              {dusuk && <div style={{ fontSize: 11, color: C.red, marginTop: 4 }}>⚠ Stok azaldı</div>}
              <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                <button onClick={() => guncelle(e, -1)} style={ob(C.smoke)}>-1</button>
                <button onClick={() => guncelle(e, 1)} style={ob(C.smoke)}>+1</button>
                <button onClick={() => guncelle(e, -10)} style={ob(C.smoke)}>-10</button>
                <button onClick={() => guncelle(e, 10)} style={ob(C.smoke)}>+10</button>
              </div>
            </div>
          );
        })}
      </div>
      {envanter.length === 0 && <div style={{ textAlign: "center", padding: 60, color: C.smoke }}>Henüz stok kalemi yok</div>}
    </div>
  );
}

// ─── HATIRLATICILAR ──────────────────────────────────────────────────────────
function HatirlaticiForm({ araclar, onClose, onSave }) {
  const [tur, setTur] = useState(HATIRLATICI_TURLERI[0]);
  const [aciklama, setAciklama] = useState("");
  const [hedefTarih, setHedefTarih] = useState("");
  const [tekrar, setTekrar] = useState("aylik");
  const [aracId, setAracId] = useState("");
  const [hedefSayac, setHedefSayac] = useState("");

  async function save() {
    await onSave({ tur, aciklama, hedef_tarih: hedefTarih || null, tekrar, arac_id: aracId || null, hedef_sayac: hedefSayac ? Number(hedefSayac) : null, aktif: true });
  }
  const bakimTuru = tur === "Bakım";
  return (
    <Modal title="Yeni Hatırlatma" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={row}><label style={lbl}>TÜR</label>
          <select style={{ ...inpSt, cursor: "pointer" }} value={tur} onChange={(e) => setTur(e.target.value)}>
            {HATIRLATICI_TURLERI.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div style={row}><label style={lbl}>AÇIKLAMA</label><input style={inpSt} value={aciklama} onChange={(e) => setAciklama(e.target.value)} /></div>
        {bakimTuru && araclar.length > 0 ? (
          <>
            <div style={row}><label style={lbl}>ARAÇ / MAKİNE</label>
              <select style={{ ...inpSt, cursor: "pointer" }} value={aracId} onChange={(e) => setAracId(e.target.value)}>
                <option value="">Seç...</option>
                {araclar.map((a) => <option key={a.id} value={a.id}>{a.ad}</option>)}
              </select>
            </div>
            <div style={row}><label style={lbl}>HEDEF SAYAÇ DEĞERİ (örn. 250)</label><input style={inpSt} type="number" value={hedefSayac} onChange={(e) => setHedefSayac(e.target.value)} /></div>
          </>
        ) : (
          <>
            <div style={row}><label style={lbl}>HEDEF TARİH</label><input style={inpSt} type="date" value={hedefTarih} onChange={(e) => setHedefTarih(e.target.value)} /></div>
            <div style={row}><label style={lbl}>TEKRAR</label>
              <select style={{ ...inpSt, cursor: "pointer" }} value={tekrar} onChange={(e) => setTekrar(e.target.value)}>
                <option value="tek_seferlik">Tek Seferlik</option>
                <option value="aylik">Aylık</option>
                <option value="yillik">Yıllık</option>
              </select>
            </div>
          </>
        )}
        <button onClick={save} style={{ ...bs(C.navy, "#fff"), padding: 12 }}>💾 Kaydet</button>
      </div>
    </Modal>
  );
}

function HatirlaticilarView({ hatirlaticilar, araclar, reload }) {
  const [showForm, setShowForm] = useState(false);
  async function save(data) { await dbInsert("hatirlaticilar", data); await reload(); setShowForm(false); }
  async function sil(id) { if (window.confirm("Silinsin mi?")) { await dbDelete("hatirlaticilar", id); await reload(); } }
  const aracAdi = (id) => araclar.find((a) => a.id === id)?.ad || "-";

  const aktifler = hatirlaticilar.filter((h) => h.aktif);
  const tarihli = aktifler.filter((h) => h.hedef_tarih).sort((a, b) => (a.hedef_tarih > b.hedef_tarih ? 1 : -1));
  const bakimli = aktifler.filter((h) => h.tur === "Bakım" && h.arac_id);

  return (
    <div>
      {showForm && <HatirlaticiForm araclar={araclar} onClose={() => setShowForm(false)} onSave={save} />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.navy }}>Hatırlatmalar</div>
        <button onClick={() => setShowForm(true)} style={bs(C.blue, "#fff")}>+ Hatırlatma Ekle</button>
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 10 }}>Tarihli (Maaş / SGK / KDV / Kredi vb.)</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
        {tarihli.map((h) => {
          const kalan = gunFarki(h.hedef_tarih);
          const yakin = kalan <= 5;
          return (
            <div key={h.id} style={{ ...cardSt({ padding: "12px 16px" }), display: "flex", justifyContent: "space-between", alignItems: "center", border: yakin ? `1px solid ${C.red}` : `1px solid ${C.border}` }}>
              <div>
                <span style={pill(C.blue)}>{h.tur}</span>
                <span style={{ marginLeft: 10, fontSize: 13, color: C.navy }}>{h.aciklama}</span>
                <span style={{ marginLeft: 10, fontSize: 12, color: C.smoke }}>{h.hedef_tarih}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: yakin ? C.red : C.smoke }}>{kalan >= 0 ? `${kalan} gün kaldı` : `${-kalan} gün geçti`}</span>
                <button onClick={() => sil(h.id)} style={ob(C.smoke)}>Sil</button>
              </div>
            </div>
          );
        })}
        {tarihli.length === 0 && <div style={{ color: C.smoke, fontSize: 13 }}>Tarihli hatırlatma yok</div>}
      </div>

      {araclar.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 10 }}>Bakım (Sayaç Bazlı)</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {bakimli.map((h) => {
              const arac = araclar.find((a) => a.id === h.arac_id);
              const kalan = arac ? Number(h.hedef_sayac) - Number(arac.guncel_sayac) : null;
              const yakin = kalan != null && kalan <= BAKIM_UYARI_ESIGI;
              return (
                <div key={h.id} style={{ ...cardSt({ padding: "12px 16px" }), display: "flex", justifyContent: "space-between", alignItems: "center", border: yakin ? `1px solid ${C.red}` : `1px solid ${C.border}` }}>
                  <div>
                    <span style={pill(C.orange)}>Bakım</span>
                    <span style={{ marginLeft: 10, fontSize: 13, color: C.navy }}>{aracAdi(h.arac_id)} — {h.aciklama || `${h.hedef_sayac} ${arac?.sayac_tipi}'te bakım`}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: yakin ? C.red : C.smoke }}>{kalan != null ? `${kalan} ${arac?.sayac_tipi} kaldı` : "-"}</span>
                    <button onClick={() => sil(h.id)} style={ob(C.smoke)}>Sil</button>
                  </div>
                </div>
              );
            })}
            {bakimli.length === 0 && <div style={{ color: C.smoke, fontSize: 13 }}>Bakım hatırlatması yok</div>}
          </div>
        </>
      )}
    </div>
  );
}

// ─── HAKKINDA ─────────────────────────────────────────────────────────────────
function HakkindaView() {
  const maddeler = [
    "Gelir, gider, bütçe ve kart takibinizi tek ekrandan yönetmenizi sağlar.",
    "İnternetin olduğu her yerden, anlık kayıtlar üzerinden gelir, gider, kart borçları ve genel durumunuzu net görürsünüz.",
    "Borçlarınızı ve alacaklarınızı tek yerden takip edersiniz.",
    "İsterseniz araç/makine ve envanter takibinizi de aynı sistemde tutarsınız.",
    "Her kullanıcının verisi tamamen kendine özeldir, başka hiç kimse göremez.",
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 720 }}>
      <div style={cardSt({ padding: 24 })}>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.navy, marginBottom: 14 }}>Bu Program Ne İşe Yarar?</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {maddeler.map((m, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ color: C.green, fontWeight: 900, marginTop: 1 }}>✓</span>
              <span style={{ fontSize: 14, color: C.navy, lineHeight: 1.5 }}>{m}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={cardSt({ padding: 24, borderLeft: `4px solid ${C.orange}` })}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.orange, marginBottom: 10 }}>⚠️ Önemli Not</div>
        <div style={{ fontSize: 13, color: C.navy, lineHeight: 1.7 }}>
          Bu program resmi bir muhasebe/faturalama sistemi <strong>değildir</strong>. Sadece sizin girdiğiniz verileri düzenler,
          analiz eder ve kaydetmek istediğiniz hatırlatmaları size gösterir. Fatura kesmez, resmi belge üretmez, para
          transferi/ödeme işlemi yapmaz. Doğruluğu tamamen girdiğiniz verilere bağlıdır — resmi muhasebeniz için mali
          müşavirinizle çalışmaya devam etmelisiniz. Bu, işinizi kolaylaştıran kişisel bir takip aracıdır.
        </div>
      </div>

      <div style={cardSt({ padding: 24 })}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.navy, marginBottom: 14 }}>Uygulamayı İndir</div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a href="/downloads/CebimKur.exe" download style={{ ...bs(C.navy, "#fff"), textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}><WindowsIcon size={20} /> Windows'a İndir</a>
          <a href="/downloads/Cebim.apk" download style={{ ...bs(C.navy, "#fff"), textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}><AndroidIcon size={20} /> Android'e İndir</a>
        </div>
        <div style={{ fontSize: 12, color: C.smoke, marginTop: 12, lineHeight: 1.5 }}>
          Windows: indirdiğin dosyaya çift tıkla, çıkan güvenlik uyarısında "Yine de çalıştır" de.<br />
          Android: indirdiğin dosyayı aç, "bilinmeyen kaynaklara izin ver" sorarsa onayla.
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ araclar, calismaKayitlari, giderler, gelirler, envanter, hatirlaticilar, kartlar, borclar }) {
  const [period, setPeriod] = useState("ay");
  const baslangic = startOfPeriod(period);

  const donemGider = useMemo(() => {
    const g1 = giderler.filter((g) => g.tarih >= baslangic).reduce((a, g) => a + Number(g.tutar || 0), 0);
    const g2 = calismaKayitlari.filter((k) => k.tarih >= baslangic).reduce((a, k) => a + Number(k.mazot_tl || 0) + Number(k.diger_gider || 0), 0);
    return g1 + g2;
  }, [giderler, calismaKayitlari, baslangic]);

  const donemGelir = useMemo(() => {
    const g1 = gelirler.filter((g) => g.tarih >= baslangic).reduce((a, g) => a + Number(g.tutar || 0), 0);
    const g2 = calismaKayitlari.filter((k) => k.tarih >= baslangic).reduce((a, k) => a + Number(k.kazanc || 0), 0);
    return g1 + g2;
  }, [gelirler, calismaKayitlari, baslangic]);

  const kategoriKirilimi = useMemo(() => {
    const map = {};
    giderler.filter((g) => g.tarih >= baslangic).forEach((g) => {
      map[g.kategori] = (map[g.kategori] || 0) + Number(g.tutar || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, value]) => ({ label, value }));
  }, [giderler, baslangic]);

  const gunler = useMemo(() => {
    const map = {};
    calismaKayitlari.filter((k) => k.tarih >= baslangic).forEach((k) => {
      map[k.tarih] = map[k.tarih] || { gelir: 0, gider: 0 };
      map[k.tarih].gelir += Number(k.kazanc || 0);
      map[k.tarih].gider += Number(k.mazot_tl || 0) + Number(k.diger_gider || 0);
    });
    giderler.filter((g) => g.tarih >= baslangic).forEach((g) => {
      map[g.tarih] = map[g.tarih] || { gelir: 0, gider: 0 };
      map[g.tarih].gider += Number(g.tutar || 0);
    });
    gelirler.filter((g) => g.tarih >= baslangic).forEach((g) => {
      map[g.tarih] = map[g.tarih] || { gelir: 0, gider: 0 };
      map[g.tarih].gelir += Number(g.tutar || 0);
    });
    return Object.entries(map).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [calismaKayitlari, giderler, gelirler, baslangic]);

  const dusukStok = envanter.filter((e) => e.min_uyari_seviyesi != null && Number(e.miktar) <= Number(e.min_uyari_seviyesi));
  const yakinHatirlaticilar = hatirlaticilar.filter((h) => {
    if (!h.aktif) return false;
    if (h.hedef_tarih) return gunFarki(h.hedef_tarih) <= 5;
    if (h.tur === "Bakım" && h.arac_id) {
      const arac = araclar.find((a) => a.id === h.arac_id);
      return arac && Number(h.hedef_sayac) - Number(arac.guncel_sayac) <= BAKIM_UYARI_ESIGI;
    }
    return false;
  });
  const yakinKartlar = kartlar.filter((k) => k.son_odeme_gunu && odemeGunuKalan(k.son_odeme_gunu) <= KART_ODEME_UYARI_GUN);
  const yakinBorclar = borclar.filter((b) => !b.odendi && b.vade_tarihi && gunFarki(b.vade_tarihi) <= 5);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {[["gun", "Bugün"], ["hafta", "Bu Hafta"], ["ay", "Bu Ay"], ["yil", "Bu Yıl"]].map(([k, v]) => (
          <button key={k} onClick={() => setPeriod(k)} style={bs(period === k ? C.navy : "transparent", period === k ? "#fff" : C.smoke, { border: `1px solid ${period === k ? C.navy : C.border}` })}>{v}</button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
        <div style={cardSt({ padding: 18 })}><div style={{ fontSize: 11, color: C.smoke, marginBottom: 6 }}>TOPLAM GELİR</div><div style={{ fontSize: 24, fontWeight: 900, color: C.green }}>{fmt(donemGelir)}</div></div>
        <div style={cardSt({ padding: 18 })}><div style={{ fontSize: 11, color: C.smoke, marginBottom: 6 }}>TOPLAM GİDER</div><div style={{ fontSize: 24, fontWeight: 900, color: C.red }}>{fmt(donemGider)}</div></div>
        <div style={cardSt({ padding: 18 })}><div style={{ fontSize: 11, color: C.smoke, marginBottom: 6 }}>NET (KASA)</div><div style={{ fontSize: 24, fontWeight: 900, color: donemGelir - donemGider >= 0 ? C.green : C.red }}>{fmt(donemGelir - donemGider)}</div></div>
      </div>

      {(dusukStok.length > 0 || yakinHatirlaticilar.length > 0 || yakinKartlar.length > 0 || yakinBorclar.length > 0) && (
        <div style={{ ...cardSt({ padding: 16 }), marginBottom: 20, border: `1px solid ${C.red}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.red, marginBottom: 8 }}>⚠ DİKKAT</div>
          {dusukStok.map((e) => <div key={e.id} style={{ fontSize: 13, color: C.navy, marginBottom: 4 }}>Stok azaldı: <b>{e.urun_adi}</b> ({e.miktar} {e.birim} kaldı)</div>)}
          {yakinHatirlaticilar.map((h) => <div key={h.id} style={{ fontSize: 13, color: C.navy, marginBottom: 4 }}>Yaklaşan: <b>{h.tur}</b> — {h.aciklama}</div>)}
          {yakinKartlar.map((k) => <div key={k.id} style={{ fontSize: 13, color: C.navy, marginBottom: 4 }}>Kart ödemesi yaklaşıyor: <b>{k.ad}</b> — ayın {k.son_odeme_gunu}'i ({odemeGunuKalan(k.son_odeme_gunu)} gün kaldı)</div>)}
          {yakinBorclar.map((b) => <div key={b.id} style={{ fontSize: 13, color: C.navy, marginBottom: 4 }}>Vade yaklaşıyor: <b>{b.kisi}</b> — {fmt(b.tutar)} ({b.tur === "borc" ? "ödenecek" : "alınacak"})</div>)}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={cardSt({ padding: 16 })}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 12 }}>Gider Dağılımı</div>
          <PieChart data={kategoriKirilimi} />
        </div>
        <div style={cardSt({ padding: 16 })}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 10 }}>Envanter</div>
          {envanter.slice(0, 8).map((e) => (
            <div key={e.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
              <span style={{ color: C.smoke }}>{e.urun_adi}</span>
              <span style={{ fontWeight: 700, color: e.min_uyari_seviyesi != null && Number(e.miktar) <= Number(e.min_uyari_seviyesi) ? C.red : C.navy }}>{e.miktar} {e.birim}</span>
            </div>
          ))}
          {envanter.length === 0 && <div style={{ color: C.smoke, fontSize: 13 }}>Stok kalemi yok</div>}
        </div>
      </div>

      <div style={cardSt({ padding: 0 })}>
        <div style={{ padding: "14px 16px", fontSize: 13, fontWeight: 700, color: C.navy, borderBottom: `1px solid ${C.border}` }}>Günlük Özet</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr>{["Tarih", "Gelir", "Gider", "Net"].map((h) => <th key={h} style={{ background: C.panel, color: C.smoke, padding: "8px 12px", textAlign: "left", fontSize: 11 }}>{h}</th>)}</tr></thead>
          <tbody>{gunler.map(([tarih, v]) => (
            <tr key={tarih}>
              <td style={{ padding: "8px 12px", borderBottom: `1px solid ${C.border}` }}>{tarih}</td>
              <td style={{ padding: "8px 12px", borderBottom: `1px solid ${C.border}`, color: C.green }}>{fmt(v.gelir)}</td>
              <td style={{ padding: "8px 12px", borderBottom: `1px solid ${C.border}`, color: C.red }}>{fmt(v.gider)}</td>
              <td style={{ padding: "8px 12px", borderBottom: `1px solid ${C.border}`, fontWeight: 700 }}>{fmt(v.gelir - v.gider)}</td>
            </tr>
          ))}</tbody>
        </table>
        {gunler.length === 0 && <div style={{ padding: 24, textAlign: "center", color: C.smoke }}>Bu dönemde kayıt yok</div>}
      </div>
    </div>
  );
}

// ─── ANA UYGULAMA ─────────────────────────────────────────────────────────────
export default function FiloTakip() {
  const [session, setSession] = useState(undefined); // undefined = kontrol ediliyor, null = giriş yok
  const [showAuth, setShowAuth] = useState(false);
  const [active, setActive] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [araclar, setAraclar] = useState([]);
  const [calismaKayitlari, setCalismaKayitlari] = useState([]);
  const [giderler, setGiderler] = useState([]);
  const [gelirler, setGelirler] = useState([]);
  const [envanter, setEnvanter] = useState([]);
  const [hatirlaticilar, setHatirlaticilar] = useState([]);
  const [kartlar, setKartlar] = useState([]);
  const [butceler, setButceler] = useState([]);
  const [borclar, setBorclar] = useState([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => setSession(sess));
    return () => sub.subscription.unsubscribe();
  }, []);

  const hesapTipi = session?.user?.user_metadata?.hesap_tipi || "bireysel";
  const isletmeModu = hesapTipi === "isletme";

  async function loadAll() {
    setLoading(true);
    const [a, ck, g, ge, e, h, k, b, bo] = await Promise.all([
      dbGet("araclar", "ad"),
      dbGet("calisma_kayitlari", "tarih"),
      dbGet("giderler", "tarih"),
      dbGet("gelirler", "tarih"),
      dbGet("envanter", "urun_adi"),
      dbGet("hatirlaticilar", "created_at"),
      dbGet("kartlar", "created_at"),
      dbGet("butceler", "created_at"),
      dbGet("borclar", "created_at"),
    ]);
    setAraclar(a); setCalismaKayitlari(ck); setGiderler(g); setGelirler(ge); setEnvanter(e); setHatirlaticilar(h);
    setKartlar(k); setButceler(b); setBorclar(bo);
    setLoading(false);
  }

  useEffect(() => { if (session) loadAll(); }, [session]);

  if (session === undefined) return <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: C.navy, fontSize: 18, fontWeight: 700, fontFamily: "'Inter',sans-serif" }}><img src="/icon-192.png" alt="" style={{ height: 32, marginRight: 10 }} /> Yükleniyor...</div>;
  if (!session) return showAuth ? <AuthScreen onAuthed={() => {}} onBack={() => setShowAuth(false)} /> : <LandingPage onStart={() => setShowAuth(true)} />;
  if (loading) return <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: C.navy, fontSize: 18, fontWeight: 700, fontFamily: "'Inter',sans-serif" }}><img src="/icon-192.png" alt="" style={{ height: 32, marginRight: 10 }} /> Cebim yükleniyor...</div>;

  const TABS = [
    { key: "dashboard", icon: "📊", label: "Ana Sayfa" },
    { key: "giderler", icon: "💸", label: "Giderler" },
    { key: "gelirler", icon: "💰", label: "Gelirler" },
    { key: "kartlar", icon: "💳", label: "Kartlar" },
    { key: "butceler", icon: "🎯", label: "Bütçe" },
    { key: "borclar", icon: "🤝", label: "Borç/Alacak" },
    ...(isletmeModu ? [
      { key: "filo", icon: "🚜", label: "Filo" },
      { key: "envanter", icon: "📦", label: "Envanter" },
    ] : []),
    { key: "hatirlaticilar", icon: "⏰", label: "Hatırlatmalar" },
    { key: "hakkinda", icon: "ℹ️", label: "Hakkında" },
  ];

  return (
    <div style={{ fontFamily: "'Inter','Helvetica Neue',sans-serif", background: C.bg, minHeight: "100vh", color: C.navy, display: "flex", flexDirection: "column" }}>
      <div style={{ background: C.navy, padding: "0 24px", display: "flex", alignItems: "center", height: 56, flexShrink: 0, position: "sticky", top: 0, zIndex: 50, overflowX: "auto" }}>
        <div style={{ marginRight: 20, paddingRight: 20, borderRight: "1px solid rgba(255,255,255,0.1)", flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <img src="/icon-192.png" alt="Cebim" style={{ height: 26, width: 26 }} />
          <div style={{ fontWeight: 900, fontSize: 16, letterSpacing: 2, color: "#fff", lineHeight: 1 }}>Cebim</div>
        </div>
        <div style={{ display: "flex", gap: 4, flex: 1 }}>
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setActive(t.key)} style={{ background: active === t.key ? "rgba(255,255,255,0.15)" : "transparent", color: active === t.key ? "#fff" : "rgba(255,255,255,0.5)", border: "none", borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 13, fontWeight: active === t.key ? 700 : 400, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
              <span>{t.icon}</span><span>{t.label}</span>
            </button>
          ))}
        </div>
        <button onClick={() => supabase.auth.signOut()} style={{ ...ob("rgba(255,255,255,0.3)"), color: "rgba(255,255,255,0.5)", fontSize: 11, flexShrink: 0 }}>Çıkış</button>
      </div>

      <div style={{ flex: 1, padding: "24px 28px", overflowY: "auto", maxWidth: 1300, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
        {active === "dashboard" && <Dashboard araclar={araclar} calismaKayitlari={calismaKayitlari} giderler={giderler} gelirler={gelirler} envanter={envanter} hatirlaticilar={hatirlaticilar} kartlar={kartlar} borclar={borclar} />}
        {active === "filo" && isletmeModu && <FiloView araclar={araclar} calismaKayitlari={calismaKayitlari} reload={loadAll} />}
        {active === "giderler" && <GiderlerView giderler={giderler} araclar={araclar} kartlar={kartlar} butceler={butceler} reload={loadAll} />}
        {active === "gelirler" && <GelirlerView gelirler={gelirler} araclar={araclar} reload={loadAll} />}
        {active === "kartlar" && <KartlarView kartlar={kartlar} reload={loadAll} />}
        {active === "butceler" && <ButcelerView butceler={butceler} giderler={giderler} reload={loadAll} />}
        {active === "borclar" && <BorclarView borclar={borclar} reload={loadAll} />}
        {active === "envanter" && isletmeModu && <EnvanterView envanter={envanter} reload={loadAll} />}
        {active === "hatirlaticilar" && <HatirlaticilarView hatirlaticilar={hatirlaticilar} araclar={araclar} reload={loadAll} />}
        {active === "hakkinda" && <HakkindaView />}
      </div>

      <div style={{ position: "fixed", bottom: 8, right: 12, fontSize: 11, color: "rgba(27,46,75,0.35)", pointerEvents: "none", zIndex: 40 }}>
        Shadow Master
      </div>
    </div>
  );
}
