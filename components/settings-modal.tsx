'use client'

import { useState, useCallback, useEffect } from 'react'
import { Settings, Clock, Moon, Sun, RotateCcw, Loader2, Trash2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useSettingsStore, DEFAULT_SETTINGS } from '@/lib/settings-store'
import { toastSuccess, toastError } from '@/lib/toast-store'
import { useGoalStore } from '@/lib/goal-store'

/**
 * Props for the SettingsModal component
 */
export interface SettingsModalProps {
  /** Whether the dialog is open (controlled mode) */
  open?: boolean
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void
  /** Optional trigger element - if not provided, a default settings button is shown */
  trigger?: React.ReactNode
  /** Optional className for the trigger button */
  triggerClassName?: string
}

/**
 * Validates time format (HH:mm)
 */
function isValidTime(time: string): boolean {
  const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
  return regex.test(time)
}

/**
 * SettingsModal Component - Dialog for configuring work/sleep hours
 *
 * This component provides a form for users to configure their work hours
 * and sleep hours. These settings are stored locally in IndexedDB and
 * can be used for task scheduling and time blocking features.
 *
 * Features:
 * - Configure work hours (start and end time)
 * - Configure sleep hours (start and end time)
 * - Reset to default values
 * - Input validation for time format
 * - Persisted to IndexedDB via Dexie
 *
 * @example
 * ```tsx
 * <SettingsModal />
 *
 * // Or with custom trigger
 * <SettingsModal trigger={<button>Open Settings</button>} />
 *
 * // Or controlled mode
 * <SettingsModal open={isOpen} onOpenChange={setIsOpen} />
 * ```
 */
