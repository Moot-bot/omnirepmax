import React from "react";

/**
 * OMNIREP MAX — logo lockups.
 *
 *   stacked   → JPEG oficial completo (ORM + OMNIREP MAX + taglines) — login hero
 *   wordmark  → símbolo ORM em SVG + "OMNIREPMAX" em texto — sidebar, header, footer
 *   mark      → apenas o símbolo ORM em SVG — favicon / contextos muito pequenos
 *
 * Uso em superfícies claras: onDark={false} — o texto é renderizado em cinza-azul.
 * Uso em superfícies escuras: onDark={true} — o texto é renderizado em metálico.
 */

// ---- Clean SVG mark (chrome ring + royal→cyan diagonal blade) ----
function MarkSvg({ size = 40 }) {
  const uid = React.useId();
  const gChrome = `c-${uid}`;
  const gBlue = `b-${uid}`;
  const gHi = `h-${uid}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0"
    >
      <defs>
        <linearGradient id={gChrome} x1="0.3" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="40%" stopColor="#E2E8F0" />
          <stop offset="60%" stopColor="#94A3B8" />
          <stop offset="100%" stopColor="#C8D0DC" />
        </linearGradient>
        <linearGradient id={gBlue} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#075BFF" />
          <stop offset="100%" stopColor="#00C8F0" />
        </linearGradient>
        <linearGradient id={gHi} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#A5F3FC" />
          <stop offset="100%" stopColor="#22D3EE" />
        </linearGradient>
      </defs>
      {/* chrome ring (donut) */}
      <path
        d="M20 3 a17 17 0 1 1 -0.01 0 Z M20 10.5 a9.5 9.5 0 1 0 0.01 0 Z"
        fill={`url(#${gChrome})`}
        fillRule="evenodd"
      />
      {/* diagonal blade royal→cyan */}
      <path d="M27 3 L33 7 L13 37 L7 33 Z" fill={`url(#${gBlue})`} />
      {/* bright edge */}
      <path d="M31 5 L33 7 L13 37 L11 36 Z" fill={`url(#${gHi})`} opacity="0.85" />
    </svg>
  );
}

export default function Logo({ variant = "wordmark", size = 36, onDark = true, className = "" }) {
  // ---- Stacked hero: use the official JPEG with everything baked in ----
  if (variant === "stacked") {
    return (
      <div className={`inline-block overflow-hidden rounded-xl ${className}`}>
        <img
          src="/brand/orm-stacked.jpeg"
          alt="OMNIREP MAX"
          width={size}
          height={size}
          draggable={false}
          style={{ display: "block", width: size, height: size, objectFit: "contain" }}
        />
      </div>
    );
  }

  // ---- Mark-only ----
  if (variant === "mark") {
    return <MarkSvg size={size} />;
  }

  // ---- Default: wordmark = SVG mark + CSS text "OMNIREPMAX" ----
  const letterSize = Math.round(size * 0.62);
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <MarkSvg size={size} />
      <div
        className="font-display font-black leading-none tracking-tight select-none whitespace-nowrap"
        style={{ fontSize: letterSize, letterSpacing: "-0.02em" }}
      >
        <span className={onDark ? "text-metallic" : "text-[#06152F]"}>OMNIREP</span>
        <span className="text-brand-gradient">MAX</span>
      </div>
    </div>
  );
}
