export interface Todo {
  id: string
  text: string
  completed: boolean
  createdAt: number
  completedAt?: number
}

export interface TodoStats {
  total: number
  completed: number
  completionRate: number
  weeklyCompleted: number
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
