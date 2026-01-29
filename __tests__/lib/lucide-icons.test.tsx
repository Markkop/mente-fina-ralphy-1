import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  Home,
  Settings,
  User,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Edit,
  Check,
  X,
  Target,
  Flag,
  Calendar,
  CheckSquare,
  type LucideIcon,
} from 'lucide-react'

describe('lucide-react icons', () => {
  it('renders Home icon', () => {
    render(<Home data-testid="home-icon" />)
    expect(screen.getByTestId('home-icon')).toBeInTheDocument()
  })

  it('renders Settings icon', () => {
    render(<Settings data-testid="settings-icon" />)
    expect(screen.getByTestId('settings-icon')).toBeInTheDocument()
  })

  it('renders User icon', () => {
    render(<User data-testid="user-icon" />)
    expect(screen.getByTestId('user-icon')).toBeInTheDocument()
  })

  it('renders navigation icons (ChevronRight, ChevronDown)', () => {
    render(
      <>
        <ChevronRight data-testid="chevron-right" />
        <ChevronDown data-testid="chevron-down" />
      </>
    )
    expect(screen.getByTestId('chevron-right')).toBeInTheDocument()
    expect(screen.getByTestId('chevron-down')).toBeInTheDocument()
  })

  it('renders action icons (Plus, Trash2, Edit)', () => {
    render(
      <>
        <Plus data-testid="plus-icon" />
        <Trash2 data-testid="trash-icon" />
        <Edit data-testid="edit-icon" />
      </>
    )
    expect(screen.getByTestId('plus-icon')).toBeInTheDocument()
    expect(screen.getByTestId('trash-icon')).toBeInTheDocument()
    expect(screen.getByTestId('edit-icon')).toBeInTheDocument()
  })

  it('renders state icons (Check, X)', () => {
    render(
      <>
        <Check data-testid="check-icon" />
        <X data-testid="x-icon" />
      </>
    )
    expect(screen.getByTestId('check-icon')).toBeInTheDocument()
    expect(screen.getByTestId('x-icon')).toBeInTheDocument()
  })

  it('renders GoalTree specific icons (Target, Flag, Calendar, CheckSquare)', () => {
    render(
      <>
        <Target data-testid="target-icon" />
        <Flag data-testid="flag-icon" />
        <Calendar data-testid="calendar-icon" />
        <CheckSquare data-testid="checksquare-icon" />
      </>
    )
    expect(screen.getByTestId('target-icon')).toBeInTheDocument()
    expect(screen.getByTestId('flag-icon')).toBeInTheDocument()
    expect(screen.getByTestId('calendar-icon')).toBeInTheDocument()
    expect(screen.getByTestId('checksquare-icon')).toBeInTheDocument()
  })

  it('accepts custom size prop', () => {
    render(<Home data-testid="sized-icon" size={32} />)
    const icon = screen.getByTestId('sized-icon')
    expect(icon).toHaveAttribute('width', '32')
    expect(icon).toHaveAttribute('height', '32')
  })

  it('accepts custom color prop', () => {
    render(<Home data-testid="colored-icon" color="red" />)
    const icon = screen.getByTestId('colored-icon')
    expect(icon).toHaveAttribute('stroke', 'red')
  })

  it('accepts custom strokeWidth prop', () => {
    render(<Home data-testid="stroke-icon" strokeWidth={3} />)
    const icon = screen.getByTestId('stroke-icon')
    expect(icon).toHaveAttribute('stroke-width', '3')
  })

  it('accepts className prop for custom styling', () => {
    render(<Home data-testid="styled-icon" className="text-blue-500 w-8 h-8" />)
    const icon = screen.getByTestId('styled-icon')
    expect(icon).toHaveClass('text-blue-500')
    expect(icon).toHaveClass('w-8')
    expect(icon).toHaveClass('h-8')
  })

  it('renders as SVG element', () => {
    render(<Home data-testid="svg-icon" />)
    const icon = screen.getByTestId('svg-icon')
    expect(icon.tagName.toLowerCase()).toBe('svg')
  })

  it('exports LucideIcon type for type-safe icon props', () => {
    // This test verifies the type export works at compile time
    const IconComponent: LucideIcon = Home
    render(<IconComponent data-testid="typed-icon" />)
    expect(screen.getByTestId('typed-icon')).toBeInTheDocument()
  })
})
