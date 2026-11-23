import { useEffect } from "react";

/**
 * App-wide CSS. Fonts are loaded from index.html (non-blocking <link>), not
 * via @import here, so first paint isn't delayed.
 *
 * Mobile rules follow the ui-ux-pro-max guidelines:
 *  - 44px minimum touch targets on touch devices, 8px+ spacing
 *  - 16px form text so iOS Safari doesn't zoom in on focus
 *  - visible keyboard focus rings, prefers-reduced-motion respected
 *  - dynamic viewport units + safe-area insets for notched phones
 */
export function GlobalStyles({ tk }) {
  useEffect(() => {
    const id = "sl-styles";
    let el = document.getElementById(id);
    if (!el) { el = document.createElement("style"); el.id = id; document.head.appendChild(el); }

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", tk.surf);

    el.textContent = `
      :root {
        --sl-acc: ${tk.acc}; --sl-on-acc: ${tk.onAcc}; --sl-ring: ${tk.ring};
        --sl-skeleton: ${tk.surf3};
        color-scheme: ${tk.bg === "#12100D" ? "dark" : "light"};
      }

      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
      html, body, #root { height: 100%; overflow: hidden; }
      body {
        font-family: 'DM Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
        background: ${tk.bg}; color: ${tk.tx};
        font-size: 14px; line-height: 1.5;
        -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;
        text-rendering: optimizeLegibility;
        transition: background .2s, color .2s;
      }

      input, select, textarea, button { font-family: inherit; color: inherit; }
      input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
      input[type=number] { -moz-appearance: textfield; }
      img { max-width: 100%; }

      /* Money & counts line up in columns */
      [style*="DM Mono"], .num { font-variant-numeric: tabular-nums; }

      ::-webkit-scrollbar { width: 6px; height: 6px; }
      ::-webkit-scrollbar-thumb { background: ${tk.bdr2}; border-radius: 6px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::selection { background: ${tk.accL}; color: ${tk.tx}; }

      /* ── Focus: always visible for keyboard users, never for mouse/touch ── */
      :focus { outline: none; }
      :focus-visible {
        outline: 2px solid ${tk.acc};
        outline-offset: 2px;
        border-radius: 6px;
      }

      /* ── Buttons ── */
      button { cursor: pointer; touch-action: manipulation; }
      button[data-variant="primary"] { background: ${tk.acc} !important; color: ${tk.onAcc} !important; border: none !important; }
      button[data-variant="primary"]:hover:not(:disabled) { filter: brightness(1.06); }
      button[data-variant="danger"] { background: ${tk.red === "#F87171" ? "#DC2626" : tk.red} !important; color: #fff !important; }
      button:disabled { cursor: not-allowed !important; opacity: .5 !important; }

      /* ── Touch devices: comfortable targets, no zoom-on-focus ── */
      @media (pointer: coarse) {
        button[data-variant], .tap { min-height: 44px; }
        input:not([type=checkbox]):not([type=radio]):not([type=range]), select, textarea { font-size: 16px !important; }
        input:not([type=checkbox]):not([type=radio]):not([type=range]), select { min-height: 44px; }
      }

      /* ── Layout helpers ── */
      @media (min-width: 768px) {
        .stat-grid { grid-template-columns: repeat(4, 1fr) !important; }
        .card-grid { grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)) !important; }
      }
      @media (max-width: 767px) {
        main { padding-bottom: calc(84px + env(safe-area-inset-bottom, 0px)) !important; }
      }

      /* ── Ledger table ── */
      .ledger-table { width: 100%; border-collapse: collapse; font-size: 13px; table-layout: auto; }
      .ledger-table th {
        position: sticky; top: 0; z-index: 1;
        text-align: left; padding: 10px;
        font-size: 11px; font-weight: 700;
        text-transform: uppercase; letter-spacing: .06em;
        color: ${tk.tx2}; background: ${tk.surf2};
        border-bottom: 1px solid ${tk.bdr2};
        white-space: nowrap;
      }
      .ledger-table td { padding: 11px 10px; border-bottom: 1px solid ${tk.bdr}; vertical-align: middle; white-space: nowrap; }
      .ledger-table .col-amount {
        text-align: right; font-family: 'DM Mono', monospace; font-weight: 600;
        font-variant-numeric: tabular-nums; min-width: 110px; white-space: nowrap;
      }
      .ledger-table th.col-amount { text-align: right; }
      .ledger-table .col-desc { white-space: normal; min-width: 120px; max-width: 220px; word-break: break-word; }
      .ledger-table tr:last-child td { border-bottom: none; }
      .ledger-table tr.debit-row  td { background: ${tk.redL}66; }
      .ledger-table tr.credit-row td { background: ${tk.grnL}66; }
      .ledger-table tr:hover td { background: ${tk.surf2}; transition: background .1s; }
      .ledger-total td {
        font-weight: 700 !important; background: ${tk.surf2} !important;
        border-top: 2px solid ${tk.bdr2} !important; border-bottom: none !important;
      }

      /* ── Motion ── */
      @keyframes fadeUp   { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:none } }
      @keyframes slideUp  { from { transform:translateY(100%) } to { transform:none } }
      @keyframes scaleIn  { from { opacity:0; transform:translateY(-4px) scale(.98) } to { opacity:1; transform:none } }
      @keyframes badgePop { from { transform:scale(0) } to { transform:scale(1) } }
      @keyframes shimmer  { 0% { opacity:.55 } 50% { opacity:1 } 100% { opacity:.55 } }
      [aria-busy="true"] { animation: shimmer 1.4s ease-in-out infinite; }

      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
          animation-duration: .01ms !important; animation-iteration-count: 1 !important;
          transition-duration: .01ms !important; scroll-behavior: auto !important;
        }
      }
    `;
  }, [tk]);
  return null;
}
