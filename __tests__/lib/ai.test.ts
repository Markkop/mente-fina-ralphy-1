import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import {
  getOpenAIKey,
  setOpenAIKey,
  removeOpenAIKey,
  hasOpenAIKey,
  createOpenAIClient,
  DEFAULT_CHAT_MODEL,
  GOALTREE_SYSTEM_PROMPT,
  extractJSONFromText,
  parseAIResponse,
  applyAISuggestions,
  parseAndApplyAIResponse,
  type AISuggestionNode,
  type ApplyStoreActions,
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

describe("extractJSONFromText", () => {
  it("extracts JSON from markdown code blocks", () => {
    const text = `Here's a goal structure:
\`\`\`json
{"type": "goal", "title": "Learn Spanish"}
\`\`\`
Let me know if you want changes.`

    const result = extractJSONFromText(text)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ type: "goal", title: "Learn Spanish" })
  })

  it("extracts JSON from code blocks without language tag", () => {
    const text = `Here's a suggestion:
\`\`\`
{"type": "milestone", "title": "Complete course"}
\`\`\``

    const result = extractJSONFromText(text)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ type: "milestone", title: "Complete course" })
  })

  it("extracts multiple JSON objects from text", () => {
    const text = `
\`\`\`json
{"type": "goal", "title": "Goal 1"}
\`\`\`

\`\`\`json
{"type": "goal", "title": "Goal 2"}
\`\`\`
`
    const result = extractJSONFromText(text)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ type: "goal", title: "Goal 1" })
    expect(result[1]).toEqual({ type: "goal", title: "Goal 2" })
  })

  it("handles JSON with nested objects", () => {
    const text = `\`\`\`json
{
  "type": "goal",
  "title": "Buy a house",
  "children": [
    {"type": "milestone", "title": "Save for down payment"},
    {"type": "requirement", "title": "Budget: $500k"}
  ]
}
\`\`\``

    const result = extractJSONFromText(text)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      type: "goal",
      title: "Buy a house",
      children: [
        { type: "milestone", title: "Save for down payment" },
        { type: "requirement", title: "Budget: $500k" },
      ],
    })
  })

  it("returns empty array when no JSON found", () => {
    const text = "This is just regular text without any JSON."
    const result = extractJSONFromText(text)
    expect(result).toEqual([])
  })

  it("skips invalid JSON in code blocks", () => {
    const text = `\`\`\`json
{invalid json}
\`\`\`

\`\`\`json
{"type": "goal", "title": "Valid"}
\`\`\``

    const result = extractJSONFromText(text)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ type: "goal", title: "Valid" })
  })
})

