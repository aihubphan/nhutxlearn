import { useEffect, useState } from 'react'

const TOKEN_KEY = 'token'

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export const setToken = (token) => {
  try {
    token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY)
  } catch {}
}

export async function api(path, { method = 'GET', body } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(`/api${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  } catch {
    throw new Error('Không kết nối được máy chủ')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `Lỗi máy chủ (${res.status})`)
    err.status = res.status
    throw err
  }
  return data
}

// Dữ liệu ít thay đổi (chủ đề, gói hội viên, trang tĩnh) được nhớ lại trong phiên
const cache = new Map()

export function useApi(path, { cached = false, deps = [] } = {}) {
  const [tick, setTick] = useState(0)
  const [state, setState] = useState(() =>
    cached && cache.has(path) ? { data: cache.get(path), loading: false, error: null } : { data: undefined, loading: true, error: null }
  )

  // Gọi lại API (ví dụ sau khi thêm / sửa / xóa ở trang quản trị)
  const reload = () => {
    cache.delete(path)
    setTick((t) => t + 1)
  }

  useEffect(() => {
    if (!path) return
    if (cached && cache.has(path)) {
      setState({ data: cache.get(path), loading: false, error: null })
      return
    }
    let alive = true
    setState((s) => ({ ...s, loading: true, error: null }))
    api(path)
      .then((data) => {
        if (cached) cache.set(path, data)
        if (alive) setState({ data, loading: false, error: null })
      })
      .catch((error) => alive && setState({ data: undefined, loading: false, error }))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, tick, ...deps])

  return { ...state, reload }
}

export const useTopics = () => useApi('/topics', { cached: true }).data || []
