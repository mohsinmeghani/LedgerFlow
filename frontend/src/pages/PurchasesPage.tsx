import { Check, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { getErrorMessage } from '../api/errors'
import { listItems } from '../api/items'
import {
  createPurchase,
  deletePurchase,
  listPurchases,
  type PurchaseLineItemInput,
} from '../api/purchases'
import { listSuppliers } from '../api/suppliers'
import { useConfirm } from '../context/ConfirmContext'
import { useToast } from '../context/ToastContext'
import type { Item, PurchaseWithBalance, Supplier } from '../types'
import { formatDate, formatMoney, statusLabel } from '../utils/format'

interface LineItemRow extends PurchaseLineItemInput {
  key: number
}

function emptyRow(key: number): LineItemRow {
  return { key, item_id: '', quantity: '', rate: '' }
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function PurchasesPage() {
  const { showError } = useToast()
  const confirm = useConfirm()
  const [purchases, setPurchases] = useState<PurchaseWithBalance[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [supplierId, setSupplierId] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(today())
  const [invoiceNo, setInvoiceNo] = useState('')
  const [rows, setRows] = useState<LineItemRow[]>([emptyRow(0)])
  const [nextKey, setNextKey] = useState(1)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const supplierNameById = new Map(suppliers.map((s) => [s.id, s.name]))

  async function load() {
    setLoading(true)
    setLoadError(null)
    try {
      const [purchaseList, supplierList, itemList] = await Promise.all([
        listPurchases(),
        listSuppliers(),
        listItems(),
      ])
      setPurchases(purchaseList)
      setSuppliers(supplierList)
      setItems(itemList)
    } catch (error) {
      setLoadError(getErrorMessage(error, 'Failed to load purchases.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function resetForm() {
    setSupplierId('')
    setPurchaseDate(today())
    setInvoiceNo('')
    setRows([emptyRow(0)])
    setNextKey(1)
    setFormError(null)
  }

  function startCreate() {
    resetForm()
    setFormOpen(true)
  }

  function updateRow(key: number, changes: Partial<LineItemRow>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...changes } : row)))
  }

  function addRow() {
    setRows((current) => [...current, emptyRow(nextKey)])
    setNextKey((k) => k + 1)
  }

  function removeRow(key: number) {
    setRows((current) => (current.length > 1 ? current.filter((row) => row.key !== key) : current))
  }

  const invoiceTotal = rows.reduce((sum, row) => {
    const qty = Number(row.quantity)
    const rate = Number(row.rate)
    if (!Number.isFinite(qty) || !Number.isFinite(rate)) return sum
    return sum + qty * rate
  }, 0)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setFormError(null)
    try {
      await createPurchase({
        supplier_id: supplierId,
        purchase_date: purchaseDate,
        invoice_no: invoiceNo || null,
        line_items: rows.map(({ item_id, quantity, rate }) => ({ item_id, quantity, rate })),
      })
      setFormOpen(false)
      await load()
    } catch (error) {
      setFormError(getErrorMessage(error, 'Failed to save purchase.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(purchase: PurchaseWithBalance) {
    const confirmed = await confirm({
      title: 'Delete purchase?',
      message: `Permanently delete this purchase (${purchase.invoice_no || purchase.id})? This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    })
    if (!confirmed) return
    try {
      await deletePurchase(purchase.id)
      await load()
    } catch (error) {
      showError(getErrorMessage(error, 'Failed to delete purchase.'))
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Purchases</h1>
        <button className="btn" type="button" onClick={startCreate} disabled={suppliers.length === 0 || items.length === 0}>
          <Plus className="icon" size={16} />
          Add Purchase
        </button>
      </div>

      {!loading && (suppliers.length === 0 || items.length === 0) && (
        <p className="muted">Add at least one supplier and one item before recording a purchase.</p>
      )}

      {formOpen && (
        <form className="card" onSubmit={handleSubmit}>
          <h2 style={{ marginTop: 0 }}>New Purchase</h2>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="purchase-supplier">Supplier</label>
              <select
                id="purchase-supplier"
                value={supplierId}
                onChange={(event) => setSupplierId(event.target.value)}
                required
              >
                <option value="" disabled>
                  Select supplier…
                </option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="purchase-date">Purchase Date</label>
              <input
                id="purchase-date"
                type="date"
                value={purchaseDate}
                onChange={(event) => setPurchaseDate(event.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="purchase-invoice">Invoice No (optional)</label>
              <input
                id="purchase-invoice"
                value={invoiceNo}
                onChange={(event) => setInvoiceNo(event.target.value)}
              />
            </div>
          </div>

          <h2>Line Items</h2>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Quantity</th>
                <th>Rate</th>
                <th className="text-right">Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const qty = Number(row.quantity)
                const rate = Number(row.rate)
                const amount = Number.isFinite(qty) && Number.isFinite(rate) ? qty * rate : 0
                return (
                  <tr key={row.key}>
                    <td>
                      <select
                        id={`line-item-${row.key}-item`}
                        name={`line-item-${row.key}-item`}
                        aria-label={`Item for line ${row.key + 1}`}
                        value={row.item_id}
                        onChange={(event) => updateRow(row.key, { item_id: event.target.value })}
                        required
                      >
                        <option value="" disabled>
                          Select item…
                        </option>
                        {items.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} ({item.unit})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        id={`line-item-${row.key}-quantity`}
                        name={`line-item-${row.key}-quantity`}
                        aria-label={`Quantity for line ${row.key + 1}`}
                        type="number"
                        min="0"
                        step="0.001"
                        value={row.quantity}
                        onChange={(event) => updateRow(row.key, { quantity: event.target.value })}
                        required
                        style={{ width: '6.5rem' }}
                      />
                    </td>
                    <td>
                      <input
                        id={`line-item-${row.key}-rate`}
                        name={`line-item-${row.key}-rate`}
                        aria-label={`Rate for line ${row.key + 1}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.rate}
                        onChange={(event) => updateRow(row.key, { rate: event.target.value })}
                        required
                        style={{ width: '6.5rem' }}
                      />
                    </td>
                    <td className="text-right">{formatMoney(amount)}</td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        type="button"
                        onClick={() => removeRow(row.key)}
                        disabled={rows.length === 1}
                      >
                        <Trash2 className="icon" size={14} />
                        Remove
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}>
                  <button className="btn btn-secondary" type="button" onClick={addRow}>
                    <Plus className="icon" size={14} />
                    Add Line
                  </button>
                </td>
                <td className="text-right">
                  <strong>{formatMoney(invoiceTotal)}</strong>
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>

          {formError && <div className="error-text">{formError}</div>}
          <div className="form-actions">
            <button className="btn" type="submit" disabled={submitting}>
              <Check className="icon" size={16} />
              {submitting ? 'Saving…' : 'Save Purchase'}
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => setFormOpen(false)}
              disabled={submitting}
            >
              <X className="icon" size={16} />
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading && <p className="muted">Loading…</p>}
      {loadError && <div className="error-text">{loadError}</div>}

      {!loading && !loadError && (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Supplier</th>
              <th>Invoice #</th>
              <th className="text-right">Total</th>
              <th className="text-right">Paid</th>
              <th className="text-right">Balance</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((purchase) => (
              <tr key={purchase.id}>
                <td>{formatDate(purchase.purchase_date)}</td>
                <td>{supplierNameById.get(purchase.supplier_id) ?? '—'}</td>
                <td>{purchase.invoice_no || '—'}</td>
                <td className="text-right">{formatMoney(purchase.total_amount)}</td>
                <td className="text-right">{formatMoney(purchase.amount_paid)}</td>
                <td className="text-right">{formatMoney(purchase.balance)}</td>
                <td>
                  <span className={`badge badge-${purchase.status}`}>
                    {statusLabel(purchase.status)}
                  </span>
                </td>
                <td>
                  <button className="btn btn-danger" type="button" onClick={() => handleDelete(purchase)}>
                    <Trash2 className="icon" size={14} />
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {purchases.length === 0 && (
              <tr>
                <td colSpan={8} className="muted">
                  No purchases yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}
