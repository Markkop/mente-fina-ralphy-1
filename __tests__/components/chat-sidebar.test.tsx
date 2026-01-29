import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChatSidebar } from '@/components/chat-sidebar'

// Mock the AI modules - the component uses client-side streaming, not useChat
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

describe('ChatSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset localStorage store
    localStorageStore = {}
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

    it('displays user messages after submission', async () => {
      const user = userEvent.setup()
      render(<ChatSidebar open={true} />)

      // Type and submit a message
      const input = screen.getByTestId('chat-input')
      await user.type(input, 'Hello, help me with goals')
      await user.click(screen.getByTestId('chat-send-button'))

      // Wait for the user message to appear (component adds it immediately)
      await waitFor(() => {
        expect(screen.getByText('Hello, help me with goals')).toBeInTheDocument()
      })
    })

    it('displays assistant placeholder after submission', async () => {
      const user = userEvent.setup()
      render(<ChatSidebar open={true} />)

      // Submit a message to trigger the assistant response
      const input = screen.getByTestId('chat-input')
      await user.type(input, 'Help me')
      await user.click(screen.getByTestId('chat-send-button'))

      // Wait for assistant message container to appear (even if streaming fails, placeholder is added)
      await waitFor(() => {
        // Should have both user and assistant labels
        expect(screen.getByText('You')).toBeInTheDocument()
        expect(screen.getByText('GoalTree AI')).toBeInTheDocument()
      })
    })

    it('shows correct role label for user messages', async () => {
      const user = userEvent.setup()
      render(<ChatSidebar open={true} />)

      await user.type(screen.getByTestId('chat-input'), 'Test message')
      await user.click(screen.getByTestId('chat-send-button'))

      await waitFor(() => {
        expect(screen.getByText('You')).toBeInTheDocument()
      })
    })

    it('shows correct role label for assistant messages', async () => {
      const user = userEvent.setup()
      render(<ChatSidebar open={true} />)

      await user.type(screen.getByTestId('chat-input'), 'Test')
      await user.click(screen.getByTestId('chat-send-button'))

      await waitFor(() => {
        expect(screen.getByText('GoalTree AI')).toBeInTheDocument()
      })
    })

    it('allows sending multiple messages', async () => {
      const user = userEvent.setup()
      render(<ChatSidebar open={true} />)

      // First message
      await user.type(screen.getByTestId('chat-input'), 'First user message')
      await user.click(screen.getByTestId('chat-send-button'))

      await waitFor(() => {
        expect(screen.getByText('First user message')).toBeInTheDocument()
      })

      // Second message (after first completes/fails)
      await waitFor(() => {
        expect(screen.getByTestId('chat-input')).not.toBeDisabled()
      })
      
      await user.type(screen.getByTestId('chat-input'), 'Second user message')
      await user.click(screen.getByTestId('chat-send-button'))

      await waitFor(() => {
        expect(screen.getByText('Second user message')).toBeInTheDocument()
      })
    })
  })

  describe('loading state', () => {
    beforeEach(() => {
      localStorageStore['goaltree-openai-api-key'] = 'sk-test-key'
    })

    it('disables send button when input is empty', () => {
      render(<ChatSidebar open={true} />)

      // Send button should be disabled when input is empty
      expect(screen.getByTestId('chat-send-button')).toBeDisabled()
    })

    it('enables send button when input has content', async () => {
      const user = userEvent.setup()
      render(<ChatSidebar open={true} />)

      await user.type(screen.getByTestId('chat-input'), 'Test message')

      expect(screen.getByTestId('chat-send-button')).not.toBeDisabled()
    })

    it('clears input after submission', async () => {
      const user = userEvent.setup()
      render(<ChatSidebar open={true} />)

      const input = screen.getByTestId('chat-input')
      await user.type(input, 'Test message')
      await user.click(screen.getByTestId('chat-send-button'))

      // Input should be cleared immediately after submission
      expect(input).toHaveValue('')
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

  describe('client-side streaming', () => {
    beforeEach(() => {
      localStorageStore['goaltree-openai-api-key'] = 'sk-test-key'
    })

    it('does not submit when input is empty', () => {
      render(<ChatSidebar open={true} />)

      // Button should be disabled when input is empty
      expect(screen.getByTestId('chat-send-button')).toBeDisabled()
    })

    it('does not submit when only whitespace is entered', async () => {
      const user = userEvent.setup()
      render(<ChatSidebar open={true} />)

      // Type only whitespace
      await user.type(screen.getByTestId('chat-input'), '   ')

      // Button should be disabled when input is only whitespace
      expect(screen.getByTestId('chat-send-button')).toBeDisabled()
    })

    it('adds message when form is submitted with valid input', async () => {
      const user = userEvent.setup()
      render(<ChatSidebar open={true} />)

      // Type and submit
      await user.type(screen.getByTestId('chat-input'), 'Help me with my goals')
      await user.click(screen.getByTestId('chat-send-button'))

      // User message should appear
      await waitFor(() => {
        expect(screen.getByText('Help me with my goals')).toBeInTheDocument()
      })
    })

    it('clears input after submission', async () => {
      const user = userEvent.setup()
      render(<ChatSidebar open={true} />)

      // Type and submit
      const input = screen.getByTestId('chat-input')
      await user.type(input, 'Help me with my goals')
      await user.click(screen.getByTestId('chat-send-button'))

      // Input should be cleared
      expect(input).toHaveValue('')
    })

    it('send button is disabled when input is empty after submission', async () => {
      const user = userEvent.setup()
      render(<ChatSidebar open={true} />)

      await user.type(screen.getByTestId('chat-input'), 'Test message')
      await user.click(screen.getByTestId('chat-send-button'))

      // Input is cleared after submission, so send button is disabled
      expect(screen.getByTestId('chat-send-button')).toBeDisabled()
    })

    it('enables clear button when messages exist', async () => {
      const user = userEvent.setup()
      render(<ChatSidebar open={true} />)

      // Add a message
      await user.type(screen.getByTestId('chat-input'), 'Hello')
      await user.click(screen.getByTestId('chat-send-button'))

      // Clear button should be enabled since there's at least one message
      await waitFor(() => {
        expect(screen.getByTestId('chat-clear-button')).not.toBeDisabled()
      })
    })

    it('clears messages when clear button is clicked', async () => {
      const user = userEvent.setup()
      render(<ChatSidebar open={true} />)

      // Add a message
      await user.type(screen.getByTestId('chat-input'), 'Hello')
      await user.click(screen.getByTestId('chat-send-button'))

      // Wait for message to appear
      await waitFor(() => {
        expect(screen.getByText('Hello')).toBeInTheDocument()
      })

      // Wait for streaming to complete so clear button is enabled
      await waitFor(() => {
        expect(screen.getByTestId('chat-clear-button')).not.toBeDisabled()
      })

      // Clear messages
      await user.click(screen.getByTestId('chat-clear-button'))

      // Messages should be cleared
      await waitFor(() => {
        expect(screen.queryByText('Hello')).not.toBeInTheDocument()
        expect(screen.getByTestId('chat-empty-state')).toBeInTheDocument()
      })
    })
  })
})
