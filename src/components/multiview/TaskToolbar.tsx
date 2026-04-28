import { useState } from 'react'
import { TaskCommandBar } from './TaskCommandBar.tsx'
import { TaskFieldConfigDialog } from './TaskFieldConfigDialog.tsx'
import { TaskFilterChips } from './TaskFilterChips.tsx'
import { TaskFilterDialog } from './TaskFilterDialog.tsx'
import { TaskGroupDialog } from './TaskGroupDialog.tsx'
import { TaskSortDialog } from './TaskSortDialog.tsx'
import { useTaskStore } from '../../tasks/store.ts'
import type { ViewDefinition } from '../../tasks/types.ts'

type DialogState = { type: 'filter' | 'sort' | 'group' | 'fields'; viewId: string } | undefined

export function TaskToolbar() {
  const views = useTaskStore((state) => state.views)
  const activeViewId = useTaskStore((state) => state.activeViewId)
  const updateView = useTaskStore((state) => state.updateView)
  const activeView = views.find((view) => view.id === activeViewId) ?? views[0]
  const [dialog, setDialog] = useState<DialogState>()
  const dialogView = dialog ? views.find((view) => view.id === dialog.viewId) : undefined

  if (!activeView) {
    return null
  }

  const openDialog = (type: NonNullable<DialogState>['type']) => setDialog({ type, viewId: activeView.id })
  const closeDialog = () => setDialog(undefined)
  const updateLatestView = (viewId: string, updater: (view: ViewDefinition) => ViewDefinition) => {
    const latestView = useTaskStore.getState().views.find((view) => view.id === viewId)
    if (!latestView) {
      return Promise.reject(new Error(`No view found with id: "${viewId}"`))
    }
    return updateView(updater(latestView))
  }

  return (
    <header className="task-toolbar">
      <TaskCommandBar
        view={activeView}
        onOpenFields={() => openDialog('fields')}
        onOpenFilters={() => openDialog('filter')}
        onOpenGroup={() => openDialog('group')}
        onOpenSort={() => openDialog('sort')}
      />
      <TaskFilterChips onUpdateView={updateLatestView} view={activeView} />
      {dialogView && (
        <>
          <TaskFilterDialog open={dialog?.type === 'filter'} onOpenChange={(open) => (open ? openDialog('filter') : closeDialog())} onUpdateView={updateLatestView} view={dialogView} />
          <TaskSortDialog open={dialog?.type === 'sort'} onOpenChange={(open) => (open ? openDialog('sort') : closeDialog())} onUpdateView={updateLatestView} view={dialogView} />
          <TaskGroupDialog open={dialog?.type === 'group'} onOpenChange={(open) => (open ? openDialog('group') : closeDialog())} onUpdateView={updateLatestView} view={dialogView} />
          <TaskFieldConfigDialog open={dialog?.type === 'fields'} onOpenChange={(open) => (open ? openDialog('fields') : closeDialog())} onUpdateView={updateLatestView} view={dialogView} />
        </>
      )}
    </header>
  )
}
