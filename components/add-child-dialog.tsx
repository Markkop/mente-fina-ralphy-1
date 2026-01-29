'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  Target,
  Flag,
  Info,
  CheckSquare,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { TreeNodeWithChildren } from '@/lib/goal-store'
import type { TaskFrequency } from '@/src/db'

/**
 * Node type options for the Add Child dialog
 */
type ChildNodeType = 'goal' | 'milestone' | 'requirement' | 'task'

/**
 * Configuration for each node type
 */
const NODE_TYPE_CONFIG: Record<
  ChildNodeType,
  {
    label: string
    description: string
    icon: typeof Target
    color: string
    bgColor: string
  }
> = {
  goal: {
    label: 'Goal',
    description: 'A sub-goal or nested objective',
    icon: Target,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
  },
  milestone: {
    label: 'Milestone',
    description: 'A significant checkpoint',
    icon: Flag,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800',
  },
  requirement: {
    label: 'Requirement',
    description: 'Informational constraint or note',
    icon: Info,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
  },
  task: {
    label: 'Task',
    description: 'An actionable item',
    icon: CheckSquare,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800',
  },
}

/**
 * Frequency options for tasks
 */
const FREQUENCY_OPTIONS: { value: TaskFrequency; label: string }[] = [
  { value: 'once', label: 'One-time' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'custom', label: 'Custom' },
]

/**
 * Props for the AddChildDialog component
 */
export interface AddChildDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void
  /** The parent node to add a child to (null = create root goal) */
  parentNode: TreeNodeWithChildren | null
  /** Callback to add a goal (parentId is optional for root goals) */
  onAddGoal?: (input: { title: string; description?: string; parentId?: number }) => Promise<number>
  /** Callback to add a milestone (parentId is optional for flexibility) */
  onAddMilestone?: (input: { title: string; description?: string; parentId?: number }) => Promise<number>
  /** Callback to add a requirement (parentId is optional for flexibility) */
  onAddRequirement?: (input: { title: string; description?: string; parentId?: number }) => Promise<number>
  /** Callback to add a task (parentId is optional for flexibility) */
  onAddTask?: (input: {
    title: string
    description?: string
    parentId?: number
    frequency: TaskFrequency
    measurement?: string
  }) => Promise<number>
}

/**
 * AddChildDialog Component - Dialog for adding child nodes to the tree
 *
 * This component provides a form for creating new child nodes of any type
 * (Goal, Milestone, Requirement, or Task) under a selected parent node.
 */
