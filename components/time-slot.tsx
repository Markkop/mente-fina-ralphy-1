'use client'

import { useMemo } from 'react'
import { Briefcase, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SettingsData } from '@/lib/hooks'

/**
 * Props for the TimeSlot component
 */
export interface TimeSlotProps {
  /** Settings containing work/sleep hours */
  settings: SettingsData
  /** Optional className for styling */
  className?: string
  /** Whether to show labels on the blocks */
  showLabels?: boolean
  /** Whether to use compact mode (smaller blocks) */
  compact?: boolean
}

/**
 * Represents a time block (work or sleep)
 */
export interface TimeBlock {
  type: 'work' | 'sleep'
  startHour: number
  startMinute: number
  endHour: number
  endMinute: number
  /** Position as percentage from top (0-100) */
  topPercent: number
  /** Height as percentage (0-100) */
  heightPercent: number
  /** Label to display */
  label: string
  /** Start time formatted */
  startTime: string
  /** End time formatted */
  endTime: string
}

/**
 * Parses a time string (HH:mm) into hours and minutes
 */
export function parseTime(time: string): { hours: number; minutes: number } {
  const [hours, minutes] = time.split(':').map(Number)
  return { hours: hours || 0, minutes: minutes || 0 }
}

/**
 * Converts hours and minutes to a percentage of the day (0-100)
 */
export function timeToPercent(hours: number, minutes: number): number {
  const totalMinutes = hours * 60 + minutes
  return (totalMinutes / (24 * 60)) * 100
}

/**
 * Calculates the height percentage between two times
 * Handles overnight spans (e.g., 23:00 to 07:00)
 */
export function calculateBlockHeight(
  startHour: number,
  startMinute: number,
  endHour: number,
  endMinute: number
): number {
  const startMinutes = startHour * 60 + startMinute
  const endMinutes = endHour * 60 + endMinute

  let duration: number
  if (endMinutes > startMinutes) {
    // Same day block (e.g., 09:00 to 18:00)
    duration = endMinutes - startMinutes
  } else {
    // Overnight block (e.g., 23:00 to 07:00)
    // Duration from start to midnight + midnight to end
    duration = (24 * 60 - startMinutes) + endMinutes
  }

  return (duration / (24 * 60)) * 100
}

/**
 * Generates time blocks from settings
 * Returns separate blocks for work and sleep times
 */
export function generateTimeBlocks(settings: SettingsData): TimeBlock[] {
  const blocks: TimeBlock[] = []

  // Parse work hours
  const workStart = parseTime(settings.workHoursStart)
  const workEnd = parseTime(settings.workHoursEnd)

  // Parse sleep hours
  const sleepStart = parseTime(settings.sleepStart)
  const sleepEnd = parseTime(settings.sleepEnd)

  // Work block
  const workTopPercent = timeToPercent(workStart.hours, workStart.minutes)
  const workHeightPercent = calculateBlockHeight(
    workStart.hours,
    workStart.minutes,
    workEnd.hours,
    workEnd.minutes
  )

  blocks.push({
    type: 'work',
    startHour: workStart.hours,
    startMinute: workStart.minutes,
    endHour: workEnd.hours,
    endMinute: workEnd.minutes,
    topPercent: workTopPercent,
    heightPercent: workHeightPercent,
    label: 'Work',
    startTime: settings.workHoursStart,
    endTime: settings.workHoursEnd,
  })

  // Sleep block - handle overnight sleep
  const sleepTopPercent = timeToPercent(sleepStart.hours, sleepStart.minutes)
  const sleepHeightPercent = calculateBlockHeight(
    sleepStart.hours,
    sleepStart.minutes,
    sleepEnd.hours,
    sleepEnd.minutes
  )

  // Check if sleep spans overnight
  const sleepStartMinutes = sleepStart.hours * 60 + sleepStart.minutes
  const sleepEndMinutes = sleepEnd.hours * 60 + sleepEnd.minutes

  if (sleepEndMinutes < sleepStartMinutes) {
    // Overnight sleep - split into two blocks
    // Block 1: From sleepStart to midnight (end of day)
    const block1Height = ((24 * 60 - sleepStartMinutes) / (24 * 60)) * 100

    blocks.push({
      type: 'sleep',
      startHour: sleepStart.hours,
      startMinute: sleepStart.minutes,
      endHour: 24,
      endMinute: 0,
      topPercent: sleepTopPercent,
      heightPercent: block1Height,
      label: 'Sleep',
      startTime: settings.sleepStart,
      endTime: '24:00',
    })

    // Block 2: From midnight to sleepEnd (start of day)
    const block2Height = (sleepEndMinutes / (24 * 60)) * 100

    blocks.push({
      type: 'sleep',
      startHour: 0,
      startMinute: 0,
      endHour: sleepEnd.hours,
      endMinute: sleepEnd.minutes,
      topPercent: 0,
      heightPercent: block2Height,
      label: 'Sleep',
      startTime: '00:00',
      endTime: settings.sleepEnd,
    })
  } else {
    // Same-day sleep (unlikely but handle it)
    blocks.push({
      type: 'sleep',
      startHour: sleepStart.hours,
      startMinute: sleepStart.minutes,
      endHour: sleepEnd.hours,
      endMinute: sleepEnd.minutes,
      topPercent: sleepTopPercent,
      heightPercent: sleepHeightPercent,
      label: 'Sleep',
      startTime: settings.sleepStart,
      endTime: settings.sleepEnd,
    })
  }

  return blocks
}

