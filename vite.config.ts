import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

console.log(
  'ENV CHECK: VITE_SUPABASE_URL present =', !!process.env.VITE_SUPABASE_URL,
  ', VITE_SUPABASE_ANON_KEY present =', !!process.env.VITE_SUPABASE_ANON_KEY
)

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
})
