import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const devDataFile = resolve('.local-data', 'todo-data.json')

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'todo-dev-file-storage',
      configureServer(server) {
        server.middlewares.use('/__todo_data', async (req, res) => {
          res.setHeader('Content-Type', 'application/json')

          if (req.method === 'GET') {
            try {
              res.end(await readFile(devDataFile, 'utf-8'))
            } catch {
              res.end(JSON.stringify({ version: 1, todos: [], tags: [], todoTags: [], ui: { filters: {} } }))
            }
            return
          }

          if (req.method === 'PUT') {
            const chunks: Buffer[] = []
            for await (const chunk of req) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
            }
            await mkdir(dirname(devDataFile), { recursive: true })
            await writeFile(devDataFile, Buffer.concat(chunks).toString('utf-8'))
            res.statusCode = 204
            res.end()
            return
          }

          res.statusCode = 405
          res.end(JSON.stringify({ error: 'Method not allowed' }))
        })
      },
    },
  ],
  server: {
    host: '0.0.0.0',
  },
})
