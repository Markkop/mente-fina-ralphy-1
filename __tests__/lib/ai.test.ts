import { describe, it, expect, beforeEach, afterEach } from "vitest"
import {
  getOpenAIKey,
  setOpenAIKey,
  removeOpenAIKey,
  hasOpenAIKey,
  createOpenAIClient,
  DEFAULT_CHAT_MODEL,
  GOALTREE_SYSTEM_PROMPT,
} from "@/lib/ai"

describe("AI configuration utilities", () => {
  const TEST_API_KEY = "sk-test-key-12345"

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe("getOpenAIKey", () => {
    it("returns null when no key is stored", () => {
      expect(getOpenAIKey()).toBeNull()
    })

    it("returns the stored API key", () => {
      localStorage.setItem("goaltree-openai-api-key", TEST_API_KEY)
      expect(getOpenAIKey()).toBe(TEST_API_KEY)
    })
  })

  describe("setOpenAIKey", () => {
    it("stores the API key in localStorage", () => {
      setOpenAIKey(TEST_API_KEY)
      expect(localStorage.getItem("goaltree-openai-api-key")).toBe(TEST_API_KEY)
    })

    it("overwrites an existing API key", () => {
      setOpenAIKey("old-key")
      setOpenAIKey(TEST_API_KEY)
      expect(localStorage.getItem("goaltree-openai-api-key")).toBe(TEST_API_KEY)
    })
  })

  describe("removeOpenAIKey", () => {
    it("removes the API key from localStorage", () => {
      localStorage.setItem("goaltree-openai-api-key", TEST_API_KEY)
      removeOpenAIKey()
      expect(localStorage.getItem("goaltree-openai-api-key")).toBeNull()
    })

    it("does not throw when no key exists", () => {
      expect(() => removeOpenAIKey()).not.toThrow()
    })
  })

  describe("hasOpenAIKey", () => {
    it("returns false when no key is stored", () => {
      expect(hasOpenAIKey()).toBe(false)
    })

    it("returns true when a key is stored", () => {
      setOpenAIKey(TEST_API_KEY)
      expect(hasOpenAIKey()).toBe(true)
    })

    it("returns false after key is removed", () => {
      setOpenAIKey(TEST_API_KEY)
      removeOpenAIKey()
      expect(hasOpenAIKey()).toBe(false)
    })
  })

  describe("createOpenAIClient", () => {
    it("returns null when no API key is configured", () => {
      const client = createOpenAIClient()
      expect(client).toBeNull()
    })

    it("returns an OpenAI provider when API key is configured", () => {
      setOpenAIKey(TEST_API_KEY)
      const client = createOpenAIClient()
      expect(client).not.toBeNull()
      expect(typeof client).toBe("function")
    })
  })

  describe("constants", () => {
    it("exports DEFAULT_CHAT_MODEL", () => {
      expect(DEFAULT_CHAT_MODEL).toBe("gpt-4o-mini")
    })

    it("exports GOALTREE_SYSTEM_PROMPT", () => {
      expect(GOALTREE_SYSTEM_PROMPT).toContain("GoalTree")
      expect(GOALTREE_SYSTEM_PROMPT).toContain("Goal")
      expect(GOALTREE_SYSTEM_PROMPT).toContain("Milestone")
      expect(GOALTREE_SYSTEM_PROMPT).toContain("Task")
      expect(GOALTREE_SYSTEM_PROMPT).toContain("Requirement")
    })

    it("system prompt includes JSON format instructions", () => {
      expect(GOALTREE_SYSTEM_PROMPT).toContain("JSON")
      expect(GOALTREE_SYSTEM_PROMPT).toContain('"type"')
      expect(GOALTREE_SYSTEM_PROMPT).toContain('"title"')
    })
  })
})
