import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getBossConnectSession, updateBossConnectSession } from './boss-connect-store.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

type LoginStatusFile = {
  connectId?: string
  status?: 'waiting_scan' | 'success' | 'failed' | 'pending'
  inProgress?: boolean
  loggedInPending?: boolean
  error?: string | null
  bossName?: string | null
  bossUid?: string | null
  cookieHeader?: string | null
  cookies?: Array<{ name?: string; value?: string }>
  qrImageBase64?: string | null
}

type ActiveDrissionJob = {
  connectId: string
  proc: ChildProcess
  watchTimer?: ReturnType<typeof setInterval>
}

const activeJobs = new Map<string, ActiveDrissionJob>()

let drissionAvailable: boolean | null = null

function workerRoot(): string {
  return process.env.MIANSHI_WORKER_ROOT ?? join(__dirname, '../../../mianshi-worker')
}

function connectDir(connectId: string): string {
  const root = process.env.BOSS_CONNECT_ROOT ?? join(workerRoot(), 'storage', 'connect')
  return join(root, connectId)
}

function statusFilePath(connectId: string): string {
  return join(connectDir(connectId), 'login_status.json')
}

function helperScriptPath(): string {
  return join(workerRoot(), 'scripts', 'login_helper.py')
}

function resolvePythonBin(): string {
  const custom = process.env.BOSS_LOGIN_PYTHON
  if (custom && existsSync(custom)) return custom

  const winVenv = join(workerRoot(), '.venv', 'Scripts', 'python.exe')
  if (existsSync(winVenv)) return winVenv

  const unixVenv = join(workerRoot(), '.venv', 'bin', 'python')
  if (existsSync(unixVenv)) return unixVenv

  return process.platform === 'win32' ? 'python' : 'python3'
}

export async function checkDrissionAvailable(): Promise<boolean> {
  if (drissionAvailable !== null) return drissionAvailable
  const python = resolvePythonBin()
  const script = helperScriptPath()
  if (!existsSync(script)) {
    drissionAvailable = false
    return false
  }

  drissionAvailable = await new Promise<boolean>((resolve) => {
    const proc = spawn(python, ['-c', 'import DrissionPage'], {
      stdio: 'ignore',
      windowsHide: true,
    })
    proc.on('error', () => resolve(false))
    proc.on('exit', (code) => resolve(code === 0))
  })
  return drissionAvailable
}

function readLoginStatus(connectId: string): LoginStatusFile | null {
  const file = statusFilePath(connectId)
  if (!existsSync(file)) return null
  try {
    return JSON.parse(readFileSync(file, 'utf-8')) as LoginStatusFile
  } catch {
    return null
  }
}

function cookiesToHeader(cookies: Array<{ name?: string; value?: string }> | undefined): string {
  if (!cookies?.length) return ''
  return cookies
    .filter((c) => c.name && c.value != null)
    .map((c) => `${c.name}=${c.value}`)
    .join('; ')
}

function resolveCookieHeader(data: LoginStatusFile): string {
  if (data.cookieHeader) return data.cookieHeader
  return cookiesToHeader(data.cookies)
}

async function syncLoginStatusFromFile(connectId: string): Promise<'pending' | 'waiting_scan' | 'success' | 'failed'> {
  const data = readLoginStatus(connectId)
  if (!data?.status) return 'pending'

  const cookieHeader = resolveCookieHeader(data)

  if (data.status === 'success' && cookieHeader) {
    await updateBossConnectSession(connectId, {
      status: 'success',
      cookieHeader,
      bossName: data.bossName ?? undefined,
      bossUid: data.bossUid ?? undefined,
      error: undefined,
    })
    return 'success'
  }

  if (data.status === 'failed') {
    await updateBossConnectSession(connectId, {
      status: 'failed',
      error: data.error ?? 'Boss 登录失败',
    })
    return 'failed'
  }

  await updateBossConnectSession(connectId, {
    status: 'waiting_scan',
    qrImageBase64: data.loggedInPending ? '' : (data.qrImageBase64 ?? undefined),
    error: undefined,
  })
  return 'waiting_scan'
}

