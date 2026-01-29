'use client'

import { useState, useCallback } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { TreeNodeWithChildren } from '@/lib/goal-store'

/**
 * Props for the DeleteConfirmationDialog component
 */
export interface DeleteConfirmationDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void
  /** The node to delete */
  node: TreeNodeWithChildren | null
  /** Callback to delete the node, returns the count of deleted nodes */
  onDelete?: (id: number, nodeType: 'goal' | 'task') => Promise<number>
}

/**
 * Counts total descendants (children, grandchildren, etc.) recursively
 */
function countDescendants(node: TreeNodeWithChildren): number {
  let count = node.children.length
  for (const child of node.children) {
    count += countDescendants(child)
  }
  return count
}

/**
 * Get display name for a node type
 */
function getNodeTypeLabel(nodeType: string): string {
  switch (nodeType) {
    case 'goal':
      return 'goal'
    case 'milestone':
      return 'milestone'
    case 'requirement':
      return 'requirement'
    case 'task':
      return 'task'
    default:
      return 'item'
  }
}

/**
 * DeleteConfirmationDialog Component - Confirmation dialog for deleting nodes
 *
 * This component provides a confirmation dialog before permanently deleting
 * a node and all its descendants from the tree.
 */
export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  node,
  onDelete,
}: DeleteConfirmationDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Calculate total descendants that will be deleted
  const descendantCount = node ? countDescendants(node) : 0
  const nodeTypeLabel = node ? getNodeTypeLabel(node.nodeType) : 'item'

  // Handle delete confirmation
  const handleDelete = useCallback(async () => {
    if (!node?.id) {
      setError('No node selected for deletion')
      return
    }

    setIsDeleting(true)
    setError(null)

    try {
      // Determine the database node type (goal or task)
      const dbNodeType = node.nodeType === 'task' ? 'task' : 'goal'
      await onDelete?.(node.id, dbNodeType)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item')
    } finally {
      setIsDeleting(false)
    }
  }, [node, onDelete, onOpenChange])

  // Handle cancel
  const handleCancel = useCallback(() => {
    setError(null)
    onOpenChange(false)
  }, [onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="delete-confirmation-dialog">
        <DialogHeader>
          <DialogTitle
            className="flex items-center gap-2"
            data-testid="delete-dialog-title"
          >
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete {nodeTypeLabel}?
          </DialogTitle>
          <DialogDescription data-testid="delete-dialog-description">
            Are you sure you want to delete{' '}
            <span className="font-medium text-foreground">
              &quot;{node?.title || 'this item'}&quot;
            </span>
            ? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {/* Warning about descendants */}
        {descendantCount > 0 && (
          <div
            className="rounded-lg border border-destructive/50 bg-destructive/10 p-3"
            role="alert"
            data-testid="descendant-warning"
          >
            <p className="text-sm text-destructive">
              <strong>Warning:</strong> This will also permanently delete{' '}
              {descendantCount} {descendantCount === 1 ? 'child item' : 'child items'}.
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <p
            className="text-sm text-destructive"
            role="alert"
            data-testid="delete-error"
          >
            {error}
          </p>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isDeleting}
            aria-label="Cancel deletion"
            data-testid="cancel-button"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
            aria-label={isDeleting ? 'Deleting...' : `Delete ${nodeTypeLabel}`}
            data-testid="confirm-delete-button"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default DeleteConfirmationDialog
