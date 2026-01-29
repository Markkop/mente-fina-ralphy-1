'use client'

import { AppLayout } from '@/components/app-layout'
import { SettingsModal } from '@/components/settings-modal'
import { useState, useCallback } from 'react'
import { Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useGoalTree } from '@/lib/hooks'

// Disable static generation since we use IndexedDB (client-side only)
export const dynamic = 'force-dynamic'

export default function Home() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  
  const {
    addGoal,
    addMilestone,
    addRequirement,
    addTask,
    deleteGoal,
    deleteTask,
  } = useGoalTree()

  // Wrapper to handle delete based on node type
  const handleDelete = useCallback(
    async (id: number, nodeType: 'goal' | 'task'): Promise<number> => {
      if (nodeType === 'task') {
        return deleteTask(id)
      }
      return deleteGoal(id)
    },
    [deleteGoal, deleteTask]
  )

  return (
    <>
      <AppLayout
        header={
          <div className="flex items-center justify-between px-4 py-3">
            <h1 className="text-xl font-semibold">GoalTree</h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              aria-label="Open settings"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        }
        addChildDialogProps={{
          onAddGoal: addGoal,
          onAddMilestone: addMilestone,
          onAddRequirement: addRequirement,
          onAddTask: addTask,
        }}
        deleteConfirmationDialogProps={{
          onDelete: handleDelete,
        }}
      />
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  )
}
