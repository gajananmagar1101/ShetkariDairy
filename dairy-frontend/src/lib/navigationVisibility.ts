const MOBILE_DOCK_HIDDEN_PREFIXES = [
  '/customers',
  '/milk-entries',
  '/payments',
]

export function shouldHideMobileDock(pathname: string) {
  return (
    MOBILE_DOCK_HIDDEN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)) ||
    pathname.startsWith('/labour/')
  )
}
