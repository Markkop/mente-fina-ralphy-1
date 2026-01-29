import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  TimeSlot,
  TimeSlotLegend,
  parseTime,
  timeToPercent,
  calculateBlockHeight,
  generateTimeBlocks,
} from '@/components/time-slot'
import { DEFAULT_SETTINGS } from '@/lib/hooks'

describe('TimeSlot utility functions', () => {
  describe('parseTime', () => {
    it('parses valid time string', () => {
      expect(parseTime('09:00')).toEqual({ hours: 9, minutes: 0 })
      expect(parseTime('18:30')).toEqual({ hours: 18, minutes: 30 })
      expect(parseTime('00:00')).toEqual({ hours: 0, minutes: 0 })
      expect(parseTime('23:59')).toEqual({ hours: 23, minutes: 59 })
    })

    it('handles single digit hours', () => {
      expect(parseTime('07:00')).toEqual({ hours: 7, minutes: 0 })
    })

    it('handles edge case with invalid format', () => {
      expect(parseTime('')).toEqual({ hours: 0, minutes: 0 })
    })
  })

  describe('timeToPercent', () => {
    it('converts midnight to 0%', () => {
      expect(timeToPercent(0, 0)).toBe(0)
    })

    it('converts noon to 50%', () => {
      expect(timeToPercent(12, 0)).toBe(50)
    })

    it('converts 6am to 25%', () => {
      expect(timeToPercent(6, 0)).toBe(25)
    })

    it('converts 18:00 to 75%', () => {
      expect(timeToPercent(18, 0)).toBe(75)
    })

    it('handles minutes correctly', () => {
      // 6:30 = 6.5 hours = 6.5/24 * 100 = 27.083...%
      const result = timeToPercent(6, 30)
      expect(result).toBeCloseTo(27.083, 2)
    })
  })

  describe('calculateBlockHeight', () => {
    it('calculates same-day block height', () => {
      // 9am to 6pm = 9 hours = 9/24 * 100 = 37.5%
      const height = calculateBlockHeight(9, 0, 18, 0)
      expect(height).toBe(37.5)
    })

    it('calculates overnight block height', () => {
      // 11pm to 7am = 8 hours overnight = 8/24 * 100 = 33.33...%
      const height = calculateBlockHeight(23, 0, 7, 0)
      expect(height).toBeCloseTo(33.33, 2)
    })

    it('handles block spanning full day', () => {
      // Midnight to midnight (24 hours) 
      // This would be 100% but since end=start, it calculates as 0 for same-day
      // Actually the formula handles this: if end > start, it's same day
      const height = calculateBlockHeight(0, 0, 0, 0)
      expect(height).toBe(100) // Full day since duration = 24*60
    })

    it('handles short blocks', () => {
      // 1 hour block = 1/24 * 100 = 4.166...%
      const height = calculateBlockHeight(9, 0, 10, 0)
      expect(height).toBeCloseTo(4.166, 2)
    })
  })

  describe('generateTimeBlocks', () => {
    it('generates work and sleep blocks from default settings', () => {
      const blocks = generateTimeBlocks(DEFAULT_SETTINGS)

      // Should have work block + 2 sleep blocks (overnight split)
      expect(blocks.length).toBe(3)

      const workBlock = blocks.find((b) => b.type === 'work')
      expect(workBlock).toBeDefined()
      expect(workBlock?.startTime).toBe('09:00')
      expect(workBlock?.endTime).toBe('18:00')

      const sleepBlocks = blocks.filter((b) => b.type === 'sleep')
      expect(sleepBlocks.length).toBe(2) // Split overnight
    })

    it('handles same-day sleep (edge case)', () => {
      const settings = {
        workHoursStart: '09:00',
        workHoursEnd: '18:00',
        sleepStart: '14:00',
        sleepEnd: '16:00',
      }

      const blocks = generateTimeBlocks(settings)

      // Should have 1 work + 1 sleep (same day, not split)
      expect(blocks.length).toBe(2)
    })

    it('calculates correct position for work block', () => {
      const settings = {
        workHoursStart: '09:00',
        workHoursEnd: '18:00',
        sleepStart: '23:00',
        sleepEnd: '07:00',
      }

      const blocks = generateTimeBlocks(settings)
      const workBlock = blocks.find((b) => b.type === 'work')

      // 9am = 9/24 * 100 = 37.5%
      expect(workBlock?.topPercent).toBe(37.5)

      // 9 hours work = 9/24 * 100 = 37.5%
      expect(workBlock?.heightPercent).toBe(37.5)
    })

    it('splits overnight sleep into two blocks', () => {
      const settings = {
        workHoursStart: '09:00',
        workHoursEnd: '18:00',
        sleepStart: '23:00',
        sleepEnd: '07:00',
      }

      const blocks = generateTimeBlocks(settings)
      const sleepBlocks = blocks.filter((b) => b.type === 'sleep')

      expect(sleepBlocks.length).toBe(2)

      // First sleep block: 23:00 to 24:00 (1 hour at end of day)
      const eveningBlock = sleepBlocks.find((b) => b.startTime === '23:00')
      expect(eveningBlock).toBeDefined()
      expect(eveningBlock?.endTime).toBe('24:00')
      expect(eveningBlock?.topPercent).toBeCloseTo(95.83, 1) // 23/24 * 100

      // Second sleep block: 00:00 to 07:00 (7 hours at start of day)
      const morningBlock = sleepBlocks.find((b) => b.startTime === '00:00')
      expect(morningBlock).toBeDefined()
      expect(morningBlock?.endTime).toBe('07:00')
      expect(morningBlock?.topPercent).toBe(0)
    })

    it('includes labels in blocks', () => {
      const blocks = generateTimeBlocks(DEFAULT_SETTINGS)

      const workBlock = blocks.find((b) => b.type === 'work')
      expect(workBlock?.label).toBe('Work')

      const sleepBlock = blocks.find((b) => b.type === 'sleep')
      expect(sleepBlock?.label).toBe('Sleep')
    })
  })
})

