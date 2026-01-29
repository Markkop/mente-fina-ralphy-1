import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { SettingsModal } from '@/components/settings-modal'

// Mock state that can be modified
let mockSettings = {
  id: 1,
  workHoursStart: '09:00',
  workHoursEnd: '17:00',
  sleepStart: '22:00',
  sleepEnd: '07:00',
}
let mockIsLoading = false

const mockInitialize = vi.fn()
const mockUpdateSettings = vi.fn()
const mockResetToDefaults = vi.fn()
const mockGetSettingsOrDefaults = vi.fn()
const mockClearAllData = vi.fn()
const mockResetSettings = vi.fn()

vi.mock('@/lib/settings-store', () => ({
  useSettingsStore: () => ({
    settings: mockSettings,
    isLoading: mockIsLoading,
    error: null,
    isInitialized: true,
    initialize: mockInitialize,
    updateSettings: mockUpdateSettings,
    resetToDefaults: mockResetToDefaults,
    getSettingsOrDefaults: mockGetSettingsOrDefaults,
    clearAllData: mockClearAllData,
    reset: mockResetSettings,
  }),
  DEFAULT_SETTINGS: {
    workHoursStart: '09:00',
    workHoursEnd: '17:00',
    sleepStart: '22:00',
    sleepEnd: '07:00',
  },
}))

const mockResetGoalStore = vi.fn()

vi.mock('@/lib/goal-store', () => ({
  useGoalStore: (selector: (state: { reset: () => void }) => unknown) => {
    if (selector) {
      return selector({ reset: mockResetGoalStore })
    }
    return { reset: mockResetGoalStore }
  },
}))

// Mock window.location.reload
const mockReload = vi.fn()
Object.defineProperty(window, 'location', {
  value: { reload: mockReload },
  writable: true,
})

