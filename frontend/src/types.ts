export interface Supplier {
  id: string
  name: string
  contact: string | null
  address: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ItemCategory {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export interface Item {
  id: string
  name: string
  unit: string
  category_id: string | null
  created_at: string
  updated_at: string
}

export interface PurchaseLineItem {
  id: string
  item_id: string
  quantity: string
  rate: string
  amount: string
}

export type PurchaseStatus = 'unpaid' | 'partially_paid' | 'paid'

export interface Purchase {
  id: string
  supplier_id: string
  purchase_date: string
  invoice_no: string | null
  total_amount: string
  line_items: PurchaseLineItem[]
  created_at: string
  updated_at: string
}

export interface PurchaseWithBalance extends Purchase {
  amount_paid: string
  balance: string
  status: PurchaseStatus
}

export interface PaymentAllocation {
  id: string
  purchase_id: string
  allocated_amount: string
}

export interface Payment {
  id: string
  supplier_id: string
  payment_date: string
  amount: string
  method: string
  notes: string | null
  allocations: PaymentAllocation[]
  created_at: string
}

export interface LedgerEntry {
  type: 'purchase' | 'payment'
  id: string
  date: string
  reference: string | null
  debit: string
  credit: string
  running_balance: string
}

export interface SupplierLedgerResponse {
  supplier_id: string
  supplier_name: string
  from_date: string | null
  to_date: string | null
  opening_balance: string
  closing_balance: string
  current_outstanding_balance: string
  entries: LedgerEntry[]
}

export interface SupplierBalanceSummary {
  supplier_id: string
  supplier_name: string
  outstanding_balance: string
}

export interface RecentActivityItem {
  type: 'purchase' | 'payment'
  id: string
  date: string
  supplier_id: string
  supplier_name: string
  amount: string
  reference: string | null
}

export interface DashboardResponse {
  total_outstanding: string
  suppliers_by_outstanding: SupplierBalanceSummary[]
  recent_activity: RecentActivityItem[]
}
