import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: env.VITE_BASE_PATH || './',
    envPrefix: 'VITE_',
    server: {
      port: 5173,
      strictPort: false,
      open: true,
      host: '0.0.0.0',
      // Explicit hosts: boolean `true` was still rejected by this Vite build for tunnels.
      allowedHosts: [
        'all',
        '.trycloudflare.com',
        '.loca.lt',
        'expenses-timothy-tabs-wan.trycloudflare.com',
        'localhost',
        '127.0.0.1',
      ],
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
    plugins: [
      {
        name: 'inject-yandex-sdk-flag',
        transformIndexHtml(html) {
          const loadSdk = env.VITE_LOAD_YANDEX_SDK === 'true';
          return html.replace(/%VITE_LOAD_YANDEX_SDK%/g, loadSdk ? 'true' : 'false');
        },
      },
    ],
  };
});
