import React, { useState, useEffect, useRef, useCallback } from "react";
import { useApp } from "../context/AppCtx";
import * as API from "../api";
import { Card, CardTitle, Btn, Alert, Field, FormGrid, Badge } from "../components/Primitives";
import { IEdit, ISave, ICheckCirc, ICheckSq, ICalendar } from "../icons/Icons";

const todayStr = () => new Date().toISOString().split("T")[0];

// ── Image compression (kept from Gemini's version) ──────────
const MAX_PHOTO_DIMENSION = 1600;
const PHOTO_QUALITY       = 0.78;
const MAX_ORIGINAL_SIZE_MB = 1.5;
const fmtFileSize = b => b < 1024 * 1024 ? `${Math.round(b/1024)} KB` : `${(b/1024/1024).toFixed(2)} MB`;
const loadImage   = f => new Promise((res, rej) => { const url = URL.createObjectURL(f); const img = new Image(); img.onload = () => { URL.revokeObjectURL(url); res(img); }; img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("Could not read image")); }; img.src = url; });
const cvBlob      = (cv, t, q) => new Promise((res, rej) => cv.toBlob(b => b ? res(b) : rej(new Error("Compress failed")), t, q));
async function compressImage(file) {
  if (!file?.type?.startsWith("image/") || file.size <= MAX_ORIGINAL_SIZE_MB * 1024 * 1024) return file;
  const img = await loadImage(file);
  const scale = Math.min(1, MAX_PHOTO_DIMENSION / Math.max(img.width, img.height));
  const [w, h] = [Math.max(1, Math.round(img.width * scale)), Math.max(1, Math.round(img.height * scale))];
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const ctx = cv.getContext("2d"); if (!ctx) throw new Error("Canvas failed"); ctx.drawImage(img, 0, 0, w, h);
  const outType = file.type === "image/png" ? "image/jpeg" : (file.type === "image/webp" ? "image/webp" : "image/jpeg");
  const blob = await cvBlob(cv, outType, PHOTO_QUALITY);
  if (blob.size >= file.size) return file;
  const ext = outType === "image/webp" ? "webp" : "jpg";
  return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.${ext}`, { type: outType, lastModified: Date.now() });
}

// ── Inline icons ─────────────────────────────────────────────
const ICamera = ({ size = 16, color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/>
  </svg>
);
const IUpload = ({ size = 18, color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);
const IExpand = ({ size = 12, color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
    <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
  </svg>
);
const IXSmall = ({ size = 11, color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IChevLeft  = ({ size = 16, color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
);
const IChevRight = ({ size = 16, color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
);

const WEATHER_EMOJI = { "Clear":"☀️","Partly Cloudy":"⛅","Overcast":"☁️","Light Rain":"🌧️","Heavy Rain":"⛈️","Extreme Heat":"🌡️" };
const SAFETY_COLOR  = { "All Clear":"green","Minor Concerns":"amber","Work Stopped":"red" };

// ── Lightbox ─────────────────────────────────────────────────
function Lightbox({ url, caption, onClose }) {
  useEffect(() => {
    const fn = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.88)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ position: "relative", maxWidth: "min(90vw, 860px)", maxHeight: "88vh", display: "flex", flexDirection: "column", gap: 8 }}>
        <img src={url} alt={caption || "Site photo"} style={{ maxWidth: "100%", maxHeight: "82vh", objectFit: "contain", borderRadius: 12, display: "block" }} />
        {caption && <div style={{ color: "#e5e7eb", fontSize: 13, textAlign: "center", fontWeight: 500 }}>{caption}</div>}
        <button onClick={onClose} style={{ position: "absolute", top: -12, right: -12, width: 30, height: 30, borderRadius: "50%", background: "#374151", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <IXSmall size={13} color="#fff" />
        </button>
      </div>
    </div>
  );
}

// ── Photo thumbnail ───────────────────────────────────────────
function PhotoCard({ photo, onDelete, onOpen, tk, readOnly = false }) {
  const url = API.photoUrl(photo);
  return (
    <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", background: tk.surf2, border: `1px solid ${tk.bdr}`, aspectRatio: "4/3" }}>
      <img src={url} alt={photo.caption || "Site"} onClick={() => onOpen(photo)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", cursor: "pointer" }} loading="lazy" />
      {photo.caption && (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,.65)", color: "#fff", fontSize: 10, padding: "4px 7px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {photo.caption}
        </div>
      )}
      <button onClick={() => onOpen(photo)} style={{ position: "absolute", top: 5, left: 5, width: 22, height: 22, borderRadius: 6, background: "rgba(0,0,0,.5)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <IExpand size={11} color="#fff" />
      </button>
      {!readOnly && (
        <button onClick={() => onDelete(photo.id)} style={{ position: "absolute", top: 5, right: 5, width: 22, height: 22, borderRadius: 6, background: "rgba(185,28,28,.8)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <IXSmall size={11} color="#fff" />
        </button>
      )}
    </div>
  );
}

// ── Photo upload widget ───────────────────────────────────────
function PhotoUpload({ date, onUploaded, tk }) {
  const inputRef = useRef(null);
  const [pending,   setPending]   = useState(null);
  const [caption,   setCaption]   = useState("");
  const [uploading, setUploading] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error,     setError]     = useState(null);

  const handlePick = async e => {
    const file = e.target.files?.[0]; if (!file) return;
    setPreparing(true); setError(null);
    if (inputRef.current) inputRef.current.value = "";
    try {
      const compressed = await compressImage(file);
      setPending({ file: compressed, originalSize: file.size, compressedSize: compressed.size, name: compressed.name, wasCompressed: compressed.size < file.size });
    } catch (err) { setError(err.message || "Could not prepare image"); }
    finally { setPreparing(false); }
  };

  const doUpload = async () => {
    if (!pending) return;
    setUploading(true); setError(null);
    try {
      const res = await API.uploadSitePhoto(date, pending.file, caption.trim() || null);
      onUploaded(res); setPending(null); setCaption("");
    } catch (err) { setError(err.message || "Upload failed"); }
    finally { setUploading(false); }
  };

  const cancel = () => { setPending(null); setCaption(""); setError(null); };

  if (pending) {
    return (
      <div style={{ border: `1.5px solid ${tk.acc}`, borderRadius: 12, padding: 14, background: tk.accL }}>
        <div style={{ fontSize: 12, color: tk.acc, fontWeight: 600, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
          <ICamera size={13} color={tk.acc} />{pending.name}
        </div>
        <div style={{ fontSize: 11, color: tk.tx2, marginBottom: 8 }}>
          {pending.wasCompressed ? `Compressed ${fmtFileSize(pending.originalSize)} → ${fmtFileSize(pending.compressedSize)}` : `Size: ${fmtFileSize(pending.compressedSize)}`}
        </div>
        {error && <div style={{ fontSize: 11, color: "#b91c1c", marginBottom: 8, fontWeight: 600 }}>{error}</div>}
        <Field label="Caption (optional — e.g. 'Foundation pour, Block A')">
          <input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Describe what's in the photo" autoFocus
            onKeyDown={e => { if (e.key === "Enter") doUpload(); if (e.key === "Escape") cancel(); }}
            style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${tk.bdr}`, borderRadius: 9, fontSize: 13, fontFamily: "'DM Sans',sans-serif", background: tk.surf, color: tk.tx, boxSizing: "border-box" }}
          />
        </Field>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button onClick={cancel} style={{ flex: 1, padding: 9, border: `1px solid ${tk.bdr}`, borderRadius: 9, background: "transparent", cursor: "pointer", fontSize: 13, color: tk.tx2, fontFamily: "'DM Sans',sans-serif" }}>Cancel</button>
          <button onClick={doUpload} disabled={uploading} style={{ flex: 2, padding: 9, border: "none", borderRadius: 9, background: tk.acc, color: "#fff", cursor: uploading ? "default" : "pointer", fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", opacity: uploading ? .7 : 1 }}>
            {uploading ? "Uploading…" : "Upload Photo"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 7, padding: "18px 12px", border: `2px dashed ${tk.bdr}`, borderRadius: 12, cursor: "pointer", background: tk.surf2, color: tk.tx3 }}>
      <IUpload size={22} color={tk.tx3} />
      <div style={{ fontSize: 13, fontWeight: 600, color: tk.tx2 }}>{preparing ? "Preparing…" : "Add site photo"}</div>
      <div style={{ fontSize: 10, color: tk.tx3 }}>JPEG, PNG, WebP · auto-compressed</div>
      <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,.webp" onChange={handlePick} style={{ display: "none" }} />
    </label>
  );
}

