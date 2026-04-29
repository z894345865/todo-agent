import { useCallback, useMemo, useRef, useState } from 'react'
import DataEditor, { GridCellKind, type DataEditorRef, type DrawCellCallback, type EditableGridCell, type GridCell, type GridColumn, type Item, type Rectangle } from '@glideapps/glide-data-grid'
import '@glideapps/glide-data-grid/dist/index.css'
import { PRIORITY_LABELS, STATUS_LABELS, getFieldLabel } from '../../tasks/displayLabels.ts'
import { useTaskStore } from '../../tasks/store.ts'
import type { FieldDefinition, Task, TaskPriority, TaskStatus, ViewDefinition } from '../../tasks/types.ts'
import { cellToTaskUpdate, getTaskFieldPills, parseItem, taskFieldToGridCell, type GridPill } from './cellRenderers.tsx'
import { createGridRows, type GridRow } from './gridGrouping.ts'
import { isTaskOverdue } from './taskDates.ts'

const DEFAULT_COLUMN_WIDTH = 160
const DEFAULT_ROW_HEIGHT = 34
const GROUP_ROW_HEIGHT = 38
const PILL_HEIGHT = 22
const PILL_GAP = 6
const PILL_HORIZONTAL_PADDING = 10
const OVERDUE_ICON_SIZE = 15

interface TaskGridViewProps {
  view: ViewDefinition
}

type SelectFieldId = 'status' | 'priority' | 'tagIds'

interface SelectEditorState {
  task: Task
  field: FieldDefinition & { id: SelectFieldId }
  rect: Rectangle
}

