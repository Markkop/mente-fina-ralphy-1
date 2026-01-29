import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn utility function', () => {
  it('merges multiple class names', () => {
    const result = cn('class1', 'class2', 'class3')
    expect(result).toBe('class1 class2 class3')
  })

  it('handles conditional classes with clsx syntax', () => {
    const isActive = true
    const isDisabled = false
    
    const result = cn('base', isActive && 'active', isDisabled && 'disabled')
    expect(result).toBe('base active')
  })

  it('handles object syntax from clsx', () => {
    const result = cn('base', {
      'active': true,
      'disabled': false,
      'highlighted': true,
    })
    expect(result).toBe('base active highlighted')
  })

  it('handles array syntax from clsx', () => {
    const result = cn(['class1', 'class2'], 'class3')
    expect(result).toBe('class1 class2 class3')
  })

  it('merges conflicting Tailwind classes (tailwind-merge)', () => {
    // tailwind-merge should keep only the last conflicting class
    const result = cn('px-2', 'px-4')
    expect(result).toBe('px-4')
  })

  it('merges conflicting color classes', () => {
    const result = cn('text-red-500', 'text-blue-500')
    expect(result).toBe('text-blue-500')
  })

  it('merges conflicting background classes', () => {
    const result = cn('bg-white', 'bg-black')
    expect(result).toBe('bg-black')
  })

  it('handles undefined and null values', () => {
    const result = cn('base', undefined, null, 'end')
    expect(result).toBe('base end')
  })

  it('handles empty string inputs', () => {
    const result = cn('base', '', 'end')
    expect(result).toBe('base end')
  })

  it('returns empty string for no inputs', () => {
    const result = cn()
    expect(result).toBe('')
  })

  it('preserves non-conflicting classes', () => {
    const result = cn('px-2', 'py-4', 'text-lg', 'font-bold')
    expect(result).toBe('px-2 py-4 text-lg font-bold')
  })

  it('handles complex real-world scenario', () => {
    const variant = 'primary'
    const size = 'large'
    
    const result = cn(
      'base-button',
      variant === 'primary' && 'bg-blue-500 text-white',
      variant === 'secondary' && 'bg-gray-500 text-black',
      size === 'large' && 'px-6 py-3',
      size === 'small' && 'px-2 py-1',
      'hover:opacity-80'
    )
    
    expect(result).toBe('base-button bg-blue-500 text-white px-6 py-3 hover:opacity-80')
  })
})
