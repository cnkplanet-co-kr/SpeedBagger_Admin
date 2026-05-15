import { useState, useEffect } from 'react'
import {
  Table, Button, Input, Tag, Space, Modal, Form,
  Switch, Popconfirm, message, Tooltip
} from 'antd'
import type { TableColumnsType } from 'antd'
import { PlusOutlined, ReloadOutlined, SearchOutlined, ApiOutlined, ToolOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import type { Partner } from '../../lib/api'
import styles from './PartnersPage.module.css'

export default function PartnersPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<Partner[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  async function load() {
    setLoading(true)
    try {
      setData(await api.getPartners())
    } catch {
      message.error('거래처 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = data.filter(p => {
    const matchSearch = p.partner_name.toLowerCase().includes(search.toLowerCase())
    const matchFilter =
      filter === 'all' ? true :
      filter === 'active' ? p.is_active === 'Y' :
      p.is_active !== 'Y'
    return matchSearch && matchFilter
  })

  function openAdd() {
    setEditingPartner(null)
    form.resetFields()
    form.setFieldsValue({ is_active: true })
    setModalOpen(true)
  }

  function openEdit(partner: Partner) {
    setEditingPartner(partner)
    form.setFieldsValue({ partner_name: partner.partner_name, is_active: partner.is_active === 'Y' })
    setModalOpen(true)
  }

  async function handleDelete(id: number) {
    try {
      await api.deletePartner(id)
      message.success('삭제되었습니다.')
      load()
    } catch (e: any) {
      message.error(e?.error ?? '삭제에 실패했습니다.')
    }
  }

  async function handleSubmit() {
    const values = await form.validateFields()
    const payload = { partner_name: values.partner_name, is_active: values.is_active ? 'Y' : 'N' }
    setSaving(true)
    try {
      if (editingPartner) {
        await api.updatePartner(editingPartner.partner_id, payload)
      } else {
        await api.createPartner(payload)
      }
      message.success('저장되었습니다.')
      setModalOpen(false)
      load()
    } catch {
      message.error('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const activeCount = data.filter(p => p.is_active === 'Y').length
  const inactiveCount = data.filter(p => p.is_active !== 'Y').length

  const filterTabs = [
    { key: 'all', label: `전체 (${data.length})` },
    { key: 'active', label: `사용 (${activeCount})` },
    { key: 'inactive', label: `중지 (${inactiveCount})` },
  ] as const

  const columns: TableColumnsType<Partner> = [
    {
      title: '',
      key: 'index',
      width: 50,
      render: (_, __, index) => (
        <span style={{ color: '#9CA3AF', fontSize: 12 }}>{index + 1}</span>
      ),
    },
    {
      title: '거래처',
      key: 'name',
      render: (_, record) => (
        <div>
          <div className={styles.cpName}>{record.partner_name}</div>
          <div className={styles.cpId}>partner_id: {record.partner_id}</div>
        </div>
      ),
    },
    {
      title: '상태',
      key: 'active',
      width: 100,
      render: (_, record) =>
        record.is_active === 'Y'
          ? <Tag color="success" style={{ borderRadius: 99, fontWeight: 600 }}>사용</Tag>
          : <Tag color="error" style={{ borderRadius: 99, fontWeight: 600 }}>중지</Tag>,
    },
    {
      title: 'ID',
      key: 'id',
      width: 80,
      render: (_, record) => <span style={{ color: '#9CA3AF', fontSize: 13 }}>#{String(record.partner_id).padStart(3, '0')}</span>,
    },
    {
      title: '관리',
      key: 'actions',
      width: 130,
      render: (_, record) => (
        <Space size={6}>
          <Button size="small" onClick={() => openEdit(record)}>수정</Button>
          <Popconfirm
            title="거래처를 삭제하시겠습니까?"
            onConfirm={() => handleDelete(record.partner_id)}
            okText="삭제"
            cancelText="취소"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger>삭제</Button>
          </Popconfirm>
        </Space>
      ),
    },
    {
      title: '연결',
      key: 'links',
      width: 160,
      render: (_, record) => (
        <Space size={6}>
          <Tooltip title="API 계정으로 이동">
            <Button
              size="small"
              icon={<ApiOutlined />}
              onClick={() => navigate('/api-accounts', { state: { partnerId: record.partner_id } })}
            >
              API 계정
            </Button>
          </Tooltip>
          <Tooltip title="포장기 설정으로 이동">
            <Button
              size="small"
              icon={<ToolOutlined />}
              onClick={() => navigate('/machines', { state: { partnerId: record.partner_id } })}
            >
              포장기
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>거래처 관리</h1>
      </div>
      <p className={styles.desc}>파트너 거래처 정보를 등록하고 상태를 관리합니다.</p>

      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <Input
            prefix={<SearchOutlined style={{ color: '#9CA3AF' }} />}
            placeholder="거래처명 검색..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 260 }}
          />
          <div className={styles.filterTabs}>
            {filterTabs.map(tab => (
              <button
                key={tab.key}
                className={`${styles.ft} ${filter === tab.key ? styles.ftOn : ''}`}
                onClick={() => setFilter(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>새로고침</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>거래처 추가</Button>
        </Space>
      </div>

      <div className={styles.tableWrap}>
        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="partner_id"
          loading={loading}
          pagination={{
            size: 'small',
            showTotal: (total, range) => `${total}개 중 ${range[0]}-${range[1]} 표시`,
            pageSize: 10,
          }}
        />
      </div>

      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={saving}
        title={
          <div className={styles.modalTitle}>
            <span className={styles.modalIcon}>🏢</span>
            <div>
              <div>{editingPartner ? '거래처 수정' : '거래처 추가'}</div>
              <div className={styles.modalSub}>
                {editingPartner ? '거래처 정보를 수정합니다' : '새로운 거래처를 시스템에 등록합니다'}
              </div>
            </div>
          </div>
        }
        okText={editingPartner ? '수정 완료' : '거래처 등록'}
        cancelText="취소"
        width={460}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            label="거래처명"
            name="partner_name"
            rules={[{ required: true, message: '거래처명을 입력해주세요' }]}
          >
            <Input placeholder="예: 해피프린스" />
          </Form.Item>
          <Form.Item label="사용여부" name="is_active">
            <div className={styles.toggleRow}>
              <div>
                <div className={styles.toggleTitle}>사용 활성화</div>
                <div className={styles.toggleDesc}>비활성화 시 해당 거래처의 모든 기능이 중지됩니다.</div>
              </div>
              <Form.Item name="is_active" valuePropName="checked" noStyle>
                <Switch />
              </Form.Item>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
