import type { FetchError } from 'ofetch'

export interface FieldError {
  name: string
  /** A `fieldErr.*` locale code sent by the server, not prose. */
  message: string
  params?: Record<string, unknown>
}

export interface ApiShortage {
  name: string
  sku: string
  unit: string
  required: number
  available: number
  missing: number
}

/** Error codes whose params reference the order status machine. */
const STATUS_PARAM_CODES = new Set([
  'ORDER_LOCKED',
  'ORDER_RACE',
  'ORDER_TRANSITION',
  'ORDER_TRANSITION_TERMINAL'
])

/** Normalises the many shapes an H3 error can arrive in. */
export function extractApiError(error: unknown) {
  const fetchError = error as FetchError<{
    statusMessage?: string
    message?: string
    data?: {
      code?: string
      params?: Record<string, unknown>
      errors?: FieldError[]
      shortages?: ApiShortage[]
    }
  }>

  const payload = fetchError?.data
  const nested = payload?.data

  return {
    status: fetchError?.statusCode ?? 500,
    /** Stable machine code the API attached; absent for framework errors. */
    code: nested?.code,
    params: nested?.params ?? {},
    message: payload?.message || payload?.statusMessage || fetchError?.message || '',
    fieldErrors: nested?.errors ?? [],
    shortages: (nested?.shortages ?? []) as ApiShortage[]
  }
}

/**
 * Wraps a mutation with consistent success/error toasts and returns the
 * parsed error so a form can also apply per-field messages.
 *
 * The API speaks in stable error codes, so this is the single place that turns
 * them into text in the operator's active language.
 */
export function useApiToast() {
  const toast = useToast()
  const { t, te } = useI18n()
  const { orderStatus } = useLabels()

  function translateCode(prefix: 'apiErr' | 'fieldErr', code?: string, params: Record<string, unknown> = {}) {
    if (!code) return ''
    const key = `${prefix}.${code}`
    return te(key) ? t(key, params) : ''
  }

  /** Status codes travel inside params; render them in the active locale. */
  function localizeParams(code: string, params: Record<string, unknown>) {
    if (!STATUS_PARAM_CODES.has(code)) return params

    const label = (value: unknown) => orderStatus(String(value)).label

    return {
      ...params,
      ...(params.status !== undefined ? { status: label(params.status) } : {}),
      ...(params.from !== undefined ? { from: label(params.from) } : {}),
      ...(params.to !== undefined ? { to: label(params.to) } : {}),
      ...(Array.isArray(params.allowed)
        ? { allowed: params.allowed.map(status => label(status)).join(', ') }
        : {})
    }
  }

  /** Localized message for an API error — used for inline alerts too. */
  function describe(err: unknown) {
    const parsed = extractApiError(err)

    if (parsed.code) {
      return translateCode('apiErr', parsed.code, localizeParams(parsed.code, parsed.params))
        || t('error.somethingWrong')
    }

    return parsed.message || t('error.somethingWrong')
  }

  /** Field messages arrive as codes so the form can show them translated. */
  function localizeFields(fields: FieldError[]) {
    return fields.map(field => ({
      name: field.name,
      message: translateCode('fieldErr', field.message, field.params ?? {}) || field.message
    }))
  }

  function success(title: string, description?: string) {
    toast.add({ title, description, icon: 'i-lucide-circle-check', color: 'success' })
  }

  function info(title: string, description?: string) {
    toast.add({ title, description, icon: 'i-lucide-info', color: 'info' })
  }

  function error(err: unknown, fallbackTitle?: string) {
    const parsed = extractApiError(err)
    const fieldErrors = localizeFields(parsed.fieldErrors)

    const description = parsed.shortages.length
      ? parsed.shortages
          .map(shortage => t('apiErr.shortageLine', {
            name: shortage.name || t('apiErr.unknownMaterial'),
            required: shortage.required,
            available: shortage.available,
            unit: shortage.unit
          }))
          .join(' · ')
      : fieldErrors.map(field => field.message).join(' · ') || undefined

    toast.add({
      title: describe(err) || fallbackTitle || t('error.requestFailed'),
      description,
      icon: 'i-lucide-triangle-alert',
      color: 'error',
      duration: parsed.shortages.length ? 10_000 : 6_000
    })

    return { ...parsed, fieldErrors }
  }

  return { success, info, error, describe }
}
