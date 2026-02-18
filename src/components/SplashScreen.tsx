const SplashScreen = () => {
  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Cinematic dark background + grid */}
      <div
        className="absolute inset-0 splash-overlay"
        style={{
          background:
            "radial-gradient(135deg, #0a1a10 0%, #060e09 100%), " +
            "repeating-linear-gradient(0deg, rgba(61,181,110,0.05) 0px, rgba(61,181,110,0.05) 1px, transparent 1px, transparent 48px), " +
            "repeating-linear-gradient(90deg, rgba(61,181,110,0.04) 0px, rgba(61,181,110,0.04) 1px, transparent 1px, transparent 48px)",
        }}
      />

      {/* Ambient glow blobs & floating particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(3)].map((_, i) => (
          <div
            key={`blob-${i}`}
            className="absolute rounded-full bg-primary/15 blur-3xl animate-float-particle"
            style={{
              width: `${180 + i * 60}px`,
              height: `${180 + i * 60}px`,
              left: `${8 + i * 26}%`,
              top: `${18 + i * 20}%`,
              animationDelay: `${i * 0.9}s`,
              animationDuration: `${7 + i * 2}s`,
            }}
          />
        ))}
        {[...Array(14)].map((_, i) => (
          <div
            key={`particle-${i}`}
            className="absolute w-[3px] h-[10px] rounded-full bg-primary/30 animate-float-particle"
            style={{
              left: `${5 + (i * 7) % 90}%`,
              top: `${60 + (i * 13) % 40}%`,
              opacity: 0.4,
              animationDelay: `${i * 0.25}s`,
              animationDuration: `${5 + (i % 4)}s`,
            }}
          />
        ))}
      </div>

      {/* Center cinematic logo */}
      <div className="relative flex items-center justify-center h-full">
        <div className="relative flex flex-col items-center justify-center gap-5">
          {/* Halo + logo core */}
          <div className="relative splash-logo-float">
            <div className="absolute inset-[-40px] rounded-full bg-primary/15 blur-3xl splash-halo" />
            <div className="absolute inset-[-20px] rounded-full border border-[rgba(61,181,110,0.45)] splash-halo" />

            <div className="relative splash-logo-core">
              <div className="w-28 h-28 rounded-full glass-card flex items-center justify-center border border-primary/40 shadow-[0_0_60px_rgba(61,181,110,0.6)]">
                <span className="text-4xl text-primary-foreground">🌱</span>
              </div>
            </div>
          </div>

          {/* Title + subtitle */}
          <div className="text-center space-y-1 splash-subtitle">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight neon-glow">
              Kisan<span className="text-gradient">Setu</span>
            </h1>
            <p className="text-xs md:text-sm text-[var(--text-secondary)] tracking-[0.18em] uppercase">
              Smart Agricultural Intelligence Platform
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
