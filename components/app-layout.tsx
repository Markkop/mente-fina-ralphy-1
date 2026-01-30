'use client'

import { useState, useCallback, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { GoalTreeView, type GoalTreeViewProps } from './goal-tree-view'
import { ChatSidebar, type ChatSidebarProps } from './chat-sidebar'
import { AddChildDialog, type AddChildDialogProps } from './add-child-dialog'
import { DeleteConfirmationDialog, type DeleteConfirmationDialogProps } from './delete-confirmation-dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { TreeNodeWithChildren } from '@/lib/goal-store'
import type { NodeOperationType } from '@/lib/ui-store'

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
  /** Props to pass to AddChildDialog (excluding open, onOpenChange, parentNode) */
  addChildDialogProps?: Omit<AddChildDialogProps, 'open' | 'onOpenChange' | 'parentNode'>
  /** Props to pass to DeleteConfirmationDialog (excluding open, onOpenChange, node) */
  deleteConfirmationDialogProps?: Omit<DeleteConfirmationDialogProps, 'open' | 'onOpenChange' | 'node'>
  /** Callback when a node is selected in the tree */
  onSelectNode?: (node: TreeNodeWithChildren) => void
  /** Callback when add child is clicked on a node (called before dialog opens) */
  onAddChild?: (parentNode: TreeNodeWithChildren) => void
  /** Callback when delete is clicked on a node (called before dialog opens) */
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
  addChildDialogProps,
  deleteConfirmationDialogProps,
  onSelectNode,
  onAddChild,
  onDelete,
  selectedNodeId,
}: AppLayoutProps) {
  // Chat sidebar state (controlled or uncontrolled)
  const [internalChatOpen, setInternalChatOpen] = useState(defaultChatOpen)
  const isControlled = controlledChatOpen !== undefined
  const isChatOpen = isControlled ? controlledChatOpen : internalChatOpen

  // Add child dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [selectedParentNode, setSelectedParentNode] = useState<TreeNodeWithChildren | null>(null)

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [nodeToDelete, setNodeToDelete] = useState<TreeNodeWithChildren | null>(null)

  // Pending operations state for loading indicators
  const [pendingOperations, setPendingOperations] = useState<Map<number, NodeOperationType>>(new Map())

  // Helper functions to manage pending operations
  const startNodeOperation = useCallback((nodeId: number, operationType: NodeOperationType) => {
    setPendingOperations(prev => {
      const next = new Map(prev)
      next.set(nodeId, operationType)
      return next
    })
  }, [])

  const completeNodeOperation = useCallback((nodeId: number) => {
    setPendingOperations(prev => {
      const next = new Map(prev)
      next.delete(nodeId)
      return next
    })
  }, [])

  const handleChatOpenChange = useCallback(
    (open: boolean) => {
      if (!isControlled) {
        setInternalChatOpen(open)
      }
      onChatOpenChange?.(open)
    },
    [isControlled, onChatOpenChange]
  )

  // Handle add child button click - opens the dialog
  const handleAddChild = useCallback(
    (parentNode: TreeNodeWithChildren) => {
      setSelectedParentNode(parentNode)
      setAddDialogOpen(true)
      onAddChild?.(parentNode)
    },
    [onAddChild]
  )

  // Handle create root goal from empty state
  const handleCreateRootGoal = useCallback(() => {
    setSelectedParentNode(null)
    setAddDialogOpen(true)
  }, [])

  // Handle delete button click - opens the confirmation dialog
  const handleDelete = useCallback(
    (node: TreeNodeWithChildren) => {
      setNodeToDelete(node)
      setDeleteDialogOpen(true)
      onDelete?.(node)
    },
    [onDelete]
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
            <div className="p-4 sm:p-6">
              <GoalTreeView
                {...goalTreeViewProps}
                onSelectNode={onSelectNode}
                onAddChild={handleAddChild}
                onDelete={handleDelete}
                selectedNodeId={selectedNodeId}
                onCreateRootGoal={goalTreeViewProps?.onCreateRootGoal ?? handleCreateRootGoal}
                pendingOperations={pendingOperations}
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

      {/* Add Child Dialog */}
      <AddChildDialog
        {...addChildDialogProps}
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        parentNode={selectedParentNode}
        onAddGoal={addChildDialogProps?.onAddGoal ? async (input) => {
          const parentId = input.parentId
          if (parentId !== undefined) {
            startNodeOperation(parentId, 'creating')
          }
          try {
            const result = await addChildDialogProps.onAddGoal!(input)
            return result
          } finally {
            if (parentId !== undefined) {
              completeNodeOperation(parentId)
            }
          }
        } : undefined}
        onAddMilestone={addChildDialogProps?.onAddMilestone ? async (input) => {
          const parentId = input.parentId
          if (parentId !== undefined) {
            startNodeOperation(parentId, 'creating')
          }
          try {
            const result = await addChildDialogProps.onAddMilestone!(input)
            return result
          } finally {
            if (parentId !== undefined) {
              completeNodeOperation(parentId)
            }
          }
        } : undefined}
        onAddRequirement={addChildDialogProps?.onAddRequirement ? async (input) => {
          const parentId = input.parentId
          if (parentId !== undefined) {
            startNodeOperation(parentId, 'creating')
          }
          try {
            const result = await addChildDialogProps.onAddRequirement!(input)
            return result
          } finally {
            if (parentId !== undefined) {
              completeNodeOperation(parentId)
            }
          }
        } : undefined}
        onAddTask={addChildDialogProps?.onAddTask ? async (input) => {
          const parentId = input.parentId
          if (parentId !== undefined) {
            startNodeOperation(parentId, 'creating')
          }
          try {
            const result = await addChildDialogProps.onAddTask!(input)
            return result
          } finally {
            if (parentId !== undefined) {
              completeNodeOperation(parentId)
            }
          }
        } : undefined}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        {...deleteConfirmationDialogProps}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        node={nodeToDelete}
        onDelete={deleteConfirmationDialogProps?.onDelete ? async (id, nodeType) => {
          startNodeOperation(id, 'deleting')
          try {
            const result = await deleteConfirmationDialogProps.onDelete!(id, nodeType)
            return result
          } finally {
            completeNodeOperation(id)
          }
        } : undefined}
      />
    </div>
  )
}

export default AppLayout
