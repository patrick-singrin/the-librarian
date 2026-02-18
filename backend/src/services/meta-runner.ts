import { spawn } from 'child_process'
import { toolPaths } from '../config.js'

interface MetaJob {
  running: boolean
  startedAt: string | null
  output: string
  error: string
  exitCode: number | null
}

const currentJob: MetaJob = {
  running: false,
  startedAt: null,
  output: '',
  error: '',
  exitCode: null,
}

export function getMetaStatus(): MetaJob {
  return { ...currentJob }
}

export function runMetaEnrich(): MetaJob {
  if (currentJob.running) {
    return { ...currentJob }
  }

  currentJob.running = true
  currentJob.startedAt = new Date().toISOString()
  currentJob.output = ''
  currentJob.error = ''
  currentJob.exitCode = null

  const child = spawn('python3', ['enrich.py', '--auto-approve', '--non-interactive', '--batch-size=0'], {
    cwd: toolPaths.meta,
    env: { ...process.env, PYTHONUNBUFFERED: '1' },
  })

  child.stdout.on('data', (data: Buffer) => {
    currentJob.output += data.toString()
  })

  child.stderr.on('data', (data: Buffer) => {
    currentJob.error += data.toString()
  })

  child.on('close', (code) => {
    currentJob.running = false
    currentJob.exitCode = code
  })

  child.on('error', (err) => {
    currentJob.running = false
    currentJob.error += `\nProcess error: ${err.message}`
    currentJob.exitCode = 1
  })

  return { ...currentJob }
}
