#!/bin/bash
# Auto build and copy to public folder

npm run build 2>&1 | grep -E "(✓|error)" &
BUILD_PID=$!

# Watch for changes and rebuild + copy
while true; do
  npm run build 2>&1 | grep -E "(✓ built|error)"
  if [ $? -eq 0 ]; then
    cp dist/react-flow.iife.js ../public/react-flow.js
    cp dist/workflow-builder-widget.css ../public/react-flow-wrapper.css
    echo "✓ Updated at $(date '+%H:%M:%S')"
  fi
  sleep 2
done
