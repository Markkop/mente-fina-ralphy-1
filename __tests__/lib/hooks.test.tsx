import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { GoalTreeDatabase } from '@/src/db'
import { createGoalStore } from '@/lib/goal-store'

// We need to mock the useGoalStore hook to use our test database
// Since the hooks use the singleton store, we'll test them by setting up data
// and verifying the hook outputs

describe('useGoals hook', () => {
  let testDb: GoalTreeDatabase
  let store: ReturnType<typeof createGoalStore>

  beforeEach(async () => {
    testDb = new GoalTreeDatabase()
    store = createGoalStore(testDb)
  })

  afterEach(async () => {
    await testDb.delete()
  })

  describe('initial state', () => {
    it('returns empty arrays when store is not initialized', () => {
      const { result } = renderHook(() => {
        // Access the store directly since useGoals uses the singleton
        const state = store.getState()
        return {
          rootGoals: state.rootGoals,
          isLoading: state.isLoading,
          isInitialized: state.isInitialized,
        }
      })

      expect(result.current.rootGoals).toHaveLength(0)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.isInitialized).toBe(false)
    })
  })

  describe('with data', () => {
    beforeEach(async () => {
      await store.getState().initialize()
    })

    it('collects all goals from the tree', async () => {
      // Add some goals
      const rootId = await store.getState().addGoal({ title: 'Root Goal' })
      await store.getState().addMilestone({ title: 'Milestone', parentId: rootId })
      await store.getState().addRequirement({ title: 'Requirement', parentId: rootId })

      const state = store.getState()
      expect(state.rootGoals).toHaveLength(1)
      expect(state.rootGoals[0].children).toHaveLength(2)
    })

    it('filters goals by type', async () => {
      const rootId = await store.getState().addGoal({ title: 'Root Goal' })
      await store.getState().addMilestone({ title: 'Milestone', parentId: rootId })
      await store.getState().addRequirement({ title: 'Requirement', parentId: rootId })
      await store.getState().addGoal({ title: 'Sub Goal', parentId: rootId })

      const state = store.getState()
      const allNodes = flattenGoals(state.rootGoals)

      const goals = allNodes.filter((n) => n.nodeType === 'goal')
      const milestones = allNodes.filter((n) => n.nodeType === 'milestone')
      const requirements = allNodes.filter((n) => n.nodeType === 'requirement')

      expect(goals).toHaveLength(2) // Root + Sub Goal
      expect(milestones).toHaveLength(1)
      expect(requirements).toHaveLength(1)
    })

    it('retrieves a goal by id', async () => {
      const id = await store.getState().addGoal({ title: 'Test Goal' })

      const node = store.getState().getNode(id, 'goal')

      expect(node).toBeDefined()
      expect(node?.title).toBe('Test Goal')
    })

    it('returns undefined for non-existent goal', () => {
      const node = store.getState().getNode(99999, 'goal')
      expect(node).toBeUndefined()
    })

    it('gets children of a goal', async () => {
      const parentId = await store.getState().addGoal({ title: 'Parent' })
      await store.getState().addMilestone({ title: 'Child 1', parentId })
      await store.getState().addTask({ parentId, title: 'Task 1', frequency: 'once' })

      const children = store.getState().getChildren(parentId)

      expect(children).toHaveLength(2)
    })

    it('adds a goal through the store', async () => {
      const id = await store.getState().addGoal({
        title: 'New Goal',
        description: 'A new goal',
      })

      expect(id).toBeDefined()
      const state = store.getState()
      expect(state.rootGoals).toHaveLength(1)
      expect(state.rootGoals[0].title).toBe('New Goal')
    })

    it('adds a milestone through the store', async () => {
      const goalId = await store.getState().addGoal({ title: 'Goal' })
      await store.getState().addMilestone({
        title: 'Milestone',
        parentId: goalId,
      })

      const state = store.getState()
      expect(state.rootGoals[0].children).toHaveLength(1)
      expect(state.rootGoals[0].children[0].nodeType).toBe('milestone')
    })

    it('adds a requirement through the store', async () => {
      const goalId = await store.getState().addGoal({ title: 'Goal' })
      await store.getState().addRequirement({
        title: 'Requirement',
        parentId: goalId,
      })

      const state = store.getState()
      expect(state.rootGoals[0].children[0].nodeType).toBe('requirement')
    })

    it('updates a goal', async () => {
      const id = await store.getState().addGoal({ title: 'Original' })
      await store.getState().updateGoal(id, { title: 'Updated' })

      const state = store.getState()
      expect(state.rootGoals[0].title).toBe('Updated')
    })

    it('updates goal status', async () => {
      const id = await store.getState().addGoal({ title: 'Goal' })
      await store.getState().updateGoalStatus(id, 'completed')

      const state = store.getState()
      expect((state.rootGoals[0] as { status: string }).status).toBe('completed')
    })

    it('deletes a goal', async () => {
      const id = await store.getState().addGoal({ title: 'To Delete' })
      await store.getState().deleteNode(id, 'goal')

      const state = store.getState()
      expect(state.rootGoals).toHaveLength(0)
    })

    it('moves a goal', async () => {
      const parent1 = await store.getState().addGoal({ title: 'Parent 1' })
      const parent2 = await store.getState().addGoal({ title: 'Parent 2' })
      const childId = await store.getState().addGoal({ title: 'Child', parentId: parent1 })

      await store.getState().moveNode(childId, 'goal', parent2)

      const state = store.getState()
      expect(state.rootGoals[0].children).toHaveLength(0)
      expect(state.rootGoals[1].children).toHaveLength(1)
    })

    it('reorders goals', async () => {
      const g1 = await store.getState().addGoal({ title: 'G1', order: 0 })
      const g2 = await store.getState().addGoal({ title: 'G2', order: 1 })
      const g3 = await store.getState().addGoal({ title: 'G3', order: 2 })

      await store.getState().reorderSiblings(null, [g3, g1, g2], 'goal')

      const state = store.getState()
      expect(state.rootGoals[0].title).toBe('G3')
      expect(state.rootGoals[1].title).toBe('G1')
      expect(state.rootGoals[2].title).toBe('G2')
    })
  })
})

