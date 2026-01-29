'use client'

import { useCallback, useMemo, useSyncExternalStore } from 'react'
import { useGoalStore, type TreeNodeWithChildren } from './goal-store'
import type { Goal, Task, NodeStatus, CreateGoalInput, CreateTaskInput, TaskFrequency } from '@/src/db'

const OPENAI_KEY_STORAGE_KEY = 'goaltree-openai-api-key'

// Custom event for localStorage changes within the same tab
const STORAGE_EVENT_NAME = 'goaltree-storage-change'

function getSnapshot(): string | null {
  if (typeof window === 'undefined') {
    return null
  }
  return localStorage.getItem(OPENAI_KEY_STORAGE_KEY)
}

function getServerSnapshot(): string | null {
  return null
}

function subscribe(callback: () => void): () => void {
  // Listen for storage events from other tabs
  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === OPENAI_KEY_STORAGE_KEY) {
      callback()
    }
  }

  // Listen for custom events from the same tab
  const handleCustomEvent = () => {
    callback()
  }

  window.addEventListener('storage', handleStorageChange)
  window.addEventListener(STORAGE_EVENT_NAME, handleCustomEvent)

  return () => {
    window.removeEventListener('storage', handleStorageChange)
    window.removeEventListener(STORAGE_EVENT_NAME, handleCustomEvent)
  }
}

/**
 * useOpenAIKey hook - manages the OpenAI API key in LocalStorage
 *
 * This hook provides a way to store and retrieve the OpenAI API key
 * from LocalStorage. The key is never sent to any backend server.
 *
 * @returns {object} - Object containing the API key and setter functions
 */
export function useOpenAIKey() {
  const apiKey = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  // Set the API key in LocalStorage
  const setApiKey = useCallback((key: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(OPENAI_KEY_STORAGE_KEY, key)
      // Dispatch custom event for same-tab updates
      window.dispatchEvent(new Event(STORAGE_EVENT_NAME))
    }
  }, [])

  // Clear the API key from LocalStorage
  const clearApiKey = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(OPENAI_KEY_STORAGE_KEY)
      // Dispatch custom event for same-tab updates
      window.dispatchEvent(new Event(STORAGE_EVENT_NAME))
    }
  }, [])

  // Check if the API key is set
  const hasApiKey = useMemo(() => apiKey !== null && apiKey.length > 0, [apiKey])

  return {
    apiKey,
    hasApiKey,
    setApiKey,
    clearApiKey,
  }
}

/**
 * Extended Goal type with hierarchy information
 */
export interface GoalWithChildren extends Omit<Goal, 'id'> {
  id: number
  nodeType: 'goal' | 'requirement' | 'milestone'
  children: TreeNodeWithChildren[]
}

/**
 * Extended Task type with computed properties
 */
export interface TaskWithMeta extends Omit<Task, 'id'> {
  id: number
  nodeType: 'task'
}

/**
 * useGoals hook - provides access to goals, milestones, and requirements
 *
 * This hook exposes goal-related state and actions for components to use.
 * It abstracts away the underlying Zustand store complexity.
 */
