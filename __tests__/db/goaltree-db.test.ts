import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  GoalTreeDatabase,
  db,
  type Goal,
  type Task,
  type Settings,
  type NodeType,
  type NodeStatus,
  type TaskFrequency,
} from '@/src/db'

describe('GoalTreeDatabase', () => {
  let testDb: GoalTreeDatabase

  beforeEach(() => {
    testDb = new GoalTreeDatabase()
  })

  afterEach(async () => {
    await testDb.delete()
  })

  describe('database initialization', () => {
    it('creates a database instance', () => {
      expect(testDb).toBeInstanceOf(GoalTreeDatabase)
      expect(testDb.name).toBe('GoalTreeDB')
    })

    it('exports a singleton db instance', () => {
      expect(db).toBeInstanceOf(GoalTreeDatabase)
      expect(db.name).toBe('GoalTreeDB')
    })

    it('has goals table defined', () => {
      expect(testDb.goals).toBeDefined()
    })

    it('has tasks table defined', () => {
      expect(testDb.tasks).toBeDefined()
    })

    it('has settings table defined', () => {
      expect(testDb.settings).toBeDefined()
    })
  })

  describe('Goals table', () => {
    it('can add a goal', async () => {
      const goal: Goal = {
        title: 'Buy a House',
        type: 'goal',
        status: 'active',
        createdAt: new Date(),
      }

      const id = await testDb.goals.add(goal)
      expect(id).toBeDefined()
      expect(typeof id).toBe('number')
    })

    it('can retrieve a goal by id', async () => {
      const goal: Goal = {
        title: 'Learn TypeScript',
        description: 'Master TypeScript for better code',
        type: 'goal',
        status: 'active',
        createdAt: new Date(),
      }

      const id = await testDb.goals.add(goal)
      const retrieved = await testDb.goals.get(id)

      expect(retrieved).toBeDefined()
      expect(retrieved?.title).toBe('Learn TypeScript')
      expect(retrieved?.description).toBe('Master TypeScript for better code')
      expect(retrieved?.type).toBe('goal')
      expect(retrieved?.status).toBe('active')
    })

    it('can add goals with parent-child relationships', async () => {
      const parentGoal: Goal = {
        title: 'Get Fit',
        type: 'goal',
        status: 'active',
        createdAt: new Date(),
      }

      const parentId = await testDb.goals.add(parentGoal)

      const milestone: Goal = {
        title: 'Build Gym Routine',
        parentId,
        type: 'milestone',
        status: 'active',
        createdAt: new Date(),
      }

      const milestoneId = await testDb.goals.add(milestone)
      const retrieved = await testDb.goals.get(milestoneId)

      expect(retrieved?.parentId).toBe(parentId)
      expect(retrieved?.type).toBe('milestone')
    })

    it('can query goals by parentId', async () => {
      const parentId = await testDb.goals.add({
        title: 'Parent Goal',
        type: 'goal',
        status: 'active',
        createdAt: new Date(),
      })

      await testDb.goals.bulkAdd([
        {
          title: 'Child 1',
          parentId,
          type: 'milestone',
          status: 'active',
          createdAt: new Date(),
        },
        {
          title: 'Child 2',
          parentId,
          type: 'requirement',
          status: 'active',
          createdAt: new Date(),
        },
      ])

      const children = await testDb.goals.where('parentId').equals(parentId).toArray()
      expect(children).toHaveLength(2)
    })

    it('can query goals by type', async () => {
      await testDb.goals.bulkAdd([
        { title: 'Goal 1', type: 'goal', status: 'active', createdAt: new Date() },
        { title: 'Milestone 1', type: 'milestone', status: 'active', createdAt: new Date() },
        { title: 'Requirement 1', type: 'requirement', status: 'active', createdAt: new Date() },
      ])

      const goals = await testDb.goals.where('type').equals('goal').toArray()
      expect(goals).toHaveLength(1)
      expect(goals[0].title).toBe('Goal 1')
    })

    it('can update a goal', async () => {
      const id = await testDb.goals.add({
        title: 'Original Title',
        type: 'goal',
        status: 'active',
        createdAt: new Date(),
      })

      await testDb.goals.update(id, {
        title: 'Updated Title',
        status: 'completed',
        updatedAt: new Date(),
      })

      const updated = await testDb.goals.get(id)
      expect(updated?.title).toBe('Updated Title')
      expect(updated?.status).toBe('completed')
      expect(updated?.updatedAt).toBeDefined()
    })

    it('can delete a goal', async () => {
      const id = await testDb.goals.add({
        title: 'To Delete',
        type: 'goal',
        status: 'active',
        createdAt: new Date(),
      })

      await testDb.goals.delete(id)
      const deleted = await testDb.goals.get(id)
      expect(deleted).toBeUndefined()
    })
  })

  describe('Tasks table', () => {
    let goalId: number

    beforeEach(async () => {
      goalId = await testDb.goals.add({
        title: 'Parent Goal',
        type: 'goal',
        status: 'active',
        createdAt: new Date(),
      })
    })

    it('can add a task', async () => {
      const task: Task = {
        parentId: goalId,
        title: 'Exercise Daily',
        frequency: 'daily',
        isCompleted: false,
        createdAt: new Date(),
      }

      const id = await testDb.tasks.add(task)
      expect(id).toBeDefined()
    })

    it('can retrieve a task with all properties', async () => {
      const task: Task = {
        parentId: goalId,
        title: 'Go to Gym',
        description: 'Strength training session',
        frequency: 'weekly',
        weeklyDays: [1, 3, 5], // Mon, Wed, Fri
        isCompleted: false,
        measurement: '1 hour',
        createdAt: new Date(),
      }

      const id = await testDb.tasks.add(task)
      const retrieved = await testDb.tasks.get(id)

      expect(retrieved?.title).toBe('Go to Gym')
      expect(retrieved?.frequency).toBe('weekly')
      expect(retrieved?.weeklyDays).toEqual([1, 3, 5])
      expect(retrieved?.measurement).toBe('1 hour')
    })

    it('can query tasks by parentId', async () => {
      await testDb.tasks.bulkAdd([
        { parentId: goalId, title: 'Task 1', frequency: 'daily', isCompleted: false, createdAt: new Date() },
        { parentId: goalId, title: 'Task 2', frequency: 'weekly', isCompleted: false, createdAt: new Date() },
      ])

      const tasks = await testDb.tasks.where('parentId').equals(goalId).toArray()
      expect(tasks).toHaveLength(2)
    })

    it('can filter tasks by completion status', async () => {
      await testDb.tasks.bulkAdd([
        { parentId: goalId, title: 'Completed Task', frequency: 'once', isCompleted: true, createdAt: new Date() },
        { parentId: goalId, title: 'Pending Task', frequency: 'once', isCompleted: false, createdAt: new Date() },
      ])

      const allTasks = await testDb.tasks.toArray()
      const completedTasks = allTasks.filter((t) => t.isCompleted)
      expect(completedTasks).toHaveLength(1)
      expect(completedTasks[0].title).toBe('Completed Task')
    })

    it('can update task completion status', async () => {
      const id = await testDb.tasks.add({
        parentId: goalId,
        title: 'Mark as Done',
        frequency: 'once',
        isCompleted: false,
        createdAt: new Date(),
      })

      await testDb.tasks.update(id, { isCompleted: true, updatedAt: new Date() })

      const updated = await testDb.tasks.get(id)
      expect(updated?.isCompleted).toBe(true)
    })

    it('can schedule a task', async () => {
      const scheduledDate = new Date('2026-02-01T10:00:00')
      const id = await testDb.tasks.add({
        parentId: goalId,
        title: 'Scheduled Task',
        frequency: 'once',
        isCompleted: false,
        scheduledDate,
        createdAt: new Date(),
      })

      const task = await testDb.tasks.get(id)
      expect(task?.scheduledDate).toEqual(scheduledDate)
    })
  })

  describe('Settings table', () => {
    it('can add settings', async () => {
      const settings: Settings = {
        workHoursStart: '09:00',
        workHoursEnd: '18:00',
        sleepStart: '23:00',
        sleepEnd: '07:00',
      }

      const id = await testDb.settings.add(settings)
      expect(id).toBeDefined()
    })

    it('can retrieve settings', async () => {
      await testDb.settings.add({
        workHoursStart: '08:30',
        workHoursEnd: '17:30',
        sleepStart: '22:00',
        sleepEnd: '06:00',
      })

      const settings = await testDb.settings.toArray()
      expect(settings).toHaveLength(1)
      expect(settings[0].workHoursStart).toBe('08:30')
      expect(settings[0].workHoursEnd).toBe('17:30')
      expect(settings[0].sleepStart).toBe('22:00')
      expect(settings[0].sleepEnd).toBe('06:00')
    })

    it('can update settings', async () => {
      const id = await testDb.settings.add({
        workHoursStart: '09:00',
        workHoursEnd: '18:00',
        sleepStart: '23:00',
        sleepEnd: '07:00',
      })

      await testDb.settings.update(id, { workHoursStart: '10:00' })

      const updated = await testDb.settings.get(id)
      expect(updated?.workHoursStart).toBe('10:00')
    })
  })

  describe('type exports', () => {
    it('exports NodeType type', () => {
      const types: NodeType[] = ['goal', 'requirement', 'milestone', 'task']
      expect(types).toHaveLength(4)
    })

    it('exports NodeStatus type', () => {
      const statuses: NodeStatus[] = ['active', 'completed', 'archived']
      expect(statuses).toHaveLength(3)
    })

    it('exports TaskFrequency type', () => {
      const frequencies: TaskFrequency[] = ['once', 'daily', 'weekly', 'custom']
      expect(frequencies).toHaveLength(4)
    })
  })
})
