import fs from 'fs/promises';
import path from 'path';

async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (e) {
    // ignore
  }
}

async function copyAssets() {
  const root = process.cwd();
  const srcDir = path.join(root, 'attached_assets');
  const destDir = path.join(root, 'client', 'public', 'attached_assets');

  try {
    await ensureDir(destDir);
    const files = await fs.readdir(srcDir);
    for (const f of files) {
      const src = path.join(srcDir, f);
      const dest = path.join(destDir, f);
      await fs.copyFile(src, dest);
      console.log(`copied ${f}`);
    }
  } catch (err) {
    console.error('Failed to copy assets:', err.message || err);
    process.exit(1);
  }
}

copyAssets();
