'use client'

import { useState, useCallback, useMemo } from 'react'
import { Calendar, Clock, CalendarDays, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { TaskWithMeta, SettingsData } from '@/lib/hooks'
import { useSettings, useTasks } from '@/lib/hooks'
import { parseTime } from '@/components/time-slot'

/**
 * Props for the ScheduleTaskDialog component
 */
export interface ScheduleTaskDialogProps {
  /** The task to schedule (null when dialog is closed) */
  task: TaskWithMeta | null
  /** Whether the dialog is open */
  open: boolean
  /** Callback when the dialog should close */
  onOpenChange: (open: boolean) => void
  /** Optional callback when task is scheduled successfully */
  onScheduled?: (taskId: number, date: Date) => void
  /** Optional settings override (uses useSettings by default) */
  settings?: SettingsData
}

/**
 * Available time slot for scheduling
 */
interface TimeSlotOption {
  label: string
  value: string
  hour: number
  minute: number
  isConflict: boolean
  conflictType?: 'work' | 'sleep'
}

/**
 * Generate available time slots (every 30 minutes)
 */
function generateTimeSlots(settings: SettingsData): TimeSlotOption[] {
  const slots: TimeSlotOption[] = []

  // Parse settings for conflict detection
  const workStart = parseTime(settings.workHoursStart)
  const workEnd = parseTime(settings.workHoursEnd)
  const sleepStart = parseTime(settings.sleepStart)
  const sleepEnd = parseTime(settings.sleepEnd)

  // Convert to minutes for easier comparison
  const workStartMinutes = workStart.hours * 60 + workStart.minutes
  const workEndMinutes = workEnd.hours * 60 + workEnd.minutes
  const sleepStartMinutes = sleepStart.hours * 60 + sleepStart.minutes
  const sleepEndMinutes = sleepEnd.hours * 60 + sleepEnd.minutes

  for (let hour = 0; hour < 24; hour++) {
    for (const minute of [0, 30]) {
      const totalMinutes = hour * 60 + minute
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`

      // Determine conflict type
      let isConflict = false
      let conflictType: 'work' | 'sleep' | undefined

      // Check work hours conflict
      if (totalMinutes >= workStartMinutes && totalMinutes < workEndMinutes) {
        isConflict = true
        conflictType = 'work'
      }

      // Check sleep hours conflict (handle overnight sleep)
      if (sleepStartMinutes > sleepEndMinutes) {
        // Overnight sleep (e.g., 23:00 to 07:00)
        if (totalMinutes >= sleepStartMinutes || totalMinutes < sleepEndMinutes) {
          isConflict = true
          conflictType = 'sleep'
        }
      } else {
        // Same-day sleep (unusual but handle it)
        if (totalMinutes >= sleepStartMinutes && totalMinutes < sleepEndMinutes) {
          isConflict = true
          conflictType = 'sleep'
        }
      }

      // Format display label
      const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
      const ampm = hour < 12 ? 'AM' : 'PM'
      const label = `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`

      slots.push({
        label,
        value: timeStr,
        hour,
        minute,
        isConflict,
        conflictType,
      })
    }
  }

  return slots
}

/**
 * Format date for display
 */
function formatDateForDisplay(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Format date for input value (YYYY-MM-DD)
 */
function formatDateForInput(date: Date): string {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * ScheduleTaskDialog Component - Modal for scheduling tasks to specific time slots
 *
 * This component provides a user-friendly interface for scheduling tasks:
 * - Date picker for selecting the date
 * - Time slot selection with conflict warnings for work/sleep hours
 * - Visual feedback for conflicting time slots
 */
export function ScheduleTaskDialog({
  task,
  open,
  onOpenChange,
  onScheduled,
  settings: settingsOverride,
}: ScheduleTaskDialogProps) {
  const { settings: defaultSettings } = useSettings()
  const { updateTask } = useTasks()

  // Use provided settings or default from hook
  const settings = settingsOverride ?? defaultSettings

  // State for selected date and time
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (task?.scheduledDate) {
      return formatDateForInput(new Date(task.scheduledDate))
    }
    return formatDateForInput(new Date())
  })

  const [selectedTime, setSelectedTime] = useState<string>(() => {
    if (task?.scheduledDate) {
      const date = new Date(task.scheduledDate)
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
    }
    return '09:00'
  })

  const [isScheduling, setIsScheduling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Generate time slots based on settings
  const timeSlots = useMemo(() => {
    return generateTimeSlots(settings)
  }, [settings])

  // Find current time slot for conflict info
  const currentSlot = useMemo(() => {
    return timeSlots.find((slot) => slot.value === selectedTime)
  }, [timeSlots, selectedTime])

  // Handle date change
  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value)
    setError(null)
  }, [])

  // Handle time change
  const handleTimeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTime(e.target.value)
    setError(null)
  }, [])

  // Handle schedule action
  const handleSchedule = useCallback(async () => {
    if (!task?.id) return

    setIsScheduling(true)
    setError(null)

    try {
      // Combine date and time into a single Date object
      const [year, month, day] = selectedDate.split('-').map(Number)
      const [hours, minutes] = selectedTime.split(':').map(Number)

      const scheduledDate = new Date(year, month - 1, day, hours, minutes)

      // Update the task with the scheduled date
      await updateTask(task.id, {
        scheduledDate,
        // If the task is a one-time task, keep the frequency
        // For recurring tasks, we're just setting a reference time
      })

      onScheduled?.(task.id, scheduledDate)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule task')
    } finally {
      setIsScheduling(false)
    }
  }, [task?.id, selectedDate, selectedTime, updateTask, onScheduled, onOpenChange])

  // Handle clear schedule
  const handleClearSchedule = useCallback(async () => {
    if (!task?.id) return

    setIsScheduling(true)
    setError(null)

    try {
      await updateTask(task.id, {
        scheduledDate: null,
      })

      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear schedule')
    } finally {
      setIsScheduling(false)
    }
  }, [task?.id, updateTask, onOpenChange])

  // Reset state when task changes
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (newOpen && task) {
        // Reset to task's scheduled date or today
        if (task.scheduledDate) {
          const date = new Date(task.scheduledDate)
          setSelectedDate(formatDateForInput(date))
          setSelectedTime(
            `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
          )
        } else {
          setSelectedDate(formatDateForInput(new Date()))
          setSelectedTime('09:00')
        }
        setError(null)
      }
      onOpenChange(newOpen)
    },
    [task, onOpenChange]
  )

  if (!task) return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-[425px]"
        data-testid="schedule-task-dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="schedule-task-dialog-title">
            <CalendarDays className="h-5 w-5 text-primary" />
            Schedule Task
          </DialogTitle>
          <DialogDescription data-testid="schedule-task-dialog-description">
            Choose a date and time to schedule this task.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Task Info */}
          <div
            className="rounded-lg border bg-muted/50 p-3"
            data-testid="schedule-task-dialog-task-info"
          >
            <p className="text-sm font-medium">{task.title}</p>
            {task.description && (
              <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
            )}
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2 py-0.5',
                  task.frequency === 'once' && 'bg-gray-100 dark:bg-gray-800',
                  task.frequency === 'daily' && 'bg-violet-100 dark:bg-violet-900/40',
                  task.frequency === 'weekly' && 'bg-blue-100 dark:bg-blue-900/40',
                  task.frequency === 'custom' && 'bg-amber-100 dark:bg-amber-900/40'
                )}
                data-testid="schedule-task-dialog-frequency"
              >
                {task.frequency === 'once'
                  ? 'One-time'
                  : task.frequency === 'daily'
                    ? 'Daily'
                    : task.frequency === 'weekly'
                      ? 'Weekly'
                      : 'Custom'}
              </span>
            </div>
          </div>

          {/* Date Picker */}
          <div className="grid gap-2">
            <label
              htmlFor="schedule-date"
              className="text-sm font-medium flex items-center gap-2"
            >
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Date
            </label>
            <Input
              id="schedule-date"
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              min={formatDateForInput(new Date())}
              data-testid="schedule-task-dialog-date-input"
            />
            <p className="text-xs text-muted-foreground" data-testid="schedule-task-dialog-date-display">
              {formatDateForDisplay(new Date(selectedDate + 'T00:00:00'))}
            </p>
          </div>

          {/* Time Picker */}
          <div className="grid gap-2">
            <label
              htmlFor="schedule-time"
              className="text-sm font-medium flex items-center gap-2"
            >
              <Clock className="h-4 w-4 text-muted-foreground" />
              Time
            </label>
            <select
              id="schedule-time"
              value={selectedTime}
              onChange={handleTimeChange}
              className={cn(
                'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors',
                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                'disabled:cursor-not-allowed disabled:opacity-50'
              )}
              data-testid="schedule-task-dialog-time-select"
            >
              {timeSlots.map((slot) => (
                <option
                  key={slot.value}
                  value={slot.value}
                  className={cn(
                    slot.isConflict && 'text-orange-600'
                  )}
                >
                  {slot.label}
                  {slot.isConflict && ` (${slot.conflictType})`}
                </option>
              ))}
            </select>

            {/* Conflict Warning */}
            {currentSlot?.isConflict && (
              <div
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-xs',
                  currentSlot.conflictType === 'work'
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                    : 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300'
                )}
                data-testid="schedule-task-dialog-conflict-warning"
              >
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>
                  This time conflicts with your{' '}
                  {currentSlot.conflictType === 'work' ? 'work' : 'sleep'} hours.
                </span>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div
              className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
              data-testid="schedule-task-dialog-error"
            >
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {task.scheduledDate && (
            <Button
              variant="outline"
              onClick={handleClearSchedule}
              disabled={isScheduling}
              className="w-full sm:w-auto"
              aria-label="Clear task schedule"
              data-testid="schedule-task-dialog-clear-btn"
            >
              Clear Schedule
            </Button>
          )}
          <div className="flex-1" />
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isScheduling}
            aria-label="Cancel scheduling"
            data-testid="schedule-task-dialog-cancel-btn"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSchedule}
            disabled={isScheduling}
            aria-label={isScheduling ? 'Scheduling task' : 'Schedule task'}
            data-testid="schedule-task-dialog-schedule-btn"
          >
            {isScheduling ? 'Scheduling...' : 'Schedule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ScheduleTaskDialog
