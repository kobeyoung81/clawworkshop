export function DistrictBackground({ className = '' }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <svg
        className="absolute bottom-0 left-0 right-0 w-full"
        viewBox="0 0 1200 220"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          d="M0 220 L0 158 L60 158 L60 108 L92 108 L92 78 L128 78 L128 128 L172 128 L172 56 L216 56 L216 146 L264 146 L264 98 L300 98 L300 68 L336 68 L336 120 L388 120 L388 46 L428 46 L428 22 L460 22 L460 46 L492 46 L492 106 L538 106 L538 72 L572 72 L572 124 L628 124 L628 82 L670 82 L670 42 L708 42 L708 16 L738 16 L738 42 L776 42 L776 122 L828 122 L828 92 L866 92 L866 62 L904 62 L904 108 L948 108 L948 72 L986 72 L986 138 L1044 138 L1044 94 L1084 94 L1084 54 L1120 54 L1120 32 L1148 32 L1148 54 L1180 54 L1180 128 L1200 128 L1200 220 Z"
          fill="rgba(0, 229, 255, 0.04)"
          stroke="rgba(0, 229, 255, 0.12)"
          strokeWidth="0.5"
        />
        {[160, 356, 522, 728, 930, 1114].map((x, index) => (
          <rect key={`window-a-${index}`} x={x} y={38} width={5} height={4} fill="#00e5ff" opacity="0.55" />
        ))}
        {[164, 360, 526, 732, 934, 1118].map((x, index) => (
          <rect key={`window-b-${index}`} x={x} y={54} width={3} height={3} fill="#00e5ff" opacity="0.35" />
        ))}
      </svg>

      <div
        className="absolute left-0 right-0 h-px"
        style={{
          top: '28%',
          background: 'linear-gradient(90deg, transparent, rgba(0,229,255,0.3), transparent)',
          animation: 'fadeUp 4s ease-in-out infinite alternate',
        }}
      />
    </div>
  );
}
