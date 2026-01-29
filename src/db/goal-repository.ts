import { db, type Goal, type Task, type NodeType, type NodeStatus, type TaskFrequency, GoalTreeDatabase } from './index'

/**
 * Input data for creating a new goal/milestone/requirement node
 */
export interface CreateGoalInput {
  title: string
  description?: string
  parentId?: number | null
  type: NodeType
  status?: NodeStatus
  order?: number
}

/**
 * Input data for creating a new task node
 */
export interface CreateTaskInput {
  parentId: number
  title: string
  description?: string
  frequency: TaskFrequency
  weeklyDays?: number[]
  measurement?: string
  scheduledDate?: Date | null
  order?: number
}

/**
 * Union type for creating any node type
 */
export type CreateNodeInput =
  | ({ nodeType: 'goal' | 'requirement' | 'milestone' } & CreateGoalInput)
  | ({ nodeType: 'task' } & CreateTaskInput)

/**
 * Represents any node in the tree (goal, requirement, milestone, or task)
 */
export type TreeNode = (Goal & { nodeType: 'goal' | 'requirement' | 'milestone' }) | (Task & { nodeType: 'task' })

/**
 * GoalRepository - handles all Dexie CRUD operations for the goal tree
 *
 * This repository provides a unified interface for managing nodes in the
 * hierarchical goal tree, including goals, requirements, milestones, and tasks.
 */
export class GoalRepository {
  private database: GoalTreeDatabase

  constructor(database: GoalTreeDatabase = db) {
    this.database = database
  }

  // ============================================
  // Add Node Operations
  // ============================================

  /**
   * Adds a new node to the tree
   *
   * @param input - The node data to create
   * @returns The id of the newly created node
   */
  async addNode(input: CreateNodeInput): Promise<number> {
    const now = new Date()

    if (input.nodeType === 'task') {
      const task: Task = {
        parentId: input.parentId,
        title: input.title,
        description: input.description,
        frequency: input.frequency,
        weeklyDays: input.weeklyDays,
        measurement: input.measurement,
        scheduledDate: input.scheduledDate,
        order: input.order,
        isCompleted: false,
        createdAt: now,
      }
      return await this.database.tasks.add(task)
    } else {
      const goal: Goal = {
        title: input.title,
        description: input.description,
        parentId: input.parentId,
        type: input.type,
        status: input.status ?? 'active',
        order: input.order,
        createdAt: now,
      }
      return await this.database.goals.add(goal)
    }
  }

  /**
   * Adds a goal node
   */
  async addGoal(input: Omit<CreateGoalInput, 'type'>): Promise<number> {
    return this.addNode({ ...input, nodeType: 'goal', type: 'goal' })
  }

  /**
   * Adds a milestone node
   */
  async addMilestone(input: Omit<CreateGoalInput, 'type'>): Promise<number> {
    return this.addNode({ ...input, nodeType: 'milestone', type: 'milestone' })
  }

  /**
   * Adds a requirement node
   */
  async addRequirement(input: Omit<CreateGoalInput, 'type'>): Promise<number> {
    return this.addNode({ ...input, nodeType: 'requirement', type: 'requirement' })
  }

  /**
   * Adds a task node
   */
  async addTask(input: Omit<CreateTaskInput, 'nodeType'>): Promise<number> {
    return this.addNode({ ...input, nodeType: 'task' })
  }

  // ============================================
  // Get Node Operations
  // ============================================

  /**
   * Gets a goal/milestone/requirement by id
   */
  async getGoal(id: number): Promise<Goal | undefined> {
    return await this.database.goals.get(id)
  }

  /**
   * Gets a task by id
   */
  async getTask(id: number): Promise<Task | undefined> {
    return await this.database.tasks.get(id)
  }

  /**
   * Gets all root goals (goals without a parent)
   */
  async getRootGoals(): Promise<Goal[]> {
    const allGoals = await this.database.goals.toArray()
    return allGoals.filter((g) => g.parentId === undefined || g.parentId === null)
  }

  /**
   * Gets all child goals (milestones, requirements, sub-goals) of a parent
   */
  async getChildGoals(parentId: number): Promise<Goal[]> {
    return await this.database.goals.where('parentId').equals(parentId).toArray()
  }

  /**
   * Gets all tasks under a parent (goal or milestone)
   */
  async getChildTasks(parentId: number): Promise<Task[]> {
    return await this.database.tasks.where('parentId').equals(parentId).toArray()
  }

  /**
   * Gets all children of a node (both goals and tasks)
   */
  async getChildren(parentId: number): Promise<TreeNode[]> {
    const [goals, tasks] = await Promise.all([this.getChildGoals(parentId), this.getChildTasks(parentId)])

    const goalNodes: TreeNode[] = goals.map((g) => ({
      ...g,
      nodeType: g.type as 'goal' | 'requirement' | 'milestone',
    }))
    const taskNodes: TreeNode[] = tasks.map((t) => ({ ...t, nodeType: 'task' as const }))

    return [...goalNodes, ...taskNodes].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  }

  // ============================================
  // Delete Node Operations
  // ============================================

  /**
   * Deletes a node and all its descendants (cascade delete)
   *
   * @param id - The id of the node to delete
   * @param nodeType - Whether this is a 'goal' (includes milestones/requirements) or 'task'
   * @returns The number of nodes deleted
   */
  async deleteNode(id: number, nodeType: 'goal' | 'task'): Promise<number> {
    if (nodeType === 'task') {
      await this.database.tasks.delete(id)
      return 1
    }

    // For goals/milestones/requirements, cascade delete all children
    return await this.database.transaction('rw', [this.database.goals, this.database.tasks], async () => {
      return await this.deleteGoalAndDescendants(id)
    })
  }