describe("parseAIResponse", () => {
  it("parses valid goal suggestion", () => {
    const text = `\`\`\`json
{"type": "goal", "title": "Learn Spanish", "description": "Become fluent in 1 year"}
\`\`\``

    const result = parseAIResponse(text)
    expect(result.success).toBe(true)
    expect(result.suggestions).toHaveLength(1)
    expect(result.suggestions[0]).toEqual({
      type: "goal",
      title: "Learn Spanish",
      description: "Become fluent in 1 year",
    })
    expect(result.errors).toHaveLength(0)
  })

  it("parses valid milestone suggestion", () => {
    const text = `\`\`\`json
{"type": "milestone", "title": "Complete A1 Level"}
\`\`\``

    const result = parseAIResponse(text)
    expect(result.success).toBe(true)
    expect(result.suggestions).toHaveLength(1)
    expect(result.suggestions[0]).toEqual({
      type: "milestone",
      title: "Complete A1 Level",
    })
  })

  it("parses valid requirement suggestion", () => {
    const text = `\`\`\`json
{"type": "requirement", "title": "Budget: $200/month"}
\`\`\``

    const result = parseAIResponse(text)
    expect(result.success).toBe(true)
    expect(result.suggestions).toHaveLength(1)
    expect(result.suggestions[0]).toEqual({
      type: "requirement",
      title: "Budget: $200/month",
    })
  })

  it("parses valid task suggestion with frequency", () => {
    const text = `\`\`\`json
{"type": "task", "title": "Practice vocabulary", "frequency": "daily"}
\`\`\``

    const result = parseAIResponse(text)
    expect(result.success).toBe(true)
    expect(result.suggestions).toHaveLength(1)
    expect(result.suggestions[0]).toEqual({
      type: "task",
      title: "Practice vocabulary",
      frequency: "daily",
    })
  })

  it("defaults task frequency to 'once' if not specified", () => {
    const text = `\`\`\`json
{"type": "task", "title": "Buy textbook"}
\`\`\``

    const result = parseAIResponse(text)
    expect(result.success).toBe(true)
    expect(result.suggestions[0].frequency).toBe("once")
  })

  it("parses nested hierarchy correctly", () => {
    const text = `\`\`\`json
{
  "type": "goal",
  "title": "Learn Spanish",
  "children": [
    {
      "type": "requirement",
      "title": "Budget: $200/month"
    },
    {
      "type": "milestone",
      "title": "Complete A1",
      "children": [
        {"type": "task", "title": "Complete lessons 1-10", "frequency": "weekly"}
      ]
    }
  ]
}
\`\`\``

    const result = parseAIResponse(text)
    expect(result.success).toBe(true)
    expect(result.suggestions).toHaveLength(1)
    expect(result.suggestions[0].children).toHaveLength(2)
    expect(result.suggestions[0].children![1].children).toHaveLength(1)
  })

  it("rejects invalid node type", () => {
    const text = `\`\`\`json
{"type": "invalid", "title": "Test"}
\`\`\``

    const result = parseAIResponse(text)
    expect(result.success).toBe(false)
    expect(result.suggestions).toHaveLength(0)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain("type")
  })

  it("rejects missing title", () => {
    const text = `\`\`\`json
{"type": "goal"}
\`\`\``

    const result = parseAIResponse(text)
    expect(result.success).toBe(false)
    expect(result.errors[0]).toContain("title")
  })

  it("rejects empty title", () => {
    const text = `\`\`\`json
{"type": "goal", "title": "   "}
\`\`\``

    const result = parseAIResponse(text)
    expect(result.success).toBe(false)
    expect(result.errors[0]).toContain("title")
  })

  it("rejects tasks with children", () => {
    const text = `\`\`\`json
{
  "type": "task",
  "title": "A task",
  "children": [{"type": "task", "title": "Subtask"}]
}
\`\`\``

    const result = parseAIResponse(text)
    expect(result.success).toBe(false)
    expect(result.errors[0]).toContain("Tasks cannot have children")
  })

  it("rejects invalid frequency for tasks", () => {
    const text = `\`\`\`json
{"type": "task", "title": "Test", "frequency": "yearly"}
\`\`\``

    const result = parseAIResponse(text)
    expect(result.success).toBe(false)
    expect(result.errors[0]).toContain("frequency")
  })

  it("handles empty or null response", () => {
    expect(parseAIResponse("").success).toBe(false)
    expect(parseAIResponse("").errors[0]).toContain("empty")
  })

  it("returns success with no suggestions when no JSON found", () => {
    const result = parseAIResponse("Just some text without JSON")
    expect(result.success).toBe(true)
    expect(result.suggestions).toHaveLength(0)
    expect(result.errors).toHaveLength(0)
  })

  it("trims whitespace from title and description", () => {
    const text = `\`\`\`json
{"type": "goal", "title": "  Learn Spanish  ", "description": "  Become fluent  "}
\`\`\``

    const result = parseAIResponse(text)
    expect(result.suggestions[0].title).toBe("Learn Spanish")
    expect(result.suggestions[0].description).toBe("Become fluent")
  })

  it("handles array of suggestions", () => {
    const text = `\`\`\`json
[
  {"type": "goal", "title": "Goal 1"},
  {"type": "goal", "title": "Goal 2"}
]
\`\`\``

    const result = parseAIResponse(text)
    expect(result.success).toBe(true)
    expect(result.suggestions).toHaveLength(2)
  })
})

