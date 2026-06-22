import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CircuitNode } from '../../models/circuit.models';

@Component({
  selector: 'app-properties-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="properties-panel" *ngIf="node">
      <div class="panel-header">
        <h3>元件属性</h3>
        <button class="close-btn" (click)="onClose()">×</button>
      </div>
      <div class="panel-body">
        <div class="property-item">
          <label>类型</label>
          <span class="value">{{ node.type }}</span>
        </div>
        <div class="property-item" *ngIf="node.label">
          <label>标签</label>
          <span class="value">{{ node.label }}</span>
        </div>
        <div class="property-item" *ngIf="node.type !== 'INPUT'">
          <label>传播延迟 (ns)</label>
          <div class="delay-input">
            <input
              type="number"
              [value]="tempDelay"
              (input)="onDelayInput($event)"
              min="0"
              step="1"
            />
            <button class="confirm-btn" (click)="onConfirmDelay()">确认</button>
          </div>
        </div>
        <div class="property-item" *ngIf="node.type === 'INPUT'">
          <label>传播延迟</label>
          <span class="value fixed">0 ns (固定)</span>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
    .properties-panel {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
      z-index: 1000;
      min-width: 280px;
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid #eee;
      background: #f5f5f5;
      border-radius: 8px 8px 0 0;
    }

    .panel-header h3 {
      margin: 0;
      font-size: 14px;
      color: #333;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: #666;
      line-height: 1;
      padding: 0 4px;
    }

    .close-btn:hover {
      color: #333;
    }

    .panel-body {
      padding: 16px;
    }

    .property-item {
      margin-bottom: 16px;
    }

    .property-item:last-child {
      margin-bottom: 0;
    }

    .property-item label {
      display: block;
      font-size: 12px;
      color: #666;
      margin-bottom: 6px;
      font-weight: 500;
    }

    .property-item .value {
      font-size: 14px;
      color: #333;
      font-weight: 500;
    }

    .property-item .value.fixed {
      color: #999;
      font-style: italic;
    }

    .delay-input {
      display: flex;
      gap: 8px;
    }

    .delay-input input {
      flex: 1;
      padding: 6px 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 13px;
    }

    .delay-input input:focus {
      outline: none;
      border-color: #2196F3;
    }

    .confirm-btn {
      padding: 6px 14px;
      background: #2196F3;
      color: #fff;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
    }

    .confirm-btn:hover {
      background: #1976D2;
    }
    `,
  ],
})
export class PropertiesPanelComponent {
  @Input() node: CircuitNode | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() delayChange = new EventEmitter<number>();

  tempDelay = 10;

  ngOnChanges(): void {
    if (this.node) {
      this.tempDelay = this.node.delay ?? 10;
    }
  }

  onDelayInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.tempDelay = parseInt(input.value, 10) || 0;
  }

  onConfirmDelay(): void {
    if (this.node && this.node.type !== 'INPUT') {
      this.delayChange.emit(Math.max(0, this.tempDelay));
    }
  }

  onClose(): void {
    this.close.emit();
  }
}
