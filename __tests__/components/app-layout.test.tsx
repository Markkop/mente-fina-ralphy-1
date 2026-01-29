import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AppLayout } from '@/components/app-layout'
import type { TreeNodeWithChildren } from '@/lib/goal-store'

// Mock the hooks module
const mockInitialize = vi.fn()
const mockRefresh = vi.fn()
const mockToggleTaskCompletion = vi.fn()

let mockHookState = {
  rootGoals: [] as TreeNodeWithChildren[],
  isLoading: false,
  error: null as string | null,
  isInitialized: true,
}

vi.mock('@/lib/hooks', () => ({
  useGoalTree: () => ({
    ...mockHookState,
    initialize: mockInitialize,
    refresh: mockRefresh,
    toggleTaskCompletion: mockToggleTaskCompletion,
  }),
}))

// Mock the AI module
vi.mock('@/lib/ai', () => ({
  useOpenAIKey: () => ({
    hasKey: true,
    isLoaded: true,
    saveApiKey: vi.fn(),
    clearApiKey: vi.fn(),
  }),
  createOpenAIClient: () => null,
  GOALTREE_SYSTEM_PROMPT: 'Test prompt',
  DEFAULT_CHAT_MODEL: 'gpt-4',
}))

// Mock useChat from @ai-sdk/react
vi.mock('@ai-sdk/react', () => ({
  useChat: () => ({
    messages: [],
    input: '',
    handleInputChange: vi.fn(),
    handleSubmit: vi.fn(),
    isLoading: false,
    error: null,
    setMessages: vi.fn(),
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

describe('AppLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHookState = {
      rootGoals: [],
      isLoading: false,
      error: null,
      isInitialized: true,
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders the layout container', () => {
      render(<AppLayout />)
      expect(screen.getByTestId('app-layout')).toBeInTheDocument()
    })

    it('renders the main content area', () => {
      render(<AppLayout />)
      expect(screen.getByTestId('app-layout-content')).toBeInTheDocument()
      expect(screen.getByTestId('app-layout-main')).toBeInTheDocument()
    })

    it('renders the goal tree view inside main area', () => {
      const goal = createMockGoal({ id: 1, title: 'Test Goal' })
      mockHookState = {
        rootGoals: [goal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<AppLayout />)
      expect(screen.getByTestId('goal-tree-view')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(<AppLayout className="custom-layout-class" />)
      expect(screen.getByTestId('app-layout')).toHaveClass('custom-layout-class')
    })
  })

  describe('header', () => {
    it('renders header when provided', () => {
      render(
        <AppLayout
          header={<h1 data-testid="custom-header">GoalTree</h1>}
        />
      )

      expect(screen.getByTestId('app-layout-header')).toBeInTheDocument()
      expect(screen.getByTestId('custom-header')).toBeInTheDocument()
      expect(screen.getByText('GoalTree')).toBeInTheDocument()
    })

    it('does not render header when not provided', () => {
      render(<AppLayout />)
      expect(screen.queryByTestId('app-layout-header')).not.toBeInTheDocument()
    })
  })

  describe('chat sidebar', () => {
    it('renders the chat sidebar toggle button when closed', () => {
      render(<AppLayout defaultChatOpen={false} />)
      expect(screen.getByTestId('chat-sidebar-toggle')).toBeInTheDocument()
    })

    it('opens chat sidebar when toggle is clicked', async () => {
      render(<AppLayout defaultChatOpen={false} />)

      const toggleButton = screen.getByTestId('chat-sidebar-toggle')
      fireEvent.click(toggleButton)

      await waitFor(() => {
        expect(screen.getByTestId('chat-sidebar')).toBeInTheDocument()
      })
    })

    it('starts with chat open when defaultChatOpen is true', async () => {
      render(<AppLayout defaultChatOpen={true} />)

      await waitFor(() => {
        expect(screen.getByTestId('chat-sidebar')).toBeInTheDocument()
      })
    })

    it('calls onChatOpenChange when chat state changes', async () => {
      const onChatOpenChange = vi.fn()
      render(
        <AppLayout
          defaultChatOpen={false}
          onChatOpenChange={onChatOpenChange}
        />
      )

      const toggleButton = screen.getByTestId('chat-sidebar-toggle')
      fireEvent.click(toggleButton)

      await waitFor(() => {
        expect(onChatOpenChange).toHaveBeenCalledWith(true)
      })
    })

    it('respects controlled chatOpen prop', async () => {
      const { rerender } = render(
        <AppLayout chatOpen={false} />
      )

      // Chat should be closed (toggle visible)
      expect(screen.getByTestId('chat-sidebar-toggle')).toBeInTheDocument()

      // Rerender with chat open
      rerender(<AppLayout chatOpen={true} />)

      await waitFor(() => {
        expect(screen.getByTestId('chat-sidebar')).toBeInTheDocument()
      })
    })
  })

  describe('goal tree interaction callbacks', () => {
    it('calls onSelectNode when a node is selected', () => {
      const onSelectNode = vi.fn()
      const goal = createMockGoal({ id: 1, title: 'Selectable Goal' })
      mockHookState = {
        rootGoals: [goal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<AppLayout onSelectNode={onSelectNode} />)

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

      render(<AppLayout onAddChild={onAddChild} />)

      fireEvent.click(screen.getByTestId('goal-add-child-button-1'))

      expect(onAddChild).toHaveBeenCalledWith(goal)
    })

    it('passes selectedNodeId to GoalTreeView', () => {
      const goal = createMockGoal({ id: 1 })
      mockHookState = {
        rootGoals: [goal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<AppLayout selectedNodeId={1} />)

      // The selected goal should have the selected styling
      const row = screen.getByTestId('goal-row-1')
      expect(row).toHaveClass('ring-2')
    })
  })

  describe('add child dialog integration', () => {
    it('opens add child dialog when add child button is clicked', async () => {
      const goal = createMockGoal({ id: 1, title: 'Test Goal' })
      mockHookState = {
        rootGoals: [goal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<AppLayout />)

      // Dialog should not be visible initially
      expect(screen.queryByTestId('add-child-dialog')).not.toBeInTheDocument()

      // Click the add child button
      fireEvent.click(screen.getByTestId('goal-add-child-button-1'))

      // Dialog should now be visible
      await waitFor(() => {
        expect(screen.getByTestId('add-child-dialog')).toBeInTheDocument()
      })
    })

    it('passes the correct parent node to the add child dialog', async () => {
      const goal = createMockGoal({ id: 1, title: 'Parent Goal' })
      mockHookState = {
        rootGoals: [goal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<AppLayout />)

      fireEvent.click(screen.getByTestId('goal-add-child-button-1'))

      await waitFor(() => {
        // Use regex to match typographic quotes (curly quotes)
        expect(screen.getByTestId('add-child-dialog-title')).toHaveTextContent(/Add to .Parent Goal./)
      })
    })

    it('calls onAddChild callback before opening dialog', async () => {
      const onAddChild = vi.fn()
      const goal = createMockGoal({ id: 1 })
      mockHookState = {
        rootGoals: [goal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<AppLayout onAddChild={onAddChild} />)

      fireEvent.click(screen.getByTestId('goal-add-child-button-1'))

      expect(onAddChild).toHaveBeenCalledWith(goal)

      await waitFor(() => {
        expect(screen.getByTestId('add-child-dialog')).toBeInTheDocument()
      })
    })

    it('passes addChildDialogProps to the dialog', async () => {
      const mockOnAddGoal = vi.fn().mockResolvedValue(1)
      const goal = createMockGoal({ id: 1 })
      mockHookState = {
        rootGoals: [goal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(
        <AppLayout
          addChildDialogProps={{
            onAddGoal: mockOnAddGoal,
          }}
        />
      )

      // Open the dialog
      fireEvent.click(screen.getByTestId('goal-add-child-button-1'))

      await waitFor(() => {
        expect(screen.getByTestId('add-child-dialog')).toBeInTheDocument()
      })

      // Select goal type and fill in the form
      fireEvent.click(screen.getByTestId('type-option-goal'))
      fireEvent.change(screen.getByTestId('title-input'), { target: { value: 'New Goal' } })
      fireEvent.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(mockOnAddGoal).toHaveBeenCalledWith({
          title: 'New Goal',
          description: undefined,
          parentId: 1,
        })
      })
    })

    it('closes dialog after successful submission', async () => {
      const mockOnAddTask = vi.fn().mockResolvedValue(1)
      const goal = createMockGoal({ id: 1 })
      mockHookState = {
        rootGoals: [goal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(
        <AppLayout
          addChildDialogProps={{
            onAddTask: mockOnAddTask,
          }}
        />
      )

      // Open the dialog
      fireEvent.click(screen.getByTestId('goal-add-child-button-1'))

      await waitFor(() => {
        expect(screen.getByTestId('add-child-dialog')).toBeInTheDocument()
      })

      // Fill in the form and submit
      fireEvent.change(screen.getByTestId('title-input'), { target: { value: 'New Task' } })
      fireEvent.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(screen.queryByTestId('add-child-dialog')).not.toBeInTheDocument()
      })
    })

    it('opens dialog with null parent when create root goal is clicked from empty state', async () => {
      mockHookState = {
        rootGoals: [],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<AppLayout />)

      // Click the create goal button in empty state
      const createButton = screen.getByRole('button', { name: /create.*goal/i })
      fireEvent.click(createButton)

      await waitFor(() => {
        expect(screen.getByTestId('add-child-dialog')).toBeInTheDocument()
        expect(screen.getByTestId('add-child-dialog-title')).toHaveTextContent('Create New Goal')
      })
    })

    it('opens dialog with null parent when New Goal toolbar button is clicked', async () => {
      const goal = createMockGoal({ id: 1, title: 'Existing Goal' })
      mockHookState = {
        rootGoals: [goal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<AppLayout />)

      // Click the New Goal button in the toolbar
      const newGoalButton = screen.getByTestId('goal-tree-view-new-goal')
      fireEvent.click(newGoalButton)

      await waitFor(() => {
        expect(screen.getByTestId('add-child-dialog')).toBeInTheDocument()
        // Dialog title should indicate root goal creation (no parent)
        expect(screen.getByTestId('add-child-dialog-title')).toHaveTextContent('Create New Goal')
        // Dialog description should indicate top-level goal
        expect(screen.getByTestId('add-child-dialog-description')).toHaveTextContent('Create a new top-level goal.')
      })
    })

    it('allows creating root goal from toolbar and submitting successfully', async () => {
      const mockOnAddGoal = vi.fn().mockResolvedValue(2)
      const goal = createMockGoal({ id: 1, title: 'Existing Goal' })
      mockHookState = {
        rootGoals: [goal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(
        <AppLayout
          addChildDialogProps={{
            onAddGoal: mockOnAddGoal,
          }}
        />
      )

      // Click the New Goal button in the toolbar
      fireEvent.click(screen.getByTestId('goal-tree-view-new-goal'))

      await waitFor(() => {
        expect(screen.getByTestId('add-child-dialog')).toBeInTheDocument()
      })

      // Fill in the form (type selector should not be shown for root goals)
      expect(screen.queryByTestId('type-selector')).not.toBeInTheDocument()

      fireEvent.change(screen.getByTestId('title-input'), { target: { value: 'New Root Goal' } })
      fireEvent.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        // Should call onAddGoal without parentId for root goal
        expect(mockOnAddGoal).toHaveBeenCalledWith({
          title: 'New Root Goal',
          description: undefined,
        })
      })
    })
  })

  describe('delete confirmation dialog integration', () => {
    it('opens delete confirmation dialog when delete button is clicked', async () => {
      const goal = createMockGoal({ id: 1, title: 'Test Goal' })
      mockHookState = {
        rootGoals: [goal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<AppLayout />)

      // Dialog should not be visible initially
      expect(screen.queryByTestId('delete-confirmation-dialog')).not.toBeInTheDocument()

      // Click the delete button
      fireEvent.click(screen.getByTestId('goal-delete-button-1'))

      // Dialog should now be visible
      await waitFor(() => {
        expect(screen.getByTestId('delete-confirmation-dialog')).toBeInTheDocument()
      })
    })

    it('passes the correct node to the delete confirmation dialog', async () => {
      const goal = createMockGoal({ id: 1, title: 'Goal to Delete' })
      mockHookState = {
        rootGoals: [goal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<AppLayout />)

      fireEvent.click(screen.getByTestId('goal-delete-button-1'))

      await waitFor(() => {
        expect(screen.getByTestId('node-title')).toHaveTextContent('"Goal to Delete"')
      })
    })

    it('calls onDelete callback before opening dialog', async () => {
      const onDelete = vi.fn()
      const goal = createMockGoal({ id: 1 })
      mockHookState = {
        rootGoals: [goal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<AppLayout onDelete={onDelete} />)

      fireEvent.click(screen.getByTestId('goal-delete-button-1'))

      expect(onDelete).toHaveBeenCalledWith(goal)

      await waitFor(() => {
        expect(screen.getByTestId('delete-confirmation-dialog')).toBeInTheDocument()
      })
    })

    it('passes deleteConfirmationDialogProps to the dialog', async () => {
      const mockOnDelete = vi.fn().mockResolvedValue(1)
      const goal = createMockGoal({ id: 1, title: 'Test Goal' })
      mockHookState = {
        rootGoals: [goal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(
        <AppLayout
          deleteConfirmationDialogProps={{
            onDelete: mockOnDelete,
          }}
        />
      )

      // Open the dialog
      fireEvent.click(screen.getByTestId('goal-delete-button-1'))

      await waitFor(() => {
        expect(screen.getByTestId('delete-confirmation-dialog')).toBeInTheDocument()
      })

      // Click the confirm delete button
      fireEvent.click(screen.getByTestId('confirm-delete-button'))

      await waitFor(() => {
        expect(mockOnDelete).toHaveBeenCalledWith(1, 'goal')
      })
    })

    it('closes dialog after successful deletion', async () => {
      const mockOnDelete = vi.fn().mockResolvedValue(1)
      const goal = createMockGoal({ id: 1 })
      mockHookState = {
        rootGoals: [goal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(
        <AppLayout
          deleteConfirmationDialogProps={{
            onDelete: mockOnDelete,
          }}
        />
      )

      // Open the dialog
      fireEvent.click(screen.getByTestId('goal-delete-button-1'))

      await waitFor(() => {
        expect(screen.getByTestId('delete-confirmation-dialog')).toBeInTheDocument()
      })

      // Confirm deletion
      fireEvent.click(screen.getByTestId('confirm-delete-button'))

      await waitFor(() => {
        expect(screen.queryByTestId('delete-confirmation-dialog')).not.toBeInTheDocument()
      })
    })

    it('closes dialog when cancel is clicked', async () => {
      const goal = createMockGoal({ id: 1 })
      mockHookState = {
        rootGoals: [goal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<AppLayout />)

      // Open the dialog
      fireEvent.click(screen.getByTestId('goal-delete-button-1'))

      await waitFor(() => {
        expect(screen.getByTestId('delete-confirmation-dialog')).toBeInTheDocument()
      })

      // Click cancel
      fireEvent.click(screen.getByTestId('cancel-button'))

      await waitFor(() => {
        expect(screen.queryByTestId('delete-confirmation-dialog')).not.toBeInTheDocument()
      })
    })

    it('shows correct node type in delete dialog for tasks', async () => {
      const task = createMockGoal({ id: 1, title: 'Test Task', nodeType: 'task' })
      mockHookState = {
        rootGoals: [task],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<AppLayout />)

      fireEvent.click(screen.getByTestId('goal-delete-button-1'))

      await waitFor(() => {
        expect(screen.getByTestId('delete-dialog-title')).toHaveTextContent('Delete task?')
      })
    })
  })

  describe('goalTreeViewProps', () => {
    it('passes goalTreeViewProps to GoalTreeView', () => {
      const goal = createMockGoal({ id: 1 })
      mockHookState = {
        rootGoals: [goal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(
        <AppLayout
          goalTreeViewProps={{
            showToolbar: false,
          }}
        />
      )

      expect(screen.queryByTestId('goal-tree-view-toolbar')).not.toBeInTheDocument()
    })

    it('passes initialExpandState to GoalTreeView', () => {
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

      render(
        <AppLayout
          goalTreeViewProps={{
            initialExpandState: 'expanded',
          }}
        />
      )

      // Child should be visible because expanded
      expect(screen.getByTestId('goal-node-2')).toBeInTheDocument()
    })
  })

  describe('layout structure', () => {
    it('has correct flex layout structure', () => {
      render(<AppLayout />)

      const layout = screen.getByTestId('app-layout')
      expect(layout).toHaveClass('flex')
      expect(layout).toHaveClass('h-screen')
      expect(layout).toHaveClass('flex-col')

      const content = screen.getByTestId('app-layout-content')
      expect(content).toHaveClass('flex')
      expect(content).toHaveClass('flex-1')
    })

    it('has main area as flex-1 for proper sizing', () => {
      render(<AppLayout />)

      const main = screen.getByTestId('app-layout-main')
      expect(main).toHaveClass('flex-1')
    })
  })

  describe('empty state', () => {
    it('shows empty state when no goals exist', () => {
      mockHookState = {
        rootGoals: [],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<AppLayout />)

      expect(screen.getByTestId('goal-tree-view-empty')).toBeInTheDocument()
      expect(screen.getByText('No goals yet')).toBeInTheDocument()
    })
  })

  describe('loading state', () => {
    it('shows loading state when tree is loading', () => {
      mockHookState = {
        rootGoals: [],
        isLoading: true,
        error: null,
        isInitialized: false,
      }

      render(<AppLayout />)

      expect(screen.getByTestId('goal-tree-view-loading')).toBeInTheDocument()
    })
  })

  describe('error state', () => {
    it('shows error state when tree has an error', () => {
      mockHookState = {
        rootGoals: [],
        isLoading: false,
        error: 'Database connection failed',
        isInitialized: true,
      }

      render(<AppLayout />)

      expect(screen.getByTestId('goal-tree-view-error')).toBeInTheDocument()
      expect(screen.getByText('Database connection failed')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has main element for landmark navigation', () => {
      render(<AppLayout />)

      const main = screen.getByTestId('app-layout-main')
      expect(main.tagName).toBe('MAIN')
    })

    it('has header element when header is provided', () => {
      render(
        <AppLayout header={<h1>GoalTree</h1>} />
      )

      const header = screen.getByTestId('app-layout-header')
      expect(header.tagName).toBe('HEADER')
    })
  })

  describe('mobile responsiveness', () => {
    it('applies responsive padding to main content area', () => {
      render(<AppLayout />)

      const main = screen.getByTestId('app-layout-main')
      const scrollContent = main.querySelector('.p-4')
      expect(scrollContent).toBeInTheDocument()
      expect(scrollContent).toHaveClass('sm:p-6')
    })
  })
})
