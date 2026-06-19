import { useState, useEffect } from 'react'
import {
  Table, Button, Select, DatePicker, Input, Radio, Form, Space, Alert, Modal, message, ConfigProvider,
} from 'antd'
import type { TableColumnsType } from 'antd'
import { SearchOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { api } from '../../lib/api'
import type { Partner, ApiAccount, Machine, Shipper, Shop } from '../../lib/api'
import { getStatusText, getCsStatusText, STATUS_OPTIONS } from '../../lib/status'
import styles from './OrderHistoryPage.module.css'

// 화면 표시용 행 (서버 응답 → 매핑)
interface HistoryRow {
  key: number
  dbId: number | undefined // 삭제 대상 DB PK (없으면 삭제 불가) — 표시용 key와 분리
  rowNo: number
  status: string
  csId: string
  csStatus: string
  csStatusName: string
  scanTime: string
  packType: string
  waybillNo: string
  barcode: string
  productCd: string
  productName: string
  optionName: string
  qty: number
  orderNo: string
  orderDate: string
  shipperName: string
  shopName: string
  collectDate: string
  transDate: string
  receiver: string
  deviceName: string
  printCount: number
  auxPrinted: number
}

export default function OrderHistoryPage() {
  const [form] = Form.useForm()

  const [partners, setPartners] = useState<Partner[]>([])
  const [accounts, setAccounts] = useState<ApiAccount[]>([])
  const [selectedPartnerId, setSelectedPartnerId] = useState<number | null>(null)
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null)
  const [selectedMachineId, setSelectedMachineId] = useState<number | 'all'>('all')

  const [machines, setMachines] = useState<Machine[]>([])
  const [shippers, setShippers] = useState<Shipper[]>([])
  const [shops, setShops] = useState<Shop[]>([])

  const [data, setData] = useState<HistoryRow[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(200)
  const [totalCount, setTotalCount] = useState(0)
  const [waybillCount, setWaybillCount] = useState(0)
  const [productQty, setProductQty] = useState(0)

  const dateType = Form.useWatch('dateType', form)

  const filteredAccounts = accounts.filter((a) => a.partner_id === selectedPartnerId)
  const selectedAccount = accounts.find((a) => a.account_id === selectedAccountId)
  const isWms = selectedAccount?.account_type?.trim() === 'WMS'

  // 거래처 + 계정 목록 로드
  useEffect(() => {
    Promise.all([api.getPartners(), api.getAccounts()])
      .then(([p, a]) => { setPartners(p); setAccounts(a) })
      .catch(() => message.error('거래처/계정 목록을 불러오지 못했습니다.'))
  }, [])

  // 거래처 변경 → 계정 및 종속 필터 초기화
  function handlePartnerChange(id: number) {
    setSelectedPartnerId(id)
    setSelectedAccountId(null)
    setSelectedMachineId('all')
    setMachines([]); setShippers([]); setShops([])
    form.setFieldsValue({ shipper_codes: [], shop_codes: [] })
  }

  // 계정 변경 → 장비/화주/판매처 로드 (계정 종속)
  async function handleAccountChange(id: number) {
    setSelectedAccountId(id)
    setSelectedMachineId('all')
    form.setFieldsValue({ shipper_codes: [], shop_codes: [] })
    const [m, sh, sp] = await Promise.all([
      api.getMachines().catch(() => [] as Machine[]),
      api.getShippers({ account_id: id }).catch(() => [] as Shipper[]),
      api.getShops({ account_id: id }).catch(() => [] as Shop[]),
    ])
    setMachines(m.filter((x) => x.account_id === id))
    setShippers(sh)
    setShops(sp)
  }

  async function handleSearch(page = 1, size = pageSize) {
    if (!selectedPartnerId) { message.warning('거래처를 선택해주세요.'); return }
    if (!selectedAccountId) { message.warning('API 계정을 선택해주세요.'); return }

    setLoading(true)
    setData([])
    try {
      const v = form.getFieldsValue()
      const params: Record<string, string | number> = {
        partner_id: selectedPartnerId,
        account_id: selectedAccountId,
        page,
        page_size: size,
      }
      if (v.waybill_no) params.waybill_no = v.waybill_no
      if (v.searchKeyword) params[v.searchType || 'barcode'] = v.searchKeyword
      if (selectedMachineId !== 'all') params.machine_id = selectedMachineId
      if (v.status && v.status !== 'all') params.work_flag = v.status
      if (v.shipper_codes?.length) params.shipper_code = v.shipper_codes.join(',')
      if (v.shop_codes?.length) params.shop_code = v.shop_codes.join(',')
      if (v.kind && v.kind !== 'all') params.kind = v.kind
      if (v.dateRange) {
        const [start, end] = v.dateRange
        if (v.dateType === 'work_date') {
          params.start_date = start.format('YYYYMMDD')
          params.end_date = end.format('YYYYMMDD')
        } else {
          params.start_date = start.format('YYYY-MM-DD HH:mm')
          params.end_date = end.format('YYYY-MM-DD HH:mm')
        }
        params.date_type = v.dateType
      }

      const res = await api.getOrderHistory(params)
      const items = res?.data ?? []
      setData(items.map((item, index): HistoryRow => ({
        key: item.id ?? index,
        dbId: item.id, // 실제 PK만 사용 (index 폴백 금지 → 잘못된 행 삭제 방지)
        rowNo: (page - 1) * size + index + 1,
        status: getStatusText(item.work_flag),
        csId: String(item.cs_id ?? ''),
        csStatus: getCsStatusText(item.order_cs),
        csStatusName: item.cs_name || '',
        scanTime: item.scan_date,
        packType: item.kind === '1' ? '단포' : '합포',
        waybillNo: item.waybill_no,
        barcode: item.barcode,
        productCd: item.product_cd,
        productName: item.product_name,
        optionName: item.product_option,
        qty: item.order_qty,
        orderNo: item.order_no,
        orderDate: item.order_date?.substring(0, 10) ?? '',
        shipperName: item.shipper_name,
        shopName: item.shop_name,
        collectDate: item.collect_date,
        transDate: item.trans_date,
        receiver: item.recv_name,
        deviceName: item.machine_name,
        printCount: item.reprint_count || 0,
        auxPrinted: item.aux_printed ? 1 : 0,
      })))
      setTotalCount(res?.total ?? items.length)
      setWaybillCount(res?.waybill_count ?? 0)
      setProductQty(res?.product_qty ?? 0)
      setCurrentPage(page)
      setSearched(true)
    } catch (e: unknown) {
      const err = e as { status?: number; error?: string }
      // 404: 데이터 없음 → 안내 후 테이블/카운트 초기화
      if (err?.status === 404) {
        message.info('데이타가 존재하지 않습니다.')
        setData([])
        setTotalCount(0)
        setWaybillCount(0)
        setProductQty(0)
        setCurrentPage(page)
        setSearched(true)
        return
      }
      message.error(`조회 요청 실패: ${err?.error ?? ''}`)
    } finally {
      setLoading(false)
    }
  }

  // 단건 삭제 — 확인 모달 후 영구 삭제(백엔드에서 아카이브 이관)
  function confirmDelete(row: HistoryRow) {
    if (row.dbId == null) { message.error('삭제할 수 없는 주문입니다. (ID 없음)'); return }
    Modal.confirm({
      title: '주문 삭제',
      icon: <ExclamationCircleOutlined />,
      content: `운송장번호 [${row.waybillNo || '-'}] 주문을 삭제하시겠습니까?\n삭제된 자료는 아카이브로 이동됩니다.`,
      okText: '삭제',
      okButtonProps: { danger: true },
      cancelText: '취소',
      onOk: async () => {
        try {
          await api.deleteOrder(row.dbId!)
          message.success('삭제되었습니다. (아카이브로 이동)')
          handleSearch(currentPage)
        } catch (e: unknown) {
          const err = e as { error?: string }
          message.error(`삭제 실패: ${err?.error ?? ''}`)
        }
      },
    })
  }

  // 운송장번호까지 좌측 고정(fixed), 삭제 컬럼은 우측 고정
  const columns: TableColumnsType<HistoryRow> = [
    { title: '순번', dataIndex: 'rowNo', width: 60, fixed: 'left', align: 'center' },
    { title: '상태', dataIndex: 'status', width: 70, fixed: 'left', render: (t: string) => <span style={{ color: t === '출력' ? '#1677ff' : 'inherit' }}>{t}</span> },
    { title: 'CS상태', dataIndex: 'csStatus', width: 110, fixed: 'left', render: (t: string, r) => (r.csId && r.csId !== '0') ? (t ? `${t}-${r.csStatusName}` : r.csStatusName) : t },
    { title: '스캔일시', dataIndex: 'scanTime', width: 160, fixed: 'left' },
    { title: '포장구분', dataIndex: 'packType', width: 80, fixed: 'left' },
    { title: '운송장번호', dataIndex: 'waybillNo', width: 150, fixed: 'left' },
    { title: '바코드', dataIndex: 'barcode', width: 220 },
    { title: '상품명', dataIndex: 'productName', width: 200, render: (t: string) => <span style={{ fontSize: 'calc(1em - 2px)' }}>{t}</span> },
    { title: '옵션명', dataIndex: 'optionName', width: 180 },
    { title: '수량', dataIndex: 'qty', width: 60, align: 'center' },
    { title: '주문번호', dataIndex: 'orderNo', width: 130 },
    { title: '주문일자', dataIndex: 'orderDate', width: 110 },
    { title: '화주', dataIndex: 'shipperName', width: 110 },
    { title: '판매처', dataIndex: 'shopName', width: 110 },
    { title: '상품코드', dataIndex: 'productCd', width: 110 },
    { title: '송장발행일', dataIndex: 'transDate', width: 220 },
    { title: '발주일자', dataIndex: 'collectDate', width: 220 },
    { title: '수령인', dataIndex: 'receiver', width: 100 },
    { title: '장비명', dataIndex: 'deviceName', width: 110 },
    { title: '재발행횟수', dataIndex: 'printCount', width: 90, align: 'center' },
    { title: '보조출력', dataIndex: 'auxPrinted', width: 80, align: 'center', render: (v: number) => (v ? '⭕️' : '') },
    {
      title: '삭제', key: 'action', width: 70, fixed: 'right', align: 'center',
      render: (_: unknown, r) => (
        <Button size="small" danger icon={<DeleteOutlined />} disabled={r.dbId == null} onClick={() => confirmDelete(r)} />
      ),
    },
  ]

  return (
    <ConfigProvider theme={{ components: {
      Select: { fontSize: 12, fontSizeLG: 12, fontSizeSM: 12 },
      DatePicker: { fontSize: 12, fontSizeLG: 12, fontSizeSM: 12 },
    } }}>
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>작업내역조회</h1>
          <p className={styles.desc}>거래처와 API 계정을 선택해 포장 작업 내역을 조회합니다.</p>
        </div>
      </div>

      {/* 거래처 / API 계정 (필수) */}
      <div className={styles.filterBar}>
        <Space size={16} wrap>
          <Space>
            <span className={styles.label}>거래처<span className={styles.required}>*</span></span>
            <Select
              size="small"
              style={{ width: 220 }}
              placeholder="거래처를 선택하세요"
              value={selectedPartnerId}
              onChange={handlePartnerChange}
              options={partners.map((p) => ({ value: p.partner_id, label: p.partner_name }))}
            />
          </Space>
          <Space>
            <span className={styles.label}>API 계정<span className={styles.required}>*</span></span>
            <Select
              size="small"
              style={{ width: 240 }}
              placeholder={selectedPartnerId ? 'API 계정을 선택하세요' : '거래처를 먼저 선택하세요'}
              disabled={!selectedPartnerId}
              value={selectedAccountId}
              onChange={handleAccountChange}
              options={filteredAccounts.map((a) => ({ value: a.account_id, label: a.account_name }))}
            />
          </Space>
          <Space>
            <span className={styles.label}>장비</span>
            <Select
              size="small"
              style={{ width: 200 }}
              placeholder="전체"
              disabled={!selectedAccountId}
              value={selectedMachineId}
              onChange={setSelectedMachineId}
              options={[
                { value: 'all', label: '전체' },
                ...machines.map((m) => ({ value: m.machine_id, label: m.machine_name })),
              ]}
            />
          </Space>
        </Space>
      </div>

      {/* 조회 조건 */}
      <div className={styles.searchBox}>
        <Form form={form}>
          <div className={styles.grid}>
            {/* Row 1 */}
            <div className={styles.cellWide}>
              <span className={styles.label}>조회기간</span>
              <Form.Item name="dateType" initialValue="trans_date" style={{ marginBottom: 0 }}>
                <Select size="small" style={{ width: 160 }}>
                  <Select.Option value="trans_date">송장발행일</Select.Option>
                  <Select.Option value="collect_date">발주일</Select.Option>
                  <Select.Option value="work_date">작업일</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item name="dateRange" initialValue={[dayjs().startOf('day'), dayjs().endOf('day')]} style={{ marginBottom: 0 }}>
                {dateType === 'work_date'
                  ? <DatePicker.RangePicker size="small" format="YYYYMMDD" />
                  : <DatePicker.RangePicker size="small" showTime={{ format: 'HH:mm' }} format="YYYY-MM-DD HH:mm" />}
              </Form.Item>
            </div>
            <div className={styles.cell}>
              <span className={styles.label}>운송장번호</span>
              <Form.Item name="waybill_no" style={{ marginBottom: 0, flex: 1 }}>
                <Input size="small" allowClear />
              </Form.Item>
            </div>
            <div className={styles.cell}>
              <Form.Item name="searchType" initialValue="barcode" style={{ marginBottom: 0 }}>
                <Select size="small" style={{ width: 100 }}>
                  <Select.Option value="barcode">바코드</Select.Option>
                  <Select.Option value="product_code">상품코드</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item name="searchKeyword" style={{ marginBottom: 0, flex: 1 }}>
                <Input size="small" allowClear />
              </Form.Item>
            </div>

            {/* Row 2 */}
            <div className={styles.cell}>
              <span className={styles.label}>화주</span>
              <Form.Item name="shipper_codes" style={{ marginBottom: 0, flex: 1 }}>
                <Select mode="multiple" placeholder="전체" size="small" allowClear maxTagCount="responsive" disabled={!isWms}
                  options={shippers.map((s) => ({ value: s.shipper_code, label: s.shipper_name }))} />
              </Form.Item>
            </div>
            <div className={styles.cell}>
              <span className={styles.label}>판매처</span>
              <Form.Item name="shop_codes" style={{ marginBottom: 0, flex: 1 }}>
                <Select mode="multiple" placeholder="전체" size="small" allowClear maxTagCount="responsive"
                  options={shops.map((s) => ({ value: s.shop_code, label: s.shop_name }))} />
              </Form.Item>
            </div>
            <div className={styles.cellWide}>
              <span className={styles.label}>포장구분</span>
              <Form.Item name="kind" initialValue="all" style={{ marginBottom: 0 }}>
                <Radio.Group size="small">
                  <Radio value="all">전체</Radio>
                  <Radio value="1">단포</Radio>
                  <Radio value="2">합포</Radio>
                </Radio.Group>
              </Form.Item>
            </div>

            {/* Row 3 */}
            <div className={styles.cellWide} style={{ gridColumn: 'span 3' }}>
              <span className={styles.label}>작업구분</span>
              <Form.Item name="status" initialValue="all" style={{ marginBottom: 0 }}>
                <Radio.Group size="small">
                  <Radio value="all">전체</Radio>
                  {STATUS_OPTIONS.map((opt) => (
                    <Radio key={opt.value} value={opt.value}>{opt.label}</Radio>
                  ))}
                </Radio.Group>
              </Form.Item>
            </div>
            <div className={styles.cell} style={{ justifyContent: 'flex-start', gap: 10 }}>
              <Button
                size="small"
                type="primary"
                icon={<SearchOutlined />}
                style={{ backgroundColor: '#F26D24', borderColor: '#F26D24' }}
                onClick={() => handleSearch(1)}
                loading={loading}
              >
                조회
              </Button>
              {searched && (
                <span className={styles.resultText}>
                  운송장 {waybillCount}건(상품 총 {productQty}개)
                </span>
              )}
            </div>
          </div>
        </Form>
      </div>

      <div className={styles.tableWrap}>
        {selectedAccountId
          ? (
            <Table
              columns={columns}
              dataSource={data}
              rowKey="key"
              loading={loading}
              size="small"
              bordered
              scroll={{ x: 'max-content', y: 'calc(100vh - 420px)' }}
              pagination={{
                current: currentPage,
                pageSize,
                total: totalCount,
                showSizeChanger: true,
                pageSizeOptions: ['100', '200'],
                showTotal: (total) => `총 ${total}건`,
                position: ['topRight'],
                onChange: (page, size) => { setPageSize(size); handleSearch(page, size) },
              }}
            />
          )
          : <Alert message="거래처와 API 계정을 선택한 뒤 조회해주세요." type="info" showIcon style={{ margin: 24 }} />}
      </div>
    </div>
    </ConfigProvider>
  )
}
