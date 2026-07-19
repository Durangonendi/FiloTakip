import { useState, useMemo, useEffect } from "react";

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;
const PASSWORD = "Filo2026";

const C = {
  bg: "#F7F8FA", navy: "#1B2E4B", panel: "#EEF1F5", card: "#FFFFFF",
  green: "#2ECC71", red: "#E74C3C", blue: "#3498DB", orange: "#E67E22",
  purple: "#9B59B6", smoke: "#7F8C8D", muted: "#BDC3C7", border: "#E0E6ED",
};

const GIDER_KATEGORILERI = ["Banka", "Personel", "Yakıt", "Araç", "Fatura", "Maliye ve Muhasebe", "Ofis", "Kasa", "Diğer"];
const HATIRLATICI_TURLERI = ["Maaş", "SGK", "KDV", "Kredi", "Bakım", "Diğer"];
const BAKIM_UYARI_ESIGI = 10; // sayaç eşiğe bu kadar kala uyar

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

// ─── DB ────────────────────────────────────────────────────────────────────
const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" };

async function dbGet(table, query = "") {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*${query}`, { headers });
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (e) { return []; }
}
async function dbInsert(table, row) {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}`, { method: "POST", headers: { ...headers, Prefer: "return=minimal" }, body: JSON.stringify(row) });
}
async function dbUpdate(table, id, row) {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, { method: "PATCH", headers, body: JSON.stringify(row) });
}
async function dbDelete(table, id) {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, { method: "DELETE", headers });
}

