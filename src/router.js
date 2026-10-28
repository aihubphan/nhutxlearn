import { useEffect, useState } from 'react'

// Router đơn giản dựa trên hash: #/khoa-hoc/3?chu-de=tech
const parse = () => {
  const raw = window.location.hash.slice(1) || '/'
  const [path, qs = ''] = raw.split('?')
  return {
    parts: path.split('/').filter(Boolean).map(decodeURIComponent),
    query: Object.fromEntries(new URLSearchParams(qs)),
  }
}

export function useRoute() {
  const [route, setRoute] = useState(parse)

  useEffect(() => {
    const onChange = () => {
      setRoute(parse())
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return route
}

export const navigate = (to) => {
  window.location.hash = to.replace(/^#/, '')
}