export function useGoals() {
  const store = useGoalStore()

  // Memoized list of all goals (not tasks) flattened
  const allGoals = useMemo(() => {
    const goals: GoalWithChildren[] = []

    function collectGoals(nodes: TreeNodeWithChildren[]) {
      for (const node of nodes) {
        if (node.nodeType !== 'task') {
          goals.push(node as GoalWithChildren)
          if (node.children.length > 0) {
            collectGoals(node.children)
          }
        }
      }
    }

    collectGoals(store.rootGoals)
    return goals
  }, [store.rootGoals])

  // Get goals by type
  const goalsByType = useMemo(() => {
    const result: Record<'goal' | 'requirement' | 'milestone', GoalWithChildren[]> = {
      goal: [],
      requirement: [],
      milestone: [],
    }

    for (const goal of allGoals) {
      result[goal.nodeType].push(goal)
    }

    return result
  }, [allGoals])

  // Get a goal by ID
  const getGoalById = useCallback(
    (id: number): GoalWithChildren | undefined => {
      const node = store.getNode(id, 'goal')
      if (node && node.nodeType !== 'task') {
        return node as GoalWithChildren
      }
      return undefined
    },
    [store]
  )

  // Get children of a goal
  const getGoalChildren = useCallback(
    (parentId: number): TreeNodeWithChildren[] => {
      return store.getChildren(parentId)
    },
    [store]
  )

  // Add a goal
  const addGoal = useCallback(
    async (input: Omit<CreateGoalInput, 'type'>): Promise<number> => {
      return store.addGoal(input)
    },
    [store]
  )

  // Add a milestone
  const addMilestone = useCallback(
    async (input: Omit<CreateGoalInput, 'type'>): Promise<number> => {
      return store.addMilestone(input)
    },
    [store]
  )

  // Add a requirement
  const addRequirement = useCallback(
    async (input: Omit<CreateGoalInput, 'type'>): Promise<number> => {
      return store.addRequirement(input)
    },
    [store]
  )

  // Update a goal
  const updateGoal = useCallback(
    async (id: number, updates: Partial<Omit<Goal, 'id' | 'createdAt'>>): Promise<void> => {
      return store.updateGoal(id, updates)
    },
    [store]
  )

  // Update goal status
  const updateGoalStatus = useCallback(
    async (id: number, status: NodeStatus): Promise<void> => {
      return store.updateGoalStatus(id, status)
    },
    [store]
  )

  // Delete a goal (and all descendants)
  const deleteGoal = useCallback(
    async (id: number): Promise<number> => {
      return store.deleteNode(id, 'goal')
    },
    [store]
  )

  // Move a goal
  const moveGoal = useCallback(
    async (id: number, newParentId: number | null, newOrder?: number): Promise<void> => {
      return store.moveNode(id, 'goal', newParentId, newOrder)
    },
    [store]
  )

  // Reorder goal siblings
  const reorderGoals = useCallback(
    async (parentId: number | null, orderedIds: number[]): Promise<void> => {
      return store.reorderSiblings(parentId, orderedIds, 'goal')
    },
    [store]
  )

  return {
    // State
    rootGoals: store.rootGoals,
    allGoals,
    goalsByType,
    goals: goalsByType.goal,
    milestones: goalsByType.milestone,
    requirements: goalsByType.requirement,
    isLoading: store.isLoading,
    error: store.error,
    isInitialized: store.isInitialized,

    // Queries
    getGoalById,
    getGoalChildren,

    // Actions
    initialize: store.initialize,
    refresh: store.refresh,
    addGoal,
    addMilestone,
    addRequirement,
    updateGoal,
    updateGoalStatus,
    deleteGoal,
    moveGoal,
    reorderGoals,
  }
}

/**
 * useTasks hook - provides access to tasks
 *
 * This hook exposes task-related state and actions for components to use.
 * It provides filtering and query capabilities specific to tasks.
 */
