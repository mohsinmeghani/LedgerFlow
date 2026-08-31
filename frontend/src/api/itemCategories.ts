import { apiClient } from './client'
import type { ItemCategory } from '../types'

export async function listItemCategories(): Promise<ItemCategory[]> {
  const response = await apiClient.get<ItemCategory[]>('/item-categories')
  return response.data
}

export async function createItemCategory(name: string): Promise<ItemCategory> {
  const response = await apiClient.post<ItemCategory>('/item-categories', { name })
  return response.data
}
