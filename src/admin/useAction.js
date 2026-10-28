import { useState } from 'react'

// Chạy một thao tác ghi (thêm / sửa / xóa) và giữ thông báo lỗi để hiển thị
export function useAction() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const run = async (fn) => {
    setBusy(true)
    setError('')
    try {
      return await fn()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return { run, busy, error, setError }
}
