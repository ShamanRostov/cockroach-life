/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENV?: 'dev' | 'staging' | 'production';
  readonly VITE_PLATFORM?: 'yandex' | 'web' | 'steam' | 'operator';
  readonly VITE_LOAD_YANDEX_SDK?: string;
  readonly VITE_BASE_PATH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
