import { useEffect, useRef, useState } from 'react'
import { api, mediaUrl, uploadFile, useApi } from '../api.js'

const formatSize = (bytes) => (bytes >= 1024 ** 2 ? `${(bytes / 1024 ** 2).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`)

// Cửa sổ thư viện ảnh: tải ảnh lên, chọn ảnh làm ảnh bìa, xóa ảnh không còn dùng
export default function ImageLibrary({ selected, onSelect, onClose }) {
  const { data: images, loading, error, reload } = useApi('/admin/images')
  const input = useRef(null)
  const [uploading, setUploading] = useState(null)
  const [message, setMessage] = useState('')

  // Đóng bằng phím Esc
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const upload = async (files) => {
    setMessage('')
    let last = null
    for (const [i, file] of [...files].entries()) {
      setUploading({ index: i + 1, total: files.length, progress: 0 })
      try {
        last = await uploadFile('/admin/images', file, {
          headers: { 'X-Filename': encodeURIComponent(file.name) },
          onProgress: (progress) => setUploading({ index: i + 1, total: files.length, progress }),
        })
      } catch (err) {
        setMessage(`${file.name}: ${err.message}`)
      }
    }
    setUploading(null)
    if (input.current) input.current.value = ''
    reload()
    // Tải đúng 1 ảnh thì chọn luôn ảnh đó
    if (files.length === 1 && last) onSelect(last)
  }

  const remove = async (img) => {
    if (!window.confirm(`Xóa ảnh “${img.name}” khỏi thư viện?`)) return
    setMessage('')
    try {
      await api(`/admin/images/${img.id}`, { method: 'DELETE' })
      reload()
    } catch (err) {
      setMessage(err.message)
    }
  }

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-box library" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Thư viện ảnh">
        <div className="admin-head">
          <h3>Thư viện ảnh</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Đóng">✕</button>
        </div>
        <div className="library-bar">
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden
            onChange={(e) => e.target.files.length && upload(e.target.files)} />
          <button type="button" className="btn-primary" onClick={() => input.current.click()} disabled={!!uploading}>
            ⬆ Tải ảnh lên
          </button>
          {uploading
            ? <span className="upload-progress"><span className="bar"><span style={{ width: `${uploading.progress}%` }} /></span>Ảnh {uploading.index}/{uploading.total} · {uploading.progress}%</span>
            : <small className="muted">JPG, PNG, WebP, GIF · tối đa 5 MB · nên dùng ảnh ngang 16:9 (VD 1280×720)</small>}
        </div>
        {message && <p className="error">{message}</p>}

        {!images ? (
          <p className="muted">{loading ? 'Đang tải…' : error?.message}</p>
        ) : images.length ? (
          <div className="library-grid">
            {images.map((img) => (
              <figure key={img.id} className={`library-item ${img.file === selected ? 'on' : ''}`}>
                <button type="button" className="library-pick" onClick={() => onSelect(img)} title="Chọn ảnh này">
                  <img src={mediaUrl(img.url)} alt={img.name} loading="lazy" />
                </button>
                <figcaption>
                  <span className="library-name" title={img.name}>{img.name}</span>
                  <small className="muted">{formatSize(img.size)}{img.usedBy ? ` · dùng cho ${img.usedBy} khóa` : ''}</small>
                </figcaption>
                {!img.usedBy && (
                  <button type="button" className="library-delete" onClick={() => remove(img)} aria-label={`Xóa ${img.name}`}>✕</button>
                )}
              </figure>
            ))}
          </div>
        ) : (
          <div className="library-empty">
            <p className="muted">Thư viện chưa có ảnh nào.</p>
            <button type="button" className="btn-outline" onClick={() => input.current.click()}>Tải ảnh đầu tiên</button>
          </div>
        )}
      </div>
    </div>
  )
}