// ═══════════════════════════════════════════════════════════════
//  HISTORY VIEW — browse any past date's log + photos
// ═══════════════════════════════════════════════════════════════
function HistoryView({ tk, allLogs }) {
  // allLogs: [{date, notes, weather, safety, saved_at}, ...] sorted desc
  const [selectedDate, setSelectedDate] = useState(allLogs[0]?.date || "");
  const [photos, setPhotos]             = useState([]);
  const [loading, setLoading]           = useState(false);
  const [lightbox, setLightbox]         = useState(null);

  const loadPhotos = useCallback(date => {
    if (!date) return;
    setLoading(true);
    API.getSitePhotos(date)
      .then(d => setPhotos(Array.isArray(d) ? d : []))
      .catch(() => setPhotos([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedDate) loadPhotos(selectedDate);
  }, [selectedDate, loadPhotos]);

  const currentLog = allLogs.find(l => l.date === selectedDate);
  const currentIdx = allLogs.findIndex(l => l.date === selectedDate);
  const hasPrev    = currentIdx < allLogs.length - 1;
  const hasNext    = currentIdx > 0;

  const navigate = dir => {
    const newIdx = currentIdx + dir; // dir=1 → older, dir=-1 → newer
    if (newIdx >= 0 && newIdx < allLogs.length) {
      setSelectedDate(allLogs[newIdx].date);
      setPhotos([]);
    }
  };

  if (allLogs.length === 0) {
    return (
      <div style={{ padding: "40px 0", textAlign: "center", color: tk.tx3 }}>
        <ICalendar size={36} color={tk.bdr} style={{ marginBottom: 12 }} />
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>No logs recorded yet</div>
        <div style={{ fontSize: 12 }}>Logs appear here once you start saving daily site reports.</div>
      </div>
    );
  }

  return (
    <>
      {lightbox && <Lightbox url={lightbox.url} caption={lightbox.caption} onClose={() => setLightbox(null)} />}

      {/* Date navigator */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, padding: "10px 14px", background: tk.surf2, borderRadius: 12, border: `1px solid ${tk.bdr}` }}>
        <button
          onClick={() => navigate(1)} disabled={!hasPrev}
          style={{ background: "none", border: "none", cursor: hasPrev ? "pointer" : "not-allowed", padding: 4, borderRadius: 6, opacity: hasPrev ? 1 : .3 }}>
          <IChevLeft size={18} color={tk.tx} />
        </button>

        <div style={{ flex: 1, textAlign: "center" }}>
          <select
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            style={{ border: "none", background: "transparent", fontSize: 15, fontWeight: 700, color: tk.tx, textAlign: "center", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}
          >
            {allLogs.map(l => (
              <option key={l.date} value={l.date}>
                {new Date(l.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
              </option>
            ))}
          </select>
          <div style={{ fontSize: 10, color: tk.tx3, marginTop: 2 }}>
            {currentIdx + 1} of {allLogs.length} logged days
          </div>
        </div>

        <button
          onClick={() => navigate(-1)} disabled={!hasNext}
          style={{ background: "none", border: "none", cursor: hasNext ? "pointer" : "not-allowed", padding: 4, borderRadius: 6, opacity: hasNext ? 1 : .3 }}>
          <IChevRight size={18} color={tk.tx} />
        </button>
      </div>

      {/* Log content */}
      {currentLog ? (
        <div style={{ marginBottom: 14, padding: "14px 16px", background: tk.surf, border: `1px solid ${tk.bdr}`, borderRadius: 12 }}>
          <div style={{ display: "flex", gap: 20, marginBottom: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 10, color: tk.tx3, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 3 }}>Weather</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                {WEATHER_EMOJI[currentLog.weather] || "🌤️"} {currentLog.weather || "Not recorded"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: tk.tx3, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 3 }}>Safety</div>
              <Badge color={SAFETY_COLOR[currentLog.safety] || "gray"}>{currentLog.safety || "All Clear"}</Badge>
            </div>
            {currentLog.saved_at && (
              <div style={{ marginLeft: "auto" }}>
                <div style={{ fontSize: 10, color: tk.tx3, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 3 }}>Saved at</div>
                <div style={{ fontSize: 11, color: tk.tx3 }}>
                  {new Date(currentLog.saved_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            )}
          </div>
          {currentLog.notes ? (
            <div style={{ background: tk.surf2, borderRadius: 10, padding: "11px 14px", fontSize: 13, color: tk.tx, lineHeight: 1.65, border: `1px solid ${tk.bdr}`, whiteSpace: "pre-wrap" }}>
              {currentLog.notes}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: tk.tx3, fontStyle: "italic" }}>No observations recorded for this day.</div>
          )}
        </div>
      ) : (
        <div style={{ padding: "16px 0", color: tk.tx3, fontSize: 13, textAlign: "center" }}>No log found for this date.</div>
      )}

      {/* Photos for this day */}
      <div style={{ fontSize: 11, fontWeight: 700, color: tk.tx3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>
        Photos — {loading ? "loading…" : `${photos.length} photo${photos.length !== 1 ? "s" : ""}`}
      </div>

      {loading ? (
        <div style={{ padding: "20px 0", color: tk.tx3, fontSize: 13, textAlign: "center" }}>Loading photos…</div>
      ) : photos.length === 0 ? (
        <div style={{ padding: "16px 0", color: tk.tx3, fontSize: 13, textAlign: "center" }}>
          No photos uploaded for this day.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
          {photos.map(p => (
            <PhotoCard
              key={p.id}
              photo={p}
              onDelete={() => {}} // No delete in history view — read-only
              onOpen={photo => setLightbox({ url: API.photoUrl(photo), caption: photo.caption })}
              tk={tk}
              readOnly
            />
          ))}
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
//  MAIN WORKFLOW PAGE
// ═══════════════════════════════════════════════════════════════
export default function Workflow() {
  const { tk, tasks, setTasks } = useApp();
  const date = todayStr();

  // Today's state
  const [log,     setLog]     = useState("");
  const [weather, setWeather] = useState("Clear");
  const [safety,  setSafety]  = useState("All Clear");
  const [saved,   setSaved]   = useState(false);

  const [photos,       setPhotos]       = useState([]);
  const [photoLoading, setPhotoLoading] = useState(true);
  const [lightbox,     setLightbox]     = useState(null);

  // History state
  const [view,     setView]     = useState("today");   // "today" | "history"
  const [allLogs,  setAllLogs]  = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Load today's data
  useEffect(() => {
    API.getDailyLog(date)
      .then(l => { if (l) { setLog(l.notes || ""); setWeather(l.weather || "Clear"); setSafety(l.safety || "All Clear"); } })
      .catch(() => {});
    setPhotoLoading(true);
    API.getSitePhotos(date).then(d => setPhotos(Array.isArray(d) ? d : [])).catch(() => setPhotos([])).finally(() => setPhotoLoading(false));
  }, [date]);

  // Load all logs when switching to history
  useEffect(() => {
    if (view !== "history") return;
    setLogsLoading(true);
    API.getAllDailyLogs()
      .then(logs => {
        // Filter out today from history (it's in Today tab)
        setAllLogs(Array.isArray(logs) ? logs.filter(l => l.date !== date) : []);
      })
      .catch(() => setAllLogs([]))
      .finally(() => setLogsLoading(false));
  }, [view, date]);

  const save = async () => {
    try { await API.saveDailyLog({ date, notes: log, weather, safety, saved_at: new Date().toISOString() }); }
    catch {}
    setSaved(true); setTimeout(() => setSaved(false), 2500);
  };

  const onPhotoDelete = async id => {
    if (!window.confirm("Delete this photo? This cannot be undone.")) return;
    try { await API.deleteSitePhoto(id); setPhotos(prev => prev.filter(p => p.id !== id)); }
    catch (e) { alert(e.message); }
  };

  const openLightbox = photo => setLightbox({ url: API.photoUrl(photo), caption: photo.caption });

  return (
    <div>
      {lightbox && <Lightbox url={lightbox.url} caption={lightbox.caption} onClose={() => setLightbox(null)} />}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10, animation: "fadeUp .25s ease" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.4px" }}>Daily Workflow</div>
          <div style={{ fontSize: 12, color: tk.tx2, marginTop: 2 }}>
            {view === "today" ? `Site log for ${date}` : "Browse past logs and photos"}
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ display: "flex", gap: 6 }}>
          {[
            { id: "today",   label: "Today" },
            { id: "history", label: "📅 History" },
          ].map(t => (
            <button key={t.id} onClick={() => setView(t.id)} style={{
              padding: "7px 14px", borderRadius: 9, fontSize: 12, fontWeight: 700,
              border: `1.5px solid ${view === t.id ? tk.acc : tk.bdr}`,
              background: view === t.id ? tk.acc : "transparent",
              color: view === t.id ? "#fff" : tk.tx2,
              cursor: "pointer", transition: "all .15s",
            }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════ HISTORY TAB ══════════ */}
      {view === "history" && (
        <Card>
          <CardTitle icon={ICalendar}>Workflow History</CardTitle>
          {logsLoading ? (
            <div style={{ padding: "30px 0", textAlign: "center", color: tk.tx3, fontSize: 13 }}>Loading past logs…</div>
          ) : (
            <HistoryView tk={tk} allLogs={allLogs} />
          )}
        </Card>
      )}

      {/* ══════════ TODAY TAB ══════════ */}
      {view === "today" && (
        <>
          {saved && <Alert type="ok"><ICheckCirc size={14} />Log saved successfully.</Alert>}

          {/* Progress notes */}
          <Card delay={.05}>
            <CardTitle icon={IEdit}>Progress Notes</CardTitle>
            <Field label="Observations / Summary">
              <textarea
                value={log}
                onChange={e => setLog(e.target.value)}
                placeholder="Work completed today, issues encountered, materials used…"
                rows={4}
                style={{ width: "100%", padding: "10px 12px", border: `1.5px solid ${tk.bdr}`, borderRadius: 10, fontSize: 13, fontFamily: "'DM Sans',sans-serif", background: tk.surf2, color: tk.tx, resize: "vertical", lineHeight: 1.65, boxSizing: "border-box" }}
              />
            </Field>
            <FormGrid>
              <Field label="Weather">
                <select value={weather} onChange={e => setWeather(e.target.value)}
                  style={{ width: "100%", padding: "9px 10px", border: `1.5px solid ${tk.bdr}`, borderRadius: 10, fontSize: 13, background: tk.surf2, color: tk.tx, fontFamily: "'DM Sans',sans-serif" }}>
                  {["Clear","Partly Cloudy","Overcast","Light Rain","Heavy Rain","Extreme Heat"].map(w => <option key={w}>{w}</option>)}
                </select>
              </Field>
              <Field label="Safety Status">
                <select value={safety} onChange={e => setSafety(e.target.value)}
                  style={{ width: "100%", padding: "9px 10px", border: `1.5px solid ${tk.bdr}`, borderRadius: 10, fontSize: 13, background: tk.surf2, color: tk.tx, fontFamily: "'DM Sans',sans-serif" }}>
                  {["All Clear","Minor Concerns","Work Stopped"].map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
            </FormGrid>
            <Btn onClick={save}><ISave size={14} />Save Log</Btn>
          </Card>

          {/* Site Photo Log */}
          <Card delay={.09}>
            <CardTitle icon={ICamera}>
              Site Photo Log
              <span style={{ fontSize: 11, fontWeight: 400, color: tk.tx3, marginLeft: 8 }}>
                {photos.length === 0 ? "No photos yet" : `${photos.length} photo${photos.length !== 1 ? "s" : ""}`}
              </span>
            </CardTitle>

            {photoLoading ? (
              <div style={{ padding: "20px 0", color: tk.tx3, fontSize: 13, textAlign: "center" }}>Loading photos…</div>
            ) : (
              <>
                {photos.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8, marginBottom: 12 }}>
                    {photos.map(p => (
                      <PhotoCard key={p.id} photo={p} onDelete={onPhotoDelete} onOpen={openLightbox} tk={tk} />
                    ))}
                  </div>
                )}
                <PhotoUpload date={date} onUploaded={p => setPhotos(prev => [...prev, p])} tk={tk} />
                <div style={{ marginTop: 10, fontSize: 11, color: tk.tx3 }}>
                  Photos are stored permanently. Click any photo to expand. Use History tab to view past dates.
                </div>
              </>
            )}
          </Card>

          {/* Task checklist */}
          <Card delay={.13}>
            <CardTitle icon={ICheckSq}>Task Checklist</CardTitle>
            {tasks.length === 0 ? (
              <div style={{ padding: "14px 0", color: tk.tx3, fontSize: 13, textAlign: "center" }}>No tasks yet. Add them from the Task Tracker page.</div>
            ) : tasks.map(t => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: `1px solid ${tk.bdr}` }}>
                <input type="checkbox" checked={t.status === "Completed"} onChange={async e => {
                  const s = e.target.checked ? "Completed" : "Pending";
                  try { await API.updateTask(t.id, { status: s }); } catch {}
                  setTasks(prev => prev.map(x => x.id === t.id ? { ...x, status: s } : x));
                }} style={{ width: 17, height: 17, accentColor: tk.acc, cursor: "pointer" }} />
                <label style={{ fontSize: 13, flex: 1, textDecoration: t.status === "Completed" ? "line-through" : "none", color: t.status === "Completed" ? tk.tx3 : tk.tx }}>
                  {t.title}
                </label>
                <Badge color={t.pri === "High" ? "red" : t.pri === "Medium" ? "amber" : "gray"}>{t.pri}</Badge>
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}
