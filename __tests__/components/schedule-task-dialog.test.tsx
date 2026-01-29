import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ScheduleTaskDialog } from '@/components/schedule-task-dialog'
import type { TaskWithMeta } from '@/lib/hooks'

// Mock the hooks module
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
    updateTask: vi.fn(),
  })),
  DEFAULT_SETTINGS: {
    workHoursStart: '09:00',
    workHoursEnd: '18:00',
    sleepStart: '23:00',
    sleepEnd: '07:00',
  },
}))

import { useSettings, useTasks } from '@/lib/hooks'
const mockUseSettings = vi.mocked(useSettings)
const mockUseTasks = vi.mocked(useTasks)

// Helper to create a mock task
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

describe('ScheduleTaskDialog', () => {
  const mockOnOpenChange = vi.fn()
  const mockOnScheduled = vi.fn()
  const mockUpdateTask = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSettings.mockReturnValue({
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
    })
    mockUseTasks.mockReturnValue({
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
      updateTask: mockUpdateTask,
      toggleTaskCompletion: vi.fn(),
      deleteTask: vi.fn(),
      moveTask: vi.fn(),
      reorderTasks: vi.fn(),
    })
  })

  describe('rendering', () => {
    it('renders the dialog when open with a task', () => {
      const task = createMockTask()
      render(
        <ScheduleTaskDialog
          task={task}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      expect(screen.getByTestId('schedule-task-dialog')).toBeInTheDocument()
    })

    it('renders the dialog title', () => {
      const task = createMockTask()
      render(
        <ScheduleTaskDialog
          task={task}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      expect(screen.getByTestId('schedule-task-dialog-title')).toHaveTextContent('Schedule Task')
    })

    it('renders the dialog description', () => {
      const task = createMockTask()
      render(
        <ScheduleTaskDialog
          task={task}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      expect(screen.getByTestId('schedule-task-dialog-description')).toHaveTextContent(
        'Choose a date and time to schedule this task.'
      )
    })

    it('renders the task title in the info section', () => {
      const task = createMockTask({ title: 'My Test Task' })
      render(
        <ScheduleTaskDialog
          task={task}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      expect(screen.getByTestId('schedule-task-dialog-task-info')).toHaveTextContent('My Test Task')
    })

    it('renders the task description in the info section', () => {
      const task = createMockTask({ description: 'Task description here' })
      render(
        <ScheduleTaskDialog
          task={task}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      expect(screen.getByTestId('schedule-task-dialog-task-info')).toHaveTextContent(
        'Task description here'
      )
    })

    it('renders the frequency badge', () => {
      const task = createMockTask({ frequency: 'daily' })
      render(
        <ScheduleTaskDialog
          task={task}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      expect(screen.getByTestId('schedule-task-dialog-frequency')).toHaveTextContent('Daily')
    })

    it('renders date input', () => {
      const task = createMockTask()
      render(
        <ScheduleTaskDialog
          task={task}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      expect(screen.getByTestId('schedule-task-dialog-date-input')).toBeInTheDocument()
    })

    it('renders time select', () => {
      const task = createMockTask()
      render(
        <ScheduleTaskDialog
          task={task}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      expect(screen.getByTestId('schedule-task-dialog-time-select')).toBeInTheDocument()
    })

    it('renders cancel button', () => {
      const task = createMockTask()
      render(
        <ScheduleTaskDialog
          task={task}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      expect(screen.getByTestId('schedule-task-dialog-cancel-btn')).toBeInTheDocument()
    })

    it('renders schedule button', () => {
      const task = createMockTask()
      render(
        <ScheduleTaskDialog
          task={task}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      expect(screen.getByTestId('schedule-task-dialog-schedule-btn')).toBeInTheDocument()
    })

    it('does not render when task is null', () => {
      render(
        <ScheduleTaskDialog
          task={null}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      expect(screen.queryByTestId('schedule-task-dialog')).not.toBeInTheDocument()
    })

    it('does not render when open is false', () => {
      const task = createMockTask()
      render(
        <ScheduleTaskDialog
          task={task}
          open={false}
          onOpenChange={mockOnOpenChange}
        />
      )

      expect(screen.queryByTestId('schedule-task-dialog')).not.toBeInTheDocument()
    })
  })

  describe('date picker', () => {
    it('displays formatted date', () => {
      const task = createMockTask()
      render(
        <ScheduleTaskDialog
          task={task}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      expect(screen.getByTestId('schedule-task-dialog-date-display')).toBeInTheDocument()
    })

    it('updates date when changed', async () => {
      const task = createMockTask()
      render(
        <ScheduleTaskDialog
          task={task}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const dateInput = screen.getByTestId('schedule-task-dialog-date-input')
      fireEvent.change(dateInput, { target: { value: '2025-06-15' } })

      expect(dateInput).toHaveValue('2025-06-15')
    })

    it('initializes with task scheduled date if available', () => {
      const scheduledDate = new Date('2025-03-20T14:30:00')
      const task = createMockTask({ scheduledDate })
      render(
        <ScheduleTaskDialog
          task={task}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const dateInput = screen.getByTestId('schedule-task-dialog-date-input')
      expect(dateInput).toHaveValue('2025-03-20')
    })
  })

  describe('time picker', () => {
    it('renders all 48 time slots (every 30 minutes)', () => {
      const task = createMockTask()
      render(
        <ScheduleTaskDialog
          task={task}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const timeSelect = screen.getByTestId('schedule-task-dialog-time-select')
      const options = timeSelect.querySelectorAll('option')
      expect(options).toHaveLength(48)
    })

    it('shows conflict indicator for work hours', () => {
      const task = createMockTask()
      render(
        <ScheduleTaskDialog
          task={task}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const timeSelect = screen.getByTestId('schedule-task-dialog-time-select')
      // Work hours are 09:00-18:00
      const workHourOption = Array.from(timeSelect.querySelectorAll('option')).find(
        (opt) => opt.value === '10:00'
      )
      expect(workHourOption).toHaveTextContent('(work)')
    })

    it('shows conflict indicator for sleep hours', () => {
      const task = createMockTask()
      render(
        <ScheduleTaskDialog
          task={task}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const timeSelect = screen.getByTestId('schedule-task-dialog-time-select')
      // Sleep hours are 23:00-07:00
      const sleepHourOption = Array.from(timeSelect.querySelectorAll('option')).find(
        (opt) => opt.value === '02:00'
      )
      expect(sleepHourOption).toHaveTextContent('(sleep)')
    })

    it('updates time when changed', async () => {
      const task = createMockTask()
      render(
        <ScheduleTaskDialog
          task={task}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const timeSelect = screen.getByTestId('schedule-task-dialog-time-select')
      fireEvent.change(timeSelect, { target: { value: '15:30' } })

      expect(timeSelect).toHaveValue('15:30')
    })
  })

  describe('conflict warning', () => {
    it('shows work conflict warning when selecting work hours', async () => {
      const task = createMockTask()
      render(
        <ScheduleTaskDialog
          task={task}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const timeSelect = screen.getByTestId('schedule-task-dialog-time-select')
      fireEvent.change(timeSelect, { target: { value: '10:00' } })

      expect(screen.getByTestId('schedule-task-dialog-conflict-warning')).toHaveTextContent(
        'work hours'
      )
    })

    it('shows sleep conflict warning when selecting sleep hours', async () => {
      const task = createMockTask()
      render(
        <ScheduleTaskDialog
          task={task}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const timeSelect = screen.getByTestId('schedule-task-dialog-time-select')
      fireEvent.change(timeSelect, { target: { value: '02:00' } })

      expect(screen.getByTestId('schedule-task-dialog-conflict-warning')).toHaveTextContent(
        'sleep hours'
      )
    })

    it('does not show conflict warning for free time', async () => {
      const task = createMockTask()
      render(
        <ScheduleTaskDialog
          task={task}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const timeSelect = screen.getByTestId('schedule-task-dialog-time-select')
      // 20:00 is after work (18:00) and before sleep (23:00)
      fireEvent.change(timeSelect, { target: { value: '20:00' } })

      expect(screen.queryByTestId('schedule-task-dialog-conflict-warning')).not.toBeInTheDocument()
    })
  })

  describe('frequency display', () => {
    it('shows "One-time" for once frequency', () => {
      const task = createMockTask({ frequency: 'once' })
      render(
        <ScheduleTaskDialog
          task={task}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      expect(screen.getByTestId('schedule-task-dialog-frequency')).toHaveTextContent('One-time')
    })

    it('shows "Daily" for daily frequency', () => {
      const task = createMockTask({ frequency: 'daily' })
      render(
        <ScheduleTaskDialog
          task={task}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      expect(screen.getByTestId('schedule-task-dialog-frequency')).toHaveTextContent('Daily')
    })

    it('shows "Weekly" for weekly frequency', () => {
      const task = createMockTask({ frequency: 'weekly' })
      render(
        <ScheduleTaskDialog
          task={task}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      expect(screen.getByTestId('schedule-task-dialog-frequency')).toHaveTextContent('Weekly')
    })

    it('shows "Custom" for custom frequency', () => {
      const task = createMockTask({ frequency: 'custom' })
      render(
        <ScheduleTaskDialog
          task={task}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      expect(screen.getByTestId('schedule-task-dialog-frequency')).toHaveTextContent('Custom')
    })
  })

  describe('actions', () => {
    it('calls onOpenChange(false) when cancel button is clicked', async () => {
      const task = createMockTask()
      render(
        <ScheduleTaskDialog
          task={task}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      await userEvent.click(screen.getByTestId('schedule-task-dialog-cancel-btn'))

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('calls updateTask when schedule button is clicked', async () => {
      const task = createMockTask()
      mockUpdateTask.mockResolvedValue(undefined)

      render(
        <ScheduleTaskDialog
          task={task}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      await userEvent.click(screen.getByTestId('schedule-task-dialog-schedule-btn'))

      await waitFor(() => {
        expect(mockUpdateTask).toHaveBeenCalledWith(1, expect.objectContaining({
          scheduledDate: expect.any(Date),
        }))
      })
    })

    it('calls onScheduled callback after successful scheduling', async () => {
      const task = createMockTask()
      mockUpdateTask.mockResolvedValue(undefined)

      render(
        <ScheduleTaskDialog
          task={task}
          open={true}
          onOpenChange={mockOnOpenChange}
          onScheduled={mockOnScheduled}
        />
      )

      await userEvent.click(screen.getByTestId('schedule-task-dialog-schedule-btn'))

      await waitFor(() => {
        expect(mockOnScheduled).toHaveBeenCalledWith(1, expect.any(Date))
      })
    })

    it('closes dialog after successful scheduling', async () => {
      const task = createMockTask()
      mockUpdateTask.mockResolvedValue(undefined)

      render(
        <ScheduleTaskDialog
          task={task}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      await userEvent.click(screen.getByTestId('schedule-task-dialog-schedule-btn'))

      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false)
      })
    })

    it('shows error message when scheduling fails', async () => {
      const task = createMockTask()
      mockUpdateTask.mockRejectedValue(new Error('Network error'))

      render(
        <ScheduleTaskDialog
          task={task}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      await userEvent.click(screen.getByTestId('schedule-task-dialog-schedule-btn'))

      await waitFor(() => {
        expect(screen.getByTestId('schedule-task-dialog-error')).toHaveTextContent('Network error')
      })
    })

    it('disables buttons while scheduling', async () => {
      const task = createMockTask()
      // Make updateTask hang
      mockUpdateTask.mockImplementation(() => new Promise(() => {}))

      render(
        <ScheduleTaskDialog
          task={task}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      await userEvent.click(screen.getByTestId('schedule-task-dialog-schedule-btn'))

      expect(screen.getByTestId('schedule-task-dialog-schedule-btn')).toBeDisabled()
      expect(screen.getByTestId('schedule-task-dialog-cancel-btn')).toBeDisabled()
    })

    it('shows "Scheduling..." text while scheduling', async () => {
      const task = createMockTask()
      mockUpdateTask.mockImplementation(() => new Promise(() => {}))

      render(
        <ScheduleTaskDialog
          task={task}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      await userEvent.click(screen.getByTestId('schedule-task-dialog-schedule-btn'))

      expect(screen.getByTestId('schedule-task-dialog-schedule-btn')).toHaveTextContent('Scheduling...')
    })
  })

  describe('clear schedule', () => {
    it('shows clear schedule button when task has a scheduled date', () => {
      const task = createMockTask({ scheduledDate: new Date() })
      render(
        <ScheduleTaskDialog
          task={task}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      expect(screen.getByTestId('schedule-task-dialog-clear-btn')).toBeInTheDocument()
    })

    it('does not show clear schedule button when task has no scheduled date', () => {
      const task = createMockTask({ scheduledDate: null })
      render(
        <ScheduleTaskDialog
          task={task}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      expect(screen.queryByTestId('schedule-task-dialog-clear-btn')).not.toBeInTheDocument()
    })

    it('calls updateTask with null scheduledDate when clear is clicked', async () => {
      const task = createMockTask({ scheduledDate: new Date() })
      mockUpdateTask.mockResolvedValue(undefined)

      render(
        <ScheduleTaskDialog
          task={task}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      await userEvent.click(screen.getByTestId('schedule-task-dialog-clear-btn'))

      await waitFor(() => {
        expect(mockUpdateTask).toHaveBeenCalledWith(1, { scheduledDate: null })
      })
    })

    it('closes dialog after clearing schedule', async () => {
      const task = createMockTask({ scheduledDate: new Date() })
      mockUpdateTask.mockResolvedValue(undefined)

      render(
        <ScheduleTaskDialog
          task={task}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      await userEvent.click(screen.getByTestId('schedule-task-dialog-clear-btn'))

      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false)
      })
    })
  })

  describe('custom settings', () => {
    it('uses provided settings override', () => {
      const task = createMockTask()
      const customSettings = {
        workHoursStart: '08:00',
        workHoursEnd: '17:00',
        sleepStart: '22:00',
        sleepEnd: '06:00',
      }

      render(
        <ScheduleTaskDialog
          task={task}
          open={true}
          onOpenChange={mockOnOpenChange}
          settings={customSettings}
        />
      )

      const timeSelect = screen.getByTestId('schedule-task-dialog-time-select')
      // With custom settings, 08:00 should be work hours
      const workHourOption = Array.from(timeSelect.querySelectorAll('option')).find(
        (opt) => opt.value === '08:00'
      )
      expect(workHourOption).toHaveTextContent('(work)')

      // And 17:00 should be free time (work ends at 17:00)
      const freeTimeOption = Array.from(timeSelect.querySelectorAll('option')).find(
        (opt) => opt.value === '17:00'
      )
      expect(freeTimeOption).not.toHaveTextContent('(work)')
    })
  })

  describe('accessibility', () => {
    it('has accessible labels for date input', () => {
      const task = createMockTask()
      render(
        <ScheduleTaskDialog
          task={task}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const dateInput = screen.getByTestId('schedule-task-dialog-date-input')
      expect(dateInput).toHaveAttribute('id', 'schedule-date')
      expect(screen.getByLabelText('Date')).toBeInTheDocument()
    })

    it('has accessible labels for time select', () => {
      const task = createMockTask()
      render(
        <ScheduleTaskDialog
          task={task}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )

      const timeSelect = screen.getByTestId('schedule-task-dialog-time-select')
      expect(timeSelect).toHaveAttribute('id', 'schedule-time')
      expect(screen.getByLabelText('Time')).toBeInTheDocument()
    })
  })
})
