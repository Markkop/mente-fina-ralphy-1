'use client'

import { useState, useRef, useEffect, useCallback, FormEvent } from 'react'
import {
  MessageSquare,
  Send,
  Settings,
  Key,
  Trash2,
  Loader2,
  AlertCircle,
  Bot,
  User,
  PanelRightClose,
} from 'lucide-react'
import { useChat, type UIMessage } from '@ai-sdk/react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  useOpenAIKey,
  createOpenAIClient,
  GOALTREE_SYSTEM_PROMPT,
  DEFAULT_CHAT_MODEL,
} from '@/lib/ai'

/**
 * Props for the ChatSidebar component
 */
export interface ChatSidebarProps {
  /** Optional className for custom styling */
  className?: string
  /** Whether the sidebar is open */
  open?: boolean
  /** Callback when the sidebar open state changes */
  onOpenChange?: (open: boolean) => void
  /** Default open state (uncontrolled mode) */
  defaultOpen?: boolean
}

/**
 * Message type for chat interface - supports both content string and parts array
 */
interface ChatMessageData {
  id: string
  role: 'user' | 'assistant' | 'system'
  content?: string
  parts?: Array<{ type: string; text?: string }>
}

/**
 * Helper function to extract text content from a message
 * Supports both legacy 'content' string format and newer 'parts' array format
 */
function getMessageContent(message: ChatMessageData): string {
  // Handle direct content string
  if (typeof message.content === 'string') {
    return message.content
  }
  // Handle parts array (Vercel AI SDK UIMessage format)
  if (Array.isArray(message.parts)) {
    return message.parts
      .filter((part) => part.type === 'text' && typeof part.text === 'string')
      .map((part) => part.text)
      .join('')
  }
  return ''
}

/**
 * Props for the ChatMessageItem component
 */
interface ChatMessageItemProps {
  message: ChatMessageData
}

/**
 * ChatMessageItem component - renders a single chat message
 */
function ChatMessageItem({ message }: ChatMessageItemProps) {
  const isAssistant = message.role === 'assistant'
  const content = getMessageContent(message)

  return (
    <div
      className={cn(
        'flex gap-3 p-3 rounded-lg',
        isAssistant ? 'bg-muted' : 'bg-primary/5'
      )}
      data-testid={`chat-message-${message.id}`}
      data-role={message.role}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isAssistant ? 'bg-primary text-primary-foreground' : 'bg-secondary'
        )}
      >
        {isAssistant ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
      </div>
      <div className="flex-1 space-y-1 overflow-hidden">
        <p className="text-xs font-medium text-muted-foreground">
          {isAssistant ? 'GoalTree AI' : 'You'}
        </p>
        <div className="text-sm whitespace-pre-wrap break-words">
          {content}
        </div>
      </div>
    </div>
  )
}

/**
 * ApiKeySetup component - shows when no API key is configured
 */
function ApiKeySetup({
  onSave,
}: {
  onSave: (key: string) => void
}) {
  const [inputKey, setInputKey] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!inputKey.trim()) {
      setError('Please enter an API key')
      return
    }
    if (!inputKey.startsWith('sk-')) {
      setError('Invalid API key format. Keys should start with "sk-"')
      return
    }
    setError(null)
    onSave(inputKey.trim())
  }

  return (
    <div
      className="flex flex-col items-center justify-center h-full p-6 text-center"
      data-testid="api-key-setup"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
        <Key className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Set Up OpenAI API Key</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs">
        To use the AI assistant, please enter your OpenAI API key. Your key is stored
        locally and never sent to our servers.
      </p>
      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
        <div className="space-y-2">
          <Input
            type="password"
            placeholder="sk-..."
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            className="w-full"
            data-testid="api-key-input"
            aria-label="OpenAI API Key"
          />
          {error && (
            <p className="text-xs text-destructive flex items-center gap-1" data-testid="api-key-error">
              <AlertCircle className="h-3 w-3" />
              {error}
            </p>
          )}
        </div>
        <Button type="submit" className="w-full" data-testid="api-key-save-button">
          <Key className="h-4 w-4 mr-2" />
          Save API Key
        </Button>
      </form>
      <p className="text-xs text-muted-foreground mt-4">
        Get your API key from{' '}
        <a
          href="https://platform.openai.com/api-keys"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          platform.openai.com
        </a>
      </p>
    </div>
  )
}

/**
 * ChatSidebar Component - AI chat companion panel
 *
 * A collapsible sidebar that provides AI-powered assistance for goal planning.
 * It uses the Vercel AI SDK with OpenAI for chat functionality.
 *
 * Features:
 * - Collapsible panel on the right side
 * - API key management (stored in LocalStorage)
 * - Chat interface with message history
 * - Can be minimized to a floating button
 *
 * @example
 * ```tsx
 * <ChatSidebar
 *   open={isChatOpen}
 *   onOpenChange={setIsChatOpen}
 * />
 * ```
 */
