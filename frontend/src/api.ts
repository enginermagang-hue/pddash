const apiBase =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? '' : 'http://localhost:3000')

export { apiBase }

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('pd_token')
  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(`${apiBase}${path}`, { ...options, headers })
  const text = await res.text()

  if (res.status === 401) {
    localStorage.removeItem('pd_token')
    window.location.assign('/login')
    throw new Error('Sesi berakhir, silakan login kembali')
  }

  if (!res.ok) {
    let message = `API error ${res.status}`
    try {
      const parsed = JSON.parse(text)
      if (parsed && parsed.error) message = parsed.error
    } catch {
      if (text) message = text
    }
    throw new Error(message)
  }

  return text ? JSON.parse(text) : null
}

export default apiFetch
