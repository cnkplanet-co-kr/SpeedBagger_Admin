import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  // dev 포트 고정: Google OAuth '승인된 JavaScript 출처'(http://localhost:5173)와 항상 일치시키기 위함.
  // strictPort=true 이면 5173 점유 시 다른 포트로 넘어가지 않고 에러를 낸다.
  server: { port: 5173, strictPort: true },
})
