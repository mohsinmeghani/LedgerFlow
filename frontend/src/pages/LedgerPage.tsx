import { useEffect, useState } from 'react'
import { getErrorMessage } from '../api/errors'
import { getSupplierLedger } from '../api/ledger'
import { listSuppliers } from '../api/suppliers'
import type { Supplier, SupplierLedgerResponse } from '../types'
import { formatDate, formatMoney } from '../utils/format'

export function LedgerPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [supplierId, setSupplierId] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const [ledger, setLedger] = useState<SupplierLedgerResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listSuppliers(true).then(setSuppliers).catch(() => setSuppliers([]))
  }, [])

  async function loadLedger(id: string, from: string, to: string) {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      setLedger(await getSupplierLedger(id, from, to))
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load ledger.'))
      setLedger(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (supplierId) {
      loadLedger(supplierId, fromDate, toDate)
    } else {
      setLedger(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId])

  function handleApplyFilter() {
    loadLedger(supplierId, fromDate, toDate)
  }

  function handleClearFilter() {
    setFromDate('')
    setToDate('')
    loadLedger(supplierId, '', '')
  }

  return (
    <div>
      <h1>Supplier Ledger</h1>

      <div className="card">
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="ledger-supplier">Supplier</label>
            <select
              id="ledger-supplier"
              value={supplierId}
              onChange={(event) => setSupplierId(event.target.value)}
            >
              <option value="">Select supplier…</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="ledger-from">From</label>
            <input
              id="ledger-from"
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="ledger-to">To</label>
            <input
              id="ledger-to"
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
            />
          </div>
        </div>
        <div className="form-actions">
          <button className="btn" type="button" onClick={handleApplyFilter} disabled={!supplierId}>
            Apply Filter
          </button>
          <button className="btn btn-secondary" type="button" onClick={handleClearFilter} disabled={!supplierId}>
            Clear Filter
          </button>
        </div>
      </div>

      {!supplierId && <p className="muted">Select a supplier to view their ledger.</p>}
      {loading && <p className="muted">Loading…</p>}
      {error && <div className="error-text">{error}</div>}

      {ledger && !loading && (
        <>
          <div className="stat-row">
            <div className="stat-card">
              <div className="stat-label">Current Outstanding Balance</div>
              <div className="stat-value">{formatMoney(ledger.current_outstanding_balance)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Opening Balance {ledger.from_date ? `(as of ${formatDate(ledger.from_date)})` : ''}</div>
              <div className="stat-value">{formatMoney(ledger.opening_balance)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Closing Balance {ledger.to_date ? `(as of ${formatDate(ledger.to_date)})` : ''}</div>
              <div className="stat-value">{formatMoney(ledger.closing_balance)}</div>
            </div>
          </div>

          <h2>{ledger.supplier_name} — Statement</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Reference</th>
                <th className="text-right">Purchase (Dr)</th>
                <th className="text-right">Payment (Cr)</th>
                <th className="text-right">Running Balance</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5}>
                  <em>Opening balance</em>
                </td>
                <td className="text-right">
                  <strong>{formatMoney(ledger.opening_balance)}</strong>
                </td>
              </tr>
              {ledger.entries.map((entry) => (
                <tr key={`${entry.type}-${entry.id}`}>
                  <td>{formatDate(entry.date)}</td>
                  <td style={{ textTransform: 'capitalize' }}>{entry.type}</td>
                  <td>{entry.reference || '—'}</td>
                  <td className="text-right">{Number(entry.debit) > 0 ? formatMoney(entry.debit) : ''}</td>
                  <td className="text-right">{Number(entry.credit) > 0 ? formatMoney(entry.credit) : ''}</td>
                  <td className="text-right">{formatMoney(entry.running_balance)}</td>
                </tr>
              ))}
              {ledger.entries.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">
                    No transactions in this range.
                  </td>
                </tr>
              )}
              <tr>
                <td colSpan={5}>
                  <em>Closing balance</em>
                </td>
                <td className="text-right">
                  <strong>{formatMoney(ledger.closing_balance)}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}
