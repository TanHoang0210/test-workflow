# Custom Handlers Guide

## Overview
Component `react-flow-builder` hỗ trợ custom handlers để bạn có thể thay thế logic mặc định bằng custom logic của riêng mình.

## Available Props

```typescript
interface FlowWidgetProps {
  showHeader?: boolean;      // Hiển thị/ẩn header built-in (default: true)
  onSave?: () => void;       // Custom save handler
  onImport?: () => void;     // Custom import handler
  onExport?: () => void;     // Custom export handler
  onUndo?: () => void;       // Custom undo handler
  onRedo?: () => void;       // Custom redo handler
}
```

## Usage Examples

### 1. Sử dụng Header Built-in (Default)
```html
<!-- Sử dụng header mặc định với tất cả nút điều khiển -->
<react-flow-builder></react-flow-builder>
```

### 2. Custom Header + Custom Handlers
```html
<!-- Ẩn header built-in, dùng custom header + handlers -->
<react-flow-builder
  [showHeader]="false"
  [onSave]="onSave"
  [onImport]="onImport"
  [onExport]="onExport"
  [onUndo]="onUndo"
  [onRedo]="onRedo"
></react-flow-builder>
```

### TypeScript Component
```typescript
import { Component, ViewChild } from '@angular/core';

@Component({
  selector: 'app-custom',
  template: `
    <div class="custom-header">
      <button (click)="onSave()">Save</button>
      <button (click)="onUndo()">Undo</button>
      <button (click)="onRedo()">Redo</button>
      <button (click)="onImport()">Import</button>
      <button (click)="onExport()">Export</button>
    </div>
    <react-flow-builder
      #flowBuilder
      [showHeader]="false"
      [onSave]="onSave"
      [onImport]="onImport"
      [onExport]="onExport"
      [onUndo]="onUndo"
      [onRedo]="onRedo"
    ></react-flow-builder>
  `
})
export class CustomComponent {
  @ViewChild('flowBuilder') flowBuilder: any;

  onSave = () => {
    console.log('Custom save');
    // Gọi API, save vào database
    // this.api.saveWorkflow(workflow).subscribe(...);
  };

  onImport = () => {
    console.log('Custom import');
    // Mở file dialog, load workflow
  };

  onExport = () => {
    console.log('Custom export');
    // Export workflow
  };

  onUndo = () => {
    console.log('Custom undo');
    // Custom undo logic
  };

  onRedo = () => {
    console.log('Custom redo');
    // Custom redo logic
  };
}
```

## Access Current Workflow Data

Khi cần lấy workflow hiện tại từ component:

```typescript
@ViewChild('flowBuilder') flowBuilder: any;

onSave = () => {
  // Lấy thông tin từ web component
  const data = this.flowBuilder.nativeElement.getAttribute('data');
  // hoặc dispatch event
  this.flowBuilder.nativeElement.dispatchEvent(
    new CustomEvent('requestSave', { bubbles: true, composed: true })
  );
};
```

## Default Behavior

Nếu bạn **không truyền** custom handler, component sẽ dùng default behavior:

- **onSave**: Lưu vào localStorage + emit `workflowSaved` event
- **onImport**: Mở file dialog, load từ file JSON
- **onExport**: Download workflow thành file JSON
- **onUndo**: Undo lịch sử
- **onRedo**: Redo lịch sử

## Events

Component emit các events sau:

```typescript
// Khi workflow được save
flowBuilder.addEventListener('workflowSaved', (e: CustomEvent) => {
  console.log('Workflow saved:', e.detail);
  // e.detail = { json: string, payload: WorkflowPayload }
});
```

## Full Demo

Xem file demo hoàn chỉnh tại:
- `app-with-custom-handlers.html`
- `app-with-custom-handlers.ts`
- `app-with-custom-handlers.css`
