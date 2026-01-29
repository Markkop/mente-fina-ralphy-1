import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { GoalTreeDatabase } from '@/src/db'
import { seedDatabase, isDatabaseSeeded, clearDatabase } from '@/src/db/seed'

// Create a fresh database instance for each test
let testDb: GoalTreeDatabase

describe('seed', () => {
  beforeEach(async () => {
    testDb = new GoalTreeDatabase()
    // Clear any existing data
    await testDb.goals.clear()
    await testDb.tasks.clear()
    await testDb.settings.clear()
  })

  afterEach(async () => {
    await testDb.delete()
  })

  describe('isDatabaseSeeded', () => {
    it('returns false when database is empty', async () => {
      const seeded = await isDatabaseSeeded()
      expect(seeded).toBe(false)
    })

    it('returns true when database has goals', async () => {
      await testDb.goals.add({
        title: 'Test Goal',
        type: 'goal',
        status: 'active',
        createdAt: new Date(),
      })

      const seeded = await isDatabaseSeeded()
      expect(seeded).toBe(true)
    })
  })

  describe('seedDatabase', () => {
    it('seeds the database with demo data on first run', async () => {
      const result = await seedDatabase()

      expect(result.goalsCreated).toBeGreaterThan(0)
      expect(result.tasksCreated).toBeGreaterThan(0)
    })

    it('creates the "Buy a House" root goal', async () => {
      await seedDatabase()

      // Query all goals and find the root goal (one without parentId)
      const allGoals = await testDb.goals.toArray()
      const rootGoal = allGoals.find((g) => g.parentId === undefined || g.parentId === null)

      expect(rootGoal).toBeDefined()
      expect(rootGoal?.title).toBe('Buy a House')
      expect(rootGoal?.type).toBe('goal')
      expect(rootGoal?.status).toBe('active')
    })

    it('creates requirements under the root goal', async () => {
      await seedDatabase()

      const requirements = await testDb.goals.where('type').equals('requirement').toArray()

      expect(requirements.length).toBe(3)
      expect(requirements.map((r) => r.title)).toContain('Budget: $500,000 max')
      expect(requirements.map((r) => r.title)).toContain('Location: Within 30 min commute')
      expect(requirements.map((r) => r.title)).toContain('Timeline: 18-24 months')
    })

    it('creates milestones under the root goal', async () => {
      await seedDatabase()

      const milestones = await testDb.goals.where('type').equals('milestone').toArray()

      expect(milestones.length).toBe(3)
      expect(milestones.map((m) => m.title)).toContain('Financial Preparation')
      expect(milestones.map((m) => m.title)).toContain('House Hunting')
      expect(milestones.map((m) => m.title)).toContain('Closing Process')
    })

    it('creates tasks under milestones', async () => {
      await seedDatabase()

      const allTasks = await testDb.tasks.toArray()

      expect(allTasks.length).toBe(13) // 4 + 4 + 5 tasks

      // Check that tasks have valid parentIds pointing to milestones
      const milestones = await testDb.goals.where('type').equals('milestone').toArray()
      const milestoneIds = milestones.map((m) => m.id)

      for (const task of allTasks) {
        expect(milestoneIds).toContain(task.parentId)
      }
    })

    it('creates tasks with various frequencies', async () => {
      await seedDatabase()

      const allTasks = await testDb.tasks.toArray()

      const frequencies = allTasks.map((t) => t.frequency)
      expect(frequencies).toContain('once')
      expect(frequencies).toContain('daily')
      expect(frequencies).toContain('weekly')
    })

    it('creates weekly tasks with weeklyDays array', async () => {
      await seedDatabase()

      const weeklyTasks = await testDb.tasks.where('frequency').equals('weekly').toArray()

      expect(weeklyTasks.length).toBeGreaterThan(0)
      for (const task of weeklyTasks) {
        expect(task.weeklyDays).toBeDefined()
        expect(Array.isArray(task.weeklyDays)).toBe(true)
        expect(task.weeklyDays!.length).toBeGreaterThan(0)
      }
    })

    it('does not seed if database already has data', async () => {
      // Seed once
      await seedDatabase()
      const firstCount = await testDb.goals.count()

      // Try to seed again
      const result = await seedDatabase()

      expect(result.goalsCreated).toBe(0)
      expect(result.tasksCreated).toBe(0)

      const secondCount = await testDb.goals.count()
      expect(secondCount).toBe(firstCount)
    })

    it('reseeds when force flag is true', async () => {
      // Seed once
      await seedDatabase()

      // Add an extra goal
      await testDb.goals.add({
        title: 'Extra Goal',
        type: 'goal',
        status: 'active',
        createdAt: new Date(),
      })

      // Force reseed
      const result = await seedDatabase(true)

      expect(result.goalsCreated).toBeGreaterThan(0)
      expect(result.tasksCreated).toBeGreaterThan(0)

      // Check that extra goal was removed
      const allGoals = await testDb.goals.toArray()
      const extraGoal = allGoals.find((g) => g.title === 'Extra Goal')
      expect(extraGoal).toBeUndefined()
    })

    it('sets createdAt timestamp on all goals', async () => {
      const beforeSeed = new Date()
      await seedDatabase()
      const afterSeed = new Date()

      const allGoals = await testDb.goals.toArray()

      for (const goal of allGoals) {
        expect(goal.createdAt).toBeDefined()
        expect(goal.createdAt.getTime()).toBeGreaterThanOrEqual(beforeSeed.getTime())
        expect(goal.createdAt.getTime()).toBeLessThanOrEqual(afterSeed.getTime())
      }
    })

    it('sets createdAt timestamp on all tasks', async () => {
      const beforeSeed = new Date()
      await seedDatabase()
      const afterSeed = new Date()

      const allTasks = await testDb.tasks.toArray()

      for (const task of allTasks) {
        expect(task.createdAt).toBeDefined()
        expect(task.createdAt.getTime()).toBeGreaterThanOrEqual(beforeSeed.getTime())
        expect(task.createdAt.getTime()).toBeLessThanOrEqual(afterSeed.getTime())
      }
    })

    it('sets order property for proper sorting', async () => {
      await seedDatabase()

      const allGoals = await testDb.goals.toArray()
      const allTasks = await testDb.tasks.toArray()

      // All goals should have order defined
      for (const goal of allGoals) {
        expect(goal.order).toBeDefined()
        expect(typeof goal.order).toBe('number')
      }

      // All tasks should have order defined
      for (const task of allTasks) {
        expect(task.order).toBeDefined()
        expect(typeof task.order).toBe('number')
      }
    })
  })

  describe('clearDatabase', () => {
    it('clears all goals', async () => {
      await seedDatabase()
      expect(await testDb.goals.count()).toBeGreaterThan(0)

      await clearDatabase()

      expect(await testDb.goals.count()).toBe(0)
    })

    it('clears all tasks', async () => {
      await seedDatabase()
      expect(await testDb.tasks.count()).toBeGreaterThan(0)

      await clearDatabase()

      expect(await testDb.tasks.count()).toBe(0)
    })

    it('clears all settings', async () => {
      await testDb.settings.add({
        workHoursStart: '09:00',
        workHoursEnd: '18:00',
        sleepStart: '23:00',
        sleepEnd: '07:00',
      })
      expect(await testDb.settings.count()).toBe(1)

      await clearDatabase()

      expect(await testDb.settings.count()).toBe(0)
    })
  })
})
