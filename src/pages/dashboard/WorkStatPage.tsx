import { useEffect, useState } from 'react'
import { Button, DatePicker, Radio, Select, Table, message } from 'antd'
import type { TableColumnsType } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { api, type Partner, type ApiAccount, type Machine, type WorkStatCell, type WorkStatResult } from '../../lib/api'
import styles from './WorkStatPage.module.css'

const COL_OPTS = [
  { value: 'machine', label: '포장기' },
  { value: 'account', label: 'API계정' },
  { value: 'wbs', label: 'WBS' },
  { value: 'partner', label: '거래처' },
]

function Cell({ cell, bold }: { cell: WorkStatCell | undefined; bold?: boolean }) {
  if (!cell || cell.total === 0) return <span style={{ color: '#D1D5DB' }}>-</span>
  const content = (
    <span style={{ fontFamily: 'monospace', fontSize: 12, whiteSpace: 'nowrap' }}>
      {cell.total.toLocaleString()}
      <span style={{ color: '#9CA3AF', marginLeft: 4 }}>
        ({cell.single.toLocaleString()}/{cell.multi.toLocaleString()})
      </span>
    </span>
  )
  return bold ? <b>{content}</b> : content
}

export default function WorkStatPage() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [accounts, setAccounts] = useState<ApiAccount[]>([])
  const [machines, setMachines] = useState<Machine[]>([])

  const [filterPartner, setFilterPartner] = useState<number | undefined>()
  const [filterAccount, setFilterAccount] = useState<number | undefined>()
  const [filterMachine, setFilterMachine] = useState<number | undefined>()
  const [granularity, setGranularity] = useState<'monthly' | 'daily'>('monthly')
  const [colDim, setColDim] = useState('machine')
  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs().startOf('year'), dayjs()])

  const [result, setResult] = useState<WorkStatResult | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    Promise.all([api.getPartners(), api.getAccounts(), api.getMachines()])
      .then(([p, a, m]) => { setPartners(p); setAccounts(a); setMachines(m) })
      .catch(() => message.error('필터 데이터 로딩에 실패했습니다.'))
  }, [])

  const filteredAccounts = filterPartner ? accounts.filter(a => a.partner_id === filterPartner) : accounts
  const filteredMachines = filterPartner ? machines.filter(m => m.partner_id === filterPartner) : machines

  async function handleSearch() {
    setLoading(true)
    try {
      const fmt = granularity === 'monthly' ? 'YYYYMM' : 'YYYYMMDD'
      const params: Record<string, string | number> = {
        granularity,
        col: colDim,
        from: range[0].format(fmt),
        to: range[1].format(fmt),
      }
      if (filterPartner) params.partner_id = filterPartner
      if (filterAccount) params.account_id = filterAccount
      if (filterMachine) params.machine_id = filterMachine
      setResult(await api.getWorkStats(params))
    } catch {
      message.error('통계 조회에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // Build matrix dataSource + totals
  const tableData: Record<string, any>[] = []
  const colTotals: Record<string, WorkStatCell> = {}
  const grandTotal: WorkStatCell = { single: 0, multi: 0, total: 0 }

  if (result) {
    for (const period of result.periods) {
      const row: Record<string, any> = { key: period, period }
      let rs = 0, rm = 0, rt = 0
      for (const col of result.cols) {
        const cell = result.cells[period + ':' + col.key]
        row[col.key] = cell
        if (cell) {
          rs += cell.single; rm += cell.multi; rt += cell.total
          if (!colTotals[col.key]) colTotals[col.key] = { single: 0, multi: 0, total: 0 }
          colTotals[col.key].single += cell.single
          colTotals[col.key].multi += cell.multi
          colTotals[col.key].total += cell.total
        }
      }
      row.__rowTotal = { single: rs, multi: rm, total: rt }
      grandTotal.single += rs; grandTotal.multi += rm; grandTotal.total += rt
      tableData.push(row)
    }
    const totalRow: Record<string, any> = { key: '__total__', period: '합계', __isTotal: true }
    for (const col of result.cols) totalRow[col.key] = colTotals[col.key]
    totalRow.__rowTotal = grandTotal
    tableData.push(totalRow)
  }

  const periodLabel = granularity === 'monthly' ? '월' : '일자'

  const columns: TableColumnsType<any> = [
    {
      title: periodLabel,
      dataIndex: 'period',
      fixed: 'left',
      width: granularity === 'monthly' ? 90 : 110,
      render: (v, r) => r.__isTotal
        ? <b style={{ color: '#1D3A8A' }}>{v}</b>
        : <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span>,
    },
    ...(result?.cols ?? []).map(col => ({
      title: col.name || '-',
      dataIndex: col.key,
      align: 'right' as const,
      width: 160,
      render: (cell: WorkStatCell | undefined, r: any) =>
        <Cell cell={cell} bold={r.__isTotal} />,
    })),
    {
      title: '합계',
      dataIndex: '__rowTotal',
      fixed: 'right',
      align: 'right' as const,
      width: 160,
      render: (cell: WorkStatCell | undefined) =>
        <Cell cell={cell} bold />,
    },
  ]

  const scrollX = (granularity === 'monthly' ? 90 : 110) + (result?.cols?.length ?? 0) * 160 + 160

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.title}>작업 현황</p>
          <p className={styles.desc}>포장기별 단포·합포 처리 수량을 매트릭스로 조회합니다. (배송처리 기준)</p>
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

        <div className={styles.divider} />

        <span style={{ fontSize: 13, color: '#6B7280', whiteSpace: 'nowrap' }}>열(가로)</span>
        <Select
          value={colDim} onChange={v => { setColDim(v); setResult(null) }}
          style={{ width: 110 }}
          options={COL_OPTS}
        />

        <div className={styles.divider} />

        <Radio.Group
          value={granularity}
          onChange={e => {
            const g = e.target.value as 'monthly' | 'daily'
            setGranularity(g)
            setRange(g === 'monthly'
              ? [dayjs().startOf('year'), dayjs()]
              : [dayjs().startOf('month'), dayjs()])
            setResult(null)
          }}
          optionType="button" buttonStyle="solid" size="middle"
        >
          <Radio.Button value="monthly">월별</Radio.Button>
          <Radio.Button value="daily">일별</Radio.Button>
        </Radio.Group>

        {granularity === 'monthly' ? (
          <DatePicker.RangePicker
            picker="month"
            format="YYYY-MM"
            value={range}
            onChange={v => v && setRange([v[0]!, v[1]!])}
            style={{ width: 230 }}
            allowClear={false}
          />
        ) : (
          <DatePicker.RangePicker
            picker="date"
            format="YYYY-MM-DD"
            value={range}
            onChange={v => v && setRange([v[0]!, v[1]!])}
            style={{ width: 270 }}
            allowClear={false}
          />
        )}

        <Button type="primary" onClick={handleSearch} loading={loading}>조회</Button>
      </div>

      {result ? (
        <div className={styles.tableWrap}>
          <div className={styles.legend}>
            총합 <span style={{ color: '#9CA3AF' }}>(단포/합포)</span>
          </div>
          <Table
            rowKey="key"
            size="small"
            loading={loading}
            columns={columns}
            dataSource={tableData}
            scroll={{ x: scrollX }}
            pagination={false}
            rowClassName={r => r.__isTotal ? styles.totalRow : ''}
          />
        </div>
      ) : (
        !loading && (
          <div className={styles.empty}>조건을 선택하고 조회 버튼을 눌러주세요.</div>
        )
      )}
    </div>
  )
}
