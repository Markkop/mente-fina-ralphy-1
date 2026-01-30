import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { Toaster } from '@/components/ui/toast'
import { useToastStore, toastSuccess, toastError, toastInfo, toastWarning } from '@/lib/toast-store'

describe('Toaster', () => {
  beforeEach(() => {
    // Clear all toasts before each test
    useToastStore.getState().clearToasts()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should not render when there are no toasts', () => {
    render(<Toaster />)
    expect(screen.queryByTestId('toast-container')).not.toBeInTheDocument()
  })

  it('should render toast when added', () => {
    render(<Toaster />)
    
    act(() => {
      toastSuccess('Test success message')
    })
    
    expect(screen.getByTestId('toast-container')).toBeInTheDocument()
    expect(screen.getByTestId('toast-message')).toHaveTextContent('Test success message')
  })

  it('should render success toast with correct styling', () => {
    render(<Toaster />)
    
    act(() => {
      toastSuccess('Success!')
    })
    
    expect(screen.getByTestId('toast-success')).toBeInTheDocument()
  })

  it('should render error toast with correct styling', () => {
    render(<Toaster />)
    
    act(() => {
      toastError('Error!')
    })
    
    expect(screen.getByTestId('toast-error')).toBeInTheDocument()
  })

  it('should render info toast with correct styling', () => {
    render(<Toaster />)
    
    act(() => {
      toastInfo('Info!')
    })
    
    expect(screen.getByTestId('toast-info')).toBeInTheDocument()
  })

  it('should render warning toast with correct styling', () => {
    render(<Toaster />)
    
    act(() => {
      toastWarning('Warning!')
    })
    
    expect(screen.getByTestId('toast-warning')).toBeInTheDocument()
  })

  it('should render multiple toasts', () => {
    render(<Toaster />)
    
    act(() => {
      toastSuccess('Success 1')
      toastError('Error 1')
      toastInfo('Info 1')
    })
    
    expect(screen.getByTestId('toast-success')).toBeInTheDocument()
    expect(screen.getByTestId('toast-error')).toBeInTheDocument()
    expect(screen.getByTestId('toast-info')).toBeInTheDocument()
  })

  it('should dismiss toast when clicking dismiss button', () => {
    render(<Toaster />)
    
    act(() => {
      toastSuccess('Dismissable toast')
    })
    
    expect(screen.getByTestId('toast-message')).toHaveTextContent('Dismissable toast')
    
    const dismissButton = screen.getByTestId('toast-dismiss')
    fireEvent.click(dismissButton)
    
    expect(screen.queryByTestId('toast-container')).not.toBeInTheDocument()
  })

  it('should auto-dismiss after duration', async () => {
    render(<Toaster />)
    
    act(() => {
      toastSuccess('Auto dismiss', 1000)
    })
    
    expect(screen.getByTestId('toast-success')).toBeInTheDocument()
    
    // Advance time past the duration
    act(() => {
      vi.advanceTimersByTime(1100)
    })
    
    expect(screen.queryByTestId('toast-container')).not.toBeInTheDocument()
  })

  it('should have proper accessibility attributes', () => {
    render(<Toaster />)
    
    act(() => {
      toastSuccess('Accessible toast')
    })
    
    const toast = screen.getByTestId('toast-success')
    expect(toast).toHaveAttribute('role', 'alert')
    expect(toast).toHaveAttribute('aria-live', 'polite')
    
    const dismissButton = screen.getByTestId('toast-dismiss')
    expect(dismissButton).toHaveAttribute('aria-label', 'Dismiss notification')
  })

  it('should render toast container with proper positioning', () => {
    render(<Toaster />)
    
    act(() => {
      toastSuccess('Positioned toast')
    })
    
    const container = screen.getByTestId('toast-container')
    expect(container).toHaveClass('fixed', 'top-4', 'right-4')
  })
})
