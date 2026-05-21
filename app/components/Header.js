"use client";
import { Activity } from "lucide-react";

export default function Header({ riskFreeRate }) {
  const rfDisplay = riskFreeRate != null
    ? `Rf ${(riskFreeRate * 100).toFixed(2)}%`
    : "Rf 4.50%";

  return (
    <header
      style={{
        height: "48px",
        background: "rgba(6,13,26,0.97)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingLeft: "16px",
        paddingRight: "16px",
        position: "sticky",
        top: 0,
        zIndex: 50,
        flexShrink: 0,
      }}
    >
      {/* Left: Logo + Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{
          width: 26, height: 26, borderRadius: "7px",
          background: "linear-gradient(135deg, #00e5ff 0%, #00ff87 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <Activity size={13} style={{ color: "#060d1a" }} />
        </div>
        <span style={{
          fontSize: "13px", fontWeight: 800,
          color: "rgba(255,255,255,0.9)",
          letterSpacing: "-0.01em",
          fontFamily: "'Inter', sans-serif",
        }}>
          Nailuj Terminal
        </span>
      </div>

      {/* Right: Status badges */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{
          display: "flex", alignItems: "center", gap: "5px",
          fontSize: "9px", fontFamily: "monospace", fontWeight: 700,
          color: "#22c55e", letterSpacing: "0.1em",
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: "50%",
            background: "#22c55e",
            boxShadow: "0 0 6px #22c55e80",
            display: "inline-block",
          }} />
          LIVE
        </span>
        <span style={{
          fontSize: "9px", fontFamily: "monospace", fontWeight: 700,
          color: "#00e5ff", letterSpacing: "0.06em",
          background: "rgba(0,229,255,0.08)",
          border: "1px solid rgba(0,229,255,0.2)",
          padding: "2px 8px", borderRadius: "5px",
        }}>
          {rfDisplay}
        </span>
        <span style={{
          fontSize: "9px", fontFamily: "monospace", fontWeight: 600,
          color: "rgba(255,255,255,0.25)",
          letterSpacing: "0.08em",
        }}>
          INSTITUTIONAL
        </span>
      </div>
    </header>
  );
}