export function useTasks() {
  const store = useGoalStore()

  // Memoized list of all tasks flattened
  const allTasks = useMemo(() => {
    const tasks: TaskWithMeta[] = []

    function collectTasks(nodes: TreeNodeWithChildren[]) {
      for (const node of nodes) {
        if (node.nodeType === 'task') {
          tasks.push(node as TaskWithMeta)
        }
        if (node.children.length > 0) {
          collectTasks(node.children)
        }
      }
    }

    collectTasks(store.rootGoals)
    return tasks
  }, [store.rootGoals])

  // Tasks grouped by completion status
  const tasksByStatus = useMemo(() => {
    const completed: TaskWithMeta[] = []
    const pending: TaskWithMeta[] = []

    for (const task of allTasks) {
      if (task.isCompleted) {
        completed.push(task)
      } else {
        pending.push(task)
      }
    }

    return { completed, pending }
  }, [allTasks])

  // Tasks grouped by frequency
  const tasksByFrequency = useMemo(() => {
    const result: Record<TaskFrequency, TaskWithMeta[]> = {
      once: [],
      daily: [],
      weekly: [],
      custom: [],
    }

    for (const task of allTasks) {
      result[task.frequency].push(task)
    }

    return result
  }, [allTasks])

  // Get a task by ID
  const getTaskById = useCallback(
    (id: number): TaskWithMeta | undefined => {
      const node = store.getNode(id, 'task')
      if (node && node.nodeType === 'task') {
        return node as TaskWithMeta
      }
      return undefined
    },
    [store]
  )

  // Get tasks for a specific parent (goal/milestone)
  const getTasksForParent = useCallback(
    (parentId: number): TaskWithMeta[] => {
      const children = store.getChildren(parentId)
      return children.filter((c): c is TaskWithMeta => c.nodeType === 'task') as TaskWithMeta[]
    },
    [store]
  )

  // Add a task
  const addTask = useCallback(
    async (input: Omit<CreateTaskInput, 'nodeType'>): Promise<number> => {
      return store.addTask(input)
    },
    [store]
  )

  // Update a task
  const updateTask = useCallback(
    async (id: number, updates: Partial<Omit<Task, 'id' | 'createdAt'>>): Promise<void> => {
      return store.updateTask(id, updates)
    },
    [store]
  )

  // Toggle task completion
  const toggleTaskCompletion = useCallback(
    async (id: number): Promise<boolean> => {
      return store.toggleTaskCompletion(id)
    },
    [store]
  )

  // Delete a task
  const deleteTask = useCallback(
    async (id: number): Promise<number> => {
      return store.deleteNode(id, 'task')
    },
    [store]
  )

  // Move a task
  const moveTask = useCallback(
    async (id: number, newParentId: number, newOrder?: number): Promise<void> => {
      return store.moveNode(id, 'task', newParentId, newOrder)
    },
    [store]
  )

  // Reorder task siblings
  const reorderTasks = useCallback(
    async (parentId: number, orderedIds: number[]): Promise<void> => {
      return store.reorderSiblings(parentId, orderedIds, 'task')
    },
    [store]
  )

  return {
    // State
    allTasks,
    completedTasks: tasksByStatus.completed,
    pendingTasks: tasksByStatus.pending,
    tasksByFrequency,
    dailyTasks: tasksByFrequency.daily,
    weeklyTasks: tasksByFrequency.weekly,
    oneTimeTasks: tasksByFrequency.once,
    customTasks: tasksByFrequency.custom,
    isLoading: store.isLoading,
    error: store.error,
    isInitialized: store.isInitialized,

    // Queries
    getTaskById,
    getTasksForParent,

    // Actions
    initialize: store.initialize,
    refresh: store.refresh,
    addTask,
    updateTask,
    toggleTaskCompletion,
    deleteTask,
    moveTask,
    reorderTasks,
  }
}

/**
 * useGoalTree hook - combined access to entire goal tree
 *
 * This hook provides a unified interface for components that need
 * access to both goals and tasks together.
 */
export function useGoalTree() {
  const goals = useGoals()
  const tasks = useTasks()

  return {
    // Combined state
    rootGoals: goals.rootGoals,
    allGoals: goals.allGoals,
    allTasks: tasks.allTasks,
    isLoading: goals.isLoading,
    error: goals.error,
    isInitialized: goals.isInitialized,

    // Goal-specific
    goals: goals.goals,
    milestones: goals.milestones,
    requirements: goals.requirements,
    getGoalById: goals.getGoalById,
    getGoalChildren: goals.getGoalChildren,
    addGoal: goals.addGoal,
    addMilestone: goals.addMilestone,
    addRequirement: goals.addRequirement,
    updateGoal: goals.updateGoal,
    updateGoalStatus: goals.updateGoalStatus,
    deleteGoal: goals.deleteGoal,
    moveGoal: goals.moveGoal,
    reorderGoals: goals.reorderGoals,

    // Task-specific
    completedTasks: tasks.completedTasks,
    pendingTasks: tasks.pendingTasks,
    dailyTasks: tasks.dailyTasks,
    weeklyTasks: tasks.weeklyTasks,
    getTaskById: tasks.getTaskById,
    getTasksForParent: tasks.getTasksForParent,
    addTask: tasks.addTask,
    updateTask: tasks.updateTask,
    toggleTaskCompletion: tasks.toggleTaskCompletion,
    deleteTask: tasks.deleteTask,
    moveTask: tasks.moveTask,
    reorderTasks: tasks.reorderTasks,

    // Shared actions
    initialize: goals.initialize,
    refresh: goals.refresh,
  }
}
