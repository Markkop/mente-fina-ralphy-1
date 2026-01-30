'use client'

import { useState, useCallback, useMemo } from 'react'
import {
  ChevronRight,
  ChevronDown,
  Target,
  Flag,
  Info,
  CheckSquare,
  Square,
  MoreHorizontal,
  Repeat,
  Calendar,
  Trash2,
  Loader2,
} from 'lucide-react'
import type { NodeOperationType } from '@/lib/ui-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { TreeNodeWithChildren } from '@/lib/goal-store'
import type { TaskFrequency } from '@/src/db'

/**
 * Props for the NodeItem component
 */
export interface NodeItemProps {
  /** The tree node to render */
  node: TreeNodeWithChildren
  /** Depth level for indentation (default: 0) */
  depth?: number
  /** Whether the node is initially expanded (default: true for depth 0) */
  defaultExpanded?: boolean
  /** Callback when a task is toggled */
  onToggleTask?: (id: number, isCompleted: boolean) => void
  /** Callback when a node is selected */
  onSelect?: (node: TreeNodeWithChildren) => void
  /** Callback when add child is clicked */
  onAddChild?: (parentNode: TreeNodeWithChildren) => void
  /** Callback when delete is clicked */
  onDelete?: (node: TreeNodeWithChildren) => void
  /** Currently selected node id */
  selectedNodeId?: number | null
  /** Type of pending operation on this node (if any) */
  pendingOperation?: NodeOperationType
  /** Map of node IDs to their pending operation types (for child nodes) */
  pendingOperations?: Map<number, NodeOperationType>
}

/**
 * Icon mapping for node types
 */
const NODE_ICONS = {
  goal: Target,
  milestone: Flag,
  requirement: Info,
  task: CheckSquare,
} as const

/**
 * Icon mapping for frequency types
 */
const FREQUENCY_ICONS = {
  daily: Repeat,
  weekly: Repeat,
  custom: Repeat,
  once: Calendar,
} as const

/**
 * Get the color classes for a node type
 */
function getNodeColors(nodeType: TreeNodeWithChildren['nodeType']) {
  switch (nodeType) {
    case 'goal':
      return {
        icon: 'text-blue-500',
        bg: 'bg-blue-50 dark:bg-blue-950/30',
        border: 'border-blue-200 dark:border-blue-800',
        hover: 'hover:bg-blue-100 dark:hover:bg-blue-950/50',
      }
    case 'milestone':
      return {
        icon: 'text-purple-500',
        bg: 'bg-purple-50 dark:bg-purple-950/30',
        border: 'border-purple-200 dark:border-purple-800',
        hover: 'hover:bg-purple-100 dark:hover:bg-purple-950/50',
      }
    case 'requirement':
      return {
        icon: 'text-amber-500',
        bg: 'bg-amber-50 dark:bg-amber-950/30',
        border: 'border-amber-200 dark:border-amber-800',
        hover: 'hover:bg-amber-100 dark:hover:bg-amber-950/50',
      }
    case 'task':
      return {
        icon: 'text-green-500',
        bg: 'bg-green-50 dark:bg-green-950/30',
        border: 'border-green-200 dark:border-green-800',
        hover: 'hover:bg-green-100 dark:hover:bg-green-950/50',
      }
    default:
      return {
        icon: 'text-gray-500',
        bg: 'bg-gray-50 dark:bg-gray-950/30',
        border: 'border-gray-200 dark:border-gray-800',
        hover: 'hover:bg-gray-100 dark:hover:bg-gray-950/50',
      }
  }
}

/**
 * Format frequency for display
 */
function formatFrequency(frequency: TaskFrequency): string {
  switch (frequency) {
    case 'daily':
      return 'Daily'
    case 'weekly':
      return 'Weekly'
    case 'once':
      return 'One-time'
    case 'custom':
      return 'Custom'
    default:
      return frequency
  }
}

/**
 * Calculate progress percentage based on completed children
 */
