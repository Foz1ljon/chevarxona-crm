/**
 * API errors carry a stable machine `code` instead of a prose message, so the
 * client can render them in whichever locale the operator picked. `message` is
 * set to the same code purely for server logs and stack traces — it is never
 * shown to the user. `params` holds the values the client interpolates.
 */
export function apiError(
  code: string,
  statusCode: number,
  options: {
    params?: Record<string, unknown>
    data?: Record<string, unknown>
  } = {}
) {
  return createError({
    statusCode,
    message: code,
    data: {
      code,
      params: options.params ?? {},
      ...(options.data ?? {})
    }
  })
}
