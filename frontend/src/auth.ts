import { ref } from 'vue'
import { apiBase } from './api.ts'

const TOKEN_KEY = 'pd_token'

export const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))
export const isAuthenticated = ref(!!localStorage.getItem(TOKEN_KEY))

export async function login(username: string, password: string) {
  const res = await fetch(`${apiBase}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })

  if (!res.ok) {
    let message = 'Login gagal'
    try {
      const parsed = await res.json()
      if (parsed && parsed.error) message = parsed.error
    } catch {
      const text = await res.text()
      if (text) message = text
    }
    throw new Error(message)
  }

  const data = await res.json()
  token.value = data.token
  isAuthenticated.value = true
  localStorage.setItem(TOKEN_KEY, data.token)
  return data
}

export function logout() {
  token.value = null
  isAuthenticated.value = false
  localStorage.removeItem(TOKEN_KEY)
}
