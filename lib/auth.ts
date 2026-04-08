export interface UsuarioInterno {
  role: string
  roles?: string[] | null
}

export function userHasRole(usuario: UsuarioInterno, roleCheck: string): boolean {
  if (usuario.roles && usuario.roles.length > 0) {
    return usuario.roles.includes(roleCheck)
  }
  return usuario.role === roleCheck
}

export function userHasAnyRole(usuario: UsuarioInterno, rolesCheck: string[]): boolean {
  return rolesCheck.some(r => userHasRole(usuario, r))
}

export function getUserRoles(usuario: UsuarioInterno): string[] {
  if (usuario.roles && usuario.roles.length > 0) return usuario.roles
  return [usuario.role]
}
