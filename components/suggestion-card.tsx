'use client'

import { useState, useCallback, useMemo } from 'react'
import {
  ChevronRight,
  ChevronDown,
  Target,
  Flag,
  CheckSquare,
  Info,
  Sparkles,
  Check,
  X,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'

/**
 * Suggested node structure from AI responses
 */
export interface SuggestedNode {
  type: 'goal' | 'requirement' | 'milestone' | 'task'
  title: string
  description?: string
  frequency?: 'once' | 'daily' | 'weekly' | 'custom'
  children?: SuggestedNode[]
}

/**
 * Props for the SuggestionCard component
 */
export interface SuggestionCardProps {
  /** The suggested goal structure from AI */
  suggestion: SuggestedNode
  /** Callback when user accepts the suggestion */
  onApply?: (suggestion: SuggestedNode) => void | Promise<void>
  /** Callback when user dismisses the suggestion */
  onDismiss?: () => void
  /** Whether the apply action is in progress */
  isApplying?: boolean
  /** Optional className for custom styling */
  className?: string
}

/**
 * Render icon for node type
 */
function NodeIcon({ type, className }: { type: SuggestedNode['type']; className?: string }) {
  switch (type) {
    case 'goal':
      return <Target className={className} />
    case 'milestone':
      return <Flag className={className} />
    case 'task':
      return <CheckSquare className={className} />
    case 'requirement':
      return <Info className={className} />
    default:
      return <Target className={className} />
  }
}

/**
 * Get color classes for node type
 */
function getNodeColors(type: SuggestedNode['type']) {
  switch (type) {
    case 'goal':
      return {
        bg: 'bg-blue-100 dark:bg-blue-900/50',
        text: 'text-blue-600 dark:text-blue-400',
        border: 'border-blue-200 dark:border-blue-800',
      }
    case 'milestone':
      return {
        bg: 'bg-amber-100 dark:bg-amber-900/50',
        text: 'text-amber-600 dark:text-amber-400',
        border: 'border-amber-200 dark:border-amber-800',
      }
    case 'task':
      return {
        bg: 'bg-green-100 dark:bg-green-900/50',
        text: 'text-green-600 dark:text-green-400',
        border: 'border-green-200 dark:border-green-800',
      }
    case 'requirement':
      return {
        bg: 'bg-purple-100 dark:bg-purple-900/50',
        text: 'text-purple-600 dark:text-purple-400',
        border: 'border-purple-200 dark:border-purple-800',
      }
    default:
      return {
        bg: 'bg-gray-100 dark:bg-gray-800',
        text: 'text-gray-600 dark:text-gray-400',
        border: 'border-gray-200 dark:border-gray-700',
      }
  }
}

/**
 * Get human-readable node type label
 */
function getNodeTypeLabel(type: SuggestedNode['type']): string {
  switch (type) {
    case 'goal':
      return 'Goal'
    case 'milestone':
      return 'Milestone'
    case 'task':
      return 'Task'
    case 'requirement':
      return 'Requirement'
    default:
      return 'Node'
  }
}

/**
 * Props for the SuggestionNodeItem component
 */
interface SuggestionNodeItemProps {
  node: SuggestedNode
  depth?: number
  defaultExpanded?: boolean
}

/**
 * Count total nodes in a suggestion tree
 */
function countNodes(node: SuggestedNode): number {
  let count = 1
  if (node.children) {
    for (const child of node.children) {
      count += countNodes(child)
    }
  }
  return count
}

/**
 * SuggestionNodeItem - renders a single node in the suggestion preview tree
 */
function SuggestionNodeItem({
  node,
  depth = 0,
  defaultExpanded = true,
}: SuggestionNodeItemProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const hasChildren = node.children && node.children.length > 0
  const colors = getNodeColors(node.type)

  const handleToggleExpand = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded((prev) => !prev)
  }, [])

  return (
    <div
      className="w-full"
      data-testid={`suggestion-node-${node.type}-${depth}`}
    >
      <div
        className={cn(
          'flex items-center gap-2 py-1.5 px-2 rounded-md transition-colors',
          'hover:bg-muted/50'
        )}
        style={{ marginLeft: depth * 16 }}
        data-testid={`suggestion-node-row-${node.type}-${depth}`}
      >
        {/* Expand/Collapse Button */}
        <button
          type="button"
          className={cn(
            'flex h-5 w-5 items-center justify-center rounded transition-colors',
            'hover:bg-muted',
            !hasChildren && 'invisible'
          )}
          onClick={handleToggleExpand}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
          data-testid={`suggestion-node-expand-${node.type}-${depth}`}
        >
          {isExpanded ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          )}
        </button>

        {/* Node Icon */}
        <div
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded',
            colors.bg
          )}
          data-testid={`suggestion-node-icon-${node.type}-${depth}`}
        >
          <NodeIcon type={node.type} className={cn('h-3.5 w-3.5', colors.text)} />
        </div>

        {/* Node Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-medium truncate"
              data-testid={`suggestion-node-title-${node.type}-${depth}`}
            >
              {node.title}
            </span>
            <span
              className={cn(
                'text-xs px-1.5 py-0.5 rounded-full font-medium',
                colors.bg,
                colors.text
              )}
              data-testid={`suggestion-node-type-badge-${node.type}-${depth}`}
            >
              {getNodeTypeLabel(node.type)}
            </span>
            {node.type === 'task' && node.frequency && node.frequency !== 'once' && (
              <span
                className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground"
                data-testid={`suggestion-node-frequency-${node.type}-${depth}`}
              >
                {node.frequency}
              </span>
            )}
          </div>
          {node.description && (
            <p
              className="text-xs text-muted-foreground truncate mt-0.5"
              data-testid={`suggestion-node-description-${node.type}-${depth}`}
            >
              {node.description}
            </p>
          )}
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div
          className="mt-0.5"
          data-testid={`suggestion-node-children-${node.type}-${depth}`}
        >
          {node.children!.map((child, index) => (
            <SuggestionNodeItem
              key={`${child.type}-${child.title}-${index}`}
              node={child}
              depth={depth + 1}
              defaultExpanded={defaultExpanded}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * SuggestionCard Component - Displays AI-proposed goal structures
 *
 * This component renders a preview of suggested goal structures from the AI
 * and allows users to apply or dismiss the suggestion.
 *
 * Features:
 * - Visual tree preview of the suggested structure
 * - Different styling for each node type (goal, milestone, task, requirement)
 * - Expandable/collapsible nodes in the preview
 * - Apply and Dismiss actions
 * - Loading state during apply
 *
 * @example
 * ```tsx
 * const suggestion = {
 *   type: 'goal',
 *   title: 'Learn Spanish',
 *   children: [
 *     { type: 'milestone', title: 'Complete beginner course' },
 *     { type: 'task', title: 'Practice 30 min daily', frequency: 'daily' },
 *   ]
 * }
 *
 * <SuggestionCard
 *   suggestion={suggestion}
 *   onApply={handleApply}
 *   onDismiss={handleDismiss}
 * />
 * ```
 */
export function SuggestionCard({
  suggestion,
  onApply,
  onDismiss,
  isApplying = false,
  className,
}: SuggestionCardProps) {
  const totalNodes = useMemo(() => countNodes(suggestion), [suggestion])

  const handleApply = useCallback(async () => {
    if (onApply) {
      await onApply(suggestion)
    }
  }, [onApply, suggestion])

  return (
    <Card
      className={cn(
        'border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent',
        className
      )}
      data-testid="suggestion-card"
    >
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base" data-testid="suggestion-card-title">
              AI Suggestion
            </CardTitle>
            <CardDescription data-testid="suggestion-card-description">
              {totalNodes} {totalNodes === 1 ? 'item' : 'items'} suggested
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <div
          className="rounded-lg border bg-card p-2 max-h-64 overflow-y-auto"
          data-testid="suggestion-preview"
        >
          <SuggestionNodeItem node={suggestion} />
        </div>
      </CardContent>

      <CardFooter className="gap-2 pt-0">
        <Button
          variant="default"
          size="sm"
          onClick={handleApply}
          disabled={isApplying}
          className="flex-1"
          aria-label={isApplying ? 'Applying suggestion' : 'Apply AI suggestion'}
          data-testid="suggestion-apply-button"
        >
          {isApplying ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Applying...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Apply
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onDismiss}
          disabled={isApplying}
          className="flex-1"
          aria-label="Dismiss AI suggestion"
          data-testid="suggestion-dismiss-button"
        >
          <X className="h-4 w-4 mr-2" />
          Dismiss
        </Button>
      </CardFooter>
    </Card>
  )
}

/**
 * Parses a JSON string from AI response to extract suggestion structure
 * Returns null if parsing fails or structure is invalid
 */
export function parseSuggestionFromText(text: string): SuggestedNode | null {
  try {
    // Try to find JSON in the text (AI might include explanatory text around it)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return null
    }

    const parsed = JSON.parse(jsonMatch[0])
    
    // Validate the structure
    if (!isValidSuggestion(parsed)) {
      return null
    }

    return parsed as SuggestedNode
  } catch {
    return null
  }
}

/**
 * Validates that a parsed object matches the SuggestedNode structure
 */
function isValidSuggestion(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') {
    return false
  }

  const node = obj as Record<string, unknown>

  // Must have type and title
  if (!node.type || !node.title) {
    return false
  }

  // Type must be valid
  const validTypes = ['goal', 'requirement', 'milestone', 'task']
  if (!validTypes.includes(node.type as string)) {
    return false
  }

  // Title must be a string
  if (typeof node.title !== 'string') {
    return false
  }

  // Description, if present, must be a string
  if (node.description !== undefined && typeof node.description !== 'string') {
    return false
  }

  // Frequency, if present, must be valid
  if (node.frequency !== undefined) {
    const validFrequencies = ['once', 'daily', 'weekly', 'custom']
    if (!validFrequencies.includes(node.frequency as string)) {
      return false
    }
  }

  // Children, if present, must be an array of valid suggestions
  if (node.children !== undefined) {
    if (!Array.isArray(node.children)) {
      return false
    }
    for (const child of node.children) {
      if (!isValidSuggestion(child)) {
        return false
      }
    }
  }

  return true
}

export default SuggestionCard
