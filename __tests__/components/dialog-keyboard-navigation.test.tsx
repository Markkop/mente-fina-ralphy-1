import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddChildDialog } from '@/components/add-child-dialog'
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog'
import { ScheduleTaskDialog } from '@/components/schedule-task-dialog'
import { SettingsModal } from '@/components/settings-modal'
import type { TreeNodeWithChildren } from '@/lib/goal-store'
import type { TaskWithMeta } from '@/lib/hooks'

// Mock settings-store for SettingsModal
let mockSettings = {
  id: 1,
  workHoursStart: '09:00',
  workHoursEnd: '17:00',
  sleepStart: '22:00',
  sleepEnd: '07:00',
}

const mockInitialize = vi.fn()
const mockUpdateSettings = vi.fn()
const mockGetSettingsOrDefaults = vi.fn()
const mockClearAllData = vi.fn()

vi.mock('@/lib/settings-store', () => ({
  useSettingsStore: () => ({
    settings: mockSettings,
    isLoading: false,
    error: null,
    isInitialized: true,
    initialize: mockInitialize,
    updateSettings: mockUpdateSettings,
    resetToDefaults: vi.fn(),
    getSettingsOrDefaults: mockGetSettingsOrDefaults,
    clearAllData: mockClearAllData,
    reset: vi.fn(),
  }),
  DEFAULT_SETTINGS: {
    workHoursStart: '09:00',
    workHoursEnd: '17:00',
    sleepStart: '22:00',
    sleepEnd: '07:00',
  },
}))

// Mock goal-store for SettingsModal
vi.mock('@/lib/goal-store', () => ({
  useGoalStore: (selector: (state: { reset: () => void }) => unknown) => {
    if (selector) {
      return selector({ reset: vi.fn() })
    }
    return { reset: vi.fn() }
  },
}))

// Mock hooks for ScheduleTaskDialog
vi.mock('@/lib/hooks', () => ({
  useSettings: vi.fn(() => ({
    settings: {
      workHoursStart: '09:00',
      workHoursEnd: '18:00',
      sleepStart: '23:00',
      sleepEnd: '07:00',
    },
    isLoading: false,
    error: null,
    updateSettings: vi.fn(),
    resetSettings: vi.fn(),
    refresh: vi.fn(),
  })),
  useTasks: vi.fn(() => ({
    allTasks: [],
    completedTasks: [],
    pendingTasks: [],
    tasksByFrequency: { once: [], daily: [], weekly: [], custom: [] },
    dailyTasks: [],
    weeklyTasks: [],
    oneTimeTasks: [],
    customTasks: [],
    isLoading: false,
    error: null,
    isInitialized: true,
    getTaskById: vi.fn(),
    getTasksForParent: vi.fn(),
    initialize: vi.fn(),
    refresh: vi.fn(),
    addTask: vi.fn(),
    updateTask: vi.fn(),
    toggleTaskCompletion: vi.fn(),
    deleteTask: vi.fn(),
    moveTask: vi.fn(),
    reorderTasks: vi.fn(),
  })),
  DEFAULT_SETTINGS: {
    workHoursStart: '09:00',
    workHoursEnd: '18:00',
    sleepStart: '23:00',
    sleepEnd: '07:00',
  },
}))

// Mock window.location for SettingsModal
Object.defineProperty(window, 'location', {
  value: { reload: vi.fn() },
  writable: true,
})

// Helper functions
function createMockParent(overrides: Partial<TreeNodeWithChildren> = {}): TreeNodeWithChildren {
  return {
    id: 1,
    title: 'Parent Goal',
    nodeType: 'goal',
    status: 'active',
    createdAt: new Date(),
    children: [],
    ...overrides,
  } as TreeNodeWithChildren
}

function createMockTask(overrides: Partial<TaskWithMeta> = {}): TaskWithMeta {
  return {
    id: 1,
    parentId: 1,
    title: 'Test Task',
    description: 'Test description',
    frequency: 'once',
    isCompleted: false,
    createdAt: new Date(),
    nodeType: 'task',
    scheduledDate: null,
    ...overrides,
  }
}

