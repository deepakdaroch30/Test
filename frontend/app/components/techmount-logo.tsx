"use client";

type Props = {
  size?: number;
  className?: string;
};

export default function TechMountLogo({ size = 28, className }: Props) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 256 256"
      role="img"
      aria-label="TechMount logo"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="techmount-gradient" x1="24" y1="20" x2="220" y2="212" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#183f73" />
          <stop offset="1" stopColor="#0f2d55" />
        </linearGradient>
      </defs>
      <path
        d="M18 206c-7 13 2 27 16 20l80-62c12-9 27-12 42-8l54 15c18 5 32-16 20-31L128 34c-8-11-24-9-29 4L18 206Z"
        fill="url(#techmount-gradient)"
        stroke="#0b2343"
        strokeWidth="4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
