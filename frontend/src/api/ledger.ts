import { apiClient } from './client'
import type { SupplierLedgerResponse } from '../types'

export async function getSupplierLedger(
  supplierId: string,
  fromDate?: string,
  toDate?: string,
): Promise<SupplierLedgerResponse> {
  const response = await apiClient.get<SupplierLedgerResponse>(`/suppliers/${supplierId}/ledger`, {
    params: {
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
    },
  })
  return response.data
}
