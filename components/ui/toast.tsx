'use client'

import { useEffect, useCallback } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToastStore, type ToastVariant } from '@/lib/toast-store'

/**
 * Icon and styling configuration for each toast variant
 */
const VARIANT_CONFIG: Record<
  ToastVariant,
  {
    icon: typeof CheckCircle
    containerClass: string
    iconClass: string
  }
> = {
  success: {
    icon: CheckCircle,
    containerClass: 'bg-green-50 border-green-200 dark:bg-green-950/50 dark:border-green-800',
    iconClass: 'text-green-600 dark:text-green-400',
  },
  error: {
    icon: AlertCircle,
    containerClass: 'bg-red-50 border-red-200 dark:bg-red-950/50 dark:border-red-800',
    iconClass: 'text-red-600 dark:text-red-400',
  },
  warning: {
    icon: AlertTriangle,
    containerClass: 'bg-amber-50 border-amber-200 dark:bg-amber-950/50 dark:border-amber-800',
    iconClass: 'text-amber-600 dark:text-amber-400',
  },
  info: {
    icon: Info,
    containerClass: 'bg-blue-50 border-blue-200 dark:bg-blue-950/50 dark:border-blue-800',
    iconClass: 'text-blue-600 dark:text-blue-400',
  },
}

/**
 * Props for individual Toast component
 */
interface ToastItemProps {
  id: string
  message: string
  variant: ToastVariant
  duration?: number
  onDismiss: (id: string) => void
}

/**
 * Individual Toast notification component
 */
function ToastItem({ id, message, variant, duration = 4000, onDismiss }: ToastItemProps) {
  const config = VARIANT_CONFIG[variant]
  const Icon = config.icon

  // Auto-dismiss after duration
  useEffect(() => {
    if (duration <= 0) return

    const timer = setTimeout(() => {
      onDismiss(id)
    }, duration)

    return () => clearTimeout(timer)
  }, [id, duration, onDismiss])

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg',
        'animate-in slide-in-from-top-2 fade-in-0 duration-300',
        'min-w-[280px] max-w-[420px]',
        config.containerClass
      )}
      data-testid={`toast-${variant}`}
    >
      <Icon className={cn('h-5 w-5 flex-shrink-0', config.iconClass)} aria-hidden="true" />
      <p className="flex-1 text-sm font-medium text-foreground" data-testid="toast-message">
        {message}
      </p>
      <button
        type="button"
        onClick={() => onDismiss(id)}
        className={cn(
          'flex-shrink-0 rounded-md p-1',
          'hover:bg-black/5 dark:hover:bg-white/10',
          'transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
          'focus:ring-current'
        )}
        aria-label="Dismiss notification"
        data-testid="toast-dismiss"
      >
        <X className="h-4 w-4 text-foreground/60" />
      </button>
    </div>
  )
}

/**
 * Toaster Component - Container for toast notifications
 *
 * This component renders all active toasts from the toast store.
 * It should be placed at the root of your application layout.
 *
 * @example
 * ```tsx
 * // In your layout.tsx or root component
 * export default function Layout({ children }) {
 *   return (
 *     <>
 *       {children}
 *       <Toaster />
 *     </>
 *   )
 * }
 * ```
 */
export function Toaster() {
  const toasts = useToastStore((state) => state.toasts)
  const removeToast = useToastStore((state) => state.removeToast)

  const handleDismiss = useCallback(
    (id: string) => {
      removeToast(id)
    },
    [removeToast]
  )

  if (toasts.length === 0) {
    return null
  }

  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-2"
      aria-label="Notifications"
      data-testid="toast-container"
    >
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          id={toast.id}
          message={toast.message}
          variant={toast.variant}
          duration={toast.duration}
          onDismiss={handleDismiss}
        />
      ))}
    </div>
  )
}

export default Toaster
