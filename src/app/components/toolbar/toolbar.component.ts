import { Component } from '@angular/core';
import { GateType } from '../../models/circuit.models';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [],
  template: `
    <div class="toolbar">
      <h3>元件库</h3>
      <div class="tool-section">
        <h4>输入/输出</h4>
        <div class="tool-item" draggable="true" (dragstart)="onDragStart($event, 'INPUT')">
          <div class="gate-icon input-icon">
            <div class="switch-body"></div>
            <div class="switch-label">
              </div>
            </div>
          <span>开关输入</span>
        </div>
        <div class="tool-item" draggable="true" (dragstart)="onDragStart($event, 'OUTPUT')">
          <div class="gate-icon output-icon">
            <div class="lamp"></div>
          </div>
          <span>输出灯</span>
        </div>
      </div>

      <div class="tool-section">
        <h4>基本门</h4>
        <div class="tool-item" draggable="true" (dragstart)="onDragStart($event, 'AND')">
          <div class="gate-icon and-gate">
            <svg viewBox="0 0 40 30">
            <path d="M 5 5 L 20 5 Q 35 15 Q 20 25 L 5 25 Z" fill="none" stroke="currentColor" stroke-width="2"/>
          </svg>
          </div>
          <span>AND 门</span>
        </div>
        <div class="tool-item" draggable="true" (dragstart)="onDragStart($event, 'OR')">
          <div class="gate-icon or-gate">
            <svg viewBox="0 0 40 30">
            <path d="M 5 5 Q 15 5 Q 35 15 Q 15 25 Q 5 25 Q 10 15 Q 5 5 Z" fill="none" stroke="currentColor" stroke-width="2"/>
          </svg>
          </div>
          <span>OR 门</span>
        </div>
        <div class="tool-item" draggable="true" (dragstart)="onDragStart($event, 'NOT')">
          <div class="gate-icon not-gate">
            <svg viewBox="0 0 40 30">
            <polygon points="5,5 30,15 5,25" fill="none" stroke="currentColor" stroke-width="2"/>
            <circle cx="33" cy="15" r="2" fill="none" stroke="currentColor" stroke-width="2"/>
          </svg>
          </div>
          <span>NOT 门</span>
        </div>
      </div>

      <div class="tool-section">
        <h4>复合门</h4>
        <div class="tool-item" draggable="true" (dragstart)="onDragStart($event, 'NAND')">
          <div class="gate-icon nand-gate">
            <svg viewBox="0 0 44 30">
            <path d="M 5 5 L 20 5 Q 31 15 Q 20 25 L 5 25 Z" fill="none" stroke="currentColor" stroke-width="2"/>
            <circle cx="35" cy="15" r="2" fill="none" stroke="currentColor" stroke-width="2"/>
          </svg>
          </div>
          <span>NAND 门</span>
        </div>
        <div class="tool-item" draggable="true" (dragstart)="onDragStart($event, 'NOR')">
          <div class="gate-icon nor-gate">
            <svg viewBox="0 0 44 30">
            <path d="M 5 5 Q 15 5 Q 31 15 Q 15 25 Q 5 25 Q 10 15 Q 5 5 Z" fill="none" stroke="currentColor" stroke-width="2"/>
            <circle cx="35" cy="15" r="2" fill="none" stroke="currentColor" stroke-width="2"/>
          </svg>
          </div>
          <span>NOR 门</span>
        </div>
        <div class="tool-item" draggable="true" (dragstart)="onDragStart($event, 'XOR')">
          <div class="gate-icon xor-gate">
            <svg viewBox="0 0 40 30">
            <path d="M 8 5 Q 18 5 Q 35 15 Q 18 25 Q 8 25 Q 13 15 Q 8 5 Z" fill="none" stroke="currentColor" stroke-width="2"/>
            <path d="M 5 5 Q 10 15 Q 5 25" fill="none" stroke="currentColor" stroke-width="2"/>
          </svg>
          </div>
          <span>XOR 门</span>
        </div>
        <div class="tool-item" draggable="true" (dragstart)="onDragStart($event, 'XNOR')">
          <div class="gate-icon xnor-gate">
            <svg viewBox="0 0 44 30">
            <path d="M 8 5 Q 18 5 Q 31 15 Q 18 25 Q 8 25 Q 13 15 Q 8 5 Z" fill="none" stroke="currentColor" stroke-width="2"/>
            <path d="M 5 5 Q 10 15 Q 5 25" fill="none" stroke="currentColor" stroke-width="2"/>
            <circle cx="35" cy="15" r="2" fill="none" stroke="currentColor" stroke-width="2"/>
          </svg>
          </div>
          <span>XNOR 门</span>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
    .toolbar {
      width: 200px;
      background: #f5f5f5;
      border-right: 1px solid #ddd;
      padding: 10px;
      overflow-y: auto;
      height: 100%;
    }

    .toolbar h3 {
      margin: 0 0 10px 0;
      font-size: 16px;
      color: #333;
    }

    .tool-section {
      margin-bottom: 15px;
    }

    .tool-section h4 {
      margin: 10px 0 8px 0;
      font-size: 13px;
      color: #666;
      border-bottom: 1px solid #ddd;
      padding-bottom: 4px;
    }

    .tool-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px;
      cursor: grab;
      border-radius: 4px;
      transition: background 0.2s;
      user-select: none;
    }

    .tool-item:hover {
      background: #e8e8e8;
    }

    .tool-item:active {
      cursor: grabbing;
    }

    .tool-item span {
      font-size: 13px;
      color: #333;
    }

    .gate-icon {
      width: 40px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #333;
    }

    .gate-icon svg {
      width: 100%;
      height: 100%;
    }

    .input-icon, .output-icon {
      position: relative;
    }

    .input-icon .switch-body {
      width: 24px;
      height: 12px;
      background: #ccc;
      border-radius: 6px;
      position: relative;
    }

    .input-icon .switch {
      width: 10px;
      height: 10px;
      background: #fff;
      border-radius: 50%;
      position: absolute;
      top: 50%;
      left: 2px;
      transform: translateY(-50%);
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    }

    .output-icon .lamp {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #ddd;
      border: 2px solid #999;
    }
    `,
  ],
})
export class ToolbarComponent {
  onDragStart(event: DragEvent, type: GateType): void {
    if (event.dataTransfer) {
      event.dataTransfer.setData('gateType', type);
      event.dataTransfer.effectAllowed = 'copy';
    }
  }
}