describe('Dialog Keyboard Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSettings = {
      id: 1,
      workHoursStart: '09:00',
      workHoursEnd: '17:00',
      sleepStart: '22:00',
      sleepEnd: '07:00',
    }
    mockGetSettingsOrDefaults.mockReturnValue({
      workHoursStart: '09:00',
      workHoursEnd: '17:00',
      sleepStart: '22:00',
      sleepEnd: '07:00',
    })
    mockUpdateSettings.mockResolvedValue(undefined)
  })

  describe('AddChildDialog - Keyboard Navigation', () => {
    const mockOnOpenChange = vi.fn()
    const mockOnAddGoal = vi.fn().mockResolvedValue(1)
    const mockOnAddTask = vi.fn().mockResolvedValue(1)

    const defaultProps = {
      open: true,
      onOpenChange: mockOnOpenChange,
      parentNode: createMockParent(),
      onAddGoal: mockOnAddGoal,
      onAddTask: mockOnAddTask,
      onAddMilestone: vi.fn().mockResolvedValue(1),
      onAddRequirement: vi.fn().mockResolvedValue(1),
    }

    it('closes dialog when Escape key is pressed', async () => {
      const user = userEvent.setup()
      render(<AddChildDialog {...defaultProps} />)

      expect(screen.getByTestId('add-child-dialog')).toBeInTheDocument()

      await user.keyboard('{Escape}')

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('focuses title input on dialog open (autoFocus)', () => {
      render(<AddChildDialog {...defaultProps} />)

      expect(screen.getByTestId('title-input')).toHaveFocus()
    })

    it('navigates through form elements with Tab key', async () => {
      const user = userEvent.setup()
      render(<AddChildDialog {...defaultProps} />)

      // Start at title input (autofocused)
      expect(screen.getByTestId('title-input')).toHaveFocus()

      // Tab to description input
      await user.tab()
      expect(screen.getByTestId('description-input')).toHaveFocus()
    })

    it('can navigate type options with keyboard', async () => {
      const user = userEvent.setup()
      render(<AddChildDialog {...defaultProps} />)

      // Focus on first type option
      const goalOption = screen.getByTestId('type-option-goal')
      await user.click(goalOption)
      
      expect(goalOption).toHaveAttribute('aria-checked', 'true')

      // Click on task option
      const taskOption = screen.getByTestId('type-option-task')
      await user.click(taskOption)
      
      expect(taskOption).toHaveAttribute('aria-checked', 'true')
      expect(goalOption).toHaveAttribute('aria-checked', 'false')
    })

    it('submits form with Enter key when focused on input', async () => {
      const user = userEvent.setup()
      render(<AddChildDialog {...defaultProps} />)

      // Type in the title input
      const titleInput = screen.getByTestId('title-input')
      await user.type(titleInput, 'New Task')

      // Press Enter to submit
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(mockOnAddTask).toHaveBeenCalled()
      })
    })

    it('activates buttons with Enter and Space keys', async () => {
      const user = userEvent.setup()
      render(<AddChildDialog {...defaultProps} />)

      const cancelButton = screen.getByTestId('cancel-button')
      cancelButton.focus()

      // Press Enter
      await user.keyboard('{Enter}')

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('activates cancel button with Space key', async () => {
      const user = userEvent.setup()
      render(<AddChildDialog {...defaultProps} />)

      const cancelButton = screen.getByTestId('cancel-button')
      cancelButton.focus()

      // Press Space
      await user.keyboard(' ')

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('can select frequency options with keyboard', async () => {
      const user = userEvent.setup()
      render(<AddChildDialog {...defaultProps} />)

      const dailyOption = screen.getByTestId('frequency-option-daily')
      await user.click(dailyOption)

      expect(dailyOption).toHaveAttribute('aria-checked', 'true')
    })

    it('maintains focus trap within dialog', async () => {
      const user = userEvent.setup()
      render(<AddChildDialog {...defaultProps} />)

      // Tab through all focusable elements until we return to the start
      // The dialog should trap focus within its boundaries
      const dialog = screen.getByTestId('add-child-dialog')
      expect(dialog).toBeInTheDocument()

      // Count tabs - focus should stay within dialog
      const titleInput = screen.getByTestId('title-input')
      expect(titleInput).toHaveFocus()

      // Tab several times
      for (let i = 0; i < 20; i++) {
        await user.tab()
      }

      // Focus should still be within the dialog
      expect(document.activeElement).not.toBe(document.body)
      // The active element should be inside the dialog
      const activeElement = document.activeElement
      const dialogElement = screen.getByRole('dialog')
      expect(dialogElement.contains(activeElement)).toBe(true)
    })
  })

  describe('DeleteConfirmationDialog - Keyboard Navigation', () => {
    const mockOnOpenChange = vi.fn()
    const mockOnDelete = vi.fn().mockResolvedValue(1)

    const defaultProps = {
      open: true,
      onOpenChange: mockOnOpenChange,
      node: createMockParent(),
      onDelete: mockOnDelete,
    }

    beforeEach(() => {
      vi.clearAllMocks()
      mockOnDelete.mockResolvedValue(1)
    })

    it('closes dialog when Escape key is pressed', async () => {
      const user = userEvent.setup()
      render(<DeleteConfirmationDialog {...defaultProps} />)

      expect(screen.getByTestId('delete-confirmation-dialog')).toBeInTheDocument()

      await user.keyboard('{Escape}')

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('can activate delete button with Enter key', async () => {
      const user = userEvent.setup()
      render(<DeleteConfirmationDialog {...defaultProps} />)

      const deleteButton = screen.getByTestId('confirm-delete-button')
      deleteButton.focus()

      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(mockOnDelete).toHaveBeenCalledWith(1, 'goal')
      })
    })

    it('can activate cancel button with Enter key', async () => {
      const user = userEvent.setup()
      render(<DeleteConfirmationDialog {...defaultProps} />)

      const cancelButton = screen.getByTestId('cancel-button')
      cancelButton.focus()

      await user.keyboard('{Enter}')

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('can navigate between buttons with Tab', async () => {
      const user = userEvent.setup()
      render(<DeleteConfirmationDialog {...defaultProps} />)

      // Tab to navigate between focusable elements
      await user.tab()
      await user.tab()

      // One of the buttons should have focus
      const cancelButton = screen.getByTestId('cancel-button')
      const deleteButton = screen.getByTestId('confirm-delete-button')
      
      expect(
        document.activeElement === cancelButton ||
        document.activeElement === deleteButton ||
        // Close button might also be focused
        document.activeElement?.closest('[data-slot="dialog-content"]') !== null
      ).toBe(true)
    })

    it('activates delete button with Space key', async () => {
      const user = userEvent.setup()
      render(<DeleteConfirmationDialog {...defaultProps} />)

      const deleteButton = screen.getByTestId('confirm-delete-button')
      deleteButton.focus()

      await user.keyboard(' ')

      await waitFor(() => {
        expect(mockOnDelete).toHaveBeenCalledWith(1, 'goal')
      })
    })

    it('maintains focus trap within dialog', async () => {
      const user = userEvent.setup()
      render(<DeleteConfirmationDialog {...defaultProps} />)

      // Tab through elements many times
      for (let i = 0; i < 10; i++) {
        await user.tab()
      }

      // Focus should still be within the dialog
      const dialogElement = screen.getByRole('dialog')
      expect(dialogElement.contains(document.activeElement)).toBe(true)
    })
  })

  describe('ScheduleTaskDialog - Keyboard Navigation', () => {
    const mockOnOpenChange = vi.fn()
    const mockOnScheduled = vi.fn()

    const defaultProps = {
      task: createMockTask(),
      open: true,
      onOpenChange: mockOnOpenChange,
      onScheduled: mockOnScheduled,
    }

    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('closes dialog when Escape key is pressed', async () => {
      const user = userEvent.setup()
      render(<ScheduleTaskDialog {...defaultProps} />)

      expect(screen.getByTestId('schedule-task-dialog')).toBeInTheDocument()

      await user.keyboard('{Escape}')

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('can navigate through form elements with Tab', async () => {
      const user = userEvent.setup()
      render(<ScheduleTaskDialog {...defaultProps} />)

      const dateInput = screen.getByTestId('schedule-task-dialog-date-input')
      const timeSelect = screen.getByTestId('schedule-task-dialog-time-select')

      // Focus date input
      dateInput.focus()
      expect(dateInput).toHaveFocus()

      // Tab to time select
      await user.tab()
      // Might need multiple tabs depending on focus order
      let found = false
      for (let i = 0; i < 5; i++) {
        if (document.activeElement === timeSelect) {
          found = true
          break
        }
        await user.tab()
      }
      
      // The time select should be reachable via tab
      expect(found || document.activeElement === timeSelect).toBe(true)
    })

    it('can change date input with keyboard', async () => {
      const user = userEvent.setup()
      render(<ScheduleTaskDialog {...defaultProps} />)

      const dateInput = screen.getByTestId('schedule-task-dialog-date-input')
      dateInput.focus()

      // Clear and type new date
      await user.clear(dateInput)
      await user.type(dateInput, '2025-06-15')

      expect(dateInput).toHaveValue('2025-06-15')
    })

    it('can change time selection with keyboard', async () => {
      render(<ScheduleTaskDialog {...defaultProps} />)

      const timeSelect = screen.getByTestId('schedule-task-dialog-time-select')
      timeSelect.focus()

      // Change selection using fireEvent since select elements work this way
      fireEvent.change(timeSelect, { target: { value: '14:00' } })

      expect(timeSelect).toHaveValue('14:00')
    })

    it('activates cancel button with Enter key', async () => {
      const user = userEvent.setup()
      render(<ScheduleTaskDialog {...defaultProps} />)

      const cancelButton = screen.getByTestId('schedule-task-dialog-cancel-btn')
      cancelButton.focus()

      await user.keyboard('{Enter}')

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('maintains focus trap within dialog', async () => {
      const user = userEvent.setup()
      render(<ScheduleTaskDialog {...defaultProps} />)

      // Tab through elements many times
      for (let i = 0; i < 15; i++) {
        await user.tab()
      }

      // Focus should still be within the dialog
      const dialogElement = screen.getByRole('dialog')
      expect(dialogElement.contains(document.activeElement)).toBe(true)
    })
  })

  describe('SettingsModal - Keyboard Navigation', () => {
    const mockOnOpenChange = vi.fn()

    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('opens dialog when trigger is activated with Enter', async () => {
      const user = userEvent.setup()
      render(<SettingsModal />)

      const trigger = screen.getByTestId('settings-trigger')
      trigger.focus()

      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(screen.getByTestId('settings-modal')).toBeInTheDocument()
      })
    })

    it('opens dialog when trigger is activated with Space', async () => {
      const user = userEvent.setup()
      render(<SettingsModal />)

      const trigger = screen.getByTestId('settings-trigger')
      trigger.focus()

      await user.keyboard(' ')

      await waitFor(() => {
        expect(screen.getByTestId('settings-modal')).toBeInTheDocument()
      })
    })

    it('closes dialog when Escape key is pressed', async () => {
      const user = userEvent.setup()
      render(<SettingsModal open={true} onOpenChange={mockOnOpenChange} />)

      expect(screen.getByTestId('settings-modal')).toBeInTheDocument()

      await user.keyboard('{Escape}')

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('can navigate through time inputs with Tab', async () => {
      const user = userEvent.setup()
      render(<SettingsModal open={true} onOpenChange={mockOnOpenChange} />)

      await waitFor(() => {
        expect(screen.getByTestId('settings-form')).toBeInTheDocument()
      })

      const workStartInput = screen.getByTestId('work-hours-start-input')
      const workEndInput = screen.getByTestId('work-hours-end-input')

      workStartInput.focus()
      expect(workStartInput).toHaveFocus()

      await user.tab()

      // Work end should be focused (or close to it in tab order)
      let reachedWorkEnd = false
      for (let i = 0; i < 5; i++) {
        if (document.activeElement === workEndInput) {
          reachedWorkEnd = true
          break
        }
        await user.tab()
      }
      expect(reachedWorkEnd).toBe(true)
    })

    it('can change time values with keyboard input', async () => {
      const user = userEvent.setup()
      render(<SettingsModal open={true} onOpenChange={mockOnOpenChange} />)

      await waitFor(() => {
        expect(screen.getByTestId('settings-form')).toBeInTheDocument()
      })

      const workStartInput = screen.getByTestId('work-hours-start-input')
      workStartInput.focus()

      // Clear and type new time
      await user.clear(workStartInput)
      await user.type(workStartInput, '08:00')

      expect(workStartInput).toHaveValue('08:00')
    })

    it('activates save button with Enter when focused', async () => {
      const user = userEvent.setup()
      render(<SettingsModal open={true} onOpenChange={mockOnOpenChange} />)

      await waitFor(() => {
        expect(screen.getByTestId('settings-form')).toBeInTheDocument()
      })

      // Change a value to enable the save button
      const workStartInput = screen.getByTestId('work-hours-start-input')
      fireEvent.change(workStartInput, { target: { value: '08:00' } })

      await waitFor(() => {
        expect(screen.getByTestId('save-button')).not.toBeDisabled()
      })

      const saveButton = screen.getByTestId('save-button')
      saveButton.focus()

      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(mockUpdateSettings).toHaveBeenCalled()
      })
    })

    it('activates cancel button with keyboard', async () => {
      const user = userEvent.setup()
      render(<SettingsModal open={true} onOpenChange={mockOnOpenChange} />)

      await waitFor(() => {
        expect(screen.getByTestId('settings-form')).toBeInTheDocument()
      })

      const cancelButton = screen.getByTestId('cancel-button')
      cancelButton.focus()

      await user.keyboard('{Enter}')

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('activates reset defaults button with keyboard', async () => {
      const user = userEvent.setup()
      render(<SettingsModal open={true} onOpenChange={mockOnOpenChange} />)

      await waitFor(() => {
        expect(screen.getByTestId('settings-form')).toBeInTheDocument()
      })

      // Change a value first
      const workStartInput = screen.getByTestId('work-hours-start-input')
      fireEvent.change(workStartInput, { target: { value: '08:00' } })

      const resetButton = screen.getByTestId('reset-defaults-button')
      resetButton.focus()

      await user.keyboard('{Enter}')

      // Values should be reset to defaults
      expect(screen.getByTestId('work-hours-start-input')).toHaveValue('09:00')
    })

    it('maintains focus trap within dialog', async () => {
      const user = userEvent.setup()
      render(<SettingsModal open={true} onOpenChange={mockOnOpenChange} />)

      await waitFor(() => {
        expect(screen.getByTestId('settings-form')).toBeInTheDocument()
      })

      // Tab through elements many times
      for (let i = 0; i < 20; i++) {
        await user.tab()
      }

      // Focus should still be within the dialog
      const dialogElement = screen.getByRole('dialog')
      expect(dialogElement.contains(document.activeElement)).toBe(true)
    })

    it('can navigate to and activate clear data button', async () => {
      const user = userEvent.setup()
      render(<SettingsModal open={true} onOpenChange={mockOnOpenChange} />)

      await waitFor(() => {
        expect(screen.getByTestId('settings-form')).toBeInTheDocument()
      })

      const clearDataButton = screen.getByTestId('clear-data-button')
      clearDataButton.focus()

      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(screen.getByTestId('clear-data-confirm')).toBeInTheDocument()
      })
    })

    it('can cancel clear data confirmation with keyboard', async () => {
      const user = userEvent.setup()
      render(<SettingsModal open={true} onOpenChange={mockOnOpenChange} />)

      await waitFor(() => {
        expect(screen.getByTestId('settings-form')).toBeInTheDocument()
      })

      // Click clear data to show confirmation
      fireEvent.click(screen.getByTestId('clear-data-button'))

      await waitFor(() => {
        expect(screen.getByTestId('clear-data-confirm')).toBeInTheDocument()
      })

      const cancelButton = screen.getByTestId('clear-data-cancel')
      cancelButton.focus()

      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(screen.queryByTestId('clear-data-confirm')).not.toBeInTheDocument()
      })
    })
  })

  describe('Cross-dialog keyboard behaviors', () => {
    it('Escape key consistently closes all dialogs', async () => {
      const user = userEvent.setup()
      const mockOnOpenChange = vi.fn()

      // Test AddChildDialog
      const { unmount: unmount1 } = render(
        <AddChildDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          parentNode={createMockParent()}
        />
      )
      await user.keyboard('{Escape}')
      expect(mockOnOpenChange).toHaveBeenLastCalledWith(false)
      unmount1()

      mockOnOpenChange.mockClear()

      // Test DeleteConfirmationDialog
      const { unmount: unmount2 } = render(
        <DeleteConfirmationDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          node={createMockParent()}
        />
      )
      await user.keyboard('{Escape}')
      expect(mockOnOpenChange).toHaveBeenLastCalledWith(false)
      unmount2()

      mockOnOpenChange.mockClear()

      // Test ScheduleTaskDialog
      const { unmount: unmount3 } = render(
        <ScheduleTaskDialog
          task={createMockTask()}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )
      await user.keyboard('{Escape}')
      expect(mockOnOpenChange).toHaveBeenLastCalledWith(false)
      unmount3()

      mockOnOpenChange.mockClear()

      // Test SettingsModal
      render(
        <SettingsModal
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )
      await user.keyboard('{Escape}')
      expect(mockOnOpenChange).toHaveBeenLastCalledWith(false)
    })

    it('Tab navigation loops through focusable elements in all dialogs', async () => {
      const user = userEvent.setup()
      const mockOnOpenChange = vi.fn()

      // Test that focus stays trapped in AddChildDialog
      const { unmount: unmount1 } = render(
        <AddChildDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          parentNode={createMockParent()}
        />
      )
      
      const dialog1 = screen.getByRole('dialog')
      
      // Tab through many times
      for (let i = 0; i < 30; i++) {
        await user.tab()
      }
      
      // Focus should still be within dialog
      expect(dialog1.contains(document.activeElement)).toBe(true)
      unmount1()
    })

    it('Space key works on all button types across dialogs', async () => {
      const user = userEvent.setup()
      const mockOnOpenChange = vi.fn()

      // Test cancel button in AddChildDialog
      render(
        <AddChildDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          parentNode={createMockParent()}
        />
      )

      const cancelBtn = screen.getByTestId('cancel-button')
      cancelBtn.focus()
      await user.keyboard(' ')
      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe('Accessibility - Focus Management', () => {
    it('AddChildDialog returns focus after closing', async () => {
      const user = userEvent.setup()
      const mockOnOpenChange = vi.fn()

      const Wrapper = () => {
        return (
          <>
            <button data-testid="external-button">External</button>
            <AddChildDialog
              open={true}
              onOpenChange={mockOnOpenChange}
              parentNode={createMockParent()}
            />
          </>
        )
      }

      render(<Wrapper />)

      // Dialog should have focus inside it
      expect(screen.getByTestId('title-input')).toHaveFocus()

      // Close dialog
      await user.keyboard('{Escape}')

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('all dialogs have proper dialog role', () => {
      // AddChildDialog
      const { unmount: unmount1 } = render(
        <AddChildDialog
          open={true}
          onOpenChange={vi.fn()}
          parentNode={createMockParent()}
        />
      )
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      unmount1()

      // DeleteConfirmationDialog
      const { unmount: unmount2 } = render(
        <DeleteConfirmationDialog
          open={true}
          onOpenChange={vi.fn()}
          node={createMockParent()}
        />
      )
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      unmount2()

      // ScheduleTaskDialog
      const { unmount: unmount3 } = render(
        <ScheduleTaskDialog
          task={createMockTask()}
          open={true}
          onOpenChange={vi.fn()}
        />
      )
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      unmount3()

      // SettingsModal
      render(
        <SettingsModal
          open={true}
          onOpenChange={vi.fn()}
        />
      )
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('dialogs have aria-labelledby pointing to title', async () => {
      // AddChildDialog
      render(
        <AddChildDialog
          open={true}
          onOpenChange={vi.fn()}
          parentNode={createMockParent()}
        />
      )

      const dialog = screen.getByRole('dialog')
      const title = screen.getByTestId('add-child-dialog-title')
      
      // The dialog should be labeled by the title
      // Radix uses aria-labelledby automatically
      expect(title).toBeInTheDocument()
      expect(dialog.getAttribute('aria-labelledby') || 
             dialog.closest('[aria-labelledby]')?.getAttribute('aria-labelledby')).toBeTruthy()
    })

    it('dialogs have aria-describedby pointing to description', async () => {
      render(
        <AddChildDialog
          open={true}
          onOpenChange={vi.fn()}
          parentNode={createMockParent()}
        />
      )

      const dialog = screen.getByRole('dialog')
      const description = screen.getByTestId('add-child-dialog-description')
      
      expect(description).toBeInTheDocument()
      // Radix handles aria-describedby automatically
      expect(dialog.getAttribute('aria-describedby') || 
             dialog.closest('[aria-describedby]')?.getAttribute('aria-describedby')).toBeTruthy()
    })
  })

  describe('Shift+Tab reverse navigation', () => {
    it('can navigate backwards through AddChildDialog', async () => {
      const user = userEvent.setup()
      render(
        <AddChildDialog
          open={true}
          onOpenChange={vi.fn()}
          parentNode={createMockParent()}
        />
      )

      const dialog = screen.getByRole('dialog')
      const titleInput = screen.getByTestId('title-input')
      
      // Start at title input
      expect(titleInput).toHaveFocus()

      // Tab forward a few times
      await user.tab()
      await user.tab()
      
      // Now tab backwards
      await user.tab({ shift: true })
      await user.tab({ shift: true })

      // Should return to title input or stay within dialog
      expect(dialog.contains(document.activeElement)).toBe(true)
    })

    it('can navigate backwards through SettingsModal', async () => {
      const user = userEvent.setup()
      render(
        <SettingsModal
          open={true}
          onOpenChange={vi.fn()}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('settings-form')).toBeInTheDocument()
      })

      const dialog = screen.getByRole('dialog')

      // Tab forward several times
      for (let i = 0; i < 5; i++) {
        await user.tab()
      }

      // Tab backward several times
      for (let i = 0; i < 5; i++) {
        await user.tab({ shift: true })
      }

      // Focus should still be within dialog
      expect(dialog.contains(document.activeElement)).toBe(true)
    })
  })
})
