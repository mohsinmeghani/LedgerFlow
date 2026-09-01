import { Check, Pencil, Plus, Tags, Trash2, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { getErrorMessage } from '../api/errors'
import { createItem, deleteItem, listItems, updateItem, type ItemInput } from '../api/items'
import { createItemCategory, deleteItemCategory, listItemCategories } from '../api/itemCategories'
import { useToast } from '../context/ToastContext'
import type { Item, ItemCategory } from '../types'

const EMPTY_FORM: ItemInput = { name: '', unit: '', category_id: '' }
const NEW_CATEGORY_VALUE = '__new__'

export function ItemsPage() {
  const { showError } = useToast()
  const [items, setItems] = useState<Item[]>([])
  const [categories, setCategories] = useState<ItemCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ItemInput>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [addingCategory, setAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [categorySaving, setCategorySaving] = useState(false)
  const [categoryError, setCategoryError] = useState<string | null>(null)

  const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false)

  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]))

  async function load() {
    setLoading(true)
    setLoadError(null)
    try {
      const [itemList, categoryList] = await Promise.all([listItems(), listItemCategories()])
      setItems(itemList)
      setCategories(categoryList)
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
    setAddingCategory(false)
    setNewCategoryName('')
    setCategoryError(null)
    setFormOpen(true)
  }

  function startEdit(item: Item) {
    setEditingId(item.id)
    setForm({ name: item.name, unit: item.unit, category_id: item.category_id ?? '' })
    setFormError(null)
    setAddingCategory(false)
    setNewCategoryName('')
    setCategoryError(null)
    setFormOpen(true)
  }

  function handleCategorySelect(value: string) {
    if (value === NEW_CATEGORY_VALUE) {
      setAddingCategory(true)
      setCategoryError(null)
      return
    }
    setForm({ ...form, category_id: value })
  }

  async function handleAddCategory() {
    if (!newCategoryName.trim()) return
    setCategorySaving(true)
    setCategoryError(null)
    try {
      const category = await createItemCategory(newCategoryName.trim())
      setCategories((current) => [...current, category].sort((a, b) => a.name.localeCompare(b.name)))
      setForm((current) => ({ ...current, category_id: category.id }))
      setAddingCategory(false)
      setNewCategoryName('')
    } catch (error) {
      setCategoryError(getErrorMessage(error, 'Failed to add category.'))
    } finally {
      setCategorySaving(false)
    }
  }

  async function handleDeleteItem(item: Item) {
    if (!window.confirm(`Permanently delete item "${item.name}"?`)) return
    try {
      await deleteItem(item.id)
      await load()
    } catch (error) {
      showError(getErrorMessage(error, 'Failed to delete item.'))
    }
  }

  async function handleDeleteCategory(category: ItemCategory) {
    if (!window.confirm(`Permanently delete category "${category.name}"?`)) return
    try {
      await deleteItemCategory(category.id)
      await load()
    } catch (error) {
      showError(getErrorMessage(error, 'Failed to delete category.'))
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setFormError(null)
    try {
      const payload: ItemInput = { ...form, category_id: form.category_id || null }
      if (editingId) {
        await updateItem(editingId, payload)
      } else {
        await createItem(payload)
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
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => setManageCategoriesOpen((open) => !open)}
          >
            <Tags className="icon" size={16} />
            {manageCategoriesOpen ? 'Hide Categories' : 'Manage Categories'}
          </button>
          <button className="btn" type="button" onClick={startCreate}>
            <Plus className="icon" size={16} />
            Add Item
          </button>
        </div>
      </div>

      {manageCategoriesOpen && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Categories</h2>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id}>
                  <td>{category.name}</td>
                  <td>
                    <button
                      className="btn btn-danger"
                      type="button"
                      onClick={() => handleDeleteCategory(category)}
                    >
                      <Trash2 className="icon" size={14} />
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={2} className="muted">
                    No categories yet. Add one from the item form below.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

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
              {!addingCategory && (
                <select
                  id="item-category"
                  value={form.category_id ?? ''}
                  onChange={(event) => handleCategorySelect(event.target.value)}
                >
                  <option value="">No category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                  <option value={NEW_CATEGORY_VALUE}>+ Add new category…</option>
                </select>
              )}
              {addingCategory && (
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <input
                    id="item-new-category"
                    placeholder="New category name"
                    value={newCategoryName}
                    onChange={(event) => setNewCategoryName(event.target.value)}
                    autoFocus
                  />
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={handleAddCategory}
                    disabled={categorySaving || !newCategoryName.trim()}
                  >
                    <Check className="icon" size={14} />
                    {categorySaving ? 'Adding…' : 'Add'}
                  </button>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => {
                      setAddingCategory(false)
                      setNewCategoryName('')
                      setCategoryError(null)
                    }}
                    disabled={categorySaving}
                  >
                    <X className="icon" size={14} />
                    Cancel
                  </button>
                </div>
              )}
              {categoryError && <div className="error-text">{categoryError}</div>}
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
                <td>{(item.category_id && categoryNameById.get(item.category_id)) || '—'}</td>
                <td>
                  <button className="btn btn-secondary" type="button" onClick={() => startEdit(item)}>
                    <Pencil className="icon" size={14} />
                    Edit
                  </button>{' '}
                  <button className="btn btn-danger" type="button" onClick={() => handleDeleteItem(item)}>
                    <Trash2 className="icon" size={14} />
                    Delete
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
