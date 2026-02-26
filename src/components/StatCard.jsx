export function StatCard({ label, value, sub, accent, icon, isDark }) {
  return (
    <div style={{
      background: isDark ? "#252536" : "#fff",
      borderRadius: 16,
      padding: "14px 16px",
      boxShadow: isDark 
        ? "0 1px 12px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05)"
        : "0 1px 12px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)",
      flex: 1,
      display: "flex",
      alignItems: "center",
      gap: 12,
      position: "relative",
      overflow: "hidden",
      minWidth: 0,
    }}>
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: 4,
        background: accent, borderRadius: "16px 0 0 16px",
      }} />
      <div style={{
        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
        background: accent + "25",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 20, marginLeft: 8,
      }}>{icon}</div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: isDark ? "#888" : "#aaa", letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: "'Outfit', sans-serif", marginBottom: 1 }}>{label}</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: isDark ? "#f0f0f0" : "#1a1a2e", fontFamily: "'Outfit', sans-serif", lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div>
        {sub && <div style={{ fontSize: 10, color: isDark ? "#888" : "#888", fontFamily: "'DM Sans', sans-serif", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>}
      </div>
    </div>
  );
}
