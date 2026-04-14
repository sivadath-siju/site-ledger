import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppCtx";
import * as API from "../api";
import { Card, CardTitle, ProgressBar, Alert, Badge, Empty } from "../components/Primitives";
import { IUsers, IListChecks, IPkgX, IAlertTri, IClipboard, IPackage, IActivity } from "../icons/Icons";

const today = () => new Date().toISOString().split("T")[0];
const Rs    = n  => "₹" + Number(n || 0).toLocaleString("en-IN");

const WEATHER_EMOJI = { "Clear": "☀️", "Partly Cloudy": "⛅", "Overcast": "☁️", "Light Rain": "🌧️", "Heavy Rain": "⛈️", "Extreme Heat": "🌡️" };
const SAFETY_COLOR  = { "All Clear": "green", "Minor Concerns": "amber", "Work Stopped": "red" };

function PhotoLightbox({ photo, onClose }) {
  const url = API.photoUrl(photo);

  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!url) return null;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,.88)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ maxWidth: "min(92vw, 960px)", maxHeight: "88vh", display: "flex", flexDirection: "column", gap: 10 }}>
        <img src={url} alt={photo.caption || "Site photo"} style={{ maxWidth: "100%", maxHeight: "80vh", objectFit: "contain", borderRadius: 14, display: "block" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, color: "#f3f4f6" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{photo.caption || "Site Photo"}</div>
            <div style={{ fontSize: 12, color: "#d1d5db" }}>{photo.uploader ? `Uploaded by ${photo.uploader}` : "Today's site photo"}</div>
          </div>
          <button onClick={onClose} style={{ border: "none", borderRadius: 999, padding: "8px 12px", background: "rgba(255,255,255,.12)", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function DashboardPhotoCard({ photo, onOpen, tk }) {
  const url = API.photoUrl(photo);

  return (
    <button
      onClick={() => onOpen(photo)}
      style={{ padding: 0, border: `1px solid ${tk.bdr}`, borderRadius: 16, overflow: "hidden", background: tk.surf2, cursor: "pointer", boxShadow: tk.sh, textAlign: "left" }}
    >
      <div style={{ aspectRatio: "16/10", background: tk.surf2 }}>
        {url ? (
          <img src={url} alt={photo.caption || "Site photo"} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} loading="lazy" />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: tk.tx3, fontSize: 12 }}>
            Image unavailable
          </div>
        )}
      </div>
      <div style={{ padding: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: tk.tx, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {photo.caption || "Site Progress Photo"}
        </div>
        <div style={{ fontSize: 11, color: tk.tx3 }}>
          {photo.uploader ? `By ${photo.uploader}` : "Today"}{photo.logged_at ? ` • ${new Date(photo.logged_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : ""}
        </div>
      </div>
    </button>
  );
}

// Clickable stat card — navigates to a page on click
function ClickStatCard({ icon: Icon, value, label, color, delay = 0, onClick, tk }) {
  const [hovered, setHovered] = useState(false);

  const colors = {
    acc: { bg: tk.accL,  text: tk.acc  },
    grn: { bg: tk.grnL,  text: tk.grn  },
    amb: { bg: tk.ambL,  text: tk.amb  },
    red: { bg: tk.redL,  text: tk.red  },
  };
  const c = colors[color] || colors.acc;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: tk.surf,
        border: `1px solid ${hovered ? c.text : tk.bdr}`,
        borderRadius: 14,
        padding: "14px 16px",
        textAlign: "left",
        cursor: "pointer",
        boxShadow: hovered ? `0 4px 16px ${c.text}22` : tk.sh,
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        transition: "all .18s ease",
        animation: `fadeUp .3s ease ${delay}s both`,
        width: "100%",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: c.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={16} color={c.text} />
        </div>
        {/* Arrow on hover */}
        <div style={{ fontSize: 14, color: c.text, opacity: hovered ? 1 : 0, transition: "opacity .15s" }}>→</div>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'DM Mono',monospace", color: tk.tx, letterSpacing: "-.3px", lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: tk.tx3, fontWeight: 600, marginTop: 4, textTransform: "uppercase", letterSpacing: ".04em" }}>
        {label}
      </div>
    </button>
  );
}

export default function Dashboard() {
  const { tk, mats, tasks, workers, setPage } = useApp();

  const [todayLog,      setTodayLog]      = useState(null);
  const [yesterdayLog,  setYesterdayLog]  = useState(null);
  const [todayWorkers,  setTodayWorkers]  = useState([]);
  const [todaySubLogs,  setTodaySubLogs]  = useState([]);   // subcontractor counts for today
  const [todayPhotos,   setTodayPhotos]   = useState([]);
  const [logLoading,    setLogLoading]    = useState(true);
  const [photosLoading, setPhotosLoading] = useState(true);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);

  const todayStr     = today();
  const yesterdayStr = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split("T")[0]; })();

  useEffect(() => {
    setLogLoading(true);
    Promise.allSettled([
      API.getDailyLog(todayStr),
      API.getDailyLog(yesterdayStr),
      API.getAttendance({ date: todayStr }),
      API.getSubDailyAll ? API.getSubDailyAll({ date: todayStr }) : Promise.resolve([]),
    ]).then(([logRes, yLogRes, attRes, subRes]) => {
      if (logRes.status   === "fulfilled") setTodayLog(logRes.value);
      if (yLogRes.status  === "fulfilled") setYesterdayLog(yLogRes.value);
      if (attRes.status   === "fulfilled") setTodayWorkers(Array.isArray(attRes.value) ? attRes.value : []);
      if (subRes.status   === "fulfilled") setTodaySubLogs(Array.isArray(subRes.value) ? subRes.value : []);
    }).finally(() => setLogLoading(false));
  }, [todayStr, yesterdayStr]);

  useEffect(() => {
    setPhotosLoading(true);
    API.getSitePhotos(todayStr)
      .then(res => setTodayPhotos(Array.isArray(res) ? res : []))
      .catch(() => setTodayPhotos([]))
      .finally(() => setPhotosLoading(false));
  }, [todayStr]);

  const lsc = mats.filter(m => m.stock <= m.min).length;
  const pt  = tasks.filter(t => t.status !== "Completed").length;
  const presentToday = todayWorkers.filter(w => w.status === "present").length;
  const halfToday    = todayWorkers.filter(w => w.status === "half").length;
  const subToday     = todaySubLogs.reduce((s, l) => s + (l.worker_count || 0), 0);
  const directWages  = todayWorkers.filter(w => !w.is_subcontract).reduce((s, w) => s + (w.total_wage || 0), 0);

  // Stat cards — each navigates to a relevant page
  const statCards = [
    { icon: IUsers,     value: presentToday + halfToday + subToday, label: "On Site Today", color: "grn", page: "attendance", delay: .04 },
    { icon: IListChecks,value: pt,                       label: "Pending Tasks",  color: "amb", page: "tasks",      delay: .08 },
    { icon: IPkgX,      value: lsc,                      label: "Low Stock",      color: "red", page: "materials",  delay: .12 },
    { icon: IUsers,     value: workers.filter(w => !w.is_subcontract).length, label: "Direct Workers", color: "acc", page: "attendance", delay: .16 },
  ];

  return (
    <div>
      {lightboxPhoto && <PhotoLightbox photo={lightboxPhoto} onClose={() => setLightboxPhoto(null)} />}

      {/* Header */}
      <div style={{ marginBottom: 18, animation: "fadeUp .25s ease" }}>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.4px" }}>Dashboard</div>
        <div style={{ fontSize: 12, color: tk.tx2, marginTop: 2 }}>
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </div>
      </div>

      {lsc > 0 && (
        <Alert type="warn">
          <IAlertTri size={14} />
          <span><strong>{lsc} material{lsc > 1 ? "s" : ""}</strong> below minimum stock — reorder required</span>
        </Alert>
      )}

      {/* Clickable stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        {statCards.map(card => (
          <ClickStatCard
            key={card.label}
            tk={tk}
            icon={card.icon}
            value={card.value}
            label={card.label}
            color={card.color}
            delay={card.delay}
            onClick={() => setPage(card.page)}
          />
        ))}
      </div>

      {/* Workers on Site — Today (direct + subcontractor combined) */}
      <Card delay={.1}>
        <CardTitle icon={IUsers}>
          Workers on Site — Today
          <span style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
            {directWages > 0 && (
              <span style={{ fontSize: 12, fontWeight: 600, color: "#15803d" }}>{Rs(directWages)}</span>
            )}
            {todaySubLogs.length > 0 && (
              <span style={{ fontSize: 11, fontWeight: 600, color: "#92400e" }}>
                +{todaySubLogs.reduce((s,l)=>s+l.worker_count,0)} sub
              </span>
            )}
          </span>
        </CardTitle>

        {logLoading ? (
          <div style={{ padding: "12px 0", color: tk.tx3, fontSize: 13 }}>Loading…</div>
        ) : (todayWorkers.length === 0 && todaySubLogs.length === 0) ? (
          <Empty icon={IUsers} text="No attendance marked today. Go to Labour & Attendance to mark workers." />
        ) : (
          <>
            {/* Direct workers */}
            {todayWorkers.length > 0 && (
              <>
                {todaySubLogs.length > 0 && (
                  <div style={{ fontSize: 10, fontWeight: 700, color: tk.tx3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>
                    Direct Workers
                  </div>
                )}
                {todayWorkers.map(w => {
                  const status = w.status || "present";
                  return (
                    <div key={w.id || w.worker_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: `1px solid ${tk.bdr}` }}>
                      <div style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, background: tk.accL, color: tk.acc, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>
                        {(w.worker_name || w.name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{w.worker_name || w.name}</div>
                        <div style={{ fontSize: 11, color: tk.tx3 }}>
                          {w.worker_role || w.role} · {w.hours || 8}h{w.ot_hours > 0 ? ` + ${w.ot_hours}h OT` : ""}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <Badge color={status === "present" ? "green" : status === "half" ? "amber" : "red"}>
                          {status === "present" ? "Present" : status === "half" ? "Half" : "Absent"}
                        </Badge>
                        {w.total_wage > 0 && (
                          <div style={{ fontSize: 12, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: tk.tx, marginTop: 2 }}>{Rs(w.total_wage)}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {/* Subcontractor workers — shown inline in same card */}
            {todaySubLogs.length > 0 && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0 8px" }}>
                  <div style={{ height: 1, background: tk.bdr, flex: 1 }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#92400e", textTransform: "uppercase", letterSpacing: ".08em", whiteSpace: "nowrap" }}>
                    Subcontractor Labour (Reference)
                  </span>
                  <div style={{ height: 1, background: tk.bdr, flex: 1 }} />
                </div>

                {todaySubLogs.map(log => (
                  <div key={log.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: `1px solid ${tk.bdr}` }}>
                    {/* Worker count as avatar */}
                    <div style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, background: "#fef3c7", color: "#92400e", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13 }}>
                      {log.worker_count}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: tk.tx }}>{log.subcontractor_name}</div>
                      <div style={{ fontSize: 11, color: tk.tx3 }}>
                        {log.category} · ₹{Number(log.rate_per_worker).toLocaleString("en-IN")}/day
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: "#92400e" }}>
                        {Rs(log.total_cost)}
                      </div>
                      <div style={{ fontSize: 9, color: "#9ca3af" }}>ref only</div>
                    </div>
                  </div>
                ))}

                {/* Sub day total */}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0 2px", marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: "#92400e", fontWeight: 600 }}>
                    {todaySubLogs.reduce((s,l)=>s+l.worker_count,0)} subcontract workers total
                  </span>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, color: "#92400e" }}>
                    {Rs(todaySubLogs.reduce((s,l)=>s+l.total_cost,0))}
                  </span>
                </div>
              </>
            )}
          </>
        )}
      </Card>

      {/* Today's site log */}
      <Card delay={.14}>
        <CardTitle icon={IClipboard}>
          Today's Site Log
          {todayLog && (
            <span style={{ marginLeft: 8, background: tk.grnL, color: tk.grn, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>
              ✓ Recorded
            </span>
          )}
        </CardTitle>
        {logLoading ? (
          <div style={{ padding: "12px 0", color: tk.tx3, fontSize: 13 }}>Loading…</div>
        ) : !todayLog ? (
          <div style={{ padding: "16px 0", textAlign: "center" }}>
            <div style={{ fontSize: 13, color: tk.tx3, marginBottom: 8 }}>No site log recorded for today.</div>
            <div style={{ fontSize: 12, color: tk.tx3 }}>
              Go to <strong style={{ color: tk.acc }}>Daily Workflow</strong> to add today's progress notes.
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", gap: 16, marginBottom: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 10, color: tk.tx3, textTransform: "uppercase", letterSpacing: ".05em" }}>Weather</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {WEATHER_EMOJI[todayLog.weather] || "🌤️"} {todayLog.weather || "Not recorded"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: tk.tx3, textTransform: "uppercase", letterSpacing: ".05em" }}>Safety</div>
                <Badge color={SAFETY_COLOR[todayLog.safety] || "gray"}>{todayLog.safety || "All Clear"}</Badge>
              </div>
            </div>
            {todayLog.notes ? (
              <div style={{ background: tk.surf2, borderRadius: 10, padding: "11px 14px", fontSize: 13, color: tk.tx, lineHeight: 1.65, border: `1px solid ${tk.bdr}`, whiteSpace: "pre-wrap" }}>
                {todayLog.notes}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: tk.tx3, fontStyle: "italic" }}>No observations recorded.</div>
            )}
          </div>
        )}
      </Card>

      {/* Yesterday's log — subtle recap */}
      {yesterdayLog && (yesterdayLog.notes || yesterdayLog.weather !== "Clear") && (
        <Card delay={.16}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: tk.tx3 }}>Yesterday's Log</span>
            <span style={{ fontSize: 10, color: tk.tx3, background: tk.surf2, padding: "1px 8px", borderRadius: 20, border: `1px solid ${tk.bdr}` }}>
              {new Date(yesterdayStr + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
            </span>
            {yesterdayLog.weather && (
              <span style={{ fontSize: 11, color: tk.tx3, marginLeft: "auto" }}>
                {{"Clear":"☀️","Partly Cloudy":"⛅","Overcast":"☁️","Light Rain":"🌧️","Heavy Rain":"⛈️","Extreme Heat":"🌡️"}[yesterdayLog.weather] || "🌤️"} {yesterdayLog.weather}
              </span>
            )}
          </div>
          {yesterdayLog.notes ? (
            <div style={{ fontSize: 12, color: tk.tx2, lineHeight: 1.6, background: tk.surf2, borderRadius: 9, padding: "10px 12px", border: `1px solid ${tk.bdr}`, opacity: 0.85, whiteSpace: "pre-wrap" }}>
              {yesterdayLog.notes.length > 200 ? yesterdayLog.notes.slice(0, 200) + "…" : yesterdayLog.notes}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: tk.tx3, fontStyle: "italic" }}>No notes recorded for yesterday.</div>
          )}
        </Card>
      )}

      <Card delay={.18}>
        <CardTitle icon={IActivity}>
          Site Photos
          <span style={{ fontSize: 11, fontWeight: 500, color: tk.tx3, marginLeft: 8 }}>
            {todayPhotos.length === 0 ? "No photos today" : `${todayPhotos.length} photo${todayPhotos.length > 1 ? "s" : ""} from today`}
          </span>
        </CardTitle>
        {photosLoading ? (
          <div style={{ padding: "12px 0", color: tk.tx3, fontSize: 13 }}>Loadingâ€¦</div>
        ) : todayPhotos.length === 0 ? (
          <div style={{ padding: "18px 0", textAlign: "center", color: tk.tx3, fontSize: 13 }}>
            No site photos uploaded for today yet.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            {todayPhotos.map(photo => (
              <DashboardPhotoCard key={photo.id} photo={photo} onOpen={setLightboxPhoto} tk={tk} />
            ))}
          </div>
        )}
      </Card>

      {/* Stock levels */}
      <Card delay={.22}>
        <CardTitle icon={IPackage}>Stock Levels</CardTitle>
        {mats.length === 0 ? (
          <Empty icon={IPackage} text="No materials added yet." />
        ) : (
          mats.map(m => <ProgressBar key={m.id} label={m.name} value={m.stock} max={m.min * 3} />)
        )}
      </Card>
    </div>
  );
}
