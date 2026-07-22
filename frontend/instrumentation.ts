export async function register() {
  // Reserved for future server boot hooks (no third-party APM).
}

export const onRequestError = async (
  err: unknown,
  request: { path: string },
  context: { routerKind?: string; routePath?: string },
) => {
  const { reportError } = await import('./lib/observability/error-reporting')
  await reportError(err, {
    route: context.routePath || request.path,
    tags: { routerKind: context.routerKind || 'unknown' },
  })
}
