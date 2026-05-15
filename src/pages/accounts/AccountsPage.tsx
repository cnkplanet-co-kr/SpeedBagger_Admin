import { useState, useEffect, useRef } from 'react'
import {
  Table, Button, Modal, Form, Input, Select, Switch, Space, Tag,
  Alert, Row, Col, Checkbox, Radio, message, Popconfirm, Tooltip,
} from 'antd'
import type { TableColumnsType } from 'antd'
import { PlusOutlined, ReloadOutlined, SyncOutlined, TeamOutlined, ShopOutlined, EnvironmentOutlined } from '@ant-design/icons'
import { useLocation } from 'react-router-dom'
import { api } from '../../lib/api'
import type { ApiAccount, Partner, WBS, Shipper, Shop } from '../../lib/api'
import styles from './AccountsPage.module.css'

const { TextArea } = Input

export default function AccountsPage() {
  const location = useLocation()
  const appliedState = useRef(false)
  const [accounts, setAccounts] = useState<ApiAccount[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [wbsList, setWbsList] = useState<WBS[]>([])
  const [selectedPartnerId, setSelectedPartnerId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  // 수정 모달
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ApiAccount | null>(null)
  const [saving, setSaving] = useState(false)
  const [fetchedWarehouses, setFetchedWarehouses] = useState<{ id: number; name: string }[]>([])
  const [editShippers, setEditShippers] = useState<Shipper[]>([])
  const [editShops, setEditShops] = useState<Shop[]>([])
  const [form] = Form.useForm()

  // 화주 모달 (테이블 버튼)
  const [shipperModalOpen, setShipperModalOpen] = useState(false)
  const [shipperAccount, setShipperAccount] = useState<ApiAccount | null>(null)
  const [shippers, setShippers] = useState<Shipper[]>([])
  const [shipperSaving, setShipperSaving] = useState(false)
  const [shipperForm] = Form.useForm()

  // 판매사 모달 (테이블 버튼)
  const [shopModalOpen, setShopModalOpen] = useState(false)
  const [shopAccount, setShopAccount] = useState<ApiAccount | null>(null)
  const [shops, setShops] = useState<Shop[]>([])
  const [shopSaving, setShopSaving] = useState(false)
  const [shopForm] = Form.useForm()

  // 주소 모달 (테이블 버튼 + 수정모달 내부 버튼)
  const [addressModalOpen, setAddressModalOpen] = useState(false)
  const [addressAccount, setAddressAccount] = useState<ApiAccount | null>(null)
  const [hasSenderAddress, setHasSenderAddress] = useState(false)
  const [addressForm] = Form.useForm()

  const wbsId = Form.useWatch('wbs_id', form)
  const printType = Form.useWatch('print_type', form)
  const accountType = Form.useWatch('account_type', form)
  const authType = Form.useWatch('auth_type', form)
  const selectedWbs = wbsList.find(w => w.wbs_id === wbsId)
  const isSellmate = selectedWbs?.wbs_type === 'sellmate'
  const isEzadmin = selectedWbs?.wbs_type === 'ezadmin'
  const showReqBody = printType === 'CJ' || printType === 'PO'

  async function loadBasic() {
    const [p, w] = await Promise.all([api.getPartners(), api.getWBS()])
    setPartners(p)
    setWbsList(w)
  }

  async function loadAccounts() {
    setLoading(true)
    try { setAccounts(await api.getAccounts()) }
    catch { message.error('계정 목록을 불러오는데 실패했습니다.') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    loadBasic()
    loadAccounts()
  }, [])

  useEffect(() => {
    if (!appliedState.current && location.state?.partnerId) {
      setSelectedPartnerId(location.state.partnerId)
      appliedState.current = true
    }
  }, [location.state])

  const filteredAccounts = accounts.filter(a => a.partner_id === selectedPartnerId)

  // ── 계정 추가/수정 ──────────────────────────────────────────
  function openAdd() {
    if (!selectedPartnerId) { message.warning('거래처를 먼저 선택해주세요.'); return }
    setEditing(null)
    setFetchedWarehouses([])
    setEditShippers([])
    setEditShops([])
    form.resetFields()
    form.setFieldsValue({ partner_id: selectedPartnerId, is_active: 'Y', account_type: 'ONE', delv_type: '0', print_type: '', auth_type: 'query' })
    setModalOpen(true)
  }

  async function openEdit(r: ApiAccount) {
    setEditing(r)
    setFetchedWarehouses([])
    setEditShippers([])
    setEditShops([])
    form.resetFields()
    form.setFieldsValue({
      ...r,
      print_type_req_body: r.print_type_req_body
        ? (typeof r.print_type_req_body === 'object' ? JSON.stringify(r.print_type_req_body, null, 2) : r.print_type_req_body)
        : '',
    })
    setModalOpen(true)
    const wbs = wbsList.find(w => w.wbs_id === r.wbs_id)
    if (wbs?.wbs_type === 'sellmate') {
      try { setFetchedWarehouses(await api.getWarehouses(r.account_id)) } catch { /* ignore */ }
    }
  }

  async function handleDelete(id: number) {
    try { await api.deleteAccount(id); message.success('삭제되었습니다.'); loadAccounts() }
    catch { message.error('삭제에 실패했습니다.') }
  }

  async function handleSubmit() {
    const values = await form.validateFields()
    values.partner_id = Number(values.partner_id)
    if (values.print_type_req_body) {
      try { values.print_type_req_body = JSON.parse(values.print_type_req_body) }
      catch { message.error('출력유형 요청 Body가 올바른 JSON 형식이 아닙니다.'); return }
    }
    setSaving(true)
    try {
      editing ? await api.updateAccount(editing.account_id, values) : await api.createAccount(values)
      message.success('저장되었습니다.')
      setModalOpen(false)
      loadAccounts()
    } catch { message.error('저장에 실패했습니다.') }
    finally { setSaving(false) }
  }

  // ── 화주 모달 ────────────────────────────────────────────────
  async function openShipperModal(r: ApiAccount) {
    setShipperAccount(r)
    setShippers([])
    shipperForm.resetFields()
    shipperForm.setFieldsValue({ shipper_codes: r.shipper_codes ?? [] })
    setShipperModalOpen(true)
    try {
      const data = await api.getShippers({ account_id: r.account_id })
      setShippers(data)
    } catch { message.error('화주 목록을 불러오는데 실패했습니다.') }
  }

  async function handleShipperSave() {
    if (!shipperAccount) return
    const values = shipperForm.getFieldsValue()
    const codes = values.shipper_codes?.length ? values.shipper_codes : null
    setShipperSaving(true)
    try {
      await api.updateAccountShippers(shipperAccount.account_id, codes)
      message.success('화주 설정이 저장되었습니다.')
      setShipperModalOpen(false)
      loadAccounts()
    } catch { message.error('저장에 실패했습니다.') }
    finally { setShipperSaving(false) }
  }

  // ── 판매사 모달 ──────────────────────────────────────────────
  async function openShopModal(r: ApiAccount) {
    setShopAccount(r)
    setShops([])
    shopForm.resetFields()
    shopForm.setFieldsValue({ shop_codes: r.shop_codes ?? [] })
    setShopModalOpen(true)
    try {
      const data = await api.getShops({ account_id: r.account_id })
      setShops(data)
    } catch { message.error('판매사 목록을 불러오는데 실패했습니다.') }
  }

  async function handleShopSave() {
    if (!shopAccount) return
    const values = shopForm.getFieldsValue()
    const codes = values.shop_codes?.length ? values.shop_codes : null
    setShopSaving(true)
    try {
      await api.updateAccountShops(shopAccount.account_id, codes)
      message.success('판매사 설정이 저장되었습니다.')
      setShopModalOpen(false)
      loadAccounts()
    } catch { message.error('저장에 실패했습니다.') }
    finally { setShopSaving(false) }
  }

  // ── 주소 모달 ────────────────────────────────────────────────
  async function openAddressModal(r: ApiAccount) {
    setAddressAccount(r)
    setHasSenderAddress(false)
    addressForm.resetFields()
    setAddressModalOpen(true)
    try {
      const sender = await api.getAccountSender(r.account_id)
      addressForm.setFieldsValue(sender)
      setHasSenderAddress(true)
    } catch { /* 아직 없음 */ }
  }

  async function handleAddressSave() {
    if (!addressAccount) return
    const values = addressForm.getFieldsValue()
    try {
      if (hasSenderAddress) {
        await api.updateAccountSender(addressAccount.account_id, values)
      } else {
        await api.saveAccountSender({ account_id: addressAccount.account_id, ...values })
      }
      setHasSenderAddress(true)
      setAddressModalOpen(false)
      message.success('송하인 주소가 저장되었습니다.')
    } catch { message.error('송하인 주소 저장에 실패했습니다.') }
  }

  // ── 테이블 컬럼 ──────────────────────────────────────────────
  const columns: TableColumnsType<ApiAccount> = [
    { title: 'ID', dataIndex: 'account_id', width: 60 },
    { title: '계정명', dataIndex: 'account_name', width: 180, render: v => <span style={{ fontWeight: 600 }}>{v}</span> },
    { title: 'WBS', dataIndex: 'wbs_id', render: id => wbsList.find(w => w.wbs_id === id)?.wbs_name ?? '-' },
    { title: '계정유형', dataIndex: 'account_type', width: 100, render: v => v === 'ONE' ? '화주' : 'WMS(3PL)' },
    {
      title: '출력유형', dataIndex: 'print_type', width: 110,
      render: v => v === 'CJ' ? <Tag color="orange">CJ대한통운</Tag>
        : v === 'PO' ? <Tag color="green">우체국</Tag>
        : <span style={{ color: '#9CA3AF', fontSize: 12 }}>자동</span>,
    },
    {
      title: '상태', dataIndex: 'is_active', width: 80,
      render: v => v === 'Y'
        ? <Tag color="success" style={{ borderRadius: 99 }}>사용</Tag>
        : <Tag color="error" style={{ borderRadius: 99 }}>중지</Tag>,
    },
    {
      title: '관리', key: 'action', width: 220,
      render: (_, r) => (
        <Space size={4} wrap>
          <Button size="small" onClick={() => openEdit(r)}>수정</Button>
          {r.account_type?.trim() === 'WMS' && (
            <Tooltip title="화주사 관리">
              <Button size="small" icon={<TeamOutlined />} onClick={() => openShipperModal(r)}>
                화주{(r.shipper_codes?.length ?? 0) > 0 && <Tag color="blue" style={{ marginLeft: 4, lineHeight: '14px' }}>{r.shipper_codes!.length}</Tag>}
              </Button>
            </Tooltip>
          )}
          <Tooltip title="판매사 관리">
            <Button size="small" icon={<ShopOutlined />} onClick={() => openShopModal(r)}>
              판매사{(r.shop_codes?.length ?? 0) > 0 && <Tag color="blue" style={{ marginLeft: 4, lineHeight: '14px' }}>{r.shop_codes!.length}</Tag>}
            </Button>
          </Tooltip>
          {(r.print_type === 'CJ' || r.print_type === 'PO') && (
            <Tooltip title="송하인 주소">
              <Button size="small" icon={<EnvironmentOutlined />} onClick={() => openAddressModal(r)}>주소</Button>
            </Tooltip>
          )}
          <Popconfirm title="계정을 삭제하시겠습니까?" onConfirm={() => handleDelete(r.account_id)} okText="삭제" cancelText="취소" okButtonProps={{ danger: true }}>
            <Button size="small" danger>삭제</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>API 계정</h1>
          <p className={styles.desc}>WMS 연동 API 계정을 거래처별로 관리합니다.</p>
        </div>
      </div>

      <div className={styles.filterBar}>
        <Space>
          <span style={{ fontWeight: 600 }}>거래처 선택 (필수):</span>
          <Select style={{ width: 220 }} placeholder="거래처를 선택하세요" value={selectedPartnerId} onChange={setSelectedPartnerId}
            options={partners.map(p => ({ value: p.partner_id, label: p.partner_name }))} />
        </Space>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadAccounts} loading={loading}>새로고침</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd} disabled={!selectedPartnerId}>계정 추가</Button>
        </Space>
      </div>

      <div className={styles.tableWrap}>
        {selectedPartnerId
          ? <Table columns={columns} dataSource={filteredAccounts} rowKey="account_id" loading={loading} pagination={{ size: 'small', pageSize: 20 }} />
          : <Alert message="거래처를 선택하면 API 계정 목록이 표시됩니다." type="info" showIcon style={{ margin: 24 }} />}
      </div>

      {/* ── 계정 추가/수정 모달 ── */}
      <Modal title={editing ? 'API 계정 수정' : 'API 계정 추가'} open={modalOpen} onCancel={() => setModalOpen(false)}
        onOk={handleSubmit} confirmLoading={saving} width={700} destroyOnClose>
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}
          onValuesChange={(changed, all) => {
            if (changed.domain_name || changed.wbs_id) {
              const wbs = wbsList.find(w => w.wbs_id === all.wbs_id)
              if (all.domain_name && wbs) form.setFieldsValue({ account_name: `${all.domain_name} ${wbs.wbs_name}` })
            }
          }}>
          <Form.Item name="partner_id" hidden><Input /></Form.Item>
          <Form.Item name="account_name" hidden><Input /></Form.Item>
          <Row gutter={16}>
            <Col span={10}>
              <Form.Item label="소속 거래처">
                <Input value={partners.find(p => p.partner_id === selectedPartnerId)?.partner_name} disabled />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="domain_name" label="도메인명" rules={[{ required: true, message: '도메인명을 입력해주세요' }]}>
                <Input placeholder="예: sabang.net" />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="is_active" label="사용" valuePropName="checked"
                getValueProps={v => ({ checked: v === 'Y' })} getValueFromEvent={checked => checked ? 'Y' : 'N'}>
                <Switch />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="account_type" label="계정 타입" rules={[{ required: true }]}>
                <Select options={[{ value: 'ONE', label: '화주' }, { value: 'WMS', label: 'WMS(3PL)' }]} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="wbs_id" label="WBS 시스템" rules={[{ required: true, message: 'WBS를 선택해주세요' }]}>
                <Select placeholder="WBS 선택" options={wbsList.map(w => ({ value: w.wbs_id, label: w.wbs_name }))} />
              </Form.Item>
            </Col>
          </Row>
          {editing && accountType === 'WMS' && (
            <div className={styles.sectionBox}>
              <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space size={6}>
                  <span style={{ fontWeight: 600 }}>화주사 선택</span>
                  {(editing.shipper_codes?.length ?? 0) > 0 && <Tag color="blue">{editing.shipper_codes!.length}개 선택됨</Tag>}
                </Space>
                <Space>
                  <Button size="small" onClick={async () => {
                    const data = await api.getShippers({ account_id: editing.account_id })
                    setEditShippers(data)
                    message.success(`${data.length}개 화주사를 불러왔습니다.`)
                  }}>조회</Button>
                  <Button size="small" icon={<SyncOutlined />} onClick={async () => {
                    message.loading({ content: '수집 중...', key: 'syncS' })
                    const r = await api.syncShippers(editing.account_id)
                    message.success({ content: `화주 수집 완료 (${r.count}건)`, key: 'syncS' })
                  }}>수집</Button>
                </Space>
              </div>
              {editShippers.length > 0 && (
                <Form.Item name="shipper_codes">
                  <Checkbox.Group style={{ width: '100%' }}>
                    <Row>{editShippers.map(s => (
                      <Col span={12} key={s.shipper_code}>
                        <Checkbox value={s.shipper_code}>{s.shipper_name} ({s.shipper_code})</Checkbox>
                      </Col>
                    ))}</Row>
                  </Checkbox.Group>
                </Form.Item>
              )}
            </div>
          )}

          {editing && (
            <div className={styles.sectionBox}>
              <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space size={6}>
                  <span style={{ fontWeight: 600 }}>판매사 선택</span>
                  {(editing.shop_codes?.length ?? 0) > 0 && <Tag color="blue">{editing.shop_codes!.length}개 선택됨</Tag>}
                </Space>
                <Space>
                  <Button size="small" onClick={async () => {
                    const data = await api.getShops({ account_id: editing.account_id })
                    setEditShops(data)
                    message.success(`${data.length}개 판매사를 불러왔습니다.`)
                  }}>조회</Button>
                  <Button size="small" icon={<SyncOutlined />} onClick={async () => {
                    message.loading({ content: '수집 중...', key: 'syncSh' })
                    const r = await api.syncShops(editing.account_id)
                    message.success({ content: `판매사 수집 완료 (${r.count}건)`, key: 'syncSh' })
                  }}>수집</Button>
                </Space>
              </div>
              {editShops.length > 0 && (
                <Form.Item name="shop_codes">
                  <Checkbox.Group style={{ width: '100%' }}>
                    <Row>{editShops.map(s => (
                      <Col span={12} key={s.shop_code}>
                        <Checkbox value={s.shop_code}>{s.shop_name} ({s.shop_code})</Checkbox>
                      </Col>
                    ))}</Row>
                  </Checkbox.Group>
                </Form.Item>
              )}
            </div>
          )}

          {isSellmate ? (
            <Form.Item name="warehouse_id" label="창고">
              <Select placeholder="창고 선택" options={fetchedWarehouses.map(w => ({ value: w.id, label: w.name }))}
                onDropdownVisibleChange={async open => {
                  if (open && fetchedWarehouses.length === 0 && editing)
                    setFetchedWarehouses(await api.getWarehouses(editing.account_id))
                }} />
            </Form.Item>
          ) : (
            <Form.Item name="waybill_template" label="운송장 템플릿">
              <Input placeholder="템플릿 ID (선택)" />
            </Form.Item>
          )}
          <Form.Item name="api_url" label="API URL" rules={[{ required: true, message: 'API URL을 입력해주세요' }]}>
            <Input placeholder="https://api.example.com" />
          </Form.Item>
          <Form.Item name="auth_type" label="키유형" rules={[{ required: true }]}>
            <Radio.Group>
              <Radio value="query">Query (Partner/Domain Key)</Radio>
              <Radio value="bearer">Bearer Token (Client ID / Secret)</Radio>
            </Radio.Group>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="partner_key" label={authType === 'bearer' ? 'Client ID' : 'Partner Key'} rules={[{ required: true }]}>
                <Input.Password />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="domain_key" label={authType === 'bearer' ? 'Client Secret' : 'Domain Key'} rules={[{ required: true }]}>
                <Input.Password />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="delv_type" label="배송처리 타입" rules={[{ required: true }]}>
                <Select options={[{ value: 'P', label: '출력만' }, { value: '0', label: '즉시배송처리' }]} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="print_type" label="출력유형">
                <Select disabled={!isEzadmin} options={[
                  { value: '', label: '자동 (텍스트)' },
                  { value: 'CJ', label: 'CJ 대한통운' },
                  { value: 'PO', label: '우체국' },
                ]} />
              </Form.Item>
            </Col>
          </Row>
          {showReqBody && (
            <Form.Item name="print_type_req_body" label="출력유형 요청 Body (JSON)">
              <TextArea rows={4} placeholder='{"key": "value"}' />
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* ── 화주 모달 ── */}
      <Modal title={`화주사 관리 — ${shipperAccount?.account_name}`} open={shipperModalOpen}
        onCancel={() => setShipperModalOpen(false)} onOk={handleShipperSave} confirmLoading={shipperSaving}
        width={560} destroyOnClose>
        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-end' }}>
          <Button size="small" icon={<SyncOutlined />} onClick={async () => {
            if (!shipperAccount) return
            message.loading({ content: '수집 중...', key: 'syncS' })
            const r = await api.syncShippers(shipperAccount.account_id)
            const data = await api.getShippers({ account_id: shipperAccount.account_id })
            setShippers(data)
            message.success({ content: `화주 수집 완료 (${r.count}건)`, key: 'syncS' })
          }}>수집 (DB저장)</Button>
        </div>
        <Form form={shipperForm} layout="vertical">
          {shippers.length === 0
            ? <Alert message="조회된 화주사가 없습니다. 수집 버튼을 눌러주세요." type="info" showIcon />
            : <Form.Item name="shipper_codes">
                <Checkbox.Group style={{ width: '100%' }}>
                  <Row>{shippers.map(s => (
                    <Col span={12} key={s.shipper_code}>
                      <Checkbox value={s.shipper_code}>{s.shipper_name} ({s.shipper_code})</Checkbox>
                    </Col>
                  ))}</Row>
                </Checkbox.Group>
              </Form.Item>
          }
        </Form>
      </Modal>

      {/* ── 판매사 모달 ── */}
      <Modal title={`판매사 관리 — ${shopAccount?.account_name}`} open={shopModalOpen}
        onCancel={() => setShopModalOpen(false)} onOk={handleShopSave} confirmLoading={shopSaving}
        width={560} destroyOnClose>
        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-end' }}>
          <Button size="small" icon={<SyncOutlined />} onClick={async () => {
            if (!shopAccount) return
            message.loading({ content: '수집 중...', key: 'syncSh' })
            const r = await api.syncShops(shopAccount.account_id)
            const data = await api.getShops({ account_id: shopAccount.account_id })
            setShops(data)
            message.success({ content: `판매사 수집 완료 (${r.count}건)`, key: 'syncSh' })
          }}>수집 (DB저장)</Button>
        </div>
        <Form form={shopForm} layout="vertical">
          {shops.length === 0
            ? <Alert message="조회된 판매사가 없습니다. 수집 버튼을 눌러주세요." type="info" showIcon />
            : <Form.Item name="shop_codes">
                <Checkbox.Group style={{ width: '100%' }}>
                  <Row>{shops.map(s => (
                    <Col span={12} key={s.shop_code}>
                      <Checkbox value={s.shop_code}>{s.shop_name} ({s.shop_code})</Checkbox>
                    </Col>
                  ))}</Row>
                </Checkbox.Group>
              </Form.Item>
          }
        </Form>
      </Modal>

      {/* ── 주소 모달 ── */}
      <Modal title={`송하인 주소 — ${addressAccount?.account_name}`} open={addressModalOpen}
        onCancel={() => setAddressModalOpen(false)} onOk={handleAddressSave}
        okText="저장" cancelText="취소" destroyOnClose>
        <Form form={addressForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item name="sender_name" label="송하인 이름" rules={[{ required: true }]}>
            <Input placeholder="이름을 입력하세요" />
          </Form.Item>
          <Form.Item name="sender_mobile" label="송하인 전화" rules={[{ required: true }]}>
            <Input placeholder="예: 010-1234-5678" />
          </Form.Item>
          <Form.Item name="sender_postno" label="우편번호" rules={[{ required: true }]}>
            <Input placeholder="예: 06123" />
          </Form.Item>
          <Form.Item name="sender_addr1" label="주소1" rules={[{ required: true }]}>
            <Input placeholder="예: 서울특별시 강남구 테헤란로 123" />
          </Form.Item>
          <Form.Item name="sender_addr2" label="주소2">
            <Input placeholder="예: 4층 401호" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
