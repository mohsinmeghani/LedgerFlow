import { apiClient } from './client'
import type { Purchase, PurchaseWithBalance } from '../types'

export interface PurchaseLineItemInput {
  item_id: string
  quantity: string
  rate: string
}

export interface PurchaseCreateInput {
  supplier_id: string
  purchase_date: string
  invoice_no?: string | null
  line_items: PurchaseLineItemInput[]
}

export async function listPurchases(params?: {
  supplierId?: string
  outstandingOnly?: boolean
}): Promise<PurchaseWithBalance[]> {
  const response = await apiClient.get<PurchaseWithBalance[]>('/purchases', {
    params: {
      supplier_id: params?.supplierId || undefined,
      outstanding_only: params?.outstandingOnly || undefined,
    },
  })
  return response.data
}

export async function getPurchase(id: string): Promise<PurchaseWithBalance> {
  const response = await apiClient.get<PurchaseWithBalance>(`/purchases/${id}`)
  return response.data
}

export async function createPurchase(input: PurchaseCreateInput): Promise<Purchase> {
  const response = await apiClient.post<Purchase>('/purchases', input)
  return response.data
}

export async function deletePurchase(id: string): Promise<void> {
  await apiClient.delete(`/purchases/${id}`)
}
