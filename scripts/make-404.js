import fs from 'fs/promises';
import path from 'path';

async function make404() {
  const root = process.cwd();
  const idx = path.join(root, 'dist', 'public', 'index.html');
  const out = path.join(root, 'dist', 'public', '404.html');
  try {
    await fs.copyFile(idx, out);
    console.log('copied index.html -> 404.html');
  } catch (err) {
    console.error('failed to create 404.html:', err.message || err);
    process.exit(1);
  }
}

make404();
