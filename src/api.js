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

// Địa chỉ máy chủ API. Để trống = cùng địa chỉ với trang (chạy dev, hoặc Express phục vụ cả trang).
// Khi giao diện nằm trên Vercel còn API nằm nơi khác: đặt VITE_API_URL=https://api.ten-mien.vn lúc build.
export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

// Đường dẫn API trả về dạng "/api/..." (ảnh bìa, video) → địa chỉ đầy đủ tới máy chủ API
export const mediaUrl = (path) => (path && path.startsWith('/') ? `${API_BASE}${path}` : path)

const API_MISSING = 'Không kết nối được máy chủ API. Nếu trang được triển khai lên Vercel, hãy đặt biến VITE_API_URL (xem README, mục Triển khai).'

export async function api(path, { method = 'GET', body } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(`${API_BASE}/api${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  } catch {
    throw new Error(API_BASE ? 'Không kết nối được máy chủ API' : API_MISSING)
  }
  // Máy chủ API luôn trả JSON; nhận về HTML (VD: trang 404 của Vercel) nghĩa là đang gọi nhầm chỗ
  const isJson = (res.headers.get('content-type') || '').includes('application/json')
  const data = isJson ? await res.json().catch(() => ({})) : {}
  if (!res.ok || !isJson) {
    const err = new Error(data.error || (isJson ? `Lỗi máy chủ (${res.status})` : API_MISSING))
    err.status = isJson ? res.status : 0
    throw err
  }
  return data
}

// Tải file lên kèm tiến độ (fetch không báo được tiến độ upload nên dùng XMLHttpRequest)
export function uploadFile(path, file, { headers = {}, onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_BASE}/api${path}`)
    const token = getToken()
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v)
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100))
    xhr.onload = () => {
      let data = {}
      try { data = JSON.parse(xhr.responseText) } catch {}
      if (xhr.status >= 200 && xhr.status < 300) resolve(data)
      else reject(new Error(data.error || `Lỗi máy chủ (${xhr.status})`))
    }
    xhr.onerror = () => reject(new Error('Không kết nối được máy chủ'))
    xhr.send(file)
  })
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
