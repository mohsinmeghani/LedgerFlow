import { apiClient } from './client'
import type { Supplier } from '../types'

export interface SupplierInput {
  name: string
  contact?: string | null
  address?: string | null
}

export async function listSuppliers(includeInactive = false): Promise<Supplier[]> {
  const response = await apiClient.get<Supplier[]>('/suppliers', {
    params: { include_inactive: includeInactive },
  })
  return response.data
}

export async function createSupplier(input: SupplierInput): Promise<Supplier> {
  const response = await apiClient.post<Supplier>('/suppliers', input)
  return response.data
}

export async function updateSupplier(id: string, input: Partial<SupplierInput>): Promise<Supplier> {
  const response = await apiClient.put<Supplier>(`/suppliers/${id}`, input)
  return response.data
}

export async function deactivateSupplier(id: string): Promise<Supplier> {
  const response = await apiClient.put<Supplier>(`/suppliers/${id}`, { is_active: false })
  return response.data
}

export async function reactivateSupplier(id: string): Promise<Supplier> {
  const response = await apiClient.put<Supplier>(`/suppliers/${id}`, { is_active: true })
  return response.data
}

export async function deleteSupplier(id: string): Promise<void> {
  await apiClient.delete(`/suppliers/${id}`)
}
