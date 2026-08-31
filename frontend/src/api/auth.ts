import { apiClient } from './client'

interface LoginResponse {
  access_token: string
  token_type: string
}

export async function login(username: string, password: string): Promise<string> {
  const form = new URLSearchParams()
  form.set('username', username)
  form.set('password', password)

  const response = await apiClient.post<LoginResponse>('/auth/login', form, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  return response.data.access_token
}