function calculateProgress(node: TreeNodeWithChildren): number {
  const children = node.children
  if (children.length === 0) return 0

  let completed = 0
  let total = 0

  for (const child of children) {
    if (child.nodeType === 'task') {
      total++
      if ((child as TreeNodeWithChildren & { isCompleted?: boolean }).isCompleted) {
        completed++
      }
    } else if (child.nodeType !== 'requirement') {
      // For non-task, non-requirement nodes, recurse
      const childProgress = calculateProgress(child)
      if (child.children.length > 0) {
        // Weight by the number of task descendants
        const childTasks = countTasks(child)
        if (childTasks > 0) {
          total += childTasks
          completed += (childProgress / 100) * childTasks
        }
      }
    }
  }

  return total > 0 ? Math.round((completed / total) * 100) : 0
}

/**
 * Count total tasks in a node's subtree
 */
function countTasks(node: TreeNodeWithChildren): number {
  let count = 0
  for (const child of node.children) {
    if (child.nodeType === 'task') {
      count++
    } else {
      count += countTasks(child)
    }
  }
  return count
}

/**
 * NodeItem Component - The recursive building block for the goal tree
 *
 * This component renders a single node in the tree hierarchy and recursively
 * renders its children. It provides visual distinction between different node
 * types (Goal, Milestone, Requirement, Task) and supports expand/collapse functionality.
 */
