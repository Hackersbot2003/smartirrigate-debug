export default function TipCard({ temp, hum, soil }) {
  const tips = [
    soil != null && soil < 20
      ? "Your soil is critically dry. Water your plants early morning or evening — not in the hot afternoon. This saves water and prevents evaporation."
      : null,
    temp != null && temp > 36
      ? "It is very hot today! Give your plants extra water and shade if possible. Hot weather makes the soil dry up much faster."
      : null,
    hum != null && hum < 30
      ? "The air is very dry today. Water evaporates quickly from soil in dry air. Add mulch around plants to keep soil moist for longer."
      : null,
    soil != null && soil > 70
      ? "Your soil is very wet right now. Do not water today — too much water can damage roots and cause disease."
      : null,
  ].filter(Boolean);

  const tip = tips[0] ?? "Your field conditions look good today! Check soil every morning for best results. Regular monitoring prevents most crop problems before they start.";

  return (
    <div className="fade-up" style={{
      borderRadius:16,
      background:"linear-gradient(135deg,#1a6e1a,#27a627)",
      padding:18,
      animationDelay:"560ms",
      boxShadow:"0 4px 20px rgba(39,166,39,.25)",
    }}>
      <p style={{
        fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.65)",
        textTransform:"uppercase", letterSpacing:1.3, marginBottom:8,
      }}>
        💡 Farming Tip of the Day
      </p>
      <p style={{
        fontSize:13, color:"rgba(255,255,255,0.92)", lineHeight:1.7,
      }}>
        {tip}
      </p>
    </div>
  );
}