export function AddChildDialog({
  open,
  onOpenChange,
  parentNode,
  onAddGoal,
  onAddMilestone,
  onAddRequirement,
  onAddTask,
}: AddChildDialogProps) {
  // Determine if we're adding a root goal (no parent)
  const isRootGoal = parentNode === null

  // Form state - default to 'goal' for root goals, 'task' for children
  const [selectedType, setSelectedType] = useState<ChildNodeType>(isRootGoal ? 'goal' : 'task')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [frequency, setFrequency] = useState<TaskFrequency>('once')
  const [measurement, setMeasurement] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      // Default to 'goal' for root goals, 'task' for children
      setSelectedType(parentNode === null ? 'goal' : 'task')
      setTitle('')
      setDescription('')
      setFrequency('once')
      setMeasurement('')
      setError(null)
    }
  }, [open, parentNode])

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      // For non-root goals, require a parent node
      if (!isRootGoal && !parentNode?.id) {
        setError('No parent node selected')
        return
      }

      // Only allow goals at root level
      if (isRootGoal && selectedType !== 'goal') {
        setError('Only goals can be created at root level')
        return
      }

      if (!title.trim()) {
        setError('Title is required')
        return
      }

      setIsSubmitting(true)
      setError(null)

      try {
        const baseInput = {
          title: title.trim(),
          description: description.trim() || undefined,
          ...(parentNode?.id ? { parentId: parentNode.id } : {}),
        }

        switch (selectedType) {
          case 'goal':
            await onAddGoal?.(baseInput)
            break
          case 'milestone':
            await onAddMilestone?.(baseInput)
            break
          case 'requirement':
            await onAddRequirement?.(baseInput)
            break
          case 'task':
            await onAddTask?.({
              ...baseInput,
              frequency,
              measurement: measurement.trim() || undefined,
            })
            break
        }

        onOpenChange(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add item')
      } finally {
        setIsSubmitting(false)
      }
    },
    [
      parentNode,
      isRootGoal,
      title,
      description,
      selectedType,
      frequency,
      measurement,
      onAddGoal,
      onAddMilestone,
      onAddRequirement,
      onAddTask,
      onOpenChange,
    ]
  )

  const selectedConfig = NODE_TYPE_CONFIG[selectedType]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="add-child-dialog">
        <DialogHeader>
          <DialogTitle data-testid="add-child-dialog-title">
            {isRootGoal
              ? 'Create New Goal'
              : `Add to "${parentNode?.title || 'Node'}"`}
          </DialogTitle>
          <DialogDescription data-testid="add-child-dialog-description">
            {isRootGoal
              ? 'Create a new top-level goal.'
              : `Create a new item under this ${parentNode?.nodeType || 'node'}.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" data-testid="add-child-form">
          {/* Type Selection - only show goal option for root goals */}
          {!isRootGoal && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <div
                className="grid grid-cols-2 gap-2"
                role="radiogroup"
                aria-label="Select node type"
                data-testid="type-selector"
              >
                {(Object.keys(NODE_TYPE_CONFIG) as ChildNodeType[]).map((type) => {
                  const config = NODE_TYPE_CONFIG[type]
                  const Icon = config.icon
                  const isSelected = selectedType === type

                  return (
                    <button
                      key={type}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      className={cn(
                        'flex items-center gap-2 rounded-lg border p-3 text-left transition-all',
                        'hover:border-primary/50',
                        isSelected
                          ? cn(config.bgColor, 'ring-2 ring-primary ring-offset-1')
                          : 'bg-background border-border'
                      )}
                      onClick={() => setSelectedType(type)}
                      data-testid={`type-option-${type}`}
                    >
                      <Icon className={cn('h-4 w-4', config.color)} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{config.label}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {config.description}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Title Input */}
          <div className="space-y-2">
            <label htmlFor="add-child-title" className="text-sm font-medium">
              Title <span className="text-destructive">*</span>
            </label>
            <Input
              id="add-child-title"
              placeholder={`Enter ${selectedConfig.label.toLowerCase()} title...`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
              autoFocus
              data-testid="title-input"
            />
          </div>

          {/* Description Input */}
          <div className="space-y-2">
            <label htmlFor="add-child-description" className="text-sm font-medium">
              Description
            </label>
            <Input
              id="add-child-description"
              placeholder="Optional description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              data-testid="description-input"
            />
          </div>

          {/* Task-specific fields */}
          {selectedType === 'task' && (
            <>
              {/* Frequency Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Frequency</label>
                <div
                  className="flex flex-wrap gap-2"
                  role="radiogroup"
                  aria-label="Select frequency"
                  data-testid="frequency-selector"
                >
                  {FREQUENCY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={frequency === option.value}
                      className={cn(
                        'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                        frequency === option.value
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      )}
                      onClick={() => setFrequency(option.value)}
                      data-testid={`frequency-option-${option.value}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Measurement Input */}
              <div className="space-y-2">
                <label htmlFor="add-child-measurement" className="text-sm font-medium">
                  Measurement
                </label>
                <Input
                  id="add-child-measurement"
                  placeholder="e.g., 30 minutes, 5 reps..."
                  value={measurement}
                  onChange={(e) => setMeasurement(e.target.value)}
                  disabled={isSubmitting}
                  data-testid="measurement-input"
                />
              </div>
            </>
          )}

          {/* Error Message */}
          {error && (
            <p
              className="text-sm text-destructive"
              role="alert"
              data-testid="add-child-error"
            >
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              aria-label="Cancel adding item"
              data-testid="cancel-button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              aria-label={isSubmitting ? `Adding ${selectedConfig.label}` : `Add ${selectedConfig.label}`}
              data-testid="submit-button"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                `Add ${selectedConfig.label}`
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default AddChildDialog
