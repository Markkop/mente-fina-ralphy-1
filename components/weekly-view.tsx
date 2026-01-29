'use client'

import { useMemo, useCallback } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  Calendar,
  Repeat,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useTasks, useSettings, type TaskWithMeta, type SettingsData } from '@/lib/hooks'
import { TimeSlot, TimeSlotLegend } from '@/components/time-slot'

/**
 * Props for the WeeklyView component
 */
export interface WeeklyViewProps {
  /** Optional className for the container */
  className?: string
  /** The current week start date (defaults to current week's Monday) */
  weekStartDate?: Date
  /** Callback when the week changes */
  onWeekChange?: (newWeekStart: Date) => void
  /** Callback when a task is clicked */
  onTaskClick?: (task: TaskWithMeta) => void
  /** Callback when task completion is toggled */
  onToggleTask?: (taskId: number) => void
  /** Whether to show time slots for work/sleep blocks */
  showTimeSlots?: boolean
  /** Override settings for time slots (uses useSettings by default) */
  timeSlotSettings?: SettingsData
}

/**
 * Day names for the week header
 */
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

/**
 * Full day names for accessibility
 */
const FULL_DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const

/**
 * Get the Monday of the week for a given date
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  // Adjust for Monday start (0 = Sunday, so we need to go back 6 days if Sunday, otherwise day - 1)
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Format a date as "Mon DD"
 */
function formatDayHeader(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Format week range for display (e.g., "Jan 13 - Jan 19, 2025")
 */
function formatWeekRange(weekStart: Date): string {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  const startMonth = weekStart.toLocaleDateString('en-US', { month: 'short' })
  const endMonth = weekEnd.toLocaleDateString('en-US', { month: 'short' })
  const startDay = weekStart.getDate()
  const endDay = weekEnd.getDate()
  const year = weekEnd.getFullYear()

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} - ${endDay}, ${year}`
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`
}

/**
 * Check if a date is today
 */
