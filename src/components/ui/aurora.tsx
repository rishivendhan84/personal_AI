/**
 * Single, very subtle app-wide background effect (design: pick ONE, ~10-15%,
 * static or very slow, must never compete with data). A slow violet/cyan aurora
 * plus a faint dot-grid. CSS-only + GPU transform; killed by reduced-motion.
 */
export function Aurora() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* dot grid */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />
      {/* slow aurora blooms */}
      <div className="absolute -top-1/3 left-1/4 h-[60vh] w-[60vh] animate-aurora rounded-full bg-[#7C5CFC] opacity-[0.12] blur-[120px]" />
      <div
        className="absolute -bottom-1/3 right-1/4 h-[50vh] w-[50vh] animate-aurora rounded-full bg-[#22D3EE] opacity-[0.08] blur-[120px]"
        style={{ animationDelay: "-9s" }}
      />
      {/* vignette to keep edges calm — fades to the active theme background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,hsl(var(--background))_100%)]" />
    </div>
  );
}
