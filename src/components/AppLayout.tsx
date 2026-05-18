import { Outlet, NavLink } from 'react-router-dom'
import { Dropdown, Avatar } from 'antd'
import type { MenuProps } from 'antd'
import { DownOutlined, LogoutOutlined } from '@ant-design/icons'
import logo from '../assets/logo.png'
import styles from './AppLayout.module.css'

interface Props {
  onLogout: () => void
  userName: string
}

export default function AppLayout({ onLogout, userName }: Props) {
  const userMenu: MenuProps = {
    items: [
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: '로그아웃',
        onClick: onLogout,
      },
    ],
  }

  return (
    <div className={styles.layout}>
      <nav className={styles.topnav}>
        <div className={styles.brand}>
          <img src={logo} alt="SpeedBagger" className={styles.brandLogo} />
          <span className={styles.adminBadge}>Admin</span>
        </div>

        <div className={styles.navLinks}>
          <div className={styles.navGroup}>
            <NavLink
              to="/machine-status"
              className={() => {
                const path = window.location.pathname
                const isActive = ['/machine-status', '/work-stat'].some(p => path.startsWith(p))
                return `${styles.navTrigger} ${isActive ? styles.active : ''}`
              }}
            >
              대쉬보드 <DownOutlined className={styles.navArrow} />
            </NavLink>
            <div className={styles.dropdown}>
              <div className={styles.ddHeader}>대쉬보드 메뉴</div>
              <NavLink to="/machine-status" className={({ isActive }) => `${styles.ddItem} ${isActive ? styles.ddActive : ''}`}>
                <span className={styles.ddIcon}>🖨️</span> 포장기현황
              </NavLink>
              <NavLink to="/work-stat" className={({ isActive }) => `${styles.ddItem} ${isActive ? styles.ddActive : ''}`}>
                <span className={styles.ddIcon}>📊</span> 작업 현황
              </NavLink>
              <div className={styles.ddFooter}>총 2개 메뉴</div>
            </div>
          </div>

          <div className={styles.navGroup}>
            <NavLink
              to="/partners"
              className={() => {
                const path = window.location.pathname
                const isActive = ['/partners', '/wms', '/api-accounts', '/machines'].some(p => path.startsWith(p))
                return `${styles.navTrigger} ${isActive ? styles.active : ''}`
              }}
            >
              설정 <DownOutlined className={styles.navArrow} />
            </NavLink>
            <div className={styles.dropdown}>
              <div className={styles.ddHeader}>설정 메뉴</div>
              <NavLink to="/partners" className={({ isActive }) => `${styles.ddItem} ${isActive ? styles.ddActive : ''}`}>
                <span className={styles.ddIcon}>🏢</span> 거래처 관리
              </NavLink>
              <NavLink to="/wms" className={({ isActive }) => `${styles.ddItem} ${isActive ? styles.ddActive : ''}`}>
                <span className={styles.ddIcon}>🗄️</span> WMS 마스터
              </NavLink>
              <NavLink to="/api-accounts" className={({ isActive }) => `${styles.ddItem} ${isActive ? styles.ddActive : ''}`}>
                <span className={styles.ddIcon}>🔑</span> API 계정
              </NavLink>
              <NavLink to="/machines" className={({ isActive }) => `${styles.ddItem} ${isActive ? styles.ddActive : ''}`}>
                <span className={styles.ddIcon}>🖨️</span> 포장기 설정
              </NavLink>
              <div className={styles.ddFooter}>총 4개 메뉴</div>
            </div>
          </div>

          <div className={styles.navGroup}>
            <NavLink
              to="/monitoring"
              className={() => {
                const path = window.location.pathname
                const isActive = ['/monitoring'].some(p => path.startsWith(p))
                return `${styles.navTrigger} ${isActive ? styles.active : ''}`
              }}
            >
              모니터링 <DownOutlined className={styles.navArrow} />
            </NavLink>
            <div className={styles.dropdown}>
              <div className={styles.ddHeader}>모니터링 메뉴</div>
              <NavLink to="/monitoring" className={({ isActive }) => `${styles.ddItem} ${isActive ? styles.ddActive : ''}`}>
                <span className={styles.ddIcon}>📋</span> 로그 모니터링
              </NavLink>
              <div className={styles.ddFooter}>총 1개 메뉴</div>
            </div>
          </div>

          <div className={`${styles.navGroup} ${styles.disabled}`}>
            <span className={styles.navTrigger}>리포트 <DownOutlined className={styles.navArrow} /></span>
          </div>
        </div>

        <div className={styles.navRight}>
          <div className={styles.divider} />
          <Dropdown menu={userMenu} placement="bottomRight">
            <div className={styles.userBtn}>
              <Avatar
                size={30}
                style={{ background: 'linear-gradient(135deg, #1D3A8A, #1530A0)', fontSize: 12, fontWeight: 700 }}
              >
                {userName.charAt(0).toUpperCase()}
              </Avatar>
              <span className={styles.userName}>{userName}</span>
            </div>
          </Dropdown>
        </div>
      </nav>

      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  )
}
