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
