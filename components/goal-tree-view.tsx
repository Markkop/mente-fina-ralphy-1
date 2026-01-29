'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  TreePine,
  RefreshCw,
  Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useGoalTree } from '@/lib/hooks'
import { GoalNode } from './goal-node'
import type { TreeNodeWithChildren } from '@/lib/goal-store'

/**
 * Props for the GoalTreeView component
 */
export interface GoalTreeViewProps {
  /** Optional className for the container */
  className?: string
  /** Callback when a node is selected */
  onSelectNode?: (node: TreeNodeWithChildren) => void
  /** Callback when add child is clicked on a node */
  onAddChild?: (parentNode: TreeNodeWithChildren) => void
  /** Callback when delete is clicked on a node */
  onDelete?: (node: TreeNodeWithChildren) => void
  /** Callback when "New Goal" button is clicked to create a root goal */
  onNewGoal?: () => void
  /** Callback when user requests to create a new root-level goal */
  onCreateRootGoal?: () => void
  /** Currently selected node id */
  selectedNodeId?: number | null
  /** Whether to show the toolbar (expand all/collapse all buttons) */
  showToolbar?: boolean
  /** Initial expand state: 'default' follows depth rules, 'expanded' expands all, 'collapsed' collapses all */
  initialExpandState?: 'default' | 'expanded' | 'collapsed'
}

/**
 * GoalTreeView Component - Main container for the goal tree hierarchy
 *
 * This component serves as the primary view for displaying the hierarchical
 * goal tree structure. It handles:
 * - Store initialization and data loading
 * - Global expand/collapse functionality
 * - Loading and error states
 * - Rendering of the tree using GoalNode components
 *
 * @example
 * ```tsx
 * <GoalTreeView
 *   onSelectNode={(node) => setSelectedNode(node)}
 *   showToolbar={true}
 * />
 * ```
 */
