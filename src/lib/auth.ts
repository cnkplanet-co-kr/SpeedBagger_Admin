export interface AuthUser {
  id: number
  email: string
  name: string
}

export function saveAuth(token: string, user: AuthUser) {
  localStorage.setItem('admin_token', token)
  localStorage.setItem('admin_user', JSON.stringify(user))
}

export function clearAuth() {
  localStorage.removeItem('admin_token')
  localStorage.removeItem('admin_user')
}

export function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('admin_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function getStoredToken(): string | null {
  return localStorage.getItem('admin_token')
}

// JWT exp 클레임으로 만료 여부 확인 (디코딩만, 검증 아님)
export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 < Date.now()
  } catch {
    return true
  }
}