/**
 * Hour markers for the time grid
 */
const HOUR_MARKERS = [0, 6, 12, 18] as const

/**
 * TimeSlot Component - Visualizes work and sleep time blocks
 *
 * This component renders a visual representation of work hours and sleep hours
 * as colored blocks on a 24-hour timeline. It's designed to be used in the
 * WeeklyView to show when the user is unavailable for scheduling tasks.
 */
export function TimeSlot({
  settings,
  className,
  showLabels = true,
  compact = false,
}: TimeSlotProps) {
  const blocks = useMemo(() => generateTimeBlocks(settings), [settings])

  return (
    <div
      className={cn(
        'relative w-full',
        compact ? 'h-20' : 'h-32',
        className
      )}
      data-testid="time-slot"
      role="img"
      aria-label="Daily time blocks showing work and sleep hours"
    >
      {/* Background grid with hour markers */}
      <div className="absolute inset-0 border border-border rounded-md bg-muted/20">
        {HOUR_MARKERS.map((hour) => (
          <div
            key={hour}
            className="absolute left-0 right-0 border-t border-dashed border-border/50"
            style={{ top: `${(hour / 24) * 100}%` }}
            data-testid={`time-slot-marker-${hour}`}
          >
            {!compact && (
              <span className="absolute -top-2.5 left-1 text-[10px] text-muted-foreground">
                {hour.toString().padStart(2, '0')}:00
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Time blocks */}
      {blocks.map((block, index) => (
        <div
          key={`${block.type}-${index}`}
          className={cn(
            'absolute left-0 right-0 rounded-sm flex items-center justify-center overflow-hidden',
            block.type === 'work'
              ? 'bg-blue-500/20 border border-blue-500/30'
              : 'bg-violet-500/20 border border-violet-500/30'
          )}
          style={{
            top: `${block.topPercent}%`,
            height: `${block.heightPercent}%`,
          }}
          data-testid={`time-slot-block-${block.type}${block.type === 'sleep' && index > 1 ? '-' + (index - 1) : ''}`}
          role="presentation"
          aria-label={`${block.label}: ${block.startTime} - ${block.endTime}`}
        >
          {showLabels && block.heightPercent > 10 && (
            <div className={cn(
              'flex items-center gap-1',
              compact ? 'text-[10px]' : 'text-xs'
            )}>
              {block.type === 'work' ? (
                <Briefcase className={cn(
                  'text-blue-500',
                  compact ? 'h-2.5 w-2.5' : 'h-3 w-3'
                )} />
              ) : (
                <Moon className={cn(
                  'text-violet-500',
                  compact ? 'h-2.5 w-2.5' : 'h-3 w-3'
                )} />
              )}
              <span className={cn(
                block.type === 'work' ? 'text-blue-600' : 'text-violet-600'
              )}>
                {block.label}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/**
 * TimeSlotLegend Component - Shows legend for time block colors
 */
export function TimeSlotLegend({ className }: { className?: string }) {
  return (
    <div
      className={cn('flex items-center gap-4 text-xs', className)}
      data-testid="time-slot-legend"
    >
      <div className="flex items-center gap-1.5">
        <div className="h-3 w-3 rounded-sm bg-blue-500/20 border border-blue-500/30" />
        <Briefcase className="h-3 w-3 text-blue-500" />
        <span className="text-muted-foreground">Work</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="h-3 w-3 rounded-sm bg-violet-500/20 border border-violet-500/30" />
        <Moon className="h-3 w-3 text-violet-500" />
        <span className="text-muted-foreground">Sleep</span>
      </div>
    </div>
  )
}

export default TimeSlot
