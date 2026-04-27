import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { dirname, resolve } from 'node:path'

const devDataFile = resolve('.local-data', 'todo-data.json')
const taskDevDataFile = resolve('.local-data', 'task-data.json')

async function handleJsonFileEndpoint(
  req: IncomingMessage,
  res: ServerResponse<IncomingMessage>,
  file: string,
  emptyData: unknown
): Promise<void> {
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'GET') {
    try {
      res.end(await readFile(file, 'utf-8'))
    } catch {
      res.end(JSON.stringify(emptyData))
    }
    return
  }

  if (req.method === 'PUT') {
    const chunks: Buffer[] = []
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, Buffer.concat(chunks).toString('utf-8'))
    res.statusCode = 204
    res.end()
    return
  }

  res.statusCode = 405
  res.end(JSON.stringify({ error: 'Method not allowed' }))
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'todo-dev-file-storage',
      configureServer(server) {
        server.middlewares.use('/__todo_data', async (req, res) => {
          await handleJsonFileEndpoint(req, res, devDataFile, { version: 1, todos: [], tags: [], todoTags: [], ui: { filters: {} } })
        })
        server.middlewares.use('/__task_data', async (req, res) => {
          await handleJsonFileEndpoint(req, res, taskDevDataFile, { version: 1, tasks: [], tags: [], ui: { activeViewId: 'grid-default' } })
        })
      },
    },
  ],
  server: {
    host: '0.0.0.0',
  },
})