describe('SettingsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSettings = {
      id: 1,
      workHoursStart: '09:00',
      workHoursEnd: '17:00',
      sleepStart: '22:00',
      sleepEnd: '07:00',
    }
    mockIsLoading = false
    mockGetSettingsOrDefaults.mockReturnValue({
      workHoursStart: '09:00',
      workHoursEnd: '17:00',
      sleepStart: '22:00',
      sleepEnd: '07:00',
    })
    mockUpdateSettings.mockResolvedValue(undefined)
    mockResetToDefaults.mockResolvedValue(undefined)
    mockClearAllData.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders the trigger button by default', () => {
      render(<SettingsModal />)

      expect(screen.getByTestId('settings-trigger')).toBeInTheDocument()
    })

    it('renders custom trigger when provided', () => {
      render(<SettingsModal trigger={<button data-testid="custom-trigger">Custom</button>} />)

      expect(screen.getByTestId('custom-trigger')).toBeInTheDocument()
      expect(screen.queryByTestId('settings-trigger')).not.toBeInTheDocument()
    })

    it('opens modal when trigger is clicked', async () => {
      render(<SettingsModal />)

      fireEvent.click(screen.getByTestId('settings-trigger'))

      await waitFor(() => {
        expect(screen.getByTestId('settings-modal')).toBeInTheDocument()
      })
    })

    it('renders in controlled mode without trigger', () => {
      const onOpenChange = vi.fn()
      render(<SettingsModal open={true} onOpenChange={onOpenChange} />)

      expect(screen.getByTestId('settings-modal')).toBeInTheDocument()
      expect(screen.queryByTestId('settings-trigger')).not.toBeInTheDocument()
    })

    it('does not render modal when controlled and closed', () => {
      const onOpenChange = vi.fn()
      render(<SettingsModal open={false} onOpenChange={onOpenChange} />)

      expect(screen.queryByTestId('settings-modal')).not.toBeInTheDocument()
    })
  })

  describe('modal content', () => {
    beforeEach(async () => {
      render(<SettingsModal />)
      fireEvent.click(screen.getByTestId('settings-trigger'))
      await waitFor(() => {
        expect(screen.getByTestId('settings-modal')).toBeInTheDocument()
      })
    })

    it('shows the correct title', () => {
      expect(screen.getByTestId('settings-modal-title')).toHaveTextContent('Settings')
    })

    it('shows the correct description', () => {
      expect(screen.getByTestId('settings-modal-description')).toHaveTextContent(
        'Configure your work and sleep hours for better task scheduling.'
      )
    })

    it('shows all time input fields', () => {
      expect(screen.getByTestId('work-hours-start-input')).toBeInTheDocument()
      expect(screen.getByTestId('work-hours-end-input')).toBeInTheDocument()
      expect(screen.getByTestId('sleep-start-input')).toBeInTheDocument()
      expect(screen.getByTestId('sleep-end-input')).toBeInTheDocument()
    })

    it('shows action buttons', () => {
      expect(screen.getByTestId('reset-defaults-button')).toBeInTheDocument()
      expect(screen.getByTestId('cancel-button')).toBeInTheDocument()
      expect(screen.getByTestId('save-button')).toBeInTheDocument()
    })

    it('populates inputs with current settings', () => {
      expect(screen.getByTestId('work-hours-start-input')).toHaveValue('09:00')
      expect(screen.getByTestId('work-hours-end-input')).toHaveValue('17:00')
      expect(screen.getByTestId('sleep-start-input')).toHaveValue('22:00')
      expect(screen.getByTestId('sleep-end-input')).toHaveValue('07:00')
    })
  })

  describe('form interaction', () => {
    beforeEach(async () => {
      render(<SettingsModal />)
      fireEvent.click(screen.getByTestId('settings-trigger'))
      await waitFor(() => {
        expect(screen.getByTestId('settings-modal')).toBeInTheDocument()
      })
    })

    it('disables save button when no changes are made', () => {
      expect(screen.getByTestId('save-button')).toBeDisabled()
    })

    it('enables save button when changes are made', async () => {
      const input = screen.getByTestId('work-hours-start-input')
      
      await act(async () => {
        fireEvent.change(input, { target: { value: '10:00' } })
      })

      await waitFor(() => {
        expect(screen.getByTestId('save-button')).not.toBeDisabled()
      })
    })
  })

  describe('form submission', () => {
    beforeEach(async () => {
      render(<SettingsModal />)
      fireEvent.click(screen.getByTestId('settings-trigger'))
      await waitFor(() => {
        expect(screen.getByTestId('settings-modal')).toBeInTheDocument()
      })
    })

    it('calls updateSettings with changed values on submit', async () => {
      await act(async () => {
        fireEvent.change(screen.getByTestId('work-hours-start-input'), { target: { value: '10:00' } })
        fireEvent.change(screen.getByTestId('work-hours-end-input'), { target: { value: '18:00' } })
        fireEvent.change(screen.getByTestId('sleep-start-input'), { target: { value: '23:00' } })
        fireEvent.change(screen.getByTestId('sleep-end-input'), { target: { value: '06:00' } })
      })

      await act(async () => {
        fireEvent.click(screen.getByTestId('save-button'))
      })

      await waitFor(() => {
        expect(mockUpdateSettings).toHaveBeenCalledWith({
          workHoursStart: '10:00',
          workHoursEnd: '18:00',
          sleepStart: '23:00',
          sleepEnd: '06:00',
        })
      })
    })

    it('closes modal after successful save', async () => {
      await act(async () => {
        fireEvent.change(screen.getByTestId('work-hours-start-input'), { target: { value: '10:00' } })
      })

      await act(async () => {
        fireEvent.click(screen.getByTestId('save-button'))
      })

      await waitFor(() => {
        expect(screen.queryByTestId('settings-modal')).not.toBeInTheDocument()
      })
    })

    it('shows error when update fails', async () => {
      mockUpdateSettings.mockRejectedValueOnce(new Error('Failed to save'))

      await act(async () => {
        fireEvent.change(screen.getByTestId('work-hours-start-input'), { target: { value: '10:00' } })
      })

      await act(async () => {
        fireEvent.click(screen.getByTestId('save-button'))
      })

      await waitFor(() => {
        expect(screen.getByTestId('settings-error')).toHaveTextContent('Failed to save')
      })
    })

    it('shows loading state while saving', async () => {
      mockUpdateSettings.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      )

      await act(async () => {
        fireEvent.change(screen.getByTestId('work-hours-start-input'), { target: { value: '10:00' } })
      })

      fireEvent.click(screen.getByTestId('save-button'))

      expect(screen.getByTestId('save-button')).toHaveTextContent('Saving...')
      expect(screen.getByTestId('save-button')).toBeDisabled()

      await waitFor(() => {
        expect(screen.queryByTestId('settings-modal')).not.toBeInTheDocument()
      })
    })
  })

  describe('reset to defaults', () => {
    beforeEach(async () => {
      render(<SettingsModal />)
      fireEvent.click(screen.getByTestId('settings-trigger'))
      await waitFor(() => {
        expect(screen.getByTestId('settings-modal')).toBeInTheDocument()
      })
    })

    it('resets all inputs to default values', async () => {
      // First change some values
      await act(async () => {
        fireEvent.change(screen.getByTestId('work-hours-start-input'), { target: { value: '10:00' } })
        fireEvent.change(screen.getByTestId('work-hours-end-input'), { target: { value: '18:00' } })
      })

      // Then reset
      await act(async () => {
        fireEvent.click(screen.getByTestId('reset-defaults-button'))
      })

      expect(screen.getByTestId('work-hours-start-input')).toHaveValue('09:00')
      expect(screen.getByTestId('work-hours-end-input')).toHaveValue('17:00')
      expect(screen.getByTestId('sleep-start-input')).toHaveValue('22:00')
      expect(screen.getByTestId('sleep-end-input')).toHaveValue('07:00')
    })

    it('clears any existing error', async () => {
      mockUpdateSettings.mockRejectedValueOnce(new Error('Failed to save'))

      await act(async () => {
        fireEvent.change(screen.getByTestId('work-hours-start-input'), { target: { value: '10:00' } })
      })

      await act(async () => {
        fireEvent.click(screen.getByTestId('save-button'))
      })

      await waitFor(() => {
        expect(screen.getByTestId('settings-error')).toBeInTheDocument()
      })

      await act(async () => {
        fireEvent.click(screen.getByTestId('reset-defaults-button'))
      })

      expect(screen.queryByTestId('settings-error')).not.toBeInTheDocument()
    })
  })

  describe('cancel behavior', () => {
    it('closes modal when cancel is clicked', async () => {
      render(<SettingsModal />)
      fireEvent.click(screen.getByTestId('settings-trigger'))
      
      await waitFor(() => {
        expect(screen.getByTestId('settings-modal')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('cancel-button'))

      await waitFor(() => {
        expect(screen.queryByTestId('settings-modal')).not.toBeInTheDocument()
      })
    })

    it('calls onOpenChange in controlled mode', async () => {
      const onOpenChange = vi.fn()
      render(<SettingsModal open={true} onOpenChange={onOpenChange} />)

      fireEvent.click(screen.getByTestId('cancel-button'))

      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe('initialization', () => {
    it('calls initialize on mount', () => {
      render(<SettingsModal />)

      expect(mockInitialize).toHaveBeenCalled()
    })
  })

  describe('loading state', () => {
    it('shows loading spinner when store is loading', () => {
      mockIsLoading = true

      render(<SettingsModal open={true} onOpenChange={vi.fn()} />)

      expect(screen.getByTestId('settings-loading')).toBeInTheDocument()
      expect(screen.queryByTestId('settings-form')).not.toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has accessible labels for all inputs', async () => {
      render(<SettingsModal open={true} onOpenChange={vi.fn()} />)

      await waitFor(() => {
        expect(screen.getByTestId('settings-form')).toBeInTheDocument()
      })

      expect(screen.getByLabelText('Start Time')).toBeInTheDocument()
      expect(screen.getByLabelText('End Time')).toBeInTheDocument()
      expect(screen.getByLabelText('Bedtime')).toBeInTheDocument()
      expect(screen.getByLabelText('Wake Time')).toBeInTheDocument()
    })

    it('error message has alert role', async () => {
      mockUpdateSettings.mockRejectedValueOnce(new Error('Test error'))

      render(<SettingsModal open={true} onOpenChange={vi.fn()} />)

      await waitFor(() => {
        expect(screen.getByTestId('settings-form')).toBeInTheDocument()
      })

      await act(async () => {
        fireEvent.change(screen.getByTestId('work-hours-start-input'), { target: { value: '10:00' } })
      })

      await act(async () => {
        fireEvent.click(screen.getByTestId('save-button'))
      })

      await waitFor(() => {
        expect(screen.getByTestId('settings-error')).toHaveAttribute('role', 'alert')
      })
    })

    it('trigger button has accessible name', () => {
      render(<SettingsModal />)

      expect(screen.getByTestId('settings-trigger')).toHaveAccessibleName('Open settings')
    })
  })

  describe('clear all data', () => {
    beforeEach(async () => {
      render(<SettingsModal />)
      fireEvent.click(screen.getByTestId('settings-trigger'))
      await waitFor(() => {
        expect(screen.getByTestId('settings-modal')).toBeInTheDocument()
      })
    })

    it('shows clear data button', () => {
      expect(screen.getByTestId('clear-data-button')).toBeInTheDocument()
      expect(screen.getByTestId('clear-data-button')).toHaveTextContent('Reset/Clear All Data')
    })

    it('shows confirmation dialog when clear data button is clicked', async () => {
      fireEvent.click(screen.getByTestId('clear-data-button'))

      await waitFor(() => {
        expect(screen.getByTestId('clear-data-confirm')).toBeInTheDocument()
      })
      expect(screen.getByText('Are you sure?')).toBeInTheDocument()
      expect(screen.getByText(/This will permanently delete/)).toBeInTheDocument()
    })

    it('hides confirmation dialog when cancel is clicked', async () => {
      fireEvent.click(screen.getByTestId('clear-data-button'))

      await waitFor(() => {
        expect(screen.getByTestId('clear-data-confirm')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('clear-data-cancel'))

      await waitFor(() => {
        expect(screen.queryByTestId('clear-data-confirm')).not.toBeInTheDocument()
      })
      expect(screen.getByTestId('clear-data-button')).toBeInTheDocument()
    })

    it('calls clearAllData and resets stores when confirmed', async () => {
      fireEvent.click(screen.getByTestId('clear-data-button'))

      await waitFor(() => {
        expect(screen.getByTestId('clear-data-confirm')).toBeInTheDocument()
      })

      await act(async () => {
        fireEvent.click(screen.getByTestId('clear-data-confirm-button'))
      })

      await waitFor(() => {
        expect(mockClearAllData).toHaveBeenCalled()
      })
      expect(mockResetGoalStore).toHaveBeenCalled()
      expect(mockReload).toHaveBeenCalled()
    })

    it('shows loading state while clearing', async () => {
      mockClearAllData.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      )

      fireEvent.click(screen.getByTestId('clear-data-button'))

      await waitFor(() => {
        expect(screen.getByTestId('clear-data-confirm')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('clear-data-confirm-button'))

      expect(screen.getByTestId('clear-data-confirm-button')).toHaveTextContent('Clearing...')
      expect(screen.getByTestId('clear-data-confirm-button')).toBeDisabled()
    })

    it('shows error when clearing fails', async () => {
      mockClearAllData.mockRejectedValueOnce(new Error('Failed to clear'))

      fireEvent.click(screen.getByTestId('clear-data-button'))

      await waitFor(() => {
        expect(screen.getByTestId('clear-data-confirm')).toBeInTheDocument()
      })

      await act(async () => {
        fireEvent.click(screen.getByTestId('clear-data-confirm-button'))
      })

      await waitFor(() => {
        expect(screen.getByTestId('settings-error')).toHaveTextContent('Failed to clear')
      })
    })
  })
})
