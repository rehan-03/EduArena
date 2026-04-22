import express from 'express'
import cors from 'cors'
import { spawn } from 'child_process'
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2)
}

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '10mb' }))

const TEMP_DIR = join(__dirname, 'temp')
if (!existsSync(TEMP_DIR)) {
  mkdirSync(TEMP_DIR, { recursive: true })
}

const LANGUAGE_CONFIG = {
  cpp: {
    extension: 'cpp',
    compile: (filePath, exePath) => ['g++', filePath, '-o', exePath, '-std=c++17'],
    run: (exePath, inputFile, outputFile) => [exePath],
    compileTimeout: 10000,
    runTimeout: 5000,
  },
  python: {
    extension: 'py',
    compile: null,
    run: (filePath, inputFile, outputFile) => ['python', filePath],
    runTimeout: 5000,
  },
  java: {
    extension: 'java',
    compile: (filePath) => ['javac', filePath],
    run: (exePath, inputFile, outputFile) => ['java', '-cp', dirname(exePath), 'Main'],
    compileTimeout: 10000,
    runTimeout: 5000,
  },
}

function sanitizeCode(code) {
  const bannedPatterns = [
    /#include\s*<unistd\.h>/,
    /#include\s*<sys\//,
    /#include\s*<windows\.h>/,
    /system\s*\(/,
    /exec\s*\(/,
    /popen\s*\(/,
    /fork\s*\(/,
    /import\s+os/,
    /import\s+subprocess/,
    /import\s+sys/,
    /require\s*\(\s*['"]os['"]\s*\)/,
    /require\s*\(\s*['"]child_process['"]\s*\)/,
  ]

  for (const pattern of bannedPatterns) {
    if (pattern.test(code)) {
      return { valid: false, error: 'Code contains banned operations' }
    }
  }

  return { valid: true }
}

function executeCommand(command, args, timeout) {
  return new Promise((resolve) => {
    const proc = spawn(command, args, {
      cwd: TEMP_DIR,
      shell: true,
      env: { ...process.env, PATH: process.env.PATH },
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    proc.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    const timer = setTimeout(() => {
      proc.kill('SIGKILL')
      resolve({ success: false, stdout, stderr, error: 'Time limit exceeded', timedOut: true })
    }, timeout)

    proc.on('close', (code) => {
      clearTimeout(timer)
      resolve({ success: code === 0, stdout, stderr, error: code !== 0 ? stderr : null, timedOut: false })
    })

    proc.on('error', (err) => {
      clearTimeout(timer)
      resolve({ success: false, stdout, stderr, error: err.message, timedOut: false })
    })
  })
}

async function runCode(code, language, input = '') {
  const config = LANGUAGE_CONFIG[language]
  if (!config) {
    return { verdict: 'error', output: '', error: `Unsupported language: ${language}` }
  }

  const jobId = generateId()
  const ext = config.extension
  const codeFile = join(TEMP_DIR, `code_${jobId}.${ext}`)
  const inputFile = join(TEMP_DIR, `input_${jobId}.txt`)
  const outputFile = join(TEMP_DIR, `output_${jobId}.txt`)
  const errorFile = join(TEMP_DIR, `error_${jobId}.txt`)
  const exeFile = join(TEMP_DIR, `exe_${jobId}${language === 'cpp' ? '.exe' : ''}`)

  try {
    writeFileSync(codeFile, code)
    if (input) {
      writeFileSync(inputFile, input)
    }

    if (language === 'java') {
      const className = code.match(/public\s+class\s+(\w+)/)?.[1] || 'Main'
      const javaFile = join(TEMP_DIR, `${className}.java`)
      writeFileSync(javaFile, code.replace(/public\s+class\s+\w+/, `public class ${className}`))
    }

    if (config.compile) {
      const compileCmd = language === 'cpp'
        ? config.compile(codeFile, exeFile)
        : config.compile(codeFile)

      const compileResult = await executeCommand(compileCmd[0], compileCmd.slice(1), config.compileTimeout || 10000)

      if (!compileResult.success || compileResult.error) {
        return {
          verdict: 'compilation_error',
          output: '',
          error: compileResult.error || 'Compilation failed',
        }
      }
    }

    const runCmd = language === 'java'
      ? config.run(exeFile, inputFile, outputFile)
      : config.run(codeFile, inputFile, outputFile)

    const cmdShell = process.platform === 'win32' ? 'cmd' : '/bin/sh'
    let cmdArgs
    if (process.platform === 'win32') {
      const redirectInput = input ? ` < "${inputFile}"` : ''
      const redirectOutput = ` > "${outputFile}" 2> "${errorFile}"`
      cmdArgs = ['/c', runCmd.join(' ') + redirectInput + redirectOutput]
    } else {
      const redirectInput = input ? ` < "${inputFile}"` : ''
      const redirectOutput = ` > "${outputFile}" 2>"${errorFile}"`
      cmdArgs = ['-c', runCmd.join(' ') + redirectInput + redirectOutput]
    }

    const runResult = await executeCommand(cmdShell, cmdArgs, config.runTimeout || 5000)

    if (runResult.timedOut) {
      return { verdict: 'time_limit_exceeded', output: '', error: 'Execution timed out' }
    }

    if (!runResult.success) {
      return { verdict: 'runtime_error', output: '', error: runResult.error || 'Runtime error' }
    }

    let actualOutput = ''
    if (existsSync(outputFile)) {
      actualOutput = await import('fs').then(fs => fs.readFileSync(outputFile, 'utf-8'))
    }

    return { verdict: 'accepted', output: actualOutput.trim(), error: null }

  } catch (err) {
    return { verdict: 'error', output: '', error: err.message }
  } finally {
    try {
      [codeFile, inputFile, outputFile, errorFile, exeFile].forEach(f => {
        if (existsSync(f)) unlinkSync(f)
      })
      if (language === 'java') {
        const className = code.match(/public\s+class\s+(\w+)/)?.[1] || 'Main'
        const javaFile = join(TEMP_DIR, `${className}.java`)
        if (existsSync(javaFile)) unlinkSync(javaFile)
        const classFile = join(TEMP_DIR, `${className}.class`)
        if (existsSync(classFile)) unlinkSync(classFile)
      }
    } catch (e) {
      // cleanup errors ignored
    }
  }
}

app.post('/api/judge', async (req, res) => {
  const { code, language, testCases = [] } = req.body

  if (!code || !language) {
    return res.status(400).json({ error: 'Missing code or language' })
  }

  const sanitized = sanitizeCode(code)
  if (!sanitized.valid) {
    return res.json({ verdict: 'runtime_error', output: '', error: sanitized.error })
  }

  if (!testCases.length) {
    const result = await runCode(code, language, '')
    return res.json(result)
  }

  for (const testCase of testCases) {
    const input = testCase.input || ''
    const expectedOutput = (testCase.expectedOutput || testCase.expected || '').trim()

    const result = await runCode(code, language, input)

    if (result.verdict !== 'accepted') {
      return res.json({ ...result, input, expectedOutput })
    }

    const actual = result.output.trim()
    if (actual !== expectedOutput) {
      return res.json({
        verdict: 'wrong_answer',
        input,
        expectedOutput,
        output: actual,
        error: 'Output does not match expected',
      })
    }
  }

  res.json({ verdict: 'accepted', output: testCases[testCases.length - 1]?.output || '', error: null })
})

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`Judge server running on http://localhost:${PORT}`)
})