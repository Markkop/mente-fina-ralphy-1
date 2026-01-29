"use client"

import { useCallback, useSyncExternalStore } from "react"
import { createOpenAI, type OpenAIProvider } from "@ai-sdk/openai"

const API_KEY_STORAGE_KEY = "goaltree-openai-api-key"

/**
 * Retrieves the OpenAI API key from LocalStorage
 * @returns The stored API key or null if not set
 */
export function getOpenAIKey(): string | null {
  if (typeof window === "undefined") {
    return null
  }
  return localStorage.getItem(API_KEY_STORAGE_KEY)
}

/**
 * Stores the OpenAI API key in LocalStorage
 * @param key - The API key to store
 */
export function setOpenAIKey(key: string): void {
  if (typeof window === "undefined") {
    return
  }
  localStorage.setItem(API_KEY_STORAGE_KEY, key)
}

/**
 * Removes the OpenAI API key from LocalStorage
 */
export function removeOpenAIKey(): void {
  if (typeof window === "undefined") {
    return
  }
  localStorage.removeItem(API_KEY_STORAGE_KEY)
}

/**
 * Checks if an OpenAI API key is configured
 * @returns true if an API key exists in LocalStorage
 */
export function hasOpenAIKey(): boolean {
  return getOpenAIKey() !== null
}

// Event emitter for localStorage changes
const listeners = new Set<() => void>()

function emitChange() {
  for (const listener of listeners) {
    listener()
  }
}

