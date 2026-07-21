// The Larder design system's one signature flourish: a soft, irregular
// watercolor bloom (an SVG turbulence filter over a blob shape) used
// behind brand marks and card corners instead of icons or food photos.
// WatercolorDefs renders the filter once; Watercolor renders one bloom.

export function WatercolorDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
      <defs>
        <filter id="watercolor" x="-50%" y="-50%" width="200%" height="200%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.018" numOctaves={3} seed={7} result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale={60} xChannelSelector="R" yChannelSelector="G" />
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
    </svg>
  );
}

const SHAPES = [
  "40% 60% 55% 45% / 55% 45% 60% 40%",
  "55% 45% 40% 60% / 45% 55% 45% 55%",
  "50% 50% 45% 55% / 60% 40% 55% 45%",
  "60% 40% 45% 55% / 45% 60% 40% 55%",
  "45% 55% 60% 40% / 50% 50% 50% 50%",
];

export function Watercolor({
  color = "var(--sage)",
  size = 130,
  variant = 0,
  style,
}: {
  color?: string;
  size?: number;
  variant?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        width: size,
        height: size * 0.85,
        background: color,
        borderRadius: SHAPES[variant % SHAPES.length],
        filter: "url(#watercolor)",
        opacity: 0.5,
        zIndex: 0,
        pointerEvents: "none",
        ...style,
      }}
    />
  );
}
