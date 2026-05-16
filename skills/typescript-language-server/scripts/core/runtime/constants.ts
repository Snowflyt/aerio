const envTimeout = Number(process.env.TYPESCRIPT_LANGUAGE_SERVER_TIMEOUT_MS || "20_000");
const envCheckTimeout = Number(
  process.env.TYPESCRIPT_LANGUAGE_SERVER_CHECK_TIMEOUT_MS || "120_000",
);

export const DEFAULT_TIMEOUT_MS =
  Number.isFinite(envTimeout) && envTimeout >= 1_000 ? envTimeout : 20_000;
export const DEFAULT_CHECK_TIMEOUT_MS =
  Number.isFinite(envCheckTimeout) && envCheckTimeout >= 1_000 ? envCheckTimeout : 120_000;
export const SOCKET_WAIT_INTERVAL_MS = 250;
