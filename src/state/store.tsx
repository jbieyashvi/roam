import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react'
import { loadState, reducer, saveState, type Action, type AppState } from './model'

interface StoreValue {
  state: AppState
  dispatch: (a: Action) => void
}

const StoreContext = createContext<StoreValue | null>(null)

const storage = typeof window !== 'undefined' ? window.localStorage : undefined

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer((s: AppState, a: Action) => reducer(s, a), undefined, () => loadState(storage))
  useEffect(() => saveState(storage, state), [state])
  const value = useMemo(() => ({ state, dispatch }), [state])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore outside StoreProvider')
  return ctx
}

// ── Toasts (transient, not persisted) ──────────────────────────

export interface Toast {
  id: number
  message: string
  tone: 'success' | 'info' | 'error'
  action?: { label: string; onAction: () => void }
  /** Route the toast belongs to. Action toasts are dismissed when you leave it (default: the route it was raised on). */
  path?: string
}

interface ToastValue {
  toast: Toast | null
  show: (t: Omit<Toast, 'id'>) => void
  dismiss: () => void
}

const ToastContext = createContext<ToastValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const dismiss = useCallback(() => {
    window.clearTimeout(timer.current)
    setToast(null)
  }, [])
  const show = useCallback((t: Omit<Toast, 'id'>) => {
    window.clearTimeout(timer.current)
    setToast({ ...t, id: Date.now() })
    timer.current = window.setTimeout(() => setToast(null), t.action ? 10000 : 4000)
  }, [])
  const value = useMemo(() => ({ toast, show, dismiss }), [toast, show, dismiss])
  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast outside ToastProvider')
  return ctx
}
