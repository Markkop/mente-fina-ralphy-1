import { create } from 'zustand'
import {
  type Goal,
  type Task,
  type NodeStatus,
  goalRepository,
  type CreateGoalInput,
  type CreateTaskInput,
  type TreeNode,
  GoalTreeDatabase,
} from '@/src/db'
import { GoalRepository } from '@/src/db/goal-repository'

/**
 * Hierarchical tree node with children
 */
export interface TreeNodeWithChildren extends Omit<TreeNode, 'nodeType'> {
  nodeType: 'goal' | 'requirement' | 'milestone' | 'task'
  children: TreeNodeWithChildren[]
}

/**
 * Goal store state
 */
interface GoalStoreState {
  /** Root goals (goals without a parent) */
  rootGoals: TreeNodeWithChildren[]
  /** Flat map of all nodes by id and type for quick lookup */
  nodesById: Map<string, TreeNodeWithChildren>
  /** Loading state */
  isLoading: boolean
  /** Error state */
  error: string | null
  /** Whether the store has been initialized */
  isInitialized: boolean
}

/**
 * Goal store actions
 */
interface GoalStoreActions {
  /** Initialize the store by loading all data from Dexie */
  initialize: () => Promise<void>
  /** Refresh the store from Dexie */
  refresh: () => Promise<void>
  /** Add a new goal */
  addGoal: (input: Omit<CreateGoalInput, 'type'>) => Promise<number>
  /** Add a new milestone */
  addMilestone: (input: Omit<CreateGoalInput, 'type'>) => Promise<number>
  /** Add a new requirement */
  addRequirement: (input: Omit<CreateGoalInput, 'type'>) => Promise<number>
  /** Add a new task */
  addTask: (input: Omit<CreateTaskInput, 'nodeType'>) => Promise<number>
  /** Update a goal */
  updateGoal: (id: number, updates: Partial<Omit<Goal, 'id' | 'createdAt'>>) => Promise<void>
  /** Update a task */
  updateTask: (id: number, updates: Partial<Omit<Task, 'id' | 'createdAt'>>) => Promise<void>
  /** Update a goal's status */
  updateGoalStatus: (id: number, status: NodeStatus) => Promise<void>
  /** Toggle task completion */
  toggleTaskCompletion: (id: number) => Promise<boolean>
  /** Delete a node and all its descendants */
  deleteNode: (id: number, nodeType: 'goal' | 'task') => Promise<number>
  /** Move a node to a new parent */
  moveNode: (id: number, nodeType: 'goal' | 'task', newParentId: number | null, newOrder?: number) => Promise<void>
  /** Reorder siblings */
  reorderSiblings: (parentId: number | null, orderedIds: number[], nodeType: 'goal' | 'task') => Promise<void>
  /** Get a node by id */
  getNode: (id: number, nodeType: 'goal' | 'task') => TreeNodeWithChildren | undefined
  /** Get children of a node */
  getChildren: (parentId: number) => TreeNodeWithChildren[]
  /** Reset store to initial state (used after clearing data) */
  reset: () => void
}

type GoalStore = GoalStoreState & GoalStoreActions

/**
 * Creates a node key for the nodesById map
 */
function nodeKey(id: number, nodeType: 'goal' | 'task'): string {
  return `${nodeType}:${id}`
}

/**
 * Builds the tree structure from flat goals and tasks arrays
 */
async function buildTree(repository: GoalRepository): Promise<{
  rootGoals: TreeNodeWithChildren[]
  nodesById: Map<string, TreeNodeWithChildren>
}> {
  const nodesById = new Map<string, TreeNodeWithChildren>()

  // Get all goals and tasks from the repository's database
  const allGoals = await repository.getRootGoals()
  const rootGoals: TreeNodeWithChildren[] = []

  // Recursive function to build tree for a goal
  async function buildNodeTree(goal: Goal): Promise<TreeNodeWithChildren> {
    const goalNode: TreeNodeWithChildren = {
      ...goal,
      nodeType: goal.type as 'goal' | 'requirement' | 'milestone',
      children: [],
    }
    nodesById.set(nodeKey(goal.id!, 'goal'), goalNode)

    // Get children
    const children = await repository.getChildren(goal.id!)
    for (const child of children) {
      if (child.nodeType === 'task') {
        const taskNode: TreeNodeWithChildren = {
          ...child,
          nodeType: 'task',
          children: [], // Tasks don't have children
        }
        nodesById.set(nodeKey(child.id!, 'task'), taskNode)
        goalNode.children.push(taskNode)
      } else {
        // For goal/milestone/requirement, recursively build tree
        const childGoal = await repository.getGoal(child.id!)
        if (childGoal) {
          const childNode = await buildNodeTree(childGoal)
          goalNode.children.push(childNode)
        }
      }
    }

    return goalNode
  }

  // Build tree for each root goal
  for (const rootGoal of allGoals) {
    const rootNode = await buildNodeTree(rootGoal)
    rootGoals.push(rootNode)
  }

  // Sort root goals by order
  rootGoals.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  return { rootGoals, nodesById }
}

