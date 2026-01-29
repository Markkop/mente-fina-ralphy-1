import { db } from './index'

/**
 * Demo seed data for the "Buy a House" example goal tree
 * This showcases the full hierarchy: Goals, Requirements, Milestones, and Tasks
 */

interface SeedResult {
  goalsCreated: number
  tasksCreated: number
}

/**
 * Checks if the database already has data
 */
export async function isDatabaseSeeded(): Promise<boolean> {
  const goalCount = await db.goals.count()
  return goalCount > 0
}

/**
 * Seeds the database with a demo "Buy a House" goal tree
 * Only seeds if the database is empty (first-time load)
 *
 * @param force - If true, clears existing data and reseeds
 * @returns Object containing counts of created goals and tasks
 */
export async function seedDatabase(force: boolean = false): Promise<SeedResult> {
  const isSeeded = await isDatabaseSeeded()

  if (isSeeded && !force) {
    return { goalsCreated: 0, tasksCreated: 0 }
  }

  if (force) {
    await db.goals.clear()
    await db.tasks.clear()
  }

  const now = new Date()
  let goalsCreated = 0
  let tasksCreated = 0

  // Create the root goal: Buy a House
  const rootGoalId = await db.goals.add({
    title: 'Buy a House',
    description: 'Purchase our first home within the next 2 years',
    type: 'goal',
    status: 'active',
    createdAt: now,
    order: 0,
  })
  goalsCreated++

  // === Requirements (informational nodes) ===
  await db.goals.bulkAdd([
    {
      title: 'Budget: $500,000 max',
      description: 'Total budget including closing costs and initial repairs',
      parentId: rootGoalId,
      type: 'requirement',
      status: 'active',
      createdAt: now,
      order: 0,
    },
    {
      title: 'Location: Within 30 min commute',
      description: 'Prefer suburbs with good schools and public transit access',
      parentId: rootGoalId,
      type: 'requirement',
      status: 'active',
      createdAt: now,
      order: 1,
    },
    {
      title: 'Timeline: 18-24 months',
      description: 'Aim to close by Q4 2027',
      parentId: rootGoalId,
      type: 'requirement',
      status: 'active',
      createdAt: now,
      order: 2,
    },
  ])
  goalsCreated += 3

  // === Milestone 1: Financial Preparation ===
  const financialMilestoneId = await db.goals.add({
    title: 'Financial Preparation',
    description: 'Get finances in order for mortgage approval',
    parentId: rootGoalId,
    type: 'milestone',
    status: 'active',
    createdAt: now,
    order: 3,
  })
  goalsCreated++

  // Tasks for Financial Preparation
  await db.tasks.bulkAdd([
    {
      parentId: financialMilestoneId,
      title: 'Save $100,000 for down payment',
      description: 'Target 20% down to avoid PMI',
      frequency: 'once',
      isCompleted: false,
      measurement: '$100,000',
      createdAt: now,
      order: 0,
    },
    {
      parentId: financialMilestoneId,
      title: 'Review and improve credit score',
      description: 'Check credit report for errors, pay down debt',
      frequency: 'weekly',
      weeklyDays: [1], // Monday
      isCompleted: false,
      createdAt: now,
      order: 1,
    },
    {
      parentId: financialMilestoneId,
      title: 'Get pre-approved for mortgage',
      description: 'Contact at least 3 lenders to compare rates',
      frequency: 'once',
      isCompleted: false,
      createdAt: now,
      order: 2,
    },
    {
      parentId: financialMilestoneId,
      title: 'Track monthly expenses',
      description: 'Maintain budget spreadsheet to maximize savings',
      frequency: 'daily',
      isCompleted: false,
      createdAt: now,
      order: 3,
    },
  ])
  tasksCreated += 4

  // === Milestone 2: House Hunting ===
  const huntingMilestoneId = await db.goals.add({
    title: 'House Hunting',
    description: 'Research and visit potential homes',
    parentId: rootGoalId,
    type: 'milestone',
    status: 'active',
    createdAt: now,
    order: 4,
  })
  goalsCreated++

  // Tasks for House Hunting
  await db.tasks.bulkAdd([
    {
      parentId: huntingMilestoneId,
      title: 'Research neighborhoods',
      description: 'Look into crime rates, schools, amenities',
      frequency: 'weekly',
      weeklyDays: [0, 6], // Weekend
      isCompleted: false,
      createdAt: now,
      order: 0,
    },
    {
      parentId: huntingMilestoneId,
      title: 'Browse listings on Zillow/Redfin',
      description: 'Set up alerts for new listings in target areas',
      frequency: 'daily',
      isCompleted: false,
      createdAt: now,
      order: 1,
    },
    {
      parentId: huntingMilestoneId,
      title: 'Find a real estate agent',
      description: 'Interview at least 3 agents, check references',
      frequency: 'once',
      isCompleted: false,
      createdAt: now,
      order: 2,
    },
    {
      parentId: huntingMilestoneId,
      title: 'Attend open houses',
      description: 'Visit at least 2-3 houses per weekend',
      frequency: 'weekly',
      weeklyDays: [0, 6], // Weekend
      isCompleted: false,
      measurement: '2-3 houses',
      createdAt: now,
      order: 3,
    },
  ])
  tasksCreated += 4

  // === Milestone 3: Closing Process ===
  const closingMilestoneId = await db.goals.add({
    title: 'Closing Process',
    description: 'Finalize the purchase after finding the right home',
    parentId: rootGoalId,
    type: 'milestone',
    status: 'active',
    createdAt: now,
    order: 5,
  })
  goalsCreated++

  // Tasks for Closing Process
  await db.tasks.bulkAdd([
    {
      parentId: closingMilestoneId,
      title: 'Make an offer',
      description: 'Work with agent to submit competitive offer',
      frequency: 'once',
      isCompleted: false,
      createdAt: now,
      order: 0,
    },
    {
      parentId: closingMilestoneId,
      title: 'Schedule home inspection',
      description: 'Hire licensed inspector to check for issues',
      frequency: 'once',
      isCompleted: false,
      createdAt: now,
      order: 1,
    },
    {
      parentId: closingMilestoneId,
      title: 'Negotiate repairs/price',
      description: 'Based on inspection results',
      frequency: 'once',
      isCompleted: false,
      createdAt: now,
      order: 2,
    },
    {
      parentId: closingMilestoneId,
      title: 'Finalize mortgage',
      description: 'Lock in rate and complete paperwork',
      frequency: 'once',
      isCompleted: false,
      createdAt: now,
      order: 3,
    },
    {
      parentId: closingMilestoneId,
      title: 'Close on the house',
      description: 'Sign final documents and get keys!',
      frequency: 'once',
      isCompleted: false,
      createdAt: now,
      order: 4,
    },
  ])
  tasksCreated += 5

  return { goalsCreated, tasksCreated }
}

/**
 * Clears all data from the database
 */
export async function clearDatabase(): Promise<void> {
  await db.goals.clear()
  await db.tasks.clear()
  await db.settings.clear()
}