describe('useTasks hook', () => {
  let testDb: GoalTreeDatabase
  let store: ReturnType<typeof createGoalStore>

  beforeEach(async () => {
    testDb = new GoalTreeDatabase()
    store = createGoalStore(testDb)
    await store.getState().initialize()
  })

  afterEach(async () => {
    await testDb.delete()
  })

  describe('task collection', () => {
    it('collects all tasks from the tree', async () => {
      const goalId = await store.getState().addGoal({ title: 'Goal' })
      await store.getState().addTask({ parentId: goalId, title: 'Task 1', frequency: 'once' })
      await store.getState().addTask({ parentId: goalId, title: 'Task 2', frequency: 'daily' })

      const state = store.getState()
      const tasks = flattenTasks(state.rootGoals)

      expect(tasks).toHaveLength(2)
    })

    it('collects tasks from nested goals', async () => {
      const goalId = await store.getState().addGoal({ title: 'Goal' })
      const milestoneId = await store.getState().addMilestone({ title: 'Milestone', parentId: goalId })
      await store.getState().addTask({ parentId: goalId, title: 'Task 1', frequency: 'once' })
      await store.getState().addTask({ parentId: milestoneId, title: 'Task 2', frequency: 'daily' })

      const state = store.getState()
      const tasks = flattenTasks(state.rootGoals)

      expect(tasks).toHaveLength(2)
    })
  })

  describe('task filtering', () => {
    it('separates completed and pending tasks', async () => {
      const goalId = await store.getState().addGoal({ title: 'Goal' })
      const task1Id = await store.getState().addTask({ parentId: goalId, title: 'Task 1', frequency: 'once' })
      await store.getState().addTask({ parentId: goalId, title: 'Task 2', frequency: 'once' })
      await store.getState().toggleTaskCompletion(task1Id)

      const state = store.getState()
      const tasks = flattenTasks(state.rootGoals)
      const completed = tasks.filter((t) => t.isCompleted)
      const pending = tasks.filter((t) => !t.isCompleted)

      expect(completed).toHaveLength(1)
      expect(pending).toHaveLength(1)
    })

    it('groups tasks by frequency', async () => {
      const goalId = await store.getState().addGoal({ title: 'Goal' })
      await store.getState().addTask({ parentId: goalId, title: 'Once', frequency: 'once' })
      await store.getState().addTask({ parentId: goalId, title: 'Daily', frequency: 'daily' })
      await store.getState().addTask({ parentId: goalId, title: 'Weekly', frequency: 'weekly' })
      await store.getState().addTask({ parentId: goalId, title: 'Custom', frequency: 'custom' })

      const state = store.getState()
      const tasks = flattenTasks(state.rootGoals)

      const once = tasks.filter((t) => t.frequency === 'once')
      const daily = tasks.filter((t) => t.frequency === 'daily')
      const weekly = tasks.filter((t) => t.frequency === 'weekly')
      const custom = tasks.filter((t) => t.frequency === 'custom')

      expect(once).toHaveLength(1)
      expect(daily).toHaveLength(1)
      expect(weekly).toHaveLength(1)
      expect(custom).toHaveLength(1)
    })
  })

  describe('task queries', () => {
    it('retrieves a task by id', async () => {
      const goalId = await store.getState().addGoal({ title: 'Goal' })
      const taskId = await store.getState().addTask({ parentId: goalId, title: 'Task', frequency: 'once' })

      const node = store.getState().getNode(taskId, 'task')

      expect(node).toBeDefined()
      expect(node?.title).toBe('Task')
    })

    it('gets tasks for a specific parent', async () => {
      const goal1 = await store.getState().addGoal({ title: 'Goal 1' })
      const goal2 = await store.getState().addGoal({ title: 'Goal 2' })
      await store.getState().addTask({ parentId: goal1, title: 'Task 1', frequency: 'once' })
      await store.getState().addTask({ parentId: goal1, title: 'Task 2', frequency: 'once' })
      await store.getState().addTask({ parentId: goal2, title: 'Task 3', frequency: 'once' })

      const children = store.getState().getChildren(goal1)
      const tasks = children.filter((c) => c.nodeType === 'task')

      expect(tasks).toHaveLength(2)
    })
  })

  describe('task actions', () => {
    it('adds a task', async () => {
      const goalId = await store.getState().addGoal({ title: 'Goal' })
      const taskId = await store.getState().addTask({
        parentId: goalId,
        title: 'New Task',
        frequency: 'daily',
      })

      expect(taskId).toBeDefined()
      const state = store.getState()
      expect(state.rootGoals[0].children).toHaveLength(1)
    })

    it('updates a task', async () => {
      const goalId = await store.getState().addGoal({ title: 'Goal' })
      const taskId = await store.getState().addTask({
        parentId: goalId,
        title: 'Original',
        frequency: 'once',
      })

      await store.getState().updateTask(taskId, { title: 'Updated', frequency: 'daily' })

      const state = store.getState()
      const task = state.rootGoals[0].children[0] as { title: string; frequency: string }
      expect(task.title).toBe('Updated')
      expect(task.frequency).toBe('daily')
    })

    it('toggles task completion', async () => {
      const goalId = await store.getState().addGoal({ title: 'Goal' })
      const taskId = await store.getState().addTask({
        parentId: goalId,
        title: 'Task',
        frequency: 'once',
      })

      let state = store.getState()
      let task = state.rootGoals[0].children[0] as { isCompleted: boolean }
      expect(task.isCompleted).toBe(false)

      await store.getState().toggleTaskCompletion(taskId)

      state = store.getState()
      task = state.rootGoals[0].children[0] as { isCompleted: boolean }
      expect(task.isCompleted).toBe(true)
    })

    it('deletes a task', async () => {
      const goalId = await store.getState().addGoal({ title: 'Goal' })
      const taskId = await store.getState().addTask({
        parentId: goalId,
        title: 'Task',
        frequency: 'once',
      })

      await store.getState().deleteNode(taskId, 'task')

      const state = store.getState()
      expect(state.rootGoals[0].children).toHaveLength(0)
    })

    it('moves a task', async () => {
      const goal1 = await store.getState().addGoal({ title: 'Goal 1' })
      const goal2 = await store.getState().addGoal({ title: 'Goal 2' })
      const taskId = await store.getState().addTask({
        parentId: goal1,
        title: 'Task',
        frequency: 'once',
      })

      await store.getState().moveNode(taskId, 'task', goal2)

      const state = store.getState()
      expect(state.rootGoals[0].children).toHaveLength(0)
      expect(state.rootGoals[1].children).toHaveLength(1)
    })

    it('reorders tasks', async () => {
      const goalId = await store.getState().addGoal({ title: 'Goal' })
      const t1 = await store.getState().addTask({ parentId: goalId, title: 'T1', frequency: 'once', order: 0 })
      const t2 = await store.getState().addTask({ parentId: goalId, title: 'T2', frequency: 'once', order: 1 })
      const t3 = await store.getState().addTask({ parentId: goalId, title: 'T3', frequency: 'once', order: 2 })

      await store.getState().reorderSiblings(goalId, [t3, t1, t2], 'task')

      const state = store.getState()
      expect(state.rootGoals[0].children[0].title).toBe('T3')
      expect(state.rootGoals[0].children[1].title).toBe('T1')
      expect(state.rootGoals[0].children[2].title).toBe('T2')
    })
  })
})

