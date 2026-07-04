import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Hono } from 'hono'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const DIAGRAM_DIR = join(__dirname, '../../data/diagrams')

const MIME: Record<string, string> = {
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
}

export const diagramRoutes = new Hono()

diagramRoutes.get('/:filename', (c) => {
  const filename = c.req.param('filename')
  if (!/^[a-z0-9-]+\.(svg|png|jpe?g|webp|gif)$/.test(filename)) {
    return c.json({ error: 'Not found' }, 404)
  }
  const filepath = join(DIAGRAM_DIR, filename)
  if (!existsSync(filepath)) return c.json({ error: 'Not found' }, 404)
  const ext = filename.split('.').pop() ?? 'svg'
  const buffer = readFileSync(filepath)
  return new Response(buffer, {
    headers: {
      'Content-Type': MIME[ext] ?? 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
})