  /**
   * Recursively deletes a goal and all its descendants
   */
  private async deleteGoalAndDescendants(goalId: number): Promise<number> {
    let deletedCount = 0

    // Get all child goals
    const childGoals = await this.database.goals.where('parentId').equals(goalId).toArray()

    // Recursively delete child goals
    for (const child of childGoals) {
      if (child.id !== undefined) {
        deletedCount += await this.deleteGoalAndDescendants(child.id)
      }
    }

    // Delete all tasks under this goal
    const tasks = await this.database.tasks.where('parentId').equals(goalId).toArray()
    for (const task of tasks) {
      if (task.id !== undefined) {
        await this.database.tasks.delete(task.id)
        deletedCount++
      }
    }

    // Delete the goal itself
    await this.database.goals.delete(goalId)
    deletedCount++

    return deletedCount
  }

  // ============================================
  // Move Node Operations
  // ============================================

  /**
   * Moves a node to a new parent and/or position
   *
   * @param id - The id of the node to move
   * @param nodeType - Whether this is a 'goal' or 'task'
   * @param newParentId - The new parent id (null for root level, only for goals)
   * @param newOrder - The new order position
   */
  async moveNode(
    id: number,
    nodeType: 'goal' | 'task',
    newParentId: number | null,
    newOrder?: number
  ): Promise<void> {
    const now = new Date()

    if (nodeType === 'task') {
      if (newParentId === null) {
        throw new Error('Tasks must have a parent')
      }

      // Validate parent exists
      const parent = await this.database.goals.get(newParentId)
      if (!parent) {
        throw new Error(`Parent goal with id ${newParentId} not found`)
      }

      const updateData: Partial<Task> = {
        parentId: newParentId,
        updatedAt: now,
      }

      if (newOrder !== undefined) {
        updateData.order = newOrder
      }

      await this.database.tasks.update(id, updateData)
    } else {
      // Validate: cannot make a node its own descendant
      if (newParentId !== null) {
        const isDescendant = await this.isDescendant(id, newParentId)
        if (isDescendant) {
          throw new Error('Cannot move a node to be a child of its own descendant')
        }

        // Validate parent exists
        const parent = await this.database.goals.get(newParentId)
        if (!parent) {
          throw new Error(`Parent goal with id ${newParentId} not found`)
        }
      }

      const updateData: Partial<Goal> = {
        parentId: newParentId,
        updatedAt: now,
      }

      if (newOrder !== undefined) {
        updateData.order = newOrder
      }

      await this.database.goals.update(id, updateData)
    }
  }

  /**
   * Reorders siblings under a parent
   *
   * @param parentId - The parent node id (null for root goals)
   * @param orderedIds - Array of node ids in their new order
   * @param nodeType - Whether these are 'goal' or 'task' nodes
   */
  async reorderSiblings(
    parentId: number | null,
    orderedIds: number[],
    nodeType: 'goal' | 'task'
  ): Promise<void> {
    const now = new Date()

    await this.database.transaction('rw', [this.database.goals, this.database.tasks], async () => {
      for (let i = 0; i < orderedIds.length; i++) {
        const id = orderedIds[i]
        const updateData = { order: i, updatedAt: now }

        if (nodeType === 'task') {
          await this.database.tasks.update(id, updateData)
        } else {
          await this.database.goals.update(id, updateData)
        }
      }
    })
  }

  /**
   * Checks if potentialDescendantId is a descendant of nodeId
   */
  private async isDescendant(nodeId: number, potentialDescendantId: number): Promise<boolean> {
    if (nodeId === potentialDescendantId) {
      return true
    }

    const children = await this.database.goals.where('parentId').equals(nodeId).toArray()

    for (const child of children) {
      if (child.id === potentialDescendantId) {
        return true
      }
      if (child.id !== undefined) {
        const found = await this.isDescendant(child.id, potentialDescendantId)
        if (found) {
          return true
        }
      }
    }

    return false
  }

  // ============================================
  // Update Node Operations
  // ============================================

  /**
   * Updates a goal node
   */
  async updateGoal(id: number, updates: Partial<Omit<Goal, 'id' | 'createdAt'>>): Promise<void> {
    await this.database.goals.update(id, {
      ...updates,
      updatedAt: new Date(),
    })
  }

  /**
   * Updates a task node
   */
  async updateTask(id: number, updates: Partial<Omit<Task, 'id' | 'createdAt'>>): Promise<void> {
    await this.database.tasks.update(id, {
      ...updates,
      updatedAt: new Date(),
    })
  }

  /**
   * Marks a task as completed or uncompleted
   */
  async toggleTaskCompletion(id: number): Promise<boolean> {
    const task = await this.database.tasks.get(id)
    if (!task) {
      throw new Error(`Task with id ${id} not found`)
    }

    const newStatus = !task.isCompleted
    await this.database.tasks.update(id, {
      isCompleted: newStatus,
      updatedAt: new Date(),
    })

    return newStatus
  }

  /**
   * Updates the status of a goal node
   */
  async updateGoalStatus(id: number, status: NodeStatus): Promise<void> {
    await this.database.goals.update(id, {
      status,
      updatedAt: new Date(),
    })
  }
}

// Singleton instance using the default database
export const goalRepository = new GoalRepository()
