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
    this.flowBuilderRef.nativeElement.addEventListener('workflowSaved', this.onWorkflowSaved);
  }

  ngOnDestroy() {
    this.flowBuilderRef.nativeElement.removeEventListener('workflowSaved', this.onWorkflowSaved);
  }

  save() {
    this.saveStatus.set('saving');
    this.flowBuilderRef.nativeElement.dispatchEvent(new CustomEvent('requestSave'));
  }

  private onWorkflowSaved = (event: CustomEvent) => {
    this.zone.run(() => {
      const { payload } = event.detail;
      console.log('Workflow saved:', payload);
      this.saveStatus.set('saved');
      setTimeout(() => this.saveStatus.set('idle'), 2000);
    });
  };
}
