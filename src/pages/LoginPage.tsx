import { useState } from 'react'
import { useGoogleLogin } from '@react-oauth/google'
import { Alert, Spin, Segmented } from 'antd'
import logo from '../assets/logo.png'
import { api } from '../lib/api'
import { saveAuth } from '../lib/auth'
import { getEnv, setEnv, ENV_LABELS, AVAILABLE_ENVS } from '../lib/env'
import type { AppEnv } from '../lib/env'
import styles from './LoginPage.module.css'

export type AuthStatus = 'idle' | 'loading' | 'pending' | 'rejected'

interface Props {
  onApproved: (user: { name: string; email: string }) => void
}

export default function LoginPage({ onApproved }: Props) {
  const [status, setStatus] = useState<AuthStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [env, setEnvState] = useState<AppEnv>(getEnv())

  function changeEnv(next: AppEnv) {
    setEnv(next)
    setEnvState(next)
  }

  const login = useGoogleLogin({
    onSuccess: async ({ access_token }) => {
      setStatus('loading')
      try {
        const res = await api.googleLogin(access_token)

        if (res.status === 'approved' && res.token && res.user) {
          saveAuth(res.token, {
            id: res.user.id,
            email: res.user.email,
            name: res.user.name,
          })
          onApproved({ name: res.user.name, email: res.user.email })
        } else if (res.status === 'pending') {
          setStatus('pending')
        } else if (res.status === 'rejected') {
          setStatus('rejected')
        }
      } catch (err: unknown) {
        const e = err as { error?: string }
        if (e?.error?.includes('pending') || (err as { status?: number })?.status === 403) {
          setStatus('pending')
        } else {
          setErrorMsg(e?.error ?? '로그인 중 오류가 발생했습니다.')
          setStatus('idle')
        }
      }
    },
    onError: () => {
      setErrorMsg('Google 로그인이 취소되었거나 실패했습니다.')
      setStatus('idle')
    },
    flow: 'implicit',
  })

  if (status === 'pending') return <PendingPage />
  if (status === 'rejected') return <RejectedPage />

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logoWrap}>
          <img src={logo} alt="SpeedBagger" className={styles.logo} />
          <span className={styles.tag}>Admin Portal</span>
        </div>

        <h1 className={styles.title}>관리자 로그인</h1>
        <p className={styles.sub}>계속하려면 구글 계정으로 로그인하세요.</p>

        <div style={{ marginBottom: 14, textAlign: 'center' }}>
          <Segmented<AppEnv>
            value={env}
            onChange={changeEnv}
            options={AVAILABLE_ENVS.map((e) => ({ label: ENV_LABELS[e], value: e }))}
            className={env === 'dev' ? 'env-switch-dev' : undefined}
          />
          {env === 'dev' && (
            <div style={{ marginTop: 6, fontSize: 12, fontWeight: 600, color: '#DB2777' }}>
              ⚠️ DEV 환경에 접속합니다
            </div>
          )}
        </div>

        <button
          className={styles.googleBtn}
          onClick={() => { setErrorMsg(''); login() }}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? <Spin size="small" /> : <GoogleIcon />}
          {status === 'loading' ? '로그인 중...' : 'Google로 계속하기'}
        </button>

        {errorMsg && (
          <Alert message={errorMsg} type="error" showIcon style={{ marginTop: 12, borderRadius: 9 }} />
        )}

        <div className={styles.orRow}>
          <span className={styles.orLabel}>접속 안내</span>
        </div>

        <Alert
          message="승인된 계정만 접속 가능합니다. 접속 권한이 필요하면 관리자에게 문의하세요."
          type="warning"
          showIcon
          icon={<span>🔐</span>}
          style={{ borderRadius: 9 }}
        />

        <p className={styles.footer}>© 2025 CNK Planet · SpeedBagger Admin v1.0</p>
      </div>
    </div>
  )
}

function PendingPage() {
  return (
    <div className={styles.page}>
      <div className={styles.card} style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <h1 className={styles.title}>승인 대기 중</h1>
        <p className={styles.sub} style={{ marginBottom: 20 }}>
          접속 승인 요청이 접수되었습니다.<br />
          관리자가 승인하면 이메일로 알림이 발송됩니다.
        </p>
        <Alert
          message="승인 후 다시 Google로 로그인하시면 접속 가능합니다."
          type="info"
          showIcon
          style={{ borderRadius: 9, textAlign: 'left' }}
        />
        <p className={styles.footer}>© 2025 CNK Planet · SpeedBagger Admin</p>
      </div>
    </div>
  )
}

function RejectedPage() {
  return (
    <div className={styles.page}>
      <div className={styles.card} style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
        <h1 className={styles.title}>접속 거절됨</h1>
        <p className={styles.sub} style={{ marginBottom: 20 }}>
          접속 요청이 거절되었습니다.<br />
          접근 권한이 필요하면 관리자에게 직접 문의하세요.
        </p>
        <Alert
          message="문의: park.kyoungyong@cnkplanet.co.kr"
          type="error"
          showIcon
          style={{ borderRadius: 9, textAlign: 'left' }}
        />
        <p className={styles.footer}>© 2025 CNK Planet · SpeedBagger Admin</p>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}