// ─── STYLE HELPERS ───────────────────────────────────────────────────────────
const bs = (bg, color, ex = {}) => ({ background: bg, color, border: "none", borderRadius: 6, padding: "8px 18px", cursor: "pointer", fontSize: 13, fontWeight: 700, ...ex });
const ob = (color) => ({ background: "transparent", color, border: `1px solid ${color}44`, borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600 });
const cardSt = (ex = {}) => ({ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", ...ex });
const pill = (color) => ({ background: color + "20", color, border: `1px solid ${color}40`, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", display: "inline-block" });
const inpSt = { background: "#F8F9FA", color: C.navy, border: `1px solid ${C.border}`, borderRadius: 6, padding: "9px 12px", fontSize: 13, width: "100%", boxSizing: "border-box", outline: "none" };
const lbl = { fontSize: 11, color: C.smoke, fontWeight: 600, letterSpacing: 0.5 };
const row = { display: "flex", flexDirection: "column", gap: 5 };

// ─── LOGIN ────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [pass, setPass] = useState("");
  const [error, setError] = useState(false);
  function tryLogin() {
    if (pass === PASSWORD) onLogin();
    else { setError(true); setTimeout(() => setError(false), 2000); }
  }
  return (
    <div style={{ fontFamily: "'Inter',sans-serif", background: "linear-gradient(135deg,#1B2E4B,#243447)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 48, width: 360, textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🚜</div>
        <div style={{ fontSize: 24, fontWeight: 900, color: C.navy, marginBottom: 4, letterSpacing: 1 }}>Kontrol Masası</div>
        <div style={{ fontSize: 11, color: C.smoke, letterSpacing: 2, marginBottom: 32 }}>FİLO • GİDER • GELİR • ENVANTER</div>
        <input type="password" placeholder="Şifre girin..." value={pass} onChange={(e) => setPass(e.target.value)} onKeyDown={(e) => e.key === "Enter" && tryLogin()}
          style={{ ...inpSt, textAlign: "center", letterSpacing: 4, marginBottom: 12, border: `1px solid ${error ? C.red : C.border}` }} />
        {error && <div style={{ color: C.red, fontSize: 12, marginBottom: 8 }}>Yanlış şifre!</div>}
        <button onClick={tryLogin} style={{ ...bs(C.navy, "#fff"), width: "100%", padding: 12, fontSize: 14 }}>Giriş Yap</button>
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

// ─── GİDER FORM ──────────────────────────────────────────────────────────────
function GiderForm({ araclar, onClose, onSave }) {
  const [tarih, setTarih] = useState(todayStr());
  const [kategori, setKategori] = useState(GIDER_KATEGORILERI[0]);
  const [aciklama, setAciklama] = useState("");
  const [tutar, setTutar] = useState("");
  const [aracId, setAracId] = useState("");
  const [odemeYontemi, setOdemeYontemi] = useState("Nakit");

  async function save() {
    if (!tutar) return;
    await onSave({ tarih, kategori, aciklama, tutar: Number(tutar), arac_id: aracId || null, odeme_yontemi: odemeYontemi });
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
        <div style={row}><label style={lbl}>İLGİLİ ARAÇ (opsiyonel)</label>
          <select style={{ ...inpSt, cursor: "pointer" }} value={aracId} onChange={(e) => setAracId(e.target.value)}>
            <option value="">-</option>
            {araclar.map((a) => <option key={a.id} value={a.id}>{a.ad}</option>)}
          </select>
        </div>
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

function GiderlerView({ giderler, araclar, reload }) {
  const [showForm, setShowForm] = useState(false);
  const [fKategori, setFKategori] = useState("Tümü");
  const aracAdi = (id) => araclar.find((a) => a.id === id)?.ad || "-";

  async function save(data) { await dbInsert("giderler", data); await reload(); setShowForm(false); }
  async function sil(id) { if (window.confirm("Silinsin mi?")) { await dbDelete("giderler", id); await reload(); } }

  const filtered = giderler.filter((g) => fKategori === "Tümü" || g.kategori === fKategori).sort((a, b) => (a.tarih < b.tarih ? 1 : -1));
  const toplam = filtered.reduce((a, g) => a + Number(g.tutar || 0), 0);

  return (
    <div>
      {showForm && <GiderForm araclar={araclar} onClose={() => setShowForm(false)} onSave={save} />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.navy }}>Giderler</div>
        <button onClick={() => setShowForm(true)} style={bs(C.red, "#fff")}>+ Gider Ekle</button>
      </div>
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
        <div style={row}><label style={lbl}>AÇIKLAMA</label><input style={inpSt} value={aciklama} onChange={(e) => setAciklama(e.target.value)} placeholder="Örn. Makine satışı" /></div>
        <div style={row}><label style={lbl}>TUTAR (₺) *</label><input style={inpSt} type="number" value={tutar} onChange={(e) => setTutar(e.target.value)} /></div>
        <div style={row}><label style={lbl}>İLGİLİ ARAÇ (opsiyonel)</label>
          <select style={{ ...inpSt, cursor: "pointer" }} value={aracId} onChange={(e) => setAracId(e.target.value)}>
            <option value="">-</option>
            {araclar.map((a) => <option key={a.id} value={a.id}>{a.ad}</option>)}
          </select>
        </div>
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
        <div style={{ fontSize: 18, fontWeight: 800, color: C.navy }}>Gelirler (araç kazançları hariç, diğer gelirler)</div>
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
        {bakimTuru ? (
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

function gunFarki(tarih) {
  const bugun = new Date(todayStr());
  const hedef = new Date(tarih);
  return Math.round((hedef - bugun) / 86400000);
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
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ araclar, calismaKayitlari, giderler, gelirler, envanter, hatirlaticilar }) {
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

      {(dusukStok.length > 0 || yakinHatirlaticilar.length > 0) && (
        <div style={{ ...cardSt({ padding: 16 }), marginBottom: 20, border: `1px solid ${C.red}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.red, marginBottom: 8 }}>⚠ DİKKAT</div>
          {dusukStok.map((e) => <div key={e.id} style={{ fontSize: 13, color: C.navy, marginBottom: 4 }}>Stok azaldı: <b>{e.urun_adi}</b> ({e.miktar} {e.birim} kaldı)</div>)}
          {yakinHatirlaticilar.map((h) => <div key={h.id} style={{ fontSize: 13, color: C.navy, marginBottom: 4 }}>Yaklaşan: <b>{h.tur}</b> — {h.aciklama}</div>)}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
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
    </div>
  );
}

// ─── ANA UYGULAMA ─────────────────────────────────────────────────────────────
export default function FiloTakip() {
  const [loggedIn, setLoggedIn] = useState(() => { try { return localStorage.getItem("filotakip_auth") === "1"; } catch (e) { return false; } });
  const [active, setActive] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [araclar, setAraclar] = useState([]);
  const [calismaKayitlari, setCalismaKayitlari] = useState([]);
  const [giderler, setGiderler] = useState([]);
  const [gelirler, setGelirler] = useState([]);
  const [envanter, setEnvanter] = useState([]);
  const [hatirlaticilar, setHatirlaticilar] = useState([]);

  async function loadAll() {
    setLoading(true);
    const [a, ck, g, ge, e, h] = await Promise.all([
      dbGet("araclar", "&order=ad.asc"),
      dbGet("calisma_kayitlari", "&order=tarih.desc"),
      dbGet("giderler", "&order=tarih.desc"),
      dbGet("gelirler", "&order=tarih.desc"),
      dbGet("envanter", "&order=urun_adi.asc"),
      dbGet("hatirlaticilar", "&order=created_at.desc"),
    ]);
    setAraclar(a); setCalismaKayitlari(ck); setGiderler(g); setGelirler(ge); setEnvanter(e); setHatirlaticilar(h);
    setLoading(false);
  }

  useEffect(() => { if (loggedIn) loadAll(); }, [loggedIn]);

  function handleLogin() {
    try { localStorage.setItem("filotakip_auth", "1"); } catch (e) {}
    setLoggedIn(true);
  }

  if (!loggedIn) return <LoginScreen onLogin={handleLogin} />;
  if (loading) return <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: C.navy, fontSize: 18, fontWeight: 700, fontFamily: "'Inter',sans-serif" }}>🚜 Kontrol Masası yükleniyor...</div>;

  const TABS = [
    { key: "dashboard", icon: "📊", label: "Ana Sayfa" },
    { key: "filo", icon: "🚜", label: "Filo" },
    { key: "giderler", icon: "💸", label: "Giderler" },
    { key: "gelirler", icon: "💰", label: "Gelirler" },
    { key: "envanter", icon: "📦", label: "Envanter" },
    { key: "hatirlaticilar", icon: "⏰", label: "Hatırlatmalar" },
  ];

  return (
    <div style={{ fontFamily: "'Inter','Helvetica Neue',sans-serif", background: C.bg, minHeight: "100vh", color: C.navy, display: "flex", flexDirection: "column" }}>
      <div style={{ background: C.navy, padding: "0 24px", display: "flex", alignItems: "center", height: 56, flexShrink: 0, position: "sticky", top: 0, zIndex: 50, overflowX: "auto" }}>
        <div style={{ marginRight: 20, paddingRight: 20, borderRight: "1px solid rgba(255,255,255,0.1)", flexShrink: 0 }}>
          <div style={{ fontWeight: 900, fontSize: 16, letterSpacing: 2, color: "#fff", lineHeight: 1 }}>🚜 Kontrol Masası</div>
        </div>
        <div style={{ display: "flex", gap: 4, flex: 1 }}>
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setActive(t.key)} style={{ background: active === t.key ? "rgba(255,255,255,0.15)" : "transparent", color: active === t.key ? "#fff" : "rgba(255,255,255,0.5)", border: "none", borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 13, fontWeight: active === t.key ? 700 : 400, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
              <span>{t.icon}</span><span>{t.label}</span>
            </button>
          ))}
        </div>
        <button onClick={() => { try { localStorage.removeItem("filotakip_auth"); } catch (e) {} setLoggedIn(false); }} style={{ ...ob("rgba(255,255,255,0.3)"), color: "rgba(255,255,255,0.5)", fontSize: 11, flexShrink: 0 }}>Çıkış</button>
      </div>

      <div style={{ flex: 1, padding: "24px 28px", overflowY: "auto", maxWidth: 1300, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
        {active === "dashboard" && <Dashboard araclar={araclar} calismaKayitlari={calismaKayitlari} giderler={giderler} gelirler={gelirler} envanter={envanter} hatirlaticilar={hatirlaticilar} />}
        {active === "filo" && <FiloView araclar={araclar} calismaKayitlari={calismaKayitlari} reload={loadAll} />}
        {active === "giderler" && <GiderlerView giderler={giderler} araclar={araclar} reload={loadAll} />}
        {active === "gelirler" && <GelirlerView gelirler={gelirler} araclar={araclar} reload={loadAll} />}
        {active === "envanter" && <EnvanterView envanter={envanter} reload={loadAll} />}
        {active === "hatirlaticilar" && <HatirlaticilarView hatirlaticilar={hatirlaticilar} araclar={araclar} reload={loadAll} />}
      </div>

      <div style={{ position: "fixed", bottom: 8, right: 12, fontSize: 11, color: "rgba(27,46,75,0.35)", pointerEvents: "none", zIndex: 40 }}>
        Shadow Master
      </div>
    </div>
  );
}
