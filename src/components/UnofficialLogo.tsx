import React from 'react';

interface UnofficialLogoProps {
  className?: string;
  size?: number;
}

export const UnofficialLogo: React.FC<UnofficialLogoProps> = ({ className = 'w-16 h-16 sm:w-20 sm:h-20' }) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      aria-label="BPUT Student Community Unofficial Academic Portal Emblem"
    >
      <svg
        viewBox="0 0 260 260"
        className="w-full h-full drop-shadow-[3px_3px_0px_#000] select-none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer Heavy Neobrutalist Ring */}
        <circle cx="130" cy="130" r="122" fill="#FAF9F6" stroke="#000000" strokeWidth="6" />
        <circle cx="130" cy="130" r="113" fill="#FBBF24" stroke="#000000" strokeWidth="4" />

        {/* Outer Circular Ring Inscription Guide */}
        <circle cx="130" cy="130" r="92" fill="#1E3A8A" stroke="#000000" strokeWidth="4" />

        {/* Circular Text Path for Academic Portal Identity */}
        <path
          id="upperPortalArc"
          d="M 38 130 A 92 92 0 0 1 222 130"
          fill="none"
        />
        <text
          fontSize="11"
          fontWeight="900"
          fill="#000000"
          letterSpacing="2.2"
          fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
        >
          <textPath href="#upperPortalArc" startOffset="50%" textAnchor="middle">
            ✦ BPUT STUDENT COMMUNITY ✦
          </textPath>
        </text>

        {/* Inner Shield Backdrop */}
        <path
          d="M 68 76 L 192 76 C 192 136 160 178 130 196 C 100 178 68 136 68 76 Z"
          fill="#2563EB"
          stroke="#000000"
          strokeWidth="4.5"
          strokeLinejoin="round"
        />

        {/* Shield Quartering / Dual Color Field */}
        <path
          d="M 130 76 L 192 76 C 192 136 160 178 130 196 Z"
          fill="#1D4ED8"
          stroke="#000000"
          strokeWidth="2"
        />

        {/* Twin Laurels of Achievement on Shield Flanks */}
        <g stroke="#000000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {/* Left Laurel Leaves */}
          <path d="M 52 144 C 44 132 46 112 54 98" fill="none" strokeWidth="3" />
          <path d="M 46 122 C 38 120 40 112 48 114" fill="#34D399" />
          <path d="M 48 108 C 42 104 46 96 52 100" fill="#34D399" />
          <path d="M 54 94 C 50 88 56 82 62 88" fill="#34D399" />
          <path d="M 48 138 C 42 136 44 128 50 130" fill="#34D399" />

          {/* Right Laurel Leaves */}
          <path d="M 208 144 C 216 132 214 112 206 98" fill="none" strokeWidth="3" />
          <path d="M 214 122 C 222 120 220 112 212 114" fill="#34D399" />
          <path d="M 212 108 C 218 104 214 96 208 100" fill="#34D399" />
          <path d="M 206 94 C 210 88 204 82 198 88" fill="#34D399" />
          <path d="M 212 138 C 218 136 216 128 210 130" fill="#34D399" />
        </g>

        {/* Torch of Knowledge (Center Crest) */}
        <g id="torchGroup">
          {/* Torch Handle */}
          <polygon
            points="126,146 134,146 132,174 128,174"
            fill="#F59E0B"
            stroke="#000000"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* Torch Bowl */}
          <path
            d="M 121 146 C 121 140 139 140 139 146 L 136 153 L 124 153 Z"
            fill="#FBBF24"
            stroke="#000000"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* Torch Flame Outer */}
          <path
            d="M 130 118 C 122 126 122 136 130 144 C 138 136 138 126 130 118 Z"
            fill="#F97316"
            stroke="#000000"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* Torch Flame Inner */}
          <path
            d="M 130 126 C 126 131 126 138 130 142 C 134 138 134 131 130 126 Z"
            fill="#FEF08A"
            stroke="#000000"
            strokeWidth="1.5"
          />
        </g>

        {/* Academic Mortarboard Cap */}
        <g id="mortarboardGroup">
          {/* Diamond Cap Top */}
          <polygon
            points="130,56 182,74 130,92 78,74"
            fill="#0F172A"
            stroke="#000000"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          {/* Cap Skull Under-band */}
          <path
            d="M 98 81 L 98 96 C 98 106 162 106 162 96 L 162 81"
            fill="#1E293B"
            stroke="#000000"
            strokeWidth="3.5"
          />
          {/* Tassel Button */}
          <circle cx="130" cy="74" r="4.5" fill="#FBBF24" stroke="#000000" strokeWidth="2.5" />
          {/* Flowing Orange Tassel */}
          <path
            d="M 130 74 Q 172 75 174 98"
            fill="none"
            stroke="#F97316"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle cx="174" cy="101" r="5" fill="#F97316" stroke="#000000" strokeWidth="2.5" />
        </g>

        {/* Open Academic Grade Book */}
        <g transform="translate(130, 154)">
          {/* Left Page */}
          <path
            d="M 0 0 C -15 -8 -32 -6 -42 2 L -42 22 C -32 14 -15 12 0 20 Z"
            fill="#FFFFFF"
            stroke="#000000"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          {/* Right Page */}
          <path
            d="M 0 0 C 15 -8 32 -6 42 2 L 42 22 C 32 14 15 12 0 20 Z"
            fill="#FFFFFF"
            stroke="#000000"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          {/* Spine Divider */}
          <line x1="0" y1="0" x2="0" y2="20" stroke="#000000" strokeWidth="3.5" />
          {/* Left Page Markings */}
          <line x1="-34" y1="6" x2="-8" y2="9" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
          <line x1="-34" y1="12" x2="-10" y2="15" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
          {/* Right Page Markings */}
          <line x1="8" y1="9" x2="34" y2="6" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
          <line x1="10" y1="15" x2="34" y2="12" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* Academic Stars */}
        <polygon
          points="88,114 91,121 98,121 92,125 94,132 88,127 82,132 84,125 78,121 85,121"
          fill="#FDE047"
          stroke="#000000"
          strokeWidth="2"
        />
        <polygon
          points="172,114 175,121 182,121 176,125 178,132 172,127 166,132 168,125 162,121 169,121"
          fill="#FDE047"
          stroke="#000000"
          strokeWidth="2"
        />

        {/* Neobrutalist Banner: UNOFFICIAL PORTAL */}
        <g transform="translate(130, 214)">
          {/* Hard Shadow for Banner */}
          <rect
            x="-88"
            y="-14"
            width="176"
            height="30"
            rx="8"
            fill="#000000"
          />
          <rect
            x="-90"
            y="-16"
            width="180"
            height="30"
            rx="8"
            fill="#F97316"
            stroke="#000000"
            strokeWidth="3.5"
          />
          <text
            x="0"
            y="4"
            fontFamily="'Space Grotesk', 'Plus Jakarta Sans', system-ui, sans-serif"
            fontWeight="900"
            fontSize="12"
            fill="#FFFFFF"
            textAnchor="middle"
            letterSpacing="1.8"
          >
            UNOFFICIAL PORTAL
          </text>
        </g>
      </svg>
    </div>
  );
};
