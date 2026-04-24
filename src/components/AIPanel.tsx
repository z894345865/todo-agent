/// <reference types="vite/client" />
import { useEffect, useRef } from 'react'
import { PageAgent } from 'page-agent'
import { todoTools } from '../agent/tools'
import { useTodoStore } from '../store'

export function AIPanel() {
  const agentRef = useRef<PageAgent | null>(null)

  useEffect(() => {
    // Expose store to global for PageAgent tools
    // This allows tools to access state without React context
    ;(globalThis as any).__todoStore = useTodoStore.getState()

    const apiKey = import.meta.env.VITE_DASHSCOPE_API_KEY
    if (!apiKey) {
      console.warn('VITE_DASHSCOPE_API_KEY not set — PageAgent will not work. Create a .env file with VITE_DASHSCOPE_API_KEY=your_key')
      return
    }

    const agent = new PageAgent({
      model: 'qwen3.5-plus',
      baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      apiKey,
      language: 'zh-CN',
      customTools: todoTools,
    })

    agentRef.current = agent

    // Subscribe to store changes and keep globalThis ref updated
    const unsubscribe = useTodoStore.subscribe(() => {
      ;(globalThis as any).__todoStore = useTodoStore.getState()
    })

    return () => {
      unsubscribe()
      agent.dispose()
      agentRef.current = null
    }
  }, [])

  // PageAgent's Panel class appends its UI directly to document.body
  // We don't need to render anything here — the Panel handles its own DOM
  return null
}
