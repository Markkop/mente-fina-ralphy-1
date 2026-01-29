import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WeeklyView } from '@/components/weekly-view'

// Mock the hooks module
vi.mock('@/lib/hooks', () => ({
  useTasks: vi.fn(() => ({
    allTasks: [],
    toggleTaskCompletion: vi.fn(),
  })),
}))

import { useTasks } from '@/lib/hooks'
const mockUseTasks = vi.mocked(useTasks)

// Helper to create a mock task
function createMockTask(overrides: Partial<ReturnType<typeof mockUseTasks>['allTasks'][0]> = {}) {
  return {
    id: 1,
    parentId: 1,
    title: 'Test Task',
    description: '',
    frequency: 'once' as const,
    isCompleted: false,
    createdAt: new Date(),
    nodeType: 'task' as const,
    ...overrides,
  }
}

// Helper to get a specific Monday
function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

describe('WeeklyView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
      updateTask: vi.fn(),
      toggleTaskCompletion: vi.fn(),
      deleteTask: vi.fn(),
      moveTask: vi.fn(),
      reorderTasks: vi.fn(),
    })
  })

  describe('rendering', () => {
    it('renders the weekly view container', () => {
      render(<WeeklyView />)
      expect(screen.getByTestId('weekly-view')).toBeInTheDocument()
    })

    it('renders the header with navigation', () => {
      render(<WeeklyView />)
      expect(screen.getByTestId('weekly-view-header')).toBeInTheDocument()
    })

    it('renders previous week button', () => {
      render(<WeeklyView />)
      expect(screen.getByTestId('weekly-view-prev')).toBeInTheDocument()
    })

    it('renders next week button', () => {
      render(<WeeklyView />)
      expect(screen.getByTestId('weekly-view-next')).toBeInTheDocument()
    })

    it('renders today button', () => {
      render(<WeeklyView />)
      expect(screen.getByTestId('weekly-view-today')).toBeInTheDocument()
    })

    it('renders week title', () => {
      render(<WeeklyView />)
      expect(screen.getByTestId('weekly-view-title')).toBeInTheDocument()
    })

    it('renders 7 day columns', () => {
      render(<WeeklyView />)
      for (let i = 0; i < 7; i++) {
        expect(screen.getByTestId(`weekly-view-day-${i}`)).toBeInTheDocument()
      }
    })

    it('renders correct day names', () => {
      render(<WeeklyView />)
      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      dayNames.forEach((name, index) => {
        expect(screen.getByTestId(`weekly-view-day-name-${index}`)).toHaveTextContent(name)
      })
    })

    it('renders the weekly grid', () => {
      render(<WeeklyView />)
      expect(screen.getByTestId('weekly-view-grid')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has correct role on container', () => {
      render(<WeeklyView />)
      expect(screen.getByTestId('weekly-view')).toHaveAttribute('role', 'grid')
    })

    it('has correct aria-label on container', () => {
      render(<WeeklyView />)
      expect(screen.getByTestId('weekly-view')).toHaveAttribute('aria-label', 'Weekly task view')
    })

    it('has correct aria-label on navigation buttons', () => {
      render(<WeeklyView />)
      expect(screen.getByTestId('weekly-view-prev')).toHaveAttribute('aria-label', 'Previous week')
      expect(screen.getByTestId('weekly-view-next')).toHaveAttribute('aria-label', 'Next week')
      expect(screen.getByTestId('weekly-view-today')).toHaveAttribute('aria-label', 'Go to today')
    })

    it('has correct role on day columns', () => {
      render(<WeeklyView />)
      for (let i = 0; i < 7; i++) {
        expect(screen.getByTestId(`weekly-view-day-${i}`)).toHaveAttribute('role', 'gridcell')
      }
    })

    it('has correct aria-label on day columns', () => {
      render(<WeeklyView />)
      const fullDayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      fullDayNames.forEach((name, index) => {
        expect(screen.getByTestId(`weekly-view-day-${index}`)).toHaveAttribute('aria-label', name)
      })
    })
  })

  describe('week navigation', () => {
    it('calls onWeekChange when previous week button is clicked', async () => {
      const onWeekChange = vi.fn()
      // Create a Monday using local time to avoid timezone issues
      const weekStart = new Date(2025, 0, 13) // Jan 13, 2025 - A Monday
      render(<WeeklyView weekStartDate={weekStart} onWeekChange={onWeekChange} />)

      await userEvent.click(screen.getByTestId('weekly-view-prev'))

      expect(onWeekChange).toHaveBeenCalledTimes(1)
      const calledDate = onWeekChange.mock.calls[0][0] as Date
      expect(calledDate.getDate()).toBe(6) // Previous Monday (Jan 6, 2025)
    })

    it('calls onWeekChange when next week button is clicked', async () => {
      const onWeekChange = vi.fn()
      // Create a Monday using local time to avoid timezone issues
      const weekStart = new Date(2025, 0, 13) // Jan 13, 2025 - A Monday
      render(<WeeklyView weekStartDate={weekStart} onWeekChange={onWeekChange} />)

      await userEvent.click(screen.getByTestId('weekly-view-next'))

      expect(onWeekChange).toHaveBeenCalledTimes(1)
      const calledDate = onWeekChange.mock.calls[0][0] as Date
      expect(calledDate.getDate()).toBe(20) // Next Monday (Jan 20, 2025)
    })

    it('calls onWeekChange when today button is clicked', async () => {
      const onWeekChange = vi.fn()
      const pastWeek = new Date('2020-01-13')
      render(<WeeklyView weekStartDate={pastWeek} onWeekChange={onWeekChange} />)

      await userEvent.click(screen.getByTestId('weekly-view-today'))

      expect(onWeekChange).toHaveBeenCalledTimes(1)
      // Should be called with a Monday
      const calledDate = onWeekChange.mock.calls[0][0] as Date
      const dayOfWeek = calledDate.getDay()
      expect(dayOfWeek).toBe(1) // Monday
    })
  })

  describe('week range display', () => {
    it('displays correct week range for same month', () => {
      // Create a Monday using local time to avoid timezone issues
      const weekStart = new Date(2025, 0, 13) // Jan 13, 2025 - Monday
      render(<WeeklyView weekStartDate={weekStart} />)

      expect(screen.getByTestId('weekly-view-title')).toHaveTextContent('Jan 13 - 19, 2025')
    })

    it('displays correct week range for cross-month week', () => {
      // Create a Monday using local time to avoid timezone issues
      const weekStart = new Date(2025, 0, 27) // Jan 27, 2025 - Monday
      render(<WeeklyView weekStartDate={weekStart} />)

      expect(screen.getByTestId('weekly-view-title')).toHaveTextContent('Jan 27 - Feb 2, 2025')
    })
  })

  describe('task display', () => {
    it('shows "No tasks" for empty days', () => {
      render(<WeeklyView />)

      for (let i = 0; i < 7; i++) {
        expect(screen.getByTestId(`weekly-view-empty-${i}`)).toHaveTextContent('No tasks')
      }
    })

    it('displays daily tasks on all days', () => {
      const dailyTask = createMockTask({
        id: 1,
        title: 'Daily Task',
        frequency: 'daily',
      })

      mockUseTasks.mockReturnValue({
        allTasks: [dailyTask],
        completedTasks: [],
        pendingTasks: [dailyTask],
        tasksByFrequency: { once: [], daily: [dailyTask], weekly: [], custom: [] },
        dailyTasks: [dailyTask],
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
      })

      render(<WeeklyView />)

      // Daily task should appear on all 7 days
      const taskElements = screen.getAllByTestId('weekly-task-1')
      expect(taskElements).toHaveLength(7)
    })

    it('displays weekly tasks only on their scheduled days', () => {
      // Task scheduled for Monday (1) and Wednesday (3)
      const weeklyTask = createMockTask({
        id: 2,
        title: 'Weekly Task',
        frequency: 'weekly',
        weeklyDays: [1, 3], // Monday and Wednesday
      })

      mockUseTasks.mockReturnValue({
        allTasks: [weeklyTask],
        completedTasks: [],
        pendingTasks: [weeklyTask],
        tasksByFrequency: { once: [], daily: [], weekly: [weeklyTask], custom: [] },
        dailyTasks: [],
        weeklyTasks: [weeklyTask],
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
      })

      render(<WeeklyView />)

      // Weekly task should appear on Monday (index 0) and Wednesday (index 2)
      const taskElements = screen.getAllByTestId('weekly-task-2')
      expect(taskElements).toHaveLength(2)
    })

    it('displays one-time tasks only on their scheduled date', () => {
      const scheduledDate = new Date()
      const monday = getMonday(scheduledDate)
      // Schedule task for Wednesday of current week
      const taskDate = new Date(monday)
      taskDate.setDate(monday.getDate() + 2)

      const oneTimeTask = createMockTask({
        id: 3,
        title: 'One-time Task',
        frequency: 'once',
        scheduledDate: taskDate,
      })

      mockUseTasks.mockReturnValue({
        allTasks: [oneTimeTask],
        completedTasks: [],
        pendingTasks: [oneTimeTask],
        tasksByFrequency: { once: [oneTimeTask], daily: [], weekly: [], custom: [] },
        dailyTasks: [],
        weeklyTasks: [],
        oneTimeTasks: [oneTimeTask],
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
      })

      render(<WeeklyView />)

      // One-time task should appear only once (on Wednesday, index 2)
      const taskElements = screen.getAllByTestId('weekly-task-3')
      expect(taskElements).toHaveLength(1)
    })

    it('shows task count footer when tasks exist', () => {
      const dailyTask = createMockTask({
        id: 1,
        title: 'Daily Task',
        frequency: 'daily',
      })

      mockUseTasks.mockReturnValue({
        allTasks: [dailyTask],
        completedTasks: [],
        pendingTasks: [dailyTask],
        tasksByFrequency: { once: [], daily: [dailyTask], weekly: [], custom: [] },
        dailyTasks: [dailyTask],
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
      })

      render(<WeeklyView />)

      // Count should appear for all days with tasks
      for (let i = 0; i < 7; i++) {
        expect(screen.getByTestId(`weekly-view-count-${i}`)).toHaveTextContent('0/1 done')
      }
    })

    it('shows correct completed count', () => {
      const completedTask = createMockTask({
        id: 1,
        title: 'Completed Task',
        frequency: 'daily',
        isCompleted: true,
      })

      mockUseTasks.mockReturnValue({
        allTasks: [completedTask],
        completedTasks: [completedTask],
        pendingTasks: [],
        tasksByFrequency: { once: [], daily: [completedTask], weekly: [], custom: [] },
        dailyTasks: [completedTask],
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
      })

      render(<WeeklyView />)

      for (let i = 0; i < 7; i++) {
        expect(screen.getByTestId(`weekly-view-count-${i}`)).toHaveTextContent('1/1 done')
      }
    })
  })

  describe('task interactions', () => {
    it('calls onToggleTask when task checkbox is clicked', async () => {
      const onToggleTask = vi.fn()
      const task = createMockTask({
        id: 1,
        title: 'Test Task',
        frequency: 'daily',
      })

      mockUseTasks.mockReturnValue({
        allTasks: [task],
        completedTasks: [],
        pendingTasks: [task],
        tasksByFrequency: { once: [], daily: [task], weekly: [], custom: [] },
        dailyTasks: [task],
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
      })

      render(<WeeklyView onToggleTask={onToggleTask} />)

      const checkboxes = screen.getAllByTestId('weekly-task-checkbox-1')
      await userEvent.click(checkboxes[0])

      expect(onToggleTask).toHaveBeenCalledWith(1)
    })

    it('calls toggleTaskCompletion from useTasks when onToggleTask not provided', async () => {
      const toggleTaskCompletion = vi.fn()
      const task = createMockTask({
        id: 1,
        title: 'Test Task',
        frequency: 'daily',
      })

      mockUseTasks.mockReturnValue({
        allTasks: [task],
        completedTasks: [],
        pendingTasks: [task],
        tasksByFrequency: { once: [], daily: [task], weekly: [], custom: [] },
        dailyTasks: [task],
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
        toggleTaskCompletion,
        deleteTask: vi.fn(),
        moveTask: vi.fn(),
        reorderTasks: vi.fn(),
      })

      render(<WeeklyView />)

      const checkboxes = screen.getAllByTestId('weekly-task-checkbox-1')
      await userEvent.click(checkboxes[0])

      expect(toggleTaskCompletion).toHaveBeenCalledWith(1)
    })

    it('calls onTaskClick when task is clicked', async () => {
      const onTaskClick = vi.fn()
      const task = createMockTask({
        id: 1,
        title: 'Test Task',
        frequency: 'daily',
      })

      mockUseTasks.mockReturnValue({
        allTasks: [task],
        completedTasks: [],
        pendingTasks: [task],
        tasksByFrequency: { once: [], daily: [task], weekly: [], custom: [] },
        dailyTasks: [task],
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
      })

      render(<WeeklyView onTaskClick={onTaskClick} />)

      const tasks = screen.getAllByTestId('weekly-task-1')
      await userEvent.click(tasks[0])

      expect(onTaskClick).toHaveBeenCalledWith(task)
    })

    it('handles keyboard navigation on tasks', async () => {
      const onTaskClick = vi.fn()
      const task = createMockTask({
        id: 1,
        title: 'Test Task',
        frequency: 'daily',
      })

      mockUseTasks.mockReturnValue({
        allTasks: [task],
        completedTasks: [],
        pendingTasks: [task],
        tasksByFrequency: { once: [], daily: [task], weekly: [], custom: [] },
        dailyTasks: [task],
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
      })

      render(<WeeklyView onTaskClick={onTaskClick} />)

      const tasks = screen.getAllByTestId('weekly-task-1')
      tasks[0].focus()
      fireEvent.keyDown(tasks[0], { key: 'Enter' })

      expect(onTaskClick).toHaveBeenCalledWith(task)
    })
  })

  describe('task item display', () => {
    it('shows checkbox for incomplete task', () => {
      const task = createMockTask({
        id: 1,
        title: 'Incomplete Task',
        frequency: 'daily',
        isCompleted: false,
      })

      mockUseTasks.mockReturnValue({
        allTasks: [task],
        completedTasks: [],
        pendingTasks: [task],
        tasksByFrequency: { once: [], daily: [task], weekly: [], custom: [] },
        dailyTasks: [task],
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
      })

      render(<WeeklyView />)

      const checkboxes = screen.getAllByTestId('weekly-task-checkbox-1')
      expect(checkboxes[0]).toHaveAttribute('aria-label', 'Mark as complete')
    })

    it('shows checked checkbox for completed task', () => {
      const task = createMockTask({
        id: 1,
        title: 'Completed Task',
        frequency: 'daily',
        isCompleted: true,
      })

      mockUseTasks.mockReturnValue({
        allTasks: [task],
        completedTasks: [task],
        pendingTasks: [],
        tasksByFrequency: { once: [], daily: [task], weekly: [], custom: [] },
        dailyTasks: [task],
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
      })

      render(<WeeklyView />)

      const checkboxes = screen.getAllByTestId('weekly-task-checkbox-1')
      expect(checkboxes[0]).toHaveAttribute('aria-label', 'Mark as incomplete')
    })

    it('shows frequency indicator for daily tasks', () => {
      const task = createMockTask({
        id: 1,
        title: 'Daily Task',
        frequency: 'daily',
      })

      mockUseTasks.mockReturnValue({
        allTasks: [task],
        completedTasks: [],
        pendingTasks: [task],
        tasksByFrequency: { once: [], daily: [task], weekly: [], custom: [] },
        dailyTasks: [task],
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
      })

      render(<WeeklyView />)

      const frequencyIndicators = screen.getAllByTestId('weekly-task-frequency-1')
      expect(frequencyIndicators.length).toBeGreaterThan(0)
      expect(frequencyIndicators[0]).toHaveAttribute('aria-label', 'Daily task')
    })

    it('shows frequency indicator for weekly tasks', () => {
      const task = createMockTask({
        id: 2,
        title: 'Weekly Task',
        frequency: 'weekly',
        weeklyDays: [1], // Monday only
      })

      mockUseTasks.mockReturnValue({
        allTasks: [task],
        completedTasks: [],
        pendingTasks: [task],
        tasksByFrequency: { once: [], daily: [], weekly: [task], custom: [] },
        dailyTasks: [],
        weeklyTasks: [task],
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
      })

      render(<WeeklyView />)

      const frequencyIndicators = screen.getAllByTestId('weekly-task-frequency-2')
      expect(frequencyIndicators.length).toBe(1)
      expect(frequencyIndicators[0]).toHaveAttribute('aria-label', 'Weekly task')
    })

    it('does not show frequency indicator for one-time tasks', () => {
      const monday = getMonday(new Date())
      const task = createMockTask({
        id: 3,
        title: 'One-time Task',
        frequency: 'once',
        scheduledDate: monday,
      })

      mockUseTasks.mockReturnValue({
        allTasks: [task],
        completedTasks: [],
        pendingTasks: [task],
        tasksByFrequency: { once: [task], daily: [], weekly: [], custom: [] },
        dailyTasks: [],
        weeklyTasks: [],
        oneTimeTasks: [task],
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
      })

      render(<WeeklyView />)

      expect(screen.queryByTestId('weekly-task-frequency-3')).not.toBeInTheDocument()
    })

    it('displays task title correctly', () => {
      const task = createMockTask({
        id: 1,
        title: 'My Important Task',
        frequency: 'daily',
      })

      mockUseTasks.mockReturnValue({
        allTasks: [task],
        completedTasks: [],
        pendingTasks: [task],
        tasksByFrequency: { once: [], daily: [task], weekly: [], custom: [] },
        dailyTasks: [task],
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
      })

      render(<WeeklyView />)

      const titles = screen.getAllByTestId('weekly-task-title-1')
      expect(titles[0]).toHaveTextContent('My Important Task')
    })
  })

  describe('CSS Grid layout', () => {
    it('applies grid-cols-7 class to the grid', () => {
      render(<WeeklyView />)

      const grid = screen.getByTestId('weekly-view-grid')
      expect(grid).toHaveClass('grid-cols-7')
    })

    it('applies grid class to the grid container', () => {
      render(<WeeklyView />)

      const grid = screen.getByTestId('weekly-view-grid')
      expect(grid).toHaveClass('grid')
    })
  })

  describe('custom className', () => {
    it('applies custom className to container', () => {
      render(<WeeklyView className="custom-class" />)

      expect(screen.getByTestId('weekly-view')).toHaveClass('custom-class')
    })
  })

  describe('custom frequency tasks', () => {
    it('displays custom frequency tasks on all days', () => {
      const customTask = createMockTask({
        id: 4,
        title: 'Custom Task',
        frequency: 'custom',
      })

      mockUseTasks.mockReturnValue({
        allTasks: [customTask],
        completedTasks: [],
        pendingTasks: [customTask],
        tasksByFrequency: { once: [], daily: [], weekly: [], custom: [customTask] },
        dailyTasks: [],
        weeklyTasks: [],
        oneTimeTasks: [],
        customTasks: [customTask],
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
      })

      render(<WeeklyView />)

      // Custom task should appear on all 7 days (for now)
      const taskElements = screen.getAllByTestId('weekly-task-4')
      expect(taskElements).toHaveLength(7)
    })
  })
})
