import { apiClient } from './client'
import type { Payment } from '../types'

export interface PaymentAllocationInput {
  purchase_id: string
  allocated_amount: string
}

export interface PaymentCreateInput {
  supplier_id: string
  payment_date: string
  amount: string
  method: string
  notes?: string | null
  allocations: PaymentAllocationInput[]
}

export async function listPayments(supplierId?: string): Promise<Payment[]> {
  const response = await apiClient.get<Payment[]>('/payments', {
    params: { supplier_id: supplierId || undefined },
  })
  return response.data
}

export async function createPayment(input: PaymentCreateInput): Promise<Payment> {
  const response = await apiClient.post<Payment>('/payments', input)
  return response.data
}
