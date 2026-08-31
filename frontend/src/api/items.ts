import { apiClient } from './client'
import type { Item } from '../types'

export interface ItemInput {
  name: string
  unit: string
  category?: string | null
}

export async function listItems(): Promise<Item[]> {
  const response = await apiClient.get<Item[]>('/items')
  return response.data
}

export async function createItem(input: ItemInput): Promise<Item> {
  const response = await apiClient.post<Item>('/items', input)
  return response.data
}

export async function updateItem(id: string, input: Partial<ItemInput>): Promise<Item> {
  const response = await apiClient.put<Item>(`/items/${id}`, input)
  return response.data
}
