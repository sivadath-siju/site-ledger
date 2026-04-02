import { useEffect } from "react";

export function GlobalStyles({ tk }) {
  useEffect(() => {
    const id = "sl-styles";
    let el = document.getElementById(id);
    if (!el) { el = document.createElement("style"); el.id = id; document.head.appendChild(el); }
    el.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
      html, body, #root { height: 100%; overflow: hidden; }
      body { font-family: 'DM Sans', sans-serif; background: ${tk.bg}; color: ${tk.tx}; font-size: 14px; line-height: 1.5; transition: background .25s, color .25s; }
      ::-webkit-scrollbar { width: 4px; height: 4px; }
      ::-webkit-scrollbar-thumb { background: ${tk.bdr2}; border-radius: 4px; }
      ::-webkit-scrollbar-track { background: transparent; }
      input, select, textarea, button { font-family: 'DM Sans', sans-serif; }
      input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
      @keyframes fadeUp { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:none } }
      @keyframes slideUp { from { transform:translateY(100%) } to { transform:none } }
      @keyframes scaleIn { from { opacity:0; transform:translateY(-6px) scale(.97) } to { opacity:1; transform:none } }
      @keyframes badgePop { from { transform:scale(0) } to { transform:scale(1) } }
      @keyframes pulse { 0%,100%{ opacity:.3; transform:scale(.8) } 50%{ opacity:1; transform:scale(1) } }
      @keyframes spinnerRing { to { transform: rotate(360deg) } }
    `;
  }, [tk]);
  return null;
}
