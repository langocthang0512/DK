const readBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) {
    return fallback;
  }

  return value.toLowerCase() === 'true';
};

type ClientEnv = Readonly<{
  VITE_APP_NAME?: string;
  VITE_BASE_PATH?: string;
  VITE_DEBUG?: string;
  VITE_SAVE_NAMESPACE?: string;
  DEV: boolean;
  PROD: boolean;
}>;

const clientEnv = import.meta.env as ClientEnv;

export const env = {
  appName: clientEnv.VITE_APP_NAME ?? 'DK',
  basePath: clientEnv.VITE_BASE_PATH ?? '/',
  debug: readBoolean(clientEnv.VITE_DEBUG, clientEnv.DEV),
  saveNamespace: clientEnv.VITE_SAVE_NAMESPACE ?? 'dk',
  isDev: clientEnv.DEV,
  isProd: clientEnv.PROD
} as const;
