import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NodeItem } from '@/components/node-item'
import type { TreeNodeWithChildren } from '@/lib/goal-store'

// Helper to create a mock node
function createMockNode(overrides: Partial<TreeNodeWithChildren> = {}): TreeNodeWithChildren {
  return {
    id: 1,
    title: 'Test Node',
    nodeType: 'goal',
    status: 'active',
    type: 'goal',
    createdAt: new Date(),
    children: [],
    ...overrides,
  }
}

// Helper to create a mock task node
function createMockTask(overrides: Partial<TreeNodeWithChildren & { isCompleted: boolean; frequency: string }> = {}): TreeNodeWithChildren {
  return {
    id: 100,
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

describe('NodeItem', () => {
  describe('rendering', () => {
    it('renders a goal node with title', () => {
      const node = createMockNode({ title: 'My Goal' })
      render(<NodeItem node={node} />)

      expect(screen.getByTestId('node-title-1')).toHaveTextContent('My Goal')
    })

    it('renders a milestone node', () => {
      const node = createMockNode({
        id: 2,
        title: 'My Milestone',
        nodeType: 'milestone',
        type: 'milestone',
      })
      render(<NodeItem node={node} />)

      expect(screen.getByTestId('node-title-2')).toHaveTextContent('My Milestone')
    })

    it('renders a requirement node', () => {
      const node = createMockNode({
        id: 3,
        title: 'My Requirement',
        nodeType: 'requirement',
        type: 'requirement',
      })
      render(<NodeItem node={node} />)

      expect(screen.getByTestId('node-title-3')).toHaveTextContent('My Requirement')
    })

    it('renders a task node with checkbox', () => {
      const task = createMockTask({ id: 4, title: 'My Task' })
      render(<NodeItem node={task} />)

      expect(screen.getByTestId('node-title-4')).toHaveTextContent('My Task')
      expect(screen.getByTestId('task-checkbox-4')).toBeInTheDocument()
    })

    it('renders completed task with strikethrough', () => {
      const task = createMockTask({
        id: 5,
        title: 'Completed Task',
        isCompleted: true,
      })
      render(<NodeItem node={task} />)

      const title = screen.getByTestId('node-title-5')
      expect(title).toHaveClass('line-through')
    })
  })

  describe('frequency badge', () => {
    it('shows frequency badge for daily tasks', () => {
      const task = createMockTask({
        id: 6,
        title: 'Daily Task',
        frequency: 'daily',
      })
      render(<NodeItem node={task} />)

      expect(screen.getByTestId('frequency-badge-6')).toHaveTextContent('Daily')
    })

    it('shows frequency badge for weekly tasks', () => {
      const task = createMockTask({
        id: 7,
        title: 'Weekly Task',
        frequency: 'weekly',
      })
      render(<NodeItem node={task} />)

      expect(screen.getByTestId('frequency-badge-7')).toHaveTextContent('Weekly')
    })

    it('does not show frequency badge for one-time tasks', () => {
      const task = createMockTask({
        id: 8,
        title: 'One-time Task',
        frequency: 'once',
      })
      render(<NodeItem node={task} />)

      expect(screen.queryByTestId('frequency-badge-8')).not.toBeInTheDocument()
    })
  })

  describe('expand/collapse', () => {
    it('shows expand button when node has children', () => {
      const childNode = createMockNode({ id: 11, title: 'Child' })
      const parentNode = createMockNode({
        id: 10,
        title: 'Parent',
        children: [childNode],
      })
      render(<NodeItem node={parentNode} />)

      const expandButton = screen.getByTestId('expand-button-10')
      expect(expandButton).toBeVisible()
    })

    it('hides expand button when node has no children', () => {
      const node = createMockNode({ id: 12, title: 'Leaf Node' })
      render(<NodeItem node={node} />)

      const expandButton = screen.getByTestId('expand-button-12')
      expect(expandButton).toHaveClass('invisible')
    })

    it('expands to show children when expand button is clicked', () => {
      const childNode = createMockNode({ id: 14, title: 'Child Node' })
      const parentNode = createMockNode({
        id: 13,
        title: 'Parent Node',
        children: [childNode],
      })
      // Start collapsed (depth 2)
      render(<NodeItem node={parentNode} depth={2} defaultExpanded={false} />)

      // Children should not be visible initially
      expect(screen.queryByTestId('node-item-14')).not.toBeInTheDocument()

      // Click expand
      fireEvent.click(screen.getByTestId('expand-button-13'))

      // Children should now be visible
      expect(screen.getByTestId('node-item-14')).toBeInTheDocument()
    })

    it('collapses to hide children when collapse button is clicked', () => {
      const childNode = createMockNode({ id: 16, title: 'Child Node' })
      const parentNode = createMockNode({
        id: 15,
        title: 'Parent Node',
        children: [childNode],
      })
      // Start expanded
      render(<NodeItem node={parentNode} depth={0} defaultExpanded={true} />)

      // Children should be visible initially
      expect(screen.getByTestId('node-item-16')).toBeInTheDocument()

      // Click collapse
      fireEvent.click(screen.getByTestId('expand-button-15'))

      // Children should be hidden
      expect(screen.queryByTestId('node-item-16')).not.toBeInTheDocument()
    })

    it('defaults to expanded for depth < 2', () => {
      const childNode = createMockNode({ id: 18, title: 'Child' })
      const parentNode = createMockNode({
        id: 17,
        title: 'Parent',
        children: [childNode],
      })
      render(<NodeItem node={parentNode} depth={0} />)

      expect(screen.getByTestId('node-item-18')).toBeInTheDocument()
    })

    it('defaults to collapsed for depth >= 2', () => {
      const childNode = createMockNode({ id: 20, title: 'Child' })
      const parentNode = createMockNode({
        id: 19,
        title: 'Parent',
        children: [childNode],
      })
      render(<NodeItem node={parentNode} depth={2} />)

      expect(screen.queryByTestId('node-item-20')).not.toBeInTheDocument()
    })
  })

  describe('recursive rendering', () => {
    it('renders nested children recursively', () => {
      const grandchild = createMockNode({ id: 23, title: 'Grandchild' })
      const child = createMockNode({
        id: 22,
        title: 'Child',
        children: [grandchild],
      })
      const parent = createMockNode({
        id: 21,
        title: 'Parent',
        children: [child],
      })
      render(<NodeItem node={parent} depth={0} defaultExpanded={true} />)

      expect(screen.getByTestId('node-item-21')).toBeInTheDocument()
      expect(screen.getByTestId('node-item-22')).toBeInTheDocument()
      expect(screen.getByTestId('node-item-23')).toBeInTheDocument()
    })

    it('increases indentation for nested nodes', () => {
      const child = createMockNode({ id: 25, title: 'Child' })
      const parent = createMockNode({
        id: 24,
        title: 'Parent',
        children: [child],
      })
      render(<NodeItem node={parent} depth={0} defaultExpanded={true} />)

      const parentRow = screen.getByTestId('node-row-24')
      const childRow = screen.getByTestId('node-row-25')

      // Parent should have marginLeft: 0px (depth 0 * 24)
      expect(parentRow).toHaveStyle({ marginLeft: '0px' })
      // Child should have marginLeft: 24px (depth 1 * 24)
      expect(childRow).toHaveStyle({ marginLeft: '24px' })
    })
  })

  describe('callbacks', () => {
    it('calls onToggleTask when task checkbox is clicked', () => {
      const onToggleTask = vi.fn()
      const task = createMockTask({ id: 26, title: 'Task', isCompleted: false })
      render(<NodeItem node={task} onToggleTask={onToggleTask} />)

      fireEvent.click(screen.getByTestId('task-checkbox-26'))

      expect(onToggleTask).toHaveBeenCalledWith(26, true)
    })

    it('calls onToggleTask with false when completed task is toggled', () => {
      const onToggleTask = vi.fn()
      const task = createMockTask({ id: 27, title: 'Task', isCompleted: true })
      render(<NodeItem node={task} onToggleTask={onToggleTask} />)

      fireEvent.click(screen.getByTestId('task-checkbox-27'))

      expect(onToggleTask).toHaveBeenCalledWith(27, false)
    })

    it('calls onSelect when node is clicked', () => {
      const onSelect = vi.fn()
      const node = createMockNode({ id: 28, title: 'Clickable Node' })
      render(<NodeItem node={node} onSelect={onSelect} />)

      fireEvent.click(screen.getByTestId('node-row-28'))

      expect(onSelect).toHaveBeenCalledWith(node)
    })

    it('calls onAddChild when add button is clicked on non-task node', () => {
      const onAddChild = vi.fn()
      const node = createMockNode({ id: 29, title: 'Parent Node' })
      render(<NodeItem node={node} onAddChild={onAddChild} />)

      fireEvent.click(screen.getByTestId('add-child-button-29'))

      expect(onAddChild).toHaveBeenCalledWith(node)
    })

    it('does not show add button for task nodes', () => {
      const onAddChild = vi.fn()
      const task = createMockTask({ id: 30, title: 'Task' })
      render(<NodeItem node={task} onAddChild={onAddChild} />)

      expect(screen.queryByTestId('add-child-button-30')).not.toBeInTheDocument()
    })
  })

  describe('selection', () => {
    it('applies selected styling when node is selected', () => {
      const node = createMockNode({ id: 31, title: 'Selected Node' })
      render(<NodeItem node={node} selectedNodeId={31} />)

      const row = screen.getByTestId('node-row-31')
      expect(row).toHaveClass('ring-2')
    })

    it('does not apply selected styling when different node is selected', () => {
      const node = createMockNode({ id: 32, title: 'Not Selected' })
      render(<NodeItem node={node} selectedNodeId={999} />)

      const row = screen.getByTestId('node-row-32')
      expect(row).not.toHaveClass('ring-2')
    })
  })

  describe('progress bar', () => {
    it('shows progress bar for goal with children', () => {
      const task = createMockTask({ id: 34, title: 'Task' })
      const goal = createMockNode({
        id: 33,
        title: 'Goal',
        children: [task],
      })
      render(<NodeItem node={goal} />)

      expect(screen.getByTestId('progress-container-33')).toBeInTheDocument()
      expect(screen.getByTestId('progress-bar-33')).toBeInTheDocument()
    })

    it('shows progress bar for milestone with children', () => {
      const task = createMockTask({ id: 36, title: 'Task' })
      const milestone = createMockNode({
        id: 35,
        title: 'Milestone',
        nodeType: 'milestone',
        type: 'milestone',
        children: [task],
      })
      render(<NodeItem node={milestone} />)

      expect(screen.getByTestId('progress-container-35')).toBeInTheDocument()
    })

    it('does not show progress bar for requirement', () => {
      const requirement = createMockNode({
        id: 37,
        title: 'Requirement',
        nodeType: 'requirement',
        type: 'requirement',
        children: [],
      })
      render(<NodeItem node={requirement} />)

      expect(screen.queryByTestId('progress-container-37')).not.toBeInTheDocument()
    })

    it('does not show progress bar for goal without children', () => {
      const goal = createMockNode({
        id: 38,
        title: 'Empty Goal',
        children: [],
      })
      render(<NodeItem node={goal} />)

      expect(screen.queryByTestId('progress-container-38')).not.toBeInTheDocument()
    })

    it('calculates progress correctly', () => {
      const completedTask = createMockTask({
        id: 40,
        title: 'Completed Task',
        isCompleted: true,
      })
      const pendingTask = createMockTask({
        id: 41,
        title: 'Pending Task',
        isCompleted: false,
      })
      const goal = createMockNode({
        id: 39,
        title: 'Goal',
        children: [completedTask, pendingTask],
      })
      render(<NodeItem node={goal} />)

      // 1 of 2 tasks completed = 50%
      expect(screen.getByTestId('progress-text-39')).toHaveTextContent('50%')
    })

    it('shows 100% progress when all tasks are completed', () => {
      const task1 = createMockTask({ id: 43, title: 'Task 1', isCompleted: true })
      const task2 = createMockTask({ id: 44, title: 'Task 2', isCompleted: true })
      const goal = createMockNode({
        id: 42,
        title: 'Goal',
        children: [task1, task2],
      })
      render(<NodeItem node={goal} />)

      expect(screen.getByTestId('progress-text-42')).toHaveTextContent('100%')
      expect(screen.getByTestId('progress-bar-42')).toHaveClass('bg-green-500')
    })

    it('shows 0% progress when no tasks are completed', () => {
      const task1 = createMockTask({ id: 46, title: 'Task 1', isCompleted: false })
      const task2 = createMockTask({ id: 47, title: 'Task 2', isCompleted: false })
      const goal = createMockNode({
        id: 45,
        title: 'Goal',
        children: [task1, task2],
      })
      render(<NodeItem node={goal} />)

      expect(screen.getByTestId('progress-text-45')).toHaveTextContent('0%')
    })
  })

  describe('accessibility', () => {
    it('has correct aria attributes for tree item', () => {
      const child = createMockNode({ id: 49, title: 'Child' })
      const parent = createMockNode({
        id: 48,
        title: 'Parent',
        children: [child],
      })
      render(<NodeItem node={parent} depth={0} selectedNodeId={48} />)

      const row = screen.getByTestId('node-row-48')
      expect(row).toHaveAttribute('role', 'treeitem')
      expect(row).toHaveAttribute('aria-expanded', 'true')
      expect(row).toHaveAttribute('aria-selected', 'true')
    })

    it('has correct aria label for expand button', () => {
      const child = createMockNode({ id: 51, title: 'Child' })
      const parent = createMockNode({
        id: 50,
        title: 'Parent',
        children: [child],
      })
      render(<NodeItem node={parent} defaultExpanded={true} />)

      const expandButton = screen.getByTestId('expand-button-50')
      expect(expandButton).toHaveAttribute('aria-label', 'Collapse')
    })

    it('has correct aria label for task checkbox', () => {
      const task = createMockTask({ id: 52, title: 'Task', isCompleted: false })
      render(<NodeItem node={task} />)

      const checkbox = screen.getByTestId('task-checkbox-52')
      expect(checkbox).toHaveAttribute('aria-label', 'Mark as complete')
    })

    it('has correct aria label for completed task checkbox', () => {
      const task = createMockTask({ id: 53, title: 'Task', isCompleted: true })
      render(<NodeItem node={task} />)

      const checkbox = screen.getByTestId('task-checkbox-53')
      expect(checkbox).toHaveAttribute('aria-label', 'Mark as incomplete')
    })
  })
})