function subscribe(callback: () => void) {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

function getSnapshot(): string | null {
  return getOpenAIKey()
}

function getServerSnapshot(): string | null {
  return null
}

/**
 * React hook to manage OpenAI API key in LocalStorage
 * Provides reactive state and methods for key management
 * Uses useSyncExternalStore for proper synchronization with localStorage
 */
export function useOpenAIKey() {
  // Use useSyncExternalStore to subscribe to localStorage changes
  const apiKey = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  // Save key to localStorage and notify listeners
  const saveApiKey = useCallback((key: string) => {
    setOpenAIKey(key)
    emitChange()
  }, [])

  // Remove key from localStorage and notify listeners
  const clearApiKey = useCallback(() => {
    removeOpenAIKey()
    emitChange()
  }, [])

  // Check if key is set
  const hasKey = apiKey !== null && apiKey.length > 0

  // isLoaded is always true on client after hydration
  const isLoaded = typeof window !== "undefined"

  return {
    apiKey,
    hasKey,
    isLoaded,
    saveApiKey,
    clearApiKey,
  }
}

/**
 * Creates an OpenAI provider instance configured for client-side usage
 * Uses the API key stored in LocalStorage
 * @returns OpenAI provider instance or null if no API key is configured
 */
export function createOpenAIClient(): OpenAIProvider | null {
  const apiKey = getOpenAIKey()
  
  if (!apiKey) {
    return null
  }

  return createOpenAI({
    apiKey,
    // Note: The AI SDK's createOpenAI supports browser usage by default
    // The API key is stored in user's LocalStorage and never sent to a backend
    // Safe in our case since:
    // 1. The API key is provided by the user themselves
    // 2. It's stored only in their local browser storage
    // 3. No data is sent to any backend server
  })
}

/**
 * Gets the default model ID for chat completions
 */
export const DEFAULT_CHAT_MODEL = "gpt-4o-mini"

/**
 * System prompt for the GoalTree AI assistant
 */
export const GOALTREE_SYSTEM_PROMPT = `You are GoalTree's AI assistant, helping users transform vague aspirations into structured, actionable plans.

Your capabilities:
- Goal Extraction: Turn vague statements into structured goal trees
- Context Awareness: Understand the user's current goals and suggest relevant improvements
- Interactive Editing: Propose structured changes that can be applied to the goal tree
- Brainstorming: Help define requirements, milestones, and tasks

The hierarchy you work with:
1. Goal: Root or sub-root objective (e.g., "Buy a house", "Learn Spanish")
2. Requirement: Informational constraints, not checkable (e.g., "Budget: $500k")
3. Milestone: Significant checkpoints grouping related tasks (e.g., "Financial Preparation")
4. Task: Actionable items, can be one-time or recurring with frequency (Daily, Weekly, Custom)

When suggesting goal structures, format them as JSON that can be parsed and applied:
{
  "type": "goal" | "requirement" | "milestone" | "task",
  "title": "string",
  "description": "optional string",
  "children": [...recursive structure]
}

Be helpful, concise, and always let the user have the final say on their plans.`

// ============================================
// AI Suggestion Types and Parser
// ============================================

/**
 * Valid node types that the AI can suggest
 */
export type AISuggestionNodeType = 'goal' | 'requirement' | 'milestone' | 'task'

/**
 * Structure for an AI-suggested node
 */
export interface AISuggestionNode {
  type: AISuggestionNodeType
  title: string
  description?: string
  children?: AISuggestionNode[]
  /** Task-specific: frequency of the task */
  frequency?: 'once' | 'daily' | 'weekly' | 'custom'
}

/**
 * Result of parsing an AI response
 */
export interface ParseAIResponseResult {
  success: boolean
  suggestions: AISuggestionNode[]
  errors: string[]
}

/**
 * Validates if a value is a valid node type
 */
function isValidNodeType(value: unknown): value is AISuggestionNodeType {
  return typeof value === 'string' && ['goal', 'requirement', 'milestone', 'task'].includes(value)
}

/**
 * Validates if a value is a valid task frequency
 */
function isValidTaskFrequency(value: unknown): value is 'once' | 'daily' | 'weekly' | 'custom' {
  return typeof value === 'string' && ['once', 'daily', 'weekly', 'custom'].includes(value)
}

/**
 * Validates and parses a single suggestion node
 */
function validateSuggestionNode(node: unknown, path: string = 'root'): { valid: boolean; node?: AISuggestionNode; error?: string } {
  if (typeof node !== 'object' || node === null) {
    return { valid: false, error: `${path}: Expected object, got ${typeof node}` }
  }

  const obj = node as Record<string, unknown>

  // Validate type
  if (!isValidNodeType(obj.type)) {
    return { valid: false, error: `${path}.type: Invalid or missing node type. Expected 'goal', 'requirement', 'milestone', or 'task'` }
  }

  // Validate title
  if (typeof obj.title !== 'string' || obj.title.trim() === '') {
    return { valid: false, error: `${path}.title: Title must be a non-empty string` }
  }

  // Validate description (optional)
  if (obj.description !== undefined && typeof obj.description !== 'string') {
    return { valid: false, error: `${path}.description: Description must be a string` }
  }

  // Validate frequency for tasks (optional, defaults to 'once')
  if (obj.type === 'task' && obj.frequency !== undefined && !isValidTaskFrequency(obj.frequency)) {
    return { valid: false, error: `${path}.frequency: Invalid frequency. Expected 'once', 'daily', 'weekly', or 'custom'` }
  }

  // Validate children (optional)
  const validatedChildren: AISuggestionNode[] = []
  if (obj.children !== undefined) {
    if (!Array.isArray(obj.children)) {
      return { valid: false, error: `${path}.children: Children must be an array` }
    }

    // Tasks cannot have children
    if (obj.type === 'task' && obj.children.length > 0) {
      return { valid: false, error: `${path}.children: Tasks cannot have children` }
    }

    for (let i = 0; i < obj.children.length; i++) {
      const childResult = validateSuggestionNode(obj.children[i], `${path}.children[${i}]`)
      if (!childResult.valid) {
        return childResult
      }
      validatedChildren.push(childResult.node!)
    }
  }

  const validatedNode: AISuggestionNode = {
    type: obj.type,
    title: obj.title.trim(),
    ...(obj.description && { description: (obj.description as string).trim() }),
    ...(validatedChildren.length > 0 && { children: validatedChildren }),
    ...(obj.type === 'task' && { frequency: (obj.frequency as AISuggestionNode['frequency']) ?? 'once' }),
  }

  return { valid: true, node: validatedNode }
}

/**
 * Extracts JSON objects from a text response
 * Handles JSON embedded in markdown code blocks or plain text
 */
export function extractJSONFromText(text: string): unknown[] {
  const results: unknown[] = []

  // Pattern 1: JSON in markdown code blocks
  const codeBlockPattern = /```(?:json)?\s*([\s\S]*?)```/g
  let match: RegExpExecArray | null

  while ((match = codeBlockPattern.exec(text)) !== null) {
    const content = match[1].trim()
    try {
      const parsed = JSON.parse(content)
      results.push(parsed)
    } catch {
      // Not valid JSON, skip
    }
  }

  // Pattern 2: Standalone JSON objects (not in code blocks)
  // Look for balanced braces
  const jsonObjectPattern = /\{[\s\S]*?\}(?=\s*(?:\{|\[|$|[^,\s\w]))/g
  const textWithoutCodeBlocks = text.replace(/```[\s\S]*?```/g, '')
  
  while ((match = jsonObjectPattern.exec(textWithoutCodeBlocks)) !== null) {
    try {
      const parsed = JSON.parse(match[0])
      // Only add if it looks like a suggestion (has type and title)
      if (typeof parsed === 'object' && parsed !== null && 'type' in parsed && 'title' in parsed) {
        results.push(parsed)
      }
    } catch {
      // Try to find a complete JSON object starting at this position
      const startIdx = match.index
      let braceCount = 0
      let inString = false
      let escapeNext = false
      let endIdx = startIdx

      for (let i = startIdx; i < textWithoutCodeBlocks.length; i++) {
        const char = textWithoutCodeBlocks[i]
        
        if (escapeNext) {
          escapeNext = false
          continue
        }

        if (char === '\\' && inString) {
          escapeNext = true
          continue
        }

        if (char === '"' && !escapeNext) {
          inString = !inString
          continue
        }

        if (!inString) {
          if (char === '{') braceCount++
          if (char === '}') {
            braceCount--
            if (braceCount === 0) {
              endIdx = i + 1
              break
            }
          }
        }
      }

      if (endIdx > startIdx && braceCount === 0) {
        try {
          const jsonStr = textWithoutCodeBlocks.slice(startIdx, endIdx)
          const parsed = JSON.parse(jsonStr)
          if (typeof parsed === 'object' && parsed !== null && 'type' in parsed && 'title' in parsed) {
            results.push(parsed)
          }
        } catch {
          // Still not valid, skip
        }
      }
    }
  }

  return results
}

/**
 * Parses an AI response text and extracts valid suggestion nodes
 * 
 * @param responseText - The raw text response from the AI
 * @returns ParseAIResponseResult with validated suggestions and any errors
 */
export function parseAIResponse(responseText: string): ParseAIResponseResult {
  const suggestions: AISuggestionNode[] = []
  const errors: string[] = []

  if (!responseText || typeof responseText !== 'string') {
    return { success: false, suggestions: [], errors: ['Response text is empty or invalid'] }
  }

  const jsonObjects = extractJSONFromText(responseText)

  if (jsonObjects.length === 0) {
    return { success: true, suggestions: [], errors: [] }
  }

  for (let i = 0; i < jsonObjects.length; i++) {
    const obj = jsonObjects[i]
    
    // Handle arrays of suggestions
    if (Array.isArray(obj)) {
      for (let j = 0; j < obj.length; j++) {
        const result = validateSuggestionNode(obj[j], `suggestion[${i}][${j}]`)
        if (result.valid && result.node) {
          suggestions.push(result.node)
        } else if (result.error) {
          errors.push(result.error)
        }
      }
    } else {
      const result = validateSuggestionNode(obj, `suggestion[${i}]`)
      if (result.valid && result.node) {
        suggestions.push(result.node)
      } else if (result.error) {
        errors.push(result.error)
      }
    }
  }

  return {
    success: suggestions.length > 0 || errors.length === 0,
    suggestions,
    errors,
  }
}

// ============================================
// Apply AI Suggestions to Database
// ============================================

/**
 * Interface for store actions needed to apply suggestions
 * This allows for dependency injection in tests
 */
export interface ApplyStoreActions {
  addGoal: (input: { title: string; description?: string; parentId?: number | null }) => Promise<number>
  addMilestone: (input: { title: string; description?: string; parentId?: number | null }) => Promise<number>
  addRequirement: (input: { title: string; description?: string; parentId?: number | null }) => Promise<number>
  addTask: (input: { parentId: number; title: string; description?: string; frequency: 'once' | 'daily' | 'weekly' | 'custom' }) => Promise<number>
}

/**
 * Result of applying AI suggestions
 */
export interface ApplyAISuggestionResult {
  success: boolean
  /** IDs of created nodes, mapped by their index in the original suggestion */
  createdNodeIds: number[]
  /** Number of nodes created in total (including children) */
  totalNodesCreated: number
  /** Any errors that occurred during application */
  errors: string[]
}

/**
 * Recursively applies a suggestion node and its children to the database
 * 
 * @param node - The suggestion node to apply
 * @param parentId - Parent node ID (null for root goals)
 * @param store - Store actions for creating nodes
 * @returns Array of created node IDs
 */
async function applyNodeRecursive(
  node: AISuggestionNode,
  parentId: number | null,
  store: ApplyStoreActions
): Promise<number[]> {
  const createdIds: number[] = []
  let nodeId: number

  // Create the node based on its type
  switch (node.type) {
    case 'goal':
      nodeId = await store.addGoal({
        title: node.title,
        description: node.description,
        parentId,
      })
      break

    case 'milestone':
      if (parentId === null) {
        throw new Error('Milestones must have a parent goal')
      }
      nodeId = await store.addMilestone({
        title: node.title,
        description: node.description,
        parentId,
      })
      break

    case 'requirement':
      if (parentId === null) {
        throw new Error('Requirements must have a parent goal')
      }
      nodeId = await store.addRequirement({
        title: node.title,
        description: node.description,
        parentId,
      })
      break

    case 'task':
      if (parentId === null) {
        throw new Error('Tasks must have a parent')
      }
      nodeId = await store.addTask({
        parentId,
        title: node.title,
        description: node.description,
        frequency: node.frequency ?? 'once',
      })
      break

    default:
      throw new Error(`Unknown node type: ${(node as AISuggestionNode).type}`)
  }

  createdIds.push(nodeId)

  // Recursively create children
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      const childIds = await applyNodeRecursive(child, nodeId, store)
      createdIds.push(...childIds)
    }
  }

  return createdIds
}

/**
 * Applies AI suggestions to the database
 * 
 * This function takes parsed AI suggestions and creates the corresponding
 * nodes in the Dexie database, maintaining the hierarchical structure.
 * 
 * @param suggestions - Array of validated AI suggestion nodes
 * @param store - Store actions for creating nodes
 * @param parentId - Optional parent ID to attach suggestions to (null for root)
 * @returns ApplyAISuggestionResult with created node IDs and status
 * 
 * @example
 * ```tsx
 * const { suggestions } = parseAIResponse(aiMessage)
 * const store = useGoalStore.getState()
 * const result = await applyAISuggestions(suggestions, store)
 * if (result.success) {
 *   console.log(`Created ${result.totalNodesCreated} nodes`)
 * }
 * ```
 */
export async function applyAISuggestions(
  suggestions: AISuggestionNode[],
  store: ApplyStoreActions,
  parentId: number | null = null
): Promise<ApplyAISuggestionResult> {
  const createdNodeIds: number[] = []
  const errors: string[] = []
  let totalNodesCreated = 0

  if (!suggestions || suggestions.length === 0) {
    return {
      success: true,
      createdNodeIds: [],
      totalNodesCreated: 0,
      errors: [],
    }
  }

  for (let i = 0; i < suggestions.length; i++) {
    const suggestion = suggestions[i]
    
    try {
      const ids = await applyNodeRecursive(suggestion, parentId, store)
      if (ids.length > 0) {
        createdNodeIds.push(ids[0]) // First ID is the root of this suggestion
        totalNodesCreated += ids.length
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      errors.push(`Failed to apply suggestion[${i}] "${suggestion.title}": ${errorMessage}`)
    }
  }

  return {
    success: errors.length === 0,
    createdNodeIds,
    totalNodesCreated,
    errors,
  }
}

/**
 * Convenience function that parses an AI response and applies valid suggestions
 * 
 * @param responseText - Raw AI response text
 * @param store - Store actions for creating nodes
 * @param parentId - Optional parent ID to attach suggestions to
 * @returns Combined result of parsing and applying
 * 
 * @example
 * ```tsx
 * const store = useGoalStore.getState()
 * const result = await parseAndApplyAIResponse(aiMessage, store)
 * if (result.success) {
 *   toast.success(`Created ${result.totalNodesCreated} nodes`)
 * } else {
 *   toast.error(result.errors.join(', '))
 * }
 * ```
 */
export async function parseAndApplyAIResponse(
  responseText: string,
  store: ApplyStoreActions,
  parentId: number | null = null
): Promise<ApplyAISuggestionResult & { parseErrors: string[] }> {
  const parseResult = parseAIResponse(responseText)
  
  if (!parseResult.success && parseResult.suggestions.length === 0) {
    return {
      success: false,
      createdNodeIds: [],
      totalNodesCreated: 0,
      errors: [],
      parseErrors: parseResult.errors,
    }
  }

  const applyResult = await applyAISuggestions(parseResult.suggestions, store, parentId)
  
  return {
    ...applyResult,
    parseErrors: parseResult.errors,
  }
}
