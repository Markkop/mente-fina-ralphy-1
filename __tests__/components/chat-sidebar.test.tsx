import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChatSidebar } from '@/components/chat-sidebar'

// Mock the AI modules
vi.mock('@ai-sdk/react', () => ({
  useChat: vi.fn(() => ({
    messages: [],
    input: '',
    handleInputChange: vi.fn(),
    handleSubmit: vi.fn(),
    isLoading: false,
    error: null,
    setMessages: vi.fn(),
  })),
}))

vi.mock('ai', () => ({
  streamText: vi.fn(),
}))

// Mock localStorage with proper state management
let localStorageStore: Record<string, string> = {}

const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageStore[key] = value
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageStore[key]
  }),
  clear: vi.fn(() => {
    localStorageStore = {}
  }),
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

// Import useChat mock to modify its return value
import { useChat } from '@ai-sdk/react'
const mockUseChat = vi.mocked(useChat)

describe('ChatSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset localStorage store
    localStorageStore = {}
    // Reset useChat mock to default state
    mockUseChat.mockReturnValue({
      messages: [],
      input: '',
      handleInputChange: vi.fn(),
      handleSubmit: vi.fn(),
      isLoading: false,
      error: null,
      setMessages: vi.fn(),
      append: vi.fn(),
      reload: vi.fn(),
      stop: vi.fn(),
      setInput: vi.fn(),
      data: undefined,
      id: 'test-chat',
      status: 'ready',
      addToolResult: vi.fn(),
    } as ReturnType<typeof useChat>)
  })

  afterEach(() => {
    vi.clearAllMocks()
    localStorageStore = {}
  })

  describe('toggle button', () => {
    it('shows toggle button when sidebar is closed', () => {
      render(<ChatSidebar open={false} />)

      expect(screen.getByTestId('chat-sidebar-toggle')).toBeInTheDocument()
    })

    it('hides toggle button when sidebar is open', () => {
      localStorageStore['goaltree-openai-api-key'] = 'sk-test-key'
      render(<ChatSidebar open={true} />)

      expect(screen.queryByTestId('chat-sidebar-toggle')).not.toBeInTheDocument()
    })

    it('calls onOpenChange when toggle button is clicked', async () => {
      const onOpenChange = vi.fn()
      render(<ChatSidebar open={false} onOpenChange={onOpenChange} />)

      fireEvent.click(screen.getByTestId('chat-sidebar-toggle'))

      expect(onOpenChange).toHaveBeenCalledWith(true)
    })

    it('has correct aria-label', () => {
      render(<ChatSidebar open={false} />)

      expect(screen.getByTestId('chat-sidebar-toggle')).toHaveAttribute(
        'aria-label',
        'Open AI chat'
      )
    })
  })

  describe('sidebar panel', () => {
    it('renders sidebar when open', () => {
      localStorageStore['goaltree-openai-api-key'] = 'sk-test-key'
      render(<ChatSidebar open={true} />)

      expect(screen.getByTestId('chat-sidebar')).toBeInTheDocument()
    })

    it('shows AI Assistant title', () => {
      localStorageStore['goaltree-openai-api-key'] = 'sk-test-key'
      render(<ChatSidebar open={true} />)

      expect(screen.getByText('AI Assistant')).toBeInTheDocument()
    })

    it('shows close button', () => {
      localStorageStore['goaltree-openai-api-key'] = 'sk-test-key'
      render(<ChatSidebar open={true} />)

      expect(screen.getByTestId('chat-close-button')).toBeInTheDocument()
    })

    it('calls onOpenChange when close button is clicked', () => {
      const onOpenChange = vi.fn()
      localStorageStore['goaltree-openai-api-key'] = 'sk-test-key'
      render(<ChatSidebar open={true} onOpenChange={onOpenChange} />)

      fireEvent.click(screen.getByTestId('chat-close-button'))

      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe('API key setup', () => {
    it('shows API key setup when no key is configured', () => {
      render(<ChatSidebar open={true} />)

      expect(screen.getByTestId('api-key-setup')).toBeInTheDocument()
      expect(screen.getByText('Set Up OpenAI API Key')).toBeInTheDocument()
    })

    it('shows API key input field', () => {
      render(<ChatSidebar open={true} />)

      expect(screen.getByTestId('api-key-input')).toBeInTheDocument()
    })

    it('shows save button', () => {
      render(<ChatSidebar open={true} />)

      expect(screen.getByTestId('api-key-save-button')).toBeInTheDocument()
    })

    it('shows error when trying to save empty key', async () => {
      const user = userEvent.setup()
      render(<ChatSidebar open={true} />)

      await user.click(screen.getByTestId('api-key-save-button'))

      expect(screen.getByTestId('api-key-error')).toHaveTextContent(
        'Please enter an API key'
      )
    })

    it('shows error for invalid key format', async () => {
      const user = userEvent.setup()
      render(<ChatSidebar open={true} />)

      await user.type(screen.getByTestId('api-key-input'), 'invalid-key')
      await user.click(screen.getByTestId('api-key-save-button'))

      expect(screen.getByTestId('api-key-error')).toHaveTextContent(
        'Invalid API key format'
      )
    })

    it('saves valid API key', async () => {
      const user = userEvent.setup()
      render(<ChatSidebar open={true} />)

      await user.type(screen.getByTestId('api-key-input'), 'sk-valid-api-key')
      await user.click(screen.getByTestId('api-key-save-button'))

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'goaltree-openai-api-key',
        'sk-valid-api-key'
      )
    })

    it('shows link to OpenAI platform', () => {
      render(<ChatSidebar open={true} />)

      const link = screen.getByRole('link', { name: /platform.openai.com/i })
      expect(link).toHaveAttribute('href', 'https://platform.openai.com/api-keys')
      expect(link).toHaveAttribute('target', '_blank')
    })
  })

  describe('chat interface', () => {
    beforeEach(() => {
      localStorageStore['goaltree-openai-api-key'] = 'sk-test-key'
    })

    it('shows chat interface when API key is configured', () => {
      render(<ChatSidebar open={true} />)

      expect(screen.getByTestId('chat-messages-area')).toBeInTheDocument()
      expect(screen.getByTestId('chat-input-area')).toBeInTheDocument()
    })

    it('shows empty state when no messages', () => {
      render(<ChatSidebar open={true} />)

      expect(screen.getByTestId('chat-empty-state')).toBeInTheDocument()
      expect(screen.getByText('Start a conversation')).toBeInTheDocument()
    })

    it('shows chat input', () => {
      render(<ChatSidebar open={true} />)

      const input = screen.getByTestId('chat-input')
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('placeholder', 'Ask for help with your goals...')
    })

    it('shows send button', () => {
      render(<ChatSidebar open={true} />)

      expect(screen.getByTestId('chat-send-button')).toBeInTheDocument()
    })

    it('disables send button when input is empty', () => {
      render(<ChatSidebar open={true} />)

      expect(screen.getByTestId('chat-send-button')).toBeDisabled()
    })

    it('shows clear chat button', () => {
      render(<ChatSidebar open={true} />)

      expect(screen.getByTestId('chat-clear-button')).toBeInTheDocument()
    })

    it('disables clear button when no messages', () => {
      render(<ChatSidebar open={true} />)

      expect(screen.getByTestId('chat-clear-button')).toBeDisabled()
    })

    it('shows settings button', () => {
      render(<ChatSidebar open={true} />)

      expect(screen.getByTestId('chat-settings-button')).toBeInTheDocument()
    })
  })

  describe('messages display', () => {
    beforeEach(() => {
      localStorageStore['goaltree-openai-api-key'] = 'sk-test-key'
    })

    it('displays user messages', () => {
      mockUseChat.mockReturnValue({
        messages: [
          { id: '1', role: 'user', content: 'Hello, help me with goals' },
        ],
        input: '',
        handleInputChange: vi.fn(),
        handleSubmit: vi.fn(),
        isLoading: false,
        error: null,
        setMessages: vi.fn(),
        append: vi.fn(),
        reload: vi.fn(),
        stop: vi.fn(),
        setInput: vi.fn(),
        data: undefined,
        id: 'test-chat',
        status: 'ready',
        addToolResult: vi.fn(),
      } as ReturnType<typeof useChat>)

      render(<ChatSidebar open={true} />)

      expect(screen.getByTestId('chat-message-1')).toBeInTheDocument()
      expect(screen.getByText('Hello, help me with goals')).toBeInTheDocument()
    })

    it('displays assistant messages', () => {
      mockUseChat.mockReturnValue({
        messages: [
          { id: '1', role: 'assistant', content: 'I can help you structure your goals!' },
        ],
        input: '',
        handleInputChange: vi.fn(),
        handleSubmit: vi.fn(),
        isLoading: false,
        error: null,
        setMessages: vi.fn(),
        append: vi.fn(),
        reload: vi.fn(),
        stop: vi.fn(),
        setInput: vi.fn(),
        data: undefined,
        id: 'test-chat',
        status: 'ready',
        addToolResult: vi.fn(),
      } as ReturnType<typeof useChat>)

      render(<ChatSidebar open={true} />)

      expect(screen.getByTestId('chat-message-1')).toBeInTheDocument()
      expect(screen.getByText('I can help you structure your goals!')).toBeInTheDocument()
    })

    it('shows correct role label for user messages', () => {
      mockUseChat.mockReturnValue({
        messages: [{ id: '1', role: 'user', content: 'Test message' }],
        input: '',
        handleInputChange: vi.fn(),
        handleSubmit: vi.fn(),
        isLoading: false,
        error: null,
        setMessages: vi.fn(),
        append: vi.fn(),
        reload: vi.fn(),
        stop: vi.fn(),
        setInput: vi.fn(),
        data: undefined,
        id: 'test-chat',
        status: 'ready',
        addToolResult: vi.fn(),
      } as ReturnType<typeof useChat>)

      render(<ChatSidebar open={true} />)

      expect(screen.getByText('You')).toBeInTheDocument()
    })

    it('shows correct role label for assistant messages', () => {
      mockUseChat.mockReturnValue({
        messages: [{ id: '1', role: 'assistant', content: 'Test response' }],
        input: '',
        handleInputChange: vi.fn(),
        handleSubmit: vi.fn(),
        isLoading: false,
        error: null,
        setMessages: vi.fn(),
        append: vi.fn(),
        reload: vi.fn(),
        stop: vi.fn(),
        setInput: vi.fn(),
        data: undefined,
        id: 'test-chat',
        status: 'ready',
        addToolResult: vi.fn(),
      } as ReturnType<typeof useChat>)

      render(<ChatSidebar open={true} />)

      expect(screen.getByText('GoalTree AI')).toBeInTheDocument()
    })

    it('displays multiple messages in order', () => {
      mockUseChat.mockReturnValue({
        messages: [
          { id: '1', role: 'user', content: 'First message' },
          { id: '2', role: 'assistant', content: 'Second message' },
          { id: '3', role: 'user', content: 'Third message' },
        ],
        input: '',
        handleInputChange: vi.fn(),
        handleSubmit: vi.fn(),
        isLoading: false,
        error: null,
        setMessages: vi.fn(),
        append: vi.fn(),
        reload: vi.fn(),
        stop: vi.fn(),
        setInput: vi.fn(),
        data: undefined,
        id: 'test-chat',
        status: 'ready',
        addToolResult: vi.fn(),
      } as ReturnType<typeof useChat>)

      render(<ChatSidebar open={true} />)

      expect(screen.getByText('First message')).toBeInTheDocument()
      expect(screen.getByText('Second message')).toBeInTheDocument()
      expect(screen.getByText('Third message')).toBeInTheDocument()
    })
  })

  describe('loading state', () => {
    beforeEach(() => {
      localStorageStore['goaltree-openai-api-key'] = 'sk-test-key'
    })

    it('shows loading indicator when chat is loading', () => {
      mockUseChat.mockReturnValue({
        messages: [],
        input: '',
        handleInputChange: vi.fn(),
        handleSubmit: vi.fn(),
        isLoading: true,
        error: null,
        setMessages: vi.fn(),
        append: vi.fn(),
        reload: vi.fn(),
        stop: vi.fn(),
        setInput: vi.fn(),
        data: undefined,
        id: 'test-chat',
        status: 'streaming',
        addToolResult: vi.fn(),
      } as ReturnType<typeof useChat>)

      render(<ChatSidebar open={true} />)

      expect(screen.getByText('Thinking...')).toBeInTheDocument()
    })

    it('disables input when loading', () => {
      mockUseChat.mockReturnValue({
        messages: [],
        input: '',
        handleInputChange: vi.fn(),
        handleSubmit: vi.fn(),
        isLoading: true,
        error: null,
        setMessages: vi.fn(),
        append: vi.fn(),
        reload: vi.fn(),
        stop: vi.fn(),
        setInput: vi.fn(),
        data: undefined,
        id: 'test-chat',
        status: 'streaming',
        addToolResult: vi.fn(),
      } as ReturnType<typeof useChat>)

      render(<ChatSidebar open={true} />)

      expect(screen.getByTestId('chat-input')).toBeDisabled()
    })

    it('disables send button when loading', () => {
      mockUseChat.mockReturnValue({
        messages: [],
        input: 'test',
        handleInputChange: vi.fn(),
        handleSubmit: vi.fn(),
        isLoading: true,
        error: null,
        setMessages: vi.fn(),
        append: vi.fn(),
        reload: vi.fn(),
        stop: vi.fn(),
        setInput: vi.fn(),
        data: undefined,
        id: 'test-chat',
        status: 'streaming',
        addToolResult: vi.fn(),
      } as ReturnType<typeof useChat>)

      render(<ChatSidebar open={true} />)

      expect(screen.getByTestId('chat-send-button')).toBeDisabled()
    })
  })

  describe('settings panel', () => {
    beforeEach(() => {
      localStorageStore['goaltree-openai-api-key'] = 'sk-test-key'
    })

    it('toggles settings panel when settings button is clicked', async () => {
      const user = userEvent.setup()
      render(<ChatSidebar open={true} />)

      // Initially settings panel is not visible
      expect(screen.queryByTestId('chat-settings-panel')).not.toBeInTheDocument()

      // Click settings button
      await user.click(screen.getByTestId('chat-settings-button'))

      // Settings panel should be visible
      expect(screen.getByTestId('chat-settings-panel')).toBeInTheDocument()
    })

    it('shows API key configured message', async () => {
      const user = userEvent.setup()
      render(<ChatSidebar open={true} />)

      await user.click(screen.getByTestId('chat-settings-button'))

      expect(screen.getByText('API Key configured')).toBeInTheDocument()
    })

    it('shows remove key button', async () => {
      const user = userEvent.setup()
      render(<ChatSidebar open={true} />)

      await user.click(screen.getByTestId('chat-settings-button'))

      expect(screen.getByTestId('chat-remove-api-key-button')).toBeInTheDocument()
    })

    it('removes API key when remove button is clicked', async () => {
      const user = userEvent.setup()
      render(<ChatSidebar open={true} />)

      await user.click(screen.getByTestId('chat-settings-button'))
      await user.click(screen.getByTestId('chat-remove-api-key-button'))

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('goaltree-openai-api-key')
    })
  })

  describe('uncontrolled mode', () => {
    it('starts closed by default', () => {
      render(<ChatSidebar />)

      expect(screen.getByTestId('chat-sidebar-toggle')).toBeInTheDocument()
    })

    it('starts open when defaultOpen is true', () => {
      localStorageStore['goaltree-openai-api-key'] = 'sk-test-key'
      render(<ChatSidebar defaultOpen={true} />)

      expect(screen.getByTestId('chat-sidebar')).toBeInTheDocument()
    })

    it('toggles open state internally when not controlled', async () => {
      localStorageStore['goaltree-openai-api-key'] = 'sk-test-key'
      render(<ChatSidebar />)

      // Initially closed
      expect(screen.getByTestId('chat-sidebar-toggle')).toBeInTheDocument()

      // Click to open
      fireEvent.click(screen.getByTestId('chat-sidebar-toggle'))

      // Should now be open
      await waitFor(() => {
        expect(screen.getByTestId('chat-sidebar')).toBeInTheDocument()
      })
    })
  })

  describe('accessibility', () => {
    beforeEach(() => {
      localStorageStore['goaltree-openai-api-key'] = 'sk-test-key'
    })

    it('chat input has aria-label', () => {
      render(<ChatSidebar open={true} />)

      expect(screen.getByTestId('chat-input')).toHaveAttribute('aria-label', 'Chat message')
    })

    it('send button has aria-label', () => {
      render(<ChatSidebar open={true} />)

      expect(screen.getByTestId('chat-send-button')).toHaveAttribute(
        'aria-label',
        'Send message'
      )
    })

    it('close button has aria-label', () => {
      render(<ChatSidebar open={true} />)

      expect(screen.getByTestId('chat-close-button')).toHaveAttribute(
        'aria-label',
        'Close chat'
      )
    })

    it('clear button has aria-label', () => {
      render(<ChatSidebar open={true} />)

      expect(screen.getByTestId('chat-clear-button')).toHaveAttribute(
        'aria-label',
        'Clear chat'
      )
    })

    it('settings button has aria-label', () => {
      render(<ChatSidebar open={true} />)

      expect(screen.getByTestId('chat-settings-button')).toHaveAttribute(
        'aria-label',
        'Settings'
      )
    })
  })
})
