interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly API_URL?: string;
  [key: string]: string | undefined;
}

declare global {
  interface Window {
    __RUNTIME_CONFIG__?: {
      API_URL?: string;
    };
  }
}

const getRuntimeConfig = (): Record<string, string> => {
  if (typeof window !== 'undefined' && window.__RUNTIME_CONFIG__) {
    return window.__RUNTIME_CONFIG__ as Record<string, string>;
  }
  return {};
};

const runtimeConfig = getRuntimeConfig();
const importMetaEnv = (import.meta as unknown as ImportMeta).env || {};

export const API_URL =
  runtimeConfig.API_URL ||
  runtimeConfig.__API_URL__ ||
  importMetaEnv.VITE_API_URL ||
  importMetaEnv.API_URL ||
  'http://localhost:8080';