export function ChatSidebar({
  className,
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
}: ChatSidebarProps) {
  // State for controlled/uncontrolled mode
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const isControlled = controlledOpen !== undefined
  const isOpen = isControlled ? controlledOpen : internalOpen

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!isControlled) {
        setInternalOpen(newOpen)
      }
      onOpenChange?.(newOpen)
    },
    [isControlled, onOpenChange]
  )

  // API key management
  const { hasKey, isLoaded, saveApiKey, clearApiKey } = useOpenAIKey()
  const [showSettings, setShowSettings] = useState(false)

  // Create OpenAI client when key is available
  const openai = hasKey ? createOpenAIClient() : null

  // Manual loading state for client-side streaming
  const [isStreamingLoading, setIsStreamingLoading] = useState(false)

  // Chat state using Vercel AI SDK (for state management only)
  const {
    messages,
    input,
    handleInputChange,
    isLoading: useChatLoading,
    error: chatError,
    setMessages,
  } = useChat({
    api: '/api/chat', // Not used - we handle streaming client-side
    initialMessages: [],
    body: {
      model: DEFAULT_CHAT_MODEL,
    },
  })

  // Combined loading state (from useChat or manual streaming)
  const isLoading = useChatLoading || isStreamingLoading

  // Custom submit handler for client-side OpenAI calls
  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      if (!input.trim() || !openai || isLoading) return

      const userMessage: UIMessage = {
        id: Date.now().toString(),
        role: 'user',
        parts: [{ type: 'text', text: input.trim() }],
      }

      // Clear input immediately for better UX
      handleInputChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>)

      // Add user message immediately
      setMessages((prev) => [...prev, userMessage])

      // Create assistant placeholder
      const assistantId = (Date.now() + 1).toString()
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: 'assistant', parts: [{ type: 'text', text: '' }] } as UIMessage,
      ])

      // Set loading state
      setIsStreamingLoading(true)

      try {
        // Import the streamText function dynamically for client-side usage
        const { streamText } = await import('ai')
        const model = openai(DEFAULT_CHAT_MODEL)

        const result = streamText({
          model,
          system: GOALTREE_SYSTEM_PROMPT,
          messages: [...messages, userMessage].map((m) => ({
            role: m.role as 'user' | 'assistant' | 'system',
            content: getMessageContent(m),
          })),
        })

        let fullContent = ''
        for await (const textPart of result.textStream) {
          fullContent += textPart
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, parts: [{ type: 'text', text: fullContent }] }
                : m
            )
          )
        }
      } catch (error) {
        console.error('Chat error:', error)
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  parts: [
                    {
                      type: 'text',
                      text: 'Sorry, I encountered an error. Please check your API key and try again.',
                    },
                  ],
                }
              : m
          )
        )
      } finally {
        setIsStreamingLoading(false)
      }
    },
    [input, openai, messages, setMessages, handleInputChange, isLoading]
  )

  // Scroll to bottom when new messages arrive
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages])

  // Clear chat history
  const handleClearChat = useCallback(() => {
    setMessages([])
  }, [setMessages])

  // Remove API key
  const handleRemoveApiKey = useCallback(() => {
    clearApiKey()
    setMessages([])
    setShowSettings(false)
  }, [clearApiKey, setMessages])

  // Don't render until key state is loaded
  if (!isLoaded) {
    return null
  }

  return (
    <>
      {/* Floating toggle button when sidebar is closed */}
      {!isOpen && (
        <Button
          variant="default"
          size="icon"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
          onClick={() => handleOpenChange(true)}
          aria-label="Open AI chat"
          data-testid="chat-sidebar-toggle"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      )}

      {/* Sidebar Sheet */}
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent
          side="right"
          className={cn('w-full sm:w-[400px] sm:max-w-[400px] p-0 flex flex-col', className)}
          showCloseButton={false}
          data-testid="chat-sidebar"
        >
          {/* Header */}
          <SheetHeader className="px-4 py-3 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <SheetTitle className="text-base">AI Assistant</SheetTitle>
              </div>
              <div className="flex items-center gap-1">
                {hasKey && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={handleClearChat}
                      aria-label="Clear chat"
                      data-testid="chat-clear-button"
                      disabled={messages.length === 0}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setShowSettings(!showSettings)}
                      aria-label="Settings"
                      data-testid="chat-settings-button"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleOpenChange(false)}
                  aria-label="Close chat"
                  data-testid="chat-close-button"
                >
                  <PanelRightClose className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <SheetDescription className="sr-only">
              AI-powered assistant to help you plan and structure your goals
            </SheetDescription>
          </SheetHeader>

          {/* Settings Panel */}
          {showSettings && hasKey && (
            <div
              className="px-4 py-3 border-b bg-muted/50 flex-shrink-0"
              data-testid="chat-settings-panel"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">API Key configured</span>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleRemoveApiKey}
                  data-testid="chat-remove-api-key-button"
                >
                  Remove Key
                </Button>
              </div>
            </div>
          )}

          {/* Main Content */}
          {!hasKey ? (
            <ApiKeySetup onSave={saveApiKey} />
          ) : (
            <>
              {/* Messages Area */}
              <ScrollArea
                className="flex-1 px-4"
                ref={scrollAreaRef}
                data-testid="chat-messages-area"
              >
                <div className="py-4 space-y-4">
                  {messages.length === 0 ? (
                    <div
                      className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground"
                      data-testid="chat-empty-state"
                    >
                      <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
                      <p className="text-sm font-medium mb-2">Start a conversation</p>
                      <p className="text-xs max-w-xs">
                        Ask me to help you structure goals, create milestones, or break
                        down tasks into actionable steps.
                      </p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <ChatMessageItem key={message.id} message={message as ChatMessageData} />
                    ))
                  )}
                  {isLoading && (
                    <div className="flex items-center gap-2 text-muted-foreground p-3">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Input Area */}
              <div className="border-t p-4 flex-shrink-0" data-testid="chat-input-area">
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <Input
                    placeholder="Ask for help with your goals..."
                    value={input}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    className="flex-1"
                    data-testid="chat-input"
                    aria-label="Chat message"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={isLoading || !input.trim()}
                    aria-label="Send message"
                    data-testid="chat-send-button"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>
                {chatError && (
                  <p
                    className="text-xs text-destructive mt-2 flex items-center gap-1"
                    data-testid="chat-error"
                  >
                    <AlertCircle className="h-3 w-3" />
                    {chatError.message}
                  </p>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}

export default ChatSidebar
