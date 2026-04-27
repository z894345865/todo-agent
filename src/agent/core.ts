import type { Message, TextMessage, ToolCallMessage, ToolResultMessage, ErrorMessage } from '../types'
import { todoTools } from './tools'
import { SYSTEM_PROMPT } from './prompts'
import { zodToJsonSchema } from './toolSchema'

export class AbortError extends Error {
  constructor() {
    super('Agent aborted by user')
  }
}

export type AgentStatus = 'idle' | 'thinking' | 'error' | 'aborted'

export interface AgentCoreOptions {
  baseURL: string
  apiKey: string
  model: string
  language: string
  onStatusChange?: (status: AgentStatus) => void
  onMessage?: (message: Message) => void
}

export class AgentCore {
  private messages: Message[] = []
  private baseURL: string
  private apiKey: string
  private model: string
  private language: string
  private onStatusChange?: (status: AgentStatus) => void
  private onMessage?: (message: Message) => void
  private maxIterations = 100
  private abortFlag = false
  private currentAbortController: AbortController | null = null

  constructor(options: AgentCoreOptions) {
    this.baseURL = options.baseURL
    this.apiKey = options.apiKey
    this.model = options.model
    this.language = options.language
    this.onStatusChange = options.onStatusChange
    this.onMessage = options.onMessage
  }

  private setStatus(status: AgentStatus) {
    this.onStatusChange?.(status)
  }

  private addMessage(message: Message) {
    this.messages.push(message)
    this.onMessage?.(message)
  }

  private newId(): string {
    return crypto.randomUUID()
  }

  async sendUserMessage(content: string) {
    const userMsg: TextMessage = {
      id: this.newId(),
      role: 'user',
      timestamp: Date.now(),
      type: 'text',
      content,
    }
    this.addMessage(userMsg)
    await this.runAgentLoop()
  }

  getMessages(): Message[] {
    return [...this.messages]
  }

  resetMessages(): void {
    this.messages = []
  }

  abort(): void {
    this.abortFlag = true
    this.currentAbortController?.abort()
  }

  private async runAgentLoop() {
    this.setStatus('thinking')
    this.abortFlag = false

    for (let i = 0; i < this.maxIterations; i++) {
      if (this.abortFlag) {
        const abortMsg: ErrorMessage = {
          id: this.newId(),
          role: 'assistant',
          timestamp: Date.now(),
          type: 'error',
          content: '已中止',
        }
        this.addMessage(abortMsg)
        this.setStatus('aborted')
        return
      }

      const abortController = new AbortController()
      this.currentAbortController = abortController
      let response: { content?: string; tool_calls?: Array<{ name: string; args: Record<string, unknown> }> } = { content: undefined, tool_calls: undefined }
      try {
        response = await this.callLLM(abortController)
      } catch (e) {
        if (e instanceof AbortError) {
          const abortMsg: ErrorMessage = {
            id: this.newId(),
            role: 'assistant',
            timestamp: Date.now(),
            type: 'error',
            content: '已中止',
          }
          this.addMessage(abortMsg)
          this.currentAbortController = null
          this.setStatus('aborted')
          return
        }
        throw e
      }

      if (this.abortFlag) {
        const abortMsg: ErrorMessage = {
          id: this.newId(),
          role: 'assistant',
          timestamp: Date.now(),
          type: 'error',
          content: '已中止',
        }
        this.addMessage(abortMsg)
        this.setStatus('aborted')
        return
      }

      if (response.content) {
        const assistantMsg: TextMessage = {
          id: this.newId(),
          role: 'assistant',
          timestamp: Date.now(),
          type: 'text',
          content: response.content,
        }
        this.addMessage(assistantMsg)
      }

      if (!response.tool_calls || response.tool_calls.length === 0) {
        this.currentAbortController = null
        this.setStatus('idle')
        return
      }

      for (const tc of response.tool_calls) {
        if (this.abortFlag) {
          const abortMsg: ErrorMessage = {
            id: this.newId(),
            role: 'assistant',
            timestamp: Date.now(),
            type: 'error',
            content: '已中止',
          }
          this.addMessage(abortMsg)
          this.currentAbortController = null
          this.setStatus('aborted')
          return
        }

        const toolCallMsg: ToolCallMessage = {
          id: this.newId(),
          role: 'assistant',
          timestamp: Date.now(),
          type: 'tool_call',
          toolName: tc.name,
          args: tc.args,
        }
        this.addMessage(toolCallMsg)

        const result = await this.executeTool(tc.name, tc.args)
        const toolResultMsg: ToolResultMessage = {
          id: this.newId(),
          role: 'tool',
          timestamp: Date.now(),
          type: 'tool_result',
          toolName: tc.name,
          result: result,
          success: !result.startsWith('Error:'),
        }
        this.addMessage(toolResultMsg)
      }
    }

    const errorMsg: ErrorMessage = {
      id: this.newId(),
      role: 'assistant',
      timestamp: Date.now(),
      type: 'error',
      content: 'Agent reached max iterations',
    }
    this.addMessage(errorMsg)
    this.currentAbortController = null
    this.setStatus('error')
  }

  private async executeTool(name: string, args: Record<string, unknown>): Promise<string> {
    const tool = todoTools[name]
    if (!tool) return `Error: Unknown tool "${name}"`
    try {
      const parsed = tool.inputSchema.parse(args)
      return await tool.execute(parsed)
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : String(e)}`
    }
  }

  private async callLLM(abortController: AbortController): Promise<{
    content?: string
    tool_calls?: Array<{ name: string; args: Record<string, unknown> }>
  }> {
    const systemMsg = { role: 'system' as const, content: SYSTEM_PROMPT }

    const langInstruction = {
      role: 'user' as const,
      content: `Note: respond in language code "${this.language}". For "${this.language}=zh-CN", respond in Chinese.`,
    }

    const msgs = [
      systemMsg,
      langInstruction,
      ...this.messages
        .map((m) => {
          if (m.type === 'text') return { role: m.role, content: m.content }
          if (m.type === 'tool_call') {
            return {
              role: 'assistant' as const,
              content: '',
              tool_calls: [
                {
                  id: m.id,
                  type: 'function' as const,
                  function: { name: m.toolName, arguments: JSON.stringify(m.args) },
                },
              ],
            }
          }
          if (m.type === 'tool_result') {
            return {
              role: 'tool' as const,
              tool_call_id: m.id,
              content: (m as ToolResultMessage).result,
            }
          }
          return null
        })
        .filter(Boolean),
    ]

    const tools = Object.values(todoTools).map((t) => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: zodToJsonSchema(t.inputSchema),
      },
    }))

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        signal: abortController.signal,
        body: JSON.stringify({ model: this.model, messages: msgs, tools, stream: false }),
      })

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`LLM API error: ${response.status} ${errText}`)
      }

      const data = await response.json()
      const msg = data.choices?.[0]?.message

      if (!msg) return {}

      const tool_calls = msg.tool_calls?.map((tc: any) => ({
        name: tc.function.name,
        args: JSON.parse(tc.function.arguments),
      }))

      return { content: msg.content || undefined, tool_calls }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        throw new AbortError()
      }
      throw e
    }
  }
}
