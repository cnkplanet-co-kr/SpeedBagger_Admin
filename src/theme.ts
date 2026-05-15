import type { ThemeConfig } from 'antd'

export const ORANGE = '#F47920'
export const NAVY = '#1D3A8A'

export const theme: ThemeConfig = {
  token: {
    colorPrimary: ORANGE,
    colorLink: NAVY,
    borderRadius: 8,
    fontFamily: "-apple-system, 'Noto Sans KR', Inter, sans-serif",
  },
  components: {
    Button: {
      primaryColor: '#ffffff',
    },
    Table: {
      headerBg: '#F9FAFB',
      headerColor: '#9CA3AF',
    },
  },
}
