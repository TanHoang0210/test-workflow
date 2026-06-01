import { CUSTOM_ELEMENTS_SCHEMA, Component, ElementRef, NgZone, OnDestroy, AfterViewInit, ViewChild, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements AfterViewInit, OnDestroy {
  protected readonly title = signal('workflow-builder');
  protected saveStatus = signal<'idle' | 'saving' | 'saved'>('idle');

  @ViewChild('flowBuilder') flowBuilderRef!: ElementRef;

  constructor(private zone: NgZone) {}

  ngAfterViewInit() {
    const el = this.flowBuilderRef.nativeElement;
    el.addEventListener('workflowSaved', this.onWorkflowSaved);

    // Set custom handlers (khi showHeader=false)
    el.onSave = this.onSave;
    el.onImport = this.onImport;
    el.onExport = this.onExport;
    el.onUndo = this.onUndo;
    el.onRedo = this.onRedo;
  }

  ngOnDestroy() {
    this.flowBuilderRef.nativeElement.removeEventListener('workflowSaved', this.onWorkflowSaved);
  }
  // ===== Custom Handlers Demo =====
  // Uncomment showHeader="false" trong app.html và thêm custom handler props
  // để sử dụng các handler này

  onSave = () => {
    this.saveStatus.set('saving');
    this.flowBuilderRef.nativeElement.dispatchEvent(new CustomEvent('requestSave'));
    this.saveStatus.set('saving');
    // Thêm custom logic: gọi API, save database, v.v
    setTimeout(() => {
      this.saveStatus.set('saved');
      setTimeout(() => this.saveStatus.set('idle'), 2000);
    }, 500);
  };

  onImport = () => {
    console.log('Custom Import Handler');
    // Mở file dialog, load workflow từ file
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = event.target?.result as string;
          console.log('Imported workflow:', json);
          alert('Workflow imported!');
        } catch (err) {
          alert('Import failed: ' + (err as Error).message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  onExport = () => {
    console.log('Custom Export Handler');
    // Export workflow ra JSON
    const workflow = { name: 'Workflow', nodes: [], edges: [] };
    const json = JSON.stringify(workflow, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'workflow.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  onUndo = () => {
    console.log('Custom Undo Handler');
    alert('Undo - implement your custom logic');
  };

  onRedo = () => {
    console.log('Custom Redo Handler');
    alert('Redo - implement your custom logic');
  };

  private onWorkflowSaved = (event: CustomEvent) => {
    const { payload } = event.detail;
    console.log('Workflow saved:', payload);
    this.saveStatus.set('saved');
    setTimeout(() => this.saveStatus.set('idle'), 2000);
  };
}
