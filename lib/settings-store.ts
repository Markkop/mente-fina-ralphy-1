import { create } from 'zustand'
import { db, type Settings } from '@/src/db'

/**
 * Default settings values
 */
const DEFAULT_SETTINGS: Omit<Settings, 'id'> = {
  workHoursStart: '09:00',
  workHoursEnd: '17:00',
  sleepStart: '22:00',
  sleepEnd: '07:00',
}

/**
 * Settings store state
 */
interface SettingsStoreState {
  /** Current settings */
  settings: Settings | null
  /** Loading state */
  isLoading: boolean
  /** Error state */
  error: string | null
  /** Whether the store has been initialized */
  isInitialized: boolean
}

/**
 * Settings store actions
 */
interface SettingsStoreActions {
  /** Initialize the store by loading settings from Dexie */
  initialize: () => Promise<void>
  /** Update settings */
  updateSettings: (updates: Partial<Omit<Settings, 'id'>>) => Promise<void>
  /** Reset settings to defaults */
  resetToDefaults: () => Promise<void>
  /** Get the current settings or defaults */
  getSettingsOrDefaults: () => Omit<Settings, 'id'>
}

type SettingsStore = SettingsStoreState & SettingsStoreActions

/**
 * Settings store - manages work/sleep hours configuration
 * 
 * Uses Zustand for state management with Dexie for persistence.
 * Settings are stored locally in IndexedDB following the local-first pattern.
 */
export const useSettingsStore = create<SettingsStore>((set, get) => ({
  // Initial state
  settings: null,
  isLoading: false,
  error: null,
  isInitialized: false,

  // Actions
  initialize: async () => {
    const state = get()
    if (state.isInitialized || state.isLoading) {
      return
    }

    set({ isLoading: true, error: null })

    try {
      // Try to get existing settings
      const existingSettings = await db.settings.toArray()
      
      if (existingSettings.length > 0) {
        set({
          settings: existingSettings[0],
          isLoading: false,
          isInitialized: true,
        })
      } else {
        // Create default settings if none exist
        const id = await db.settings.add({ ...DEFAULT_SETTINGS })
        const newSettings = await db.settings.get(id)
        
        set({
          settings: newSettings ?? null,
          isLoading: false,
          isInitialized: true,
        })
      }
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to initialize settings',
      })
    }
  },

  updateSettings: async (updates) => {
    const state = get()
    
    if (!state.settings?.id) {
      // Initialize first if not initialized
      await get().initialize()
      const newState = get()
      if (!newState.settings?.id) {
        throw new Error('Failed to initialize settings')
      }
    }

    try {
      const currentSettings = get().settings
      if (!currentSettings?.id) {
        throw new Error('No settings found')
      }

      await db.settings.update(currentSettings.id, updates)
      
      const updatedSettings = await db.settings.get(currentSettings.id)
      set({ settings: updatedSettings ?? null })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update settings'
      set({ error: errorMessage })
      throw error
    }
  },

  resetToDefaults: async () => {
    const state = get()
    
    try {
      if (state.settings?.id) {
        await db.settings.update(state.settings.id, DEFAULT_SETTINGS)
        const updatedSettings = await db.settings.get(state.settings.id)
        set({ settings: updatedSettings ?? null })
      } else {
        // Create new settings with defaults
        const id = await db.settings.add({ ...DEFAULT_SETTINGS })
        const newSettings = await db.settings.get(id)
        set({ settings: newSettings ?? null, isInitialized: true })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reset settings'
      set({ error: errorMessage })
      throw error
    }
  },

  getSettingsOrDefaults: () => {
    const state = get()
    if (state.settings) {
      return {
        workHoursStart: state.settings.workHoursStart,
        workHoursEnd: state.settings.workHoursEnd,
        sleepStart: state.settings.sleepStart,
        sleepEnd: state.settings.sleepEnd,
      }
    }
    return DEFAULT_SETTINGS
  },
}))

export { DEFAULT_SETTINGS }
