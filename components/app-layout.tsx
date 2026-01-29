'use client'

import { useState, useCallback, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { GoalTreeView, type GoalTreeViewProps } from './goal-tree-view'
import { ChatSidebar, type ChatSidebarProps } from './chat-sidebar'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { TreeNodeWithChildren } from '@/lib/goal-store'

/**
 * Props for the AppLayout component
 */
export interface AppLayoutProps {
  /** Optional className for the container */
  className?: string
  /** Optional children to render in the header area */
  header?: ReactNode
  /** Whether the chat sidebar is initially open */
  defaultChatOpen?: boolean
  /** Controlled chat open state */
  chatOpen?: boolean
  /** Callback when chat open state changes */
  onChatOpenChange?: (open: boolean) => void
  /** Props to pass to GoalTreeView */
  goalTreeViewProps?: Omit<GoalTreeViewProps, 'className'>
  /** Props to pass to ChatSidebar */
  chatSidebarProps?: Omit<ChatSidebarProps, 'open' | 'onOpenChange' | 'defaultOpen'>
  /** Callback when a node is selected in the tree */
  onSelectNode?: (node: TreeNodeWithChildren) => void
  /** Callback when add child is clicked on a node */
  onAddChild?: (parentNode: TreeNodeWithChildren) => void
  /** Callback when delete is clicked on a node */
  onDelete?: (node: TreeNodeWithChildren) => void
  /** Currently selected node id */
  selectedNodeId?: number | null
}

/**
 * AppLayout Component - Main layout wrapper for GoalTree application
 *
 * This component provides the primary application layout combining:
 * - Tree View (left): Displays the hierarchical goal structure
 * - Chat Sidebar (right): AI-powered assistant panel
 *
 * Features:
 * - Responsive layout that adapts to screen sizes
 * - Controlled or uncontrolled chat sidebar state
 * - Proper scrolling for the tree view area
 * - Header slot for app title and navigation
 *
 * @example
 * ```tsx
 * <AppLayout
 *   header={<h1>GoalTree</h1>}
 *   defaultChatOpen={false}
 *   onSelectNode={(node) => console.log('Selected:', node)}
 * />
 * ```
 */
export function AppLayout({
  className,
  header,
  defaultChatOpen = false,
  chatOpen: controlledChatOpen,
  onChatOpenChange,
  goalTreeViewProps,
  chatSidebarProps,
  onSelectNode,
  onAddChild,
  onDelete,
  selectedNodeId,
}: AppLayoutProps) {
  // Chat sidebar state (controlled or uncontrolled)
  const [internalChatOpen, setInternalChatOpen] = useState(defaultChatOpen)
  const isControlled = controlledChatOpen !== undefined
  const isChatOpen = isControlled ? controlledChatOpen : internalChatOpen

  const handleChatOpenChange = useCallback(
    (open: boolean) => {
      if (!isControlled) {
        setInternalChatOpen(open)
      }
      onChatOpenChange?.(open)
    },
    [isControlled, onChatOpenChange]
  )

  return (
    <div
      className={cn(
        'flex h-screen flex-col bg-background',
        className
      )}
      data-testid="app-layout"
    >
      {/* Header */}
      {header && (
        <header
          className="flex-shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
          data-testid="app-layout-header"
        >
          {header}
        </header>
      )}

      {/* Main Content Area */}
      <div
        className="flex flex-1 overflow-hidden"
        data-testid="app-layout-content"
      >
        {/* Tree View (Left Panel) */}
        <main
          className="flex-1 overflow-hidden"
          data-testid="app-layout-main"
        >
          <ScrollArea className="h-full">
            <div className="p-6">
              <GoalTreeView
                {...goalTreeViewProps}
                onSelectNode={onSelectNode}
                onAddChild={onAddChild}
                onDelete={onDelete}
                selectedNodeId={selectedNodeId}
              />
            </div>
          </ScrollArea>
        </main>

        {/* Chat Sidebar (Right Panel) - Uses Sheet for overlay mode */}
        <ChatSidebar
          {...chatSidebarProps}
          open={isChatOpen}
          onOpenChange={handleChatOpenChange}
        />
      </div>
    </div>
  )
}

export default AppLayout
