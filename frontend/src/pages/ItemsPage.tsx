import { useEffect, useState, type FormEvent } from 'react'
import { getErrorMessage } from '../api/errors'
import { createItem, listItems, updateItem, type ItemInput } from '../api/items'
import type { Item } from '../types'

const EMPTY_FORM: ItemInput = { name: '', unit: '', category: '' }

export function ItemsPage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ItemInput>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function load() {
    setLoading(true)
    setLoadError(null)
    try {
      setItems(await listItems())
    } catch (error) {
      setLoadError(getErrorMessage(error, 'Failed to load items.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function startCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setFormOpen(true)
  }

  function startEdit(item: Item) {
    setEditingId(item.id)
    setForm({ name: item.name, unit: item.unit, category: item.category ?? '' })
    setFormError(null)
    setFormOpen(true)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setFormError(null)
    try {
      if (editingId) {
        await updateItem(editingId, form)
      } else {
        await createItem(form)
      }
      setFormOpen(false)
      await load()
    } catch (error) {
      setFormError(getErrorMessage(error, 'Failed to save item.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Items</h1>
        <button className="btn" type="button" onClick={startCreate}>
          Add Item
        </button>
      </div>

      {formOpen && (
        <form className="card" onSubmit={handleSubmit}>
          <h2 style={{ marginTop: 0 }}>{editingId ? 'Edit Item' : 'New Item'}</h2>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="item-name">Name</label>
              <input
                id="item-name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="item-unit">Unit</label>
              <input
                id="item-unit"
                placeholder="e.g. kg, sqft, pcs"
                value={form.unit}
                onChange={(event) => setForm({ ...form, unit: event.target.value })}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="item-category">Category</label>
              <input
                id="item-category"
                value={form.category ?? ''}
                onChange={(event) => setForm({ ...form, category: event.target.value })}
              />
            </div>
          </div>
          {formError && <div className="error-text">{formError}</div>}
          <div className="form-actions">
            <button className="btn" type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save'}
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => setFormOpen(false)}
              disabled={submitting}
            >
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
              <th>Unit</th>
              <th>Category</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.unit}</td>
                <td>{item.category || '—'}</td>
                <td>
                  <button className="btn btn-secondary" type="button" onClick={() => startEdit(item)}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="muted">
                  No items yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}
