import type { ReactNode } from 'react';

/**
 * Shared Minecraft GUI pieces. Everything is CSS-driven (see .mc-* in
 * index.css) so these stay presentational and carry no content.
 */

export function Panel({
  title,
  subtitle,
  children,
  className = '',
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mc-panel mc-panel-lip p-5 sm:p-7 ${className}`}>
      {title && (
        <h2 className="mc-title text-[13px] leading-relaxed sm:text-[16px]">{title}</h2>
      )}
      {subtitle && (
        <p className="mt-2 text-[19px] leading-snug text-[color:var(--ink-soft)]">{subtitle}</p>
      )}
      {(title || subtitle) && <div className="mt-4 h-[3px] bg-black/25" />}
      <div className={title || subtitle ? 'mt-5' : ''}>{children}</div>
    </div>
  );
}

/** A 3D-bevelled inventory slot. */
export function Slot({
  children,
  className = '',
  hover = false,
}: {
  children?: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div className={`mc-slot ${hover ? 'mc-slot-hover' : ''} grid place-items-center ${className}`}>
      {children}
    </div>
  );
}

/** A pixel-art item sprite from /public/tex. */
export function Item({ src, alt = '', size = 32 }: { src: string; alt?: string; size?: number }) {
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      style={{ imageRendering: 'pixelated', filter: 'drop-shadow(2px 2px 0 rgba(0,0,0,.45))' }}
    />
  );
}

/** A flat coloured cube, for decoration where no sprite exists. */
export function Block({ color, size = 28 }: { color: string; size?: number }) {
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        background: color,
        boxShadow: `inset ${size / 7}px ${size / 7}px 0 rgba(255,255,255,.35),
                    inset -${size / 7}px -${size / 7}px 0 rgba(0,0,0,.42)`,
      }}
      className="block"
    />
  );
}

/** Health row. Half hearts are not modelled — the stat is decorative. */
export function Hearts({ count }: { count: number }) {
  return (
    <div className="flex gap-[3px]" role="img" aria-label={`Health ${count} of 10`}>
      {Array.from({ length: 10 }, (_, i) => (
        <Heart key={i} full={i < count} />
      ))}
    </div>
  );
}

function Heart({ full }: { full: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden className="shrink-0">
      <path
        d="M2 3h3v1h1V3h3v1h1v3h-1v1h-1v1H8v1H7v1H6v-1H5V9H4V8H3V7H2V4h1z"
        fill={full ? 'var(--heart)' : '#4a1414'}
        stroke="#2a0000"
        strokeWidth="0.5"
      />
    </svg>
  );
}

/** The green experience bar, plus the level number that floats above it. */
export function XpBar({ level, percent }: { level: number; percent: number }) {
  return (
    <div className="w-full">
      <div className="mb-1 text-center">
        <span
          className="mc-out"
          style={{ fontFamily: 'var(--px)', fontSize: 13, color: 'var(--xp)' }}
        >
          {level}
        </span>
      </div>
      <div className="mc-xp">
        <i style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
      </div>
    </div>
  );
}

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];

/** An enchantment row: name, notched level bar, roman numeral. */
export function EnchantRow({ name, level }: { name: string; level: number }) {
  const capped = Math.max(0, Math.min(5, level));
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[minmax(0,1fr)_140px_auto]">
      <span className="no-break text-[19px] leading-tight text-[color:var(--ink)]">{name}</span>
      <span className="mc-ench-bar order-3 col-span-2 sm:order-none sm:col-span-1">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={i < capped ? 'on' : ''} />
        ))}
      </span>
      <span
        className="justify-self-end text-[color:var(--ench-ink)]"
        style={{ fontFamily: 'var(--px)', fontSize: 10 }}
      >
        {ROMAN[capped]}
        <span className="sr-only"> out of V</span>
      </span>
    </li>
  );
}
