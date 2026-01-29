import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { Button } from '@/components/ui/button'

describe('Button Accessibility', () => {
  describe('Basic Accessibility', () => {
    it('is focusable by keyboard', async () => {
      const user = userEvent.setup()
      render(<Button>Click me</Button>)
      
      const button = screen.getByRole('button', { name: 'Click me' })
      expect(document.activeElement).not.toBe(button)
      
      await user.tab()
      expect(document.activeElement).toBe(button)
    })

    it('can be activated with Enter key', async () => {
      const user = userEvent.setup()
      const onClick = vi.fn()
      render(<Button onClick={onClick}>Click me</Button>)
      
      const button = screen.getByRole('button', { name: 'Click me' })
      button.focus()
      
      await user.keyboard('{Enter}')
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('can be activated with Space key', async () => {
      const user = userEvent.setup()
      const onClick = vi.fn()
      render(<Button onClick={onClick}>Click me</Button>)
      
      const button = screen.getByRole('button', { name: 'Click me' })
      button.focus()
      
      await user.keyboard(' ')
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('cannot be activated when disabled', async () => {
      const user = userEvent.setup()
      const onClick = vi.fn()
      render(<Button onClick={onClick} disabled>Click me</Button>)
      
      const button = screen.getByRole('button', { name: 'Click me' })
      
      await user.click(button)
      expect(onClick).not.toHaveBeenCalled()
    })

    it('has correct disabled state for screen readers', () => {
      render(<Button disabled>Disabled Button</Button>)
      
      const button = screen.getByRole('button', { name: 'Disabled Button' })
      expect(button).toBeDisabled()
      expect(button).toHaveAttribute('disabled')
    })
  })

  describe('Type Attribute', () => {
    it('defaults to type="button" to prevent accidental form submissions', () => {
      render(<Button>Click me</Button>)
      
      const button = screen.getByRole('button', { name: 'Click me' })
      expect(button).toHaveAttribute('type', 'button')
    })

    it('allows type="submit" for form submissions', () => {
      render(<Button type="submit">Submit</Button>)
      
      const button = screen.getByRole('button', { name: 'Submit' })
      expect(button).toHaveAttribute('type', 'submit')
    })

    it('allows type="reset" for form reset', () => {
      render(<Button type="reset">Reset</Button>)
      
      const button = screen.getByRole('button', { name: 'Reset' })
      expect(button).toHaveAttribute('type', 'reset')
    })
  })

  describe('ARIA Labels', () => {
    it('uses visible text as accessible name by default', () => {
      render(<Button>Save Changes</Button>)
      
      expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument()
    })

    it('supports aria-label for icon-only buttons', () => {
      render(
        <Button aria-label="Delete item" size="icon">
          <svg data-testid="delete-icon" />
        </Button>
      )
      
      expect(screen.getByRole('button', { name: 'Delete item' })).toBeInTheDocument()
    })

    it('aria-label overrides visible text when provided', () => {
      render(
        <Button aria-label="Close dialog">
          X
        </Button>
      )
      
      expect(screen.getByRole('button', { name: 'Close dialog' })).toBeInTheDocument()
    })

    it('supports aria-describedby for additional context', () => {
      render(
        <>
          <Button aria-describedby="hint">Submit</Button>
          <span id="hint">This will save your changes permanently</span>
        </>
      )
      
      const button = screen.getByRole('button', { name: 'Submit' })
      expect(button).toHaveAttribute('aria-describedby', 'hint')
    })
  })

  describe('Focus Visibility', () => {
    it('has focus-visible styles defined', () => {
      render(<Button>Focusable</Button>)
      
      const button = screen.getByRole('button', { name: 'Focusable' })
      // Check that the button has focus-visible classes in its className
      expect(button.className).toContain('focus-visible:ring')
    })
  })

  describe('Keyboard Navigation in Button Groups', () => {
    it('buttons can be navigated with Tab key', async () => {
      const user = userEvent.setup()
      render(
        <div>
          <Button>First</Button>
          <Button>Second</Button>
          <Button>Third</Button>
        </div>
      )
      
      await user.tab()
      expect(screen.getByRole('button', { name: 'First' })).toHaveFocus()
      
      await user.tab()
      expect(screen.getByRole('button', { name: 'Second' })).toHaveFocus()
      
      await user.tab()
      expect(screen.getByRole('button', { name: 'Third' })).toHaveFocus()
    })

    it('disabled buttons are skipped in tab order', async () => {
      const user = userEvent.setup()
      render(
        <div>
          <Button>First</Button>
          <Button disabled>Disabled</Button>
          <Button>Third</Button>
        </div>
      )
      
      await user.tab()
      expect(screen.getByRole('button', { name: 'First' })).toHaveFocus()
      
      await user.tab()
      // Should skip the disabled button and go to Third
      expect(screen.getByRole('button', { name: 'Third' })).toHaveFocus()
    })

    it('shift+tab navigates backwards', async () => {
      const user = userEvent.setup()
      render(
        <div>
          <Button>First</Button>
          <Button>Second</Button>
        </div>
      )
      
      // Focus on second button
      screen.getByRole('button', { name: 'Second' }).focus()
      
      await user.tab({ shift: true })
      expect(screen.getByRole('button', { name: 'First' })).toHaveFocus()
    })
  })

  describe('Button Variants Accessibility', () => {
    it('all variants are accessible via role="button"', () => {
      const { rerender } = render(<Button variant="default">Default</Button>)
      expect(screen.getByRole('button', { name: 'Default' })).toBeInTheDocument()

      rerender(<Button variant="destructive">Destructive</Button>)
      expect(screen.getByRole('button', { name: 'Destructive' })).toBeInTheDocument()

      rerender(<Button variant="outline">Outline</Button>)
      expect(screen.getByRole('button', { name: 'Outline' })).toBeInTheDocument()

      rerender(<Button variant="secondary">Secondary</Button>)
      expect(screen.getByRole('button', { name: 'Secondary' })).toBeInTheDocument()

      rerender(<Button variant="ghost">Ghost</Button>)
      expect(screen.getByRole('button', { name: 'Ghost' })).toBeInTheDocument()

      rerender(<Button variant="link">Link</Button>)
      expect(screen.getByRole('button', { name: 'Link' })).toBeInTheDocument()
    })
  })

  describe('Button Sizes Accessibility', () => {
    it('all sizes are keyboard accessible', async () => {
      const user = userEvent.setup()
      const sizes = ['default', 'sm', 'lg', 'icon', 'icon-sm', 'icon-xs', 'icon-lg', 'xs'] as const
      
      for (const size of sizes) {
        const onClick = vi.fn()
        const { unmount } = render(
          <Button size={size} onClick={onClick} aria-label={`Button ${size}`}>
            {size === 'icon' || size.startsWith('icon-') ? 'X' : `Size ${size}`}
          </Button>
        )
        
        const button = screen.getByRole('button')
        button.focus()
        
        await user.keyboard('{Enter}')
        expect(onClick).toHaveBeenCalledTimes(1)
        
        unmount()
      }
    })
  })

  describe('asChild Prop Accessibility', () => {
    it('asChild renders as different element but maintains accessibility', () => {
      render(
        <Button asChild>
          <a href="/link">Link Button</a>
        </Button>
      )
      
      const link = screen.getByRole('link', { name: 'Link Button' })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', '/link')
    })

    it('asChild does not add type attribute to non-button elements', () => {
      render(
        <Button asChild>
          <a href="/link">Link Button</a>
        </Button>
      )
      
      const link = screen.getByRole('link', { name: 'Link Button' })
      expect(link).not.toHaveAttribute('type')
    })
  })

  describe('Icon Button Accessibility', () => {
    it('icon buttons require aria-label for accessibility', () => {
      render(
        <Button size="icon" aria-label="Settings">
          <svg data-testid="settings-icon" />
        </Button>
      )
      
      const button = screen.getByRole('button', { name: 'Settings' })
      expect(button).toBeInTheDocument()
    })

    it('icon buttons are keyboard navigable', async () => {
      const user = userEvent.setup()
      const onClick = vi.fn()
      
      render(
        <Button size="icon" aria-label="Settings" onClick={onClick}>
          <svg data-testid="settings-icon" />
        </Button>
      )
      
      await user.tab()
      const button = screen.getByRole('button', { name: 'Settings' })
      expect(button).toHaveFocus()
      
      await user.keyboard('{Enter}')
      expect(onClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('Loading State Accessibility', () => {
    it('loading buttons have appropriate aria-label', () => {
      render(
        <Button disabled aria-label="Saving, please wait">
          <span>Saving...</span>
        </Button>
      )
      
      expect(screen.getByRole('button', { name: 'Saving, please wait' })).toBeInTheDocument()
    })

    it('loading state preserves disabled attribute', () => {
      render(
        <Button disabled aria-label="Loading">
          Loading...
        </Button>
      )
      
      const button = screen.getByRole('button', { name: 'Loading' })
      expect(button).toBeDisabled()
    })
  })
})
