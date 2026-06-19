import { getApiBase } from './env'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('admin_token')
  const res = await fetch(`${getApiBase()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })

  if (res.status === 204) return undefined as T
  const data = await res.json()
  if (!res.ok) throw { status: res.status, ...data }
  return data as T
}

export interface AuthResponse {
  status: 'approved' | 'pending' | 'rejected'
  token?: string
  user?: { id: number; email: string; name: string }
  error?: string
}

export interface Partner {
  partner_id: number
  partner_name: string
  is_active: string
}

export interface Account {
  account_id: number
  account_name: string
  partner_id: number
  wbs_id: number
  domain_name: string
  is_active: string
}

export interface ApiAccount {
  account_id: number
  partner_id: number
  wbs_id: number
  account_name: string
  api_url: string
  partner_key: string
  domain_key: string
  domain_name: string
  auth_type: string
  account_type: string
  is_active: string
  delv_type: string
  delv_interval: number
  print_type: string
  print_type_req_body?: string
  waybill_template?: string
  warehouse_id?: number
  shipper_codes?: string[] | null
  shop_codes?: string[] | null
}

export interface Machine {
  machine_id: number
  account_id: number
  partner_id: number
  machine_name: string
  machine_uuid: string
  machine_desc?: string
  role: string
  is_active: string
  printer_main?: string
  printer_aux?: string
  printer_dpi?: number
  printer_width?: number
  printer_height?: number
  printer_orientation?: string
  use_inspection?: string
  shipper_codes?: string[] | null
}

export interface WBS {
  wbs_id: number
  wbs_name: string
  wbs_type: string
  wbs_desc?: string
  is_active: string
}

export interface Shipper {
  shipper_id: number
  partner_id: number
  account_id: number
  shipper_code: string
  shipper_name: string
}

export interface Shop {
  shop_id: number
  partner_id: number
  account_id: number
  shop_code: string
  shop_name: string
}

export interface Warehouse {
  id: number
  name: string
  category_id: string
}

export interface AccountSender {
  account_id?: number
  sender_name: string
  sender_mobile: string
  sender_postno: string
  sender_addr1: string
  sender_addr2?: string
}

export interface APICallLog {
  id: number
  partner_id: number
  account_id: number
  machine_id: number
  full_url: string
  request?: string
  response?: string
  error_msg?: string
  created_at: string
  machine_name?: string
  account_name?: string
  partner_name?: string
}

export interface SystemLog {
  id: number
  machine_id: number
  module: string
  connect_type: string
  level: string
  service: string
  msg: string
  status: number
  uri: string
  method: string
  latency: number
  created_at: string
  machine_name?: string
  partner_id?: number
  partner_name?: string
}

export interface LogPage<T> { total: number; items: T[] }

export interface UnifiedLog {
  log_type: 'api' | 'system'
  log_id: number
  created_at: string        // KST "yyyy-MM-dd HH:mm:ss"
  partner_name: string
  account_name?: string
  machine_name: string
  // api
  full_url?: string
  error_msg?: string
  request?: string
  response?: string
  // system
  level?: string
  module?: string
  service?: string
  msg?: string
  status?: number
  uri?: string
  method?: string
  latency?: number
}

export interface WorkStatCell {
  single: number
  multi: number
  total: number
}

export interface WorkStatResult {
  periods: string[]
  cols: { key: string; name: string }[]
  cells: Record<string, WorkStatCell>
}

export interface OrderHistoryRow {
  id: number
  kind: string
  waybill_no: string
  work_flag: string
  scan_date: string
  machine_name: string
  reprint_count: number
  aux_printed: boolean
  product_cd: string
  product_name: string
  product_option: string
  order_cs: string
  cs_id: string | number
  cs_name: string
  barcode: string
  order_qty: number
  order_no: string
  order_date: string
  collect_date: string
  trans_date: string
  shipper_name: string
  shop_name: string
  recv_name: string
}

export interface OrderHistoryResponse {
  data: OrderHistoryRow[]
  total: number
  waybill_count: number
  product_qty: number
}

export const api = {
  // Auth
  googleLogin: (accessToken: string) =>
    request<AuthResponse>('/api/admin/auth/google', {
      method: 'POST',
      body: JSON.stringify({ access_token: accessToken }),
    }),

  getMe: () =>
    request<{ id: number; email: string; name: string; status: string }>(
      '/api/admin/auth/me',
    ),

  // Partners
  getPartners: () => request<Partner[]>('/api/admin/partners'),
  createPartner: (data: { partner_name: string; is_active: string }) =>
    request<Partner>('/api/admin/partners', { method: 'POST', body: JSON.stringify(data) }),
  updatePartner: (id: number, data: { partner_name: string; is_active: string }) =>
    request<Partner>(`/api/admin/partners/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePartner: (id: number) =>
    request<void>(`/api/admin/partners/${id}`, { method: 'DELETE' }),

  // WBS
  getWBS: () => request<WBS[]>('/api/admin/wbs'),
  createWBS: (data: { wbs_name: string; wbs_type: string; wbs_desc?: string; is_active: string }) =>
    request<WBS>('/api/admin/wbs', { method: 'POST', body: JSON.stringify(data) }),
  updateWBS: (id: number, data: { wbs_name: string; wbs_type: string; wbs_desc?: string; is_active: string }) =>
    request<WBS>(`/api/admin/wbs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteWBS: (id: number) =>
    request<void>(`/api/admin/wbs/${id}`, { method: 'DELETE' }),

  // Accounts
  getAccounts: () => request<ApiAccount[]>('/api/admin/accounts'),
  createAccount: (data: Partial<ApiAccount>) =>
    request<ApiAccount>('/api/admin/accounts', { method: 'POST', body: JSON.stringify(data) }),
  updateAccount: (id: number, data: Partial<ApiAccount>) =>
    request<ApiAccount>(`/api/admin/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAccount: (id: number) =>
    request<void>(`/api/admin/accounts/${id}`, { method: 'DELETE' }),
  updateAccountShippers: (id: number, shipper_codes: string[] | null) =>
    request<void>(`/api/admin/accounts/${id}/partner-edit`, { method: 'PUT', body: JSON.stringify({ shipper_codes }) }),
  updateAccountShops: (id: number, shop_codes: string[] | null) =>
    request<void>(`/api/admin/accounts/${id}/partner-edit`, { method: 'PUT', body: JSON.stringify({ shop_codes }) }),

  // Shippers / Shops / Warehouses
  getShippers: (params: { account_id: number; active_only?: boolean }) =>
    request<Shipper[]>(`/api/admin/shippers?account_id=${params.account_id}&active_only=${params.active_only ?? true}`),
  syncShippers: (account_id: number) =>
    request<{ count: number }>('/api/admin/shippers/sync', { method: 'POST', body: JSON.stringify({ account_id }) }),
  getShops: (params: { account_id: number; active_only?: boolean }) =>
    request<Shop[]>(`/api/admin/shops?account_id=${params.account_id}&active_only=${params.active_only ?? true}`),
  syncShops: (account_id: number) =>
    request<{ count: number }>('/api/admin/shops/sync', { method: 'POST', body: JSON.stringify({ account_id }) }),
  getWarehouses: (account_id: number) =>
    request<Warehouse[]>(`/api/admin/warehouses?account_id=${account_id}`),

  // Account Sender
  getAccountSender: (account_id: number) =>
    request<AccountSender>(`/api/admin/account-sender/${account_id}`),
  saveAccountSender: (data: AccountSender) =>
    request<AccountSender>('/api/admin/account-sender', { method: 'POST', body: JSON.stringify(data) }),
  updateAccountSender: (account_id: number, data: AccountSender) =>
    request<AccountSender>(`/api/admin/account-sender/${account_id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Machines (read)
  getMachines: () => request<Machine[]>('/api/admin/machines'),
  getMachineLastUsed: () =>
    request<Record<number, string>>('/api/admin/machines/last-used'),

  // Machines (write)
  createMachine: (data: Partial<Machine>) =>
    request<Machine>('/api/admin/machines', { method: 'POST', body: JSON.stringify(data) }),
  updateMachine: (id: number, data: Partial<Machine>) =>
    request<Machine>(`/api/admin/machines/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateMachineRole: (id: number, role: string) =>
    request<void>(`/api/admin/machines/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),

  // Logs
  getAPICallLogs: (params: Record<string, string | number>) =>
    request<LogPage<APICallLog>>(`/api/admin/logs/api-calls?${new URLSearchParams(params as Record<string, string>)}`),
  getSystemLogs: (params: Record<string, string | number>) =>
    request<LogPage<SystemLog>>(`/api/admin/logs/system?${new URLSearchParams(params as Record<string, string>)}`),
  getUnifiedLogs: (params: Record<string, string | number>) =>
    request<LogPage<UnifiedLog>>(`/api/admin/logs?${new URLSearchParams(params as Record<string, string>)}`),
  getAPICallLogDetail: (id: number) =>
    request<{ request: string | null; response: string | null }>(`/api/admin/logs/api-calls/${id}/detail`),

  getWorkStats: (params: Record<string, string | number>) =>
    request<WorkStatResult>(`/api/admin/stats/work?${new URLSearchParams(params as Record<string, string>)}`),

  // Order History (작업내역조회) — 백엔드는 admin JWT로 보호되는 아래 경로를 제공해야 함
  getOrderHistory: (params: Record<string, string | number>) =>
    request<OrderHistoryResponse>(`/api/admin/orders/history?${new URLSearchParams(params as Record<string, string>)}`),
  // 단건 삭제(영구) — 백엔드에서 아카이브로 이관 처리
  deleteOrder: (id: number) =>
    request<void>(`/api/admin/orders/${id}`, { method: 'DELETE' }),
}
