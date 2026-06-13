/**
 * BackdropFX — the shared UNDERGROUND backdrop.
 *
 * The aerial root-network photo, darkened and edge-vignetted, fixed behind the
 * whole page. The hero (ForestDive / big trees) stays opaque and is NOT touched,
 * so this only becomes visible once you scroll past the trees — descending into
 * the roots. Every content section below sits transparent on top of this, so the
 * underground reads as one continuous, gradiented surface as you scroll.
 */

export default function BackdropFX() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-50 overflow-hidden">
      {/* deep base */}
      <div className="absolute inset-0 bg-[#070908]" />

      {/* the root network photo — underground, slightly blurred + more vibrant so
          it reads as ambient texture, clearly present but not sharply defined */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url(/roots-bg.png)",
          opacity: 1,
          filter: "brightness(1) saturate(1.25) contrast(1.12) blur(3px)",
          transform: "scale(1.04)",
        }}
      />

      {/* legibility scrim — slight darkness behind content so text reads easily,
          a touch darker top & bottom so beats melt into each other */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,9,8,0.7)_0%,rgba(7,9,8,0.36)_40%,rgba(7,9,8,0.4)_62%,rgba(7,9,8,0.7)_100%)]" />

      {/* gentle edge vignette — feathers the roots in from the sides */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_92%_88%_at_50%_50%,transparent_55%,rgba(7,9,8,0.65)_100%)]" />

      {/* faint emerald life to tie the warm roots into the theme */}
      <div className="absolute -left-[10%] top-[14%] h-[60vh] w-[55vw] rounded-full bg-[radial-gradient(circle,rgba(52,211,153,0.06),transparent_62%)] blur-[150px]" />
      <div className="absolute right-[-10%] bottom-[8%] h-[60vh] w-[55vw] rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.05),transparent_62%)] blur-[150px]" />

      {/* fine grain to kill banding */}
      <div
        className="absolute inset-0 opacity-[0.03] mix-blend-screen"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}
