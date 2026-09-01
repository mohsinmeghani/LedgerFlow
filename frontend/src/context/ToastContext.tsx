import { AlertTriangle, CheckCircle2, X } from 'lucide-react'
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

interface Toast {
  id: number
  type: 'error' | 'success'
  message: string
}

interface ToastContextValue {
  showError: (message: string) => void
  showSuccess: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

const AUTO_DISMISS_MS = 6000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const show = useCallback(
    (type: Toast['type'], message: string) => {
      const id = nextId.current++
      setToasts((current) => [...current, { id, type, message }])
      window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
    },
    [dismiss],
  )

  const showError = useCallback((message: string) => show('error', message), [show])
  const showSuccess = useCallback((message: string) => show('success', message), [show])

  return (
    <ToastContext.Provider value={{ showError, showSuccess }}>
      {children}
      <div className="toast-stack">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`} role="alert">
            {toast.type === 'error' ? (
              <AlertTriangle className="icon" size={18} />
            ) : (
              <CheckCircle2 className="icon" size={18} />
            )}
            <span className="toast-message">{toast.message}</span>
            <button
              type="button"
              className="toast-close"
              aria-label="Dismiss"
              onClick={() => dismiss(toast.id)}
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
