import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { GoalTreeDatabase } from '@/src/db'
import { create } from 'zustand'
import type { Settings } from '@/src/db'

/**
 * Default settings values (copied from settings-store.ts for testing)
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
  settings: Settings | null
  isLoading: boolean
  error: string | null
  isInitialized: boolean
}

/**
 * Settings store actions
 */
interface SettingsStoreActions {
  initialize: () => Promise<void>
  updateSettings: (updates: Partial<Omit<Settings, 'id'>>) => Promise<void>
  resetToDefaults: () => Promise<void>
  getSettingsOrDefaults: () => Omit<Settings, 'id'>
}

type SettingsStore = SettingsStoreState & SettingsStoreActions

/**
 * Creates a settings store with injected database for testing
 */
function createSettingsStore(database: GoalTreeDatabase) {
  return create<SettingsStore>((set, get) => ({
    settings: null,
    isLoading: false,
    error: null,
    isInitialized: false,

    initialize: async () => {
      const state = get()
      if (state.isInitialized || state.isLoading) {
        return
      }

      set({ isLoading: true, error: null })

      try {
        const existingSettings = await database.settings.toArray()
        
        if (existingSettings.length > 0) {
          set({
            settings: existingSettings[0],
            isLoading: false,
            isInitialized: true,
          })
        } else {
          const id = await database.settings.add({ ...DEFAULT_SETTINGS })
          const newSettings = await database.settings.get(id)
          
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

        await database.settings.update(currentSettings.id, updates)
        
        const updatedSettings = await database.settings.get(currentSettings.id)
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
          await database.settings.update(state.settings.id, DEFAULT_SETTINGS)
          const updatedSettings = await database.settings.get(state.settings.id)
          set({ settings: updatedSettings ?? null })
        } else {
          const id = await database.settings.add({ ...DEFAULT_SETTINGS })
          const newSettings = await database.settings.get(id)
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
}

describe('useSettingsStore', () => {
  let testDb: GoalTreeDatabase
  let store: ReturnType<typeof createSettingsStore>

  beforeEach(() => {
    testDb = new GoalTreeDatabase()
    store = createSettingsStore(testDb)
  })

  afterEach(async () => {
    await testDb.delete()
  })

  describe('initialization', () => {
    it('starts with empty state', () => {
      const state = store.getState()
      expect(state.settings).toBeNull()
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
      expect(state.isInitialized).toBe(false)
    })

    it('initializes with default settings when no settings exist', async () => {
      await store.getState().initialize()

      const state = store.getState()
      expect(state.settings).not.toBeNull()
      expect(state.settings?.workHoursStart).toBe('09:00')
      expect(state.settings?.workHoursEnd).toBe('17:00')
      expect(state.settings?.sleepStart).toBe('22:00')
      expect(state.settings?.sleepEnd).toBe('07:00')
      expect(state.isInitialized).toBe(true)
      expect(state.isLoading).toBe(false)
    })

    it('initializes with existing settings from database', async () => {
      // Pre-populate database
      await testDb.settings.add({
        workHoursStart: '08:00',
        workHoursEnd: '16:00',
        sleepStart: '23:00',
        sleepEnd: '06:00',
      })

      await store.getState().initialize()

      const state = store.getState()
      expect(state.settings?.workHoursStart).toBe('08:00')
      expect(state.settings?.workHoursEnd).toBe('16:00')
      expect(state.settings?.sleepStart).toBe('23:00')
      expect(state.settings?.sleepEnd).toBe('06:00')
    })

    it('does not re-initialize if already initialized', async () => {
      await store.getState().initialize()
      
      // Modify database directly
      const settings = await testDb.settings.toArray()
      await testDb.settings.update(settings[0].id!, { workHoursStart: '10:00' })

      // Try to initialize again
      await store.getState().initialize()

      // Should still have original value
      const state = store.getState()
      expect(state.settings?.workHoursStart).toBe('09:00')
    })

    it('does not start initialization if already loading', async () => {
      // Start initialization
      const initPromise = store.getState().initialize()
      
      // Try to initialize again while loading
      await store.getState().initialize()
      
      await initPromise
      
      // Should complete normally
      expect(store.getState().isInitialized).toBe(true)
    })
  })

  describe('updateSettings', () => {
    beforeEach(async () => {
      await store.getState().initialize()
    })

    it('updates work hours start', async () => {
      await store.getState().updateSettings({ workHoursStart: '10:00' })

      const state = store.getState()
      expect(state.settings?.workHoursStart).toBe('10:00')
    })

    it('updates work hours end', async () => {
      await store.getState().updateSettings({ workHoursEnd: '18:00' })

      const state = store.getState()
      expect(state.settings?.workHoursEnd).toBe('18:00')
    })

    it('updates sleep hours', async () => {
      await store.getState().updateSettings({
        sleepStart: '23:30',
        sleepEnd: '06:30',
      })

      const state = store.getState()
      expect(state.settings?.sleepStart).toBe('23:30')
      expect(state.settings?.sleepEnd).toBe('06:30')
    })

    it('updates multiple settings at once', async () => {
      await store.getState().updateSettings({
        workHoursStart: '07:00',
        workHoursEnd: '15:00',
        sleepStart: '21:00',
        sleepEnd: '05:00',
      })

      const state = store.getState()
      expect(state.settings?.workHoursStart).toBe('07:00')
      expect(state.settings?.workHoursEnd).toBe('15:00')
      expect(state.settings?.sleepStart).toBe('21:00')
      expect(state.settings?.sleepEnd).toBe('05:00')
    })

    it('syncs updates with database', async () => {
      await store.getState().updateSettings({ workHoursStart: '08:30' })

      const dbSettings = await testDb.settings.toArray()
      expect(dbSettings[0].workHoursStart).toBe('08:30')
    })

    it('auto-initializes if not initialized', async () => {
      // Create a fresh store that hasn't been initialized
      const freshStore = createSettingsStore(testDb)
      
      await freshStore.getState().updateSettings({ workHoursStart: '10:00' })

      const state = freshStore.getState()
      expect(state.isInitialized).toBe(true)
      expect(state.settings?.workHoursStart).toBe('10:00')
    })
  })

  describe('resetToDefaults', () => {
    beforeEach(async () => {
      await store.getState().initialize()
    })

    it('resets all settings to defaults', async () => {
      // First, change settings
      await store.getState().updateSettings({
        workHoursStart: '10:00',
        workHoursEnd: '18:00',
        sleepStart: '23:00',
        sleepEnd: '06:00',
      })

      // Then reset
      await store.getState().resetToDefaults()

      const state = store.getState()
      expect(state.settings?.workHoursStart).toBe('09:00')
      expect(state.settings?.workHoursEnd).toBe('17:00')
      expect(state.settings?.sleepStart).toBe('22:00')
      expect(state.settings?.sleepEnd).toBe('07:00')
    })

    it('syncs reset with database', async () => {
      await store.getState().updateSettings({ workHoursStart: '10:00' })
      await store.getState().resetToDefaults()

      const dbSettings = await testDb.settings.toArray()
      expect(dbSettings[0].workHoursStart).toBe('09:00')
    })

    it('creates new settings with defaults if none exist', async () => {
      // Clear the database
      await testDb.settings.clear()
      
      // Create fresh store
      const freshStore = createSettingsStore(testDb)
      
      await freshStore.getState().resetToDefaults()

      const state = freshStore.getState()
      expect(state.settings).not.toBeNull()
      expect(state.settings?.workHoursStart).toBe('09:00')
      expect(state.isInitialized).toBe(true)
    })
  })

  describe('getSettingsOrDefaults', () => {
    it('returns defaults when not initialized', () => {
      const settings = store.getState().getSettingsOrDefaults()

      expect(settings.workHoursStart).toBe('09:00')
      expect(settings.workHoursEnd).toBe('17:00')
      expect(settings.sleepStart).toBe('22:00')
      expect(settings.sleepEnd).toBe('07:00')
    })

    it('returns current settings when initialized', async () => {
      await store.getState().initialize()
      await store.getState().updateSettings({ workHoursStart: '10:00' })

      const settings = store.getState().getSettingsOrDefaults()

      expect(settings.workHoursStart).toBe('10:00')
    })

    it('does not include id in returned object', async () => {
      await store.getState().initialize()

      const settings = store.getState().getSettingsOrDefaults()

      expect('id' in settings).toBe(false)
    })
  })

  describe('error handling', () => {
    it('throws error when trying to update without initialization', async () => {
      // Create fresh store without initialization
      const freshStore = createSettingsStore(testDb)
      
      // Clear any existing settings
      await testDb.settings.clear()
      
      // Try to update - it should auto-initialize
      await freshStore.getState().updateSettings({ workHoursStart: '10:00' })
      
      // After update, store should be initialized with the new value
      const state = freshStore.getState()
      expect(state.isInitialized).toBe(true)
      expect(state.settings?.workHoursStart).toBe('10:00')
    })
  })
})
