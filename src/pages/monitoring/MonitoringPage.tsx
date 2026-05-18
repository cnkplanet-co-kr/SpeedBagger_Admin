import { useEffect, useRef, useState } from 'react'
import {
  Button, DatePicker, Select, Switch, Table, Tag, Space, Tooltip, Modal, Radio, message,
} from 'antd'
import type { TableColumnsType } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { ReloadOutlined } from '@ant-design/icons'
import { api, type UnifiedLog, type Partner, type ApiAccount, type Machine } from '../../lib/api'
import styles from './MonitoringPage.module.css'

const { RangePicker } = DatePicker
const DATE_FMT = 'YYYY-MM-DD HH:mm'
type RangeVal = [Dayjs | null, Dayjs | null] | null

const levelColor: Record<string, string> = {
  error: 'red', warning: 'orange', info: 'blue',
  debug: 'default', trace: 'purple', panic: 'magenta',
}

const LOG_TYPES = [
  { value: '', label: '전체 유형' },
  { value: 'api', label: 'API 호출' },
  { value: 'system', label: '시스템' },
]

const LEVELS = ['info', 'error', 'warning', 'debug', 'trace', 'panic']

const PRESETS: { label: string; value: [Dayjs, Dayjs] }[] = [
  { label: '최근 1시간', value: [dayjs().subtract(1, 'hour'), dayjs()] },
  { label: '최근 6시간', value: [dayjs().subtract(6, 'hour'), dayjs()] },
  { label: '오늘', value: [dayjs().startOf('day'), dayjs()] },
  { label: '어제', value: [dayjs().subtract(1, 'day').startOf('day'), dayjs().subtract(1, 'day').endOf('day')] },
]

function tryPretty(s?: string | null) {
  if (!s) return null
  try { return JSON.stringify(JSON.parse(s), null, 2) } catch { return s }
}

