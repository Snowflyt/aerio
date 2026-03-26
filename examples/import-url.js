const DEFAULT_TIMEOUT = 15_000;

// Not a full JS parser, but works for normal CDN-generated ESM.
// For production, replace this with es-module-lexer.
// eslint-disable-next-line sonarjs/slow-regex
const IMPORT_RE = /(\b(?:import|export)\s+(?:[^'"]*?\s+from\s+)?|import\s*\(\s*)(['"])([^'"]+)\2/g;

/**
 * @typedef {object} ImportUrlOptions
 * @property {number} [timeoutMs]
 * @property {boolean} [allowHttp]
 * @property {(specifier: string) => string} [rewriteBareSpecifier]
 */

/**
 * Import an ESM module from a URL by recursively rewriting its imports into data URLs.
 *
 * This avoids Node's experimental HTTPS loader and vm module flags.
 *
 * @template T
 * @param {string} inputUrl
 * @param {ImportUrlOptions} [options]
 * @returns {Promise<T>}
 */
export async function importUrl(inputUrl, options = {}) {
  /** @type {Map<string, Promise<string>>} */
  const cache = new Map();

  const {
    allowHttp = false,
    rewriteBareSpecifier = (specifier) =>
      `https://esm.sh/${specifier}?bundle&target=es2022`,
    timeoutMs = DEFAULT_TIMEOUT,
  } = options;

  /**
   * @param {string} url
   * @returns {Promise<string>}
   */
  async function fetchText(url) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        signal: ac.signal,
        redirect: "follow",
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
      }

      const contentType = res.headers.get("content-type") ?? "";

      if (
        !contentType.includes("javascript") &&
        !contentType.includes("ecmascript") &&
        !contentType.includes("text/plain") &&
        !contentType.includes("application/octet-stream")
      ) {
        throw new Error(`Unexpected content-type for ${url}: ${contentType}`);
      }

      return await res.text();
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * @param {URL} url
   * @returns {void}
   */
  function assertAllowedUrl(url) {
    if (url.protocol === "https:") return;

    if (allowHttp && url.protocol === "http:") return;

    throw new Error(`Only HTTPS imports are allowed: ${url.href}`);
  }

  /**
   * @param {string} specifier
   * @param {URL} parentUrl
   * @returns {string | null}
   */
  function resolveSpecifier(specifier, parentUrl) {
    // Keep Node builtins untouched.
    if (specifier.startsWith("node:")) return null;

    // Absolute HTTPS / HTTP URL.
    if (/^https?:\/\//.test(specifier)) {
      const url = new URL(specifier);
      assertAllowedUrl(url);
      return url.href;
    }

    // Relative URL or root-relative CDN path.
    if (specifier.startsWith("./") || specifier.startsWith("../") || specifier.startsWith("/")) {
      const url = new URL(specifier, parentUrl);
      assertAllowedUrl(url);
      return url.href;
    }

    // Bare package specifier, e.g. "lodash-es".
    const url = new URL(rewriteBareSpecifier(specifier));
    assertAllowedUrl(url);
    return url.href;
  }

  /**
   * @param {string} rawUrl
   * @returns {Promise<string>}
   */
  async function toDataUrl(rawUrl) {
    const url = new URL(rawUrl);
    assertAllowedUrl(url);

    const normalizedUrl = url.href;

    const existing = cache.get(normalizedUrl);
    if (existing) return existing;

    const promise = (async () => {
      let source = await fetchText(normalizedUrl);
      const parentUrl = new URL(normalizedUrl);

      /** @type {Array<{ start: number; end: number; value: string }>} */
      const replacements = [];

      for (const match of source.matchAll(IMPORT_RE)) {
        const quote = match[2];
        const specifier = match[3];

        if (match.index == null || quote == null || specifier == null) {
          continue;
        }

        const specifierStart = match.index + match[0].lastIndexOf(quote + specifier + quote) + 1;

        const specifierEnd = specifierStart + specifier.length;

        const childUrl = resolveSpecifier(specifier, parentUrl);
        if (!childUrl) continue;

        const childDataUrl = await toDataUrl(childUrl);

        replacements.push({
          start: specifierStart,
          end: specifierEnd,
          value: childDataUrl,
        });
      }

      for (const r of replacements.reverse()) {
        source = source.slice(0, r.start) + r.value + source.slice(r.end);
      }

      const base64 = Buffer.from(source, "utf8").toString("base64");
      return `data:text/javascript;base64,${base64}`;
    })();

    cache.set(normalizedUrl, promise);
    return promise;
  }

  const dataUrl = await toDataUrl(inputUrl);
  return /** @type {Promise<T>} */ (import(dataUrl));
}
