#!/bin/bash
set -e

export PATH="$HOME/.nvm/versions/node/v20.19.5/bin:$PATH"

echo "▶ Building widget..."
cd react-flow-wrapper
npm run build
cp dist/react-flow.iife.js ../public/react-flow.js
cp dist/workflow-builder-widget.css ../public/react-flow-wrapper.css
cd ..

echo "✓ Widget built and copied to public/"
echo "▶ Starting Angular dev server..."