export function SettingsModal({
  open: controlledOpen,
  onOpenChange,
  trigger,
  triggerClassName,
}: SettingsModalProps) {
  // Store state
  const {
    settings,
    isLoading: storeLoading,
    initialize,
    updateSettings,
    getSettingsOrDefaults,
    clearAllData,
  } = useSettingsStore()

  // Goal store for resetting after clear
  const resetGoalStore = useGoalStore((state) => state.reset)

  // Local state
  const [internalOpen, setInternalOpen] = useState(false)
  const [workHoursStart, setWorkHoursStart] = useState('')
  const [workHoursEnd, setWorkHoursEnd] = useState('')
  const [sleepStart, setSleepStart] = useState('')
  const [sleepEnd, setSleepEnd] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [isClearing, setIsClearing] = useState(false)

  // Controlled vs uncontrolled
  const isControlled = controlledOpen !== undefined
  const isOpen = isControlled ? controlledOpen : internalOpen

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!isControlled) {
        setInternalOpen(open)
      }
      onOpenChange?.(open)
    },
    [isControlled, onOpenChange]
  )

  // Initialize store on mount
  useEffect(() => {
    initialize()
  }, [initialize])

  // Load current settings when dialog opens
  useEffect(() => {
    if (isOpen) {
      const currentSettings = getSettingsOrDefaults()
      setWorkHoursStart(currentSettings.workHoursStart)
      setWorkHoursEnd(currentSettings.workHoursEnd)
      setSleepStart(currentSettings.sleepStart)
      setSleepEnd(currentSettings.sleepEnd)
      setError(null)
    }
  }, [isOpen, settings, getSettingsOrDefaults])

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      // Validate all time inputs
      if (!isValidTime(workHoursStart)) {
        setError('Invalid work hours start time (use HH:mm format)')
        return
      }
      if (!isValidTime(workHoursEnd)) {
        setError('Invalid work hours end time (use HH:mm format)')
        return
      }
      if (!isValidTime(sleepStart)) {
        setError('Invalid sleep start time (use HH:mm format)')
        return
      }
      if (!isValidTime(sleepEnd)) {
        setError('Invalid sleep end time (use HH:mm format)')
        return
      }

      setIsSubmitting(true)
      setError(null)

      try {
        await updateSettings({
          workHoursStart,
          workHoursEnd,
          sleepStart,
          sleepEnd,
        })
        toastSuccess('Settings saved')
        handleOpenChange(false)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to save settings'
        setError(errorMessage)
        toastError(errorMessage)
      } finally {
        setIsSubmitting(false)
      }
    },
    [workHoursStart, workHoursEnd, sleepStart, sleepEnd, updateSettings, handleOpenChange]
  )

  // Handle reset to defaults
  const handleResetToDefaults = useCallback(async () => {
    setWorkHoursStart(DEFAULT_SETTINGS.workHoursStart)
    setWorkHoursEnd(DEFAULT_SETTINGS.workHoursEnd)
    setSleepStart(DEFAULT_SETTINGS.sleepStart)
    setSleepEnd(DEFAULT_SETTINGS.sleepEnd)
    setError(null)
  }, [])

  // Handle clear all data
  const handleClearAllData = useCallback(async () => {
    setIsClearing(true)
    setError(null)

    try {
      await clearAllData()
      resetGoalStore()
      setShowClearConfirm(false)
      handleOpenChange(false)
      // Reload the page to ensure clean state
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear data')
      setIsClearing(false)
    }
  }, [clearAllData, resetGoalStore, handleOpenChange])

  // Check if values have changed from saved settings
  const hasChanges =
    settings &&
    (workHoursStart !== settings.workHoursStart ||
      workHoursEnd !== settings.workHoursEnd ||
      sleepStart !== settings.sleepStart ||
      sleepEnd !== settings.sleepEnd)

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button
              variant="ghost"
              size="icon"
              className={cn('h-9 w-9', triggerClassName)}
              data-testid="settings-trigger"
            >
              <Settings className="h-5 w-5" />
              <span className="sr-only">Open settings</span>
            </Button>
          )}
        </DialogTrigger>
      )}

      <DialogContent data-testid="settings-modal">
        <DialogHeader>
          <DialogTitle data-testid="settings-modal-title">Settings</DialogTitle>
          <DialogDescription data-testid="settings-modal-description">
            Configure your work and sleep hours for better task scheduling.
          </DialogDescription>
        </DialogHeader>

        {storeLoading ? (
          <div className="flex items-center justify-center py-8" data-testid="settings-loading">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6" data-testid="settings-form">
            {/* Work Hours Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Sun className="h-5 w-5 text-amber-500" />
                <h3 className="font-medium">Work Hours</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="work-hours-start" className="text-sm font-medium">
                    Start Time
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="work-hours-start"
                      type="time"
                      value={workHoursStart}
                      onChange={(e) => setWorkHoursStart(e.target.value)}
                      disabled={isSubmitting}
                      className="pl-10"
                      data-testid="work-hours-start-input"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="work-hours-end" className="text-sm font-medium">
                    End Time
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="work-hours-end"
                      type="time"
                      value={workHoursEnd}
                      onChange={(e) => setWorkHoursEnd(e.target.value)}
                      disabled={isSubmitting}
                      className="pl-10"
                      data-testid="work-hours-end-input"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sleep Hours Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Moon className="h-5 w-5 text-indigo-500" />
                <h3 className="font-medium">Sleep Hours</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="sleep-start" className="text-sm font-medium">
                    Bedtime
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="sleep-start"
                      type="time"
                      value={sleepStart}
                      onChange={(e) => setSleepStart(e.target.value)}
                      disabled={isSubmitting}
                      className="pl-10"
                      data-testid="sleep-start-input"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="sleep-end" className="text-sm font-medium">
                    Wake Time
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="sleep-end"
                      type="time"
                      value={sleepEnd}
                      onChange={(e) => setSleepEnd(e.target.value)}
                      disabled={isSubmitting}
                      className="pl-10"
                      data-testid="sleep-end-input"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Debug Section - Clear Data */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-destructive" />
                <h3 className="font-medium">Debug</h3>
              </div>

              {!showClearConfirm ? (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowClearConfirm(true)}
                  disabled={isSubmitting || isClearing}
                  className="w-full"
                  aria-label="Reset and clear all data"
                  data-testid="clear-data-button"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Reset/Clear All Data
                </Button>
              ) : (
                <div
                  className="rounded-lg border border-destructive bg-destructive/10 p-4 space-y-3"
                  data-testid="clear-data-confirm"
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-medium text-destructive">Are you sure?</p>
                      <p className="text-sm text-muted-foreground">
                        This will permanently delete all your goals, tasks, and settings. This action cannot be undone.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowClearConfirm(false)}
                      disabled={isClearing}
                      aria-label="Cancel clear data"
                      data-testid="clear-data-cancel"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={handleClearAllData}
                      disabled={isClearing}
                      aria-label={isClearing ? 'Clearing data' : 'Confirm clear all data'}
                      data-testid="clear-data-confirm-button"
                    >
                      {isClearing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Clearing...
                        </>
                      ) : (
                        'Yes, Clear All Data'
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <p
                className="text-sm text-destructive"
                role="alert"
                data-testid="settings-error"
              >
                {error}
              </p>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="ghost"
                onClick={handleResetToDefaults}
                disabled={isSubmitting}
                className="mr-auto"
                aria-label="Reset settings to defaults"
                data-testid="reset-defaults-button"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset to Defaults
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
                aria-label="Cancel settings changes"
                data-testid="cancel-button"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={isSubmitting || !hasChanges}
                aria-label={isSubmitting ? 'Saving settings' : 'Save settings changes'}
                data-testid="save-button"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default SettingsModal
