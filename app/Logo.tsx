// Logo: the wheel as a dinner plate between a fork and knife. Orange parts follow the theme accent.
export default function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 100" className={className} role="img" aria-label="Spin for Supper logo">
      <g transform="translate(14 14)" fill="currentColor"><rect x="-2.5" y="30" width="5" height="44" rx="2.5"/><path d="M-8 0 h3 v18 h2 v-18 h3 v18 h2 v-18 h3 v22 q0 8 -8 8 q-8 0 -8 -8z" transform="translate(1 0)"/></g>
      <g transform="translate(106 14)" fill="currentColor"><path d="M-3 0 q9 6 7 34 h-4 v40 q0 3 -3 3 q-3 0 -3 -3v-74z" transform="translate(2 0)"/></g>
      <circle cx="60" cy="50" r="38" fill="#fff" stroke="currentColor" strokeWidth="5"/>
      <path d="M60 50 L60.00 22.00 A28 28 0 0 1 79.80 30.20Z" fill="var(--accent)"/><path d="M60 50 L79.80 30.20 A28 28 0 0 1 88.00 50.00Z" fill="#fff1e0"/><path d="M60 50 L88.00 50.00 A28 28 0 0 1 79.80 69.80Z" fill="var(--accent-dark)"/><path d="M60 50 L79.80 69.80 A28 28 0 0 1 60.00 78.00Z" fill="color-mix(in srgb, var(--accent) 40%, white)"/><path d="M60 50 L60.00 78.00 A28 28 0 0 1 40.20 69.80Z" fill="var(--accent)"/><path d="M60 50 L40.20 69.80 A28 28 0 0 1 32.00 50.00Z" fill="#fff1e0"/><path d="M60 50 L32.00 50.00 A28 28 0 0 1 40.20 30.20Z" fill="var(--accent-dark)"/><path d="M60 50 L40.20 30.20 A28 28 0 0 1 60.00 22.00Z" fill="color-mix(in srgb, var(--accent) 40%, white)"/>
      <circle cx="60" cy="50" r="28" fill="none" stroke="currentColor" strokeWidth="3"/>
      <circle cx="60" cy="50" r="7" fill="#fff" stroke="currentColor" strokeWidth="3"/>
      <polygon points="54,7 66,7 60,19" fill="currentColor"/>
    </svg>
  );
}
