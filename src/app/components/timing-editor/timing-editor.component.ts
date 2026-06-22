import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CircuitService } from '../../services/circuit.service';
import { CircuitNode, SignalValue, InputSignalEdit } from '../../models/circuit.models';

@Component({
  selector: 'app-timing-editor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="timing-editor" *ngIf="node">
      <div class="editor-header">
        <h3>时序编辑 - {{ node.label || node.id }}</h3>
        <button class="close-btn" (click)="onClose()">×</button>
      </div>

      <div class="editor-body">
        <div class="initial-value-section">
          <label>初始值:</label>
          <div class="value-buttons">
            <button
              class="value-btn"
              [class.active]="initialValue === 0"
              (click)="setInitialValue(0)"
            >
              0
            </button>
            <button
              class="value-btn"
              [class.active]="initialValue === 1"
              (click)="setInitialValue(1)"
            >
              1
            </button>
          </div>
        </div>

        <div class="waveform-editor">
          <div class="waveform-label">
            <span>信号波形</span>
            <span class="hint">点击时间轴添加/删除跳变点</span>
          </div>

          <svg
            class="editor-svg"
            [attr.width]="svgWidth"
            [attr.height]="svgHeight"
            (click)="onSvgClick($event)"
          >
            <defs>
              <pattern id="editorGrid" width="50" height="20" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 L 0 20" fill="none" stroke="#e0e0e0" stroke-width="0.5"/>
              </pattern>
            </defs>

            <rect x="0" y="0" [attr.width]="svgWidth" [attr.height]="svgHeight" fill="url(#editorGrid)"/>

            <path
              [attr.d]="waveformPath"
              fill="none"
              stroke="#1976D2"
              stroke-width="2"
            />

            <g *ngFor="let t of transitions">
              <circle
                [attr.cx]="timeToX(t)"
                [attr.cy]="svgHeight / 2"
                r="5"
                fill="#f44336"
                stroke="#fff"
                stroke-width="2"
                class="transition-point"
              />
              <line
                [attr.x1]="timeToX(t)"
                y1="0"
                [attr.x2]="timeToX(t)"
                [attr.y2]="svgHeight"
                stroke="#f44336"
                stroke-width="1"
                stroke-dasharray="3,3"
                opacity="0.5"
              />
            </g>

            <g class="time-axis">
              <line x1="0" [attr.y1]="svgHeight - 15" [attr.x2]="svgWidth" [attr.y2]="svgHeight - 15" stroke="#333" stroke-width="1"/>
              <g *ngFor="let tick of timeTicks">
                <line [attr.x1]="tick.x" [attr.y1]="svgHeight - 15" [attr.x2]="tick.x" [attr.y2]="svgHeight - 10" stroke="#333" stroke-width="1"/>
                <text [attr.x]="tick.x" [attr.y]="svgHeight - 2" text-anchor="middle" font-size="10" fill="#666">{{ tick.label }}</text>
              </g>
            </g>
          </svg>
        </div>

        <div class="transitions-list">
          <div class="list-header">
            <span>跳变点列表 (ns)</span>
          </div>
          <div class="list-content">
            <span
              *ngFor="let t of transitions; let i = index"
              class="transition-tag"
            >
              {{ t.toFixed(1) }}
              <button class="remove-btn" (click)="removeTransition(i)">×</button>
            </span>
            <span *ngIf="transitions.length === 0" class="empty-hint">暂无跳变点</span>
          </div>
        </div>
      </div>

      <div class="editor-footer">
        <button class="btn btn-secondary" (click)="clearTransitions()">清空</button>
        <button class="btn btn-primary" (click)="onClose()">完成</button>
      </div>
    </div>
  `,
  styles: [
    `
    .timing-editor {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.25);
      z-index: 1000;
      width: 600px;
      max-width: 90vw;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .editor-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 18px;
      border-bottom: 1px solid #eee;
      background: #f5f5f5;
      border-radius: 8px 8px 0 0;
    }

    .editor-header h3 {
      margin: 0;
      font-size: 15px;
      color: #333;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 22px;
      cursor: pointer;
      color: #666;
      line-height: 1;
      padding: 0 4px;
    }

    .close-btn:hover {
      color: #333;
    }

    .editor-body {
      padding: 16px 18px;
    }

    .initial-value-section {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .initial-value-section label {
      font-size: 13px;
      color: #333;
      font-weight: 500;
    }

    .value-buttons {
      display: flex;
      gap: 6px;
    }

    .value-btn {
      width: 36px;
      height: 28px;
      border: 1px solid #ccc;
      border-radius: 4px;
      background: #fff;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      color: #333;
    }

    .value-btn.active {
      background: #4CAF50;
      border-color: #388E3C;
      color: #fff;
    }

    .waveform-editor {
      margin-bottom: 16px;
    }

    .waveform-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .waveform-label span:first-child {
      font-size: 13px;
      color: #333;
      font-weight: 500;
    }

    .waveform-label .hint {
      font-size: 11px;
      color: #999;
    }

    .editor-svg {
      width: 100%;
      height: 100px;
      border: 1px solid #ddd;
      border-radius: 4px;
      cursor: crosshair;
      background: #fafafa;
    }

    .transition-point {
      cursor: pointer;
    }

    .transitions-list {
      margin-bottom: 8px;
    }

    .list-header {
      font-size: 12px;
      color: #666;
      margin-bottom: 6px;
      font-weight: 500;
    }

    .list-content {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      min-height: 28px;
      padding: 6px;
      background: #f8f8f8;
      border-radius: 4px;
      border: 1px solid #eee;
    }

    .transition-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 6px 2px 8px;
      background: #e3f2fd;
      border: 1px solid #bbdefb;
      border-radius: 12px;
      font-size: 11px;
      color: #1565C0;
      font-family: monospace;
    }

    .remove-btn {
      width: 16px;
      height: 16px;
      border: none;
      background: rgba(0,0,0,0.1);
      border-radius: 50%;
      cursor: pointer;
      font-size: 12px;
      line-height: 1;
      color: #666;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }

    .remove-btn:hover {
      background: rgba(0,0,0,0.2);
      color: #333;
    }

    .empty-hint {
      font-size: 12px;
      color: #aaa;
      font-style: italic;
    }

    .editor-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 12px 18px;
      border-top: 1px solid #eee;
      background: #fafafa;
      border-radius: 0 0 8px 8px;
    }

    .btn {
      padding: 7px 16px;
      font-size: 13px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
    }

    .btn-secondary {
      background: #f0f0f0;
      color: #333;
      border: 1px solid #ccc;
    }

    .btn-secondary:hover {
      background: #e0e0e0;
    }

    .btn-primary {
      background: #2196F3;
      color: #fff;
    }

    .btn-primary:hover {
      background: #1976D2;
    }
    `,
  ],
})
export class TimingEditorComponent implements OnInit, OnChanges {
  @Input() node: CircuitNode | null = null;
  @Output() close = new EventEmitter<void>();

  svgWidth = 560;
  svgHeight = 100;
  totalTime = 100;
  initialValue: SignalValue = 0;
  transitions: number[] = [];

  constructor(private circuitService: CircuitService) {}

  ngOnInit(): void {
    this.loadSignalData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['node'] && this.node) {
      this.loadSignalData();
    }
  }

  private loadSignalData(): void {
    if (!this.node) return;

    this.totalTime = this.circuitService.timingState.totalTime;
    const edit = this.circuitService.getInputSignalEdit(this.node.id);
    if (edit) {
      this.initialValue = edit.initialValue ?? 0;
      this.transitions = [...edit.transitions];
    } else {
      this.initialValue = this.node.value ?? 0;
      this.transitions = [];
    }
  }

  get waveformPath(): string {
    const highY = 15;
    const lowY = this.svgHeight - 25;
    let currentValue = this.initialValue;

    let path = `M 0 ${currentValue === 1 ? highY : lowY}`;

    const sortedTransitions = [...this.transitions].sort((a, b) => a - b);

    for (const t of sortedTransitions) {
      const x = this.timeToX(t);
      const prevY = currentValue === 1 ? highY : lowY;
      currentValue = currentValue === 1 ? 0 : 1;
      const currY = currentValue === 1 ? highY : lowY;

      path += ` L ${x} ${prevY}`;
      path += ` L ${x} ${currY}`;
    }

    const endX = this.svgWidth;
    const endY = currentValue === 1 ? highY : lowY;
    path += ` L ${endX} ${endY}`;

    return path;
  }

  get timeTicks(): { x: number; label: string }[] {
    const tickCount = 10;
    const ticks: { x: number; label: string }[] = [];

    for (let i = 0; i <= tickCount; i++) {
      const time = (this.totalTime / tickCount) * i;
      const x = this.timeToX(time);
      ticks.push({ x, label: `${Math.round(time)}ns` });
    }

    return ticks;
  }

  timeToX(time: number): number {
    return (time / this.totalTime) * this.svgWidth;
  }

  xToTime(x: number): number {
    return (x / this.svgWidth) * this.totalTime;
  }

  onSvgClick(event: MouseEvent): void {
    const svg = event.currentTarget as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const time = this.xToTime(x);
    const roundedTime = Math.round(time * 10) / 10;

    if (this.node) {
      this.circuitService.addTransition(this.node.id, roundedTime);
      this.loadSignalData();
    }
  }

  setInitialValue(value: SignalValue): void {
    this.initialValue = value;
    if (this.node) {
      this.circuitService.setInitialValue(this.node.id, value);
    }
  }

  removeTransition(index: number): void {
    if (!this.node) return;

    const time = this.transitions[index];
    if (time !== undefined) {
      this.circuitService.addTransition(this.node.id, time);
      this.loadSignalData();
    }
  }

  clearTransitions(): void {
    if (!this.node) return;

    const edit: InputSignalEdit = {
      nodeId: this.node.id,
      transitions: [],
      initialValue: this.initialValue,
    };
    this.circuitService.setInputSignalEdit(this.node.id, edit);
    this.loadSignalData();
  }

  onClose(): void {
    this.close.emit();
  }
}
