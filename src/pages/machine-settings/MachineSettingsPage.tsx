import { useState, useEffect, useRef } from 'react'
import {
  Table, Button, Modal, Form, Input, Select, Switch, Space, Tag,
  Alert, Row, Col, Checkbox, Radio, InputNumber, Tabs, Tooltip, message
} from 'antd'
import type { TableColumnsType } from 'antd'
import { PlusOutlined, ReloadOutlined, TeamOutlined } from '@ant-design/icons'
import { useLocation } from 'react-router-dom'
import { api } from '../../lib/api'
import type { Machine, Partner, ApiAccount, Shipper } from '../../lib/api'
import styles from './MachineSettingsPage.module.css'

export default function MachineSettingsPage() {
  const location = useLocation()
  const appliedState = useRef(false)
  const [machines, setMachines] = useState<Machine[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [accounts, setAccounts] = useState<ApiAccount[]>([])
  const [selectedPartnerId, setSelectedPartnerId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Machine | null>(null)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('1')
  const [form] = Form.useForm()

  const partnerIdInForm = Form.useWatch('partner_id', form)

  // 화주 모달
  const [mShipperOpen, setMShipperOpen] = useState(false)
  const [mShipperMachine, setMShipperMachine] = useState<Machine | null>(null)
  const [mShippers, setMShippers] = useState<Shipper[]>([])
  const [mShipperSelected, setMShipperSelected] = useState<string[]>([])
  const [mShipperSaving, setMShipperSaving] = useState(false)

  async function loadAll() {
    setLoading(true)
    try {
      const [m, p, a] = await Promise.all([api.getMachines(), api.getPartners(), api.getAccounts()])
      setMachines(m)
      setPartners(p)
      setAccounts(a)
    } catch {
      message.error('데이터를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [])

  useEffect(() => {
    if (!appliedState.current && location.state?.partnerId) {
      setSelectedPartnerId(location.state.partnerId)
      appliedState.current = true
    }
  }, [location.state])

  const filteredMachines = machines.filter(m => m.partner_id === selectedPartnerId)
  const filteredAccounts = accounts.filter(a => a.partner_id === partnerIdInForm)

  function openAdd() {
    if (!selectedPartnerId) return
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({
      partner_id: selectedPartnerId,
      is_active: 'Y',
      use_inspection: 'Y',
      printer_orientation: '2',
      printer_width: 100,
      printer_height: 125,
      printer_dpi: 96,
    })
    setActiveTab('1')
    setModalOpen(true)
  }

  function openEdit(r: Machine) {
    setEditing(r)
    form.resetFields()
    form.setFieldsValue(r)
    setActiveTab('1')
    setModalOpen(true)
  }

  async function handleSubmit() {
    await form.validateFields()
    const values = form.getFieldsValue(true)
    const payload = {
      ...values,
      is_active: values.is_active === 'Y' || values.is_active === true ? 'Y' : 'N',
      use_inspection: values.use_inspection === 'Y' || values.use_inspection === true ? 'Y' : 'N',
      partner_id: Number(values.partner_id),
      account_id: values.account_id ? Number(values.account_id) : 0,
    }
    setSaving(true)
    try {
      if (editing) {
        await api.updateMachine(editing.machine_id, payload)
      } else {
        await api.createMachine(payload)
      }
      message.success('저장되었습니다.')
      setModalOpen(false)
      loadAll()
    } catch {
      message.error('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  async function handleRoleToggle(machine: Machine, checked: boolean) {
    try {
      await api.updateMachineRole(machine.machine_id, checked ? '+' : '')
      setMachines(prev => prev.map(m => m.machine_id === machine.machine_id ? { ...m, role: checked ? '+' : '' } : m))
      message.success('관리자 권한이 변경되었습니다.')
    } catch {
      message.error('변경에 실패했습니다.')
    }
  }

  // ── 화주 모달 ──────────────────────────────────────────────────
  async function openShipperModal(machine: Machine) {
    setMShipperMachine(machine)
    setMShippers([])
    setMShipperSelected(machine.shipper_codes ?? [])
    setMShipperOpen(true)
    if (!machine.account_id) return
    try {
      const account = accounts.find(a => a.account_id === machine.account_id)
      const allShippers = await api.getShippers({ account_id: machine.account_id })
      const filtered = (account?.shipper_codes?.length)
        ? allShippers.filter(s => account.shipper_codes!.includes(s.shipper_code))
        : allShippers
      setMShippers(filtered)
    } catch {
      message.error('화주 목록을 불러오는데 실패했습니다.')
    }
  }

  async function handleShipperSave() {
    if (!mShipperMachine) return
    setMShipperSaving(true)
    try {
      const codes = mShipperSelected.length ? mShipperSelected : null
      await api.updateMachine(mShipperMachine.machine_id, { ...mShipperMachine, shipper_codes: codes })
      message.success('화주 설정이 저장되었습니다.')
      setMShipperOpen(false)
      loadAll()
    } catch {
      message.error('저장에 실패했습니다.')
    } finally {
      setMShipperSaving(false)
    }
  }

  const columns: TableColumnsType<Machine> = [
    { title: '장비명', dataIndex: 'machine_name', width: 180, render: v => <span style={{ fontWeight: 600 }}>{v}</span> },
    { title: 'UUID', dataIndex: 'machine_uuid', ellipsis: true },
    { title: '메인 프린터', dataIndex: 'printer_main' },
    {
      title: '상태', dataIndex: 'is_active', width: 80,
      render: v => v === 'Y'
        ? <Tag color="success" style={{ borderRadius: 99 }}>사용</Tag>
        : <Tag color="error" style={{ borderRadius: 99 }}>중지</Tag>,
    },
    {
      title: '관리자', dataIndex: 'role', width: 120,
      render: (role, r) => role === '*'
        ? <Tag color="purple">admin</Tag>
        : <Space size={6}>
            <Checkbox checked={role === '+'} onChange={e => handleRoleToggle(r, e.target.checked)} />
            {role === '+' ? <Tag color="blue">관리자</Tag> : <Tag color="default">포장기</Tag>}
          </Space>,
    },
    {
      title: '관리', key: 'action', width: 180,
      render: (_, r) => {
        const account = accounts.find(a => a.account_id === r.account_id)
        const isWMS = account?.account_type?.trim() === 'WMS'
        return (
          <Space size={4} wrap>
            <Button size="small" onClick={() => openEdit(r)}>수정</Button>
            {isWMS && (
              <Tooltip title="화주 설정">
                <Button size="small" icon={<TeamOutlined />} onClick={() => openShipperModal(r)}>
                  화주{(() => {
                    if ((r.shipper_codes?.length ?? 0) > 0) {
                      return <Tag color="blue" style={{ marginLeft: 4, lineHeight: '14px' }}>{r.shipper_codes!.length}</Tag>
                    }
                    if ((account?.shipper_codes?.length ?? 0) > 0) {
                      return <Tag color="default" style={{ marginLeft: 4, lineHeight: '14px' }}>{account!.shipper_codes!.length}</Tag>
                    }
                    return <Tag color="default" style={{ marginLeft: 4, lineHeight: '14px' }}>전체</Tag>
                  })()}
                </Button>
              </Tooltip>
            )}
          </Space>
        )
      },
    },
  ]

  const tabItems = [
    {
      key: '1', label: '기본 정보',
      children: (
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="machine_name" label="장비 관리명" rules={[{ required: true, message: '장비 관리명을 입력해주세요' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="use_inspection" label="상품검수여부"
              valuePropName="checked"
              getValueProps={v => ({ checked: v === 'Y' })}
              getValueFromEvent={checked => checked ? 'Y' : 'N'}
            >
              <Switch />
            </Form.Item>
            <Form.Item name="is_active" label="사용여부"
              valuePropName="checked"
              getValueProps={v => ({ checked: v === 'Y' })}
              getValueFromEvent={checked => checked ? 'Y' : 'N'}
            >
              <Switch />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="machine_uuid" label="System UUID">
              <Input disabled placeholder="자동 생성됨" />
            </Form.Item>
            <Form.Item name="machine_desc" label="장비 설명">
              <Input.TextArea rows={3} />
            </Form.Item>
          </Col>
        </Row>
      ),
    },
    {
      key: '2', label: 'API/연동',
      children: (
        <>
          <Form.Item name="partner_id" label="소속 거래처" rules={[{ required: true, message: '거래처를 선택해주세요' }]}>
            <Select
              placeholder="거래처 선택"
              options={partners.map(p => ({ value: p.partner_id, label: p.partner_name }))}
              onChange={() => form.setFieldsValue({ account_id: undefined })}
            />
          </Form.Item>
          <Form.Item name="account_id" label="API 계정 연동">
            <Select
              placeholder="API 계정을 선택하세요"
              allowClear
              optionLabelProp="label"
            >
              {filteredAccounts.map(a => (
                <Select.Option key={a.account_id} value={a.account_id} label={a.account_name}>
                  <Space size={6}>
                    <span>{a.account_name}</span>
                    <Tag color={a.account_type?.trim() === 'WMS' ? 'geekblue' : 'cyan'} style={{ marginInlineEnd: 0 }}>
                      {a.account_type?.trim() === 'WMS' ? 'WMS(3PL)' : '화주'}
                    </Tag>
                  </Space>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </>
      ),
    },
    {
      key: '3', label: '하드웨어/프린터 (읽기전용)',
      children: (
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="printer_main" label="메인 프린터">
              <Input disabled />
            </Form.Item>
            <Row gutter={8}>
              <Col span={12}>
                <Form.Item name="printer_orientation" label="방향">
                  <Radio.Group disabled>
                    <Radio value="1">세로</Radio>
                    <Radio value="2">가로</Radio>
                  </Radio.Group>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="printer_dpi" label="DPI">
                  <InputNumber style={{ width: '100%' }} disabled />
                </Form.Item>
              </Col>
            </Row>
          </Col>
          <Col span={12}>
            <Form.Item name="printer_aux" label="보조 프린터">
              <Input disabled />
            </Form.Item>
            <Row gutter={8}>
              <Col span={12}>
                <Form.Item name="printer_width" label="Width(mm)">
                  <InputNumber style={{ width: '100%' }} disabled />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="printer_height" label="Height(mm)">
                  <InputNumber style={{ width: '100%' }} disabled />
                </Form.Item>
              </Col>
            </Row>
          </Col>
          <Col span={24}>
            <Alert
              message="프린터 설정은 각 포장기 PC의 앱에서만 변경할 수 있습니다."
              type="info"
              showIcon
              style={{ marginTop: 8 }}
            />
          </Col>
        </Row>
      ),
    },
  ]

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>포장기 설정</h1>
          <p className={styles.desc}>포장기 기본정보 및 연동 설정을 관리합니다. 프린터 설정은 읽기 전용입니다.</p>
        </div>
        <Button icon={<ReloadOutlined />} onClick={loadAll} loading={loading}>새로고침</Button>
      </div>

      <div className={styles.filterBar}>
        <Space>
          <span style={{ fontWeight: 600 }}>거래처 선택:</span>
          <Select
            style={{ width: 220 }}
            placeholder="거래처를 선택하세요"
            value={selectedPartnerId}
            onChange={setSelectedPartnerId}
            options={partners.map(p => ({ value: p.partner_id, label: p.partner_name }))}
          />
        </Space>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openAdd}
          disabled={!selectedPartnerId}
        >
          장비 추가
        </Button>
      </div>

      <div className={styles.tableWrap}>
        {selectedPartnerId
          ? <Table columns={columns} dataSource={filteredMachines} rowKey="machine_id" loading={loading} pagination={{ size: 'small', pageSize: 20 }} />
          : <Alert message="거래처를 선택하면 포장기 목록이 표시됩니다." type="warning" showIcon style={{ margin: 24 }} />
        }
      </div>

      {/* ── 포장기 추가/수정 모달 ── */}
      <Modal
        title={editing ? '포장기 상세 설정' : '포장기 추가'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={saving}
        width={700}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Tabs activeKey={activeTab} type="card" onChange={setActiveTab} items={tabItems} />
        </Form>
      </Modal>

      {/* ── 화주 모달 ── */}
      <Modal
        title={`화주 설정 — ${mShipperMachine?.machine_name}`}
        open={mShipperOpen}
        onCancel={() => setMShipperOpen(false)}
        onOk={handleShipperSave}
        confirmLoading={mShipperSaving}
        width={560}
        destroyOnClose
      >
        {mShippers.length === 0
          ? <Alert message="연동된 화주사가 없습니다. API 계정의 화주를 먼저 설정해주세요." type="info" showIcon />
          : (
            <Checkbox.Group
              value={mShipperSelected}
              onChange={vals => setMShipperSelected(vals as string[])}
              style={{ width: '100%' }}
            >
              <Row>
                {mShippers.map(s => (
                  <Col span={12} key={s.shipper_code}>
                    <Checkbox value={s.shipper_code}>{s.shipper_name} ({s.shipper_code})</Checkbox>
                  </Col>
                ))}
              </Row>
            </Checkbox.Group>
          )
        }
      </Modal>
    </div>
  )
}
