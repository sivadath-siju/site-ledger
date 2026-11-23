import { createContext, useContext } from "react";

// Design tokens — brand-aligned (Ciel Homes: deep brown, burnt amber, warm stone).
// Every text/background pair below meets WCAG AA (>= 4.5:1).
// `onAcc` is the text/icon colour to use ON an accent-coloured background.
export const LIGHT = {
  bg:"#F5F3EF", surf:"#FFFFFF", surf2:"#FAF8F5", surf3:"#EFEBE5",
  bdr:"#E7E2DA", bdr2:"#D6CFC4",
  tx:"#1F1A14", tx2:"#57504A", tx3:"#736A60",
  acc:"#B45309", accL:"#FDF1E3", accD:"#8A3F06", onAcc:"#FFFFFF",
  brand:"#3B2A14",
  grn:"#15803D", grnL:"#E8F6EC",
  red:"#B91C1C", redL:"#FDECEC",
  amb:"#A16207", ambL:"#FEF6DB",
  vio:"#6D28D9", vioL:"#F3EEFF",
  cyan:"#0E7490", cyanL:"#E6F6F9",
  ring:"rgba(180,83,9,.35)",
  sh:"0 1px 2px rgba(31,26,20,.06),0 1px 3px rgba(31,26,20,.05)",
  shLg:"0 12px 32px rgba(31,26,20,.14)",
};

export const DARK = {
  bg:"#12100D", surf:"#1B1814", surf2:"#24201B", surf3:"#2E2923",
  bdr:"#2E2923", bdr2:"#3D372F",
  tx:"#F3EEE7", tx2:"#BDB3A6", tx3:"#968B7E",
  acc:"#F59E0B", accL:"#3A2608", accD:"#FBBF24", onAcc:"#1F1300",
  brand:"#F3EEE7",
  grn:"#4ADE80", grnL:"#0E2A18",
  red:"#F87171", redL:"#2E1212",
  amb:"#FACC15", ambL:"#2B2306",
  vio:"#C4B5FD", vioL:"#221A3A",
  cyan:"#67E8F9", cyanL:"#0B2630",
  ring:"rgba(245,158,11,.45)",
  sh:"0 1px 2px rgba(0,0,0,.4)",
  shLg:"0 12px 32px rgba(0,0,0,.55)",
};

export const ROLES = [
  "Mason","Carpenter","Electrician","Plumber","Helper",
  "Supervisor","Driver","Painter","Gardener","Welder","Other"
];

export const LABOUR_CATEGORIES = [
  "General","Masonry","Carpentry","Electrical","Plumbing",
  "Painting","Gardening","Welding","Finishing","Helper","Subcontract","Other"
];

export const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);
