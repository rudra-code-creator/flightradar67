/**
 * Cesium's transitive @spz-loader/core detects Node via
 * `globalThis.process.versions.node` and then tries `createRequire` /
 * `file:///opt/build/repo/...` paths. Next.js client bundles often leave a
 * Node-like `process` shim, which breaks Cesium chunk execution in the browser.
 *
 * Call this *before* dynamically importing Cesium.
 */
export function neutralizeNodeProcessForBrowser(): () => void {
  if (typeof window === "undefined") return () => {};

  const proc = (globalThis as { process?: NodeJS.Process }).process;
  if (!proc?.versions || typeof proc.versions.node !== "string") {
    return () => {};
  }

  const versions = proc.versions as Record<string, string | undefined>;
  const previousNode = versions.node;
  try {
    delete versions.node;
  } catch {
    try {
      Object.defineProperty(versions, "node", {
        configurable: true,
        enumerable: true,
        value: undefined,
      });
    } catch {
      /* ignore */
    }
  }

  return () => {
    try {
      if (previousNode !== undefined) versions.node = previousNode;
    } catch {
      /* ignore */
    }
  };
}
