# Multiview TODO Design

## Goal

Replace the current rough TODO table with a local, single-user multiview task workspace inspired by Feishu Base and Airtable. The new TODO system does not need to stay compatible with the existing TODO data model. It should keep the agent chat experience and tool-call flow, but the agent tools can be rewritten around the new task model.

The first version supports three views:

- Grid view for structured, editable task records.
- Kanban view for drag-and-drop task flow.
- Calendar view for tasks with due dates.

The app remains local-first. Data is stored on the user's machine, with no cloud sync, team collaboration, permissions, or account system.

## Non-Goals

- No multi-user collaboration.
- No cloud sync.
- No backward compatibility with the current `Todo` shape.
- No full custom-field UI in the first release.
- No formulas, relational fields, automations, or database-like permissions.
- No direct copy of `pxcharts` table implementation.

## References

`pxcharts` is useful as a product and model reference, not as implementation code to copy. It implements its multiview table through handwritten React components, Zustand persistence, custom field metadata, filtering, sorting, grouping, and dnd-kit drag interactions.

For this app, the grid rendering layer should use `@glideapps/glide-data-grid` to avoid hand-building spreadsheet-like behavior. The view and task model should be custom and small enough for this TODO app.

## Architecture

The new system has four layers:

1. `task-db`: local JSON persistence for tasks, fields, views, tags, UI state, and agent history.
2. `task-model`: task types, field definitions, view definitions, validation, filtering, sorting, grouping, and record update helpers.
3. `task-ui`: grid, kanban, calendar, detail panel, and toolbar components.
4. `agent-tools`: PageAgent tools that operate on the new task model.

The UI should not encode task-specific logic in every view. Grid, kanban, calendar, and agent tools should share the same task-model helpers wherever practical.

## Data Model

### Task

Tasks are structured records:

```ts
export type TaskStatus = 'todo' | 'doing' | 'done' | 'blocked'
export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low'

export interface Task {
  id: string
  title: string
  status: TaskStatus
  priority: TaskPriority
  tagIds: string[]
  dueDate?: string
  description?: string
  createdAt: string
  updatedAt: string
  completedAt?: string
}
```

Dates are stored as ISO date strings for date-only fields, such as `2026-04-27`, and ISO datetime strings for timestamps.

### Tags

```ts
export interface Tag {
  id: string
  name: string
  color: string
}
```

### Fields

The first release uses fixed fields, but the app reads them through field definitions so custom fields can be added later.

```ts
export type FieldType =
  | 'text'
  | 'checkbox'
  | 'singleSelect'
  | 'multiSelect'
  | 'date'
  | 'longText'

export interface FieldOption {
  id: string
  name: string
  color?: string
}

export interface FieldDefinition {
  id: string
  name: string
  type: FieldType
  required?: boolean
  options?: FieldOption[]
}
```

Built-in fields:

- `title`: text, required.
- `status`: single select.
- `priority`: single select.
- `tagIds`: multi select.
- `dueDate`: date.
- `completedAt`: date.
- `description`: long text.
- `createdAt`: date or read-only timestamp display.

### Views

```ts
export type ViewType = 'grid' | 'kanban' | 'calendar'

export interface FilterRule {
  fieldId: string
  operator: 'is' | 'isNot' | 'contains' | 'isEmpty' | 'isNotEmpty' | 'before' | 'after' | 'between'
  value?: unknown
}

export interface SortRule {
  fieldId: string
  direction: 'asc' | 'desc'
}

export interface ViewDefinition {
  id: string
  name: string
  type: ViewType
  visibleFieldIds: string[]
  filters: FilterRule[]
  sorts: SortRule[]
  groupBy?: string
  columnWidths?: Record<string, number>
}
```

Default views:

- `grid-default`: all active tasks in a grid.
- `kanban-status`: kanban grouped by status.
- `calendar-due-date`: calendar based on due date.

## Local JSON Shape

The persisted app data file should use a versioned shape:

```ts
export interface TaskAppData {
  version: 1
  tasks: Task[]
  tags: Tag[]
  fields: FieldDefinition[]
  views: ViewDefinition[]
  ui: {
    activeViewId: string
    selectedTaskId?: string
  }
}
```

The first implementation can initialize an empty file with default fields and default views. No migration from old TODO data is required.

## UI Design

### Multiview Workspace

Replace the current table area with a workspace containing:

- View tabs for Grid, Kanban, and Calendar.
- A compact toolbar for filter, sort, group, visible fields, and new task.
- The active view surface.
- A shared task detail panel.

The agent chat remains available as it is today, but its tools target the new model.

### Grid View

Use `@glideapps/glide-data-grid`.

Grid behavior:

- Display one row per task.
- Render cells by field type.
- Edit `title`, `status`, `priority`, `tagIds`, `dueDate`, and `description`.
- Treat `createdAt` and `completedAt` as read-only unless editing completion status changes `completedAt`.
- Save column widths in the active view.
- Apply shared filters and sorts before rendering.
- Clicking a row or detail action opens the shared task detail panel.

### Kanban View

Kanban behavior:

- Group by `status` by default.
- Allow grouping by `priority` or `tagIds` if a view is configured that way.
- Dragging a card between groups updates the grouped field.
- Card content shows title, priority, tags, and due date.
- Clicking a card opens the shared task detail panel.

### Calendar View

Calendar behavior:

- Use `dueDate` as the calendar date field.
- Show month view first.
- Tasks without a due date appear in an unscheduled area.
- Clicking a task opens the shared task detail panel.
- A quick date action can assign a due date to unscheduled tasks.

### Task Detail Panel

The detail panel edits the same underlying record as the grid:

- Title.
- Status.
- Priority.
- Tags.
- Due date.
- Description.
- Metadata such as created and updated time.

All views should reflect detail-panel changes immediately through the shared store.

## Agent Tools

Rewrite the PageAgent tools around the new task model.

Initial tools:

- `create_task`: create a task with title and optional fields.
- `update_task`: update one or more fields on a task by id.
- `delete_task`: delete a task by id.
- `complete_task`: set status to done and update `completedAt`.
- `list_tasks`: list tasks with optional limit and status filter.
- `search_tasks`: search title and description.
- `filter_tasks`: filter by structured fields such as status, priority, tag, due date, and overdue.
- `create_tag`: create a tag.
- `update_view`: update active view configuration such as filters, sorts, group, or visible fields.
- `get_task_summary`: return counts and useful report material for daily or weekly summaries.

Tool responses should be structured, concise, and suitable for display in the current tool result cards.

## Error Handling

- Invalid task ids return a clear tool error.
- Invalid field values are rejected by task-model validation.
- Malformed local JSON should produce a readable storage error and avoid overwriting the file.
- Unknown view ids fall back to the default grid view.
- Calendar ignores invalid due dates and surfaces the affected task in the unscheduled area.

## Testing

Unit tests should cover:

- Default data initialization.
- Task create/update/delete/complete helpers.
- Field validation.
- Filtering, sorting, and grouping.
- Agent tool argument handling and results.
- Local JSON normalization.

Component-level or browser verification should cover:

- Grid renders non-empty task data.
- Editing a grid cell persists to the store.
- Kanban drag updates the grouped field.
- Calendar displays due-date tasks and unscheduled tasks.
- Agent tools can create and update tasks and the UI refreshes.

## Implementation Notes

- Add `@glideapps/glide-data-grid` as a dependency.
- Keep changes scoped to `todo-with-agent`.
- Replace the old TODO table rather than adapting it.
- Preserve the agent chat entry point and message rendering where possible.
- Do not preserve old TODO data or old tool names unless they still fit the new model.

