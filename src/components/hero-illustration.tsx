export function HeroIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 520 440"
      className={className}
      role="img"
      aria-label="Students learning together"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff4e6" />
          <stop offset="100%" stopColor="#ffe4d4" />
        </linearGradient>
        <linearGradient id="screenGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="100%" stopColor="#fbeee2" />
        </linearGradient>
        <linearGradient id="coral" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff9a7a" />
          <stop offset="100%" stopColor="#ff7a59" />
        </linearGradient>
        <linearGradient id="lavender" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#cab8ee" />
          <stop offset="100%" stopColor="#b8a4e0" />
        </linearGradient>
        <linearGradient id="mint" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a4e3cd" />
          <stop offset="100%" stopColor="#7dd3b8" />
        </linearGradient>
        <linearGradient id="butter" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe4a3" />
          <stop offset="100%" stopColor="#ffd97a" />
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      {/* Backdrop blob */}
      <ellipse cx="260" cy="240" rx="240" ry="190" fill="url(#bgGrad)" />

      {/* Floating soft shapes */}
      <circle cx="80" cy="90" r="34" fill="url(#butter)" opacity="0.7" />
      <circle cx="450" cy="80" r="22" fill="url(#mint)" opacity="0.75" />
      <circle cx="470" cy="340" r="40" fill="url(#lavender)" opacity="0.55" />
      <circle cx="60" cy="360" r="26" fill="#ffa8b8" opacity="0.55" />

      {/* Glow behind laptop */}
      <ellipse cx="260" cy="290" rx="160" ry="40" fill="url(#glow)" filter="url(#soft)" />

      {/* Laptop base */}
      <rect x="120" y="300" width="280" height="14" rx="7" fill="#ead4be" />
      <rect x="120" y="300" width="280" height="6" rx="3" fill="#d9bfa3" />

      {/* Laptop screen */}
      <rect x="140" y="140" width="240" height="160" rx="14" fill="#3a2d24" />
      <rect x="148" y="148" width="224" height="144" rx="8" fill="url(#screenGrad)" />

      {/* Screen content - exam UI mock */}
      <rect x="158" y="158" width="60" height="8" rx="4" fill="url(#coral)" />
      <rect x="158" y="172" width="120" height="6" rx="3" fill="#e6c8ad" />
      <rect x="158" y="184" width="100" height="6" rx="3" fill="#e6c8ad" />

      {/* Question card */}
      <rect x="158" y="200" width="204" height="78" rx="8" fill="#fff" stroke="#f0dccb" />
      <rect x="166" y="208" width="80" height="6" rx="3" fill="#2a1f1a" />
      <rect x="166" y="220" width="160" height="5" rx="2.5" fill="#9c8473" />
      <rect x="166" y="230" width="140" height="5" rx="2.5" fill="#9c8473" />

      {/* Option rows */}
      <circle cx="172" cy="250" r="4" fill="url(#coral)" />
      <rect x="182" y="247" width="60" height="6" rx="3" fill="#6b574a" />
      <circle cx="252" cy="250" r="4" fill="#e6c8ad" />
      <rect x="262" y="247" width="60" height="6" rx="3" fill="#9c8473" />

      <circle cx="172" cy="266" r="4" fill="#e6c8ad" />
      <rect x="182" y="263" width="50" height="6" rx="3" fill="#9c8473" />
      <circle cx="242" cy="266" r="4" fill="#e6c8ad" />
      <rect x="252" y="263" width="70" height="6" rx="3" fill="#9c8473" />

      {/* Camera dot */}
      <circle cx="260" cy="148" r="2" fill="#6b574a" />

      {/* Student 1 - left, holding tablet */}
      <g>
        {/* head */}
        <circle cx="80" cy="200" r="22" fill="#f4c9a3" />
        {/* hair */}
        <path
          d="M58 195 Q 58 170 80 170 Q 102 170 102 195 Q 102 188 80 188 Q 58 188 58 195 Z"
          fill="#3a2820"
        />
        {/* smile */}
        <path
          d="M73 206 Q 80 211 87 206"
          stroke="#3a2820"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        {/* eyes */}
        <circle cx="73" cy="200" r="1.6" fill="#3a2820" />
        <circle cx="87" cy="200" r="1.6" fill="#3a2820" />
        {/* body / sweater */}
        <path
          d="M48 240 Q 80 226 112 240 L 112 320 L 48 320 Z"
          fill="url(#coral)"
        />
        {/* tablet */}
        <rect x="60" y="248" width="44" height="34" rx="4" fill="#fff" stroke="#f0dccb" />
        <rect x="64" y="252" width="20" height="3" rx="1.5" fill="url(#coral)" />
        <rect x="64" y="259" width="32" height="2" rx="1" fill="#c4b3a3" />
        <rect x="64" y="265" width="28" height="2" rx="1" fill="#c4b3a3" />
        <rect x="64" y="271" width="20" height="2" rx="1" fill="#c4b3a3" />
      </g>

      {/* Student 2 - right, with phone */}
      <g>
        {/* hair back */}
        <path
          d="M412 205 Q 412 168 440 168 Q 468 168 468 205 L 468 232 L 412 232 Z"
          fill="#5a3a28"
        />
        {/* head */}
        <circle cx="440" cy="200" r="22" fill="#e8b48a" />
        {/* hair front bangs */}
        <path
          d="M420 188 Q 430 178 440 184 Q 450 178 460 188 Q 458 192 440 192 Q 422 192 420 188 Z"
          fill="#5a3a28"
        />
        <path
          d="M73 206 Q 80 211 87 206"
          stroke="#3a2820"
          strokeWidth="2"
          fill="none"
        />
        {/* smile */}
        <path
          d="M433 207 Q 440 213 447 207"
          stroke="#3a2820"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        {/* eyes */}
        <circle cx="433" cy="200" r="1.6" fill="#3a2820" />
        <circle cx="447" cy="200" r="1.6" fill="#3a2820" />
        {/* body / hoodie */}
        <path
          d="M408 240 Q 440 226 472 240 L 472 320 L 408 320 Z"
          fill="url(#lavender)"
        />
        {/* phone */}
        <rect x="424" y="252" width="22" height="34" rx="3" fill="#2a1f1a" />
        <rect x="426" y="254" width="18" height="30" rx="2" fill="#fff" />
        <rect x="429" y="258" width="12" height="2" rx="1" fill="url(#coral)" />
        <rect x="429" y="263" width="10" height="1.5" rx="0.75" fill="#c4b3a3" />
        <rect x="429" y="267" width="12" height="1.5" rx="0.75" fill="#c4b3a3" />
        <circle cx="435" cy="278" r="2" fill="url(#mint)" />
      </g>

      {/* Floating UI badges */}
      <g className="float-slow">
        <rect x="350" y="110" width="92" height="34" rx="17" fill="#fff" stroke="#f0dccb" />
        <circle cx="367" cy="127" r="6" fill="url(#mint)" />
        <path
          d="M364 127 L 366.5 130 L 371 124"
          stroke="#fff"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="378" y="120" width="56" height="5" rx="2.5" fill="#2a1f1a" />
        <rect x="378" y="128" width="40" height="4" rx="2" fill="#9c8473" />
      </g>

      <g className="float-med">
        <rect x="56" y="120" width="78" height="30" rx="15" fill="#fff" stroke="#f0dccb" />
        <circle cx="71" cy="135" r="6" fill="url(#butter)" />
        <text x="68" y="139" fontSize="9" fontWeight="700" fill="#8a6420">A+</text>
        <rect x="83" y="128" width="42" height="5" rx="2.5" fill="#2a1f1a" />
        <rect x="83" y="136" width="30" height="4" rx="2" fill="#9c8473" />
      </g>

      {/* Pencil */}
      <g className="float-fast" transform="rotate(-20 200 380)">
        <rect x="180" y="376" width="60" height="8" rx="2" fill="url(#butter)" />
        <polygon points="240,376 252,380 240,384" fill="#3a2820" />
        <rect x="180" y="376" width="8" height="8" fill="#ffa8b8" />
      </g>

      {/* Sparkles */}
      <g fill="url(#coral)">
        <circle cx="350" cy="60" r="3" />
        <circle cx="120" cy="50" r="2.5" />
        <circle cx="490" cy="200" r="2.5" />
        <circle cx="30" cy="240" r="2.5" />
      </g>
    </svg>
  );
}
