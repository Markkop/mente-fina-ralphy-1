import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RequirementNode } from '@/components/requirement-node'
import type { TreeNodeWithChildren } from '@/lib/goal-store'

// Helper to create a mock requirement node
function createMockRequirement(
  overrides: Partial<TreeNodeWithChildren> = {}
): TreeNodeWithChildren {
  return {
    id: 1,
    title: 'Test Requirement',
    nodeType: 'requirement',
    status: 'active',
    type: 'requirement',
    createdAt: new Date(),
    children: [],
    parentId: 1,
    ...overrides,
  }
}

describe('RequirementNode', () => {
  describe('rendering', () => {
    it('renders a requirement with title', () => {
      const requirement = createMockRequirement({ id: 1, title: 'My Requirement' })
      render(<RequirementNode node={requirement} />)

      expect(screen.getByTestId('requirement-title-1')).toHaveTextContent('My Requirement')
    })

    it('renders requirement container', () => {
      const requirement = createMockRequirement({ id: 2 })
      render(<RequirementNode node={requirement} />)

      expect(screen.getByTestId('requirement-node-2')).toBeInTheDocument()
      expect(screen.getByTestId('requirement-row-2')).toBeInTheDocument()
    })

    it('renders info icon', () => {
      const requirement = createMockRequirement({ id: 3 })
      render(<RequirementNode node={requirement} />)

      expect(screen.getByTestId('requirement-icon-3')).toBeInTheDocument()
    })

    it('renders description when provided', () => {
      const requirement = createMockRequirement({
        id: 4,
        title: 'Requirement',
        description: 'Requirement description',
      })
      render(<RequirementNode node={requirement} />)

      expect(screen.getByTestId('requirement-description-4')).toHaveTextContent(
        'Requirement description'
      )
    })

    it('does not render description when not provided', () => {
      const requirement = createMockRequirement({
        id: 5,
        title: 'Requirement without description',
      })
      render(<RequirementNode node={requirement} />)

      expect(screen.queryByTestId('requirement-description-5')).not.toBeInTheDocument()
    })

    it('renders informational badge', () => {
      const requirement = createMockRequirement({ id: 6 })
      render(<RequirementNode node={requirement} />)

      const badge = screen.getByTestId('requirement-badge-6')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveTextContent('Info')
    })
  })

  describe('non-checkable behavior', () => {
    it('does not render a checkbox', () => {
      const requirement = createMockRequirement({ id: 10 })
      render(<RequirementNode node={requirement} />)

      // Ensure no checkbox-related test IDs exist
      expect(screen.queryByTestId('requirement-checkbox-10')).not.toBeInTheDocument()
    })

    it('does not have any toggle functionality', () => {
      const requirement = createMockRequirement({ id: 11 })
      render(<RequirementNode node={requirement} />)

      // The icon container should not be a button
      const iconContainer = screen.getByTestId('requirement-icon-11')
      expect(iconContainer.tagName).not.toBe('BUTTON')
    })
  })

  describe('informational styling', () => {
    it('applies amber background styling', () => {
      const requirement = createMockRequirement({ id: 20 })
      render(<RequirementNode node={requirement} />)

      const row = screen.getByTestId('requirement-row-20')
      expect(row).toHaveClass('border-amber-200')
    })

    it('applies amber styling to icon container', () => {
      const requirement = createMockRequirement({ id: 21 })
      render(<RequirementNode node={requirement} />)

      const iconContainer = screen.getByTestId('requirement-icon-21')
      expect(iconContainer).toHaveClass('bg-amber-100')
    })

    it('applies amber styling to badge', () => {
      const requirement = createMockRequirement({ id: 22 })
      render(<RequirementNode node={requirement} />)

      const badge = screen.getByTestId('requirement-badge-22')
      expect(badge).toHaveClass('bg-amber-100')
      expect(badge).toHaveClass('text-amber-700')
    })
  })

  describe('selection', () => {
    it('calls onSelect when requirement row is clicked', () => {
      const onSelect = vi.fn()
      const requirement = createMockRequirement({ id: 30, title: 'Clickable Requirement' })
      render(<RequirementNode node={requirement} onSelect={onSelect} />)

      fireEvent.click(screen.getByTestId('requirement-row-30'))

      expect(onSelect).toHaveBeenCalledWith(requirement)
    })

    it('applies selected styling when requirement is selected', () => {
      const requirement = createMockRequirement({ id: 31 })
      render(<RequirementNode node={requirement} selectedNodeId={31} />)

      const row = screen.getByTestId('requirement-row-31')
      expect(row).toHaveClass('ring-2')
    })

    it('does not apply selected styling when different node is selected', () => {
      const requirement = createMockRequirement({ id: 32 })
      render(<RequirementNode node={requirement} selectedNodeId={999} />)

      const row = screen.getByTestId('requirement-row-32')
      expect(row).not.toHaveClass('ring-2')
    })

    it('applies correct border when selected', () => {
      const requirement = createMockRequirement({ id: 33 })
      render(<RequirementNode node={requirement} selectedNodeId={33} />)

      const row = screen.getByTestId('requirement-row-33')
      expect(row).toHaveClass('border-amber-500')
    })
  })

  describe('indentation', () => {
    it('applies correct margin based on depth', () => {
      const requirement = createMockRequirement({ id: 40 })
      render(<RequirementNode node={requirement} depth={2} />)

      const row = screen.getByTestId('requirement-row-40')
      expect(row).toHaveStyle({ marginLeft: '48px' }) // 2 * 24 = 48
    })

    it('has no margin at depth 0', () => {
      const requirement = createMockRequirement({ id: 41 })
      render(<RequirementNode node={requirement} depth={0} />)

      const row = screen.getByTestId('requirement-row-41')
      expect(row).toHaveStyle({ marginLeft: '0px' })
    })

    it('applies correct margin at depth 3', () => {
      const requirement = createMockRequirement({ id: 42 })
      render(<RequirementNode node={requirement} depth={3} />)

      const row = screen.getByTestId('requirement-row-42')
      expect(row).toHaveStyle({ marginLeft: '72px' }) // 3 * 24 = 72
    })
  })

  describe('accessibility', () => {
    it('has correct aria attributes for tree item', () => {
      const requirement = createMockRequirement({ id: 50 })
      render(<RequirementNode node={requirement} selectedNodeId={50} />)

      const row = screen.getByTestId('requirement-row-50')
      expect(row).toHaveAttribute('role', 'treeitem')
      expect(row).toHaveAttribute('aria-selected', 'true')
    })

    it('has correct aria-selected when not selected', () => {
      const requirement = createMockRequirement({ id: 51 })
      render(<RequirementNode node={requirement} selectedNodeId={null} />)

      const row = screen.getByTestId('requirement-row-51')
      expect(row).toHaveAttribute('aria-selected', 'false')
    })

    it('is keyboard accessible via click on row', () => {
      const onSelect = vi.fn()
      const requirement = createMockRequirement({ id: 52 })
      render(<RequirementNode node={requirement} onSelect={onSelect} />)

      const row = screen.getByTestId('requirement-row-52')
      expect(row).toHaveAttribute('role', 'treeitem')
    })
  })

  describe('hover interactions', () => {
    it('has hover classes for visual feedback', () => {
      const requirement = createMockRequirement({ id: 60 })
      render(<RequirementNode node={requirement} />)

      const row = screen.getByTestId('requirement-row-60')
      expect(row).toHaveClass('hover:border-amber-400')
      expect(row).toHaveClass('hover:shadow-sm')
    })

    it('has cursor pointer for clickability', () => {
      const requirement = createMockRequirement({ id: 61 })
      render(<RequirementNode node={requirement} />)

      const row = screen.getByTestId('requirement-row-61')
      expect(row).toHaveClass('cursor-pointer')
    })
  })
})
