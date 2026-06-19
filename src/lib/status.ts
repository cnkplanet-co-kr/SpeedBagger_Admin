// 주문 상태(work_flag) 라벨 매핑 — wails-app utils/status.ts 와 동일 규약

export const STATUS_OPTIONS = [
  { value: '0', label: '대기' },
  { value: '1', label: '출력' },
  { value: '2', label: '보류' },
  { value: '3', label: '배송' },
  { value: '4', label: '취소' },
  { value: '9', label: '다른포장기' },
]

export const getStatusText = (flag: string): string =>
  STATUS_OPTIONS.find((o) => o.value === flag)?.label ?? ''

const CS_STATUS_MAP: Record<string, string> = {
  '0': '정상',
}

export const getCsStatusText = (value: unknown): string =>
  CS_STATUS_MAP[String(value ?? '')] ?? ''
