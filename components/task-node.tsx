'use client'

import { useCallback } from 'react'
import {
  CheckSquare,
  Square,
  Repeat,
  Calendar,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TreeNodeWithChildren } from '@/lib/goal-store'
import type { TaskFrequency } from '@/src/db'

/**
 * Props for the TaskNode component
 */
export interface TaskNodeProps {
  /** The task node to render */
  node: TreeNodeWithChildren
  /** Depth level for indentation (default: 0) */
  depth?: number
  /** Callback when task completion is toggled */
  onToggleTask?: (id: number, isCompleted: boolean) => void
  /** Callback when the task is selected */
  onSelect?: (node: TreeNodeWithChildren) => void
  /** Currently selected node id */
  selectedNodeId?: number | null
}

/**
 * Frequency configuration for display
 */
const FREQUENCY_CONFIG = {
  daily: {
    icon: Repeat,
    label: 'Daily',
    bgColor: 'bg-violet-100 dark:bg-violet-900/40',
    textColor: 'text-violet-700 dark:text-violet-300',
    iconColor: 'text-violet-500',
  },
  weekly: {
    icon: Repeat,
    label: 'Weekly',
    bgColor: 'bg-blue-100 dark:bg-blue-900/40',
    textColor: 'text-blue-700 dark:text-blue-300',
    iconColor: 'text-blue-500',
  },
  custom: {
    icon: Clock,
    label: 'Custom',
    bgColor: 'bg-amber-100 dark:bg-amber-900/40',
    textColor: 'text-amber-700 dark:text-amber-300',
    iconColor: 'text-amber-500',
  },
  once: {
    icon: Calendar,
    label: 'One-time',
    bgColor: 'bg-gray-100 dark:bg-gray-800/60',
    textColor: 'text-gray-600 dark:text-gray-400',
    iconColor: 'text-gray-400',
  },
} as const

/**
 * Format weekly days for display
 */
function formatWeeklyDays(weeklyDays?: number[]): string | null {
  if (!weeklyDays || weeklyDays.length === 0) return null

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const sorted = [...weeklyDays].sort((a, b) => a - b)

  if (sorted.length === 7) return 'Every day'
  if (sorted.length === 5 && !sorted.includes(0) && !sorted.includes(6)) {
    return 'Weekdays'
  }
  if (sorted.length === 2 && sorted.includes(0) && sorted.includes(6)) {
    return 'Weekends'
  }

  return sorted.map((d) => dayNames[d]).join(', ')
}

/**
 * TaskNode Component - A distinct visual variant for task nodes
 *
 * This component provides enhanced visual styling specifically for tasks,
 * featuring a prominent checkbox for completion status and a frequency badge
 * for recurring tasks.
 */
export function TaskNode({
  node,
  depth = 0,
  onToggleTask,
  onSelect,
  selectedNodeId,
}: TaskNodeProps) {
  const isSelected = selectedNodeId === node.id

  // Task-specific properties
  const isCompleted = (node as TreeNodeWithChildren & { isCompleted?: boolean }).isCompleted ?? false
  const frequency: TaskFrequency = (node as TreeNodeWithChildren & { frequency?: TaskFrequency }).frequency ?? 'once'
  const weeklyDays = (node as TreeNodeWithChildren & { weeklyDays?: number[] }).weeklyDays
  const scheduledDate = (node as TreeNodeWithChildren & { scheduledDate?: Date | null }).scheduledDate
  const measurement = (node as TreeNodeWithChildren & { measurement?: string }).measurement

  const frequencyConfig = FREQUENCY_CONFIG[frequency]
  const FrequencyIcon = frequencyConfig.icon
  const weeklyDaysDisplay = frequency === 'weekly' ? formatWeeklyDays(weeklyDays) : null

  const handleSelect = useCallback(() => {
    onSelect?.(node)
  }, [node, onSelect])

  const handleToggleTask = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (node.id !== undefined) {
        onToggleTask?.(node.id, !isCompleted)
      }
    },
    [node.id, isCompleted, onToggleTask]
  )

  return (
    <div className="w-full" data-testid={`task-node-${node.id}`}>
      {/* Task Card */}
      <div
        className={cn(
          'group flex items-center gap-3 rounded-lg border px-4 py-3 transition-all duration-200 cursor-pointer',
          // Base styling
          'bg-gradient-to-r from-green-50/80 to-white dark:from-green-950/30 dark:to-gray-900',
          'border-green-200 dark:border-green-800',
          // Hover effect
          'hover:border-green-400 dark:hover:border-green-600 hover:shadow-sm',
          // Selected state
          isSelected && 'ring-2 ring-primary ring-offset-1 border-green-500 dark:border-green-400',
          // Completed state
          isCompleted && 'opacity-75 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-900 border-gray-200 dark:border-gray-700'
        )}
        style={{ marginLeft: depth * 24 }}
        onClick={handleSelect}
        role="treeitem"
        aria-selected={isSelected}
        data-testid={`task-row-${node.id}`}
      >
        {/* Checkbox */}
        <button
          type="button"
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded-md transition-all duration-200',
            'hover:scale-110',
            isCompleted
              ? 'bg-green-500 text-white hover:bg-green-600'
              : 'border-2 border-green-300 dark:border-green-600 hover:border-green-500 dark:hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/30'
          )}
          onClick={handleToggleTask}
          aria-label={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
          data-testid={`task-checkbox-${node.id}`}
        >
          {isCompleted ? (
            <CheckSquare className="h-4 w-4" />
          ) : (
            <Square className="h-4 w-4 text-green-400 dark:text-green-500" />
          )}
        </button>

        {/* Task Content */}
        <div className="flex-1 min-w-0">
          <span
            className={cn(
              'block text-sm font-medium truncate',
              isCompleted && 'line-through text-muted-foreground'
            )}
            data-testid={`task-title-${node.id}`}
          >
            {node.title}
          </span>
          {/* Description or measurement (optional) */}
          {(node.description || measurement) && (
            <span
              className="block text-xs text-muted-foreground truncate mt-0.5"
              data-testid={`task-description-${node.id}`}
            >
              {measurement || node.description}
            </span>
          )}
        </div>

        {/* Frequency Badge */}
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
              frequencyConfig.bgColor,
              frequencyConfig.textColor
            )}
            data-testid={`task-frequency-badge-${node.id}`}
          >
            <FrequencyIcon className={cn('h-3 w-3', frequencyConfig.iconColor)} />
            {frequencyConfig.label}
          </span>

          {/* Weekly days indicator */}
          {weeklyDaysDisplay && (
            <span
              className="text-xs text-muted-foreground hidden sm:inline"
              data-testid={`task-weekly-days-${node.id}`}
            >
              ({weeklyDaysDisplay})
            </span>
          )}

          {/* Scheduled date for one-time tasks */}
          {frequency === 'once' && scheduledDate && (
            <span
              className="text-xs text-muted-foreground hidden sm:inline"
              data-testid={`task-scheduled-date-${node.id}`}
            >
              {new Date(scheduledDate).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default TaskNode
