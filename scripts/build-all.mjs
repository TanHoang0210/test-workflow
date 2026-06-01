import { cpSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const run = (cmd, cwd = root) => execSync(cmd, { cwd, stdio: 'inherit' });

// 1. Build React widget
console.log('\n📦 Building React widget...');
run('npm run build', join(root, 'react-flow-wrapper'));
cpSync(join(root, 'react-flow-wrapper/dist/react-flow.iife.js'), join(root, 'public/react-flow.js'));
cpSync(join(root, 'react-flow-wrapper/dist/workflow-builder-widget.css'), join(root, 'public/react-flow-wrapper.css'));
console.log('✓ Widget copied to public/');

// 2. Build Angular (SSR)
console.log('\n🔨 Building Angular app...');
run('npx ng build');

// 3. Copy server bundle into functions/server
console.log('\n📋 Copying server bundle to functions/...');
rmSync(join(root, 'functions/server'), { recursive: true, force: true });
cpSync(join(root, 'dist/workflow-builder/server'), join(root, 'functions/server'), { recursive: true });
console.log('✓ functions/server ready');

console.log('\n✅ Build complete! Next steps:');
console.log('   1. firebase functions:secrets:set GROQ_API_KEY');
console.log('   2. cd functions && npm install');
console.log('   3. firebase deploy');