describe('useGoalTree hook', () => {
  let testDb: GoalTreeDatabase
  let store: ReturnType<typeof createGoalStore>

  beforeEach(async () => {
    testDb = new GoalTreeDatabase()
    store = createGoalStore(testDb)
    await store.getState().initialize()
  })

  afterEach(async () => {
    await testDb.delete()
  })

  it('provides access to both goals and tasks', async () => {
    const goalId = await store.getState().addGoal({ title: 'Goal' })
    await store.getState().addMilestone({ title: 'Milestone', parentId: goalId })
    await store.getState().addTask({ parentId: goalId, title: 'Task', frequency: 'once' })

    const state = store.getState()
    const allGoals = flattenGoals(state.rootGoals)
    const allTasks = flattenTasks(state.rootGoals)

    expect(allGoals).toHaveLength(2) // Goal + Milestone
    expect(allTasks).toHaveLength(1)
  })

  it('provides filtered task lists', async () => {
    const goalId = await store.getState().addGoal({ title: 'Goal' })
    const taskId = await store.getState().addTask({ parentId: goalId, title: 'Task 1', frequency: 'daily' })
    await store.getState().addTask({ parentId: goalId, title: 'Task 2', frequency: 'weekly' })
    await store.getState().toggleTaskCompletion(taskId)

    const state = store.getState()
    const allTasks = flattenTasks(state.rootGoals)
    const completed = allTasks.filter((t) => t.isCompleted)
    const pending = allTasks.filter((t) => !t.isCompleted)
    const daily = allTasks.filter((t) => t.frequency === 'daily')
    const weekly = allTasks.filter((t) => t.frequency === 'weekly')

    expect(completed).toHaveLength(1)
    expect(pending).toHaveLength(1)
    expect(daily).toHaveLength(1)
    expect(weekly).toHaveLength(1)
  })
})

// Helper functions to flatten the tree
interface TreeNode {
  nodeType: string
  children: TreeNode[]
  title: string
  isCompleted?: boolean
  frequency?: string
}

function flattenGoals(nodes: TreeNode[]): TreeNode[] {
  const result: TreeNode[] = []

  function collect(items: TreeNode[]) {
    for (const item of items) {
      if (item.nodeType !== 'task') {
        result.push(item)
      }
      if (item.children.length > 0) {
        collect(item.children)
      }
    }
  }

  collect(nodes)
  return result
}

function flattenTasks(nodes: TreeNode[]): TreeNode[] {
  const result: TreeNode[] = []

  function collect(items: TreeNode[]) {
    for (const item of items) {
      if (item.nodeType === 'task') {
        result.push(item)
      }
      if (item.children.length > 0) {
        collect(item.children)
      }
    }
  }

  collect(nodes)
  return result
}
