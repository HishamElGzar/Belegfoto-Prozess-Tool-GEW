import { projectId, publicAnonKey } from './supabase/info'

export const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/server/make-server-b2ee3d82`

const getHeaders = () => ({
  'Authorization': `Bearer ${publicAnonKey}`,
  'Content-Type': 'application/json',
})

export const apiGet = async (path: string) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'GET',
    headers: getHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || errorData.details || `HTTP ${response.status}`)
  }

  return response.json()
}

export const apiPost = async (path: string, data?: any) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: getHeaders(),
    body: data ? JSON.stringify(data) : undefined,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || errorData.details || `HTTP ${response.status}`)
  }

  return response.json()
}

export const apiPut = async (path: string, data: any) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || errorData.details || `HTTP ${response.status}`)
  }

  return response.json()
}

export const apiPatch = async (path: string, data: any) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || errorData.details || `HTTP ${response.status}`)
  }

  return response.json()
}

export const apiDelete = async (path: string) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'DELETE',
    headers: getHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || errorData.details || `HTTP ${response.status}`)
  }

  return response.json()
}