describe('TimeSlot component', () => {
  const defaultSettings = DEFAULT_SETTINGS

  describe('rendering', () => {
    it('renders the time slot container', () => {
      render(<TimeSlot settings={defaultSettings} />)

      expect(screen.getByTestId('time-slot')).toBeInTheDocument()
    })

    it('renders with correct ARIA attributes', () => {
      render(<TimeSlot settings={defaultSettings} />)

      const container = screen.getByTestId('time-slot')
      expect(container).toHaveAttribute('role', 'img')
      expect(container).toHaveAttribute(
        'aria-label',
        'Daily time blocks showing work and sleep hours'
      )
    })

    it('renders hour markers', () => {
      render(<TimeSlot settings={defaultSettings} />)

      expect(screen.getByTestId('time-slot-marker-0')).toBeInTheDocument()
      expect(screen.getByTestId('time-slot-marker-6')).toBeInTheDocument()
      expect(screen.getByTestId('time-slot-marker-12')).toBeInTheDocument()
      expect(screen.getByTestId('time-slot-marker-18')).toBeInTheDocument()
    })

    it('renders work block', () => {
      render(<TimeSlot settings={defaultSettings} />)

      expect(screen.getByTestId('time-slot-block-work')).toBeInTheDocument()
    })

    it('renders sleep blocks', () => {
      render(<TimeSlot settings={defaultSettings} />)

      // With overnight sleep, there should be 2 sleep blocks
      expect(screen.getByTestId('time-slot-block-sleep')).toBeInTheDocument()
      expect(screen.getByTestId('time-slot-block-sleep-1')).toBeInTheDocument()
    })
  })

  describe('styling', () => {
    it('applies custom className', () => {
      render(<TimeSlot settings={defaultSettings} className="custom-class" />)

      expect(screen.getByTestId('time-slot')).toHaveClass('custom-class')
    })

    it('applies compact class when compact prop is true', () => {
      render(<TimeSlot settings={defaultSettings} compact />)

      const container = screen.getByTestId('time-slot')
      expect(container).toHaveClass('h-20')
    })

    it('applies regular height when compact is false', () => {
      render(<TimeSlot settings={defaultSettings} compact={false} />)

      const container = screen.getByTestId('time-slot')
      expect(container).toHaveClass('h-32')
    })

    it('renders work block with correct colors', () => {
      render(<TimeSlot settings={defaultSettings} />)

      const workBlock = screen.getByTestId('time-slot-block-work')
      expect(workBlock).toHaveClass('bg-blue-500/20')
      expect(workBlock).toHaveClass('border-blue-500/30')
    })

    it('renders sleep block with correct colors', () => {
      render(<TimeSlot settings={defaultSettings} />)

      const sleepBlock = screen.getByTestId('time-slot-block-sleep')
      expect(sleepBlock).toHaveClass('bg-violet-500/20')
      expect(sleepBlock).toHaveClass('border-violet-500/30')
    })
  })

  describe('labels', () => {
    it('shows labels when showLabels is true', () => {
      render(<TimeSlot settings={defaultSettings} showLabels />)

      expect(screen.getByText('Work')).toBeInTheDocument()
    })

    it('hides labels when showLabels is false', () => {
      render(<TimeSlot settings={defaultSettings} showLabels={false} />)

      expect(screen.queryByText('Work')).not.toBeInTheDocument()
    })

    it('shows labels by default', () => {
      render(<TimeSlot settings={defaultSettings} />)

      expect(screen.getByText('Work')).toBeInTheDocument()
    })
  })

  describe('block positioning', () => {
    it('positions work block correctly', () => {
      const settings = {
        workHoursStart: '09:00',
        workHoursEnd: '18:00',
        sleepStart: '23:00',
        sleepEnd: '07:00',
      }

      render(<TimeSlot settings={settings} />)

      const workBlock = screen.getByTestId('time-slot-block-work')
      expect(workBlock).toHaveStyle({ top: '37.5%' })
      expect(workBlock).toHaveStyle({ height: '37.5%' })
    })
  })

  describe('accessibility', () => {
    it('has aria-label on blocks with time range', () => {
      render(<TimeSlot settings={defaultSettings} />)

      const workBlock = screen.getByTestId('time-slot-block-work')
      expect(workBlock).toHaveAttribute(
        'aria-label',
        'Work: 09:00 - 18:00'
      )
    })
  })
})

