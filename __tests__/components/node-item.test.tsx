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
    createdAt: new Date(),
    children: [],
    ...overrides,
  } as TreeNodeWithChildren
}

// Helper to create a mock task node
function createMockTask(overrides: Partial<TreeNodeWithChildren & { isCompleted: boolean; frequency: string }> = {}): TreeNodeWithChildren {
  return {
    id: 100,
    title: 'Test Task',
    nodeType: 'task',
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
      })
      render(<NodeItem node={node} />)

      expect(screen.getByTestId('node-title-2')).toHaveTextContent('My Milestone')
    })

    it('renders a requirement node', () => {
      const node = createMockNode({
        id: 3,
        title: 'My Requirement',
        nodeType: 'requirement',
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

    it('calls onDelete when delete button is clicked', () => {
      const onDelete = vi.fn()
      const node = createMockNode({ id: 59, title: 'Node to Delete' })
      render(<NodeItem node={node} onDelete={onDelete} />)

      fireEvent.click(screen.getByTestId('delete-button-59'))

      expect(onDelete).toHaveBeenCalledWith(node)
    })

    it('calls onDelete when delete button is clicked on task node', () => {
      const onDelete = vi.fn()
      const task = createMockTask({ id: 60, title: 'Task to Delete' })
      render(<NodeItem node={task} onDelete={onDelete} />)

      fireEvent.click(screen.getByTestId('delete-button-60'))

      expect(onDelete).toHaveBeenCalledWith(task)
    })

    it('delete button stops event propagation', () => {
      const onDelete = vi.fn()
      const onSelect = vi.fn()
      const node = createMockNode({ id: 61, title: 'Node' })
      render(<NodeItem node={node} onDelete={onDelete} onSelect={onSelect} />)

      fireEvent.click(screen.getByTestId('delete-button-61'))

      expect(onDelete).toHaveBeenCalled()
      expect(onSelect).not.toHaveBeenCalled()
    })
  })

  describe('Add Child button hover visibility', () => {
    it('renders Add Child button with hover visibility classes on non-task nodes', () => {
      const node = createMockNode({ id: 54, title: 'Goal Node' })
      render(<NodeItem node={node} onAddChild={vi.fn()} />)

      const addButton = screen.getByTestId('add-child-button-54')
      expect(addButton).toBeInTheDocument()
      
      // The button should be inside a container with opacity-0 and group-hover:opacity-100
      const actionsContainer = addButton.parentElement
      expect(actionsContainer).toHaveClass('opacity-0')
      expect(actionsContainer).toHaveClass('group-hover:opacity-100')
    })

    it('renders Add Child button with hover visibility for milestone nodes', () => {
      const node = createMockNode({
        id: 55,
        title: 'Milestone Node',
        nodeType: 'milestone',
      })
      render(<NodeItem node={node} onAddChild={vi.fn()} />)

      const addButton = screen.getByTestId('add-child-button-55')
      expect(addButton).toBeInTheDocument()

      // Verify hover visibility classes are applied
      const actionsContainer = addButton.parentElement
      expect(actionsContainer).toHaveClass('opacity-0')
      expect(actionsContainer).toHaveClass('group-hover:opacity-100')
    })

    it('renders Add Child button with hover visibility for requirement nodes', () => {
      const node = createMockNode({
        id: 56,
        title: 'Requirement Node',
        nodeType: 'requirement',
      })
      render(<NodeItem node={node} onAddChild={vi.fn()} />)

      const addButton = screen.getByTestId('add-child-button-56')
      expect(addButton).toBeInTheDocument()

      // Verify hover visibility classes are applied
      const actionsContainer = addButton.parentElement
      expect(actionsContainer).toHaveClass('opacity-0')
      expect(actionsContainer).toHaveClass('group-hover:opacity-100')
    })

    it('node row has group class for hover state propagation', () => {
      const node = createMockNode({ id: 57, title: 'Node with Group' })
      render(<NodeItem node={node} onAddChild={vi.fn()} />)

      const nodeRow = screen.getByTestId('node-row-57')
      expect(nodeRow).toHaveClass('group')
    })

    it('Add Child button has correct aria-label for accessibility', () => {
      const node = createMockNode({ id: 58, title: 'Accessible Node' })
      render(<NodeItem node={node} onAddChild={vi.fn()} />)

      const addButton = screen.getByTestId('add-child-button-58')
      expect(addButton).toHaveAttribute('aria-label', 'Add child node')
    })
  })

  describe('Delete button hover visibility', () => {
    it('renders Delete button with hover visibility classes', () => {
      const node = createMockNode({ id: 62, title: 'Goal Node' })
      render(<NodeItem node={node} onDelete={vi.fn()} />)

      const deleteButton = screen.getByTestId('delete-button-62')
      expect(deleteButton).toBeInTheDocument()

      // The button should be inside a container with opacity-0 and group-hover:opacity-100
      const actionsContainer = deleteButton.parentElement
      expect(actionsContainer).toHaveClass('opacity-0')
      expect(actionsContainer).toHaveClass('group-hover:opacity-100')
    })

    it('renders Delete button for task nodes', () => {
      const task = createMockTask({ id: 63, title: 'Task' })
      render(<NodeItem node={task} onDelete={vi.fn()} />)

      const deleteButton = screen.getByTestId('delete-button-63')
      expect(deleteButton).toBeInTheDocument()
    })

    it('Delete button has correct aria-label for accessibility', () => {
      const node = createMockNode({ id: 64, title: 'Node with Delete' })
      render(<NodeItem node={node} onDelete={vi.fn()} />)

      const deleteButton = screen.getByTestId('delete-button-64')
      expect(deleteButton).toHaveAttribute('aria-label', 'Delete node')
    })

    it('Delete button has hover styling for red color', () => {
      const node = createMockNode({ id: 65, title: 'Node with Delete' })
      render(<NodeItem node={node} onDelete={vi.fn()} />)

      const deleteButton = screen.getByTestId('delete-button-65')
      expect(deleteButton).toHaveClass('hover:bg-red-100')
      expect(deleteButton).toHaveClass('hover:text-red-600')
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

  describe('loading states', () => {
    it('shows loading indicator when node has pending creating operation', () => {
      const node = createMockNode({ id: 70, title: 'Loading Node' })
      const pendingOperations = new Map<number, 'creating' | 'deleting'>([[70, 'creating']])
      render(<NodeItem node={node} pendingOperations={pendingOperations} />)

      expect(screen.getByTestId('node-loading-70')).toBeInTheDocument()
      expect(screen.getByTestId('node-loading-70')).toHaveTextContent('Adding...')
    })

    it('shows loading indicator when node has pending deleting operation', () => {
      const node = createMockNode({ id: 71, title: 'Deleting Node' })
      const pendingOperations = new Map<number, 'creating' | 'deleting'>([[71, 'deleting']])
      render(<NodeItem node={node} pendingOperations={pendingOperations} />)

      expect(screen.getByTestId('node-loading-71')).toBeInTheDocument()
      expect(screen.getByTestId('node-loading-71')).toHaveTextContent('Deleting...')
    })

    it('applies opacity styling when node has pending operation', () => {
      const node = createMockNode({ id: 72, title: 'Loading Node' })
      const pendingOperations = new Map<number, 'creating' | 'deleting'>([[72, 'creating']])
      render(<NodeItem node={node} pendingOperations={pendingOperations} />)

      const row = screen.getByTestId('node-row-72')
      expect(row).toHaveClass('opacity-70')
      expect(row).toHaveClass('pointer-events-none')
    })

    it('has aria-busy attribute when node has pending operation', () => {
      const node = createMockNode({ id: 73, title: 'Busy Node' })
      const pendingOperations = new Map<number, 'creating' | 'deleting'>([[73, 'creating']])
      render(<NodeItem node={node} pendingOperations={pendingOperations} />)

      const row = screen.getByTestId('node-row-73')
      expect(row).toHaveAttribute('aria-busy', 'true')
    })

    it('hides action buttons when node has pending operation', () => {
      const node = createMockNode({ id: 74, title: 'Loading Node' })
      const pendingOperations = new Map<number, 'creating' | 'deleting'>([[74, 'creating']])
      render(<NodeItem node={node} pendingOperations={pendingOperations} onAddChild={vi.fn()} onDelete={vi.fn()} />)

      expect(screen.queryByTestId('add-child-button-74')).not.toBeInTheDocument()
      expect(screen.queryByTestId('delete-button-74')).not.toBeInTheDocument()
    })

    it('shows action buttons when node has no pending operation', () => {
      const node = createMockNode({ id: 75, title: 'Normal Node' })
      render(<NodeItem node={node} onAddChild={vi.fn()} onDelete={vi.fn()} />)

      expect(screen.getByTestId('add-child-button-75')).toBeInTheDocument()
      expect(screen.getByTestId('delete-button-75')).toBeInTheDocument()
    })

    it('does not show loading indicator when node has no pending operation', () => {
      const node = createMockNode({ id: 76, title: 'Normal Node' })
      render(<NodeItem node={node} />)

      expect(screen.queryByTestId('node-loading-76')).not.toBeInTheDocument()
    })

    it('passes pendingOperations to child nodes', () => {
      const childNode = createMockNode({ id: 78, title: 'Child with loading' })
      const parentNode = createMockNode({
        id: 77,
        title: 'Parent',
        children: [childNode],
      })
      const pendingOperations = new Map<number, 'creating' | 'deleting'>([[78, 'deleting']])
      render(<NodeItem node={parentNode} depth={0} defaultExpanded={true} pendingOperations={pendingOperations} />)

      // Parent should not have loading state
      expect(screen.queryByTestId('node-loading-77')).not.toBeInTheDocument()
      // Child should have loading state
      expect(screen.getByTestId('node-loading-78')).toBeInTheDocument()
    })

    it('accepts pendingOperation prop directly', () => {
      const node = createMockNode({ id: 79, title: 'Direct Loading Node' })
      render(<NodeItem node={node} pendingOperation="creating" />)

      expect(screen.getByTestId('node-loading-79')).toBeInTheDocument()
      expect(screen.getByTestId('node-loading-79')).toHaveTextContent('Adding...')
    })

    it('prioritizes pendingOperation prop over pendingOperations map', () => {
      const node = createMockNode({ id: 80, title: 'Mixed Loading Node' })
      const pendingOperations = new Map<number, 'creating' | 'deleting'>([[80, 'deleting']])
      render(<NodeItem node={node} pendingOperation="creating" pendingOperations={pendingOperations} />)

      // Should show 'Adding...' from direct prop, not 'Deleting...' from map
      expect(screen.getByTestId('node-loading-80')).toHaveTextContent('Adding...')
    })
  })

  describe('mobile responsiveness', () => {
    describe('action buttons touch accessibility', () => {
      it('add child button uses icon-xs size for compact but touchable interface', () => {
        const node = createMockNode({ id: 81, title: 'Node with Add' })
        render(<NodeItem node={node} onAddChild={vi.fn()} />)

        const addButton = screen.getByTestId('add-child-button-81')
        // icon-xs provides 24px size - compact for tree view but still touchable
        expect(addButton).toHaveAttribute('data-size', 'icon-xs')
      })

      it('delete button uses icon-xs size for compact but touchable interface', () => {
        const node = createMockNode({ id: 82, title: 'Node with Delete' })
        render(<NodeItem node={node} onDelete={vi.fn()} />)

        const deleteButton = screen.getByTestId('delete-button-82')
        expect(deleteButton).toHaveAttribute('data-size', 'icon-xs')
      })

      it('task checkbox area has adequate touch target', () => {
        const task = createMockTask({ id: 83, title: 'Task with Checkbox' })
        render(<NodeItem node={task} onToggleTask={vi.fn()} />)

        const checkbox = screen.getByTestId('task-checkbox-83')
        // h-5 w-5 = 20px inner + surrounding padding makes touch target
        expect(checkbox).toHaveClass('h-5')
        expect(checkbox).toHaveClass('w-5')
      })

      it('expand button has adequate touch target', () => {
        const child = createMockNode({ id: 85, title: 'Child' })
        const parent = createMockNode({ id: 84, title: 'Parent', children: [child] })
        render(<NodeItem node={parent} />)

        const expandButton = screen.getByTestId('expand-button-84')
        expect(expandButton).toHaveClass('h-5')
        expect(expandButton).toHaveClass('w-5')
      })
    })

    describe('node row touch accessibility', () => {
      it('node row has adequate padding for touch interaction', () => {
        const node = createMockNode({ id: 86, title: 'Touchable Node' })
        render(<NodeItem node={node} />)

        const nodeRow = screen.getByTestId('node-row-86')
        // px-3 py-2 provides adequate touch padding
        expect(nodeRow).toHaveClass('px-3')
        expect(nodeRow).toHaveClass('py-2')
      })

      it('node row has cursor-pointer for touch feedback indication', () => {
        const node = createMockNode({ id: 87, title: 'Clickable Node' })
        render(<NodeItem node={node} />)

        const nodeRow = screen.getByTestId('node-row-87')
        expect(nodeRow).toHaveClass('cursor-pointer')
      })

      it('node row has gap for child element spacing', () => {
        const node = createMockNode({ id: 88, title: 'Spaced Node' })
        render(<NodeItem node={node} />)

        const nodeRow = screen.getByTestId('node-row-88')
        expect(nodeRow).toHaveClass('gap-2')
      })
    })

    describe('action buttons hover visibility pattern', () => {
      it('action buttons container uses opacity transition for smooth appearance', () => {
        const node = createMockNode({ id: 89, title: 'Node with Actions' })
        render(<NodeItem node={node} onAddChild={vi.fn()} onDelete={vi.fn()} />)

        const addButton = screen.getByTestId('add-child-button-89')
        const actionsContainer = addButton.parentElement

        // Verify transition class is present for smooth visibility changes
        expect(actionsContainer).toHaveClass('transition-opacity')
      })

      it('buttons are always present in DOM for touch devices that may show them differently', () => {
        const node = createMockNode({ id: 90, title: 'Node with Actions' })
        render(<NodeItem node={node} onAddChild={vi.fn()} onDelete={vi.fn()} />)

        // Buttons should be in the DOM even when visually hidden (opacity-0)
        // This ensures touch devices can still interact with them
        const addButton = screen.getByTestId('add-child-button-90')
        const deleteButton = screen.getByTestId('delete-button-90')
        
        expect(addButton).toBeInTheDocument()
        expect(deleteButton).toBeInTheDocument()
      })
    })

    describe('indentation for mobile readability', () => {
      it('uses consistent indentation multiplier for all depths', () => {
        const grandchild = createMockNode({ id: 93, title: 'Grandchild' })
        const child = createMockNode({ id: 92, title: 'Child', children: [grandchild] })
        const parent = createMockNode({ id: 91, title: 'Parent', children: [child] })
        
        render(<NodeItem node={parent} depth={0} defaultExpanded={true} />)

        // Each level should indent by 24px
        const parentRow = screen.getByTestId('node-row-91')
        const childRow = screen.getByTestId('node-row-92')
        const grandchildRow = screen.getByTestId('node-row-93')

        expect(parentRow).toHaveStyle({ marginLeft: '0px' })
        expect(childRow).toHaveStyle({ marginLeft: '24px' })
        expect(grandchildRow).toHaveStyle({ marginLeft: '48px' })
      })
    })
  })
})
