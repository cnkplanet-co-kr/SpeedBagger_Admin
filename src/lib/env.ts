// 백엔드 API 환경을 런타임에 전환한다.
// - 배포본(운영 사이트): 운영 / 개발 중 선택 (기본 운영)
// - 로컬 개발(vite dev): 로컬 / 개발 중 선택 (기본 개발)
// 상단 레이아웃의 토글로 어느 백엔드에 붙을지 선택한다.

export type AppEnv = 'local' | 'dev' | 'prod'

export const ENV_LABELS: Record<AppEnv, string> = {
  local: '로컬',
  dev: '개발',
  prod: '운영',
}

const API_URLS: Record<AppEnv, string> = {
  local: import.meta.env.VITE_API_URL ?? 'http://localhost:8080',
  dev: 'https://api-dev.cnkplanet.co.kr',
  prod: 'https://api.cnkplanet.co.kr',
}

const STORAGE_KEY = 'admin_env'

// 실행 위치에 따라 선택 가능한 환경과 기본값이 달라진다.
export const AVAILABLE_ENVS: AppEnv[] = import.meta.env.DEV
  ? ['local', 'dev']
  : ['prod', 'dev']

export const DEFAULT_ENV: AppEnv = import.meta.env.DEV ? 'dev' : 'prod'

export function getEnv(): AppEnv {
  const stored = localStorage.getItem(STORAGE_KEY) as AppEnv | null
  // 저장된 값이 현재 실행 모드에서 선택 불가하면 기본값으로 보정한다.
  if (stored && AVAILABLE_ENVS.includes(stored)) return stored
  return DEFAULT_ENV
}

export function setEnv(env: AppEnv) {
  localStorage.setItem(STORAGE_KEY, env)
}

export function getApiBase(): string {
  return API_URLS[getEnv()]
}
