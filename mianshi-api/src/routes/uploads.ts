import { Hono } from 'hono'
import { readQuestionImage } from '../services/question-image-store.js'

export const uploadRoutes = new Hono()

uploadRoutes.get('/question-images/:filename', (c) => {
  const file = readQuestionImage(c.req.param('filename'))
  if (!file) return c.json({ error: 'Not found' }, 404)
  return new Response(file.buffer, {
    headers: {
      'Content-Type': file.mime,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
})