describe("applyAISuggestions", () => {
  let mockStore: ApplyStoreActions
  let createdNodes: { type: string; data: Record<string, unknown> }[]

  beforeEach(() => {
    createdNodes = []
    let nodeId = 1

    mockStore = {
      addGoal: vi.fn().mockImplementation(async (input) => {
        const id = nodeId++
        createdNodes.push({ type: "goal", data: { ...input, id } })
        return id
      }),
      addMilestone: vi.fn().mockImplementation(async (input) => {
        const id = nodeId++
        createdNodes.push({ type: "milestone", data: { ...input, id } })
        return id
      }),
      addRequirement: vi.fn().mockImplementation(async (input) => {
        const id = nodeId++
        createdNodes.push({ type: "requirement", data: { ...input, id } })
        return id
      }),
      addTask: vi.fn().mockImplementation(async (input) => {
        const id = nodeId++
        createdNodes.push({ type: "task", data: { ...input, id } })
        return id
      }),
    }
  })

  it("applies a simple goal suggestion", async () => {
    const suggestions: AISuggestionNode[] = [
      { type: "goal", title: "Learn Spanish", description: "Become fluent" },
    ]

    const result = await applyAISuggestions(suggestions, mockStore)

    expect(result.success).toBe(true)
    expect(result.createdNodeIds).toEqual([1])
    expect(result.totalNodesCreated).toBe(1)
    expect(result.errors).toHaveLength(0)

    expect(mockStore.addGoal).toHaveBeenCalledWith({
      title: "Learn Spanish",
      description: "Become fluent",
      parentId: null,
    })
  })

  it("applies nested hierarchy correctly", async () => {
    const suggestions: AISuggestionNode[] = [
      {
        type: "goal",
        title: "Learn Spanish",
        children: [
          { type: "requirement", title: "Budget: $200" },
          {
            type: "milestone",
            title: "Complete A1",
            children: [{ type: "task", title: "Finish lessons", frequency: "weekly" }],
          },
        ],
      },
    ]

    const result = await applyAISuggestions(suggestions, mockStore)

    expect(result.success).toBe(true)
    expect(result.totalNodesCreated).toBe(4)
    expect(result.createdNodeIds).toEqual([1]) // Only root ID

    // Check call order and parent relationships
    expect(createdNodes).toHaveLength(4)
    expect(createdNodes[0]).toEqual({
      type: "goal",
      data: { title: "Learn Spanish", parentId: null, id: 1 },
    })
    expect(createdNodes[1]).toEqual({
      type: "requirement",
      data: { title: "Budget: $200", parentId: 1, id: 2 },
    })
    expect(createdNodes[2]).toEqual({
      type: "milestone",
      data: { title: "Complete A1", parentId: 1, id: 3 },
    })
    expect(createdNodes[3]).toEqual({
      type: "task",
      data: { title: "Finish lessons", parentId: 3, frequency: "weekly", id: 4 },
    })
  })

  it("applies multiple root suggestions", async () => {
    const suggestions: AISuggestionNode[] = [
      { type: "goal", title: "Goal 1" },
      { type: "goal", title: "Goal 2" },
    ]

    const result = await applyAISuggestions(suggestions, mockStore)

    expect(result.success).toBe(true)
    expect(result.totalNodesCreated).toBe(2)
    expect(result.createdNodeIds).toEqual([1, 2])
  })

  it("applies to specified parent", async () => {
    const suggestions: AISuggestionNode[] = [
      { type: "milestone", title: "Milestone under parent" },
    ]

    const result = await applyAISuggestions(suggestions, mockStore, 100)

    expect(result.success).toBe(true)
    expect(mockStore.addMilestone).toHaveBeenCalledWith({
      title: "Milestone under parent",
      parentId: 100,
    })
  })

  it("handles empty suggestions array", async () => {
    const result = await applyAISuggestions([], mockStore)

    expect(result.success).toBe(true)
    expect(result.totalNodesCreated).toBe(0)
    expect(result.createdNodeIds).toHaveLength(0)
  })

  it("returns error when milestone has no parent", async () => {
    const suggestions: AISuggestionNode[] = [
      { type: "milestone", title: "Orphan milestone" },
    ]

    const result = await applyAISuggestions(suggestions, mockStore, null)

    expect(result.success).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain("must have a parent")
  })

  it("returns error when requirement has no parent", async () => {
    const suggestions: AISuggestionNode[] = [
      { type: "requirement", title: "Orphan requirement" },
    ]

    const result = await applyAISuggestions(suggestions, mockStore, null)

    expect(result.success).toBe(false)
    expect(result.errors[0]).toContain("must have a parent")
  })

  it("returns error when task has no parent", async () => {
    const suggestions: AISuggestionNode[] = [{ type: "task", title: "Orphan task", frequency: "once" }]

    const result = await applyAISuggestions(suggestions, mockStore, null)

    expect(result.success).toBe(false)
    expect(result.errors[0]).toContain("must have a parent")
  })

  it("continues applying other suggestions after error", async () => {
    const suggestions: AISuggestionNode[] = [
      { type: "milestone", title: "Orphan" }, // Will fail
      { type: "goal", title: "Valid goal" }, // Should succeed
    ]

    const result = await applyAISuggestions(suggestions, mockStore, null)

    expect(result.success).toBe(false)
    expect(result.totalNodesCreated).toBe(1)
    expect(result.createdNodeIds).toEqual([1])
    expect(result.errors).toHaveLength(1)
  })

  it("handles store errors gracefully", async () => {
    mockStore.addGoal = vi.fn().mockRejectedValue(new Error("Database error"))

    const suggestions: AISuggestionNode[] = [{ type: "goal", title: "Test" }]

    const result = await applyAISuggestions(suggestions, mockStore)

    expect(result.success).toBe(false)
    expect(result.errors[0]).toContain("Database error")
  })

  it("applies task with default frequency", async () => {
    const suggestions: AISuggestionNode[] = [
      {
        type: "goal",
        title: "Goal",
        children: [{ type: "task", title: "Task without frequency" }],
      },
    ]

    await applyAISuggestions(suggestions, mockStore)

    expect(mockStore.addTask).toHaveBeenCalledWith({
      title: "Task without frequency",
      parentId: 1,
      frequency: "once",
    })
  })
})

