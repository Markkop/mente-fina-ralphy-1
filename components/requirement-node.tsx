'use client'

import { useCallback } from 'react'
import { Info, Trash2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { TreeNodeWithChildren } from '@/lib/goal-store'
import type { NodeOperationType } from '@/lib/ui-store'

/**
 * Props for the RequirementNode component
 */
export interface RequirementNodeProps {
  /** The requirement node to render */
  node: TreeNodeWithChildren
  /** Depth level for indentation (default: 0) */
  depth?: number
  /** Callback when the requirement is selected */
  onSelect?: (node: TreeNodeWithChildren) => void
  /** Callback when delete is clicked */
  onDelete?: (node: TreeNodeWithChildren) => void
  /** Currently selected node id */
  selectedNodeId?: number | null
  /** Map of node IDs to their pending operation types */
  pendingOperations?: Map<number, NodeOperationType>
}

/**
 * RequirementNode Component - A distinct visual variant for requirement nodes
 *
 * This component provides informational styling specifically for requirements.
 * Requirements are non-checkable nodes that provide context or information
 * needed to achieve a goal. They feature an amber/yellow color scheme to
 * distinguish them from actionable tasks.
 */
export function RequirementNode({
  node,
  depth = 0,
  onSelect,
  onDelete,
  selectedNodeId,
  pendingOperations,
}: RequirementNodeProps) {
  const isSelected = selectedNodeId === node.id
  
  // Check if this node has a pending operation
  const hasPendingOperation = node.id !== undefined && pendingOperations?.has(node.id)
  const currentOperation = node.id !== undefined ? pendingOperations?.get(node.id) : undefined

  const handleSelect = useCallback(() => {
    onSelect?.(node)
  }, [node, onSelect])

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onDelete?.(node)
    },
    [node, onDelete]
  )

  return (
    <div className="w-full" data-testid={`requirement-node-${node.id}`}>
      {/* Requirement Card */}
      <div
        className={cn(
          'group flex items-center gap-3 rounded-lg border px-4 py-3 transition-all duration-200 cursor-pointer',
          // Informational amber styling
          'bg-gradient-to-r from-amber-50/80 to-white dark:from-amber-950/30 dark:to-gray-900',
          'border-amber-200 dark:border-amber-800',
          // Hover effect
          'hover:border-amber-400 dark:hover:border-amber-600 hover:shadow-sm',
          // Selected state
          isSelected && 'ring-2 ring-primary ring-offset-1 border-amber-500 dark:border-amber-400',
          // Loading state
          hasPendingOperation && 'opacity-70 pointer-events-none'
        )}
        style={{ marginLeft: depth * 24 }}
        onClick={handleSelect}
        role="treeitem"
        aria-selected={isSelected}
        aria-busy={hasPendingOperation}
        data-testid={`requirement-row-${node.id}`}
      >
        {/* Info Icon - non-interactive, informational indicator */}
        <div
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded-md',
            'bg-amber-100 dark:bg-amber-900/50'
          )}
          data-testid={`requirement-icon-${node.id}`}
        >
          <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>

        {/* Requirement Content */}
        <div className="flex-1 min-w-0">
          <span
            className="block text-sm font-medium truncate"
            data-testid={`requirement-title-${node.id}`}
          >
            {node.title}
          </span>
          {/* Description (optional) */}
          {node.description && (
            <span
              className="block text-xs text-muted-foreground truncate mt-0.5"
              data-testid={`requirement-description-${node.id}`}
            >
              {node.description}
            </span>
          )}
        </div>

        {/* Informational Badge */}
        <span
          className={cn(
            'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
            'bg-amber-100 dark:bg-amber-900/40',
            'text-amber-700 dark:text-amber-300'
          )}
          data-testid={`requirement-badge-${node.id}`}
        >
          <Info className="h-3 w-3 text-amber-500" />
          Info
        </span>

        {/* Loading indicator (when operation pending) */}
        {hasPendingOperation && (
          <div
            className="flex items-center gap-1.5 text-muted-foreground"
            data-testid={`requirement-loading-${node.id}`}
          >
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span className="text-xs">
              {currentOperation === 'creating' ? 'Adding...' : 'Deleting...'}
            </span>
          </div>
        )}

        {/* Delete button (visible on hover, hidden when loading) */}
        {!hasPendingOperation && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={handleDelete}
              aria-label="Delete requirement"
              data-testid={`requirement-delete-button-${node.id}`}
              className="hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600 dark:hover:text-red-400"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default RequirementNode
