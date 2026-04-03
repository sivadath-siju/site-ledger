import { useEffect } from "react";

export function GlobalStyles({ tk, isDesktop }) {
  useEffect(() => {
    const id = "sl-styles";
    let el = document.getElementById(id);
    if (!el) { el = document.createElement("style"); el.id = id; document.head.appendChild(el); }
    el.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Mono:wght@400;500&display=swap');

      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
      html, body, #root { height: 100%; overflow: hidden; }
      body { font-family: 'DM Sans', sans-serif; background: ${tk.bg}; color: ${tk.tx}; font-size: 14px; line-height: 1.5; transition: background .25s, color .25s; }

      ::-webkit-scrollbar { width: 4px; height: 4px; }
      ::-webkit-scrollbar-thumb { background: ${tk.bdr2}; border-radius: 4px; }
      ::-webkit-scrollbar-track { background: transparent; }

      input, select, textarea, button { font-family: 'DM Sans', sans-serif; }
      input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }

      /* ── BUTTONS ── */
      button[data-variant="primary"] {
        background: ${tk.acc} !important;
        color: #fff !important;
        border: none !important;
        box-shadow: 0 2px 8px ${tk.acc}44, 0 1px 2px rgba(0,0,0,.15) !important;
      }
      button[data-variant="primary"]:hover:not(:disabled) {
        filter: brightness(1.08);
        box-shadow: 0 4px 16px ${tk.acc}55, 0 2px 4px rgba(0,0,0,.2) !important;
      }
      button[data-variant="danger"] {
        background: #e11d48 !important;
        color: #fff !important;
        box-shadow: 0 2px 8px rgba(225,29,72,.35) !important;
      }
      button:disabled { cursor: not-allowed !important; opacity: .45 !important; }

      /* ── DESKTOP: bigger cards, wider stat grid ── */
      @media (min-width: 768px) {
        .stat-grid {
          grid-template-columns: repeat(4, 1fr) !important;
        }
        .card-grid {
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)) !important;
        }
      }

      /* ── MOBILE: fix last item hidden behind fixed bottom nav ──
         main padding-bottom is already 90px but we add safe-area too */
      @media (max-width: 767px) {
        main {
          padding-bottom: calc(90px + env(safe-area-inset-bottom, 0px)) !important;
        }
      }

      /* ── LEDGER TABLE ── */
      .ledger-table { width: 100%; border-collapse: collapse; font-size: 13px; table-layout: auto; }
      .ledger-table th {
        text-align: left; padding: 9px 10px;
        font-size: 10px; font-weight: 700;
        text-transform: uppercase; letter-spacing: .08em;
        color: ${tk.tx3}; background: ${tk.surf2};
        border-bottom: 2px solid ${tk.bdr};
        white-space: nowrap;
      }
      .ledger-table td {
        padding: 10px 10px;
        border-bottom: 1px solid ${tk.bdr};
        vertical-align: middle;
        white-space: nowrap;
      }
      /* Amount columns: always right-aligned, never truncated */
      .ledger-table .col-amount {
        text-align: right;
        font-family: 'DM Mono', monospace;
        font-weight: 700;
        min-width: 110px;
        white-space: nowrap;
      }
      .ledger-table th.col-amount { text-align: right; }
      /* Particulars column can wrap */
      .ledger-table .col-desc {
        white-space: normal;
        min-width: 120px;
        max-width: 220px;
        word-break: break-word;
      }
      .ledger-table tr:last-child td { border-bottom: none; }
      .ledger-table tr.debit-row  td { background: ${tk.redL}18; }
      .ledger-table tr.credit-row td { background: ${tk.grnL}18; }
      .ledger-table tr:hover td { background: ${tk.surf2}; transition: background .1s; }
      .ledger-table tr.debit-row:hover  td { background: ${tk.redL}35; }
      .ledger-table tr.credit-row:hover td { background: ${tk.grnL}35; }
      .ledger-total td {
        font-weight: 700 !important;
        background: ${tk.surf2} !important;
        border-top: 2px solid ${tk.bdr} !important;
        border-bottom: none !important;
      }

      /* ── ANIMATIONS ── */
      @keyframes fadeUp   { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:none } }
      @keyframes slideUp  { from { transform:translateY(100%) } to { transform:none } }
      @keyframes scaleIn  { from { opacity:0; transform:translateY(-6px) scale(.97) } to { opacity:1; transform:none } }
      @keyframes badgePop { from { transform:scale(0) } to { transform:scale(1) } }
    `;
  }, [tk, isDesktop]);
  return null;
}