describe("parseAndApplyAIResponse", () => {
  let mockStore: ApplyStoreActions

  beforeEach(() => {
    let nodeId = 1
    mockStore = {
      addGoal: vi.fn().mockImplementation(async () => nodeId++),
      addMilestone: vi.fn().mockImplementation(async () => nodeId++),
      addRequirement: vi.fn().mockImplementation(async () => nodeId++),
      addTask: vi.fn().mockImplementation(async () => nodeId++),
    }
  })

  it("parses and applies valid response in one call", async () => {
    const text = `\`\`\`json
{"type": "goal", "title": "Learn Piano"}
\`\`\``

    const result = await parseAndApplyAIResponse(text, mockStore)

    expect(result.success).toBe(true)
    expect(result.totalNodesCreated).toBe(1)
    expect(result.parseErrors).toHaveLength(0)
    expect(mockStore.addGoal).toHaveBeenCalled()
  })

  it("returns parse errors when JSON is invalid", async () => {
    const text = `\`\`\`json
{"type": "invalid", "title": "Test"}
\`\`\``

    const result = await parseAndApplyAIResponse(text, mockStore)

    expect(result.success).toBe(false)
    expect(result.parseErrors).toHaveLength(1)
    expect(result.totalNodesCreated).toBe(0)
  })

  it("handles response with no JSON gracefully", async () => {
    const result = await parseAndApplyAIResponse("Just regular text", mockStore)

    expect(result.success).toBe(true)
    expect(result.totalNodesCreated).toBe(0)
    expect(result.parseErrors).toHaveLength(0)
  })

  it("applies to specified parent", async () => {
    const text = `\`\`\`json
{"type": "milestone", "title": "Test Milestone"}
\`\`\``

    const result = await parseAndApplyAIResponse(text, mockStore, 50)

    expect(result.success).toBe(true)
    expect(mockStore.addMilestone).toHaveBeenCalledWith({
      title: "Test Milestone",
      parentId: 50,
    })
  })
})
