import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KarnaughService, KMapCell, KMapGroup } from '../../services/karnaugh.service';
import { TruthTableRow } from '../../models/circuit.models';

@Component({
  selector: 'app-karnaugh',
  standalone: true,
  imports: [CommonModule],
  providers: [KarnaughService],
  template: `
    <div class="karnaugh-panel" *ngIf="showKMap">
      <div class="panel-header">
        <h3>卡诺图</h3>
        <button class="btn" (click)="onClose()">关闭</button>
      </div>

      <div class="kmap-content" *ngIf="kmapData">
        <div class="kmap-container">
          <div class="col-labels">
            <div class="corner-cell"></div>
            <div
              *ngFor="let col of kmapData.cells[0]"
              class="col-label"
            >
              {{ col.colLabel }}
            </div>
          </div>

          <div class="kmap-rows">
            <div
              *ngFor="let row of kmapData.cells; let rowIdx = index"
              class="kmap-row"
            >
              <div class="row-label">{{ row[0].rowLabel }}</div>
              <div
                *ngFor="let cell of row; let colIdx = index"
                class="kmap-cell"
                [class.high]="cell.value === 1"
                [class.grouped]="isCellGrouped(rowIdx, colIdx)"
                [style.background]="getCellBackground(rowIdx, colIdx)"
              >
                {{ cell.value }}
              </div>
            </div>
          </div>

          <div class="var-labels">
            <span class="row-vars">行: {{ kmapData.rowVars.join(', ') }}</span>
            <span class="col-vars">列: {{ kmapData.colVars.join(', ') }}</span>
          </div>
        </div>

        <div class="groups-section" *ngIf="groups.length > 0">
          <h4>质蕴含项</h4>
          <div class="group-list">
            <div
              *ngFor="let group of groups; let i = index"
              class="group-item"
            >
              <span
                class="group-color"
                [style.background]="group.color"
              ></span>
              <span class="group-expr">
                {{ group.expression || '1' }}
              </span>
              <span class="group-size">({{ group.cells.length }} 格)</span>
            </div>
          </div>
        </div>

        <div class="result-section">
          <h4>最简表达式</h4>
          <p class="minimal-expr">{{ minimalExpression }}</p>
        </div>
      </div>

      <div *ngIf="!kmapData && !disabled" class="empty-state">
        <p>请先生成真值表</p>
      </div>

      <div *ngIf="disabled" class="disabled-state">
        <p>卡诺图仅支持 2 到 4 个输入变量</p>
      </div>
    </div>
  `,
  styles: [
    `
    .karnaugh-panel {
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

    .btn {
      padding: 6px 12px;
      border: 1px solid #ccc;
      border-radius: 4px;
      background: #f5f5f5;
      cursor: pointer;
      font-size: 12px;
    }

    .kmap-content {
      padding: 16px;
      flex: 1;
      overflow-y: auto;
    }

    .kmap-container {
      background: #f5f5f5;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 16px;
    }

    .col-labels {
      display: flex;
      margin-left: 60px;
    }

    .corner-cell {
      width: 50px;
    }

    .col-label {
      width: 50px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      color: #666;
      font-family: monospace;
    }

    .kmap-rows {
      display: flex;
      flex-direction: column;
    }

    .kmap-row {
      display: flex;
      align-items: center;
    }

    .row-label {
      width: 50px;
      height: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      color: #666;
      font-family: monospace;
    }

    .kmap-cell {
      width: 50px;
      height: 50px;
      border: 2px solid #ccc;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: bold;
      background: #fff;
      margin: 1px;
      border-radius: 4px;
    }

    .kmap-cell.high {
      color: #4CAF50;
      background: #e8f5e9;
    }

    .kmap-cell.grouped {
      border-color: #2196F3;
    }

    .var-labels {
      display: flex;
      justify-content: space-between;
      margin-top: 8px;
      font-size: 12px;
      color: #666;
    }

    .groups-section {
      margin-bottom: 16px;
    }

    .groups-section h4 {
      margin: 0 0 8px 0;
      font-size: 14px;
      color: #333;
    }

    .group-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .group-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      background: #f5f5f5;
      border-radius: 4px;
    }

    .group-color {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }

    .group-expr {
      flex: 1;
      font-family: monospace;
      font-size: 14px;
    }

    .group-size {
      font-size: 12px;
      color: #888;
    }

    .result-section h4 {
      margin: 0 0 8px 0;
      font-size: 14px;
      color: #333;
    }

    .minimal-expr {
      font-family: monospace;
      font-size: 16px;
      padding: 12px;
      background: #e3f2fd;
      border-radius: 6px;
      margin: 0;
    }

    .empty-state, .disabled-state {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 200px;
      color: #888;
    }
    `,
  ],
})
export class KarnaughComponent implements OnChanges {
  @Input() showKMap = false;
  @Input() truthTable: TruthTableRow[] = [];
  @Input() outputIndex = 0;
  @Input() disabled = false;

  kmapData: { cells: KMapCell[][]; rowVars: string[]; colVars: string[]; rowCount: number; colCount: number } | null = null;
  groups: KMapGroup[] = [];
  minimalExpression = '';

  constructor(private karnaughService: KarnaughService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['truthTable'] || changes['showKMap'] || changes['outputIndex']) && this.truthTable.length > 0 && this.showKMap) {
      this.generateKMap();
    }
  }

  generateKMap(): void {
    if (this.truthTable.length === 0) return;

    const inputNames = this.truthTable[0].inputs.map((i) => i.name);
    const varCount = inputNames.length;

    if (varCount < 2 || varCount > 4) {
      this.kmapData = null;
      this.groups = [];
      this.minimalExpression = '';
      return;
    }

    this.kmapData = this.karnaughService.generateKMap(inputNames, this.truthTable, this.outputIndex);

    if (this.kmapData) {
      this.groups = this.karnaughService.findPrimeImplicants(this.kmapData, inputNames);
      this.minimalExpression = this.karnaughService.getMinimalExpression(this.groups);
    }
  }

  isCellGrouped(row: number, col: number): boolean {
    return this.groups.some((g) =>
      g.cells.some((c) => c.row === row && c.col === col)
    );
  }

  getCellBackground(row: number, col: number): string {
    const groupsWithCell = this.groups.filter((g) =>
      g.cells.some((c) => c.row === row && c.col === col)
    );

    if (groupsWithCell.length === 0) return '';
    if (groupsWithCell.length === 1) return groupsWithCell[0].color + '30';

    return 'repeating-linear-gradient(45deg, ' +
      groupsWithCell.map((g, i) => `${g.color}40, ${g.color}40 5px`).join(', ') + ')';
  }

  onClose(): void {
    this.showKMap = false;
  }
}
