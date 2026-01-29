import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog'
import type { TreeNodeWithChildren } from '@/lib/goal-store'

// Helper to create a mock node
function createMockNode(overrides: Partial<TreeNodeWithChildren> = {}): TreeNodeWithChildren {
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

// Helper to create a node with children
function createMockNodeWithChildren(): TreeNodeWithChildren {
  return {
    id: 1,
    title: 'Parent Goal',
    nodeType: 'goal',
    status: 'active',
    type: 'goal',
    createdAt: new Date(),
    children: [
      {
        id: 2,
        title: 'Child Task 1',
        nodeType: 'task',
        status: 'active',
        type: 'task',
        createdAt: new Date(),
        children: [],
      },
      {
        id: 3,
        title: 'Child Goal',
        nodeType: 'goal',
        status: 'active',
        type: 'goal',
        createdAt: new Date(),
        children: [
          {
            id: 4,
            title: 'Grandchild Task',
            nodeType: 'task',
            status: 'active',
            type: 'task',
            createdAt: new Date(),
            children: [],
          },
        ],
      },
    ],
  }
}

describe('DeleteConfirmationDialog', () => {
  const mockOnOpenChange = vi.fn()
  const mockOnDelete = vi.fn()

  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    node: createMockNode(),
    onDelete: mockOnDelete,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnDelete.mockResolvedValue(1)
  })

  describe('rendering', () => {
    it('renders the dialog when open is true', () => {
      render(<DeleteConfirmationDialog {...defaultProps} />)

      expect(screen.getByTestId('delete-confirmation-dialog')).toBeInTheDocument()
    })

    it('does not render when open is false', () => {
      render(<DeleteConfirmationDialog {...defaultProps} open={false} />)

      expect(screen.queryByTestId('delete-confirmation-dialog')).not.toBeInTheDocument()
    })

    it('shows the correct title for a goal', () => {
      render(<DeleteConfirmationDialog {...defaultProps} />)

      expect(screen.getByTestId('delete-dialog-title')).toHaveTextContent('Delete goal?')
    })

    it('shows the correct title for a task', () => {
      render(
        <DeleteConfirmationDialog
          {...defaultProps}
          node={createMockNode({ nodeType: 'task', title: 'My Task' })}
        />
      )

      expect(screen.getByTestId('delete-dialog-title')).toHaveTextContent('Delete task?')
    })

    it('shows the correct title for a milestone', () => {
      render(
        <DeleteConfirmationDialog
          {...defaultProps}
          node={createMockNode({ nodeType: 'milestone', title: 'My Milestone' })}
        />
      )

      expect(screen.getByTestId('delete-dialog-title')).toHaveTextContent('Delete milestone?')
    })

    it('shows the correct title for a requirement', () => {
      render(
        <DeleteConfirmationDialog
          {...defaultProps}
          node={createMockNode({ nodeType: 'requirement', title: 'My Requirement' })}
        />
      )

      expect(screen.getByTestId('delete-dialog-title')).toHaveTextContent('Delete requirement?')
    })

    it('shows the node title in the description', () => {
      render(<DeleteConfirmationDialog {...defaultProps} />)

      expect(screen.getByTestId('delete-dialog-description')).toHaveTextContent('"Test Goal"')
    })

    it('shows action buttons', () => {
      render(<DeleteConfirmationDialog {...defaultProps} />)

      expect(screen.getByTestId('cancel-button')).toBeInTheDocument()
      expect(screen.getByTestId('confirm-delete-button')).toBeInTheDocument()
    })

    it('renders with null node gracefully', () => {
      render(<DeleteConfirmationDialog {...defaultProps} node={null} />)

      expect(screen.getByTestId('delete-dialog-description')).toHaveTextContent('"this item"')
    })
  })

  describe('descendant warning', () => {
    it('does not show warning when node has no children', () => {
      render(<DeleteConfirmationDialog {...defaultProps} />)

      expect(screen.queryByTestId('descendant-warning')).not.toBeInTheDocument()
    })

    it('shows warning when node has children', () => {
      render(
        <DeleteConfirmationDialog
          {...defaultProps}
          node={createMockNodeWithChildren()}
        />
      )

      expect(screen.getByTestId('descendant-warning')).toBeInTheDocument()
    })

    it('shows correct count for single child', () => {
      const nodeWithOneChild = createMockNode({
        children: [
          createMockNode({ id: 2, title: 'Child Task', nodeType: 'task' }),
        ],
      })

      render(<DeleteConfirmationDialog {...defaultProps} node={nodeWithOneChild} />)

      expect(screen.getByTestId('descendant-warning')).toHaveTextContent('1 child item')
    })

    it('shows correct count for multiple children and grandchildren', () => {
      render(
        <DeleteConfirmationDialog
          {...defaultProps}
          node={createMockNodeWithChildren()}
        />
      )

      // 2 direct children + 1 grandchild = 3 items
      expect(screen.getByTestId('descendant-warning')).toHaveTextContent('3 child items')
    })

    it('uses plural form for multiple items', () => {
      const nodeWithMultipleChildren = createMockNode({
        children: [
          createMockNode({ id: 2, title: 'Child 1', nodeType: 'task' }),
          createMockNode({ id: 3, title: 'Child 2', nodeType: 'task' }),
        ],
      })

      render(<DeleteConfirmationDialog {...defaultProps} node={nodeWithMultipleChildren} />)

      expect(screen.getByTestId('descendant-warning')).toHaveTextContent('2 child items')
    })
  })

  describe('delete action', () => {
    it('calls onDelete with correct arguments for a goal', async () => {
      render(<DeleteConfirmationDialog {...defaultProps} />)

      fireEvent.click(screen.getByTestId('confirm-delete-button'))

      await waitFor(() => {
        expect(mockOnDelete).toHaveBeenCalledWith(1, 'goal')
      })
    })

    it('calls onDelete with correct arguments for a task', async () => {
      render(
        <DeleteConfirmationDialog
          {...defaultProps}
          node={createMockNode({ id: 5, nodeType: 'task' })}
        />
      )

      fireEvent.click(screen.getByTestId('confirm-delete-button'))

      await waitFor(() => {
        expect(mockOnDelete).toHaveBeenCalledWith(5, 'task')
      })
    })

    it('calls onDelete with goal type for milestone', async () => {
      render(
        <DeleteConfirmationDialog
          {...defaultProps}
          node={createMockNode({ id: 3, nodeType: 'milestone' })}
        />
      )

      fireEvent.click(screen.getByTestId('confirm-delete-button'))

      await waitFor(() => {
        expect(mockOnDelete).toHaveBeenCalledWith(3, 'goal')
      })
    })

    it('calls onDelete with goal type for requirement', async () => {
      render(
        <DeleteConfirmationDialog
          {...defaultProps}
          node={createMockNode({ id: 4, nodeType: 'requirement' })}
        />
      )

      fireEvent.click(screen.getByTestId('confirm-delete-button'))

      await waitFor(() => {
        expect(mockOnDelete).toHaveBeenCalledWith(4, 'goal')
      })
    })

    it('closes dialog after successful deletion', async () => {
      render(<DeleteConfirmationDialog {...defaultProps} />)

      fireEvent.click(screen.getByTestId('confirm-delete-button'))

      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false)
      })
    })

    it('shows loading state while deleting', async () => {
      mockOnDelete.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(1), 100))
      )

      render(<DeleteConfirmationDialog {...defaultProps} />)

      fireEvent.click(screen.getByTestId('confirm-delete-button'))

      expect(screen.getByTestId('confirm-delete-button')).toHaveTextContent('Deleting...')
      expect(screen.getByTestId('confirm-delete-button')).toBeDisabled()
      expect(screen.getByTestId('cancel-button')).toBeDisabled()

      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false)
      })
    })

    it('shows error message on deletion failure', async () => {
      mockOnDelete.mockRejectedValue(new Error('Failed to delete'))

      render(<DeleteConfirmationDialog {...defaultProps} />)

      fireEvent.click(screen.getByTestId('confirm-delete-button'))

      await waitFor(() => {
        expect(screen.getByTestId('delete-error')).toHaveTextContent('Failed to delete')
      })
    })

    it('does not close dialog on deletion failure', async () => {
      mockOnDelete.mockRejectedValue(new Error('Failed to delete'))

      render(<DeleteConfirmationDialog {...defaultProps} />)

      fireEvent.click(screen.getByTestId('confirm-delete-button'))

      await waitFor(() => {
        expect(screen.getByTestId('delete-error')).toBeInTheDocument()
      })

      // Dialog should still be open (onOpenChange not called with false after error)
      expect(mockOnOpenChange).not.toHaveBeenCalledWith(false)
    })

    it('handles non-Error exceptions', async () => {
      mockOnDelete.mockRejectedValue('String error')

      render(<DeleteConfirmationDialog {...defaultProps} />)

      fireEvent.click(screen.getByTestId('confirm-delete-button'))

      await waitFor(() => {
        expect(screen.getByTestId('delete-error')).toHaveTextContent('Failed to delete item')
      })
    })

    it('shows error when node has no id', async () => {
      render(
        <DeleteConfirmationDialog
          {...defaultProps}
          node={createMockNode({ id: undefined })}
        />
      )

      fireEvent.click(screen.getByTestId('confirm-delete-button'))

      await waitFor(() => {
        expect(screen.getByTestId('delete-error')).toHaveTextContent('No node selected for deletion')
      })
    })
  })

  describe('cancel action', () => {
    it('calls onOpenChange with false when cancel is clicked', () => {
      render(<DeleteConfirmationDialog {...defaultProps} />)

      fireEvent.click(screen.getByTestId('cancel-button'))

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('does not call onDelete when cancel is clicked', () => {
      render(<DeleteConfirmationDialog {...defaultProps} />)

      fireEvent.click(screen.getByTestId('cancel-button'))

      expect(mockOnDelete).not.toHaveBeenCalled()
    })
  })

  describe('accessibility', () => {
    it('has alert role on descendant warning', () => {
      render(
        <DeleteConfirmationDialog
          {...defaultProps}
          node={createMockNodeWithChildren()}
        />
      )

      expect(screen.getByTestId('descendant-warning')).toHaveAttribute('role', 'alert')
    })

    it('has alert role on error message', async () => {
      mockOnDelete.mockRejectedValue(new Error('Test error'))

      render(<DeleteConfirmationDialog {...defaultProps} />)

      fireEvent.click(screen.getByTestId('confirm-delete-button'))

      await waitFor(() => {
        expect(screen.getByTestId('delete-error')).toHaveAttribute('role', 'alert')
      })
    })

    it('has correct aria-label on cancel button', () => {
      render(<DeleteConfirmationDialog {...defaultProps} />)

      expect(screen.getByTestId('cancel-button')).toHaveAttribute('aria-label', 'Cancel deletion')
    })

    it('has correct aria-label on delete button', () => {
      render(<DeleteConfirmationDialog {...defaultProps} />)

      expect(screen.getByTestId('confirm-delete-button')).toHaveAttribute(
        'aria-label',
        'Delete goal'
      )
    })

    it('has correct aria-label on delete button while deleting', async () => {
      mockOnDelete.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(1), 100))
      )

      render(<DeleteConfirmationDialog {...defaultProps} />)

      fireEvent.click(screen.getByTestId('confirm-delete-button'))

      expect(screen.getByTestId('confirm-delete-button')).toHaveAttribute(
        'aria-label',
        'Deleting...'
      )

      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false)
      })
    })
  })

  describe('different node types display', () => {
    it('shows "Delete item?" as fallback for unknown node types', () => {
      const unknownNode = createMockNode()
      // @ts-expect-error - testing unknown node type
      unknownNode.nodeType = 'unknown'

      render(<DeleteConfirmationDialog {...defaultProps} node={unknownNode} />)

      expect(screen.getByTestId('delete-dialog-title')).toHaveTextContent('Delete item?')
    })
  })

  describe('optional callbacks', () => {
    it('works without onDelete callback', async () => {
      render(<DeleteConfirmationDialog {...defaultProps} onDelete={undefined} />)

      fireEvent.click(screen.getByTestId('confirm-delete-button'))

      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false)
      })
    })
  })
})