export function getDrissionLoginMeta(connectId: string): { loggedInPending?: boolean } {
  const data = readLoginStatus(connectId)
  return { loggedInPending: data?.loggedInPending === true }
}

function stopWatch(job: ActiveDrissionJob) {
  if (job.watchTimer) {
    clearInterval(job.watchTimer)
    job.watchTimer = undefined
  }
}

export function isDrissionLoginInProgress(connectId: string): boolean {
  return activeJobs.has(connectId)
}

export async function cancelDrissionLogin(connectId: string) {
  const job = activeJobs.get(connectId)
  if (!job) return
  stopWatch(job)
  activeJobs.delete(connectId)
  if (!job.proc.killed) {
    job.proc.kill('SIGTERM')
    setTimeout(() => {
      if (!job.proc.killed) job.proc.kill('SIGKILL')
    }, 3000).unref()
  }
}

export async function cancelAllDrissionLogins() {
  for (const id of [...activeJobs.keys()]) {
    await cancelDrissionLogin(id)
  }
}

function startStatusWatcher(connectId: string, job: ActiveDrissionJob) {
  stopWatch(job)
  job.watchTimer = setInterval(() => {
    void syncLoginStatusFromFile(connectId).then((st) => {
      if (st === 'success' || st === 'failed') {
        const current = activeJobs.get(connectId)
        if (current) stopWatch(current)
      }
    })
  }, 1000)
}

export async function runDrissionBossLogin(connectId: string): Promise<{ ok: boolean; message: string }> {
  if (activeJobs.has(connectId)) {
    return { ok: true, message: '登录子进程已在运行' }
  }

  if (!(await checkDrissionAvailable())) {
    return {
      ok: false,
      message: 'DrissionPage 未就绪。请在 mianshi-worker 执行: pip install DrissionPage',
    }
  }

  const dir = connectDir(connectId)
  mkdirSync(dir, { recursive: true })

  const python = resolvePythonBin()
  const helper = helperScriptPath()

  await updateBossConnectSession(connectId, { status: 'waiting_scan', error: undefined })

  const proc = spawn(python, [helper, connectId, dir], {
    cwd: workerRoot(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: false,
    detached: false,
  })

  const job: ActiveDrissionJob = { connectId, proc }
  activeJobs.set(connectId, job)
  startStatusWatcher(connectId, job)

  proc.stdout?.on('data', (buf) => console.log('[boss-drission]', buf.toString().trim()))
  proc.stderr?.on('data', (buf) => console.warn('[boss-drission]', buf.toString().trim()))

  proc.on('exit', (code) => {
    const current = activeJobs.get(connectId)
    if (current) stopWatch(current)
    activeJobs.delete(connectId)
    void (async () => {
      await syncLoginStatusFromFile(connectId)
      const s = await getBossConnectSession(connectId)
      if (s?.status === 'success') return
      if (code !== 0 && s?.status === 'waiting_scan') {
        await updateBossConnectSession(connectId, {
          status: 'failed',
          error: `登录子进程退出 code=${code ?? 'null'}`,
        })
      }
    })()
  })

  proc.on('error', (err) => {
    void updateBossConnectSession(connectId, {
      status: 'failed',
      error: err.message,
    })
    activeJobs.delete(connectId)
    stopWatch(job)
  })

  return { ok: true, message: '已启动 DrissionPage Chrome，请扫码' }
}

export async function refreshDrissionLogin(connectId: string) {
  await cancelDrissionLogin(connectId)
  return runDrissionBossLogin(connectId)
}

/** 轮询时主动从 login_status.json 同步（防止 watcher 提前退出） */
export async function syncDrissionLoginStatus(connectId: string) {
  if (!existsSync(statusFilePath(connectId))) return 'pending'
  return syncLoginStatusFromFile(connectId)
}
