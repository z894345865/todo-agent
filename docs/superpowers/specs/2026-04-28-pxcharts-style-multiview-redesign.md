# pxcharts-Style Multiview TODO Redesign

## Goal

Rework the current multiview TODO workspace into a pxcharts-inspired local task base while preserving the current task model, local storage, agent chat, and task agent tools.

The current implementation is functional but has two problems:

- Empty-task view switching can still feel slow because UI state changes such as `setActiveView` wait for persistence work.
- Filtering, sorting, grouping, and field visibility are exposed as flat toolbar selects instead of a multidimensional table workflow.

The next version should feel closer to Feishu Base, Airtable, and pxcharts: a task table workspace with view navigation, command buttons, filter chips, and modal/popover rule editors.

## User Decision

Use option C from brainstorming:

> Base the redesign on pxcharts at `C:\Users\89434\work\code\pxcharts`, then add or preserve the agent and tools functionality.

This means pxcharts is the primary UX and component reference. It does not mean blindly copying the pxcharts task domain model or replacing the current agent architecture.

## Non-Goals

- Do not migrate the project to Next.js.
- Do not import the full pxcharts app, sidebar, statistics, template center, import/export, or documentation modules.
- Do not replace the existing PageAgent chat/tool-call mechanism.
- Do not introduce cloud sync, accounts, collaboration, permissions, or server storage.
- Do not build a full custom-field schema editor beyond what is needed for fixed-field TODO views in this iteration.

## Reference Findings

`pxcharts` is built with Next.js, React, Zustand, shadcn/Radix-style dialogs, Tailwind CSS, and dnd-kit. Its multidimensional table behavior is implemented through custom React components and store logic, not a reusable table package.

Useful pxcharts patterns:

- Left-side table/view navigation.
- Top command bar with search, field management, data filtering, sorting, grouping, import/export-style actions.
- Dialog-based filter, sort, group, and field configuration.
- Table rows that feel like business records, with badges, avatars, draggable handles, row numbers, and fixed columns.
- Store-level view config, filter config, sort config, grouping, visible fields, and column widths.

Patterns to avoid copying directly:

- pxcharts business-specific task shape with assignee/user/priorityGroups.
- Large all-in-one table component.
- Full Next.js app shell.
- Non-agent features unrelated to local TODO.

## Target UX

### Layout

The workspace should become a full application surface:

- Left panel:
  - Base/table identity, such as `TODO Base`.
  - Primary task table entry.
  - View list: Grid, Kanban, Calendar.
  - Lightweight record count and active view indicator.
- Main panel:
  - Top command bar.
  - Filter chips row.
  - Active view surface.
  - Optional detail panel or sheet for the selected task.
- Agent chat:
  - Remains available.
  - Can be docked/floating as it is now, or placed as a clear right-side action surface if that is simpler.

### Command Bar

The command bar should replace the current flat select-heavy toolbar.

Required commands:

- Search tasks.
- Field management.
- Data filtering.
- Grouping.
- Sorting.
- New task.
- Agent/chat entry remains visible.

Commands should use buttons with icons where practical, following the pxcharts pattern. A command opens a popover or dialog when the operation needs structured input.

### Filter Experience

Filtering should use multidimensional table semantics:

- A filter is a list of rules.
- Each rule has `fieldId`, `operator`, and optional `value`.
- The filter UI should let the user add, remove, and edit rules.
- Applied filters should render as chips above the table.
- The default grid may still filter out completed tasks, but this should be visible or clearable in the filter state.

Initial field/operator scope:

- `title`: contains, is empty, is not empty.
- `status`: is, is not.
- `priority`: is, is not.
- `tagIds`: contains, is empty, is not empty.
- `dueDate`: before, after, between, is empty, is not empty.
- `description`: contains, is empty, is not empty.

### Sort Experience

Sorting should use a popover/dialog similar to pxcharts:

- Select a field.
- Select ascending or descending.
- Show active sort as a chip or command-bar active state.
- Preserve the existing `ViewDefinition.sorts` representation.

### Group Experience

Grouping should use a popover/dialog:

- Supported group fields: status, priority, tagIds.
- Kanban should respect group selection.
- Grid may show grouping chips or grouped sections later, but this iteration only needs view config and command parity.

### Field Management

Field management should use a dialog:

- Toggle visible fields.
- Preserve at least `title`.
- Reset column widths.
- Keep current `FieldDefinition` and `ViewDefinition.visibleFieldIds`.

Custom field creation remains out of scope for this iteration, but the UI should not make future custom fields harder.

## Performance Requirements

The UI must not block on persistence for high-frequency UI state changes.

Required changes:

