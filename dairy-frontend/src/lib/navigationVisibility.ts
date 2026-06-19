const MOBILE_DOCK_HIDDEN_PREFIXES = [
  '/customers',
  '/milk-entries',
  '/payments',
  '/labour',
]

export function shouldHideMobileDock(pathname: string) {
  return MOBILE_DOCK_HIDDEN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}
