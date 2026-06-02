import { cpSync } from 'fs';
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

// 2. Build Angular
console.log('\n🔨 Building Angular app...');
run('npx ng build');

console.log('\n✅ Build complete!');
