import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import {
  SuggestionCard,
  parseSuggestionFromText,
  type SuggestedNode,
} from '@/components/suggestion-card'

// Helper to create a simple suggestion
function createSimpleSuggestion(
  overrides: Partial<SuggestedNode> = {}
): SuggestedNode {
  return {
    type: 'goal',
    title: 'Test Goal',
    ...overrides,
  }
}

// Helper to create a complex suggestion tree
function createComplexSuggestion(): SuggestedNode {
  return {
    type: 'goal',
    title: 'Learn Spanish',
    description: 'Become conversational in Spanish within 6 months',
    children: [
      {
        type: 'requirement',
        title: 'Available time: 2 hours/day',
      },
      {
        type: 'milestone',
        title: 'Complete Beginner Course',
        description: 'Finish Duolingo beginner track',
        children: [
          {
            type: 'task',
            title: 'Practice vocabulary',
            frequency: 'daily',
          },
          {
            type: 'task',
            title: 'Complete lesson modules',
            frequency: 'daily',
          },
        ],
      },
      {
        type: 'task',
        title: 'Watch Spanish movies',
        description: 'With subtitles for immersion',
        frequency: 'weekly',
      },
    ],
  }
}

describe('SuggestionCard', () => {
  describe('rendering', () => {
    it('renders the suggestion card with title', () => {
      const suggestion = createSimpleSuggestion()
      render(<SuggestionCard suggestion={suggestion} />)

      expect(screen.getByTestId('suggestion-card')).toBeInTheDocument()
      expect(screen.getByTestId('suggestion-card-title')).toHaveTextContent(
        'AI Suggestion'
      )
    })

    it('renders the correct item count for single item', () => {
      const suggestion = createSimpleSuggestion()
      render(<SuggestionCard suggestion={suggestion} />)

      expect(screen.getByTestId('suggestion-card-description')).toHaveTextContent(
        '1 item suggested'
      )
    })

    it('renders the correct item count for multiple items', () => {
      const suggestion = createComplexSuggestion()
      render(<SuggestionCard suggestion={suggestion} />)

      // Should count: 1 goal + 1 requirement + 1 milestone + 2 tasks + 1 task = 6 items
      expect(screen.getByTestId('suggestion-card-description')).toHaveTextContent(
        '6 items suggested'
      )
    })

    it('renders the suggestion preview container', () => {
      const suggestion = createSimpleSuggestion()
      render(<SuggestionCard suggestion={suggestion} />)

      expect(screen.getByTestId('suggestion-preview')).toBeInTheDocument()
    })

    it('renders apply and dismiss buttons', () => {
      const suggestion = createSimpleSuggestion()
      render(<SuggestionCard suggestion={suggestion} />)

      expect(screen.getByTestId('suggestion-apply-button')).toBeInTheDocument()
      expect(screen.getByTestId('suggestion-dismiss-button')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      const suggestion = createSimpleSuggestion()
      render(<SuggestionCard suggestion={suggestion} className="custom-class" />)

      expect(screen.getByTestId('suggestion-card')).toHaveClass('custom-class')
    })
  })

  describe('suggestion node rendering', () => {
    it('renders a goal node with correct styling', () => {
      const suggestion = createSimpleSuggestion({ type: 'goal', title: 'My Goal' })
      render(<SuggestionCard suggestion={suggestion} />)

      expect(screen.getByTestId('suggestion-node-goal-0')).toBeInTheDocument()
      expect(screen.getByTestId('suggestion-node-title-goal-0')).toHaveTextContent(
        'My Goal'
      )
      expect(screen.getByTestId('suggestion-node-type-badge-goal-0')).toHaveTextContent(
        'Goal'
      )
    })

    it('renders a milestone node with correct styling', () => {
      const suggestion = createSimpleSuggestion({
        type: 'milestone',
        title: 'My Milestone',
      })
      render(<SuggestionCard suggestion={suggestion} />)

      expect(screen.getByTestId('suggestion-node-milestone-0')).toBeInTheDocument()
      expect(
        screen.getByTestId('suggestion-node-type-badge-milestone-0')
      ).toHaveTextContent('Milestone')
    })

    it('renders a task node with correct styling', () => {
      const suggestion = createSimpleSuggestion({ type: 'task', title: 'My Task' })
      render(<SuggestionCard suggestion={suggestion} />)

      expect(screen.getByTestId('suggestion-node-task-0')).toBeInTheDocument()
      expect(screen.getByTestId('suggestion-node-type-badge-task-0')).toHaveTextContent(
        'Task'
      )
    })

    it('renders a requirement node with correct styling', () => {
      const suggestion = createSimpleSuggestion({
        type: 'requirement',
        title: 'My Requirement',
      })
      render(<SuggestionCard suggestion={suggestion} />)

      expect(screen.getByTestId('suggestion-node-requirement-0')).toBeInTheDocument()
      expect(
        screen.getByTestId('suggestion-node-type-badge-requirement-0')
      ).toHaveTextContent('Requirement')
    })

    it('renders node description when provided', () => {
      const suggestion = createSimpleSuggestion({
        description: 'This is a detailed description',
      })
      render(<SuggestionCard suggestion={suggestion} />)

      expect(screen.getByTestId('suggestion-node-description-goal-0')).toHaveTextContent(
        'This is a detailed description'
      )
    })

    it('does not render description when not provided', () => {
      const suggestion = createSimpleSuggestion()
      render(<SuggestionCard suggestion={suggestion} />)

      expect(
        screen.queryByTestId('suggestion-node-description-goal-0')
      ).not.toBeInTheDocument()
    })

    it('renders frequency badge for recurring tasks', () => {
      const suggestion = createSimpleSuggestion({
        type: 'task',
        title: 'Daily Task',
        frequency: 'daily',
      })
      render(<SuggestionCard suggestion={suggestion} />)

      expect(screen.getByTestId('suggestion-node-frequency-task-0')).toHaveTextContent(
        'daily'
      )
    })

    it('does not render frequency badge for one-time tasks', () => {
      const suggestion = createSimpleSuggestion({
        type: 'task',
        title: 'One-time Task',
        frequency: 'once',
      })
      render(<SuggestionCard suggestion={suggestion} />)

      expect(
        screen.queryByTestId('suggestion-node-frequency-task-0')
      ).not.toBeInTheDocument()
    })

    it('renders nested children correctly', () => {
      const suggestion = createComplexSuggestion()
      render(<SuggestionCard suggestion={suggestion} />)

      // Root goal at depth 0
      expect(screen.getByTestId('suggestion-node-goal-0')).toBeInTheDocument()

      // Requirement at depth 1
      expect(screen.getByTestId('suggestion-node-requirement-1')).toBeInTheDocument()

      // Milestone at depth 1
      expect(screen.getByTestId('suggestion-node-milestone-1')).toBeInTheDocument()

      // Tasks at depth 2 (under milestone)
      expect(screen.getAllByTestId(/suggestion-node-task-2/)).toHaveLength(2)
    })
  })

  describe('expand/collapse', () => {
    it('shows expand button when node has children', () => {
      const suggestion: SuggestedNode = {
        type: 'goal',
        title: 'Parent Goal',
        children: [{ type: 'task', title: 'Child Task' }],
      }
      render(<SuggestionCard suggestion={suggestion} />)

      const expandButton = screen.getByTestId('suggestion-node-expand-goal-0')
      expect(expandButton).toBeVisible()
      expect(expandButton).not.toHaveClass('invisible')
    })

    it('hides expand button when node has no children', () => {
      const suggestion = createSimpleSuggestion()
      render(<SuggestionCard suggestion={suggestion} />)

      const expandButton = screen.getByTestId('suggestion-node-expand-goal-0')
      expect(expandButton).toHaveClass('invisible')
    })

    it('collapses children when expand button is clicked', () => {
      const suggestion: SuggestedNode = {
        type: 'goal',
        title: 'Parent Goal',
        children: [{ type: 'task', title: 'Child Task' }],
      }
      render(<SuggestionCard suggestion={suggestion} />)

      // Children should be visible initially
      expect(screen.getByTestId('suggestion-node-task-1')).toBeInTheDocument()

      // Click to collapse
      fireEvent.click(screen.getByTestId('suggestion-node-expand-goal-0'))

      // Children should be hidden
      expect(screen.queryByTestId('suggestion-node-task-1')).not.toBeInTheDocument()
    })

    it('expands children when expand button is clicked again', () => {
      const suggestion: SuggestedNode = {
        type: 'goal',
        title: 'Parent Goal',
        children: [{ type: 'task', title: 'Child Task' }],
      }
      render(<SuggestionCard suggestion={suggestion} />)

      // Collapse
      fireEvent.click(screen.getByTestId('suggestion-node-expand-goal-0'))
      expect(screen.queryByTestId('suggestion-node-task-1')).not.toBeInTheDocument()

      // Expand again
      fireEvent.click(screen.getByTestId('suggestion-node-expand-goal-0'))
      expect(screen.getByTestId('suggestion-node-task-1')).toBeInTheDocument()
    })
  })

  describe('callbacks', () => {
    it('calls onApply when apply button is clicked', async () => {
      const onApply = vi.fn()
      const suggestion = createSimpleSuggestion()
      render(<SuggestionCard suggestion={suggestion} onApply={onApply} />)

      fireEvent.click(screen.getByTestId('suggestion-apply-button'))

      await waitFor(() => {
        expect(onApply).toHaveBeenCalledWith(suggestion)
      })
    })

    it('calls onApply with full suggestion including children', async () => {
      const onApply = vi.fn()
      const suggestion = createComplexSuggestion()
      render(<SuggestionCard suggestion={suggestion} onApply={onApply} />)

      fireEvent.click(screen.getByTestId('suggestion-apply-button'))

      await waitFor(() => {
        expect(onApply).toHaveBeenCalledWith(suggestion)
      })
    })

    it('calls onDismiss when dismiss button is clicked', () => {
      const onDismiss = vi.fn()
      const suggestion = createSimpleSuggestion()
      render(<SuggestionCard suggestion={suggestion} onDismiss={onDismiss} />)

      fireEvent.click(screen.getByTestId('suggestion-dismiss-button'))

      expect(onDismiss).toHaveBeenCalled()
    })

    it('handles async onApply callback', async () => {
      const onApply = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100))
      })
      const suggestion = createSimpleSuggestion()
      render(<SuggestionCard suggestion={suggestion} onApply={onApply} />)

      fireEvent.click(screen.getByTestId('suggestion-apply-button'))

      await waitFor(() => {
        expect(onApply).toHaveBeenCalled()
      })
    })
  })

  describe('loading state', () => {
    it('shows loading state when isApplying is true', () => {
      const suggestion = createSimpleSuggestion()
      render(<SuggestionCard suggestion={suggestion} isApplying={true} />)

      expect(screen.getByTestId('suggestion-apply-button')).toHaveTextContent(
        'Applying...'
      )
    })

    it('disables apply button when isApplying is true', () => {
      const suggestion = createSimpleSuggestion()
      render(<SuggestionCard suggestion={suggestion} isApplying={true} />)

      expect(screen.getByTestId('suggestion-apply-button')).toBeDisabled()
    })

    it('disables dismiss button when isApplying is true', () => {
      const suggestion = createSimpleSuggestion()
      render(<SuggestionCard suggestion={suggestion} isApplying={true} />)

      expect(screen.getByTestId('suggestion-dismiss-button')).toBeDisabled()
    })

    it('shows normal state when isApplying is false', () => {
      const suggestion = createSimpleSuggestion()
      render(<SuggestionCard suggestion={suggestion} isApplying={false} />)

      expect(screen.getByTestId('suggestion-apply-button')).toHaveTextContent('Apply')
      expect(screen.getByTestId('suggestion-apply-button')).not.toBeDisabled()
    })
  })

  describe('accessibility', () => {
    it('has correct aria-label for expand button', () => {
      const suggestion: SuggestedNode = {
        type: 'goal',
        title: 'Goal with children',
        children: [{ type: 'task', title: 'Child Task' }],
      }
      render(<SuggestionCard suggestion={suggestion} />)

      const expandButton = screen.getByTestId('suggestion-node-expand-goal-0')
      expect(expandButton).toHaveAttribute('aria-label', 'Collapse')
    })

    it('updates aria-label when collapsed', () => {
      const suggestion: SuggestedNode = {
        type: 'goal',
        title: 'Goal with children',
        children: [{ type: 'task', title: 'Child Task' }],
      }
      render(<SuggestionCard suggestion={suggestion} />)

      const expandButton = screen.getByTestId('suggestion-node-expand-goal-0')
      fireEvent.click(expandButton)

      expect(expandButton).toHaveAttribute('aria-label', 'Expand')
    })
  })
})

