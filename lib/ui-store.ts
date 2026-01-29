'use client'

import { create } from 'zustand'
import type { TreeNodeWithChildren } from '@/lib/goal-store'

/**
 * UI Store state for managing dialogs and UI interactions
 */
interface UIStoreState {
  /** Whether the add child dialog is open */
  addChildDialogOpen: boolean
  /** The selected parent node for the add child dialog (null = create root goal) */
  selectedParentNode: TreeNodeWithChildren | null
  /** Whether the delete confirmation dialog is open */
  deleteDialogOpen: boolean
  /** The node selected for deletion */
  nodeToDelete: TreeNodeWithChildren | null
  /** Whether the settings modal is open */
  settingsModalOpen: boolean
}

/**
 * UI Store actions
 */
interface UIStoreActions {
  /** Open the add child dialog for a specific parent node */
  openAddChildDialog: (parentNode: TreeNodeWithChildren | null) => void
  /** Close the add child dialog */
  closeAddChildDialog: () => void
  /** Set the add child dialog open state */
  setAddChildDialogOpen: (open: boolean) => void
  /** Open the delete confirmation dialog for a specific node */
  openDeleteDialog: (node: TreeNodeWithChildren) => void
  /** Close the delete confirmation dialog */
  closeDeleteDialog: () => void
  /** Set the delete dialog open state */
  setDeleteDialogOpen: (open: boolean) => void
  /** Open the settings modal */
  openSettingsModal: () => void
  /** Close the settings modal */
  closeSettingsModal: () => void
  /** Set the settings modal open state */
  setSettingsModalOpen: (open: boolean) => void
  /** Reset all UI state */
  resetUIState: () => void
}

type UIStore = UIStoreState & UIStoreActions

/**
 * Initial state for the UI store
 */
const initialState: UIStoreState = {
  addChildDialogOpen: false,
  selectedParentNode: null,
  deleteDialogOpen: false,
  nodeToDelete: null,
  settingsModalOpen: false,
}

/**
 * Creates the UI store with optional initial state for testing
 */
export function createUIStore(initialOverrides?: Partial<UIStoreState>) {
  return create<UIStore>((set) => ({
    // Initial state
    ...initialState,
    ...initialOverrides,

    // Actions
    openAddChildDialog: (parentNode) =>
      set({
        addChildDialogOpen: true,
        selectedParentNode: parentNode,
      }),

    closeAddChildDialog: () =>
      set({
        addChildDialogOpen: false,
        selectedParentNode: null,
      }),

    setAddChildDialogOpen: (open) =>
      set((state) => ({
        addChildDialogOpen: open,
        // Clear parent node when closing
        selectedParentNode: open ? state.selectedParentNode : null,
      })),

    openDeleteDialog: (node) =>
      set({
        deleteDialogOpen: true,
        nodeToDelete: node,
      }),

    closeDeleteDialog: () =>
      set({
        deleteDialogOpen: false,
        nodeToDelete: null,
      }),

    setDeleteDialogOpen: (open) =>
      set((state) => ({
        deleteDialogOpen: open,
        // Clear node when closing
        nodeToDelete: open ? state.nodeToDelete : null,
      })),

    openSettingsModal: () =>
      set({
        settingsModalOpen: true,
      }),

    closeSettingsModal: () =>
      set({
        settingsModalOpen: false,
      }),

    setSettingsModalOpen: (open) =>
      set({
        settingsModalOpen: open,
      }),

    resetUIState: () =>
      set(initialState),
  }))
}

/**
 * Default UI store using singleton pattern
 */
export const useUIStore = createUIStore()
