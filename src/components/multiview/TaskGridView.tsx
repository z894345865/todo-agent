import { useCallback, useMemo } from 'react'
import DataEditor, { GridCellKind, type EditableGridCell, type GridCell, type GridColumn, type Item } from '@glideapps/glide-data-grid'
import '@glideapps/glide-data-grid/dist/index.css'
import { useTaskStore } from '../../tasks/store.ts'
import type { ViewDefinition } from '../../tasks/types.ts'
import { cellToTaskUpdate, parseItem, taskFieldToGridCell } from './cellRenderers.tsx'

const DEFAULT_COLUMN_WIDTH = 160

interface TaskGridViewProps {
  view: ViewDefinition
}

export function TaskGridView({ view }: TaskGridViewProps) {
  const fields = useTaskStore((state) => state.fields)
  const tags = useTaskStore((state) => state.tags)
  const tasks = useTaskStore((state) => state.getPreparedTasks(view.id))
  const createTask = useTaskStore((state) => state.createTask)
  const updateTask = useTaskStore((state) => state.updateTask)
  const updateView = useTaskStore((state) => state.updateView)
  const setSelectedTask = useTaskStore((state) => state.setSelectedTask)

  const visibleFields = useMemo(
    () => view.visibleFieldIds.map((fieldId) => fields.find((field) => field.id === fieldId)).filter((field) => field !== undefined),
    [fields, view.visibleFieldIds]
  )

  const columns = useMemo<GridColumn[]>(
    () =>
      visibleFields.map((field) => ({
        id: String(field.id),
        title: field.name,
        width: view.columnWidths?.[String(field.id)] ?? DEFAULT_COLUMN_WIDTH,
      })),
    [view.columnWidths, visibleFields]
  )

  const getCellContent = useCallback(
    (item: Item): GridCell => {
      const { columnIndex, rowIndex } = parseItem(item)
      const task = tasks[rowIndex]
      const field = visibleFields[columnIndex]

      if (!task || !field) {
        return {
          kind: GridCellKind.Loading,
          allowOverlay: false,
        }
      }

      return taskFieldToGridCell(task, field, tags)
    },
    [tags, tasks, visibleFields]
  )

  const handleCellEdited = useCallback(
    (item: Item, newValue: EditableGridCell) => {
      const { columnIndex, rowIndex } = parseItem(item)
      const task = tasks[rowIndex]
      const field = visibleFields[columnIndex]
      if (!task || !field) {
        return
      }

      const updates = cellToTaskUpdate(newValue, field, tags)
      if (Object.keys(updates).length === 0) {
        return
      }

      void updateTask(task.id, updates).catch(console.error)
    },
    [tags, tasks, updateTask, visibleFields]
  )

  const handleCellClicked = useCallback(
    (item: Item) => {
      const { rowIndex } = parseItem(item)
      const task = tasks[rowIndex]
      if (task) {
        void setSelectedTask(task.id).catch(console.error)
      }
    },
    [setSelectedTask, tasks]
  )

  const handleColumnResize = useCallback(
    (column: GridColumn, newSize: number) => {
      if (!column.id) {
        return
      }

      void updateView({
        ...view,
        columnWidths: {
          ...view.columnWidths,
          [column.id]: newSize,
        },
      }).catch(console.error)
    },
    [updateView, view]
  )

  const handleRowAppended = useCallback(() => {
    void createTask({ title: '新任务' }).catch(console.error)
  }, [createTask])

  return (
    <DataEditor
      className="task-grid-view"
      columns={columns}
      rows={tasks.length}
      getCellContent={getCellContent}
      getCellsForSelection
      onCellClicked={handleCellClicked}
      onCellEdited={handleCellEdited}
      onColumnResize={handleColumnResize}
      onRowAppended={handleRowAppended}
      rowMarkers="number"
      smoothScrollX
      smoothScrollY
      trailingRowOptions={{ hint: '新任务', sticky: true }}
      width="100%"
      height={420}
    />
  )
}
