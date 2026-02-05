import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/SessionRefresh.tsx'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  unbundle: true,
  outDir: 'dist',
  external: ['react', 'react-router', 'kenmon'],
})
