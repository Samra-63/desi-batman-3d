export function BatEmblemIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 36" fill="currentColor" className={className} aria-hidden="true">
      <path d="M32 6l4 5 7-6c7 2 14 7 19 14-8 1-14 5-17 11-5-4-9-4-13 3-4-7-8-7-13-3-3-6-9-10-17-11C7 12 14 7 21 5l7 6 4-5z" />
    </svg>
  );
}

export function BatarangIcon({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 36" fill="none" className={className} aria-hidden="true">
      <path
        d="M32 7l3.5 4.5 6.5-5.5c8 2.2 14.5 6.8 19 13.5-7.5 1-13.5 4.2-16.5 9.8-4.5-3.2-8.5-3.2-12.5 2.7-4-5.9-8-5.9-12.5-2.7C16.5 23.7 10.5 20.5 3 19.5 7.5 12.8 14 8.2 22 6l6.5 5.5L32 7z"
        fill="currentColor"
        stroke="#0b0f19"
        strokeWidth="2"
      />
      <path d="M12 17c7-4 14-5 20-4 6-1 13 0 20 4" stroke="rgba(255,255,255,0.65)" strokeWidth="1.5" />
    </svg>
  );
}

export function BhensaPendantIcon({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      {/* Ornate Gothic Crescent Moon */}
      <path
        d="M42 12c-11.5 2-20 12-20 24 0 11 7.8 20.4 18.4 22.8A24 24 0 1 1 42 12z"
        fill="currentColor"
      />
      {/* Bat emblem nested inside crescent */}
      <path
        d="M37 25l2.5 3 4.2-3.8c4.4 1.5 8.5 4.3 11.3 8.3-4.6.7-8.2 2.8-10 6.2-2.7-2-5.1-2-8 1.5-2.9-3.5-5.3-3.5-8-1.5-1.8-3.4-5.4-5.5-10-6.2 2.8-4 6.9-6.8 11.3-8.3l4.2 3.8 2.5-3z"
        fill="#0b0f19"
      />
    </svg>
  );
}

export function CounterBoltIcon({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 42" fill="currentColor" className={className} aria-hidden="true">
      <path d="M21 2L5 23h10l-4 17 20-23H20l1-15z" stroke="#090c14" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export function FistStrikeIcon({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
      <path
        d="M10 19v-5a3 3 0 0 1 6 0v3m0-4a3 3 0 0 1 6 0v4m0-3a3 3 0 0 1 6 0v4m0-2a2.5 2.5 0 0 1 5 0v7c0 6.5-4.5 11-11 11h-3c-5.5 0-9-3.5-9-9v-6z"
        fill="currentColor"
        stroke="#090c14"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