- View switching updates in-memory UI state immediately.
- View configuration changes update in memory immediately.
- Persistence happens asynchronously in the background.
- Repeated view configuration changes are debounced or serialized without blocking the user.
- Task record edits may still await validation and persistence, but the UI should stay responsive.
- Grid, Kanban, and Calendar view components should be lazy-loaded or kept cheap enough that empty-task view switching feels immediate.

Expected baseline:

- Empty-task view switching should complete visually within a single normal interaction frame on a typical local dev machine.
- Switching between Grid, Kanban, and Calendar should not read/write the JSON file synchronously in the interaction path.
- Large Kanban views should avoid rendering thousands of cards at once where feasible. If not fixed in this iteration, the limitation must be documented and the default should steer large data toward Grid.

## Architecture

### Keep

Keep these modules as the canonical domain and agent layer:

- `src/tasks/types.ts`
- `src/tasks/defaults.ts`
- `src/tasks/model.ts`
- `src/tasks/localJsonStore.ts`
- `src/tasks/db.ts`
- `src/tasks/store.ts`
- `src/tasks/agentTools.ts`
- `src/agent/*`

### Replace or Restructure

The current multiview components should be restructured around a pxcharts-style shell:

- Replace `TaskWorkspace` with a task base shell containing sidebar, command bar, filter chips, view surface, and detail surface.
- Replace `TaskToolbar` with smaller components:
  - `TaskCommandBar`
  - `TaskFilterDialog` or `TaskFilterPopover`
  - `TaskSortDialog`
  - `TaskGroupDialog`
  - `TaskFieldConfigDialog`
  - `TaskFilterChips`
- Keep or adapt:
  - `TaskGridView`
  - `TaskKanbanView`
  - `TaskCalendarView`
  - `TaskDetailPanel`
  - `cellRenderers`

### Store Changes

The store should separate fast UI state from persistence:

- `setActiveView` should update Zustand state immediately.
- A new internal persistence helper should save `ui.activeViewId` after the immediate state update.
- `updateView` should update the target view immediately, then persist.
- Persistence errors should surface in `error` without rolling back successful UI interaction unless data integrity requires rollback.
- Tests should cover immediate state update behavior and eventual persisted state behavior where practical.

## Data Compatibility

No compatibility with the old pre-multiview TODO model is required.

Compatibility with the current multiview task JSON should be preserved:

- Existing `TaskAppData` stays version `1`.
- Existing tasks, tags, fields, views, and UI state remain readable.
- New UI state needed for dialogs should be derived from `ViewDefinition` rather than stored as a separate incompatible shape.

## Agent Integration

Agent chat and tools remain part of the product.

Requirements:

- Existing tools continue to work:
  - `create_task`
  - `update_task`
  - `delete_task`
  - `complete_task`
  - `list_tasks`
  - `search_tasks`
  - `filter_tasks`
  - `create_tag`
  - `update_view`
  - `get_task_summary`
- Tool-driven changes refresh the active UI.
- The agent can update view config, and the command bar/filter chips should reflect those changes.
- The agent prompt should use multidimensional table vocabulary: records, fields, views, filters, grouping, sorting.

## Testing Strategy

Unit tests:

- Store immediate UI update for view switching.
- Store async persistence behavior for active view and view configuration.
- Filter rule editing helpers.
- Sort/group/field visibility update helpers.
- Agent tools remain registered and schema constrained.

Browser/manual verification:

- Empty-task view switching feels immediate.
- Grid, Kanban, and Calendar switch without visible stutter.
- Filter dialog adds/removes rules and shows chips.
- Sort dialog updates active view.
- Group dialog updates Kanban grouping.
- Field dialog toggles grid columns.
- Agent-created task appears in the current view.
- Agent-updated filter/view config appears in the command bar.

Performance verification:

- Record a before/after browser trace for empty-task view switching.
- Record a large-data trace with at least 5,000 generated tasks.
- Confirm large Kanban DOM growth is either reduced or documented as an expected limitation.

## Implementation Notes

- Use pxcharts as a UI and interaction reference, not as a direct dependency.
- Copy small component patterns only when they fit this codebase.
- Prefer local components and CSS over introducing shadcn/Radix wholesale unless a component is already available.
- If adding dialog/popover libraries becomes necessary, keep the dependency decision explicit in the implementation plan.
- Do not mix this redesign with unrelated SQLite migration work already present in the worktree.

## Acceptance Criteria

- The workspace visually resembles a multidimensional table app rather than a basic TODO toolbar.
- Empty-task view switching is materially faster because it no longer waits for persistence.
- Filtering uses rule-based dialogs/popovers and visible chips.
- Sorting, grouping, and field visibility use command-bar actions.
- Agent chat and tools still work.
- `npm test` passes.
- Production build passes.
- Browser verification confirms the redesigned flows.
