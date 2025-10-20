import { spawn } from 'child_process';
import path from 'path';

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', shell: true, ...opts });
    p.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with code ${code}`));
    });
    p.on('error', reject);
  });
}

(async () => {
  try {
    console.log('Bundling server with esbuild...');
    await run('npx', ['esbuild', 'server/index.ts', '--platform=node', '--packages=external', '--bundle', '--format=esm', '--outdir=dist']);
    console.log('Starting server...');
    const server = spawn('node', [path.join('dist', 'index.js')], { stdio: 'inherit', shell: true });
    server.on('close', (code) => {
      console.log('server process exited with', code);
      process.exit(code);
    });
    server.on('error', (err) => {
      console.error('server process error', err);
      process.exit(1);
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
