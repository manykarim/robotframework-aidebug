const { spawn } = require('node:child_process');
const { createInterface } = require('node:readline');

class BackendClient {
  constructor(executable, args = [], output = { appendLine() {} }) {
    this.executable = executable;
    this.args = args;
    this.output = output;
    this.process = null;
    this.pending = new Map();
    this.sequence = 0;
    this.readiness = null;
  }

  async start() {
    if (this.process) {
      return;
    }
    this.output.appendLine(`[backend] starting: ${this.executable} ${this.args.join(' ')}`.trim());
    this.process = spawn(this.executable, this.args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false
    });
    this.process.stderr.on('data', chunk => {
      this.output.appendLine(`[backend-stderr] ${chunk.toString().trim()}`);
    });
    this.process.on('exit', code => {
      const error = new Error(`Backend exited with code ${code}`);
      for (const pending of this.pending.values()) {
        pending.reject(error);
      }
      this.pending.clear();
      this.process = null;
      this.readiness = null;
      this.output.appendLine(`[backend] exited with code ${code}`);
    });
    const reader = createInterface({ input: this.process.stdout });
    reader.on('line', line => this._handleLine(line));
    this.readiness = this.request('health');
    await this.readiness;
  }

  async stop() {
    if (!this.process) {
      return;
    }
    this.process.stdin.write('__EXIT__\n');
    this.process.stdin.end();
  }

  async request(command, argumentsObject = {}) {
    if (!this.process) {
      throw new Error('Backend is not running.');
    }
    const id = ++this.sequence;
    const payload = { id, command, arguments: argumentsObject };
    const promise = new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
    this.process.stdin.write(JSON.stringify(payload) + '\n');
    return promise;
  }

  _handleLine(line) {
    if (!line.trim()) {
      return;
    }
    const message = JSON.parse(line);
    const pending = this.pending.get(message.id);
    if (!pending) {
      return;
    }
    this.pending.delete(message.id);
    if (message.ok) {
      pending.resolve(message.result);
      return;
    }
    const error = new Error(message.error.message);
    error.code = message.error.code;
    pending.reject(error);
  }
}

module.exports = { BackendClient };
