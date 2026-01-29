import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Home from '@/app/page'
import type { TreeNodeWithChildren } from '@/lib/goal-store'

// Mock the database module first to avoid module resolution issues
vi.mock('@/src/db', () => ({
  db: {
    goals: { toArray: vi.fn().mockResolvedValue([]) },
    tasks: { toArray: vi.fn().mockResolvedValue([]) },
    settings: { toArray: vi.fn().mockResolvedValue([]) },
  },
  goalRepository: null,
  GoalRepository: vi.fn(),
}))

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

// Mock the goal store
const mockAddGoal = vi.fn().mockResolvedValue(1)
const mockAddMilestone = vi.fn().mockResolvedValue(2)
const mockAddRequirement = vi.fn().mockResolvedValue(3)
const mockAddTask = vi.fn().mockResolvedValue(4)
const mockDeleteNode = vi.fn().mockResolvedValue(1)

vi.mock('@/lib/goal-store', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/goal-store')>()
  return {
    ...original,
    useGoalStore: () => ({
      addGoal: mockAddGoal,
      addMilestone: mockAddMilestone,
      addRequirement: mockAddRequirement,
      addTask: mockAddTask,
      deleteNode: mockDeleteNode,
    }),
  }
})

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

describe('Home Page', () => {
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
    it('renders the home page with AppLayout', () => {
      render(<Home />)
      expect(screen.getByTestId('app-layout')).toBeInTheDocument()
    })

    it('renders the GoalTree header', () => {
      render(<Home />)
      expect(screen.getByText('GoalTree')).toBeInTheDocument()
    })

    it('renders the settings button', () => {
      render(<Home />)
      expect(screen.getByLabelText('Open settings')).toBeInTheDocument()
    })
  })

  describe('AddChildDialog integration', () => {
    it('opens AddChildDialog when create root goal button is clicked', async () => {
      mockHookState = {
        rootGoals: [],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<Home />)

      // Click the create goal button in empty state
      const createButton = screen.getByTestId('goal-tree-view-empty-new-goal')
      fireEvent.click(createButton)

      await waitFor(() => {
        expect(screen.getByTestId('add-child-dialog')).toBeInTheDocument()
      })
    })

    it('opens AddChildDialog when add child button is clicked on a goal', async () => {
      const goal = createMockGoal({ id: 1, title: 'Parent Goal' })
      mockHookState = {
        rootGoals: [goal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<Home />)

      // Click the add child button on the goal
      const addChildButton = screen.getByTestId('goal-add-child-button-1')
      fireEvent.click(addChildButton)

      await waitFor(() => {
        expect(screen.getByTestId('add-child-dialog')).toBeInTheDocument()
      })
    })

    it('shows parent node title in dialog when adding child to existing node', async () => {
      const goal = createMockGoal({ id: 1, title: 'Parent Goal' })
      mockHookState = {
        rootGoals: [goal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<Home />)

      const addChildButton = screen.getByTestId('goal-add-child-button-1')
      fireEvent.click(addChildButton)

      await waitFor(() => {
        expect(screen.getByTestId('add-child-dialog-title')).toHaveTextContent('Parent Goal')
      })
    })

    it('closes AddChildDialog when cancelled', async () => {
      mockHookState = {
        rootGoals: [],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<Home />)

      const createButton = screen.getByTestId('goal-tree-view-empty-new-goal')
      fireEvent.click(createButton)

      await waitFor(() => {
        expect(screen.getByTestId('add-child-dialog')).toBeInTheDocument()
      })

      const cancelButton = screen.getByTestId('cancel-button')
      fireEvent.click(cancelButton)

      await waitFor(() => {
        expect(screen.queryByTestId('add-child-dialog')).not.toBeInTheDocument()
      })
    })
  })

  describe('DeleteConfirmationDialog integration', () => {
    it('opens DeleteConfirmationDialog when delete button is clicked', async () => {
      const goal = createMockGoal({ id: 1, title: 'Goal to Delete' })
      mockHookState = {
        rootGoals: [goal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<Home />)

      // Click the delete button on the goal
      const deleteButton = screen.getByTestId('goal-delete-button-1')
      fireEvent.click(deleteButton)

      await waitFor(() => {
        expect(screen.getByTestId('delete-confirmation-dialog')).toBeInTheDocument()
      })
    })

    it('shows node title in delete confirmation dialog', async () => {
      const goal = createMockGoal({ id: 1, title: 'Goal to Delete' })
      mockHookState = {
        rootGoals: [goal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<Home />)

      const deleteButton = screen.getByTestId('goal-delete-button-1')
      fireEvent.click(deleteButton)

      await waitFor(() => {
        expect(screen.getByTestId('node-title')).toHaveTextContent('Goal to Delete')
      })
    })

    it('closes DeleteConfirmationDialog when cancelled', async () => {
      const goal = createMockGoal({ id: 1, title: 'Goal to Delete' })
      mockHookState = {
        rootGoals: [goal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<Home />)

      const deleteButton = screen.getByTestId('goal-delete-button-1')
      fireEvent.click(deleteButton)

      await waitFor(() => {
        expect(screen.getByTestId('delete-confirmation-dialog')).toBeInTheDocument()
      })

      const cancelButton = screen.getByTestId('cancel-button')
      fireEvent.click(cancelButton)

      await waitFor(() => {
        expect(screen.queryByTestId('delete-confirmation-dialog')).not.toBeInTheDocument()
      })
    })

    it('calls deleteNode when delete is confirmed', async () => {
      const goal = createMockGoal({ id: 1, title: 'Goal to Delete' })
      mockHookState = {
        rootGoals: [goal],
        isLoading: false,
        error: null,
        isInitialized: true,
      }

      render(<Home />)

      const deleteButton = screen.getByTestId('goal-delete-button-1')
      fireEvent.click(deleteButton)

      await waitFor(() => {
        expect(screen.getByTestId('delete-confirmation-dialog')).toBeInTheDocument()
      })

      const confirmButton = screen.getByTestId('confirm-delete-button')
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(mockDeleteNode).toHaveBeenCalledWith(1, 'goal')
      })
    })
  })

  describe('SettingsModal integration', () => {
    it('opens settings modal when settings button is clicked', async () => {
      render(<Home />)

      const settingsButton = screen.getByLabelText('Open settings')
      fireEvent.click(settingsButton)

      await waitFor(() => {
        expect(screen.getByTestId('settings-modal')).toBeInTheDocument()
      })
    })
  })
})
