import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { GoalTreeDatabase } from '@/src/db'
import { createGoalStore, type TreeNodeWithChildren } from '@/lib/goal-store'

type GoalStoreType = ReturnType<typeof createGoalStore>

describe('useGoalStore', () => {
  let testDb: GoalTreeDatabase
  let store: GoalStoreType

  beforeEach(() => {
    testDb = new GoalTreeDatabase()
    store = createGoalStore(testDb)
  })

  afterEach(async () => {
    await testDb.delete()
  })

  describe('initialization', () => {
    it('starts with empty state', () => {
      const state = store.getState()
      expect(state.rootGoals).toHaveLength(0)
      expect(state.nodesById.size).toBe(0)
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
      expect(state.isInitialized).toBe(false)
    })

    it('initializes from empty database', async () => {
      await store.getState().initialize()

      const state = store.getState()
      expect(state.rootGoals).toHaveLength(0)
      expect(state.isLoading).toBe(false)
      expect(state.isInitialized).toBe(true)
    })

    it('initializes with existing data', async () => {
      // Seed data directly in db
      await testDb.goals.add({
        title: 'Root Goal',
        type: 'goal',
        status: 'active',
        createdAt: new Date(),
      })

      await store.getState().initialize()

      const state = store.getState()
      expect(state.rootGoals).toHaveLength(1)
      expect(state.rootGoals[0].title).toBe('Root Goal')
      expect(state.isInitialized).toBe(true)
    })

    it('does not re-initialize if already initialized', async () => {
      await store.getState().initialize()
      
      // Add data after initialization
      await testDb.goals.add({
        title: 'New Goal',
        type: 'goal',
        status: 'active',
        createdAt: new Date(),
      })

      // Try to initialize again
      await store.getState().initialize()

      // Should still have empty state since it was already initialized
      const state = store.getState()
      expect(state.rootGoals).toHaveLength(0)
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

  describe('addGoal', () => {
    beforeEach(async () => {
      await store.getState().initialize()
    })

    it('adds a root goal', async () => {
      const id = await store.getState().addGoal({
        title: 'Buy a House',
        description: 'Purchase our first home',
      })

      expect(id).toBeDefined()
      const state = store.getState()
      expect(state.rootGoals).toHaveLength(1)
      expect(state.rootGoals[0].title).toBe('Buy a House')
      expect(state.rootGoals[0].nodeType).toBe('goal')
    })

    it('adds a child goal', async () => {
      const parentId = await store.getState().addGoal({ title: 'Parent Goal' })
      await store.getState().addGoal({
        title: 'Child Goal',
        parentId,
      })

      const state = store.getState()
      expect(state.rootGoals).toHaveLength(1)
      expect(state.rootGoals[0].children).toHaveLength(1)
      expect(state.rootGoals[0].children[0].title).toBe('Child Goal')
    })

    it('syncs with Dexie', async () => {
      await store.getState().addGoal({ title: 'Test Goal' })

      const dbGoals = await testDb.goals.toArray()
      expect(dbGoals).toHaveLength(1)
      expect(dbGoals[0].title).toBe('Test Goal')
    })
  })

  describe('addMilestone', () => {
    beforeEach(async () => {
      await store.getState().initialize()
    })

    it('adds a milestone under a goal', async () => {
      const goalId = await store.getState().addGoal({ title: 'Main Goal' })
      await store.getState().addMilestone({
        title: 'First Milestone',
        parentId: goalId,
      })

      const state = store.getState()
      const milestone = state.rootGoals[0].children[0]
      expect(milestone.title).toBe('First Milestone')
      expect(milestone.nodeType).toBe('milestone')
    })
  })

  describe('addRequirement', () => {
    beforeEach(async () => {
      await store.getState().initialize()
    })

    it('adds a requirement under a goal', async () => {
      const goalId = await store.getState().addGoal({ title: 'Main Goal' })
      await store.getState().addRequirement({
        title: 'Budget: $500k',
        parentId: goalId,
      })

      const state = store.getState()
      const requirement = state.rootGoals[0].children[0]
      expect(requirement.title).toBe('Budget: $500k')
      expect(requirement.nodeType).toBe('requirement')
    })
  })

  describe('addTask', () => {
    beforeEach(async () => {
      await store.getState().initialize()
    })

    it('adds a task under a goal', async () => {
      const goalId = await store.getState().addGoal({ title: 'Fitness' })
      await store.getState().addTask({
        parentId: goalId,
        title: 'Go to gym',
        frequency: 'weekly',
        weeklyDays: [1, 3, 5],
      })

      const state = store.getState()
      const task = state.rootGoals[0].children[0]
      expect(task.title).toBe('Go to gym')
      expect(task.nodeType).toBe('task')
      expect((task as TreeNodeWithChildren & { frequency: string }).frequency).toBe('weekly')
    })

    it('syncs task with Dexie', async () => {
      const goalId = await store.getState().addGoal({ title: 'Goal' })
      await store.getState().addTask({
        parentId: goalId,
        title: 'Daily Task',
        frequency: 'daily',
      })

      const dbTasks = await testDb.tasks.toArray()
      expect(dbTasks).toHaveLength(1)
      expect(dbTasks[0].title).toBe('Daily Task')
      expect(dbTasks[0].frequency).toBe('daily')
    })
  })

  describe('updateGoal', () => {
    beforeEach(async () => {
      await store.getState().initialize()
    })

    it('updates goal properties', async () => {
      const id = await store.getState().addGoal({ title: 'Original' })
      await store.getState().updateGoal(id, {
        title: 'Updated',
        description: 'New description',
      })

      const state = store.getState()
      expect(state.rootGoals[0].title).toBe('Updated')
      expect(state.rootGoals[0].description).toBe('New description')
    })

    it('syncs update with Dexie', async () => {
      const id = await store.getState().addGoal({ title: 'Original' })
      await store.getState().updateGoal(id, { title: 'Updated' })

      const dbGoal = await testDb.goals.get(id)
      expect(dbGoal?.title).toBe('Updated')
    })
  })

  describe('updateTask', () => {
    beforeEach(async () => {
      await store.getState().initialize()
    })

    it('updates task properties', async () => {
      const goalId = await store.getState().addGoal({ title: 'Goal' })
      const taskId = await store.getState().addTask({
        parentId: goalId,
        title: 'Original',
        frequency: 'once',
      })

      await store.getState().updateTask(taskId, {
        title: 'Updated',
        frequency: 'daily',
      })

      const state = store.getState()
      const task = state.rootGoals[0].children[0] as TreeNodeWithChildren & { frequency: string }
      expect(task.title).toBe('Updated')
      expect(task.frequency).toBe('daily')
    })
  })

  describe('updateGoalStatus', () => {
    beforeEach(async () => {
      await store.getState().initialize()
    })

    it('updates goal status', async () => {
      const id = await store.getState().addGoal({ title: 'Goal' })
      await store.getState().updateGoalStatus(id, 'completed')

      const state = store.getState()
      expect((state.rootGoals[0] as TreeNodeWithChildren & { status: string }).status).toBe('completed')
    })
  })

  describe('toggleTaskCompletion', () => {
    beforeEach(async () => {
      await store.getState().initialize()
    })

    it('toggles task completion status', async () => {
      const goalId = await store.getState().addGoal({ title: 'Goal' })
      const taskId = await store.getState().addTask({
        parentId: goalId,
        title: 'Task',
        frequency: 'once',
      })

      // Initially not completed
      let state = store.getState()
      let task = state.rootGoals[0].children[0] as TreeNodeWithChildren & { isCompleted: boolean }
      expect(task.isCompleted).toBe(false)

      // Toggle to completed
      const result1 = await store.getState().toggleTaskCompletion(taskId)
      expect(result1).toBe(true)
      state = store.getState()
      task = state.rootGoals[0].children[0] as TreeNodeWithChildren & { isCompleted: boolean }
      expect(task.isCompleted).toBe(true)

      // Toggle back to not completed
      const result2 = await store.getState().toggleTaskCompletion(taskId)
      expect(result2).toBe(false)
      state = store.getState()
      task = state.rootGoals[0].children[0] as TreeNodeWithChildren & { isCompleted: boolean }
      expect(task.isCompleted).toBe(false)
    })
  })

  describe('deleteNode', () => {
    beforeEach(async () => {
      await store.getState().initialize()
    })

    it('deletes a goal', async () => {
      const id = await store.getState().addGoal({ title: 'To Delete' })
      
      const count = await store.getState().deleteNode(id, 'goal')
      
      expect(count).toBe(1)
      const state = store.getState()
      expect(state.rootGoals).toHaveLength(0)
    })

    it('cascade deletes children', async () => {
      const parentId = await store.getState().addGoal({ title: 'Parent' })
      await store.getState().addMilestone({ title: 'Child', parentId })
      await store.getState().addTask({ parentId, title: 'Task', frequency: 'once' })

      const count = await store.getState().deleteNode(parentId, 'goal')

      expect(count).toBe(3) // parent + milestone + task
      const state = store.getState()
      expect(state.rootGoals).toHaveLength(0)
      expect(await testDb.goals.count()).toBe(0)
      expect(await testDb.tasks.count()).toBe(0)
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
  })

  describe('moveNode', () => {
    beforeEach(async () => {
      await store.getState().initialize()
    })

    it('moves a goal to a new parent', async () => {
      const parent1 = await store.getState().addGoal({ title: 'Parent 1' })
      const parent2 = await store.getState().addGoal({ title: 'Parent 2' })
      const childId = await store.getState().addGoal({ title: 'Child', parentId: parent1 })

      await store.getState().moveNode(childId, 'goal', parent2)

      const state = store.getState()
      expect(state.rootGoals[0].children).toHaveLength(0) // Parent 1 has no children
      expect(state.rootGoals[1].children).toHaveLength(1) // Parent 2 has the child
      expect(state.rootGoals[1].children[0].title).toBe('Child')
    })

    it('moves a task to a new parent', async () => {
      const parent1 = await store.getState().addGoal({ title: 'Parent 1' })
      const parent2 = await store.getState().addGoal({ title: 'Parent 2' })
      const taskId = await store.getState().addTask({
        parentId: parent1,
        title: 'Task',
        frequency: 'once',
      })

      await store.getState().moveNode(taskId, 'task', parent2)

      const state = store.getState()
      expect(state.rootGoals[0].children).toHaveLength(0)
      expect(state.rootGoals[1].children).toHaveLength(1)
    })

    it('moves a goal to root level', async () => {
      const parentId = await store.getState().addGoal({ title: 'Parent' })
      const childId = await store.getState().addGoal({ title: 'Child', parentId })

      await store.getState().moveNode(childId, 'goal', null)

      const state = store.getState()
      expect(state.rootGoals).toHaveLength(2)
    })
  })

  describe('reorderSiblings', () => {
    beforeEach(async () => {
      await store.getState().initialize()
    })

    it('reorders root goals', async () => {
      const g1 = await store.getState().addGoal({ title: 'G1', order: 0 })
      const g2 = await store.getState().addGoal({ title: 'G2', order: 1 })
      const g3 = await store.getState().addGoal({ title: 'G3', order: 2 })

      await store.getState().reorderSiblings(null, [g3, g1, g2], 'goal')

      const state = store.getState()
      expect(state.rootGoals[0].title).toBe('G3')
      expect(state.rootGoals[1].title).toBe('G1')
      expect(state.rootGoals[2].title).toBe('G2')
    })

    it('reorders children', async () => {
      const parentId = await store.getState().addGoal({ title: 'Parent' })
      const m1 = await store.getState().addMilestone({ title: 'M1', parentId, order: 0 })
      const m2 = await store.getState().addMilestone({ title: 'M2', parentId, order: 1 })

      await store.getState().reorderSiblings(parentId, [m2, m1], 'goal')

      const state = store.getState()
      expect(state.rootGoals[0].children[0].title).toBe('M2')
      expect(state.rootGoals[0].children[1].title).toBe('M1')
    })
  })

  describe('getNode', () => {
    beforeEach(async () => {
      await store.getState().initialize()
    })

    it('returns a goal by id', async () => {
      const id = await store.getState().addGoal({ title: 'Test Goal' })

      const node = store.getState().getNode(id, 'goal')

      expect(node).toBeDefined()
      expect(node?.title).toBe('Test Goal')
    })

    it('returns a task by id', async () => {
      const goalId = await store.getState().addGoal({ title: 'Goal' })
      const taskId = await store.getState().addTask({
        parentId: goalId,
        title: 'Test Task',
        frequency: 'once',
      })

      const node = store.getState().getNode(taskId, 'task')

      expect(node).toBeDefined()
      expect(node?.title).toBe('Test Task')
    })

    it('returns undefined for non-existent node', () => {
      const node = store.getState().getNode(99999, 'goal')
      expect(node).toBeUndefined()
    })
  })

  describe('getChildren', () => {
    beforeEach(async () => {
      await store.getState().initialize()
    })

    it('returns children of a node', async () => {
      const parentId = await store.getState().addGoal({ title: 'Parent' })
      await store.getState().addMilestone({ title: 'Child 1', parentId })
      await store.getState().addTask({ parentId, title: 'Child 2', frequency: 'once' })

      const children = store.getState().getChildren(parentId)

      expect(children).toHaveLength(2)
    })

    it('returns empty array for node without children', async () => {
      const id = await store.getState().addGoal({ title: 'Leaf' })

      const children = store.getState().getChildren(id)

      expect(children).toHaveLength(0)
    })

    it('returns empty array for non-existent node', () => {
      const children = store.getState().getChildren(99999)
      expect(children).toHaveLength(0)
    })
  })

  describe('refresh', () => {
    beforeEach(async () => {
      await store.getState().initialize()
    })

    it('refreshes state from database', async () => {
      // Add directly to database
      await testDb.goals.add({
        title: 'Direct Add',
        type: 'goal',
        status: 'active',
        createdAt: new Date(),
      })

      // State should not reflect this yet
      expect(store.getState().rootGoals).toHaveLength(0)

      // Refresh
      await store.getState().refresh()

      // Now it should
      expect(store.getState().rootGoals).toHaveLength(1)
      expect(store.getState().rootGoals[0].title).toBe('Direct Add')
    })
  })

  describe('error handling', () => {
    beforeEach(async () => {
      await store.getState().initialize()
    })

    it('sets error state on toggle non-existent task', async () => {
      await expect(store.getState().toggleTaskCompletion(99999)).rejects.toThrow()
      expect(store.getState().error).toBe('Task with id 99999 not found')
    })

    it('sets error state on move to descendant', async () => {
      const parentId = await store.getState().addGoal({ title: 'Parent' })
      const childId = await store.getState().addGoal({ title: 'Child', parentId })

      await expect(store.getState().moveNode(parentId, 'goal', childId)).rejects.toThrow()
      expect(store.getState().error).toContain('Cannot move a node')
    })
  })

  describe('tree structure', () => {
    beforeEach(async () => {
      await store.getState().initialize()
    })

    it('builds correct nested tree structure', async () => {
      // Create hierarchy:
      // Root Goal
      //   - Milestone 1
      //     - Task 1
      //   - Requirement
      //   - Task 2
      const rootId = await store.getState().addGoal({ title: 'Root Goal' })
      const milestoneId = await store.getState().addMilestone({
        title: 'Milestone 1',
        parentId: rootId,
        order: 0,
      })
      await store.getState().addTask({
        parentId: milestoneId,
        title: 'Task 1',
        frequency: 'daily',
      })
      await store.getState().addRequirement({
        title: 'Requirement',
        parentId: rootId,
        order: 1,
      })
      await store.getState().addTask({
        parentId: rootId,
        title: 'Task 2',
        frequency: 'once',
        order: 2,
      })

      const state = store.getState()
      
      // Check root
      expect(state.rootGoals).toHaveLength(1)
      const root = state.rootGoals[0]
      expect(root.title).toBe('Root Goal')
      expect(root.nodeType).toBe('goal')
      
      // Check root children
      expect(root.children).toHaveLength(3)
      
      // Check milestone
      const milestone = root.children.find(c => c.title === 'Milestone 1')
      expect(milestone).toBeDefined()
      expect(milestone?.nodeType).toBe('milestone')
      expect(milestone?.children).toHaveLength(1)
      expect(milestone?.children[0].title).toBe('Task 1')
      
      // Check requirement
      const requirement = root.children.find(c => c.title === 'Requirement')
      expect(requirement).toBeDefined()
      expect(requirement?.nodeType).toBe('requirement')
      
      // Check task
      const task = root.children.find(c => c.title === 'Task 2')
      expect(task).toBeDefined()
      expect(task?.nodeType).toBe('task')
    })
  })
})
