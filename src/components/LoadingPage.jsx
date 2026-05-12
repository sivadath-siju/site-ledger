import React from "react";
import { useApp } from "../context/AppCtx";
import loadingImg from "./loading.png";

export default function LoadingPage() {
  const { tk } = useApp();
  
  const background = tk?.bg || "#f0f2f5";
  const accent = tk?.acc || "#1a56db";
  const textColor = tk?.tx || "#0f1623";
  const textSecondary = tk?.tx3 || "#8a96a8";
  const barBg = tk?.surf3 || "#eef0f5";

  return (
    <div style={{
      height: "100vh",
      width: "100vw",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: background,
      transition: "background 0.25s",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <style>
        {`
          @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.02); opacity: 0.95; }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes loadingBar {
            0% { width: 0%; }
            10% { width: 5%; }
            100% { width: 100%; }
          }
        `}
      </style>
      
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 20,
        animation: "pulse 2s infinite ease-in-out"
      }}>
        <img 
          src={loadingImg} 
          alt="Loading..." 
          style={{ 
            width: "300px", 
            maxWidth: "80vw", 
            borderRadius: "16px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.1)"
          }} 
        />
        
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: textColor, letterSpacing: "-.6px" }}>
            Ciel Homes
          </div>
          <div style={{ fontSize: 12, color: textSecondary, fontWeight: 600, letterSpacing: ".08em", marginTop: 4, textTransform: "uppercase" }}>
            Site Management System
          </div>
        </div>
      </div>

      <div style={{ marginTop: 40, width: "100%", maxWidth: 280, textAlign: "center" }}>
        {/* Loading Bar Container */}
        <div style={{ 
          width: "100%", 
          height: 6, 
          background: barBg, 
          borderRadius: 10, 
          overflow: "hidden", 
          marginBottom: 12,
          border: `1px solid ${tk?.bdr || "#e2e5eb"}`
        }}>
          <div style={{ 
            height: "100%", 
            background: accent, 
            borderRadius: 10,
            animation: "loadingBar 10s cubic-bezier(0.1, 0, 0.2, 1) forwards" 
          }} />
        </div>
        
        <div style={{ fontSize: 13, color: textSecondary, fontWeight: 500, lineHeight: 1.5 }}>
          Please wait for 10 seconds while our servers wake up
        </div>
      </div>

      <div style={{ position: "fixed", bottom: 30, fontSize: 11, color: textSecondary, opacity: 0.6 }}>
        Optimizing site operations...
      </div>
    </div>
  );
}
