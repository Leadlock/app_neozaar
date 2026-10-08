import Link from "next/link";

export default function ProposalStudioButton() {
  return (
    <Link href="/proposal-studio" aria-label="Proposal Studio" className="proposal-studio-btn">
      {/* Electric border — SVG turbulence filter jitters the stroke on hover */}
      <svg
        className="proposal-studio-btn__ring"
        viewBox="0 0 66 66"
        width="66"
        height="66"
        aria-hidden="true"
      >
        <defs>
          <filter id="ps-electric" x="-50%" y="-50%" width="200%" height="200%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="noise">
              <animate attributeName="seed" values="1;8;3;6;2;9;1" dur="1.2s" repeatCount="indefinite" />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="6" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <linearGradient id="ps-electric-grad" x1="0" y1="0" x2="66" y2="66" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#FDE68A" />
            <stop offset="0.5" stopColor="#FB923C" />
            <stop offset="1" stopColor="#EA580C" />
          </linearGradient>
        </defs>
        <circle cx="33" cy="33" r="27" fill="none" stroke="url(#ps-electric-grad)" strokeWidth="2.5" filter="url(#ps-electric)" />
      </svg>

      <span className="proposal-studio-btn__icon proposal-studio-btn__icon--outline">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assests/proposal-studio-icon-outline.svg" alt="" aria-hidden="true" />
      </span>
      <span className="proposal-studio-btn__icon proposal-studio-btn__icon--filled">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assests/proposal-studio-icon.svg" alt="" aria-hidden="true" />
      </span>

      <span className="proposal-studio-btn__tooltip">Proposal Studio</span>
    </Link>
  );
}