describe('parseSuggestionFromText', () => {
  describe('valid JSON parsing', () => {
    it('parses a simple valid suggestion', () => {
      const text = JSON.stringify({
        type: 'goal',
        title: 'Test Goal',
      })

      const result = parseSuggestionFromText(text)

      expect(result).toEqual({
        type: 'goal',
        title: 'Test Goal',
      })
    })

    it('parses suggestion with description', () => {
      const text = JSON.stringify({
        type: 'goal',
        title: 'Test Goal',
        description: 'A test description',
      })

      const result = parseSuggestionFromText(text)

      expect(result?.description).toBe('A test description')
    })

    it('parses suggestion with children', () => {
      const text = JSON.stringify({
        type: 'goal',
        title: 'Parent Goal',
        children: [
          { type: 'task', title: 'Child Task' },
          { type: 'milestone', title: 'Child Milestone' },
        ],
      })

      const result = parseSuggestionFromText(text)

      expect(result?.children).toHaveLength(2)
      expect(result?.children?.[0].title).toBe('Child Task')
    })

    it('parses suggestion with frequency for tasks', () => {
      const text = JSON.stringify({
        type: 'task',
        title: 'Daily Task',
        frequency: 'daily',
      })

      const result = parseSuggestionFromText(text)

      expect(result?.frequency).toBe('daily')
    })

    it('parses JSON embedded in explanatory text', () => {
      const text = `Here's my suggestion for your goal:
      
      {
        "type": "goal",
        "title": "Learn Piano"
      }
      
      This structure will help you...`

      const result = parseSuggestionFromText(text)

      expect(result).toEqual({
        type: 'goal',
        title: 'Learn Piano',
      })
    })

    it('parses all valid node types', () => {
      const types = ['goal', 'requirement', 'milestone', 'task'] as const

      for (const type of types) {
        const text = JSON.stringify({ type, title: `Test ${type}` })
        const result = parseSuggestionFromText(text)
        expect(result?.type).toBe(type)
      }
    })

    it('parses all valid frequencies', () => {
      const frequencies = ['once', 'daily', 'weekly', 'custom'] as const

      for (const frequency of frequencies) {
        const text = JSON.stringify({
          type: 'task',
          title: 'Test Task',
          frequency,
        })
        const result = parseSuggestionFromText(text)
        expect(result?.frequency).toBe(frequency)
      }
    })
  })

  describe('invalid input handling', () => {
    it('returns null for plain text without JSON', () => {
      const text = 'This is just plain text without any JSON'

      const result = parseSuggestionFromText(text)

      expect(result).toBeNull()
    })

    it('returns null for invalid JSON', () => {
      const text = '{ invalid json }'

      const result = parseSuggestionFromText(text)

      expect(result).toBeNull()
    })

    it('returns null for JSON missing type', () => {
      const text = JSON.stringify({ title: 'No type' })

      const result = parseSuggestionFromText(text)

      expect(result).toBeNull()
    })

    it('returns null for JSON missing title', () => {
      const text = JSON.stringify({ type: 'goal' })

      const result = parseSuggestionFromText(text)

      expect(result).toBeNull()
    })

    it('returns null for invalid type', () => {
      const text = JSON.stringify({ type: 'invalid', title: 'Test' })

      const result = parseSuggestionFromText(text)

      expect(result).toBeNull()
    })

    it('returns null for invalid frequency', () => {
      const text = JSON.stringify({
        type: 'task',
        title: 'Test',
        frequency: 'invalid',
      })

      const result = parseSuggestionFromText(text)

      expect(result).toBeNull()
    })

    it('returns null for non-string title', () => {
      const text = JSON.stringify({ type: 'goal', title: 123 })

      const result = parseSuggestionFromText(text)

      expect(result).toBeNull()
    })

    it('returns null for non-string description', () => {
      const text = JSON.stringify({
        type: 'goal',
        title: 'Test',
        description: 123,
      })

      const result = parseSuggestionFromText(text)

      expect(result).toBeNull()
    })

    it('returns null for non-array children', () => {
      const text = JSON.stringify({
        type: 'goal',
        title: 'Test',
        children: 'not an array',
      })

      const result = parseSuggestionFromText(text)

      expect(result).toBeNull()
    })

    it('returns null for invalid children', () => {
      const text = JSON.stringify({
        type: 'goal',
        title: 'Test',
        children: [{ type: 'invalid', title: 'Bad Child' }],
      })

      const result = parseSuggestionFromText(text)

      expect(result).toBeNull()
    })

    it('returns null for empty string', () => {
      const result = parseSuggestionFromText('')

      expect(result).toBeNull()
    })

    it('returns null for null/undefined-like values in JSON', () => {
      const text = JSON.stringify({ type: null, title: 'Test' })

      const result = parseSuggestionFromText(text)

      expect(result).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('handles deeply nested structures', () => {
      const text = JSON.stringify({
        type: 'goal',
        title: 'Root',
        children: [
          {
            type: 'milestone',
            title: 'Level 1',
            children: [
              {
                type: 'task',
                title: 'Level 2',
              },
            ],
          },
        ],
      })

      const result = parseSuggestionFromText(text)

      expect(result?.children?.[0].children?.[0].title).toBe('Level 2')
    })

    it('handles empty children array', () => {
      const text = JSON.stringify({
        type: 'goal',
        title: 'No children',
        children: [],
      })

      const result = parseSuggestionFromText(text)

      expect(result?.children).toEqual([])
    })

    it('handles special characters in title', () => {
      const text = JSON.stringify({
        type: 'goal',
        title: 'Goal with "quotes" and <brackets>',
      })

      const result = parseSuggestionFromText(text)

      expect(result?.title).toBe('Goal with "quotes" and <brackets>')
    })

    it('handles unicode characters', () => {
      const text = JSON.stringify({
        type: 'goal',
        title: 'Learn 日本語 (Japanese)',
      })

      const result = parseSuggestionFromText(text)

      expect(result?.title).toBe('Learn 日本語 (Japanese)')
    })

    it('returns null when multiple JSON objects create ambiguous structure', () => {
      // When multiple JSON objects are present, the regex matches from first { to last }
      // which creates an invalid JSON structure
      const text = `
      First: { "type": "goal", "title": "First" }
      Second: { "type": "goal", "title": "Second" }
      `

      const result = parseSuggestionFromText(text)

      // The greedy regex captures everything, making invalid JSON
      expect(result).toBeNull()
    })

    it('parses JSON when it is the only object in the text', () => {
      const text = `
      Here's my suggestion:
      
      { "type": "goal", "title": "Learn Spanish", "children": [{ "type": "task", "title": "Practice daily" }] }
      
      Let me know if you'd like changes!
      `

      const result = parseSuggestionFromText(text)

      expect(result?.title).toBe('Learn Spanish')
      expect(result?.children?.[0].title).toBe('Practice daily')
    })
  })
})
