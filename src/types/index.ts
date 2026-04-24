export interface Tag {
  id: string
  name: string
  color: string
}

export interface TodoTag {
  todoId: string
  tagId: string
}

export type Priority = 'high' | 'medium' | 'low'

export interface Todo {
  id: string
  text: string
  completed: boolean
  createdAt: number
  completedAt?: number
  priority?: Priority
  dueDate?: number
  description?: string
}

export interface TodoStats {
  total: number
  completed: number
  completionRate: number
  weeklyCompleted: number
  priorityStats: {
    high: number
    medium: number
    low: number
  }
  overdueCount: number
}

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool'

export interface BaseMessage {
  id: string
  role: MessageRole
  timestamp: number
}

export interface TextMessage extends BaseMessage {
  type: 'text'
  content: string
}

export interface ToolCallMessage extends BaseMessage {
  type: 'tool_call'
  toolName: string
  args: Record<string, unknown>
}

export interface ToolResultMessage extends BaseMessage {
  type: 'tool_result'
  toolName: string
  result: string
  success: boolean
}

export interface ErrorMessage extends BaseMessage {
  type: 'error'
  content: string
}

export type Message = TextMessage | ToolCallMessage | ToolResultMessage | ErrorMessage
