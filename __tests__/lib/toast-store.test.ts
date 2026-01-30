import { describe, it, expect, beforeEach } from 'vitest'
import {
  useToastStore,
  toastSuccess,
  toastError,
  toastInfo,
  toastWarning,
} from '@/lib/toast-store'

describe('toast-store', () => {
  beforeEach(() => {
    // Clear all toasts before each test
    useToastStore.getState().clearToasts()
  })

  describe('useToastStore', () => {
    it('should start with empty toasts', () => {
      const { toasts } = useToastStore.getState()
      expect(toasts).toHaveLength(0)
    })

    it('should add a toast', () => {
      const store = useToastStore.getState()
      const id = store.addToast({ message: 'Test message', variant: 'success' })

      const { toasts } = useToastStore.getState()
      expect(toasts).toHaveLength(1)
      expect(toasts[0].id).toBe(id)
      expect(toasts[0].message).toBe('Test message')
      expect(toasts[0].variant).toBe('success')
    })

    it('should add toast with default duration', () => {
      const store = useToastStore.getState()
      store.addToast({ message: 'Test', variant: 'info' })

      const { toasts } = useToastStore.getState()
      expect(toasts[0].duration).toBe(4000)
    })

    it('should add toast with custom duration', () => {
      const store = useToastStore.getState()
      store.addToast({ message: 'Test', variant: 'info', duration: 8000 })

      const { toasts } = useToastStore.getState()
      expect(toasts[0].duration).toBe(8000)
    })

    it('should remove a toast by id', () => {
      const store = useToastStore.getState()
      const id = store.addToast({ message: 'Test', variant: 'success' })
      
      expect(useToastStore.getState().toasts).toHaveLength(1)
      
      store.removeToast(id)
      
      expect(useToastStore.getState().toasts).toHaveLength(0)
    })

    it('should clear all toasts', () => {
      const store = useToastStore.getState()
      store.addToast({ message: 'Test 1', variant: 'success' })
      store.addToast({ message: 'Test 2', variant: 'error' })
      store.addToast({ message: 'Test 3', variant: 'info' })
      
      expect(useToastStore.getState().toasts).toHaveLength(3)
      
      store.clearToasts()
      
      expect(useToastStore.getState().toasts).toHaveLength(0)
    })

    it('should limit toasts to max 5', () => {
      const store = useToastStore.getState()
      
      for (let i = 0; i < 7; i++) {
        store.addToast({ message: `Toast ${i}`, variant: 'info' })
      }
      
      const { toasts } = useToastStore.getState()
      expect(toasts).toHaveLength(5)
      // Should keep the most recent toasts
      expect(toasts[toasts.length - 1].message).toBe('Toast 6')
    })

    it('should include createdAt timestamp', () => {
      const beforeTime = Date.now()
      const store = useToastStore.getState()
      store.addToast({ message: 'Test', variant: 'success' })
      const afterTime = Date.now()

      const { toasts } = useToastStore.getState()
      expect(toasts[0].createdAt).toBeGreaterThanOrEqual(beforeTime)
      expect(toasts[0].createdAt).toBeLessThanOrEqual(afterTime)
    })

    it('should generate unique ids', () => {
      const store = useToastStore.getState()
      const id1 = store.addToast({ message: 'Test 1', variant: 'success' })
      const id2 = store.addToast({ message: 'Test 2', variant: 'error' })
      
      expect(id1).not.toBe(id2)
    })
  })

  describe('convenience functions', () => {
    it('toastSuccess should add success toast', () => {
      const id = toastSuccess('Success message')
      
      const { toasts } = useToastStore.getState()
      expect(toasts).toHaveLength(1)
      expect(toasts[0].id).toBe(id)
      expect(toasts[0].message).toBe('Success message')
      expect(toasts[0].variant).toBe('success')
    })

    it('toastError should add error toast', () => {
      const id = toastError('Error message')
      
      const { toasts } = useToastStore.getState()
      expect(toasts).toHaveLength(1)
      expect(toasts[0].id).toBe(id)
      expect(toasts[0].message).toBe('Error message')
      expect(toasts[0].variant).toBe('error')
    })

    it('toastInfo should add info toast', () => {
      const id = toastInfo('Info message')
      
      const { toasts } = useToastStore.getState()
      expect(toasts).toHaveLength(1)
      expect(toasts[0].id).toBe(id)
      expect(toasts[0].message).toBe('Info message')
      expect(toasts[0].variant).toBe('info')
    })

    it('toastWarning should add warning toast', () => {
      const id = toastWarning('Warning message')
      
      const { toasts } = useToastStore.getState()
      expect(toasts).toHaveLength(1)
      expect(toasts[0].id).toBe(id)
      expect(toasts[0].message).toBe('Warning message')
      expect(toasts[0].variant).toBe('warning')
    })

    it('convenience functions should accept custom duration', () => {
      toastSuccess('Test', 6000)
      
      const { toasts } = useToastStore.getState()
      expect(toasts[0].duration).toBe(6000)
    })
  })
})
