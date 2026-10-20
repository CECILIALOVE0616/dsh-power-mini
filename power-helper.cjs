/**
 * dsh-power-mini — detached power helper.
 *
 * Runs outside the Host process tree (detached + ignored stdio) in Electron's
 * Node mode, because the shell cannot outlive the process that asks it to die.
 *
 * handoff.mode === "restart": let the HTTP 202 flush, terminate the shell, wait
 * for the shell and the Host to be gone, then start a clean shell without the
 * Node-mode wrapper in its env.
 *
 * handoff.mode === "quit": same first half, but stop once everything is gone.
 * Killing the shell drops the Host IPC channel, and the Host answers that by
 * shutting itself down (dsh-desktop-host: process.once('disconnect')), which is
 * the same graceful path the tray quit entry takes.
 */
const fs = require('node:fs')
const path = require('node:path')
const { spawn } = require('node:child_process')

const handoffPath = process.argv[2]
const LOG_LIMIT = 64 * 1024
const RESPONSE_GRACE_MS = 900
const KILL_TIMEOUT_MS = 15000
const HOST_TIMEOUT_MS = 15000
const SETTLE_MS = 1200

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function log(file, line) {
  try {
    try {
      if (fs.statSync(file).size > LOG_LIMIT) fs.writeFileSync(file, '')
    } catch {}
    fs.appendFileSync(file, '[' + new Date().toISOString() + '] [helper] ' + line + '\n')
  } catch {}
}

function alive(pid) {
  if (typeof pid !== 'number' || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return error.code !== 'ESRCH'
  }
}

async function waitGone(pid, timeout) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    if (!alive(pid)) return true
    await sleep(150)
  }
  return !alive(pid)
}

async function main() {
  if (handoffPath === undefined) throw new Error('missing handoff path')
  const handoff = JSON.parse(fs.readFileSync(handoffPath, 'utf8'))
  const mode = handoff.mode === 'quit' ? 'quit' : 'restart'
  const logFile = path.join(path.dirname(handoffPath), 'power.log')
  log(logFile, 'start mode=' + mode + ' shellPid=' + handoff.shellPid + ' hostPid=' + handoff.hostPid)

  await sleep(RESPONSE_GRACE_MS)

  let killed = false
  for (let attempt = 1; attempt <= 3 && !killed; attempt += 1) {
    try {
      process.kill(handoff.shellPid)
      killed = true
      log(logFile, 'terminate sent attempt=' + attempt)
    } catch (error) {
      log(logFile, 'terminate failed attempt=' + attempt + ': ' + error.code)
      if (error.code === 'ESRCH') {
        killed = true
        break
      }
      await sleep(400)
    }
  }
  if (!killed) {
    log(logFile, 'giving up: shell could not be terminated')
    return
  }

  if (!(await waitGone(handoff.shellPid, KILL_TIMEOUT_MS))) {
    log(logFile, 'giving up: shell still alive after ' + KILL_TIMEOUT_MS + 'ms')
    return
  }
  log(logFile, 'shell gone')

  // The Host shuts itself down when the IPC channel drops; wait for it either way.
  if (!(await waitGone(handoff.hostPid, HOST_TIMEOUT_MS))) {
    log(logFile, 'host still alive after ' + HOST_TIMEOUT_MS + 'ms' + (mode === 'restart' ? ', relaunching anyway' : ''))
  } else {
    log(logFile, 'host gone')
  }

  if (mode === 'quit') {
    log(logFile, 'quit complete')
    return
  }

  await sleep(SETTLE_MS)

  try {
    const child = spawn(handoff.exe, handoff.args ?? [], {
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
      cwd: handoff.cwd,
      env: handoff.env,
    })
    child.unref()
    log(logFile, 'relaunched shell pid=' + String(child.pid))
  } catch (error) {
    log(logFile, 'relaunch failed: ' + (error && error.stack ? error.stack : String(error)))
  }
}

main().catch((error) => {
  try {
    log(path.join(path.dirname(handoffPath), 'power.log'),
      'fatal: ' + (error && error.stack ? error.stack : String(error)))
  } catch {}
})
