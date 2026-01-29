import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { GoalTreeView } from '@/components/goal-tree-view'
import type { TreeNodeWithChildren } from '@/lib/goal-store'

// Mock the hooks module
const mockInitialize = vi.fn()
const mockRefresh = vi.fn()
const mockToggleTaskCompletion = vi.fn()

let mockHookState = {
  rootGoals: [] as TreeNodeWithChildren[],
  isLoading: false,
  error: null as string | null,
  isInitialized: false,
}

vi.mock('@/lib/hooks', () => ({
  useGoalTree: () => ({
    ...mockHookState,
    initialize: mockInitialize,
    refresh: mockRefresh,
    toggleTaskCompletion: mockToggleTaskCompletion,
  }),
}))

// Helper to create mock nodes
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

function createMockTask(
  overrides: Partial<TreeNodeWithChildren & { isCompleted: boolean; frequency: string }> = {}
): TreeNodeWithChildren {
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

describe('GoalTreeView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHookState = {
      rootGoals: [],
      isLoading: false,
      error: null,
      isInitialized: false,
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('calls initialize on mount when not initialized', async () => {
      mockHookState = {
        rootGoals: [],
        isLoading: false,
        error: null,
        isInitialized: false,
      }

      render(<GoalTreeView />)

      await waitFor(() => {
        expect(mockInitialize).toHaveBeenCalled()
      })
    })

    it('does not call initialize when already initialized', () => {
      mockHookState = {
        rootGoals: [],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<GoalTreeView />)

      expect(mockInitialize).not.toHaveBeenCalled()
    })

    it('does not call initialize when already loading', () => {
      mockHookState = {
        rootGoals: [],
        isLoading: true,
        error: null,
        isInitialized: false,
      }

      render(<GoalTreeView />)

      expect(mockInitialize).not.toHaveBeenCalled()
    })
  })

  describe('loading state', () => {
    it('shows loading spinner when loading and not initialized', () => {
      mockHookState = {
        rootGoals: [],
        isLoading: true,
        error: null,
        isInitialized: false,
      }

      render(<GoalTreeView />)

      expect(screen.getByTestId('goal-tree-view-loading')).toBeInTheDocument()
      expect(screen.getByText('Loading your goals...')).toBeInTheDocument()
    })

    it('shows refreshing overlay when loading after initialization', () => {
      const goal = createMockGoal({ id: 1 })
      mockHookState = {
        rootGoals: [goal],
        isLoading: true,
        error: null,
        isInitialized: true,
      }

      render(<GoalTreeView />)

      expect(screen.getByTestId('goal-tree-view-refreshing')).toBeInTheDocument()
      expect(screen.getByText('Updating...')).toBeInTheDocument()
    })
  })

  describe('error state', () => {
    it('shows error message when there is an error', () => {
      mockHookState = {
        rootGoals: [],
        isLoading: false,
        error: 'Failed to connect to database',
        isInitialized: true,
      }

      render(<GoalTreeView />)

      expect(screen.getByTestId('goal-tree-view-error')).toBeInTheDocument()
      expect(screen.getByText('Failed to load goals')).toBeInTheDocument()
      expect(screen.getByText('Failed to connect to database')).toBeInTheDocument()
    })

    it('shows retry button on error that calls refresh', async () => {
      mockHookState = {
        rootGoals: [],
        isLoading: false,
        error: 'Some error',
        isInitialized: true,
      }

      render(<GoalTreeView />)

      const retryButton = screen.getByRole('button', { name: /try again/i })
      fireEvent.click(retryButton)

      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  describe('empty state', () => {
    it('shows empty state when there are no goals', () => {
      mockHookState = {
        rootGoals: [],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<GoalTreeView />)

      expect(screen.getByTestId('goal-tree-view-empty')).toBeInTheDocument()
      expect(screen.getByText('No goals yet')).toBeInTheDocument()
      expect(
        screen.getByText('Start by creating your first goal to begin planning your journey.')
      ).toBeInTheDocument()
    })

    it('shows New Goal button in empty state when onNewGoal is provided', () => {
      mockHookState = {
        rootGoals: [],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<GoalTreeView onNewGoal={() => {}} />)

      expect(screen.getByTestId('goal-tree-view-empty-new-goal')).toBeInTheDocument()
      expect(screen.getByText('New Goal')).toBeInTheDocument()
    })

    it('does not show New Goal button in empty state when onNewGoal is not provided', () => {
      mockHookState = {
        rootGoals: [],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<GoalTreeView />)

      expect(screen.queryByTestId('goal-tree-view-empty-new-goal')).not.toBeInTheDocument()
    })

    it('calls onNewGoal when New Goal button is clicked in empty state', () => {
      const onNewGoal = vi.fn()
      mockHookState = {
        rootGoals: [],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<GoalTreeView onNewGoal={onNewGoal} />)

      fireEvent.click(screen.getByTestId('goal-tree-view-empty-new-goal'))

      expect(onNewGoal).toHaveBeenCalledTimes(1)
    })
  })

  describe('rendering goals', () => {
    it('renders the tree view container', () => {
      const goal = createMockGoal({ id: 1, title: 'My Goal' })
      mockHookState = {
        rootGoals: [goal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<GoalTreeView />)

      expect(screen.getByTestId('goal-tree-view')).toBeInTheDocument()
    })

    it('renders root goals using GoalNode', () => {
      const goal1 = createMockGoal({ id: 1, title: 'Goal 1' })
      const goal2 = createMockGoal({ id: 2, title: 'Goal 2' })
      mockHookState = {
        rootGoals: [goal1, goal2],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<GoalTreeView />)

      expect(screen.getByTestId('goal-node-1')).toBeInTheDocument()
      expect(screen.getByTestId('goal-node-2')).toBeInTheDocument()
      expect(screen.getByTestId('goal-title-1')).toHaveTextContent('Goal 1')
      expect(screen.getByTestId('goal-title-2')).toHaveTextContent('Goal 2')
    })

    it('renders nested children within goals', () => {
      const task = createMockTask({ id: 101, title: 'Task 1' })
      const childGoal = createMockGoal({ id: 3, title: 'Child Goal', children: [task] })
      const parentGoal = createMockGoal({
        id: 1,
        title: 'Parent Goal',
        children: [childGoal],
      })
      mockHookState = {
        rootGoals: [parentGoal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<GoalTreeView />)

      expect(screen.getByTestId('goal-node-1')).toBeInTheDocument()
      expect(screen.getByTestId('goal-node-3')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      const goal = createMockGoal({ id: 1 })
      mockHookState = {
        rootGoals: [goal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<GoalTreeView className="my-custom-class" />)

      expect(screen.getByTestId('goal-tree-view')).toHaveClass('my-custom-class')
    })
  })

  describe('toolbar', () => {
    it('shows toolbar by default', () => {
      const goal = createMockGoal({ id: 1 })
      mockHookState = {
        rootGoals: [goal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<GoalTreeView />)

      expect(screen.getByTestId('goal-tree-view-toolbar')).toBeInTheDocument()
    })

    it('shows New Goal button when onNewGoal is provided', () => {
      const goal = createMockGoal({ id: 1 })
      mockHookState = {
        rootGoals: [goal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<GoalTreeView onNewGoal={() => {}} />)

      expect(screen.getByTestId('goal-tree-view-new-goal')).toBeInTheDocument()
      expect(screen.getByText('New Goal')).toBeInTheDocument()
    })

    it('does not show New Goal button when onNewGoal is not provided', () => {
      const goal = createMockGoal({ id: 1 })
      mockHookState = {
        rootGoals: [goal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<GoalTreeView />)

      expect(screen.queryByTestId('goal-tree-view-new-goal')).not.toBeInTheDocument()
    })

    it('calls onNewGoal when New Goal button is clicked', () => {
      const onNewGoal = vi.fn()
      const goal = createMockGoal({ id: 1 })
      mockHookState = {
        rootGoals: [goal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<GoalTreeView onNewGoal={onNewGoal} />)

      fireEvent.click(screen.getByTestId('goal-tree-view-new-goal'))

      expect(onNewGoal).toHaveBeenCalledTimes(1)
    })

    it('New Goal button has correct aria-label', () => {
      const goal = createMockGoal({ id: 1 })
      mockHookState = {
        rootGoals: [goal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<GoalTreeView onNewGoal={() => {}} />)

      expect(screen.getByTestId('goal-tree-view-new-goal')).toHaveAttribute(
        'aria-label',
        'Create new goal'
      )
    })

    it('hides toolbar when showToolbar is false', () => {
      const goal = createMockGoal({ id: 1 })
      mockHookState = {
        rootGoals: [goal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<GoalTreeView showToolbar={false} />)

      expect(screen.queryByTestId('goal-tree-view-toolbar')).not.toBeInTheDocument()
    })

    it('shows expand all button', () => {
      const goal = createMockGoal({ id: 1 })
      mockHookState = {
        rootGoals: [goal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<GoalTreeView />)

      expect(screen.getByTestId('goal-tree-view-expand-all')).toBeInTheDocument()
      expect(screen.getByText('Expand all')).toBeInTheDocument()
    })

    it('shows collapse all button', () => {
      const goal = createMockGoal({ id: 1 })
      mockHookState = {
        rootGoals: [goal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<GoalTreeView />)

      expect(screen.getByTestId('goal-tree-view-collapse-all')).toBeInTheDocument()
      expect(screen.getByText('Collapse all')).toBeInTheDocument()
    })

    it('shows refresh button', () => {
      const goal = createMockGoal({ id: 1 })
      mockHookState = {
        rootGoals: [goal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<GoalTreeView />)

      expect(screen.getByTestId('goal-tree-view-refresh')).toBeInTheDocument()
    })

    it('calls refresh when refresh button is clicked', async () => {
      const goal = createMockGoal({ id: 1 })
      mockHookState = {
        rootGoals: [goal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<GoalTreeView />)

      fireEvent.click(screen.getByTestId('goal-tree-view-refresh'))

      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  describe('expand/collapse all', () => {
    it('passes defaultExpanded=true to children when expand all is clicked', () => {
      const childGoal = createMockGoal({ id: 2, title: 'Child Goal' })
      const parentGoal = createMockGoal({
        id: 1,
        title: 'Parent Goal',
        children: [childGoal],
      })
      mockHookState = {
        rootGoals: [parentGoal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<GoalTreeView />)

      // Click expand all
      fireEvent.click(screen.getByTestId('goal-tree-view-expand-all'))

      // Child should be visible (since expand all was clicked)
      expect(screen.getByTestId('goal-node-2')).toBeInTheDocument()
    })

    it('passes defaultExpanded=false to children when collapse all is clicked', () => {
      const childGoal = createMockGoal({ id: 2, title: 'Child Goal' })
      const parentGoal = createMockGoal({
        id: 1,
        title: 'Parent Goal',
        children: [childGoal],
      })
      mockHookState = {
        rootGoals: [parentGoal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<GoalTreeView />)

      // First expand all to ensure children are visible
      fireEvent.click(screen.getByTestId('goal-tree-view-expand-all'))
      expect(screen.getByTestId('goal-node-2')).toBeInTheDocument()

      // Then collapse all
      fireEvent.click(screen.getByTestId('goal-tree-view-collapse-all'))

      // Child should be hidden
      expect(screen.queryByTestId('goal-node-2')).not.toBeInTheDocument()
    })
  })

  describe('stats display', () => {
    it('shows goal count in stats', () => {
      const goal1 = createMockGoal({ id: 1, title: 'Goal 1' })
      const goal2 = createMockGoal({ id: 2, title: 'Goal 2' })
      mockHookState = {
        rootGoals: [goal1, goal2],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<GoalTreeView />)

      expect(screen.getByTestId('goal-tree-view-stats')).toHaveTextContent('2 goals')
    })

    it('shows singular form for single goal', () => {
      const goal = createMockGoal({ id: 1, title: 'Goal 1' })
      mockHookState = {
        rootGoals: [goal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<GoalTreeView />)

      expect(screen.getByTestId('goal-tree-view-stats')).toHaveTextContent('1 goal')
    })

    it('shows task completion stats when tasks exist', () => {
      const task1 = createMockTask({ id: 101, isCompleted: true })
      const task2 = createMockTask({ id: 102, isCompleted: false })
      const goal = createMockGoal({
        id: 1,
        title: 'Goal 1',
        children: [task1, task2],
      })
      mockHookState = {
        rootGoals: [goal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<GoalTreeView />)

      expect(screen.getByTestId('goal-tree-view-stats')).toHaveTextContent('1/2 tasks done')
    })

    it('does not show task stats when no tasks exist', () => {
      const goal = createMockGoal({ id: 1, title: 'Goal 1' })
      mockHookState = {
        rootGoals: [goal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<GoalTreeView />)

      expect(screen.getByTestId('goal-tree-view-stats')).not.toHaveTextContent('tasks done')
    })
  })

  describe('callbacks', () => {
    it('calls onSelectNode when a node is selected', () => {
      const onSelectNode = vi.fn()
      const goal = createMockGoal({ id: 1, title: 'Clickable Goal' })
      mockHookState = {
        rootGoals: [goal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<GoalTreeView onSelectNode={onSelectNode} />)

      fireEvent.click(screen.getByTestId('goal-row-1'))

      expect(onSelectNode).toHaveBeenCalledWith(goal)
    })

    it('calls onAddChild when add child is clicked', () => {
      const onAddChild = vi.fn()
      const goal = createMockGoal({ id: 1 })
      mockHookState = {
        rootGoals: [goal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<GoalTreeView onAddChild={onAddChild} />)

      fireEvent.click(screen.getByTestId('goal-add-child-button-1'))

      expect(onAddChild).toHaveBeenCalledWith(goal)
    })

    it('passes selectedNodeId to GoalNode components', () => {
      const goal = createMockGoal({ id: 1 })
      mockHookState = {
        rootGoals: [goal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<GoalTreeView selectedNodeId={1} />)

      // The selected goal should have the selected styling
      const row = screen.getByTestId('goal-row-1')
      expect(row).toHaveClass('ring-2')
    })
  })

  describe('task toggling', () => {
    it('calls toggleTaskCompletion when a task is toggled', async () => {
      const task = createMockTask({ id: 101, title: 'Task 1', isCompleted: false })
      const goal = createMockGoal({
        id: 1,
        title: 'Goal 1',
        children: [task],
      })
      mockHookState = {
        rootGoals: [goal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<GoalTreeView />)

      // Find and click the task checkbox (rendered via NodeItem within GoalNode)
      const checkbox = screen.getByTestId('task-checkbox-101')
      fireEvent.click(checkbox)

      await waitFor(() => {
        expect(mockToggleTaskCompletion).toHaveBeenCalledWith(101)
      })
    })
  })

  describe('initial expand state', () => {
    it('starts expanded when initialExpandState is "expanded"', () => {
      const childGoal = createMockGoal({ id: 2, title: 'Child Goal' })
      const parentGoal = createMockGoal({
        id: 1,
        title: 'Parent Goal',
        children: [childGoal],
      })
      mockHookState = {
        rootGoals: [parentGoal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<GoalTreeView initialExpandState="expanded" />)

      // Child should be visible because expanded by default
      expect(screen.getByTestId('goal-node-2')).toBeInTheDocument()
    })

    it('starts collapsed when initialExpandState is "collapsed"', () => {
      const childGoal = createMockGoal({ id: 2, title: 'Child Goal' })
      const parentGoal = createMockGoal({
        id: 1,
        title: 'Parent Goal',
        children: [childGoal],
      })
      mockHookState = {
        rootGoals: [parentGoal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<GoalTreeView initialExpandState="collapsed" />)

      // Child should not be visible because collapsed by default
      expect(screen.queryByTestId('goal-node-2')).not.toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has correct role for the tree container', () => {
      const goal = createMockGoal({ id: 1 })
      mockHookState = {
        rootGoals: [goal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<GoalTreeView />)

      expect(screen.getByTestId('goal-tree-view')).toHaveAttribute('role', 'tree')
    })

    it('has correct aria-label for the tree', () => {
      const goal = createMockGoal({ id: 1 })
      mockHookState = {
        rootGoals: [goal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<GoalTreeView />)

      expect(screen.getByTestId('goal-tree-view')).toHaveAttribute('aria-label', 'Goal tree')
    })

    it('has correct aria-label for expand all button', () => {
      const goal = createMockGoal({ id: 1 })
      mockHookState = {
        rootGoals: [goal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<GoalTreeView />)

      expect(screen.getByTestId('goal-tree-view-expand-all')).toHaveAttribute(
        'aria-label',
        'Expand all nodes'
      )
    })

    it('has correct aria-label for collapse all button', () => {
      const goal = createMockGoal({ id: 1 })
      mockHookState = {
        rootGoals: [goal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<GoalTreeView />)

      expect(screen.getByTestId('goal-tree-view-collapse-all')).toHaveAttribute(
        'aria-label',
        'Collapse all nodes'
      )
    })

    it('has correct aria-label for refresh button', () => {
      const goal = createMockGoal({ id: 1 })
      mockHookState = {
        rootGoals: [goal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<GoalTreeView />)

      expect(screen.getByTestId('goal-tree-view-refresh')).toHaveAttribute(
        'aria-label',
        'Refresh tree'
      )
    })
  })

  describe('mobile responsiveness', () => {
    it('toolbar has responsive flex direction classes', () => {
      const goal = createMockGoal({ id: 1 })
      mockHookState = {
        rootGoals: [goal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<GoalTreeView />)

      const toolbar = screen.getByTestId('goal-tree-view-toolbar')
      expect(toolbar).toHaveClass('flex-col')
      expect(toolbar).toHaveClass('sm:flex-row')
    })

    it('expand all button hides text on mobile', () => {
      const goal = createMockGoal({ id: 1 })
      mockHookState = {
        rootGoals: [goal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<GoalTreeView />)

      const expandButton = screen.getByTestId('goal-tree-view-expand-all')
      const textSpan = expandButton.querySelector('span')
      expect(textSpan).toHaveClass('hidden')
      expect(textSpan).toHaveClass('sm:inline')
    })

    it('collapse all button hides text on mobile', () => {
      const goal = createMockGoal({ id: 1 })
      mockHookState = {
        rootGoals: [goal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<GoalTreeView />)

      const collapseButton = screen.getByTestId('goal-tree-view-collapse-all')
      const textSpan = collapseButton.querySelector('span')
      expect(textSpan).toHaveClass('hidden')
      expect(textSpan).toHaveClass('sm:inline')
    })

    it('New Goal button hides text on mobile', () => {
      const goal = createMockGoal({ id: 1 })
      mockHookState = {
        rootGoals: [goal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<GoalTreeView onNewGoal={() => {}} />)

      const newGoalButton = screen.getByTestId('goal-tree-view-new-goal')
      const textSpan = newGoalButton.querySelector('span')
      expect(textSpan).toHaveClass('hidden')
      expect(textSpan).toHaveClass('sm:inline')
    })
  })
})
