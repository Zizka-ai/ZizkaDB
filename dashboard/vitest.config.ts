import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // Only our own tests — never walk node_modules or the Next build output.
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules/**', '.next/**'],
    // The default worker-thread pool times out its RPC ("Timeout calling fetch
    // /@vite/env") on slow/synced filesystems. A single forked process avoids
    // the worker RPC entirely; generous timeouts absorb slow cold transforms.
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    testTimeout: 30_000,
    hookTimeout: 30_000,
    teardownTimeout: 30_000,
  },
  resolve: {
    // Mirrors the `@/*` alias in tsconfig.json so imports resolve identically.
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