export default function MonitoringPage() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [accounts, setAccounts] = useState<ApiAccount[]>([])
  const [machines, setMachines] = useState<Machine[]>([])

  const [filterPartner, setFilterPartner] = useState<number | undefined>()
  const [filterAccount, setFilterAccount] = useState<number | undefined>()
  const [filterMachine, setFilterMachine] = useState<number | undefined>()
  const [filterLevel, setFilterLevel] = useState<string | undefined>()
  const [filterLogType, setFilterLogType] = useState<string>('')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')
  const [range, setRange] = useState<RangeVal>([dayjs().subtract(6, 'hour'), dayjs()])
  const [autoRefresh, setAutoRefresh] = useState(false)

  const [logs, setLogs] = useState<UnifiedLog[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [detailLog, setDetailLog] = useState<UnifiedLog | null>(null)
  const [detailContent, setDetailContent] = useState<{ request: string | null; response: string | null } | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    Promise.all([api.getPartners(), api.getAccounts(), api.getMachines()])
      .then(([p, a, m]) => { setPartners(p); setAccounts(a); setMachines(m) })
      .catch(() => message.error('필터 데이터 로딩에 실패했습니다.'))
  }, [])

  function buildParams(pg: number) {
    const p: Record<string, string | number> = { page: pg, limit: 50 }
    if (filterPartner) p.partner_id = filterPartner
    if (filterAccount) p.account_id = filterAccount
    if (filterMachine) p.machine_id = filterMachine
    if (filterLevel)   p.level = filterLevel
    if (filterLogType) p.log_type = filterLogType
    p.sort = sortOrder
    if (range?.[0]) p.from = range[0].format(DATE_FMT)
    if (range?.[1]) p.to   = range[1].format(DATE_FMT)
    return p
  }

  async function fetchLogs(pg = page, autoSlide = false) {
    setLoading(true)
    try {
      let params = buildParams(pg)
      if (autoSlide) {
        const now = dayjs()
        const from = now.subtract(1, 'minute')
        params = { ...params, from: from.format(DATE_FMT), to: now.format(DATE_FMT) }
        setRange([from, now])
      }
      const res = await api.getUnifiedLogs(params)
      setLogs(res.items)
      setTotal(res.total)
    } catch {
      message.error('로그 조회에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  function handleSearch() { setPage(1); fetchLogs(1) }

  useEffect(() => {
    if (autoRefresh) {
      timerRef.current = setInterval(() => fetchLogs(page, true), 60_000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [autoRefresh, page, filterPartner, filterAccount, filterMachine, filterLevel, filterLogType, range])

  const filteredAccounts = filterPartner ? accounts.filter(a => a.partner_id === filterPartner) : accounts
  const filteredMachines = filterPartner ? machines.filter(m => m.partner_id === filterPartner) : machines

  const columns: TableColumnsType<UnifiedLog> = [
    {
      title: '시각', dataIndex: 'created_at', width: 160, fixed: 'left',
      render: v => <span style={{ fontSize: 12, whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{v}</span>,
    },
    {
      title: '유형', dataIndex: 'log_type', width: 80, align: 'center', fixed: 'left',
      render: v => v === 'api'
        ? <Tag color="geekblue" style={{ margin: 0 }}>API</Tag>
        : <Tag color="purple" style={{ margin: 0 }}>시스템</Tag>,
    },
    {
      title: '레벨', dataIndex: 'level', width: 80, align: 'center',
      render: (v, r) => r.log_type === 'api'
        ? (r.error_msg ? <Tag color="red" style={{ margin: 0 }}>오류</Tag> : <Tag color="green" style={{ margin: 0 }}>성공</Tag>)
        : (v ? <Tag color={levelColor[v] ?? 'default'} style={{ margin: 0 }}>{v}</Tag> : null),
    },
    { title: '거래처', dataIndex: 'partner_name', width: 100, render: v => v || '-' },
    { title: 'API계정', dataIndex: 'account_name', width: 120, render: v => v || '-' },
    { title: '포장기', dataIndex: 'machine_name', width: 110, render: v => v || '-' },
    {
      title: '내용', key: 'content', ellipsis: true,
      render: (_, r) => r.log_type === 'api'
        ? <Tooltip title={r.full_url}><span style={{ color: '#374151', fontSize: 12 }}>{r.full_url}</span></Tooltip>
        : <Tooltip title={r.msg}><span style={{ color: '#374151', fontSize: 12 }}>{r.msg}</span></Tooltip>,
    },
    {
      title: '서비스/모듈', key: 'svc', width: 150, ellipsis: true,
      render: (_, r) => r.log_type === 'system'
        ? <span style={{ fontSize: 12, color: '#6B7280' }}>{[r.module, r.service].filter(Boolean).join(' / ')}</span>
        : <span style={{ fontSize: 12, color: '#6B7280' }}>{r.method}</span>,
    },
    {
      title: '상태/응답', key: 'stat', width: 90, align: 'right',
      render: (_, r) => r.log_type === 'system'
        ? <span style={{ fontSize: 12 }}>{r.status ? `${r.status} · ${r.latency}ms` : '-'}</span>
        : null,
    },
  ]

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.title}>로그 모니터링</p>
          <p className={styles.desc}>API 호출 로그와 시스템 로그를 KST 기준으로 통합 조회합니다.</p>
        </div>
      </div>

      <div className={styles.filterBar}>
        <Select
          allowClear placeholder="거래처" style={{ width: 130 }}
          value={filterPartner}
          onChange={v => { setFilterPartner(v); setFilterAccount(undefined); setFilterMachine(undefined) }}
          options={partners.map(p => ({ value: p.partner_id, label: p.partner_name }))}
        />
        <Select
          allowClear placeholder="API계정" style={{ width: 150 }}
          value={filterAccount} onChange={setFilterAccount}
          options={filteredAccounts.map(a => ({ value: a.account_id, label: a.account_name }))}
        />
        <Select
          allowClear placeholder="포장기" style={{ width: 130 }}
          value={filterMachine} onChange={setFilterMachine}
          options={filteredMachines.map(m => ({ value: m.machine_id, label: m.machine_name }))}
        />
        <Select
          allowClear placeholder="레벨" style={{ width: 100 }}
          value={filterLevel} onChange={setFilterLevel}
          options={LEVELS.map(l => ({ value: l, label: <Tag color={levelColor[l] ?? 'default'} style={{ margin: 0 }}>{l}</Tag> }))}
        />
        <Select
          style={{ width: 110 }}
          value={filterLogType} onChange={setFilterLogType}
          options={LOG_TYPES}
        />
        <RangePicker
          showTime={{ format: 'HH:mm' }}
          format={DATE_FMT}
          value={range}
          onChange={v => setRange(v as RangeVal)}
          presets={PRESETS}
          style={{ width: 370 }}
        />
        <Radio.Group
          value={sortOrder}
          onChange={e => setSortOrder(e.target.value)}
          optionType="button"
          buttonStyle="solid"
          size="middle"
        >
          <Radio.Button value="desc">최신순</Radio.Button>
          <Radio.Button value="asc">오래된순</Radio.Button>
        </Radio.Group>
        <Button type="primary" onClick={handleSearch}>조회</Button>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <ReloadOutlined spin={loading} style={{ color: autoRefresh ? '#1D3A8A' : '#9CA3AF' }} />
          <span style={{ fontSize: 13, color: '#6B7280' }}>자동새로고침 (1분)</span>
          <Switch size="small" checked={autoRefresh} onChange={setAutoRefresh} />
        </div>
      </div>

      <div className={styles.tableWrap}>
        <Table<UnifiedLog>
          rowKey={r => `${r.log_type}-${r.log_id}`}
          size="small"
          loading={loading}
          columns={columns}
          dataSource={logs}
          scroll={{ x: 1200 }}
          rowClassName={r => r.log_type === 'api' && r.error_msg ? styles.rowError : ''}
          pagination={{
            current: page,
            pageSize: 50,
            total,
            showTotal: t => `총 ${t.toLocaleString()}건`,
            onChange: p => { setPage(p); fetchLogs(p) },
          }}
          expandable={{
            expandedRowRender: r => (
              <div className={styles.expandBox}>
                {r.log_type === 'api' ? (
                  <>
                    <div><b>URL</b>: {r.full_url}</div>
                    {r.error_msg && <div style={{ color: '#DC2626', marginTop: 4 }}><b>오류</b>: {r.error_msg}</div>}
                    <div style={{ marginTop: 8 }}>
                      <Tag
                        color="blue"
                        style={{ cursor: 'pointer', fontSize: 11 }}
                        onClick={async () => {
                          setDetailLog(r)
                          setDetailContent(null)
                          setDetailModalOpen(true)
                          setDetailLoading(true)
                          try {
                            const res = await api.getAPICallLogDetail(r.log_id)
                            setDetailContent(res)
                          } finally {
                            setDetailLoading(false)
                          }
                        }}
                      >요청/응답 보기</Tag>
                    </div>
                  </>
                ) : (
                  <>
                    <div><b>메시지</b>: {r.msg}</div>
                    <Space size={16} style={{ marginTop: 4 }}>
                      {r.uri    && <span><b>URI</b>: {r.uri}</span>}
                      {r.method && <span><b>Method</b>: {r.method}</span>}
                      {r.module && <span><b>Module</b>: {r.module}</span>}
                      {r.service && <span><b>Service</b>: {r.service}</span>}
                    </Space>
                  </>
                )}
              </div>
            ),
          }}
        />
      </div>

      <Modal
        title={detailLog?.full_url ? `요청/응답 — ${detailLog.full_url}` : '요청/응답 상세'}
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={<Button onClick={() => setDetailModalOpen(false)}>닫기</Button>}
        width={860}
        destroyOnClose
      >
        {detailLoading
          ? <div style={{ textAlign: 'center', padding: 32, color: '#9CA3AF' }}>불러오는 중...</div>
          : <>
              {detailContent?.request && (
                <div style={{ marginBottom: 12 }}>
                  <b>Request</b>
                  <pre style={{
                    whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: 12,
                    background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 6,
                    padding: 12, maxHeight: '35vh', overflowY: 'auto', margin: '6px 0 0',
                  }}>
                    {tryPretty(detailContent.request)}
                  </pre>
                </div>
              )}
              <div>
                <b>Response</b>
                <pre style={{
                  whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: 12,
                  background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 6,
                  padding: 12, maxHeight: '50vh', overflowY: 'auto', margin: '6px 0 0',
                }}>
                  {tryPretty(detailContent?.response) ?? '(내용 없음)'}
                </pre>
              </div>
            </>
        }
      </Modal>
    </div>
  )
}
