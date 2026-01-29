import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AddChildDialog } from '@/components/add-child-dialog'
import type { TreeNodeWithChildren } from '@/lib/goal-store'

// Helper to create a mock parent node
function createMockParent(overrides: Partial<TreeNodeWithChildren> = {}): TreeNodeWithChildren {
  return {
    id: 1,
    title: 'Parent Goal',
    nodeType: 'goal',
    status: 'active',
    type: 'goal',
    createdAt: new Date(),
    children: [],
    ...overrides,
  }
}

describe('AddChildDialog', () => {
  const mockOnOpenChange = vi.fn()
  const mockOnAddGoal = vi.fn()
  const mockOnAddMilestone = vi.fn()
  const mockOnAddRequirement = vi.fn()
  const mockOnAddTask = vi.fn()

  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    parentNode: createMockParent(),
    onAddGoal: mockOnAddGoal,
    onAddMilestone: mockOnAddMilestone,
    onAddRequirement: mockOnAddRequirement,
    onAddTask: mockOnAddTask,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnAddGoal.mockResolvedValue(1)
    mockOnAddMilestone.mockResolvedValue(2)
    mockOnAddRequirement.mockResolvedValue(3)
    mockOnAddTask.mockResolvedValue(4)
  })

  describe('rendering', () => {
    it('renders the dialog when open is true', () => {
      render(<AddChildDialog {...defaultProps} />)

      expect(screen.getByTestId('add-child-dialog')).toBeInTheDocument()
    })

    it('does not render when open is false', () => {
      render(<AddChildDialog {...defaultProps} open={false} />)

      expect(screen.queryByTestId('add-child-dialog')).not.toBeInTheDocument()
    })

    it('shows the parent node title in the header', () => {
      render(<AddChildDialog {...defaultProps} />)

      // Use regex to match typographic quotes (curly quotes)
      expect(screen.getByTestId('add-child-dialog-title')).toHaveTextContent(/Add to .Parent Goal./)
    })

    it('shows the form elements', () => {
      render(<AddChildDialog {...defaultProps} />)

      expect(screen.getByTestId('add-child-form')).toBeInTheDocument()
      expect(screen.getByTestId('type-selector')).toBeInTheDocument()
      expect(screen.getByTestId('title-input')).toBeInTheDocument()
      expect(screen.getByTestId('description-input')).toBeInTheDocument()
      expect(screen.getByTestId('cancel-button')).toBeInTheDocument()
      expect(screen.getByTestId('submit-button')).toBeInTheDocument()
    })
  })

  describe('type selection', () => {
    it('renders all type options', () => {
      render(<AddChildDialog {...defaultProps} />)

      expect(screen.getByTestId('type-option-goal')).toBeInTheDocument()
      expect(screen.getByTestId('type-option-milestone')).toBeInTheDocument()
      expect(screen.getByTestId('type-option-requirement')).toBeInTheDocument()
      expect(screen.getByTestId('type-option-task')).toBeInTheDocument()
    })

    it('defaults to task type', () => {
      render(<AddChildDialog {...defaultProps} />)

      expect(screen.getByTestId('type-option-task')).toHaveAttribute('aria-checked', 'true')
    })

    it('allows changing the selected type', () => {
      render(<AddChildDialog {...defaultProps} />)

      fireEvent.click(screen.getByTestId('type-option-goal'))

      expect(screen.getByTestId('type-option-goal')).toHaveAttribute('aria-checked', 'true')
      expect(screen.getByTestId('type-option-task')).toHaveAttribute('aria-checked', 'false')
    })

    it('shows task-specific fields when task is selected', () => {
      render(<AddChildDialog {...defaultProps} />)

      expect(screen.getByTestId('frequency-selector')).toBeInTheDocument()
      expect(screen.getByTestId('measurement-input')).toBeInTheDocument()
    })

    it('hides task-specific fields when another type is selected', () => {
      render(<AddChildDialog {...defaultProps} />)

      fireEvent.click(screen.getByTestId('type-option-goal'))

      expect(screen.queryByTestId('frequency-selector')).not.toBeInTheDocument()
      expect(screen.queryByTestId('measurement-input')).not.toBeInTheDocument()
    })

    it('updates submit button text based on selected type', () => {
      render(<AddChildDialog {...defaultProps} />)

      expect(screen.getByTestId('submit-button')).toHaveTextContent('Add Task')

      fireEvent.click(screen.getByTestId('type-option-goal'))
      expect(screen.getByTestId('submit-button')).toHaveTextContent('Add Goal')

      fireEvent.click(screen.getByTestId('type-option-milestone'))
      expect(screen.getByTestId('submit-button')).toHaveTextContent('Add Milestone')

      fireEvent.click(screen.getByTestId('type-option-requirement'))
      expect(screen.getByTestId('submit-button')).toHaveTextContent('Add Requirement')
    })
  })

  describe('frequency selection (for tasks)', () => {
    it('renders all frequency options', () => {
      render(<AddChildDialog {...defaultProps} />)

      expect(screen.getByTestId('frequency-option-once')).toBeInTheDocument()
      expect(screen.getByTestId('frequency-option-daily')).toBeInTheDocument()
      expect(screen.getByTestId('frequency-option-weekly')).toBeInTheDocument()
      expect(screen.getByTestId('frequency-option-custom')).toBeInTheDocument()
    })

    it('defaults to once frequency', () => {
      render(<AddChildDialog {...defaultProps} />)

      expect(screen.getByTestId('frequency-option-once')).toHaveAttribute('aria-checked', 'true')
    })

    it('allows changing frequency', () => {
      render(<AddChildDialog {...defaultProps} />)

      fireEvent.click(screen.getByTestId('frequency-option-daily'))

      expect(screen.getByTestId('frequency-option-daily')).toHaveAttribute('aria-checked', 'true')
      expect(screen.getByTestId('frequency-option-once')).toHaveAttribute('aria-checked', 'false')
    })
  })

  describe('form submission', () => {
    it('disables submit button when title is empty', () => {
      render(<AddChildDialog {...defaultProps} />)

      expect(screen.getByTestId('submit-button')).toBeDisabled()
    })

    it('enables submit button when title is provided', () => {
      render(<AddChildDialog {...defaultProps} />)

      fireEvent.change(screen.getByTestId('title-input'), { target: { value: 'My Task' } })

      expect(screen.getByTestId('submit-button')).not.toBeDisabled()
    })

    it('calls onAddTask when submitting a task', async () => {
      render(<AddChildDialog {...defaultProps} />)

      fireEvent.change(screen.getByTestId('title-input'), { target: { value: 'My Task' } })
      fireEvent.change(screen.getByTestId('description-input'), { target: { value: 'Task description' } })
      fireEvent.click(screen.getByTestId('frequency-option-daily'))
      fireEvent.change(screen.getByTestId('measurement-input'), { target: { value: '30 minutes' } })
      fireEvent.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(mockOnAddTask).toHaveBeenCalledWith({
          title: 'My Task',
          description: 'Task description',
          parentId: 1,
          frequency: 'daily',
          measurement: '30 minutes',
        })
      })
    })

    it('calls onAddGoal when submitting a goal', async () => {
      render(<AddChildDialog {...defaultProps} />)

      fireEvent.click(screen.getByTestId('type-option-goal'))
      fireEvent.change(screen.getByTestId('title-input'), { target: { value: 'My Goal' } })
      fireEvent.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(mockOnAddGoal).toHaveBeenCalledWith({
          title: 'My Goal',
          description: undefined,
          parentId: 1,
        })
      })
    })

    it('calls onAddMilestone when submitting a milestone', async () => {
      render(<AddChildDialog {...defaultProps} />)

      fireEvent.click(screen.getByTestId('type-option-milestone'))
      fireEvent.change(screen.getByTestId('title-input'), { target: { value: 'My Milestone' } })
      fireEvent.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(mockOnAddMilestone).toHaveBeenCalledWith({
          title: 'My Milestone',
          description: undefined,
          parentId: 1,
        })
      })
    })

    it('calls onAddRequirement when submitting a requirement', async () => {
      render(<AddChildDialog {...defaultProps} />)

      fireEvent.click(screen.getByTestId('type-option-requirement'))
      fireEvent.change(screen.getByTestId('title-input'), { target: { value: 'My Requirement' } })
      fireEvent.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(mockOnAddRequirement).toHaveBeenCalledWith({
          title: 'My Requirement',
          description: undefined,
          parentId: 1,
        })
      })
    })

    it('closes dialog after successful submission', async () => {
      render(<AddChildDialog {...defaultProps} />)

      fireEvent.change(screen.getByTestId('title-input'), { target: { value: 'My Task' } })
      fireEvent.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false)
      })
    })

    it('shows loading state while submitting', async () => {
      mockOnAddTask.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(1), 100))
      )

      render(<AddChildDialog {...defaultProps} />)

      fireEvent.change(screen.getByTestId('title-input'), { target: { value: 'My Task' } })
      fireEvent.click(screen.getByTestId('submit-button'))

      expect(screen.getByTestId('submit-button')).toHaveTextContent('Adding...')
      expect(screen.getByTestId('submit-button')).toBeDisabled()

      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false)
      })
    })

    it('shows error message on submission failure', async () => {
      mockOnAddTask.mockRejectedValue(new Error('Failed to add task'))

      render(<AddChildDialog {...defaultProps} />)

      fireEvent.change(screen.getByTestId('title-input'), { target: { value: 'My Task' } })
      fireEvent.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(screen.getByTestId('add-child-error')).toHaveTextContent('Failed to add task')
      })
    })

    it('trims whitespace from title and description', async () => {
      render(<AddChildDialog {...defaultProps} />)

      fireEvent.change(screen.getByTestId('title-input'), { target: { value: '  My Task  ' } })
      fireEvent.change(screen.getByTestId('description-input'), { target: { value: '  Description  ' } })
      fireEvent.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(mockOnAddTask).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'My Task',
            description: 'Description',
          })
        )
      })
    })

    it('omits empty optional fields', async () => {
      render(<AddChildDialog {...defaultProps} />)

      fireEvent.click(screen.getByTestId('type-option-goal'))
      fireEvent.change(screen.getByTestId('title-input'), { target: { value: 'My Goal' } })
      fireEvent.change(screen.getByTestId('description-input'), { target: { value: '   ' } })
      fireEvent.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(mockOnAddGoal).toHaveBeenCalledWith({
          title: 'My Goal',
          description: undefined,
          parentId: 1,
        })
      })
    })
  })

  describe('cancel behavior', () => {
    it('calls onOpenChange with false when cancel is clicked', () => {
      render(<AddChildDialog {...defaultProps} />)

      fireEvent.click(screen.getByTestId('cancel-button'))

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe('form reset', () => {
    it('resets form when dialog is reopened', () => {
      const { rerender } = render(<AddChildDialog {...defaultProps} />)

      // Fill in the form
      fireEvent.click(screen.getByTestId('type-option-goal'))
      fireEvent.change(screen.getByTestId('title-input'), { target: { value: 'My Title' } })
      fireEvent.change(screen.getByTestId('description-input'), { target: { value: 'My Description' } })

      // Close and reopen
      rerender(<AddChildDialog {...defaultProps} open={false} />)
      rerender(<AddChildDialog {...defaultProps} open={true} />)

      // Form should be reset
      expect(screen.getByTestId('type-option-task')).toHaveAttribute('aria-checked', 'true')
      expect(screen.getByTestId('title-input')).toHaveValue('')
      expect(screen.getByTestId('description-input')).toHaveValue('')
    })
  })

  describe('error handling', () => {
    it('shows error when title is only whitespace', async () => {
      render(<AddChildDialog {...defaultProps} />)

      // Workaround: set a non-whitespace value first to enable the button
      fireEvent.change(screen.getByTestId('title-input'), { target: { value: 'test' } })
      // Then change to whitespace
      fireEvent.change(screen.getByTestId('title-input'), { target: { value: '   ' } })
      
      // Button should be disabled since title is effectively empty after trim
      expect(screen.getByTestId('submit-button')).toBeDisabled()
    })
  })

  describe('root goal mode (parentNode = null)', () => {
    it('shows "Create New Goal" title when parentNode is null', () => {
      render(<AddChildDialog {...defaultProps} parentNode={null} />)

      expect(screen.getByTestId('add-child-dialog-title')).toHaveTextContent('Create New Goal')
    })

    it('shows appropriate description for root goal', () => {
      render(<AddChildDialog {...defaultProps} parentNode={null} />)

      expect(screen.getByTestId('add-child-dialog-description')).toHaveTextContent('Create a new top-level goal.')
    })

    it('hides the type selector when parentNode is null', () => {
      render(<AddChildDialog {...defaultProps} parentNode={null} />)

      expect(screen.queryByTestId('type-selector')).not.toBeInTheDocument()
    })

    it('defaults to goal type for root goals', () => {
      render(<AddChildDialog {...defaultProps} parentNode={null} />)

      // Submit button should show "Add Goal"
      expect(screen.getByTestId('submit-button')).toHaveTextContent('Add Goal')
    })

    it('hides task-specific fields for root goals', () => {
      render(<AddChildDialog {...defaultProps} parentNode={null} />)

      expect(screen.queryByTestId('frequency-selector')).not.toBeInTheDocument()
      expect(screen.queryByTestId('measurement-input')).not.toBeInTheDocument()
    })

    it('calls onAddGoal without parentId when submitting a root goal', async () => {
      render(<AddChildDialog {...defaultProps} parentNode={null} />)

      fireEvent.change(screen.getByTestId('title-input'), { target: { value: 'My Root Goal' } })
      fireEvent.change(screen.getByTestId('description-input'), { target: { value: 'Root goal description' } })
      fireEvent.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(mockOnAddGoal).toHaveBeenCalledWith({
          title: 'My Root Goal',
          description: 'Root goal description',
        })
      })
      // Verify parentId is NOT included in the call
      expect(mockOnAddGoal).not.toHaveBeenCalledWith(
        expect.objectContaining({ parentId: expect.anything() })
      )
    })

    it('calls onAddGoal with parentId undefined for root goal', async () => {
      render(<AddChildDialog {...defaultProps} parentNode={null} />)

      fireEvent.change(screen.getByTestId('title-input'), { target: { value: 'My Root Goal' } })
      fireEvent.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(mockOnAddGoal).toHaveBeenCalled()
        const calledWith = mockOnAddGoal.mock.calls[0][0]
        expect(calledWith.title).toBe('My Root Goal')
        expect(calledWith).not.toHaveProperty('parentId')
      })
    })

    it('closes dialog after successful root goal submission', async () => {
      render(<AddChildDialog {...defaultProps} parentNode={null} />)

      fireEvent.change(screen.getByTestId('title-input'), { target: { value: 'My Root Goal' } })
      fireEvent.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false)
      })
    })

    it('shows loading state while submitting root goal', async () => {
      mockOnAddGoal.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(1), 100))
      )

      render(<AddChildDialog {...defaultProps} parentNode={null} />)

      fireEvent.change(screen.getByTestId('title-input'), { target: { value: 'My Root Goal' } })
      fireEvent.click(screen.getByTestId('submit-button'))

      expect(screen.getByTestId('submit-button')).toHaveTextContent('Adding...')
      expect(screen.getByTestId('submit-button')).toBeDisabled()

      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false)
      })
    })

    it('shows error message on root goal submission failure', async () => {
      mockOnAddGoal.mockRejectedValue(new Error('Failed to create root goal'))

      render(<AddChildDialog {...defaultProps} parentNode={null} />)

      fireEvent.change(screen.getByTestId('title-input'), { target: { value: 'My Root Goal' } })
      fireEvent.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(screen.getByTestId('add-child-error')).toHaveTextContent('Failed to create root goal')
      })
    })

    it('resets to goal type when reopening in root mode', () => {
      const { rerender } = render(<AddChildDialog {...defaultProps} />)

      // Change type to milestone when in child mode
      fireEvent.click(screen.getByTestId('type-option-milestone'))

      // Close and reopen in root mode
      rerender(<AddChildDialog {...defaultProps} open={false} parentNode={null} />)
      rerender(<AddChildDialog {...defaultProps} open={true} parentNode={null} />)

      // Should show "Add Goal" since type selector is hidden and defaults to goal
      expect(screen.getByTestId('submit-button')).toHaveTextContent('Add Goal')
    })
  })

  describe('accessibility', () => {
    it('has correct role for type selector', () => {
      render(<AddChildDialog {...defaultProps} />)

      expect(screen.getByTestId('type-selector')).toHaveAttribute('role', 'radiogroup')
    })

    it('has correct role for frequency selector', () => {
      render(<AddChildDialog {...defaultProps} />)

      expect(screen.getByTestId('frequency-selector')).toHaveAttribute('role', 'radiogroup')
    })

    it('has correct aria-label for type selector', () => {
      render(<AddChildDialog {...defaultProps} />)

      expect(screen.getByTestId('type-selector')).toHaveAttribute(
        'aria-label',
        'Select node type'
      )
    })

    it('has correct aria-label for frequency selector', () => {
      render(<AddChildDialog {...defaultProps} />)

      expect(screen.getByTestId('frequency-selector')).toHaveAttribute(
        'aria-label',
        'Select frequency'
      )
    })

    it('type options have radio role', () => {
      render(<AddChildDialog {...defaultProps} />)

      expect(screen.getByTestId('type-option-task')).toHaveAttribute('role', 'radio')
      expect(screen.getByTestId('type-option-goal')).toHaveAttribute('role', 'radio')
    })

    it('frequency options have radio role', () => {
      render(<AddChildDialog {...defaultProps} />)

      expect(screen.getByTestId('frequency-option-once')).toHaveAttribute('role', 'radio')
      expect(screen.getByTestId('frequency-option-daily')).toHaveAttribute('role', 'radio')
    })

    it('error message has alert role', async () => {
      mockOnAddTask.mockRejectedValue(new Error('Test error'))

      render(<AddChildDialog {...defaultProps} />)

      fireEvent.change(screen.getByTestId('title-input'), { target: { value: 'My Task' } })
      fireEvent.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(screen.getByTestId('add-child-error')).toHaveAttribute('role', 'alert')
      })
    })
  })
})
