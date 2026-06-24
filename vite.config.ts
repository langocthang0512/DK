import { fileURLToPath, URL } from 'node:url';

import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProduction = mode === 'production';

  return {
    base: env.VITE_BASE_PATH ?? '/',
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: false,
      open: false
    },
    preview: {
      host: '0.0.0.0',
      port: 4173,
      strictPort: false
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@core': fileURLToPath(new URL('./src/core', import.meta.url)),
        '@game': fileURLToPath(new URL('./src/game', import.meta.url)),
        '@scenes': fileURLToPath(new URL('./src/scenes', import.meta.url)),
        '@systems': fileURLToPath(new URL('./src/systems', import.meta.url)),
        '@assets': fileURLToPath(new URL('./src/assets', import.meta.url)),
        '@ui': fileURLToPath(new URL('./src/ui', import.meta.url)),
        '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
        '@hooks': fileURLToPath(new URL('./src/hooks', import.meta.url)),
        '@utils': fileURLToPath(new URL('./src/utils', import.meta.url)),
        '@config': fileURLToPath(new URL('./src/config', import.meta.url)),
        '@constants': fileURLToPath(new URL('./src/constants', import.meta.url)),
        '@services': fileURLToPath(new URL('./src/services', import.meta.url))
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: !isProduction ? true : 'hidden',
      chunkSizeWarningLimit: 1500,
      assetsInlineLimit: 0,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('/node_modules/phaser/')) {
              return 'phaser';
            }

            return undefined;
          }
        }
      }
    }
  };
});
