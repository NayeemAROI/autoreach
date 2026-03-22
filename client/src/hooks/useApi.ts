import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '@/utils/api'

interface UseApiResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Generic data-fetching hook for the new dashboard pages.
 * Wraps the existing apiFetch utility (JWT auth + auto-refresh).
 * 
 * @param url - API endpoint to fetch (e.g. '/api/admin/users')
 * @param defaultValue - Optional fallback value while loading (prevents null access crashes)
 */
export function useApi<T>(url: string | null, defaultValue?: T): UseApiResult<T> {
  const [data, setData] = useState<T | null>(defaultValue ?? null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!url) { setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch(url)
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody.error || `API error ${res.status}`)
      }
      const json = await res.json()
      setData(json)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch')
      console.error(`[useApi] ${url}:`, err)
    } finally {
      setLoading(false)
    }
  }, [url])

  useEffect(() => { fetchData() }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}

/**
 * Convenience hook for POST/PUT/DELETE mutations.
 */
export function useMutation<T = any>() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = async (url: string, options: RequestInit = {}): Promise<T | null> => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch(url, options)
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || `Error ${res.status}`)
      return json as T
    } catch (err: any) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }

  return { mutate, loading, error }
}
