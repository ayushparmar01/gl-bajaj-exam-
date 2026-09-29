const { spawn } = require('child_process');
const path = require('path');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

console.log('\n🚀 Starting GLB EXAMSPHERE Fullstack Development Environment...\n');

const backend = spawn('node', ['server.js'], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'inherit',
  shell: true
});

const frontend = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.join(__dirname, 'frontend'),
  stdio: 'inherit',
  shell: true
});

const cleanup = () => {
  console.log('\n🛑 Shutting down dev servers...');
  if (backend && !backend.killed) {
    try {
      if (isWindows) spawn('taskkill', ['/pid', backend.pid, '/f', '/t']);
      else backend.kill();
    } catch (e) {}
  }
  if (frontend && !frontend.killed) {
    try {
      if (isWindows) spawn('taskkill', ['/pid', frontend.pid, '/f', '/t']);
      else frontend.kill();
    } catch (e) {}
  }
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