function isToday(date: Date): boolean {
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

/**
 * Check if a task should appear on a given day
 * @param task - The task to check
 * @param date - The date to check
 * @returns Whether the task should appear on that day
 */
function shouldTaskAppearOnDay(task: TaskWithMeta, date: Date): boolean {
  // Daily tasks appear every day
  if (task.frequency === 'daily') {
    return true
  }

  // Weekly tasks appear on specific days
  if (task.frequency === 'weekly' && task.weeklyDays) {
    // weeklyDays uses 0-6 for Sunday-Saturday
    // We need to convert our date's day of week
    const dayOfWeek = date.getDay() // 0 = Sunday, 1 = Monday, etc.
    return task.weeklyDays.includes(dayOfWeek)
  }

  // One-time tasks appear on their scheduled date
  if (task.frequency === 'once' && task.scheduledDate) {
    const scheduledDate = new Date(task.scheduledDate)
    return (
      scheduledDate.getDate() === date.getDate() &&
      scheduledDate.getMonth() === date.getMonth() &&
      scheduledDate.getFullYear() === date.getFullYear()
    )
  }

  // Custom frequency tasks - show every day for now (can be refined later)
  if (task.frequency === 'custom') {
    return true
  }

  return false
}

/**
 * WeeklyView Component - A CSS Grid based 7-column layout for viewing tasks by week
 *
 * This component provides a weekly calendar view where tasks are displayed
 * in their respective days based on their frequency settings:
 * - Daily tasks appear every day
 * - Weekly tasks appear on their configured days
 * - One-time tasks appear on their scheduled date
 */
export function WeeklyView({
  className,
  weekStartDate,
  onWeekChange,
  onTaskClick,
  onToggleTask,
  showTimeSlots = true,
  timeSlotSettings,
}: WeeklyViewProps) {
  const { allTasks, toggleTaskCompletion } = useTasks()
  const { settings: defaultSettings, isLoading: settingsLoading } = useSettings()

  // Use provided settings or default from hook
  const settings = timeSlotSettings ?? defaultSettings

  // Calculate the current week start
  const currentWeekStart = useMemo(() => {
    return weekStartDate ? getWeekStart(weekStartDate) : getWeekStart(new Date())
  }, [weekStartDate])

  // Generate array of 7 dates for the week
  const weekDates = useMemo(() => {
    const dates: Date[] = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart)
      date.setDate(currentWeekStart.getDate() + i)
      dates.push(date)
    }
    return dates
  }, [currentWeekStart])

  // Group tasks by day
  const tasksByDay = useMemo(() => {
    const grouped: Map<number, TaskWithMeta[]> = new Map()

    for (let i = 0; i < 7; i++) {
      grouped.set(i, [])
    }

    for (const task of allTasks) {
      for (let i = 0; i < 7; i++) {
        if (shouldTaskAppearOnDay(task, weekDates[i])) {
          grouped.get(i)!.push(task)
        }
      }
    }

    return grouped
  }, [allTasks, weekDates])

  // Navigate to previous week
  const handlePreviousWeek = useCallback(() => {
    const newStart = new Date(currentWeekStart)
    newStart.setDate(newStart.getDate() - 7)
    onWeekChange?.(newStart)
  }, [currentWeekStart, onWeekChange])

  // Navigate to next week
  const handleNextWeek = useCallback(() => {
    const newStart = new Date(currentWeekStart)
    newStart.setDate(newStart.getDate() + 7)
    onWeekChange?.(newStart)
  }, [currentWeekStart, onWeekChange])

  // Navigate to current week
  const handleToday = useCallback(() => {
    onWeekChange?.(getWeekStart(new Date()))
  }, [onWeekChange])

  // Handle task toggle
  const handleToggleTask = useCallback(
    async (taskId: number, e: React.MouseEvent) => {
      e.stopPropagation()
      if (onToggleTask) {
        onToggleTask(taskId)
      } else {
        await toggleTaskCompletion(taskId)
      }
    },
    [onToggleTask, toggleTaskCompletion]
  )

  // Handle task click
  const handleTaskClick = useCallback(
    (task: TaskWithMeta) => {
      onTaskClick?.(task)
    },
    [onTaskClick]
  )

  return (
    <div
      className={cn('w-full', className)}
      data-testid="weekly-view"
      role="grid"
      aria-label="Weekly task view"
    >
      {/* Header with navigation */}
      <div
        className="flex items-center justify-between mb-4 pb-3 border-b"
        data-testid="weekly-view-header"
      >
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePreviousWeek}
            aria-label="Previous week"
            data-testid="weekly-view-prev"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNextWeek}
            aria-label="Next week"
            data-testid="weekly-view-next"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToday}
            aria-label="Go to today"
            data-testid="weekly-view-today"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Today
          </Button>
        </div>

        <div className="flex items-center gap-4">
          {showTimeSlots && !settingsLoading && (
            <TimeSlotLegend data-testid="weekly-view-legend" />
          )}
          <h2
            className="text-lg font-semibold text-foreground"
            data-testid="weekly-view-title"
          >
            {formatWeekRange(currentWeekStart)}
          </h2>
        </div>
      </div>

      {/* Weekly Grid */}
      <div
        className="grid grid-cols-7 gap-2"
        data-testid="weekly-view-grid"
        role="row"
      >
        {weekDates.map((date, index) => {
          const dayTasks = tasksByDay.get(index) || []
          const isTodayDate = isToday(date)

          return (
            <div
              key={date.toISOString()}
              className={cn(
                'flex flex-col min-h-[200px] rounded-lg border p-2',
                isTodayDate
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card'
              )}
              data-testid={`weekly-view-day-${index}`}
              role="gridcell"
              aria-label={FULL_DAY_NAMES[index]}
            >
              {/* Day Header */}
              <div
                className={cn(
                  'text-center pb-2 mb-2 border-b',
                  isTodayDate ? 'border-primary/30' : 'border-border'
                )}
              >
                <div
                  className={cn(
                    'text-xs font-medium uppercase tracking-wide',
                    isTodayDate ? 'text-primary' : 'text-muted-foreground'
                  )}
                  data-testid={`weekly-view-day-name-${index}`}
                >
                  {DAY_NAMES[index]}
                </div>
                <div
                  className={cn(
                    'text-sm font-semibold',
                    isTodayDate ? 'text-primary' : 'text-foreground'
                  )}
                  data-testid={`weekly-view-day-date-${index}`}
                >
                  {formatDayHeader(date)}
                </div>
              </div>

              {/* Time Slots */}
              {showTimeSlots && !settingsLoading && (
                <div
                  className="mb-2"
                  data-testid={`weekly-view-timeslot-${index}`}
                >
                  <TimeSlot
                    settings={settings}
                    compact
                    showLabels={false}
                  />
                </div>
              )}

              {/* Tasks List */}
              <div
                className="flex-1 space-y-1 overflow-y-auto"
                data-testid={`weekly-view-tasks-${index}`}
              >
                {dayTasks.length === 0 ? (
                  <div
                    className="text-xs text-muted-foreground text-center py-4"
                    data-testid={`weekly-view-empty-${index}`}
                  >
                    No tasks
                  </div>
                ) : (
                  dayTasks.map((task) => (
                    <WeeklyTaskItem
                      key={task.id}
                      task={task}
                      onToggle={(e) => handleToggleTask(task.id, e)}
                      onClick={() => handleTaskClick(task)}
                    />
                  ))
                )}
              </div>

              {/* Task Count */}
              {dayTasks.length > 0 && (
                <div
                  className="text-xs text-muted-foreground text-center pt-2 mt-2 border-t border-border"
                  data-testid={`weekly-view-count-${index}`}
                >
                  {dayTasks.filter((t) => t.isCompleted).length}/{dayTasks.length} done
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Props for the WeeklyTaskItem component
 */
interface WeeklyTaskItemProps {
  task: TaskWithMeta
  onToggle: (e: React.MouseEvent) => void
  onClick: () => void
}

/**
 * Individual task item in the weekly view
 */
function WeeklyTaskItem({ task, onToggle, onClick }: WeeklyTaskItemProps) {
  const isDaily = task.frequency === 'daily'
  const isWeekly = task.frequency === 'weekly'

  return (
    <div
      className={cn(
        'group flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs cursor-pointer transition-colors',
        task.isCompleted
          ? 'bg-muted/50 text-muted-foreground'
          : 'bg-background hover:bg-accent'
      )}
      onClick={onClick}
      data-testid={`weekly-task-${task.id}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
    >
      {/* Checkbox */}
      <button
        type="button"
        className={cn(
          'flex-shrink-0 h-4 w-4 flex items-center justify-center rounded transition-colors',
          task.isCompleted
            ? 'text-green-500'
            : 'text-muted-foreground hover:text-foreground'
        )}
        onClick={onToggle}
        aria-label={task.isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
        data-testid={`weekly-task-checkbox-${task.id}`}
      >
        {task.isCompleted ? (
          <CheckSquare className="h-3.5 w-3.5" />
        ) : (
          <Square className="h-3.5 w-3.5" />
        )}
      </button>

      {/* Task Title */}
      <span
        className={cn(
          'flex-1 truncate',
          task.isCompleted && 'line-through'
        )}
        data-testid={`weekly-task-title-${task.id}`}
      >
        {task.title}
      </span>

      {/* Frequency Indicator */}
      {(isDaily || isWeekly) && (
        <Repeat
          className={cn(
            'flex-shrink-0 h-3 w-3',
            isDaily ? 'text-violet-500' : 'text-blue-500'
          )}
          aria-label={isDaily ? 'Daily task' : 'Weekly task'}
          data-testid={`weekly-task-frequency-${task.id}`}
        />
      )}
    </div>
  )
}

export default WeeklyView
