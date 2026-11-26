import { getApiBase, useAuth } from './auth'

export type Envelope<T> = { success: boolean; message?: string; data?: T }

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<Envelope<T>> {
  const headers: Record<string, string> = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...((options.headers as Record<string, string>) || {}),
  }
  const { token } = useAuth.getState()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${getApiBase()}${path}`, { ...options, headers })

  let body: Envelope<T> | null = null
  try {
    body = await res.json()
  } catch {
    console.error("fucked up!?");
  }

  // Expired session (but not a failed login attempt)
  if (res.status === 401 && path !== '/admin/login') {
    useAuth.getState().logout()
    throw new ApiError('Session expired — log in again', 401)
  }

  if (!res.ok || body?.success === false) {
    throw new ApiError(body?.message || `HTTP ${res.status}`, res.status)
  }

  return body ?? { success: true }
}

export const money = (v?: string | number | null) => `₹${v ?? '0.00'}`

export const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleString() : '—'

/** Backend sometimes returns a bare array, sometimes { items: [...] } */
export function toList<T>(d: T[] | { items?: T[] } | null | undefined): T[] {
  return Array.isArray(d) ? d : (d?.items ?? [])
}
