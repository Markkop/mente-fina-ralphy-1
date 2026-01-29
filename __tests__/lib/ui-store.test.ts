import { describe, it, expect, beforeEach } from 'vitest'
import { createUIStore } from '@/lib/ui-store'
import type { TreeNodeWithChildren } from '@/lib/goal-store'

// Helper to create a mock node
function createMockNode(overrides: Partial<TreeNodeWithChildren> = {}): TreeNodeWithChildren {
  return {
    id: 1,
    title: 'Test Node',
    nodeType: 'goal',
    status: 'active',
    type: 'goal',
    createdAt: new Date(),
    children: [],
    ...overrides,
  }
}

describe('UI Store', () => {
  describe('initial state', () => {
    it('should have addChildDialogOpen as false by default', () => {
      const store = createUIStore()
      expect(store.getState().addChildDialogOpen).toBe(false)
    })

    it('should have selectedParentNode as null by default', () => {
      const store = createUIStore()
      expect(store.getState().selectedParentNode).toBeNull()
    })

    it('should have deleteDialogOpen as false by default', () => {
      const store = createUIStore()
      expect(store.getState().deleteDialogOpen).toBe(false)
    })

    it('should have nodeToDelete as null by default', () => {
      const store = createUIStore()
      expect(store.getState().nodeToDelete).toBeNull()
    })

    it('should have settingsModalOpen as false by default', () => {
      const store = createUIStore()
      expect(store.getState().settingsModalOpen).toBe(false)
    })

    it('should accept initial state overrides', () => {
      const store = createUIStore({
        addChildDialogOpen: true,
        settingsModalOpen: true,
      })
      expect(store.getState().addChildDialogOpen).toBe(true)
      expect(store.getState().settingsModalOpen).toBe(true)
    })
  })

  describe('add child dialog actions', () => {
    let store: ReturnType<typeof createUIStore>

    beforeEach(() => {
      store = createUIStore()
    })

    describe('openAddChildDialog', () => {
      it('should open the dialog and set the parent node', () => {
        const parentNode = createMockNode({ id: 1, title: 'Parent Goal' })
        store.getState().openAddChildDialog(parentNode)

        expect(store.getState().addChildDialogOpen).toBe(true)
        expect(store.getState().selectedParentNode).toBe(parentNode)
      })

      it('should allow null parent node for root goal creation', () => {
        store.getState().openAddChildDialog(null)

        expect(store.getState().addChildDialogOpen).toBe(true)
        expect(store.getState().selectedParentNode).toBeNull()
      })

      it('should replace existing parent node when called again', () => {
        const firstParent = createMockNode({ id: 1, title: 'First Parent' })
        const secondParent = createMockNode({ id: 2, title: 'Second Parent' })

        store.getState().openAddChildDialog(firstParent)
        store.getState().openAddChildDialog(secondParent)

        expect(store.getState().selectedParentNode).toBe(secondParent)
      })
    })

    describe('closeAddChildDialog', () => {
      it('should close the dialog and clear the parent node', () => {
        const parentNode = createMockNode()
        store.getState().openAddChildDialog(parentNode)
        store.getState().closeAddChildDialog()

        expect(store.getState().addChildDialogOpen).toBe(false)
        expect(store.getState().selectedParentNode).toBeNull()
      })
    })

    describe('setAddChildDialogOpen', () => {
      it('should open the dialog when true', () => {
        store.getState().setAddChildDialogOpen(true)
        expect(store.getState().addChildDialogOpen).toBe(true)
      })

      it('should close the dialog and clear parent node when false', () => {
        const parentNode = createMockNode()
        store.getState().openAddChildDialog(parentNode)
        store.getState().setAddChildDialogOpen(false)

        expect(store.getState().addChildDialogOpen).toBe(false)
        expect(store.getState().selectedParentNode).toBeNull()
      })

      it('should preserve parent node when setting to true while already open', () => {
        const parentNode = createMockNode()
        store.getState().openAddChildDialog(parentNode)
        store.getState().setAddChildDialogOpen(true)

        expect(store.getState().addChildDialogOpen).toBe(true)
        expect(store.getState().selectedParentNode).toBe(parentNode)
      })
    })
  })

  describe('delete dialog actions', () => {
    let store: ReturnType<typeof createUIStore>

    beforeEach(() => {
      store = createUIStore()
    })

    describe('openDeleteDialog', () => {
      it('should open the dialog and set the node to delete', () => {
        const node = createMockNode({ id: 1, title: 'Node to Delete' })
        store.getState().openDeleteDialog(node)

        expect(store.getState().deleteDialogOpen).toBe(true)
        expect(store.getState().nodeToDelete).toBe(node)
      })

      it('should work with different node types', () => {
        const taskNode = createMockNode({ id: 1, nodeType: 'task', title: 'Task' })
        store.getState().openDeleteDialog(taskNode)

        expect(store.getState().nodeToDelete).toBe(taskNode)
        expect(store.getState().nodeToDelete?.nodeType).toBe('task')
      })
    })

    describe('closeDeleteDialog', () => {
      it('should close the dialog and clear the node to delete', () => {
        const node = createMockNode()
        store.getState().openDeleteDialog(node)
        store.getState().closeDeleteDialog()

        expect(store.getState().deleteDialogOpen).toBe(false)
        expect(store.getState().nodeToDelete).toBeNull()
      })
    })

    describe('setDeleteDialogOpen', () => {
      it('should open the dialog when true', () => {
        store.getState().setDeleteDialogOpen(true)
        expect(store.getState().deleteDialogOpen).toBe(true)
      })

      it('should close the dialog and clear node when false', () => {
        const node = createMockNode()
        store.getState().openDeleteDialog(node)
        store.getState().setDeleteDialogOpen(false)

        expect(store.getState().deleteDialogOpen).toBe(false)
        expect(store.getState().nodeToDelete).toBeNull()
      })

      it('should preserve node when setting to true while already open', () => {
        const node = createMockNode()
        store.getState().openDeleteDialog(node)
        store.getState().setDeleteDialogOpen(true)

        expect(store.getState().deleteDialogOpen).toBe(true)
        expect(store.getState().nodeToDelete).toBe(node)
      })
    })
  })

  describe('settings modal actions', () => {
    let store: ReturnType<typeof createUIStore>

    beforeEach(() => {
      store = createUIStore()
    })

    describe('openSettingsModal', () => {
      it('should open the settings modal', () => {
        store.getState().openSettingsModal()
        expect(store.getState().settingsModalOpen).toBe(true)
      })
    })

    describe('closeSettingsModal', () => {
      it('should close the settings modal', () => {
        store.getState().openSettingsModal()
        store.getState().closeSettingsModal()
        expect(store.getState().settingsModalOpen).toBe(false)
      })
    })

    describe('setSettingsModalOpen', () => {
      it('should open the modal when true', () => {
        store.getState().setSettingsModalOpen(true)
        expect(store.getState().settingsModalOpen).toBe(true)
      })

      it('should close the modal when false', () => {
        store.getState().openSettingsModal()
        store.getState().setSettingsModalOpen(false)
        expect(store.getState().settingsModalOpen).toBe(false)
      })
    })
  })

  describe('resetUIState', () => {
    it('should reset all state to initial values', () => {
      const store = createUIStore()
      const parentNode = createMockNode()
      const nodeToDelete = createMockNode({ id: 2 })

      // Set various state
      store.getState().openAddChildDialog(parentNode)
      store.getState().openDeleteDialog(nodeToDelete)
      store.getState().openSettingsModal()

      // Reset
      store.getState().resetUIState()

      // All should be reset
      expect(store.getState().addChildDialogOpen).toBe(false)
      expect(store.getState().selectedParentNode).toBeNull()
      expect(store.getState().deleteDialogOpen).toBe(false)
      expect(store.getState().nodeToDelete).toBeNull()
      expect(store.getState().settingsModalOpen).toBe(false)
    })
  })

  describe('state isolation', () => {
    it('should not affect add child dialog when delete dialog is opened', () => {
      const store = createUIStore()
      const parentNode = createMockNode({ id: 1 })
      const nodeToDelete = createMockNode({ id: 2 })

      store.getState().openAddChildDialog(parentNode)
      store.getState().openDeleteDialog(nodeToDelete)

      expect(store.getState().addChildDialogOpen).toBe(true)
      expect(store.getState().selectedParentNode).toBe(parentNode)
    })

    it('should not affect delete dialog when add child dialog is closed', () => {
      const store = createUIStore()
      const parentNode = createMockNode({ id: 1 })
      const nodeToDelete = createMockNode({ id: 2 })

      store.getState().openAddChildDialog(parentNode)
      store.getState().openDeleteDialog(nodeToDelete)
      store.getState().closeAddChildDialog()

      expect(store.getState().deleteDialogOpen).toBe(true)
      expect(store.getState().nodeToDelete).toBe(nodeToDelete)
    })

    it('should not affect settings modal when other dialogs are closed', () => {
      const store = createUIStore()
      
      store.getState().openSettingsModal()
      store.getState().openAddChildDialog(createMockNode())
      store.getState().closeAddChildDialog()

      expect(store.getState().settingsModalOpen).toBe(true)
    })
  })

  describe('multiple store instances', () => {
    it('should create independent store instances', () => {
      const store1 = createUIStore()
      const store2 = createUIStore()

      store1.getState().openSettingsModal()

      expect(store1.getState().settingsModalOpen).toBe(true)
      expect(store2.getState().settingsModalOpen).toBe(false)
    })
  })
})
