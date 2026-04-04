import { createContext, useContext } from "react";

export const LIGHT = {
  bg:"#f0f2f5", surf:"#ffffff", surf2:"#f7f8fa", surf3:"#eef0f5",
  bdr:"#e2e5eb", bdr2:"#cdd1da",
  tx:"#0f1623", tx2:"#4a5568", tx3:"#8a96a8",
  acc:"#1a56db", accL:"#ebf0fd", accD:"#1240a8",
  grn:"#0d7a4e", grnL:"#e6f7f1",
  red:"#c0392b", redL:"#fdf0ee",
  amb:"#b45309", ambL:"#fef3e2",
  sh:"0 1px 3px rgba(0,0,0,.07),0 1px 2px rgba(0,0,0,.04)",
  shLg:"0 8px 28px rgba(0,0,0,.12)",
};

export const DARK = {
  bg:"#0d0f18", surf:"#161924", surf2:"#1e2235", surf3:"#252a3d",
  bdr:"#252a3d", bdr2:"#313754",
  tx:"#e8eaf0", tx2:"#8a95b0", tx3:"#4a5270",
  acc:"#4d80ee", accL:"#162050", accD:"#7aacff",
  grn:"#34d47a", grnL:"#0a2818",
  red:"#f05a4e", redL:"#28100e",
  amb:"#f5a623", ambL:"#281a06",
  sh:"0 1px 3px rgba(0,0,0,.3)",
  shLg:"0 8px 28px rgba(0,0,0,.5)",
};

export const ROLES = [
  "Mason","Carpenter","Electrician","Plumber","Helper",
  "Supervisor","Driver","Painter","Gardener","Welder","Other"
];

export const LABOUR_CATEGORIES = [
  "General","Masonry","Carpentry","Electrical","Plumbing",
  "Painting","Gardening","Welding","Finishing","Subcontract","Other"
];

export const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);
