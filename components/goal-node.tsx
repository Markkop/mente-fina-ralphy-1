'use client'

import { useState, useCallback, useMemo } from 'react'
import {
  ChevronRight,
  ChevronDown,
  Target,
  MoreHorizontal,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { TreeNodeWithChildren } from '@/lib/goal-store'
import { NodeItem } from './node-item'

/**
 * Props for the GoalNode component
 */
export interface GoalNodeProps {
  /** The goal node to render */
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
 * Get progress bar color based on percentage
 */
function getProgressColor(progress: number): string {
  if (progress === 100) return 'bg-green-500'
  if (progress >= 75) return 'bg-emerald-500'
  if (progress >= 50) return 'bg-blue-500'
  if (progress >= 25) return 'bg-blue-400'
  return 'bg-blue-300'
}

/**
 * Get progress status text
 */
function getProgressStatus(progress: number, taskCount: number): string {
  if (taskCount === 0) return 'No tasks yet'
  if (progress === 100) return 'Completed!'
  if (progress >= 75) return 'Almost there'
  if (progress >= 50) return 'Halfway done'
  if (progress > 0) return 'In progress'
  return 'Not started'
}

/**
 * GoalNode Component - A distinct visual variant for goal nodes
 *
 * This component provides enhanced visual styling specifically for goals,
 * featuring a card-like appearance with a prominent progress bar and
 * visual hierarchy indicators.
 */
export function GoalNode({
  node,
  depth = 0,
  defaultExpanded,
  onToggleTask,
  onSelect,
  onAddChild,
  onDelete,
  selectedNodeId,
}: GoalNodeProps) {
  // Default to expanded for root level, collapsed for deeper levels
  const [isExpanded, setIsExpanded] = useState(defaultExpanded ?? depth < 2)

  const hasChildren = node.children.length > 0
  const isSelected = selectedNodeId === node.id
  const isRootGoal = depth === 0

  // Progress calculation
  const progress = useMemo(() => calculateProgress(node), [node])
  const taskCount = useMemo(() => countTasks(node), [node])
  const progressColor = getProgressColor(progress)
  const progressStatus = getProgressStatus(progress, taskCount)

  const handleToggleExpand = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded((prev) => !prev)
  }, [])

  const handleSelect = useCallback(() => {
    onSelect?.(node)
  }, [node, onSelect])

  const handleAddChild = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onAddChild?.(node)
    },
    [node, onAddChild]
  )

  return (
    <div className="w-full" data-testid={`goal-node-${node.id}`}>
      {/* Goal Card */}
      <div
        className={cn(
          'group rounded-xl border-2 transition-all duration-200 cursor-pointer',
          // Distinct goal styling - gradient background with border
          isRootGoal
            ? 'bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-blue-950/40 dark:via-gray-900 dark:to-indigo-950/40'
            : 'bg-gradient-to-br from-blue-50/80 to-white dark:from-blue-950/30 dark:to-gray-900',
          // Border styling
          'border-blue-200 dark:border-blue-800',
          // Hover effect
          'hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md',
          // Selected state
          isSelected && 'ring-2 ring-primary ring-offset-2 border-blue-500 dark:border-blue-400',
          // Completed state (all tasks done)
          progress === 100 && 'border-green-300 dark:border-green-700'
        )}
        style={{ marginLeft: depth * 24 }}
        onClick={handleSelect}
        role="treeitem"
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-selected={isSelected}
        data-testid={`goal-row-${node.id}`}
      >
        {/* Goal Header */}
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Expand/Collapse Button */}
          <button
            type="button"
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-md transition-colors',
              'hover:bg-blue-100 dark:hover:bg-blue-900/50',
              !hasChildren && 'invisible'
            )}
            onClick={handleToggleExpand}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
            data-testid={`goal-expand-button-${node.id}`}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            )}
          </button>

          {/* Goal Icon */}
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg',
              progress === 100
                ? 'bg-green-100 dark:bg-green-900/50'
                : 'bg-blue-100 dark:bg-blue-900/50'
            )}
            data-testid={`goal-icon-${node.id}`}
          >
            {progress === 100 ? (
              <Sparkles className="h-4 w-4 text-green-600 dark:text-green-400" />
            ) : (
              <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            )}
          </div>

          {/* Goal Title and Info */}
          <div className="flex-1 min-w-0">
            <h3
              className={cn(
                'font-semibold truncate',
                isRootGoal ? 'text-base' : 'text-sm',
                progress === 100 && 'text-green-700 dark:text-green-400'
              )}
              data-testid={`goal-title-${node.id}`}
            >
              {node.title}
            </h3>
            {node.description && (
              <p
                className="text-xs text-muted-foreground truncate mt-0.5"
                data-testid={`goal-description-${node.id}`}
              >
                {node.description}
              </p>
            )}
          </div>

          {/* Task Count Badge */}
          {taskCount > 0 && (
            <span
              className={cn(
                'flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium',
                progress === 100
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400'
              )}
              data-testid={`goal-task-count-${node.id}`}
            >
              {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
            </span>
          )}

          {/* Actions (visible on hover) */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={handleAddChild}
              aria-label="Add child node"
              data-testid={`goal-add-child-button-${node.id}`}
              className="hover:bg-blue-100 dark:hover:bg-blue-900/50"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Progress Bar Section */}
        {(hasChildren || taskCount > 0) && (
          <div
            className="px-4 pb-3 pt-1"
            data-testid={`goal-progress-section-${node.id}`}
          >
            {/* Progress Label */}
            <div className="flex items-center justify-between mb-1.5">
              <span
                className="text-xs font-medium text-muted-foreground"
                data-testid={`goal-progress-status-${node.id}`}
              >
                {progressStatus}
              </span>
              <span
                className={cn(
                  'text-xs font-semibold',
                  progress === 100
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-blue-600 dark:text-blue-400'
                )}
                data-testid={`goal-progress-percent-${node.id}`}
              >
                {progress}%
              </span>
            </div>

            {/* Progress Bar */}
            <div
              className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden"
              data-testid={`goal-progress-track-${node.id}`}
            >
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500 ease-out',
                  progressColor
                )}
                style={{ width: `${progress}%` }}
                data-testid={`goal-progress-bar-${node.id}`}
              />
            </div>
          </div>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div
          className="mt-2 space-y-2"
          role="group"
          aria-label={`Children of ${node.title}`}
          data-testid={`goal-children-container-${node.id}`}
        >
          {node.children.map((child) => {
            // Use GoalNode for goal children, NodeItem for others
            if (child.nodeType === 'goal') {
              return (
                <GoalNode
                  key={`goal-${child.id}`}
                  node={child}
                  depth={depth + 1}
                  defaultExpanded={defaultExpanded}
                  onToggleTask={onToggleTask}
                  onSelect={onSelect}
                  onAddChild={onAddChild}
                  onDelete={onDelete}
                  selectedNodeId={selectedNodeId}
                />
              )
            }
            return (
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
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

export default GoalNode
