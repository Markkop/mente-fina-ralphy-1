import Dexie, { type Table } from 'dexie'

/**
 * Node types in the goal tree hierarchy
 */
export type NodeType = 'goal' | 'requirement' | 'milestone' | 'task'

/**
 * Status of a node in the tree
 */
export type NodeStatus = 'active' | 'completed' | 'archived'

/**
 * Frequency options for recurring tasks
 */
export type TaskFrequency = 'once' | 'daily' | 'weekly' | 'custom'

/**
 * Goal entity - represents goals, requirements, milestones in the hierarchy
 */
export interface Goal {
  id?: number
  title: string
  description?: string
  parentId?: number | null
  type: NodeType
  status: NodeStatus
  createdAt: Date
  updatedAt?: Date
  order?: number
}

/**
 * Task entity - actionable items with frequency and scheduling
 */
export interface Task {
  id?: number
  parentId: number
  title: string
  description?: string
  frequency: TaskFrequency
  weeklyDays?: number[] // 0-6 for Sunday-Saturday
  isCompleted: boolean
  scheduledDate?: Date | null
  measurement?: string
  createdAt: Date
  updatedAt?: Date
  order?: number
}

/**
 * Settings entity - user preferences for work/sleep hours
 */
export interface Settings {
  id?: number
  workHoursStart: string // HH:mm format
  workHoursEnd: string // HH:mm format
  sleepStart: string // HH:mm format
  sleepEnd: string // HH:mm format
}

/**
 * GoalTree Database - local-first storage using IndexedDB via Dexie
 */
export class GoalTreeDatabase extends Dexie {
  goals!: Table<Goal>
  tasks!: Table<Task>
  settings!: Table<Settings>

  constructor() {
    super('GoalTreeDB')

    this.version(1).stores({
      // Goal table: auto-increment id, indexed fields for querying
      goals: '++id, parentId, type, status, createdAt',
      // Task table: auto-increment id, indexed fields for querying
      tasks: '++id, parentId, frequency, isCompleted, scheduledDate',
      // Settings table: auto-increment id (typically only one record)
      settings: '++id',
    })
  }
}

// Singleton database instance (lazy initialization for SSR compatibility)
let _db: GoalTreeDatabase | null = null

export const db: GoalTreeDatabase = new Proxy({} as GoalTreeDatabase, {
  get(_target, prop) {
    if (typeof window === 'undefined') {
      throw new Error('Database can only be accessed in the browser')
    }
    if (!_db) {
      _db = new GoalTreeDatabase()
    }
    const value = _db[prop as keyof GoalTreeDatabase]
    if (typeof value === 'function') {
      return value.bind(_db)
    }
    return value
  },
})

/**
 * Clears all data from the database (goals, tasks, and settings)
 * Used for debugging and resetting the application state
 */
export async function clearAllData(): Promise<void> {
  await db.transaction('rw', [db.goals, db.tasks, db.settings], async () => {
    await db.goals.clear()
    await db.tasks.clear()
    await db.settings.clear()
  })
}

// Export repository
export { GoalRepository, goalRepository } from './goal-repository'
export type { CreateGoalInput, CreateTaskInput, CreateNodeInput, TreeNode } from './goal-repository'
