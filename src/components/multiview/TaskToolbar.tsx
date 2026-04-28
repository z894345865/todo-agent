import { useState } from 'react'
import { TaskCommandBar } from './TaskCommandBar.tsx'
import { TaskFieldConfigDialog } from './TaskFieldConfigDialog.tsx'
import { TaskFilterChips } from './TaskFilterChips.tsx'
import { TaskFilterDialog } from './TaskFilterDialog.tsx'
import { TaskGroupDialog } from './TaskGroupDialog.tsx'
import { TaskSortDialog } from './TaskSortDialog.tsx'
import { useTaskStore } from '../../tasks/store.ts'

export function TaskToolbar() {
  const views = useTaskStore((state) => state.views)
  const activeViewId = useTaskStore((state) => state.activeViewId)
  const activeView = views.find((view) => view.id === activeViewId) ?? views[0]
  const [dialog, setDialog] = useState<'filter' | 'sort' | 'group' | 'fields' | undefined>()

  if (!activeView) {
    return null
  }

  return (
    <header className="task-toolbar">
      <TaskCommandBar
        view={activeView}
        onOpenFields={() => setDialog('fields')}
        onOpenFilters={() => setDialog('filter')}
        onOpenGroup={() => setDialog('group')}
        onOpenSort={() => setDialog('sort')}
      />
      <TaskFilterChips view={activeView} />
      <TaskFilterDialog open={dialog === 'filter'} onOpenChange={(open) => setDialog(open ? 'filter' : undefined)} view={activeView} />
      <TaskSortDialog open={dialog === 'sort'} onOpenChange={(open) => setDialog(open ? 'sort' : undefined)} view={activeView} />
      <TaskGroupDialog open={dialog === 'group'} onOpenChange={(open) => setDialog(open ? 'group' : undefined)} view={activeView} />
      <TaskFieldConfigDialog open={dialog === 'fields'} onOpenChange={(open) => setDialog(open ? 'fields' : undefined)} view={activeView} />
    </header>
  )
}
