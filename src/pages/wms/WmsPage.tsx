import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, Switch, Space, Tag, Popconfirm, message } from 'antd'
import type { TableColumnsType } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { api } from '../../lib/api'
import type { WBS } from '../../lib/api'
import styles from './WmsPage.module.css'


export default function WmsPage() {
  const [data, setData] = useState<WBS[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<WBS | null>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  async function load() {
    setLoading(true)
    try {
      setData(await api.getWBS())
    } catch {
      message.error('WBS 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function openAdd() {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ is_active: 'Y' })
    setModalOpen(true)
  }

  function openEdit(row: WBS) {
    setEditing(row)
    form.setFieldsValue({ ...row, is_active: row.is_active === 'Y' })
    setModalOpen(true)
  }

  async function handleDelete(id: number) {
    try {
      await api.deleteWBS(id)
      message.success('삭제되었습니다.')
      load()
    } catch (e: any) {
      message.error(e?.error ?? '삭제에 실패했습니다.')
    }
  }

  async function handleSubmit() {
    const values = await form.validateFields()

    const isDuplicate = data.some(w =>
      w.wbs_type === values.wbs_type && w.wbs_id !== editing?.wbs_id
    )
    if (isDuplicate) {
      message.error('WBS 유형이 중복되어 추가할 수 없습니다.')
      return
    }

    const payload = { ...values, is_active: values.is_active ? 'Y' : 'N' }
    setSaving(true)
    try {
      if (editing) {
        await api.updateWBS(editing.wbs_id, payload)
      } else {
        await api.createWBS(payload)
      }
      message.success('저장되었습니다.')
      setModalOpen(false)
      load()
    } catch (e: any) {
      if (e?.error?.includes('Duplicate') || e?.error?.includes('duplicate') || e?.error?.includes('unique')) {
        message.error('WBS 유형이 중복되어 추가할 수 없습니다.')
      } else {
        message.error(e?.error ?? '저장에 실패했습니다.')
      }
    } finally {
      setSaving(false)
    }
  }

  const columns: TableColumnsType<WBS> = [
    { title: 'ID', dataIndex: 'wbs_id', width: 60 },
    {
      title: 'WBS 명칭',
      dataIndex: 'wbs_name',
      render: (v) => <span style={{ fontWeight: 600 }}>{v}</span>,
    },
    { title: '유형', dataIndex: 'wbs_type', width: 120 },
    { title: '설명', dataIndex: 'wbs_desc' },
    {
      title: '상태', dataIndex: 'is_active', width: 80,
      render: (v) => v === 'Y'
        ? <Tag color="success" style={{ borderRadius: 99 }}>사용</Tag>
        : <Tag color="error" style={{ borderRadius: 99 }}>중지</Tag>,
    },
    {
      title: '관리', key: 'action', width: 120,
      render: (_, r) => (
        <Space size={6}>
          <Button size="small" onClick={() => openEdit(r)}>수정</Button>
          <Popconfirm
            title="WBS를 삭제하시겠습니까?"
            onConfirm={() => handleDelete(r.wbs_id)}
            okText="삭제" cancelText="취소" okButtonProps={{ danger: true }}
          >
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
          <h1 className={styles.title}>WMS 마스터</h1>
          <p className={styles.desc}>WMS 연동 시스템을 등록하고 관리합니다.</p>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>새로고침</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>WBS 추가</Button>
        </Space>
      </div>

      <div className={styles.tableWrap}>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="wbs_id"
          loading={loading}
          pagination={{ size: 'small', pageSize: 20 }}
        />
      </div>

      <Modal
        title={editing ? 'WBS 수정' : 'WBS 추가'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="wbs_name" label="WBS 명칭" rules={[{ required: true, message: '명칭을 입력해주세요' }]}>
            <Input placeholder="예: 사방넷" />
          </Form.Item>
          <Form.Item name="wbs_type" label="유형" rules={[{ required: true, message: '유형을 입력해주세요' }]}>
            <Input placeholder="예: sabangnet, sellmate, ezadmin" />
          </Form.Item>
          <Form.Item name="wbs_desc" label="설명">
            <Input placeholder="간단한 설명" />
          </Form.Item>
          <Form.Item name="is_active" label="사용여부" valuePropName="checked">
            <Switch checkedChildren="사용" unCheckedChildren="미사용" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
