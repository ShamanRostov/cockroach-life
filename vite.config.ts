import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: env.VITE_BASE_PATH || './',
    server: {
      port: 5173,
      open: true,
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      target: 'es2022',
      chunkSizeWarningLimit: 1600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/phaser')) {
              return 'phaser';
            }
            if (id.includes('node_modules')) {
              return 'vendor';
            }
          },
        },
      },
    },
    define: {
      __BUILD_MODE__: JSON.stringify(mode),
    },
  };
});
