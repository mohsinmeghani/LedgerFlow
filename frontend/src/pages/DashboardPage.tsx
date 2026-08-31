import { useEffect, useState } from 'react'
import { getDashboard } from '../api/dashboard'
import { getErrorMessage } from '../api/errors'
import type { DashboardResponse } from '../types'
import { formatDate, formatMoney } from '../utils/format'

export function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getDashboard()
      .then(setDashboard)
      .catch((err) => setError(getErrorMessage(err, 'Failed to load dashboard.')))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <h1>Dashboard</h1>

      {loading && <p className="muted">Loading…</p>}
      {error && <div className="error-text">{error}</div>}

      {dashboard && !loading && (
        <>
          <div className="stat-row">
            <div className="stat-card">
              <div className="stat-label">Total Payables Outstanding</div>
              <div className="stat-value">{formatMoney(dashboard.total_outstanding)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Suppliers with a Balance</div>
              <div className="stat-value">
                {dashboard.suppliers_by_outstanding.filter((s) => Number(s.outstanding_balance) > 0).length}
              </div>
            </div>
          </div>

          <h2>Suppliers by Outstanding Balance</h2>
          <table>
            <thead>
              <tr>
                <th>Supplier</th>
                <th className="text-right">Outstanding Balance</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.suppliers_by_outstanding.map((supplier) => (
                <tr key={supplier.supplier_id}>
                  <td>{supplier.supplier_name}</td>
                  <td className="text-right">{formatMoney(supplier.outstanding_balance)}</td>
                </tr>
              ))}
              {dashboard.suppliers_by_outstanding.length === 0 && (
                <tr>
                  <td colSpan={2} className="muted">
                    No suppliers yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <h2>Recent Activity</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Supplier</th>
                <th>Reference</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.recent_activity.map((activity) => (
                <tr key={`${activity.type}-${activity.id}`}>
                  <td>{formatDate(activity.date)}</td>
                  <td style={{ textTransform: 'capitalize' }}>{activity.type}</td>
                  <td>{activity.supplier_name}</td>
                  <td>{activity.reference || '—'}</td>
                  <td className="text-right">{formatMoney(activity.amount)}</td>
                </tr>
              ))}
              {dashboard.recent_activity.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    No activity yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}
