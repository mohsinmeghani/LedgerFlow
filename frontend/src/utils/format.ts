export function formatMoney(value: string | number): string {
  const num = typeof value === 'string' ? Number(value) : value
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function statusLabel(status: string): string {
  return status.replace('_', ' ')
}
