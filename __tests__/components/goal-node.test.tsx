import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GoalNode } from '@/components/goal-node'
import type { TreeNodeWithChildren } from '@/lib/goal-store'

// Helper to create a mock goal node
function createMockGoal(overrides: Partial<TreeNodeWithChildren> = {}): TreeNodeWithChildren {
  return {
    id: 1,
    title: 'Test Goal',
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

// Helper to create a mock milestone node
function createMockMilestone(overrides: Partial<TreeNodeWithChildren> = {}): TreeNodeWithChildren {
  return {
    id: 50,
    title: 'Test Milestone',
    nodeType: 'milestone',
    status: 'active',
    type: 'milestone',
    createdAt: new Date(),
    children: [],
    ...overrides,
  }
}

// Helper to create a mock requirement node
function createMockRequirement(overrides: Partial<TreeNodeWithChildren> = {}): TreeNodeWithChildren {
  return {
    id: 60,
    title: 'Test Requirement',
    nodeType: 'requirement',
    status: 'active',
    type: 'requirement',
    createdAt: new Date(),
    children: [],
    ...overrides,
  }
}

describe('GoalNode', () => {
  describe('rendering', () => {
    it('renders a goal node with title', () => {
      const goal = createMockGoal({ title: 'My Goal' })
      render(<GoalNode node={goal} />)

      expect(screen.getByTestId('goal-title-1')).toHaveTextContent('My Goal')
    })

    it('renders goal icon', () => {
      const goal = createMockGoal({ id: 2 })
      render(<GoalNode node={goal} />)

      expect(screen.getByTestId('goal-icon-2')).toBeInTheDocument()
    })

    it('renders description when provided', () => {
      const goal = createMockGoal({
        id: 3,
        title: 'Goal with Description',
        description: 'This is a detailed description',
      })
      render(<GoalNode node={goal} />)

      expect(screen.getByTestId('goal-description-3')).toHaveTextContent('This is a detailed description')
    })

    it('does not render description when not provided', () => {
      const goal = createMockGoal({ id: 4 })
      render(<GoalNode node={goal} />)

      expect(screen.queryByTestId('goal-description-4')).not.toBeInTheDocument()
    })

    it('applies distinct styling at root level (depth 0)', () => {
      const goal = createMockGoal({ id: 5 })
      render(<GoalNode node={goal} depth={0} />)

      const row = screen.getByTestId('goal-row-5')
      // Root goals should have gradient background
      expect(row).toHaveClass('rounded-xl')
      expect(row).toHaveClass('border-2')
    })

    it('applies proper indentation based on depth', () => {
      const goal = createMockGoal({ id: 6 })
      render(<GoalNode node={goal} depth={2} />)

      const row = screen.getByTestId('goal-row-6')
      expect(row).toHaveStyle({ marginLeft: '48px' }) // 2 * 24
    })
  })

  describe('task count badge', () => {
    it('shows task count badge when goal has tasks', () => {
      const task = createMockTask({ id: 10 })
      const goal = createMockGoal({
        id: 7,
        children: [task],
      })
      render(<GoalNode node={goal} />)

      expect(screen.getByTestId('goal-task-count-7')).toHaveTextContent('1 task')
    })

    it('shows plural form for multiple tasks', () => {
      const task1 = createMockTask({ id: 11 })
      const task2 = createMockTask({ id: 12 })
      const goal = createMockGoal({
        id: 8,
        children: [task1, task2],
      })
      render(<GoalNode node={goal} />)

      expect(screen.getByTestId('goal-task-count-8')).toHaveTextContent('2 tasks')
    })

    it('does not show task count badge when goal has no tasks', () => {
      const goal = createMockGoal({ id: 9 })
      render(<GoalNode node={goal} />)

      expect(screen.queryByTestId('goal-task-count-9')).not.toBeInTheDocument()
    })

    it('counts tasks in nested children', () => {
      const nestedTask = createMockTask({ id: 13 })
      const milestone = createMockMilestone({
        id: 14,
        children: [nestedTask],
      })
      const goal = createMockGoal({
        id: 10,
        children: [milestone],
      })
      render(<GoalNode node={goal} />)

      expect(screen.getByTestId('goal-task-count-10')).toHaveTextContent('1 task')
    })
  })

  describe('progress bar', () => {
    it('shows progress section when goal has children', () => {
      const task = createMockTask({ id: 15 })
      const goal = createMockGoal({
        id: 11,
        children: [task],
      })
      render(<GoalNode node={goal} />)

      expect(screen.getByTestId('goal-progress-section-11')).toBeInTheDocument()
      expect(screen.getByTestId('goal-progress-bar-11')).toBeInTheDocument()
    })

    it('shows 0% progress when no tasks are completed', () => {
      const task1 = createMockTask({ id: 16, isCompleted: false })
      const task2 = createMockTask({ id: 17, isCompleted: false })
      const goal = createMockGoal({
        id: 12,
        children: [task1, task2],
      })
      render(<GoalNode node={goal} />)

      expect(screen.getByTestId('goal-progress-percent-12')).toHaveTextContent('0%')
    })

    it('shows 50% progress when half tasks are completed', () => {
      const task1 = createMockTask({ id: 18, isCompleted: true })
      const task2 = createMockTask({ id: 19, isCompleted: false })
      const goal = createMockGoal({
        id: 13,
        children: [task1, task2],
      })
      render(<GoalNode node={goal} />)

      expect(screen.getByTestId('goal-progress-percent-13')).toHaveTextContent('50%')
    })

    it('shows 100% progress when all tasks are completed', () => {
      const task1 = createMockTask({ id: 20, isCompleted: true })
      const task2 = createMockTask({ id: 21, isCompleted: true })
      const goal = createMockGoal({
        id: 14,
        children: [task1, task2],
      })
      render(<GoalNode node={goal} />)

      expect(screen.getByTestId('goal-progress-percent-14')).toHaveTextContent('100%')
    })

    it('shows correct progress status for not started', () => {
      const task = createMockTask({ id: 22, isCompleted: false })
      const goal = createMockGoal({
        id: 15,
        children: [task],
      })
      render(<GoalNode node={goal} />)

      expect(screen.getByTestId('goal-progress-status-15')).toHaveTextContent('Not started')
    })

    it('shows correct progress status for completed', () => {
      const task = createMockTask({ id: 23, isCompleted: true })
      const goal = createMockGoal({
        id: 16,
        children: [task],
      })
      render(<GoalNode node={goal} />)

      expect(screen.getByTestId('goal-progress-status-16')).toHaveTextContent('Completed!')
    })

    it('shows green color when 100% complete', () => {
      const task = createMockTask({ id: 24, isCompleted: true })
      const goal = createMockGoal({
        id: 17,
        children: [task],
      })
      render(<GoalNode node={goal} />)

      const progressBar = screen.getByTestId('goal-progress-bar-17')
      expect(progressBar).toHaveClass('bg-green-500')
    })

    it('does not show progress section when goal has no children', () => {
      const goal = createMockGoal({ id: 18 })
      render(<GoalNode node={goal} />)

      expect(screen.queryByTestId('goal-progress-section-18')).not.toBeInTheDocument()
    })
  })

  describe('expand/collapse', () => {
    it('shows expand button when goal has children', () => {
      const task = createMockTask({ id: 25 })
      const goal = createMockGoal({
        id: 19,
        children: [task],
      })
      render(<GoalNode node={goal} />)

      const expandButton = screen.getByTestId('goal-expand-button-19')
      expect(expandButton).toBeVisible()
    })

    it('hides expand button when goal has no children', () => {
      const goal = createMockGoal({ id: 20 })
      render(<GoalNode node={goal} />)

      const expandButton = screen.getByTestId('goal-expand-button-20')
      expect(expandButton).toHaveClass('invisible')
    })

    it('expands to show children when expand button is clicked', () => {
      const childGoal = createMockGoal({ id: 27, title: 'Child Goal' })
      const parentGoal = createMockGoal({
        id: 21,
        children: [childGoal],
      })
      render(<GoalNode node={parentGoal} depth={2} defaultExpanded={false} />)

      // Children should not be visible initially
      expect(screen.queryByTestId('goal-node-27')).not.toBeInTheDocument()

      // Click expand
      fireEvent.click(screen.getByTestId('goal-expand-button-21'))

      // Children should now be visible
      expect(screen.getByTestId('goal-node-27')).toBeInTheDocument()
    })

    it('collapses to hide children when collapse button is clicked', () => {
      const childGoal = createMockGoal({ id: 28, title: 'Child Goal' })
      const parentGoal = createMockGoal({
        id: 22,
        children: [childGoal],
      })
      render(<GoalNode node={parentGoal} depth={0} defaultExpanded={true} />)

      // Children should be visible initially
      expect(screen.getByTestId('goal-node-28')).toBeInTheDocument()

      // Click collapse
      fireEvent.click(screen.getByTestId('goal-expand-button-22'))

      // Children should be hidden
      expect(screen.queryByTestId('goal-node-28')).not.toBeInTheDocument()
    })

    it('defaults to expanded for depth < 2', () => {
      const childGoal = createMockGoal({ id: 29 })
      const parentGoal = createMockGoal({
        id: 23,
        children: [childGoal],
      })
      render(<GoalNode node={parentGoal} depth={0} />)

      expect(screen.getByTestId('goal-node-29')).toBeInTheDocument()
    })

    it('defaults to collapsed for depth >= 2', () => {
      const childGoal = createMockGoal({ id: 30 })
      const parentGoal = createMockGoal({
        id: 24,
        children: [childGoal],
      })
      render(<GoalNode node={parentGoal} depth={2} />)

      expect(screen.queryByTestId('goal-node-30')).not.toBeInTheDocument()
    })
  })

  describe('callbacks', () => {
    it('calls onSelect when goal is clicked', () => {
      const onSelect = vi.fn()
      const goal = createMockGoal({ id: 25, title: 'Clickable Goal' })
      render(<GoalNode node={goal} onSelect={onSelect} />)

      fireEvent.click(screen.getByTestId('goal-row-25'))

      expect(onSelect).toHaveBeenCalledWith(goal)
    })

    it('calls onAddChild when add button is clicked', () => {
      const onAddChild = vi.fn()
      const goal = createMockGoal({ id: 26 })
      render(<GoalNode node={goal} onAddChild={onAddChild} />)

      fireEvent.click(screen.getByTestId('goal-add-child-button-26'))

      expect(onAddChild).toHaveBeenCalledWith(goal)
    })

    it('passes onToggleTask to child NodeItem components', () => {
      const onToggleTask = vi.fn()
      const task = createMockTask({ id: 31 })
      const goal = createMockGoal({
        id: 27,
        children: [task],
      })
      render(<GoalNode node={goal} onToggleTask={onToggleTask} defaultExpanded={true} />)

      // Task should be rendered via NodeItem
      expect(screen.getByTestId('node-item-31')).toBeInTheDocument()
    })
  })

  describe('selection', () => {
    it('applies selected styling when goal is selected', () => {
      const goal = createMockGoal({ id: 28 })
      render(<GoalNode node={goal} selectedNodeId={28} />)

      const row = screen.getByTestId('goal-row-28')
      expect(row).toHaveClass('ring-2')
    })

    it('does not apply selected styling when different node is selected', () => {
      const goal = createMockGoal({ id: 29 })
      render(<GoalNode node={goal} selectedNodeId={999} />)

      const row = screen.getByTestId('goal-row-29')
      expect(row).not.toHaveClass('ring-2')
    })
  })

  describe('completed state', () => {
    it('shows sparkle icon when goal is 100% complete', () => {
      const task = createMockTask({ id: 32, isCompleted: true })
      const goal = createMockGoal({
        id: 30,
        children: [task],
      })
      render(<GoalNode node={goal} />)

      // The sparkle icon should be rendered (part of the icon container)
      const iconContainer = screen.getByTestId('goal-icon-30')
      expect(iconContainer).toHaveClass('bg-green-100')
    })

    it('shows green styling when goal is complete', () => {
      const task = createMockTask({ id: 33, isCompleted: true })
      const goal = createMockGoal({
        id: 31,
        children: [task],
      })
      render(<GoalNode node={goal} />)

      const row = screen.getByTestId('goal-row-31')
      expect(row).toHaveClass('border-green-300')
    })

    it('shows green title when goal is complete', () => {
      const task = createMockTask({ id: 34, isCompleted: true })
      const goal = createMockGoal({
        id: 32,
        title: 'Completed Goal',
        children: [task],
      })
      render(<GoalNode node={goal} />)

      const title = screen.getByTestId('goal-title-32')
      expect(title).toHaveClass('text-green-700')
    })
  })

  describe('recursive rendering', () => {
    it('renders nested goal children using GoalNode', () => {
      const grandchildGoal = createMockGoal({ id: 37, title: 'Grandchild Goal' })
      const childGoal = createMockGoal({
        id: 36,
        title: 'Child Goal',
        children: [grandchildGoal],
      })
      const parentGoal = createMockGoal({
        id: 33,
        title: 'Parent Goal',
        children: [childGoal],
      })
      render(<GoalNode node={parentGoal} depth={0} defaultExpanded={true} />)

      expect(screen.getByTestId('goal-node-33')).toBeInTheDocument()
      expect(screen.getByTestId('goal-node-36')).toBeInTheDocument()
      expect(screen.getByTestId('goal-node-37')).toBeInTheDocument()
    })

    it('renders non-goal children using NodeItem', () => {
      const task = createMockTask({ id: 38 })
      const milestone = createMockMilestone({ id: 39 })
      const goal = createMockGoal({
        id: 34,
        children: [task, milestone],
      })
      render(<GoalNode node={goal} defaultExpanded={true} />)

      // Task and milestone should be rendered via NodeItem
      expect(screen.getByTestId('node-item-38')).toBeInTheDocument()
      expect(screen.getByTestId('node-item-39')).toBeInTheDocument()
    })

    it('renders requirement children using RequirementNode', () => {
      const requirement = createMockRequirement({ id: 42, title: 'Test Requirement' })
      const goal = createMockGoal({
        id: 38,
        children: [requirement],
      })
      render(<GoalNode node={goal} defaultExpanded={true} />)

      // Requirement should be rendered via RequirementNode, not NodeItem
      expect(screen.getByTestId('requirement-node-42')).toBeInTheDocument()
      expect(screen.queryByTestId('node-item-42')).not.toBeInTheDocument()
    })

    it('renders mixed children using appropriate components', () => {
      const task = createMockTask({ id: 43 })
      const requirement = createMockRequirement({ id: 44 })
      const childGoal = createMockGoal({ id: 45, title: 'Child Goal' })
      const goal = createMockGoal({
        id: 39,
        children: [task, requirement, childGoal],
      })
      render(<GoalNode node={goal} defaultExpanded={true} />)

      // Task should use NodeItem
      expect(screen.getByTestId('node-item-43')).toBeInTheDocument()
      // Requirement should use RequirementNode
      expect(screen.getByTestId('requirement-node-44')).toBeInTheDocument()
      // Goal should use GoalNode
      expect(screen.getByTestId('goal-node-45')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has correct aria attributes for tree item', () => {
      const childGoal = createMockGoal({ id: 40 })
      const parentGoal = createMockGoal({
        id: 35,
        children: [childGoal],
      })
      render(<GoalNode node={parentGoal} selectedNodeId={35} />)

      const row = screen.getByTestId('goal-row-35')
      expect(row).toHaveAttribute('role', 'treeitem')
      expect(row).toHaveAttribute('aria-expanded', 'true')
      expect(row).toHaveAttribute('aria-selected', 'true')
    })

    it('has correct aria label for expand button', () => {
      const childGoal = createMockGoal({ id: 41 })
      const parentGoal = createMockGoal({
        id: 36,
        children: [childGoal],
      })
      render(<GoalNode node={parentGoal} defaultExpanded={true} />)

      const expandButton = screen.getByTestId('goal-expand-button-36')
      expect(expandButton).toHaveAttribute('aria-label', 'Collapse')
    })

    it('has correct aria label for add child button', () => {
      const goal = createMockGoal({ id: 37 })
      render(<GoalNode node={goal} />)

      const addButton = screen.getByTestId('goal-add-child-button-37')
      expect(addButton).toHaveAttribute('aria-label', 'Add child node')
    })
  })
})
