import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TruthTableRow } from '../../models/circuit.models';

@Component({
  selector: 'app-truth-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="truth-table-panel" *ngIf="rows.length > 0">
      <div class="panel-header">
        <h3>真值表</h3>
        <div class="panel-actions">
          <button class="btn btn-primary" (click)="onExportCSV()">导出 CSV</button>
          <button class="btn" (click)="onClose()">关闭</button>
        </div>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th *ngFor="let input of rows[0].inputs" class="input-col">
                {{ input.name }}
              </th>
              <th *ngFor="let output of rows[0].outputs" class="output-col">
                {{ output.name }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of rows; let i = index" [class.highlight]="highlightRows.includes(i)">
              <td *ngFor="let input of row.inputs" class="input-cell">
                {{ input.value }}
              </td>
              <td *ngFor="let output of row.outputs" class="output-cell" [class.high]="output.value === 1">
                {{ output.value }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="table-info">
        <span>共 {{ rows.length }} 行</span>
        <span *ngIf="rows.length > 256" class="warning">输入变量过多，真值表行数超过256行</span>
      </div>
    </div>
  `,
  styles: [
    `
    .truth-table-panel {
      background: #fff;
      border-left: 1px solid #ddd;
      width: 400px;
      display: flex;
      flex-direction: column;
    }

    .panel-header {
      padding: 12px 16px;
      border-bottom: 1px solid #ddd;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .panel-header h3 {
      margin: 0;
      font-size: 16px;
      color: #333;
    }

    .panel-actions {
      display: flex;
      gap: 8px;
    }

    .btn {
      padding: 6px 12px;
      border: 1px solid #ccc;
      border-radius: 4px;
      background: #f5f5f5;
      cursor: pointer;
      font-size: 12px;
    }

    .btn:hover {
      background: #e8e8e8;
    }

    .btn-primary {
      background: #2196F3;
      color: #fff;
      border-color: #1976D2;
    }

    .btn-primary:hover {
      background: #1976D2;
    }

    .table-container {
      flex: 1;
      overflow: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th, td {
      padding: 8px 12px;
      text-align: center;
      border-bottom: 1px solid #eee;
    }

    th {
      background: #f5f5f5;
      font-weight: 600;
      color: #333;
      position: sticky;
      top: 0;
    }

    .input-col {
      background: #e3f2fd;
    }

    .output-col {
      background: #fce4ec;
    }

    .input-cell {
      background: #f5faff;
    }

    .output-cell {
      background: #fff5f8;
    }

    .output-cell.high {
      color: #4CAF50;
      font-weight: bold;
    }

    tr.highlight {
      background: #fff9c4;
    }

    tr.highlight td {
      background: #fff9c4;
    }

    tr:hover td {
      background: #f0f0f0;
    }

    .table-info {
      padding: 8px 16px;
      border-top: 1px solid #ddd;
      font-size: 12px;
      color: #666;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .warning {
      color: #f44336;
    }
    `,
  ],
})
export class TruthTableComponent {
  @Input() rows: TruthTableRow[] = [];
  @Input() highlightRows: number[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() exportCSV = new EventEmitter<void>();

  onExportCSV(): void {
    this.exportCSV.emit();
  }

  onClose(): void {
    this.close.emit();
  }
}