export function GoalTreeView({
  className,
  onSelectNode,
  onAddChild,
  onDelete,
  onNewGoal,
  onCreateRootGoal,
  selectedNodeId,
  showToolbar = true,
  initialExpandState = 'default',
}: GoalTreeViewProps) {
  const {
    rootGoals,
    isLoading,
    error,
    isInitialized,
    initialize,
    refresh,
    toggleTaskCompletion,
  } = useGoalTree()

  // Global expand state: undefined means use default behavior, true/false forces all
  const [globalExpanded, setGlobalExpanded] = useState<boolean | undefined>(() => {
    if (initialExpandState === 'expanded') return true
    if (initialExpandState === 'collapsed') return false
    return undefined
  })

  // Track the expand key to force re-render of children when global state changes
  const [expandKey, setExpandKey] = useState(0)

  // Initialize the store on mount
  useEffect(() => {
    if (!isInitialized && !isLoading) {
      initialize()
    }
  }, [isInitialized, isLoading, initialize])

  // Calculate tree statistics
  const treeStats = useMemo(() => {
    let totalGoals = 0
    let totalTasks = 0
    let completedTasks = 0

    function countNodes(nodes: TreeNodeWithChildren[]) {
      for (const node of nodes) {
        if (node.nodeType === 'task') {
          totalTasks++
          if ((node as TreeNodeWithChildren & { isCompleted?: boolean }).isCompleted) {
            completedTasks++
          }
        } else if (node.nodeType === 'goal') {
          totalGoals++
        }
        if (node.children.length > 0) {
          countNodes(node.children)
        }
      }
    }

    countNodes(rootGoals)
    return { totalGoals, totalTasks, completedTasks }
  }, [rootGoals])

  // Handle task toggle
  const handleToggleTask = useCallback(
    async (id: number) => {
      try {
        await toggleTaskCompletion(id)
      } catch (error) {
        console.error('Failed to toggle task:', error)
      }
    },
    [toggleTaskCompletion]
  )

  // Handle expand all
  const handleExpandAll = useCallback(() => {
    setGlobalExpanded(true)
    setExpandKey((prev) => prev + 1)
  }, [])

  // Handle collapse all
  const handleCollapseAll = useCallback(() => {
    setGlobalExpanded(false)
    setExpandKey((prev) => prev + 1)
  }, [])

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    try {
      await refresh()
    } catch (error) {
      console.error('Failed to refresh:', error)
    }
  }, [refresh])

  // Handle create root goal
  const handleCreateRootGoal = useCallback(() => {
    onCreateRootGoal?.()
  }, [onCreateRootGoal])

  // Loading state
  if (isLoading && !isInitialized) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center py-16 text-muted-foreground',
          className
        )}
        data-testid="goal-tree-view-loading"
      >
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p className="text-sm">Loading your goals...</p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center py-16 text-destructive',
          className
        )}
        data-testid="goal-tree-view-error"
      >
        <AlertCircle className="h-8 w-8 mb-4" />
        <p className="text-sm font-medium mb-2">Failed to load goals</p>
        <p className="text-xs text-muted-foreground mb-4">{error}</p>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Try again
        </Button>
      </div>
    )
  }

  // Empty state
  if (rootGoals.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center py-16 text-muted-foreground',
          className
        )}
        data-testid="goal-tree-view-empty"
      >
        <TreePine className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-lg font-medium mb-2">No goals yet</p>
        <p className="text-sm text-center max-w-xs mb-4">
          Start by creating your first goal to begin planning your journey.
        </p>
        {(onNewGoal || onCreateRootGoal) && (
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              onNewGoal?.()
              handleCreateRootGoal()
            }}
            aria-label="Create new goal"
            data-testid="goal-tree-view-empty-new-goal"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Goal
          </Button>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn('w-full', className)}
      data-testid="goal-tree-view"
      role="tree"
      aria-label="Goal tree"
    >
      {/* Toolbar - responsive stacking on mobile */}
      {showToolbar && (
        <div
          className="flex flex-col gap-3 mb-4 pb-3 border-b sm:flex-row sm:items-center sm:justify-between"
          data-testid="goal-tree-view-toolbar"
        >
          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span data-testid="goal-tree-view-stats">
              {treeStats.totalGoals} {treeStats.totalGoals === 1 ? 'goal' : 'goals'}
              {treeStats.totalTasks > 0 && (
                <span className="ml-2">
                  · {treeStats.completedTasks}/{treeStats.totalTasks} tasks done
                </span>
              )}
            </span>
          </div>

          {/* Actions - compact on mobile */}
          <div className="flex items-center gap-1 sm:gap-2">
            {(onNewGoal || onCreateRootGoal) && (
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  onNewGoal?.()
                  handleCreateRootGoal()
                }}
                aria-label="Create new goal"
                data-testid="goal-tree-view-new-goal"
              >
                <Plus className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">New Goal</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExpandAll}
              aria-label="Expand all nodes"
              data-testid="goal-tree-view-expand-all"
            >
              <ChevronDown className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Expand all</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCollapseAll}
              aria-label="Collapse all nodes"
              data-testid="goal-tree-view-collapse-all"
            >
              <ChevronUp className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Collapse all</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isLoading}
              aria-label="Refresh tree"
              data-testid="goal-tree-view-refresh"
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
          </div>
        </div>
      )}

      {/* Tree Content */}
      <div
        className="space-y-3"
        data-testid="goal-tree-view-content"
        key={expandKey}
      >
        {rootGoals.map((rootGoal) => (
          <GoalNode
            key={`goal-${rootGoal.id}`}
            node={rootGoal}
            depth={0}
            defaultExpanded={globalExpanded}
            onToggleTask={handleToggleTask}
            onSelect={onSelectNode}
            onAddChild={onAddChild}
            onDelete={onDelete}
            selectedNodeId={selectedNodeId}
          />
        ))}
      </div>

      {/* Loading overlay when refreshing */}
      {isLoading && isInitialized && (
        <div
          className="fixed inset-0 bg-background/50 flex items-center justify-center z-50"
          data-testid="goal-tree-view-refreshing"
        >
          <div className="flex items-center gap-2 bg-background rounded-lg px-4 py-2 shadow-lg border">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Updating...</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default GoalTreeView
