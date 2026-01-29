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

// Singleton database instance
export const db = new GoalTreeDatabase()

// Export repository
export { GoalRepository, goalRepository } from './goal-repository'
export type { CreateGoalInput, CreateTaskInput, CreateNodeInput, TreeNode } from './goal-repository'
