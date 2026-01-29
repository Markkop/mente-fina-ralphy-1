import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { GoalTreeDatabase } from '@/src/db'
import { GoalRepository } from '@/src/db/goal-repository'

describe('GoalRepository', () => {
  let testDb: GoalTreeDatabase
  let repo: GoalRepository

  beforeEach(() => {
    testDb = new GoalTreeDatabase()
    repo = new GoalRepository(testDb)
  })

  afterEach(async () => {
    await testDb.delete()
  })

  describe('addNode', () => {
    it('adds a goal node', async () => {
      const id = await repo.addNode({
        nodeType: 'goal',
        title: 'Buy a House',
        description: 'Purchase our first home',
        type: 'goal',
      })

      expect(id).toBeDefined()
      const goal = await testDb.goals.get(id)
      expect(goal?.title).toBe('Buy a House')
      expect(goal?.description).toBe('Purchase our first home')
      expect(goal?.type).toBe('goal')
      expect(goal?.status).toBe('active')
      expect(goal?.createdAt).toBeInstanceOf(Date)
    })

    it('adds a milestone node', async () => {
      const parentId = await repo.addGoal({ title: 'Parent Goal' })
      const id = await repo.addNode({
        nodeType: 'milestone',
        title: 'Financial Preparation',
        parentId,
        type: 'milestone',
      })

      const milestone = await testDb.goals.get(id)
      expect(milestone?.type).toBe('milestone')
      expect(milestone?.parentId).toBe(parentId)
    })

    it('adds a requirement node', async () => {
      const parentId = await repo.addGoal({ title: 'Parent Goal' })
      const id = await repo.addNode({
        nodeType: 'requirement',
        title: 'Budget: $500k',
        parentId,
        type: 'requirement',
      })

      const requirement = await testDb.goals.get(id)
      expect(requirement?.type).toBe('requirement')
    })

    it('adds a task node', async () => {
      const parentId = await repo.addGoal({ title: 'Parent Goal' })
      const id = await repo.addNode({
        nodeType: 'task',
        parentId,
        title: 'Save money daily',
        frequency: 'daily',
        measurement: '$50',
      })

      const task = await testDb.tasks.get(id)
      expect(task?.title).toBe('Save money daily')
      expect(task?.frequency).toBe('daily')
      expect(task?.measurement).toBe('$50')
      expect(task?.isCompleted).toBe(false)
    })

    it('adds a task with weekly frequency', async () => {
      const parentId = await repo.addGoal({ title: 'Fitness' })
      const id = await repo.addTask({
        parentId,
        title: 'Go to gym',
        frequency: 'weekly',
        weeklyDays: [1, 3, 5],
      })

      const task = await testDb.tasks.get(id)
      expect(task?.weeklyDays).toEqual([1, 3, 5])
    })
  })

  describe('helper add methods', () => {
    it('addGoal creates a goal', async () => {
      const id = await repo.addGoal({ title: 'My Goal' })
      const goal = await testDb.goals.get(id)
      expect(goal?.type).toBe('goal')
    })

    it('addMilestone creates a milestone', async () => {
      const parentId = await repo.addGoal({ title: 'Parent' })
      const id = await repo.addMilestone({ title: 'My Milestone', parentId })
      const milestone = await testDb.goals.get(id)
      expect(milestone?.type).toBe('milestone')
    })

    it('addRequirement creates a requirement', async () => {
      const parentId = await repo.addGoal({ title: 'Parent' })
      const id = await repo.addRequirement({ title: 'My Requirement', parentId })
      const requirement = await testDb.goals.get(id)
      expect(requirement?.type).toBe('requirement')
    })

    it('addTask creates a task', async () => {
      const parentId = await repo.addGoal({ title: 'Parent' })
      const id = await repo.addTask({ parentId, title: 'My Task', frequency: 'once' })
      const task = await testDb.tasks.get(id)
      expect(task?.title).toBe('My Task')
    })
  })

  describe('getNode operations', () => {
    it('getGoal retrieves a goal by id', async () => {
      const id = await repo.addGoal({ title: 'Test Goal' })
      const goal = await repo.getGoal(id)
      expect(goal?.title).toBe('Test Goal')
    })

    it('getTask retrieves a task by id', async () => {
      const parentId = await repo.addGoal({ title: 'Parent' })
      const id = await repo.addTask({ parentId, title: 'Test Task', frequency: 'once' })
      const task = await repo.getTask(id)
      expect(task?.title).toBe('Test Task')
    })

    it('getRootGoals returns only root level goals', async () => {
      await repo.addGoal({ title: 'Root 1' })
      await repo.addGoal({ title: 'Root 2' })
      const parentId = await repo.addGoal({ title: 'Root 3' })
      await repo.addMilestone({ title: 'Child', parentId })

      const roots = await repo.getRootGoals()
      expect(roots).toHaveLength(3)
      expect(roots.every((g) => g.parentId === undefined || g.parentId === null)).toBe(true)
    })

    it('getChildGoals returns children of a parent', async () => {
      const parentId = await repo.addGoal({ title: 'Parent' })
      await repo.addMilestone({ title: 'Milestone 1', parentId })
      await repo.addMilestone({ title: 'Milestone 2', parentId })
      await repo.addRequirement({ title: 'Req 1', parentId })

      const children = await repo.getChildGoals(parentId)
      expect(children).toHaveLength(3)
    })

    it('getChildTasks returns tasks under a parent', async () => {
      const parentId = await repo.addGoal({ title: 'Parent' })
      await repo.addTask({ parentId, title: 'Task 1', frequency: 'daily' })
      await repo.addTask({ parentId, title: 'Task 2', frequency: 'weekly' })

      const tasks = await repo.getChildTasks(parentId)
      expect(tasks).toHaveLength(2)
    })

    it('getChildren returns all children sorted by order', async () => {
      const parentId = await repo.addGoal({ title: 'Parent' })
      await repo.addMilestone({ title: 'Milestone', parentId, order: 1 })
      await repo.addTask({ parentId, title: 'Task', frequency: 'once', order: 0 })
      await repo.addRequirement({ title: 'Requirement', parentId, order: 2 })

      const children = await repo.getChildren(parentId)
      expect(children).toHaveLength(3)
      expect(children[0].title).toBe('Task')
      expect(children[1].title).toBe('Milestone')
      expect(children[2].title).toBe('Requirement')
    })
  })

  describe('deleteNode', () => {
    it('deletes a task', async () => {
      const parentId = await repo.addGoal({ title: 'Parent' })
      const taskId = await repo.addTask({ parentId, title: 'Task', frequency: 'once' })

      const count = await repo.deleteNode(taskId, 'task')
      expect(count).toBe(1)

      const task = await testDb.tasks.get(taskId)
      expect(task).toBeUndefined()
    })

    it('deletes a goal without children', async () => {
      const goalId = await repo.addGoal({ title: 'Simple Goal' })

      const count = await repo.deleteNode(goalId, 'goal')
      expect(count).toBe(1)

      const goal = await testDb.goals.get(goalId)
      expect(goal).toBeUndefined()
    })

    it('cascade deletes all children when deleting a goal', async () => {
      // Create a hierarchy:
      // Parent Goal
      //   - Milestone
      //     - Task 1
      //     - Task 2
      //   - Requirement
      const parentId = await repo.addGoal({ title: 'Parent Goal' })
      const milestoneId = await repo.addMilestone({ title: 'Milestone', parentId })
      await repo.addTask({ parentId: milestoneId, title: 'Task 1', frequency: 'daily' })
      await repo.addTask({ parentId: milestoneId, title: 'Task 2', frequency: 'once' })
      await repo.addRequirement({ title: 'Requirement', parentId })

      const count = await repo.deleteNode(parentId, 'goal')
      expect(count).toBe(5) // parent + milestone + 2 tasks + requirement

      const goals = await testDb.goals.toArray()
      const tasks = await testDb.tasks.toArray()
      expect(goals).toHaveLength(0)
      expect(tasks).toHaveLength(0)
    })

    it('cascade deletes deeply nested hierarchy', async () => {
      // Create deep nesting:
      // Root
      //   - Goal 1
      //     - Goal 1.1
      //       - Task
      const rootId = await repo.addGoal({ title: 'Root' })
      const goal1Id = await repo.addGoal({ title: 'Goal 1', parentId: rootId })
      const goal11Id = await repo.addGoal({ title: 'Goal 1.1', parentId: goal1Id })
      await repo.addTask({ parentId: goal11Id, title: 'Deep Task', frequency: 'once' })

      const count = await repo.deleteNode(rootId, 'goal')
      expect(count).toBe(4)

      expect(await testDb.goals.count()).toBe(0)
      expect(await testDb.tasks.count()).toBe(0)
    })

    it('only deletes the specified branch', async () => {
      const root1 = await repo.addGoal({ title: 'Root 1' })
      const root2 = await repo.addGoal({ title: 'Root 2' })
      await repo.addMilestone({ title: 'M1', parentId: root1 })
      await repo.addMilestone({ title: 'M2', parentId: root2 })

      await repo.deleteNode(root1, 'goal')

      const remainingGoals = await testDb.goals.toArray()
      expect(remainingGoals).toHaveLength(2) // root2 and M2
      expect(remainingGoals.map((g) => g.title)).toContain('Root 2')
      expect(remainingGoals.map((g) => g.title)).toContain('M2')
    })
  })

  describe('moveNode', () => {
    it('moves a task to a new parent', async () => {
      const parent1 = await repo.addGoal({ title: 'Parent 1' })
      const parent2 = await repo.addGoal({ title: 'Parent 2' })
      const taskId = await repo.addTask({ parentId: parent1, title: 'Task', frequency: 'once' })

      await repo.moveNode(taskId, 'task', parent2)

      const task = await testDb.tasks.get(taskId)
      expect(task?.parentId).toBe(parent2)
      expect(task?.updatedAt).toBeInstanceOf(Date)
    })

    it('moves a goal to a new parent', async () => {
      const parent1 = await repo.addGoal({ title: 'Parent 1' })
      const parent2 = await repo.addGoal({ title: 'Parent 2' })
      const childId = await repo.addMilestone({ title: 'Child', parentId: parent1 })

      await repo.moveNode(childId, 'goal', parent2)

      const child = await testDb.goals.get(childId)
      expect(child?.parentId).toBe(parent2)
    })

    it('moves a goal to root level', async () => {
      const parentId = await repo.addGoal({ title: 'Parent' })
      const childId = await repo.addGoal({ title: 'Child', parentId })

      await repo.moveNode(childId, 'goal', null)

      const child = await testDb.goals.get(childId)
      expect(child?.parentId).toBeNull()
    })

    it('updates order when moving', async () => {
      const parentId = await repo.addGoal({ title: 'Parent' })
      const taskId = await repo.addTask({ parentId, title: 'Task', frequency: 'once', order: 0 })

      await repo.moveNode(taskId, 'task', parentId, 5)

      const task = await testDb.tasks.get(taskId)
      expect(task?.order).toBe(5)
    })

    it('throws error when task has no parent', async () => {
      const parentId = await repo.addGoal({ title: 'Parent' })
      const taskId = await repo.addTask({ parentId, title: 'Task', frequency: 'once' })

      await expect(repo.moveNode(taskId, 'task', null)).rejects.toThrow('Tasks must have a parent')
    })

    it('throws error when parent does not exist', async () => {
      const parentId = await repo.addGoal({ title: 'Parent' })
      const taskId = await repo.addTask({ parentId, title: 'Task', frequency: 'once' })

      await expect(repo.moveNode(taskId, 'task', 99999)).rejects.toThrow('Parent goal with id 99999 not found')
    })

    it('throws error when moving goal to its own descendant', async () => {
      const rootId = await repo.addGoal({ title: 'Root' })
      const childId = await repo.addGoal({ title: 'Child', parentId: rootId })
      const grandchildId = await repo.addGoal({ title: 'Grandchild', parentId: childId })

      await expect(repo.moveNode(rootId, 'goal', grandchildId)).rejects.toThrow(
        'Cannot move a node to be a child of its own descendant'
      )
    })

    it('throws error when moving goal to itself', async () => {
      const goalId = await repo.addGoal({ title: 'Goal' })

      await expect(repo.moveNode(goalId, 'goal', goalId)).rejects.toThrow(
        'Cannot move a node to be a child of its own descendant'
      )
    })
  })

  describe('reorderSiblings', () => {
    it('reorders goals under a parent', async () => {
      const parentId = await repo.addGoal({ title: 'Parent' })
      const m1 = await repo.addMilestone({ title: 'M1', parentId, order: 0 })
      const m2 = await repo.addMilestone({ title: 'M2', parentId, order: 1 })
      const m3 = await repo.addMilestone({ title: 'M3', parentId, order: 2 })

      await repo.reorderSiblings(parentId, [m3, m1, m2], 'goal')

      const goals = await testDb.goals.where('parentId').equals(parentId).toArray()
      expect(goals.find((g) => g.id === m3)?.order).toBe(0)
      expect(goals.find((g) => g.id === m1)?.order).toBe(1)
      expect(goals.find((g) => g.id === m2)?.order).toBe(2)
    })

    it('reorders tasks under a parent', async () => {
      const parentId = await repo.addGoal({ title: 'Parent' })
      const t1 = await repo.addTask({ parentId, title: 'T1', frequency: 'once', order: 0 })
      const t2 = await repo.addTask({ parentId, title: 'T2', frequency: 'once', order: 1 })

      await repo.reorderSiblings(parentId, [t2, t1], 'task')

      const tasks = await testDb.tasks.where('parentId').equals(parentId).toArray()
      expect(tasks.find((t) => t.id === t2)?.order).toBe(0)
      expect(tasks.find((t) => t.id === t1)?.order).toBe(1)
    })

    it('reorders root level goals', async () => {
      const g1 = await repo.addGoal({ title: 'G1', order: 0 })
      const g2 = await repo.addGoal({ title: 'G2', order: 1 })
      const g3 = await repo.addGoal({ title: 'G3', order: 2 })

      await repo.reorderSiblings(null, [g3, g2, g1], 'goal')

      const goals = await repo.getRootGoals()
      expect(goals.find((g) => g.id === g3)?.order).toBe(0)
      expect(goals.find((g) => g.id === g2)?.order).toBe(1)
      expect(goals.find((g) => g.id === g1)?.order).toBe(2)
    })
  })

  describe('update operations', () => {
    it('updateGoal updates goal properties', async () => {
      const id = await repo.addGoal({ title: 'Original' })

      await repo.updateGoal(id, { title: 'Updated', description: 'New desc' })

      const goal = await testDb.goals.get(id)
      expect(goal?.title).toBe('Updated')
      expect(goal?.description).toBe('New desc')
      expect(goal?.updatedAt).toBeInstanceOf(Date)
    })

    it('updateTask updates task properties', async () => {
      const parentId = await repo.addGoal({ title: 'Parent' })
      const id = await repo.addTask({ parentId, title: 'Original', frequency: 'once' })

      await repo.updateTask(id, { title: 'Updated', frequency: 'daily', measurement: '1 hour' })

      const task = await testDb.tasks.get(id)
      expect(task?.title).toBe('Updated')
      expect(task?.frequency).toBe('daily')
      expect(task?.measurement).toBe('1 hour')
    })

    it('toggleTaskCompletion toggles completion status', async () => {
      const parentId = await repo.addGoal({ title: 'Parent' })
      const id = await repo.addTask({ parentId, title: 'Task', frequency: 'once' })

      let task = await testDb.tasks.get(id)
      expect(task?.isCompleted).toBe(false)

      const result1 = await repo.toggleTaskCompletion(id)
      expect(result1).toBe(true)
      task = await testDb.tasks.get(id)
      expect(task?.isCompleted).toBe(true)

      const result2 = await repo.toggleTaskCompletion(id)
      expect(result2).toBe(false)
      task = await testDb.tasks.get(id)
      expect(task?.isCompleted).toBe(false)
    })

    it('toggleTaskCompletion throws for non-existent task', async () => {
      await expect(repo.toggleTaskCompletion(99999)).rejects.toThrow('Task with id 99999 not found')
    })

    it('updateGoalStatus changes the status', async () => {
      const id = await repo.addGoal({ title: 'Goal' })

      await repo.updateGoalStatus(id, 'completed')

      const goal = await testDb.goals.get(id)
      expect(goal?.status).toBe('completed')
    })
  })

  describe('singleton instance', () => {
    it('exports a singleton goalRepository', async () => {
      const { goalRepository } = await import('@/src/db/goal-repository')
      expect(goalRepository).toBeInstanceOf(GoalRepository)
    })
  })
})
