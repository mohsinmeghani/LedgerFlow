import { AlertTriangle } from 'lucide-react'
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

interface ConfirmOptions {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

interface PendingConfirm extends ConfirmOptions {
  id: number
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | undefined>(undefined)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null)
  const resolver = useRef<((value: boolean) => void) | null>(null)
  const nextId = useRef(0)

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
      setPending({ id: nextId.current++, ...options })
    })
  }, [])

  function settle(result: boolean) {
    resolver.current?.(result)
    resolver.current = null
    setPending(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <div className="confirm-overlay" onClick={() => settle(false)}>
          <div className="confirm-dialog" onClick={(event) => event.stopPropagation()}>
            <div className={`confirm-icon${pending.danger ? ' confirm-icon-danger' : ''}`}>
              <AlertTriangle size={20} />
            </div>
            <h2 className="confirm-title">{pending.title ?? 'Are you sure?'}</h2>
            <p className="confirm-message">{pending.message}</p>
            <div className="confirm-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => settle(false)}
                autoFocus
              >
                {pending.cancelLabel ?? 'Cancel'}
              </button>
              <button
                type="button"
                className={pending.danger ? 'btn btn-danger' : 'btn'}
                onClick={() => settle(true)}
              >
                {pending.confirmLabel ?? 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm(): ConfirmFn {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider')
  }
  return context
}