export function NodeItem({
  node,
  depth = 0,
  defaultExpanded,
  onToggleTask,
  onSelect,
  onAddChild,
  onDelete,
  selectedNodeId,
  pendingOperation,
  pendingOperations,
}: NodeItemProps) {
  // Default to expanded for root level, collapsed for deeper levels
  const [isExpanded, setIsExpanded] = useState(defaultExpanded ?? depth < 2)

  const hasChildren = node.children.length > 0
  const isTask = node.nodeType === 'task'
  const isSelected = selectedNodeId === node.id
  const colors = getNodeColors(node.nodeType)
  const NodeIcon = NODE_ICONS[node.nodeType] ?? Target
  
  // Check if this node has a pending operation
  const hasPendingOperation = pendingOperation !== undefined || 
    (node.id !== undefined && pendingOperations?.has(node.id))
  const currentOperation = pendingOperation ?? 
    (node.id !== undefined ? pendingOperations?.get(node.id) : undefined)

  // Task-specific properties
  const isCompleted = isTask
    ? (node as TreeNodeWithChildren & { isCompleted?: boolean }).isCompleted ?? false
    : false
  const frequency = isTask
    ? ((node as TreeNodeWithChildren & { frequency?: TaskFrequency }).frequency ?? 'once')
    : null

  // Progress for goals and milestones
  const progress = useMemo(() => {
    if (node.nodeType === 'goal' || node.nodeType === 'milestone') {
      return calculateProgress(node)
    }
    return 0
  }, [node])

  const handleToggleExpand = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded((prev) => !prev)
  }, [])

  const handleSelect = useCallback(() => {
    onSelect?.(node)
  }, [node, onSelect])

  const handleToggleTask = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (isTask && node.id !== undefined) {
        onToggleTask?.(node.id, !isCompleted)
      }
    },
    [isTask, node.id, isCompleted, onToggleTask]
  )

  const handleAddChild = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onAddChild?.(node)
    },
    [node, onAddChild]
  )

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onDelete?.(node)
    },
    [node, onDelete]
  )

  const TaskFrequencyIcon = frequency ? FREQUENCY_ICONS[frequency] : null

  return (
    <div className="w-full" data-testid={`node-item-${node.id}`}>
      {/* Node Row */}
      <div
        className={cn(
          'group flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors cursor-pointer',
          colors.bg,
          colors.border,
          colors.hover,
          isSelected && 'ring-2 ring-primary ring-offset-1',
          isCompleted && 'opacity-60',
          hasPendingOperation && 'opacity-70 pointer-events-none'
        )}
        style={{ marginLeft: depth * 24 }}
        onClick={handleSelect}
        role="treeitem"
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-selected={isSelected}
        aria-busy={hasPendingOperation}
        data-testid={`node-row-${node.id}`}
      >
        {/* Expand/Collapse Button */}
        <button
          type="button"
          className={cn(
            'flex h-5 w-5 items-center justify-center rounded transition-colors',
            'hover:bg-black/10 dark:hover:bg-white/10',
            !hasChildren && 'invisible'
          )}
          onClick={handleToggleExpand}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
          data-testid={`expand-button-${node.id}`}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        {/* Node Type Icon or Task Checkbox */}
        {isTask ? (
          <button
            type="button"
            className={cn(
              'flex h-5 w-5 items-center justify-center rounded transition-colors',
              'hover:bg-black/10 dark:hover:bg-white/10',
              colors.icon
            )}
            onClick={handleToggleTask}
            aria-label={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
            data-testid={`task-checkbox-${node.id}`}
          >
            {isCompleted ? (
              <CheckSquare className="h-4 w-4" />
            ) : (
              <Square className="h-4 w-4" />
            )}
          </button>
        ) : (
          <NodeIcon className={cn('h-4 w-4', colors.icon)} />
        )}

        {/* Node Title */}
        <span
          className={cn(
            'flex-1 text-sm font-medium truncate',
            isCompleted && 'line-through text-muted-foreground'
          )}
          data-testid={`node-title-${node.id}`}
        >
          {node.title}
        </span>

        {/* Frequency Badge (for tasks) */}
        {frequency && frequency !== 'once' && TaskFrequencyIcon && (
          <span
            className={cn(
              'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs',
              'bg-black/5 dark:bg-white/10 text-muted-foreground'
            )}
            data-testid={`frequency-badge-${node.id}`}
          >
            <TaskFrequencyIcon className="h-3 w-3" />
            {formatFrequency(frequency)}
          </span>
        )}

        {/* Progress Bar (for goals and milestones) */}
        {(node.nodeType === 'goal' || node.nodeType === 'milestone') && hasChildren && (
          <div className="flex items-center gap-2" data-testid={`progress-container-${node.id}`}>
            <div className="h-1.5 w-16 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-300',
                  progress === 100 ? 'bg-green-500' : 'bg-primary'
                )}
                style={{ width: `${progress}%` }}
                data-testid={`progress-bar-${node.id}`}
              />
            </div>
            <span className="text-xs text-muted-foreground w-8" data-testid={`progress-text-${node.id}`}>
              {progress}%
            </span>
          </div>
        )}

        {/* Loading indicator (when operation pending) */}
        {hasPendingOperation && (
          <div
            className="flex items-center gap-1.5 text-muted-foreground"
            data-testid={`node-loading-${node.id}`}
          >
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span className="text-xs">
              {currentOperation === 'creating' ? 'Adding...' : 'Deleting...'}
            </span>
          </div>
        )}

        {/* Actions (visible on hover, hidden when loading) */}
        {!hasPendingOperation && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!isTask && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={handleAddChild}
                aria-label="Add child node"
                data-testid={`add-child-button-${node.id}`}
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={handleDelete}
              aria-label="Delete node"
              data-testid={`delete-button-${node.id}`}
              className="hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600 dark:hover:text-red-400"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div
          className="mt-1 space-y-1"
          role="group"
          aria-label={`Children of ${node.title}`}
          data-testid={`children-container-${node.id}`}
        >
          {node.children.map((child) => (
            <NodeItem
              key={`${child.nodeType}-${child.id}`}
              node={child}
              depth={depth + 1}
              defaultExpanded={defaultExpanded}
              onToggleTask={onToggleTask}
              onSelect={onSelect}
              onAddChild={onAddChild}
              onDelete={onDelete}
              selectedNodeId={selectedNodeId}
              pendingOperations={pendingOperations}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default NodeItem
