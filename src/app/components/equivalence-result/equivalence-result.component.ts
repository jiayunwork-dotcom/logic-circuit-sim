import { Component, Input, Output, EventEmitter, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EquivalenceResult, ComparisonResult } from '../../models/circuit.models';

@Component({
  selector: 'app-equivalence-result',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="equivalence-panel" *ngIf="result">
      <div class="panel-header">
        <h3>🔬 等价验证结果</h3>
        <button class="close-btn" (click)="onClose()">×</button>
      </div>

      <div class="panel-content">
        <div *ngIf="result.warning" class="warning-banner">
          ⚠️ {{ result.warning }}
        </div>

        <div
          class="result-banner"
          [class.equivalent]="result.isEquivalent"
          [class.not-equivalent]="!result.isEquivalent"
        >
          <ng-container *ngIf="result.isEquivalent">
            ✅ 两个电路功能等价
          </ng-container>
          <ng-container *ngIf="!result.isEquivalent">
            ❌ 两个电路功能不等价（{{ result.mismatchedCount }}/{{ result.totalCombinations }} 处不一致）
          </ng-container>
        </div>

        <div class="stats-row">
          <div class="stat-card">
            <div class="stat-value">{{ result.inputCount }}</div>
            <div class="stat-label">输入变量</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ result.totalCombinations }}</div>
            <div class="stat-label">穷举组合</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" [class.danger]="!result.isEquivalent">
              {{ result.mismatchedCount }}
            </div>
            <div class="stat-label">不一致</div>
          </div>
          <div class="stat-card">
            <div class="stat-value success">
              {{ matchingRate }}%
            </div>
            <div class="stat-label">匹配率</div>
          </div>
        </div>

        <div class="table-section">
          <div class="section-header">
            <h4>📋 对比详情
              <span class="diff-filter">
                <label>
                  <input type="checkbox" [(ngModel)]="showOnlyDiff" />
                  仅显示不一致
                </label>
              </span>
            </h4>
            <div class="playback-controls">
              <button
                class="btn-playback"
                (click)="onStartPlayback()"
                *ngIf="!isPlaying && !isPaused"
                [disabled]="filteredResults.length === 0"
              >
                ▶️ 逐行回放
              </button>
              <button
                class="btn-playback btn-pause"
                (click)="onPausePlayback()"
                *ngIf="isPlaying"
              >
                ⏸️ 暂停
              </button>
              <button
                class="btn-playback btn-resume"
                (click)="onResumePlayback()"
                *ngIf="isPaused"
              >
                ▶️ 继续
              </button>
              <button
                class="btn-playback btn-stop"
                (click)="onStopPlayback()"
                *ngIf="isPlaying || isPaused"
              >
                ⏹️ 停止
              </button>
            </div>
          </div>

          <div class="table-container" #tableContainer>
            <table *ngIf="filteredResults.length > 0">
              <thead>
                <tr>
                  <th class="input-header" *ngFor="let input of inputHeaders">
                    {{ input }}
                  </th>
                  <th class="output-header" *ngFor="let output of outputAHeaders">
                    A:{{ output }}
                  </th>
                  <th class="output-header" *ngFor="let output of outputBHeaders">
                    B:{{ output }}
                  </th>
                  <th class="status-header">状态</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  *ngFor="let row of filteredResults; let i = index"
                  [class.different]="row.isDifferent"
                  [class.clickable]="row.isDifferent"
                  [class.current-playback]="currentPlaybackIndex === i"
                  [class.flash-red]="isFlashing && currentPlaybackIndex === i && row.isDifferent"
                  (click)="onRowClick(row, i)"
                >
                  <td class="input-cell" *ngFor="let input of row.inputCombination">
                    {{ input.value }}
                  </td>
                  <td
                    class="output-cell"
                    *ngFor="let output of row.outputA"
                    [class.high]="output.value === 1"
                    [class.diff-value]="row.isDifferent"
                  >
                    {{ output.value }}
                  </td>
                  <td
                    class="output-cell"
                    *ngFor="let output of row.outputB"
                    [class.high]="output.value === 1"
                    [class.diff-value]="row.isDifferent"
                  >
                    {{ output.value }}
                  </td>
                  <td class="status-cell">
                    <span *ngIf="row.isDifferent" class="diff-badge">❌ 不一致</span>
                    <span *ngIf="!row.isDifferent" class="match-badge">✅</span>
                  </td>
                </tr>
              </tbody>
            </table>
            <div *ngIf="filteredResults.length === 0" class="empty-table">
              没有不一致的组合
            </div>
          </div>
        </div>

        <div class="panel-actions">
          <button class="btn btn-primary" (click)="onExportReport()">
            📄 导出 HTML 报告
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
    .equivalence-panel {
      background: #fff;
      border-left: 1px solid #ddd;
      width: 500px;
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid #eee;
      background: #f5f5f5;
    }

    .panel-header h3 {
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
      padding: 0 8px;
      line-height: 1;
    }

    .panel-content {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }

    .warning-banner {
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      color: #856404;
      padding: 10px 14px;
      border-radius: 6px;
      margin-bottom: 12px;
      font-size: 13px;
    }

    .result-banner {
      padding: 16px;
      border-radius: 8px;
      text-align: center;
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 16px;
    }

    .result-banner.equivalent {
      background: #e8f5e9;
      color: #2e7d32;
      border: 2px solid #a5d6a7;
    }

    .result-banner.not-equivalent {
      background: #ffebee;
      color: #c62828;
      border: 2px solid #ef9a9a;
    }

    .stats-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 16px;
    }

    .stat-card {
      background: #f9f9f9;
      border-radius: 6px;
      padding: 10px 8px;
      text-align: center;
    }

    .stat-value {
      font-size: 20px;
      font-weight: bold;
      color: #1976D2;
    }

    .stat-value.danger {
      color: #f44336;
    }

    .stat-value.success {
      color: #4CAF50;
    }

    .stat-label {
      font-size: 11px;
      color: #666;
      margin-top: 2px;
    }

    .table-section {
      background: #f9f9f9;
      border-radius: 8px;
      padding: 12px;
    }

    .section-header {
      margin-bottom: 10px;
    }

    .section-header h4 {
      margin: 0;
      font-size: 14px;
      color: #333;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }

    .playback-controls {
      display: flex;
      gap: 6px;
      margin-top: 8px;
    }

    .btn-playback {
      padding: 6px 12px;
      font-size: 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: #fff;
      cursor: pointer;
      color: #333;
      transition: all 0.2s;
    }

    .btn-playback:hover:not(:disabled) {
      background: #f0f0f0;
    }

    .btn-playback:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-playback.btn-pause {
      background: #FFF3E0;
      border-color: #FFB74D;
      color: #E65100;
    }

    .btn-playback.btn-resume {
      background: #E8F5E9;
      border-color: #81C784;
      color: #2E7D32;
    }

    .btn-playback.btn-stop {
      background: #FFEBEE;
      border-color: #E57373;
      color: #C62828;
    }

    .diff-filter {
      font-size: 12px;
      font-weight: normal;
      color: #666;
    }

    .diff-filter input {
      margin-right: 4px;
    }

    .table-container {
      max-height: 350px;
      overflow-y: auto;
      background: #fff;
      border-radius: 4px;
      border: 1px solid #e0e0e0;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }

    th {
      background: #f0f0f0;
      padding: 8px 6px;
      text-align: center;
      font-weight: 600;
      position: sticky;
      top: 0;
      border-bottom: 1px solid #ddd;
      font-size: 11px;
    }

    th.input-header {
      background: #e3f2fd;
    }

    th.output-header {
      background: #fce4ec;
    }

    td {
      padding: 6px;
      text-align: center;
      border-bottom: 1px solid #f0f0f0;
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

    .output-cell.diff-value {
      background: #ffebee;
      color: #f44336;
      font-weight: bold;
    }

    tr.different {
      background: #ffebee;
    }

    tr.clickable {
      cursor: pointer;
    }

    tr.clickable:hover {
      background: #ffcdd2;
    }

    tr.current-playback {
      background: #FFF9C4 !important;
      border-left: 3px solid #FF9800;
    }

    tr.flash-red td {
      background: #f44336 !important;
      color: #fff !important;
      animation: flash-border 0.5s ease-in-out infinite alternate;
    }

    @keyframes flash-border {
      0% {
        box-shadow: inset 0 0 0 2px #f44336;
      }
      100% {
        box-shadow: inset 0 0 0 4px #b71c1c;
      }
    }

    tr.different td {
      background: inherit;
    }

    .status-cell {
      font-size: 11px;
    }

    .diff-badge {
      color: #f44336;
      font-weight: bold;
    }

    .match-badge {
      color: #4CAF50;
    }

    .empty-table {
      padding: 24px;
      text-align: center;
      color: #999;
      font-size: 13px;
    }

    .panel-actions {
      margin-top: 16px;
      display: flex;
      justify-content: center;
    }

    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s;
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
export class EquivalenceResultComponent implements OnInit, OnDestroy {
  @Input() result: EquivalenceResult | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() rowClick = new EventEmitter<ComparisonResult>();
  @Output() exportReport = new EventEmitter<void>();
  @Output() playbackRowChange = new EventEmitter<{ row: ComparisonResult; index: number }>();
  @Output() playbackStop = new EventEmitter<void>();

  @ViewChild('tableContainer') tableContainer!: ElementRef;

  showOnlyDiff = false;
  inputHeaders: string[] = [];
  outputAHeaders: string[] = [];
  outputBHeaders: string[] = [];

  isPlaying = false;
  isPaused = false;
  currentPlaybackIndex = -1;
  isFlashing = false;

  private playbackTimer: any = null;
  private flashTimer: any = null;

  ngOnInit(): void {
    if (this.result && this.result.results.length > 0) {
      const firstRow = this.result.results[0];
      this.inputHeaders = firstRow.inputCombination.map((i) => i.name);
      this.outputAHeaders = firstRow.outputA.map((o) => o.name);
      this.outputBHeaders = firstRow.outputB.map((o) => o.name);
    }
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  private clearTimers(): void {
    if (this.playbackTimer) {
      clearTimeout(this.playbackTimer);
      this.playbackTimer = null;
    }
    if (this.flashTimer) {
      clearInterval(this.flashTimer);
      this.flashTimer = null;
    }
  }

  get filteredResults(): ComparisonResult[] {
    if (!this.result) return [];
    if (this.showOnlyDiff) {
      return this.result.results.filter((r) => r.isDifferent);
    }
    return this.result.results;
  }

  get matchingRate(): string {
    if (!this.result || this.result.totalCombinations === 0) return '0';
    const matched = this.result.totalCombinations - this.result.mismatchedCount;
    return ((matched / this.result.totalCombinations) * 100).toFixed(1);
  }

  onRowClick(row: ComparisonResult, index?: number): void {
    if (row.isDifferent) {
      this.rowClick.emit(row);
    }
  }

  onStartPlayback(): void {
    if (this.filteredResults.length === 0) return;
    this.isPlaying = true;
    this.isPaused = false;
    this.currentPlaybackIndex = -1;
    this.showOnlyDiff = false;
    this.playNextRow();
  }

  onPausePlayback(): void {
    this.isPlaying = false;
    this.isPaused = true;
    this.clearTimers();
  }

  onResumePlayback(): void {
    this.isPlaying = true;
    this.isPaused = false;
    this.playNextRow();
  }

  onStopPlayback(): void {
    this.isPlaying = false;
    this.isPaused = false;
    this.currentPlaybackIndex = -1;
    this.isFlashing = false;
    this.clearTimers();
    this.playbackStop.emit();
  }

  private playNextRow(): void {
    if (!this.isPlaying) return;

    const nextIndex = this.currentPlaybackIndex + 1;
    if (nextIndex >= this.filteredResults.length) {
      this.isPlaying = false;
      this.isPaused = false;
      return;
    }

    this.currentPlaybackIndex = nextIndex;
    const row = this.filteredResults[nextIndex];
    this.playbackRowChange.emit({ row, index: nextIndex });
    this.scrollToCurrentRow();

    if (row.isDifferent) {
      this.startFlashing();
      this.playbackTimer = setTimeout(() => {
        this.stopFlashing();
        this.playNextRow();
      }, 3000);
    } else {
      this.playbackTimer = setTimeout(() => {
        this.playNextRow();
      }, 1500);
    }
  }

  private startFlashing(): void {
    this.isFlashing = true;
    let flashCount = 0;
    this.flashTimer = setInterval(() => {
      this.isFlashing = !this.isFlashing;
      flashCount++;
      if (flashCount >= 6) {
        this.stopFlashing();
      }
    }, 500);
  }

  private stopFlashing(): void {
    if (this.flashTimer) {
      clearInterval(this.flashTimer);
      this.flashTimer = null;
    }
    this.isFlashing = false;
  }

  private scrollToCurrentRow(): void {
    if (!this.tableContainer) return;
    const container = this.tableContainer.nativeElement;
    const rows = container.querySelectorAll('tbody tr');
    const currentRow = rows[this.currentPlaybackIndex];
    if (currentRow) {
      currentRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  onExportReport(): void {
    this.exportReport.emit();
  }

  onClose(): void {
    this.close.emit();
  }
}