export function TaskGridView({ view }: TaskGridViewProps) {
  const fields = useTaskStore((state) => state.fields)
  const tags = useTaskStore((state) => state.tags)
  const tasks = useTaskStore((state) => state.getPreparedTasks(view.id))
  const createTask = useTaskStore((state) => state.createTask)
  const updateTask = useTaskStore((state) => state.updateTask)
  const updateView = useTaskStore((state) => state.updateView)
  const setSelectedTask = useTaskStore((state) => state.setSelectedTask)
  const gridRef = useRef<DataEditorRef>(null)
  const [selectEditor, setSelectEditor] = useState<SelectEditorState>()

  const visibleFields = useMemo(
    () => view.visibleFieldIds.map((fieldId) => fields.find((field) => field.id === fieldId)).filter((field) => field !== undefined),
    [fields, view.visibleFieldIds]
  )

  const columns = useMemo<GridColumn[]>(
    () =>
      visibleFields.map((field) => ({
        id: String(field.id),
        title: getFieldLabel(field),
        width: view.columnWidths?.[String(field.id)] ?? DEFAULT_COLUMN_WIDTH,
      })),
    [view.columnWidths, visibleFields]
  )
  const gridRows = useMemo(() => createGridRows(tasks, view.groupBy, tags), [tags, tasks, view.groupBy])
  const hasGroupedRows = gridRows.some((row) => row.kind === 'group')

  const getCellContent = useCallback(
    (item: Item): GridCell => {
      const { columnIndex, rowIndex } = parseItem(item)
      const row = gridRows[rowIndex]
      const field = visibleFields[columnIndex]

      if (!row || !field) {
        return {
          kind: GridCellKind.Loading,
          allowOverlay: false,
        }
      }

      if (row.kind === 'group') {
        return createGroupCell(row, columns.length)
      }

      const task = row.task
      return taskFieldToGridCell(task, field, tags)
    },
    [columns.length, gridRows, tags, visibleFields]
  )

  const handleCellEdited = useCallback(
    (item: Item, newValue: EditableGridCell) => {
      const { columnIndex, rowIndex } = parseItem(item)
      const row = gridRows[rowIndex]
      const field = visibleFields[columnIndex]
      if (!row || row.kind !== 'task' || !field) {
        return
      }

      const task = row.task
      const updates = cellToTaskUpdate(newValue, field, tags)
      if (Object.keys(updates).length === 0) {
        return
      }

      void updateTask(task.id, updates).catch(console.error)
    },
    [gridRows, tags, updateTask, visibleFields]
  )

  const handleCellClicked = useCallback(
    (item: Item) => {
      const { rowIndex } = parseItem(item)
      const row = gridRows[rowIndex]
      if (row?.kind === 'task') {
        void setSelectedTask(row.task.id).catch(console.error)
      }
    },
    [gridRows, setSelectedTask]
  )

  const handleCellActivated = useCallback(
    (item: Item) => {
      const { columnIndex, rowIndex } = parseItem(item)
      const row = gridRows[rowIndex]
      const field = visibleFields[columnIndex]
      if (row?.kind !== 'task' || !isSelectField(field)) {
        setSelectEditor(undefined)
        return
      }

      const rect = gridRef.current?.getBounds(columnIndex, rowIndex)
      if (!rect) {
        return
      }

      setSelectEditor({ task: row.task, field, rect })
    },
    [gridRows, visibleFields]
  )

  const drawCell = useCallback<DrawCellCallback>(
    (args, drawContent) => {
      const row = gridRows[args.row]
      if (row?.kind === 'group') {
        drawGroupRow(args.ctx, args.rect, row, `${args.theme.baseFontStyle} ${args.theme.fontFamily}`)
        return
      }

      const task = row?.kind === 'task' ? row.task : undefined
      const field = visibleFields[args.col]
      const pills = task && field ? getTaskFieldPills(task, field, tags) : []

      if (pills.length === 0 || args.cell.kind !== GridCellKind.Text) {
        if (field?.id === 'dueDate' && task && isTaskOverdue(task) && task.dueDate) {
          drawGridCellBase(args.ctx, args.rect, args.theme.bgCell, args.theme.borderColor, args.theme.horizontalBorderColor)
          drawDueDateWithOverdueIcon(args.ctx, args.rect, task.dueDate, `${args.theme.baseFontStyle} ${args.theme.fontFamily}`, args.theme.cellHorizontalPadding, args.theme.textDark)
          return
        }

        drawContent()
        return
      }

      drawGridCellBase(args.ctx, args.rect, args.theme.bgCell, args.theme.borderColor, args.theme.horizontalBorderColor)
      drawPills(args.ctx, args.rect, pills, `${args.theme.baseFontStyle} ${args.theme.fontFamily}`, args.theme.cellHorizontalPadding)
    },
    [gridRows, tags, visibleFields]
  )

  const handleColumnResize = useCallback(
    (column: GridColumn, newSize: number) => {
      if (!column.id) {
        return
      }

      const latestView = useTaskStore.getState().views.find((item) => item.id === view.id) ?? view
      void updateView({
        ...latestView,
        columnWidths: {
          ...latestView.columnWidths,
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
    <div className="task-grid-view">
      <DataEditor
        ref={gridRef}
        columns={columns}
        rows={gridRows.length}
        getCellContent={getCellContent}
        getCellsForSelection
        drawCell={drawCell}
        onCellActivated={handleCellActivated}
        onCellClicked={handleCellClicked}
        onCellEdited={handleCellEdited}
        onColumnResizeEnd={handleColumnResize}
        onRowAppended={handleRowAppended}
        rowHeight={(row) => (gridRows[row]?.kind === 'group' ? GROUP_ROW_HEIGHT : DEFAULT_ROW_HEIGHT)}
        rowMarkers={hasGroupedRows ? 'none' : 'number'}
        smoothScrollX
        smoothScrollY
        trailingRowOptions={{ hint: '新任务', sticky: true }}
        width="100%"
        height="100%"
      />
      {selectEditor && (
        <GridSelectEditor
          editor={selectEditor}
          onClose={() => setSelectEditor(undefined)}
          onUpdate={(updates) => void updateTask(selectEditor.task.id, updates).then(() => setSelectEditor(undefined)).catch(console.error)}
          tags={tags}
        />
      )}
    </div>
  )
}

function GridSelectEditor({
  editor,
  onClose,
  onUpdate,
  tags,
}: {
  editor: SelectEditorState
  onClose: () => void
  onUpdate: (updates: Partial<Pick<Task, 'status' | 'priority' | 'tagIds'>>) => void
  tags: Array<{ id: string; name: string }>
}) {
  const value = getSelectFieldValue(editor.task, editor.field.id)
  const options = getSelectOptions(editor.field.id, tags)

  return (
    <select
      aria-label={`选择${getFieldLabel(editor.field)}`}
      autoFocus
      className="task-grid-select-editor"
      onBlur={onClose}
      onChange={(event) => onUpdate(createSelectFieldUpdate(editor.field.id, event.target.value))}
      style={{
        left: editor.rect.x,
        top: editor.rect.y,
        width: Math.max(editor.rect.width, 120),
        height: editor.rect.height,
      }}
      value={value}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

function isSelectField(field: FieldDefinition | undefined): field is FieldDefinition & { id: SelectFieldId } {
  return field?.id === 'status' || field?.id === 'priority' || field?.id === 'tagIds'
}

function getSelectFieldValue(task: Task, fieldId: SelectFieldId): string {
  if (fieldId === 'tagIds') {
    return task.tagIds[0] ?? ''
  }
  return task[fieldId]
}

function getSelectOptions(fieldId: SelectFieldId, tags: Array<{ id: string; name: string }>): Array<{ value: string; label: string }> {
  if (fieldId === 'status') {
    return (Object.keys(STATUS_LABELS) as TaskStatus[]).map((status) => ({ value: status, label: STATUS_LABELS[status] }))
  }
  if (fieldId === 'priority') {
    return (Object.keys(PRIORITY_LABELS) as TaskPriority[]).map((priority) => ({ value: priority, label: PRIORITY_LABELS[priority] }))
  }
  return [{ value: '', label: '无标签' }, ...tags.map((tag) => ({ value: tag.id, label: tag.name }))]
}

function createSelectFieldUpdate(fieldId: SelectFieldId, value: string): Partial<Pick<Task, 'status' | 'priority' | 'tagIds'>> {
  if (fieldId === 'status') {
    return { status: value as TaskStatus }
  }
  if (fieldId === 'priority') {
    return { priority: value as TaskPriority }
  }
  return { tagIds: value ? [value] : [] }
}

function createGroupCell(row: Extract<GridRow, { kind: 'group' }>, columnCount: number): GridCell {
  return {
    kind: GridCellKind.Text,
    data: `${row.label} (${row.count})`,
    displayData: `${row.label} (${row.count})`,
    allowOverlay: false,
    readonly: true,
    span: [0, Math.max(0, columnCount - 1)],
    copyData: `${row.label} (${row.count})`,
  }
}

function drawGroupRow(ctx: CanvasRenderingContext2D, rect: Rectangle, row: Extract<GridRow, { kind: 'group' }>, font: string) {
  ctx.save()
  ctx.fillStyle = '#f8fafc'
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height)

  ctx.strokeStyle = '#e2e8f0'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(rect.x, rect.y + rect.height - 0.5)
  ctx.lineTo(rect.x + rect.width, rect.y + rect.height - 0.5)
  ctx.stroke()

  const x = rect.x + 14
  const centerY = rect.y + rect.height / 2
  const countText = `${row.count} 条`
  ctx.font = `700 ${font}`
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#0f172a'
  ctx.fillText(row.label, x, centerY + 0.5)

  const labelWidth = Math.ceil(ctx.measureText(row.label).width)
  ctx.font = `600 ${font}`
  const countWidth = Math.ceil(ctx.measureText(countText).width) + 18
  const badgeX = x + labelWidth + 10
  const badgeY = centerY - 10
  drawRoundedRect(ctx, badgeX, badgeY, countWidth, 20, 10)
  ctx.fillStyle = '#eef2ff'
  ctx.fill()
  ctx.strokeStyle = '#c7d2fe'
  ctx.stroke()
  ctx.fillStyle = '#3730a3'
  ctx.fillText(countText, badgeX + 9, centerY + 0.5)

  ctx.restore()
}

function drawGridCellBase(ctx: CanvasRenderingContext2D, rect: Rectangle, bgCell: string, borderColor: string, horizontalBorderColor: string | undefined) {
  ctx.save()
  ctx.fillStyle = bgCell
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height)

  ctx.strokeStyle = borderColor
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(rect.x + rect.width - 0.5, rect.y)
  ctx.lineTo(rect.x + rect.width - 0.5, rect.y + rect.height)
  ctx.stroke()

  ctx.strokeStyle = horizontalBorderColor ?? borderColor
  ctx.beginPath()
  ctx.moveTo(rect.x, rect.y + rect.height - 0.5)
  ctx.lineTo(rect.x + rect.width, rect.y + rect.height - 0.5)
  ctx.stroke()
  ctx.restore()
}

function drawPills(ctx: CanvasRenderingContext2D, rect: Rectangle, pills: GridPill[], font: string, horizontalPadding: number) {
  const startX = rect.x + horizontalPadding
  const centerY = rect.y + rect.height / 2
  const maxX = rect.x + rect.width - horizontalPadding
  let x = startX

  ctx.save()
  ctx.font = font
  ctx.textBaseline = 'middle'

  for (const pill of pills) {
    const textWidth = Math.ceil(ctx.measureText(pill.label).width)
    const width = Math.min(textWidth + PILL_HORIZONTAL_PADDING * 2, maxX - x)
    if (width < 18) {
      break
    }

    const y = centerY - PILL_HEIGHT / 2
    drawRoundedRect(ctx, x, y, width, PILL_HEIGHT, PILL_HEIGHT / 2)
    ctx.fillStyle = pill.token.bg
    ctx.fill()
    ctx.strokeStyle = pill.token.border
    ctx.lineWidth = 1
    ctx.stroke()

    ctx.save()
    ctx.beginPath()
    ctx.rect(x + PILL_HORIZONTAL_PADDING, y, Math.max(0, width - PILL_HORIZONTAL_PADDING * 2), PILL_HEIGHT)
    ctx.clip()
    ctx.fillStyle = pill.token.text
    ctx.font = `700 ${font}`
    ctx.fillText(pill.label, x + PILL_HORIZONTAL_PADDING, centerY + 0.5)
    ctx.restore()

    x += width + PILL_GAP
    if (x >= maxX) {
      break
    }
  }

  ctx.restore()
}

function drawDueDateWithOverdueIcon(ctx: CanvasRenderingContext2D, rect: Rectangle, dueDate: string, font: string, horizontalPadding: number, textColor: string) {
  const startX = rect.x + horizontalPadding
  const centerY = rect.y + rect.height / 2
  const maxX = rect.x + rect.width - horizontalPadding

  ctx.save()
  ctx.font = font
  ctx.textBaseline = 'middle'
  ctx.fillStyle = textColor
  ctx.fillText(dueDate, startX, centerY + 0.5)

  const textWidth = Math.ceil(ctx.measureText(dueDate).width)
  const iconX = Math.min(startX + textWidth + 7, maxX - OVERDUE_ICON_SIZE)
  if (iconX > startX + textWidth) {
    drawOverdueWarningIcon(ctx, iconX, centerY - OVERDUE_ICON_SIZE / 2, OVERDUE_ICON_SIZE)
  }

  ctx.restore()
}

function drawOverdueWarningIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const radius = size / 2

  ctx.save()
  ctx.beginPath()
  ctx.arc(x + radius, y + radius, radius, 0, Math.PI * 2)
  ctx.fillStyle = '#fee2e2'
  ctx.fill()
  ctx.strokeStyle = '#ef4444'
  ctx.lineWidth = 1
  ctx.stroke()

  ctx.fillStyle = '#dc2626'
  ctx.font = `800 ${Math.max(10, Math.floor(size * 0.78))}px Avenir Next, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('!', x + radius, y + radius + 0.5)
  ctx.restore()
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const resolvedRadius = Math.min(radius, width / 2, height / 2)

  ctx.beginPath()
  ctx.moveTo(x + resolvedRadius, y)
  ctx.lineTo(x + width - resolvedRadius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + resolvedRadius)
  ctx.lineTo(x + width, y + height - resolvedRadius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - resolvedRadius, y + height)
  ctx.lineTo(x + resolvedRadius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - resolvedRadius)
  ctx.lineTo(x, y + resolvedRadius)
  ctx.quadraticCurveTo(x, y, x + resolvedRadius, y)
  ctx.closePath()
}
