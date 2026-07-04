/**
 * 公开分享 API 回归
 * 运行: npm run test:resume-share
 */
import { randomUUID } from 'node:crypto'

const API = process.env.API_BASE ?? 'http://localhost:8788/api'

async function main() {
  const email = `share-test-${randomUUID().slice(0, 8)}@test.local`
  const password = 'test123456'

  const reg = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name: 'Share Test' }),
  })
  if (!reg.ok) throw new Error(`register failed: ${reg.status}`)
  const { token } = (await reg.json()) as { token: string }

  const create = await fetch(`${API}/resumes`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: '分享测试简历' }),
  })
  if (!create.ok) throw new Error(`create resume failed: ${create.status}`)
  const { resume } = (await create.json()) as { resume: { id: string } }

  const shareRes = await fetch(`${API}/resumes/${resume.id}/share`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  })
  if (!shareRes.ok) throw new Error(`share failed: ${shareRes.status}`)
  const { share } = (await shareRes.json()) as { share: { token: string } }
  if (!share.token) throw new Error('missing share token')

  const publicRes = await fetch(`${API}/public/r/${share.token}`)
  if (!publicRes.ok) throw new Error(`public read failed: ${publicRes.status}`)
  const pub = (await publicRes.json()) as { title: string }
  if (pub.title !== '分享测试简历') throw new Error('public title mismatch')

  const revoke = await fetch(`${API}/resumes/${resume.id}/share`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!revoke.ok) throw new Error(`revoke failed: ${revoke.status}`)

  const gone = await fetch(`${API}/public/r/${share.token}`)
  if (gone.status !== 404) throw new Error('expected 404 after revoke')

  console.log('resume-share: ok')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
