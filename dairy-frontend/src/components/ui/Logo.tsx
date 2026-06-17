interface LogoProps {
  size?: number
  className?: string
}

export function Logo({ size = 40, className = '' }: LogoProps) {
  return (
    <svg
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={className}
    >
      <rect x="56" y="56" width="400" height="400" rx={Math.round(400 * 0.225)} fill="#5F259F" />
      <text
        x="256"
        y="330"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="230"
        fontWeight="900"
        fill="white"
        textAnchor="middle"
      >
        शे
      </text>
    </svg>
  )
}
