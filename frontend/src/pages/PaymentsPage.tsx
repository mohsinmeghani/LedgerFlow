import { Check, Mic, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { getErrorMessage } from '../api/errors'
import { createPayment, deletePayment, listPayments } from '../api/payments'
import { listPurchases } from '../api/purchases'
import { listSuppliers } from '../api/suppliers'
import { useConfirm } from '../context/ConfirmContext'
import { useToast } from '../context/ToastContext'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import type { Payment, PurchaseWithBalance, Supplier } from '../types'
import { formatDate, formatMoney } from '../utils/format'
import { parseVoicePayment } from '../utils/voicePaymentParser'

const PAYMENT_METHODS = ['cash', 'bank transfer', 'cheque', 'other']

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function PaymentsPage() {
  const { showError, showSuccess } = useToast()
  const confirm = useConfirm()
  const [payments, setPayments] = useState<Payment[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [supplierId, setSupplierId] = useState('')
  const [paymentDate, setPaymentDate] = useState(today())
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState(PAYMENT_METHODS[0])
  const [notes, setNotes] = useState('')
  const [allocations, setAllocations] = useState<Record<string, string>>({})

  const [outstanding, setOutstanding] = useState<PurchaseWithBalance[]>([])
  const [outstandingLoading, setOutstandingLoading] = useState(false)

  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const supplierNameById = new Map(suppliers.map((s) => [s.id, s.name]))

  async function load() {
    setLoading(true)
    setLoadError(null)
    try {
      const [paymentList, supplierList] = await Promise.all([listPayments(), listSuppliers()])
      setPayments(paymentList)
      setSuppliers(supplierList)
    } catch (error) {
      setLoadError(getErrorMessage(error, 'Failed to load payments.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (!supplierId) {
      setOutstanding([])
      setAllocations({})
      return
    }
    setOutstandingLoading(true)
    listPurchases({ supplierId, outstandingOnly: true })
      .then((purchases) => {
        setOutstanding(purchases)
        setAllocations({})
      })
      .catch((error) => setFormError(getErrorMessage(error, 'Failed to load outstanding purchases.')))
      .finally(() => setOutstandingLoading(false))
  }, [supplierId])

  function resetForm() {
    setSupplierId('')
    setPaymentDate(today())
    setAmount('')
    setMethod(PAYMENT_METHODS[0])
    setNotes('')
    setAllocations({})
    setFormError(null)
  }

  function startCreate() {
    resetForm()
    setFormOpen(true)
  }

  function setAllocation(purchaseId: string, value: string) {
    setAllocations((current) => ({ ...current, [purchaseId]: value }))
  }

  const totalAllocated = Object.values(allocations).reduce((sum, value) => {
    const num = Number(value)
    return sum + (Number.isFinite(num) ? num : 0)
  }, 0)
  const paymentAmountNum = Number(amount) || 0
  const overAllocated = totalAllocated > paymentAmountNum + 1e-9

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    if (overAllocated) {
      setFormError('Allocated amount cannot exceed the payment amount.')
      return
    }
    setSubmitting(true)
    try {
      await createPayment({
        supplier_id: supplierId,
        payment_date: paymentDate,
        amount,
        method,
        notes: notes || null,
        allocations: Object.entries(allocations)
          .filter(([, value]) => Number(value) > 0)
          .map(([purchase_id, allocated_amount]) => ({ purchase_id, allocated_amount })),
      })
      setFormOpen(false)
      await load()
    } catch (error) {
      setFormError(getErrorMessage(error, 'Failed to save payment.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(payment: Payment) {
    const confirmed = await confirm({
      title: 'Delete payment?',
      message:
        'Permanently delete this payment? Any allocated purchases will become outstanding again.',
      confirmLabel: 'Delete',
      danger: true,
    })
    if (!confirmed) return
    try {
      await deletePayment(payment.id)
      await load()
    } catch (error) {
      showError(getErrorMessage(error, 'Failed to delete payment.'))
    }
  }

  async function handleVoiceResult(transcript: string) {
    const parsed = parseVoicePayment(transcript, suppliers)
    if ('error' in parsed) {
      showError(parsed.error)
      return
    }

    const confirmed = await confirm({
      title: 'Confirm voice payment',
      message: `Record a cash payment of ${formatMoney(parsed.amount)} to "${parsed.supplier.name}"? (Heard: "${transcript}")`,
      confirmLabel: 'Record Payment',
    })
    if (!confirmed) return

    try {
      await createPayment({
        supplier_id: parsed.supplier.id,
        payment_date: today(),
        amount: String(parsed.amount),
        method: 'cash',
        allocations: [],
      })
      showSuccess(`Recorded payment of ${formatMoney(parsed.amount)} to ${parsed.supplier.name}.`)
      await load()
    } catch (error) {
      showError(getErrorMessage(error, 'Failed to save voice payment.'))
    }
  }

  const {
    isSupported: voiceSupported,
    isListening,
    start: startListening,
  } = useSpeechRecognition({
    onResult: handleVoiceResult,
    onError: (message) => showError(message),
  })

  return (
    <div>
      <div className="page-header">
        <h1>Payments</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {voiceSupported && (
            <button
              className={`btn btn-secondary${isListening ? ' btn-listening' : ''}`}
              type="button"
              onClick={startListening}
              disabled={isListening || suppliers.length === 0}
              title='Say something like "paid kamal 1000"'
            >
              <Mic className="icon" size={16} />
              {isListening ? 'Listening…' : 'Voice Payment'}
            </button>
          )}
          <button className="btn" type="button" onClick={startCreate} disabled={suppliers.length === 0}>
            <Plus className="icon" size={16} />
            Add Payment
          </button>
        </div>
      </div>

      {!loading && suppliers.length === 0 && <p className="muted">Add a supplier before recording a payment.</p>}

      {formOpen && (
        <form className="card" onSubmit={handleSubmit}>
          <h2 style={{ marginTop: 0 }}>New Payment</h2>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="payment-supplier">Supplier</label>
              <select
                id="payment-supplier"
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
              <label htmlFor="payment-date">Payment Date</label>
              <input
                id="payment-date"
                type="date"
                value={paymentDate}
                onChange={(event) => setPaymentDate(event.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="payment-amount">Amount</label>
              <input
                id="payment-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="payment-method">Method</label>
              <select id="payment-method" value={method} onChange={(event) => setMethod(event.target.value)}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="payment-notes">Notes (optional)</label>
              <input id="payment-notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
            </div>
          </div>

          {supplierId && (
            <>
              <h2>Allocate to Outstanding Purchases</h2>
              {outstandingLoading && <p className="muted">Loading outstanding purchases…</p>}
              {!outstandingLoading && outstanding.length === 0 && (
                <p className="muted">This supplier has no outstanding purchases.</p>
              )}
              {!outstandingLoading && outstanding.length > 0 && (
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Invoice #</th>
                      <th className="text-right">Total</th>
                      <th className="text-right">Outstanding</th>
                      <th className="text-right">Allocate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outstanding.map((purchase) => (
                      <tr key={purchase.id}>
                        <td>{formatDate(purchase.purchase_date)}</td>
                        <td>{purchase.invoice_no || '—'}</td>
                        <td className="text-right">{formatMoney(purchase.total_amount)}</td>
                        <td className="text-right">{formatMoney(purchase.balance)}</td>
                        <td className="text-right">
                          <input
                            id={`allocation-${purchase.id}`}
                            name={`allocation-${purchase.id}`}
                            aria-label={`Allocate to purchase ${purchase.invoice_no || purchase.id}`}
                            type="number"
                            min="0"
                            max={purchase.balance}
                            step="0.01"
                            style={{ width: '7rem', textAlign: 'right' }}
                            value={allocations[purchase.id] ?? ''}
                            onChange={(event) => setAllocation(purchase.id, event.target.value)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={4} className="text-right">
                        <strong>Total allocated</strong>
                      </td>
                      <td className="text-right">
                        <strong className={overAllocated ? 'error-text' : ''}>
                          {formatMoney(totalAllocated)}
                        </strong>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </>
          )}

          {formError && <div className="error-text">{formError}</div>}
          <div className="form-actions">
            <button className="btn" type="submit" disabled={submitting || overAllocated}>
              <Check className="icon" size={16} />
              {submitting ? 'Saving…' : 'Save Payment'}
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
              <th className="text-right">Amount</th>
              <th>Method</th>
              <th>Notes</th>
              <th>Allocations</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td>{formatDate(payment.payment_date)}</td>
                <td>{supplierNameById.get(payment.supplier_id) ?? '—'}</td>
                <td className="text-right">{formatMoney(payment.amount)}</td>
                <td>{payment.method}</td>
                <td>{payment.notes || '—'}</td>
                <td>{payment.allocations.length} purchase(s)</td>
                <td>
                  <button className="btn btn-danger" type="button" onClick={() => handleDelete(payment)}>
                    <Trash2 className="icon" size={14} />
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr>
                <td colSpan={7} className="muted">
                  No payments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}
