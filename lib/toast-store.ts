'use client'

import { create } from 'zustand'

/**
 * Toast variant types for different feedback styles
 */
export type ToastVariant = 'success' | 'error' | 'info' | 'warning'

/**
 * Individual toast notification
 */
export interface Toast {
  /** Unique identifier */
  id: string
  /** Toast message */
  message: string
  /** Visual variant */
  variant: ToastVariant
  /** Duration in milliseconds (default: 4000) */
  duration?: number
  /** Timestamp when toast was created */
  createdAt: number
}

/**
 * Toast store state
 */
interface ToastStoreState {
  /** Active toasts */
  toasts: Toast[]
}

/**
 * Toast store actions
 */
interface ToastStoreActions {
  /** Add a new toast */
  addToast: (toast: Omit<Toast, 'id' | 'createdAt'>) => string
  /** Remove a toast by id */
  removeToast: (id: string) => void
  /** Clear all toasts */
  clearToasts: () => void
}

type ToastStore = ToastStoreState & ToastStoreActions

/**
 * Generate a unique toast ID
 */
function generateId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Default toast duration in milliseconds
 */
const DEFAULT_DURATION = 4000

/**
 * Maximum number of toasts to display at once
 */
const MAX_TOASTS = 5

/**
 * Toast store for managing notifications
 */
export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  addToast: (toast) => {
    const id = generateId()
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? DEFAULT_DURATION,
      createdAt: Date.now(),
    }

    set((state) => ({
      // Keep only the most recent toasts
      toasts: [...state.toasts.slice(-(MAX_TOASTS - 1)), newToast],
    }))

    return id
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }))
  },

  clearToasts: () => {
    set({ toasts: [] })
  },
}))

/**
 * Convenience function to show a success toast
 */
export function toastSuccess(message: string, duration?: number): string {
  return useToastStore.getState().addToast({ message, variant: 'success', duration })
}

/**
 * Convenience function to show an error toast
 */
export function toastError(message: string, duration?: number): string {
  return useToastStore.getState().addToast({ message, variant: 'error', duration })
}

/**
 * Convenience function to show an info toast
 */
export function toastInfo(message: string, duration?: number): string {
  return useToastStore.getState().addToast({ message, variant: 'info', duration })
}

/**
 * Convenience function to show a warning toast
 */
export function toastWarning(message: string, duration?: number): string {
  return useToastStore.getState().addToast({ message, variant: 'warning', duration })
}