describe('TimeSlotLegend component', () => {
  describe('rendering', () => {
    it('renders the legend container', () => {
      render(<TimeSlotLegend />)

      expect(screen.getByTestId('time-slot-legend')).toBeInTheDocument()
    })

    it('renders work legend item', () => {
      render(<TimeSlotLegend />)

      expect(screen.getByText('Work')).toBeInTheDocument()
    })

    it('renders sleep legend item', () => {
      render(<TimeSlotLegend />)

      expect(screen.getByText('Sleep')).toBeInTheDocument()
    })
  })

  describe('styling', () => {
    it('applies custom className', () => {
      render(<TimeSlotLegend className="custom-legend" />)

      expect(screen.getByTestId('time-slot-legend')).toHaveClass('custom-legend')
    })

    it('has correct flex layout', () => {
      render(<TimeSlotLegend />)

      const legend = screen.getByTestId('time-slot-legend')
      expect(legend).toHaveClass('flex')
      expect(legend).toHaveClass('items-center')
      expect(legend).toHaveClass('gap-4')
    })
  })
})

describe('TimeSlot with custom settings', () => {
  it('handles early work hours', () => {
    const settings = {
      workHoursStart: '06:00',
      workHoursEnd: '14:00',
      sleepStart: '21:00',
      sleepEnd: '05:00',
    }

    render(<TimeSlot settings={settings} />)

    const workBlock = screen.getByTestId('time-slot-block-work')
    // 6am = 6/24 * 100 = 25%
    expect(workBlock).toHaveStyle({ top: '25%' })
  })

  it('handles late work hours', () => {
    const settings = {
      workHoursStart: '14:00',
      workHoursEnd: '22:00',
      sleepStart: '02:00',
      sleepEnd: '10:00',
    }

    render(<TimeSlot settings={settings} />)

    const workBlock = screen.getByTestId('time-slot-block-work')
    // 14:00 = 14/24 * 100 = 58.33%
    expect(workBlock).toHaveStyle({ top: '58.333333333333336%' })
  })
})
