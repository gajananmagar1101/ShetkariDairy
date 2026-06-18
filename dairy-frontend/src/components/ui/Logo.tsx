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
      <rect width="512" height="512" rx={100} fill="#5F259F" />
      <g transform="translate(127.20,404.80) scale(0.32,-0.32)" fill="white" stroke="white" strokeWidth="40" strokeLinejoin="round">
        <path d="M178 380 261 461C230 471 214 495 214 521C214 545 232 569 268 569C305 569 335 537 335 476C335 393 277 343 191 343C160 343 122 349 88 366L9 262L94 200L339 -27L456 54L363 138C314 182 265 215 232 232V236C350 240 477 316 477 478C477 580 411 680 262 680C154 680 75 605 75 518C75 450 111 398 178 380ZM558 671V0H700V562H805V671Z"/>
        <path d="M-205 664H-81L-326 957L-484 924L-399 828C-339 760 -274 701 -212 668Z" transform="translate(775,0)"/>
      </g>
    </svg>
  )
}
