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
    // Using dangerouslyAllowBrowser for local-first architecture
    // The API key is stored in user's LocalStorage and never sent to a backend
    compatibility: "strict",
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
