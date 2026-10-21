export const portalPaths = {
  PROVIDER: '/provider/dashboard',
  NGO: '/ngo/dashboard',
  ADMIN: '/admin/dashboard',
} as const

export function getPortalPath(role: string) {
  return portalPaths[role as keyof typeof portalPaths] ?? '/login'
}
