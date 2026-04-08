import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppCtx";
import * as API from "../api";
import { Card, CardTitle, Btn, Alert, Field, FormGrid, Badge } from "../components/Primitives";
import { IEdit, ISave, ICheckCirc, ICheckSq } from "../icons/Icons";

const todayStr = () => new Date().toISOString().split("T")[0];

const ICamera = ({ size = 16, color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);
const IUpload = ({ size = 18, color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);
const IX = ({ size = 11, color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IExpand = ({ size = 12, color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
    <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
  </svg>
);

// Lightbox overlay
function Lightbox({ url, caption, onClose }) {
  useEffect(() => {
    const fn = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.88)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ position: "relative", maxWidth: "min(90vw, 800px)", maxHeight: "85vh", display: "flex", flexDirection: "column", gap: 8 }}>
        <img src={url} alt={caption || "Site photo"} style={{ maxWidth: "100%", maxHeight: "80vh", objectFit: "contain", borderRadius: 12, display: "block" }} />
        {caption && <div style={{ color: "#e5e7eb", fontSize: 13, textAlign: "center", fontWeight: 500 }}>{caption}</div>}
        <button onClick={onClose} style={{ position: "absolute", top: -12, right: -12, width: 28, height: 28, borderRadius: "50%", background: "#374151", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <IX size={13} color="#fff" />
        </button>
      </div>
    </div>
  );
}

// Individual photo thumbnail
function PhotoCard({ photo, onDelete, onOpen, tk }) {
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
      <button onClick={() => onDelete(photo.id)} style={{ position: "absolute", top: 5, right: 5, width: 22, height: 22, borderRadius: 6, background: "rgba(185,28,28,.8)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <IX size={11} color="#fff" />
      </button>
    </div>
  );
}

// Upload zone — pick file → enter caption → upload
function PhotoUpload({ date, onUploaded, tk }) {
  const inputRef = useRef(null);
  const [pending,   setPending]   = useState(null); // File object
  const [caption,   setCaption]   = useState("");
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState(null);

  const handlePick = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPending(file); setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const doUpload = async () => {
    if (!pending) return;
    setUploading(true); setError(null);
    try {
      const res = await API.uploadSitePhoto(date, pending, caption.trim() || null);
      onUploaded(res);
      setPending(null); setCaption("");
    } catch (err) { setError(err.message || "Upload failed"); }
    finally { setUploading(false); }
  };

  const cancel = () => { setPending(null); setCaption(""); setError(null); };

  // After picking file — show caption input
  if (pending) {
    return (
      <div style={{ border: `1.5px solid ${tk.acc}`, borderRadius: 12, padding: 14, background: tk.accL }}>
        <div style={{ fontSize: 12, color: tk.acc, fontWeight: 600, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
          <ICamera size={13} color={tk.acc} />
          {pending.name}
        </div>
        {error && <div style={{ fontSize: 11, color: "#b91c1c", marginBottom: 8, fontWeight: 600 }}>{error}</div>}
        <Field label="Caption (optional — e.g. 'Foundation pour, Block A')">
          <input
            value={caption}
            onChange={e => setCaption(e.target.value)}
            placeholder="Describe what's in the photo"
            autoFocus
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
    <label style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 7, padding: "20px 12px",
      border: `2px dashed ${tk.bdr}`, borderRadius: 12,
      cursor: "pointer", background: tk.surf2, color: tk.tx3, transition: "border-color .15s",
    }}>
      <IUpload size={22} color={tk.tx3} />
      <div style={{ fontSize: 13, fontWeight: 600, color: tk.tx2 }}>Add site photo</div>
      <div style={{ fontSize: 10, color: tk.tx3 }}>JPEG, PNG, WebP · max 20 MB</div>
      <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,.webp" onChange={handlePick} style={{ display: "none" }} />
    </label>
  );
}

export default function Workflow() {
  const { tk, tasks, setTasks } = useApp();
  const date = todayStr();

  const [log,     setLog]     = useState("");
  const [weather, setWeather] = useState("Clear");
  const [safety,  setSafety]  = useState("All Clear");
  const [saved,   setSaved]   = useState(false);

  const [photos,       setPhotos]       = useState([]);
  const [photoLoading, setPhotoLoading] = useState(true);
  const [lightbox,     setLightbox]     = useState(null);

  useEffect(() => {
    API.getDailyLog(date).then(l => { setLog(l.notes || ""); setWeather(l.weather || "Clear"); setSafety(l.safety || "All Clear"); }).catch(() => {});
    setPhotoLoading(true);
    API.getSitePhotos(date).then(d => setPhotos(Array.isArray(d) ? d : [])).catch(() => setPhotos([])).finally(() => setPhotoLoading(false));
  }, [date]);

  const save = async () => {
    try { await API.saveDailyLog({ date, notes: log, weather, safety, saved_at: new Date().toISOString() }); }
    catch {}
    setSaved(true); setTimeout(() => setSaved(false), 2500);
  };

  const onPhotoDelete = async (id) => {
    if (!window.confirm("Delete this photo? This cannot be undone.")) return;
    try { await API.deleteSitePhoto(id); setPhotos(prev => prev.filter(p => p.id !== id)); }
    catch (e) { alert(e.message); }
  };

  const openLightbox = photo => setLightbox({ url: API.photoUrl(photo), caption: photo.caption });

  return (
    <div>
      {lightbox && <Lightbox url={lightbox.url} caption={lightbox.caption} onClose={() => setLightbox(null)} />}

      <div style={{ marginBottom: 18, animation: "fadeUp .25s ease" }}>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.4px" }}>Daily Workflow</div>
        <div style={{ fontSize: 12, color: tk.tx2, marginTop: 2 }}>Site log for {date}</div>
      </div>

      {saved && <Alert type="ok"><ICheckCirc size={14} />Log saved successfully.</Alert>}

      {/* Progress notes */}
      <Card delay={.05}>
        <CardTitle icon={IEdit}>Progress Notes</CardTitle>
        <Field label="Observations / Summary">
          <textarea
            value={log}
            onChange={e => setLog(e.target.value)}
            placeholder="Work completed today, issues encountered, materials used..."
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

      {/* ══════════════════════ SITE PHOTO LOG ══════════════════════ */}
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
              Photos are attached to today's log and stored on the server permanently. Click any photo to expand.
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
    </div>
  );
}
