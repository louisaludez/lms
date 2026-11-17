import axios from 'axios'

const backendUrl = import.meta.env.VITE_BACKEND_URL?.replace(/\/+$/, '')

const api = axios.create({
  baseURL: backendUrl ? `${backendUrl}/api/v1` : '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

export function assetUrl(url: string | null | undefined): string {
  if (!url) return ''
  if (/^[a-z][a-z\d+.-]*:/i.test(url) || !backendUrl) return url
  return new URL(url, `${backendUrl}/`).toString()
}

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lumina_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('lumina_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
