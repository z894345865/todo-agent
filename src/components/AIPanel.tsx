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

    const baseURL = import.meta.env.VITE_LLM_BASE_URL
    const apiKey = import.meta.env.VITE_LLM_API_KEY
    const model = import.meta.env.VITE_LLM_MODEL || 'qwen3.5-plus'
    const language = import.meta.env.VITE_LLM_LANGUAGE || 'zh-CN'

    if (!apiKey || !baseURL) {
      console.warn('LLM not configured — set VITE_LLM_BASE_URL and VITE_LLM_API_KEY in .env')
      return
    }

    const agent = new PageAgent({
      model,
      baseURL,
      apiKey,
      language,
      customTools: todoTools,
    })

    // Show the AI panel immediately (Panel hides itself by default on idle)
    agent.panel.show()

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
