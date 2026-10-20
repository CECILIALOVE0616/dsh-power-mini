/**
 * dsh-power-mini — host half.
 *
 * Adds two routes to the Desktop Host, backing the two buttons in the session
 * header: "restart" relaunches the Electron shell, "quit" exits it the same way
 * the tray menu's quit entry does. The Host cannot kill its own parent, so the
 * actual work is delegated to a detached helper process:
 *
 *   1. POST /dsh-power-mini/restart | /quit
 *        -> write handoff.json (mode included), spawn helper, reply 202
 *   2. helper waits for the response to land, then terminates the shell
 *   3. killing the shell drops the Host IPC channel, so the Host performs its
 *      own graceful shutdown (see dsh-desktop-host: process.once('disconnect'))
 *   4. restart: helper waits for the old processes to disappear, then spawns a
 *      fresh shell. quit: helper waits for them to disappear and stops there.
 *
 * No DOM polling, no taskkill, no process enumeration: the only PID we trust is
 * process.ppid, which is the Electron main process by construction.
 */
import { spawn } from 'node:child_process'
import { appendFileSync, mkdirSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const name = 'dsh-power-mini'

export const inject = ['webServer', 'connection']

const ROUTE = '/dsh-power-mini'
const HELPER = join(dirname(fileURLToPath(import.meta.url)), 'power-helper.cjs')
const LOG_LIMIT = 64 * 1024

function stateDir() {
  const home = process.env.USERPROFILE !== undefined && process.env.USERPROFILE !== ''
    ? process.env.USERPROFILE
    : homedir()
  return join(home, '.dsh', 'dsh-power-mini')
}

function log(line) {
  try {
    const dir = stateDir()
    mkdirSync(dir, { recursive: true })
    const file = join(dir, 'power.log')
    try {
      if (statSync(file).size > LOG_LIMIT) writeFileSync(file, '')
    } catch {}
    appendFileSync(file, '[' + new Date().toISOString() + '] ' + line + '\n')
  } catch {}
}

/** Whether this Host is owned by the Electron Desktop shell. */
function isDesktop() {
  return process.env.DSH_CLIENT_VERSION !== undefined && typeof process.ppid === 'number'
}

/**
 * Interruptible work, mirroring the shell's own quit inspection: a running or
 * tool-using agent, a queued turn, or a running/stopping background job.
 */
function activeTasks(ctx) {
  try {
    return collectActiveTasks(ctx)
  } catch (error) {
    log('inventory failed: ' + (error?.message ?? String(error)))
    return { known: false, agents: [], jobs: [] }
  }
}

/** @returns {{ known: boolean, agents: object[], jobs: object[] }} */
function collectActiveTasks(ctx) {
  const agents = ctx.get('agents')
  const jobs = ctx.get('jobs')
  if (agents === undefined || jobs === undefined) return { known: false, agents: [], jobs: [] }
  const list = agents.list()
  const busyAgents = list
    .filter((agent) => agent.status === 'running'
      || (agent.inbox?.nextTurn?.length ?? 0) > 0
      || (agent.inbox?.nextStep?.length ?? 0) > 0)
    .map((agent) => ({ id: agent.id, label: agent.label ?? agent.id, status: agent.status }))
  const busyJobs = []
  for (const owner of [undefined, ...list]) {
    for (const job of jobs.list(owner?.id)) {
      if (job.status === 'running' || job.status === 'stopping') {
        busyJobs.push({ id: job.id, label: job.label ?? job.id, status: job.status })
      }
    }
  }
  return { known: true, agents: busyAgents, jobs: busyJobs }
}

function sendJson(res, status, body) {
  const payload = Buffer.from(JSON.stringify(body))
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': String(payload.length),
    'cache-control': 'no-store',
  })
  res.end(payload)
}

/** Environment for the relaunched shell: undo the Node-mode wrapper the Host runs in. */
function shellEnvironment() {
  const env = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (key === 'ELECTRON_RUN_AS_NODE' || key === 'DSH_DESKTOP_NODE_EXECUTABLE') continue
    env[key] = value
  }
  return env
}

/**
 * Hand the decision to the detached helper.
 * @param {'restart' | 'quit'} mode - relaunch the shell afterwards, or just stop.
 */
function arm(mode) {
  const dir = stateDir()
  mkdirSync(dir, { recursive: true })
  const handoffPath = join(dir, 'handoff.json')
  const handoff = {
    mode,
    shellPid: process.ppid,
    hostPid: process.pid,
    exe: process.execPath,
    args: [],
    cwd: process.cwd(),
    env: shellEnvironment(),
    requestedAt: new Date().toISOString(),
  }
  writeFileSync(handoffPath, JSON.stringify(handoff, null, 2))
  const child = spawn(process.execPath, [HELPER, handoffPath], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    cwd: dir,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
  })
  child.unref()
  log('armed ' + mode + ' shellPid=' + process.ppid + ' helperPid=' + String(child.pid))
  return handoffPath
}

const ACTIONS = {
  '/restart': { mode: 'restart', key: 'restarting', message: 'Tasks would be interrupted by the restart.' },
  '/quit': { mode: 'quit', key: 'quitting', message: 'Tasks would be interrupted by quitting.' },
}

export function apply(ctx) {
  const fence = (req) => ctx.connection.requestRejection(req) === undefined

  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: ROUTE,
    handler: async (req, res) => {
      if (!fence(req)) {
        res.writeHead(403)
        res.end('forbidden')
        return
      }
      const url = new URL(req.url ?? '/', 'http://dsh.internal')
      const route = url.pathname.slice(ROUTE.length) || '/'

      if (route === '/status' && (req.method === 'GET' || req.method === 'HEAD')) {
        sendJson(res, 200, {
          ok: true,
          desktop: isDesktop(),
          pid: process.pid,
          shellPid: process.ppid,
          active: activeTasks(ctx),
        })
        return
      }

      const action = ACTIONS[route]
      if (action !== undefined && req.method === 'POST') {
        if (!isDesktop()) {
          sendJson(res, 409, {
            ok: false,
            error: {
              code: 'not-desktop',
              message: 'Only the Desktop shell can be restarted or quit from here.',
            },
          })
          return
        }
        const force = url.searchParams.get('force') === '1'
        const active = activeTasks(ctx)
        if (!force && active.known && (active.agents.length > 0 || active.jobs.length > 0)) {
          sendJson(res, 409, {
            ok: false,
            active,
            error: { code: 'busy', message: action.message },
          })
          return
        }
        sendJson(res, 202, { ok: true, [action.key]: true, shellPid: process.ppid })
        try {
          arm(action.mode)
        } catch (error) {
          log('arm failed: ' + (error?.stack ?? String(error)))
        }
        return
      }

      sendJson(res, 404, { ok: false, error: { code: 'not-found', message: 'Unknown route.' } })
    },
  }), 'dsh-power-mini: restart and quit routes')
}
