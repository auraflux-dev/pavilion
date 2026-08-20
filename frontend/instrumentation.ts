export async function register() {
  // Reserved for future server boot hooks (no third-party APM).
}

export const onRequestError = async (
  err: unknown,
  request: { path: string },
  context: { routerKind?: string; routePath?: string },
) => {
  const { isTransientNetworkError } = await import('./lib/fetch-with-retry')
  // Wix API blips often still render the page (200). Do not fill ErrorEvents / OPS noise.
  if (isTransientNetworkError(err)) {
    console.warn(
      '[transient]',
      context.routePath || request.path,
      err instanceof Error ? err.message : err,
    )
    return
  }
  const { reportError } = await import('./lib/observability/error-reporting')
  await reportError(err, {
    route: context.routePath || request.path,
    tags: { routerKind: context.routerKind || 'unknown' },
  })
}
