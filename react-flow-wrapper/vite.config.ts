import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    process: '{ env: { NODE_ENV: "production" } }'
  },
  build: {
    lib: {
      entry: 'src/main.tsx',
      name: 'ReactFlowBuilder',
      // es  → dist/react-flow.js         (dùng import trong bundler)
      // umd → dist/react-flow.umd.cjs    (dùng require / <script> global)
      // iife→ dist/react-flow.iife.js    (copy thẳng vào public/ Angular)
      fileName: (format) => {
        if (format === 'umd')  return 'react-flow.umd.cjs'
        if (format === 'iife') return 'react-flow.iife.js'
        return 'react-flow.js'
      },
      formats: ['es', 'umd', 'iife']
    }
  }
})