/**
 * Creates the goal store with optional database injection for testing
 */
export function createGoalStore(database?: GoalTreeDatabase) {
  const repository = database ? new GoalRepository(database) : goalRepository

  return create<GoalStore>((set, get) => ({
    // Initial state
    rootGoals: [],
    nodesById: new Map(),
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
        const { rootGoals, nodesById } = await buildTree(repository)
        set({
          rootGoals,
          nodesById,
          isLoading: false,
          isInitialized: true,
        })
      } catch (error) {
        set({
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to initialize store',
        })
      }
    },

    refresh: async () => {
      set({ isLoading: true, error: null })

      try {
        const { rootGoals, nodesById } = await buildTree(repository)
        set({
          rootGoals,
          nodesById,
          isLoading: false,
        })
      } catch (error) {
        set({
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to refresh store',
        })
      }
    },

    addGoal: async (input) => {
      try {
        const id = await repository.addGoal(input)
        await get().refresh()
        return id
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to add goal' })
        throw error
      }
    },

    addMilestone: async (input) => {
      try {
        const id = await repository.addMilestone(input)
        await get().refresh()
        return id
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to add milestone' })
        throw error
      }
    },

    addRequirement: async (input) => {
      try {
        const id = await repository.addRequirement(input)
        await get().refresh()
        return id
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to add requirement' })
        throw error
      }
    },

    addTask: async (input) => {
      try {
        const id = await repository.addTask(input)
        await get().refresh()
        return id
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to add task' })
        throw error
      }
    },

    updateGoal: async (id, updates) => {
      try {
        await repository.updateGoal(id, updates)
        await get().refresh()
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to update goal' })
        throw error
      }
    },

    updateTask: async (id, updates) => {
      try {
        await repository.updateTask(id, updates)
        await get().refresh()
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to update task' })
        throw error
      }
    },

    updateGoalStatus: async (id, status) => {
      try {
        await repository.updateGoalStatus(id, status)
        await get().refresh()
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to update goal status' })
        throw error
      }
    },

    toggleTaskCompletion: async (id) => {
      try {
        const result = await repository.toggleTaskCompletion(id)
        await get().refresh()
        return result
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to toggle task completion' })
        throw error
      }
    },

    deleteNode: async (id, nodeType) => {
      try {
        const count = await repository.deleteNode(id, nodeType)
        await get().refresh()
        return count
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to delete node' })
        throw error
      }
    },

    moveNode: async (id, nodeType, newParentId, newOrder) => {
      try {
        await repository.moveNode(id, nodeType, newParentId, newOrder)
        await get().refresh()
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to move node' })
        throw error
      }
    },

    reorderSiblings: async (parentId, orderedIds, nodeType) => {
      try {
        await repository.reorderSiblings(parentId, orderedIds, nodeType)
        await get().refresh()
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to reorder siblings' })
        throw error
      }
    },

    getNode: (id, nodeType) => {
      return get().nodesById.get(nodeKey(id, nodeType))
    },

    getChildren: (parentId) => {
      const node = get().nodesById.get(nodeKey(parentId, 'goal'))
      return node?.children ?? []
    },

    reset: () => {
      set({
        rootGoals: [],
        nodesById: new Map(),
        isLoading: false,
        error: null,
        isInitialized: false,
      })
    },
  }))
}

/**
 * Default goal store using the singleton database
 */
export const useGoalStore = createGoalStore()
