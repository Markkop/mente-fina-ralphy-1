import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TaskNode } from '@/components/task-node'
import type { TreeNodeWithChildren } from '@/lib/goal-store'

// Helper to create a mock task node
function createMockTask(
  overrides: Partial<
    TreeNodeWithChildren & {
      isCompleted: boolean
      frequency: string
      weeklyDays?: number[]
      scheduledDate?: Date | null
      measurement?: string
    }
  > = {}
): TreeNodeWithChildren {
  return {
    id: 1,
    title: 'Test Task',
    nodeType: 'task',
    status: 'active',
    type: 'task',
    createdAt: new Date(),
    children: [],
    isCompleted: false,
    frequency: 'once',
    parentId: 1,
    ...overrides,
  } as TreeNodeWithChildren
}

describe('TaskNode', () => {
  describe('rendering', () => {
    it('renders a task with title', () => {
      const task = createMockTask({ id: 1, title: 'My Task' })
      render(<TaskNode node={task} />)

      expect(screen.getByTestId('task-title-1')).toHaveTextContent('My Task')
    })

    it('renders task container', () => {
      const task = createMockTask({ id: 2 })
      render(<TaskNode node={task} />)

      expect(screen.getByTestId('task-node-2')).toBeInTheDocument()
      expect(screen.getByTestId('task-row-2')).toBeInTheDocument()
    })

    it('renders checkbox button', () => {
      const task = createMockTask({ id: 3 })
      render(<TaskNode node={task} />)

      expect(screen.getByTestId('task-checkbox-3')).toBeInTheDocument()
    })

    it('renders description when provided', () => {
      const task = createMockTask({
        id: 4,
        title: 'Task',
        description: 'Task description',
      })
      render(<TaskNode node={task} />)

      expect(screen.getByTestId('task-description-4')).toHaveTextContent('Task description')
    })

    it('renders measurement when provided', () => {
      const task = createMockTask({
        id: 5,
        title: 'Task',
        measurement: '30 minutes',
      })
      render(<TaskNode node={task} />)

      expect(screen.getByTestId('task-description-5')).toHaveTextContent('30 minutes')
    })

    it('prefers measurement over description when both provided', () => {
      const task = createMockTask({
        id: 6,
        title: 'Task',
        description: 'Description',
        measurement: 'Measurement',
      })
      render(<TaskNode node={task} />)

      expect(screen.getByTestId('task-description-6')).toHaveTextContent('Measurement')
    })
  })

  describe('checkbox', () => {
    it('shows unchecked state for incomplete task', () => {
      const task = createMockTask({ id: 10, isCompleted: false })
      render(<TaskNode node={task} />)

      const checkbox = screen.getByTestId('task-checkbox-10')
      expect(checkbox).toHaveAttribute('aria-label', 'Mark as complete')
    })

    it('shows checked state for completed task', () => {
      const task = createMockTask({ id: 11, isCompleted: true })
      render(<TaskNode node={task} />)

      const checkbox = screen.getByTestId('task-checkbox-11')
      expect(checkbox).toHaveAttribute('aria-label', 'Mark as incomplete')
      expect(checkbox).toHaveClass('bg-green-500')
    })

    it('applies strikethrough to completed task title', () => {
      const task = createMockTask({ id: 12, title: 'Completed Task', isCompleted: true })
      render(<TaskNode node={task} />)

      const title = screen.getByTestId('task-title-12')
      expect(title).toHaveClass('line-through')
    })

    it('does not apply strikethrough to incomplete task title', () => {
      const task = createMockTask({ id: 13, title: 'Incomplete Task', isCompleted: false })
      render(<TaskNode node={task} />)

      const title = screen.getByTestId('task-title-13')
      expect(title).not.toHaveClass('line-through')
    })

    it('calls onToggleTask when checkbox is clicked', () => {
      const onToggleTask = vi.fn()
      const task = createMockTask({ id: 14, isCompleted: false })
      render(<TaskNode node={task} onToggleTask={onToggleTask} />)

      fireEvent.click(screen.getByTestId('task-checkbox-14'))

      expect(onToggleTask).toHaveBeenCalledWith(14, true)
    })

    it('calls onToggleTask with false when completed task checkbox is clicked', () => {
      const onToggleTask = vi.fn()
      const task = createMockTask({ id: 15, isCompleted: true })
      render(<TaskNode node={task} onToggleTask={onToggleTask} />)

      fireEvent.click(screen.getByTestId('task-checkbox-15'))

      expect(onToggleTask).toHaveBeenCalledWith(15, false)
    })

    it('stops propagation when checkbox is clicked', () => {
      const onToggleTask = vi.fn()
      const onSelect = vi.fn()
      const task = createMockTask({ id: 16, isCompleted: false })
      render(<TaskNode node={task} onToggleTask={onToggleTask} onSelect={onSelect} />)

      fireEvent.click(screen.getByTestId('task-checkbox-16'))

      // Should call toggle but not select
      expect(onToggleTask).toHaveBeenCalled()
      expect(onSelect).not.toHaveBeenCalled()
    })
  })

  describe('frequency badge', () => {
    it('shows one-time badge for once frequency', () => {
      const task = createMockTask({ id: 20, frequency: 'once' })
      render(<TaskNode node={task} />)

      const badge = screen.getByTestId('task-frequency-badge-20')
      expect(badge).toHaveTextContent('One-time')
    })

    it('shows daily badge for daily frequency', () => {
      const task = createMockTask({ id: 21, frequency: 'daily' })
      render(<TaskNode node={task} />)

      const badge = screen.getByTestId('task-frequency-badge-21')
      expect(badge).toHaveTextContent('Daily')
    })

    it('shows weekly badge for weekly frequency', () => {
      const task = createMockTask({ id: 22, frequency: 'weekly' })
      render(<TaskNode node={task} />)

      const badge = screen.getByTestId('task-frequency-badge-22')
      expect(badge).toHaveTextContent('Weekly')
    })

    it('shows custom badge for custom frequency', () => {
      const task = createMockTask({ id: 23, frequency: 'custom' })
      render(<TaskNode node={task} />)

      const badge = screen.getByTestId('task-frequency-badge-23')
      expect(badge).toHaveTextContent('Custom')
    })

    it('applies correct styling for daily frequency', () => {
      const task = createMockTask({ id: 24, frequency: 'daily' })
      render(<TaskNode node={task} />)

      const badge = screen.getByTestId('task-frequency-badge-24')
      expect(badge).toHaveClass('bg-violet-100')
    })

    it('applies correct styling for weekly frequency', () => {
      const task = createMockTask({ id: 25, frequency: 'weekly' })
      render(<TaskNode node={task} />)

      const badge = screen.getByTestId('task-frequency-badge-25')
      expect(badge).toHaveClass('bg-blue-100')
    })

    it('applies correct styling for custom frequency', () => {
      const task = createMockTask({ id: 26, frequency: 'custom' })
      render(<TaskNode node={task} />)

      const badge = screen.getByTestId('task-frequency-badge-26')
      expect(badge).toHaveClass('bg-amber-100')
    })
  })

  describe('weekly days', () => {
    it('shows weekly days when frequency is weekly and weeklyDays provided', () => {
      const task = createMockTask({
        id: 30,
        frequency: 'weekly',
        weeklyDays: [1, 3, 5], // Mon, Wed, Fri
      })
      render(<TaskNode node={task} />)

      expect(screen.getByTestId('task-weekly-days-30')).toHaveTextContent('(Mon, Wed, Fri)')
    })

    it('shows "Weekdays" for Mon-Fri', () => {
      const task = createMockTask({
        id: 31,
        frequency: 'weekly',
        weeklyDays: [1, 2, 3, 4, 5],
      })
      render(<TaskNode node={task} />)

      expect(screen.getByTestId('task-weekly-days-31')).toHaveTextContent('(Weekdays)')
    })

    it('shows "Weekends" for Sat-Sun', () => {
      const task = createMockTask({
        id: 32,
        frequency: 'weekly',
        weeklyDays: [0, 6],
      })
      render(<TaskNode node={task} />)

      expect(screen.getByTestId('task-weekly-days-32')).toHaveTextContent('(Weekends)')
    })

    it('shows "Every day" for all days', () => {
      const task = createMockTask({
        id: 33,
        frequency: 'weekly',
        weeklyDays: [0, 1, 2, 3, 4, 5, 6],
      })
      render(<TaskNode node={task} />)

      expect(screen.getByTestId('task-weekly-days-33')).toHaveTextContent('(Every day)')
    })

    it('does not show weekly days for non-weekly frequency', () => {
      const task = createMockTask({
        id: 34,
        frequency: 'daily',
        weeklyDays: [1, 2, 3],
      })
      render(<TaskNode node={task} />)

      expect(screen.queryByTestId('task-weekly-days-34')).not.toBeInTheDocument()
    })
  })

  describe('scheduled date', () => {
    it('shows scheduled date for one-time tasks', () => {
      const date = new Date('2026-02-15')
      const task = createMockTask({
        id: 40,
        frequency: 'once',
        scheduledDate: date,
      })
      render(<TaskNode node={task} />)

      expect(screen.getByTestId('task-scheduled-date-40')).toBeInTheDocument()
    })

    it('does not show scheduled date for recurring tasks', () => {
      const date = new Date('2026-02-15')
      const task = createMockTask({
        id: 41,
        frequency: 'daily',
        scheduledDate: date,
      })
      render(<TaskNode node={task} />)

      expect(screen.queryByTestId('task-scheduled-date-41')).not.toBeInTheDocument()
    })
  })

  describe('selection', () => {
    it('calls onSelect when task row is clicked', () => {
      const onSelect = vi.fn()
      const task = createMockTask({ id: 50, title: 'Clickable Task' })
      render(<TaskNode node={task} onSelect={onSelect} />)

      fireEvent.click(screen.getByTestId('task-row-50'))

      expect(onSelect).toHaveBeenCalledWith(task)
    })

    it('applies selected styling when task is selected', () => {
      const task = createMockTask({ id: 51 })
      render(<TaskNode node={task} selectedNodeId={51} />)

      const row = screen.getByTestId('task-row-51')
      expect(row).toHaveClass('ring-2')
    })

    it('does not apply selected styling when different node is selected', () => {
      const task = createMockTask({ id: 52 })
      render(<TaskNode node={task} selectedNodeId={999} />)

      const row = screen.getByTestId('task-row-52')
      expect(row).not.toHaveClass('ring-2')
    })
  })

  describe('indentation', () => {
    it('applies correct margin based on depth', () => {
      const task = createMockTask({ id: 60 })
      render(<TaskNode node={task} depth={2} />)

      const row = screen.getByTestId('task-row-60')
      expect(row).toHaveStyle({ marginLeft: '48px' }) // 2 * 24 = 48
    })

    it('has no margin at depth 0', () => {
      const task = createMockTask({ id: 61 })
      render(<TaskNode node={task} depth={0} />)

      const row = screen.getByTestId('task-row-61')
      expect(row).toHaveStyle({ marginLeft: '0px' })
    })
  })

  describe('accessibility', () => {
    it('has correct aria attributes for tree item', () => {
      const task = createMockTask({ id: 70 })
      render(<TaskNode node={task} selectedNodeId={70} />)

      const row = screen.getByTestId('task-row-70')
      expect(row).toHaveAttribute('role', 'treeitem')
      expect(row).toHaveAttribute('aria-selected', 'true')
    })

    it('has correct aria-selected when not selected', () => {
      const task = createMockTask({ id: 71 })
      render(<TaskNode node={task} selectedNodeId={null} />)

      const row = screen.getByTestId('task-row-71')
      expect(row).toHaveAttribute('aria-selected', 'false')
    })
  })

  describe('completed state styling', () => {
    it('applies reduced opacity to completed task row', () => {
      const task = createMockTask({ id: 80, isCompleted: true })
      render(<TaskNode node={task} />)

      const row = screen.getByTestId('task-row-80')
      expect(row).toHaveClass('opacity-75')
    })

    it('does not apply reduced opacity to incomplete task row', () => {
      const task = createMockTask({ id: 81, isCompleted: false })
      render(<TaskNode node={task} />)

      const row = screen.getByTestId('task-row-81')
      expect(row).not.toHaveClass('opacity-75')
    })
  })

  describe('delete button', () => {
    it('renders delete button', () => {
      const task = createMockTask({ id: 90 })
      render(<TaskNode node={task} />)

      expect(screen.getByTestId('task-delete-button-90')).toBeInTheDocument()
    })

    it('calls onDelete when delete button is clicked', () => {
      const onDelete = vi.fn()
      const task = createMockTask({ id: 91, title: 'Task to Delete' })
      render(<TaskNode node={task} onDelete={onDelete} />)

      fireEvent.click(screen.getByTestId('task-delete-button-91'))

      expect(onDelete).toHaveBeenCalledWith(task)
    })

    it('delete button stops event propagation', () => {
      const onDelete = vi.fn()
      const onSelect = vi.fn()
      const task = createMockTask({ id: 92 })
      render(<TaskNode node={task} onDelete={onDelete} onSelect={onSelect} />)

      fireEvent.click(screen.getByTestId('task-delete-button-92'))

      expect(onDelete).toHaveBeenCalled()
      expect(onSelect).not.toHaveBeenCalled()
    })

    it('delete button container has opacity-0 class (hidden by default)', () => {
      const task = createMockTask({ id: 93 })
      render(<TaskNode node={task} />)

      const deleteButton = screen.getByTestId('task-delete-button-93')
      const buttonContainer = deleteButton.parentElement
      expect(buttonContainer).toHaveClass('opacity-0')
    })

    it('delete button container has group-hover:opacity-100 class (visible on hover)', () => {
      const task = createMockTask({ id: 94 })
      render(<TaskNode node={task} />)

      const deleteButton = screen.getByTestId('task-delete-button-94')
      const buttonContainer = deleteButton.parentElement
      expect(buttonContainer).toHaveClass('group-hover:opacity-100')
    })

    it('delete button has correct aria-label for accessibility', () => {
      const task = createMockTask({ id: 95 })
      render(<TaskNode node={task} />)

      const deleteButton = screen.getByTestId('task-delete-button-95')
      expect(deleteButton).toHaveAttribute('aria-label', 'Delete task')
    })

    it('delete button has hover styling for red color', () => {
      const task = createMockTask({ id: 96 })
      render(<TaskNode node={task} />)

      const deleteButton = screen.getByTestId('task-delete-button-96')
      expect(deleteButton).toHaveClass('hover:bg-red-100')
      expect(deleteButton).toHaveClass('hover:text-red-600')
    })

    it('task row has group class for hover targeting', () => {
      const task = createMockTask({ id: 97 })
      render(<TaskNode node={task} />)

      const row = screen.getByTestId('task-row-97')
      expect(row).toHaveClass('group')
    })
  })
})
