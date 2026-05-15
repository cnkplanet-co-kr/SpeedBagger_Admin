import { useEffect, useState } from 'react'
import { Table, Tag, Button } from 'antd'
import type { TableColumnsType } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { api } from '../../lib/api'
import type { Partner, Account, Machine, WBS } from '../../lib/api'
import styles from './MachinesPage.module.css'

type RowType = 'partner' | 'machine'

interface TreeRow {
  key: string
  rowType: RowType
  name: string
  isActive: boolean
  lastUsedAt?: string
  machineCount?: number
  children?: TreeRow[]
}

function buildTree(
  partners: Partner[],
  accounts: Account[],
  machines: Machine[],
  wbsFilter: number | null,
  lastUsedMap: Record<number, string>,
): TreeRow[] {
  const allowedAccountIds: Set<number> | null = wbsFilter === null
    ? null
    : new Set(accounts.filter(a => a.wbs_id === wbsFilter).map(a => a.account_id))

  const filteredMachines = (partnerMachines: Machine[]) =>
    allowedAccountIds === null
      ? partnerMachines
      : partnerMachines.filter(m => allowedAccountIds.has(m.account_id))

  return partners
    .map(p => {
      const children = filteredMachines(machines.filter(m => m.partner_id === p.partner_id))
        .map(m => ({
          key: `m-${m.machine_id}`,
          rowType: 'machine' as RowType,
          name: m.machine_name,
          isActive: m.is_active === 'Y',
          lastUsedAt: lastUsedMap[m.machine_id],
          children: undefined,
        }))

      return { p, children }
    })
    .filter(({ children }) => wbsFilter === null || children.length > 0)
    .map(({ p, children }) => {
      const lastUsedAts = children.map(c => c.lastUsedAt).filter(Boolean) as string[]
      const latestUsedAt = lastUsedAts.length > 0 ? lastUsedAts.reduce((a, b) => a > b ? a : b) : undefined
      return {
        key: `p-${p.partner_id}`,
        rowType: 'partner' as RowType,
        name: p.partner_name,
        isActive: p.is_active === 'Y',
        machineCount: children.length,
        lastUsedAt: latestUsedAt,
        children,
      }
    })
}

const ROW_ICON: Record<RowType, string> = {
  partner: '🏢',
  machine: '🖨️',
}

const ROW_COLOR: Record<RowType, string> = {
  partner: '#F0F3FF',
  machine: '#F0FDF4',
}

const ROW_TEXT: Record<RowType, string> = {
  partner: '#1D3A8A',
  machine: '#15803D',
}

const ROW_LABEL: Record<RowType, string> = {
  partner: '거래처',
  machine: '포장기',
}

export default function MachinesPage() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [wbsList, setWbsList] = useState<WBS[]>([])
  const [lastUsedMap, setLastUsedMap] = useState<Record<number, string>>({})
  const [selectedWbs, setSelectedWbs] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const [p, a, m, w, lu] = await Promise.all([
        api.getPartners(),
        api.getAccounts(),
        api.getMachines(),
        api.getWBS(),
        api.getMachineLastUsed(),
      ])
      setPartners(p)
      setAccounts(a)
      setMachines(m)
      setWbsList(w.filter(w => w.is_active === 'Y'))
      setLastUsedMap(lu)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const treeData = buildTree(partners, accounts, machines, selectedWbs, lastUsedMap)

  const columns: TableColumnsType<TreeRow> = [
    {
      title: '이름',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <div className={styles.nameCell}>
          <span
            className={styles.typeIcon}
            style={{ background: ROW_COLOR[record.rowType], color: ROW_TEXT[record.rowType] }}
          >
            {ROW_ICON[record.rowType]}
          </span>
          <span className={styles.nameText} style={{ color: ROW_TEXT[record.rowType] }}>
            {name}
          </span>
          {record.rowType === 'partner' && record.machineCount !== undefined && (
            <span className={styles.machineCount}>{record.machineCount}대</span>
          )}
        </div>
      ),
    },
    {
      title: '유형',
      key: 'rowType',
      width: 110,
      render: (_, record) => (
        <span
          className={styles.typeBadge}
          style={{ background: ROW_COLOR[record.rowType], color: ROW_TEXT[record.rowType] }}
        >
          {ROW_LABEL[record.rowType]}
        </span>
      ),
    },
    {
      title: '상태',
      key: 'isActive',
      width: 80,
      render: (_, record) =>
        record.isActive
          ? <Tag color="success" style={{ borderRadius: 99, fontWeight: 600 }}>사용</Tag>
          : <Tag color="error" style={{ borderRadius: 99, fontWeight: 600 }}>중지</Tag>,
    },
    {
      title: '마지막 사용일시',
      key: 'lastUsedAt',
      width: 160,
      render: (_, record) => (
        <span style={{ color: record.lastUsedAt ? '#374151' : '#9CA3AF', fontSize: 13 }}>
          {record.lastUsedAt ?? '-'}
        </span>
      ),
    },
  ]

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>포장기 현황</h1>
          <p className={styles.desc}>거래처 › 포장기 계층 구조로 표시합니다.</p>
        </div>
        <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
          새로고침
        </Button>
      </div>

      <div className={styles.wbsBar}>
        <span className={styles.wbsLabel}>WBS</span>
        <div className={styles.wbsTags}>
          <button
            className={`${styles.wbsTag} ${selectedWbs === null ? styles.wbsTagOn : ''}`}
            onClick={() => setSelectedWbs(null)}
          >
            전체
          </button>
          {wbsList.map(w => (
            <button
              key={w.wbs_id}
              className={`${styles.wbsTag} ${selectedWbs === w.wbs_id ? styles.wbsTagOn : ''}`}
              onClick={() => setSelectedWbs(prev => prev === w.wbs_id ? null : w.wbs_id)}
            >
              {w.wbs_name}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.tableWrap}>
        <Table
          columns={columns}
          dataSource={treeData}
          loading={loading}
          rowKey="key"
          pagination={false}
          expandable={{ defaultExpandAllRows: true }}
          rowClassName={record => styles[`row_${record.rowType}`]}
        />
      </div>
    </div>
  )
}
