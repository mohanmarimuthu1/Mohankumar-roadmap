/**
 * Progress ring. `value` is 0-1.
 *
 * Track and bar are painted with Tailwind `stroke-*` utilities rather than
 * literal hex so the ring follows the active theme.
 */
export default function Ring({ value = 0, size = 120, stroke = 8, label, sublabel }) {
  const clamped = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-ink-600"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-accent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          style={{ transition: 'stroke-dashoffset 500ms ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl font-semibold text-ink-50">
          {label ?? `${Math.round(clamped * 100)}%`}
        </span>
        {sublabel ? (
          <span className="mt-0.5 text-[11px] uppercase tracking-wide text-ink-300">{sublabel}</span>
        ) : null}
      </div>
    </div>
  )
}
