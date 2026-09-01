import { Check, Pencil, Plus, Trash2, UserCheck, UserX, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { getErrorMessage } from '../api/errors'
import {
  createSupplier,
  deactivateSupplier,
  deleteSupplier,
  listSuppliers,
  reactivateSupplier,
  updateSupplier,
  type SupplierInput,
} from '../api/suppliers'
import { useConfirm } from '../context/ConfirmContext'
import { useToast } from '../context/ToastContext'
import type { Supplier } from '../types'

const EMPTY_FORM: SupplierInput = { name: '', contact: '', address: '' }

export function SuppliersPage() {
  const { showError } = useToast()
  const confirm = useConfirm()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [includeInactive, setIncludeInactive] = useState(false)

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<SupplierInput>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function load() {
    setLoading(true)
    setLoadError(null)
    try {
      setSuppliers(await listSuppliers(includeInactive))
    } catch (error) {
      setLoadError(getErrorMessage(error, 'Failed to load suppliers.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeInactive])

  function startCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setFormOpen(true)
  }

  function startEdit(supplier: Supplier) {
    setEditingId(supplier.id)
    setForm({
      name: supplier.name,
      contact: supplier.contact ?? '',
      address: supplier.address ?? '',
    })
    setFormError(null)
    setFormOpen(true)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setFormError(null)
    try {
      if (editingId) {
        await updateSupplier(editingId, form)
      } else {
        await createSupplier(form)
      }
      setFormOpen(false)
      await load()
    } catch (error) {
      setFormError(getErrorMessage(error, 'Failed to save supplier.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeactivate(supplier: Supplier) {
    const confirmed = await confirm({
      title: 'Deactivate supplier?',
      message: `Deactivate supplier "${supplier.name}"? It will be hidden from the active list but its history is kept.`,
      confirmLabel: 'Deactivate',
    })
    if (!confirmed) return
    try {
      await deactivateSupplier(supplier.id)
      await load()
    } catch (error) {
      showError(getErrorMessage(error, 'Failed to deactivate supplier.'))
    }
  }

  async function handleReactivate(supplier: Supplier) {
    try {
      await reactivateSupplier(supplier.id)
      await load()
    } catch (error) {
      showError(getErrorMessage(error, 'Failed to reactivate supplier.'))
    }
  }

  async function handleDelete(supplier: Supplier) {
    const confirmed = await confirm({
      title: 'Delete supplier?',
      message: `Permanently delete supplier "${supplier.name}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    })
    if (!confirmed) return
    try {
      await deleteSupplier(supplier.id)
      await load()
    } catch (error) {
      showError(getErrorMessage(error, 'Failed to delete supplier.'))
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Suppliers</h1>
        <button className="btn" type="button" onClick={startCreate}>
          <Plus className="icon" size={16} />
          Add Supplier
        </button>
      </div>

      <label className="muted" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem' }}>
        <input
          type="checkbox"
          checked={includeInactive}
          onChange={(event) => setIncludeInactive(event.target.checked)}
        />
        Show inactive suppliers
      </label>

      {formOpen && (
        <form className="card" onSubmit={handleSubmit}>
          <h2 style={{ marginTop: 0 }}>{editingId ? 'Edit Supplier' : 'New Supplier'}</h2>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="supplier-name">Name</label>
              <input
                id="supplier-name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="supplier-contact">Contact</label>
              <input
                id="supplier-contact"
                value={form.contact ?? ''}
                onChange={(event) => setForm({ ...form, contact: event.target.value })}
              />
            </div>
            <div className="form-field" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="supplier-address">Address</label>
              <textarea
                id="supplier-address"
                rows={2}
                value={form.address ?? ''}
                onChange={(event) => setForm({ ...form, address: event.target.value })}
              />
            </div>
          </div>
          {formError && <div className="error-text">{formError}</div>}
          <div className="form-actions">
            <button className="btn" type="submit" disabled={submitting}>
              <Check className="icon" size={16} />
              {submitting ? 'Saving…' : 'Save'}
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
              <th>Name</th>
              <th>Contact</th>
              <th>Address</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((supplier) => (
              <tr key={supplier.id}>
                <td>{supplier.name}</td>
                <td>{supplier.contact || '—'}</td>
                <td>{supplier.address || '—'}</td>
                <td>
                  <span
                    className={`badge ${supplier.is_active ? 'badge-paid' : 'badge-unpaid'}`}
                  >
                    {supplier.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <button className="btn btn-secondary" type="button" onClick={() => startEdit(supplier)}>
                    <Pencil className="icon" size={14} />
                    Edit
                  </button>{' '}
                  {supplier.is_active ? (
                    <button
                      className="btn btn-secondary"
                      type="button"
                      onClick={() => handleDeactivate(supplier)}
                    >
                      <UserX className="icon" size={14} />
                      Deactivate
                    </button>
                  ) : (
                    <button
                      className="btn btn-secondary"
                      type="button"
                      onClick={() => handleReactivate(supplier)}
                    >
                      <UserCheck className="icon" size={14} />
                      Reactivate
                    </button>
                  )}{' '}
                  <button className="btn btn-danger" type="button" onClick={() => handleDelete(supplier)}>
                    <Trash2 className="icon" size={14} />
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {suppliers.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  No suppliers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}
