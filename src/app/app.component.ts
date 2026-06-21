import { Component, ViewChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolbarComponent } from './components/toolbar/toolbar.component';
import { CanvasComponent } from './components/canvas/canvas.component';
import { TruthTableComponent } from './components/truth-table/truth-table.component';
import { KarnaughComponent } from './components/karnaugh/karnaugh.component';
import { LevelPanelComponent } from './components/level-panel/level-panel.component';
import { CircuitService } from './services/circuit.service';
import { HistoryService } from './services/history.service';
import { TruthTableService } from './services/truth-table.service';
import { StorageService } from './services/storage.service';
import { BooleanExpressionService } from './services/boolean-expression.service';
import { LevelService } from './services/level.service';
import { TruthTableRow, Level, CircuitNode } from './models/circuit.models';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    ToolbarComponent,
    CanvasComponent,
    TruthTableComponent,
    KarnaughComponent,
    LevelPanelComponent,
  ],
  providers: [
    CircuitService,
    HistoryService,
    TruthTableService,
    StorageService,
    BooleanExpressionService,
    LevelService,
  ],
  template: `
    <div class="app-container">
      <header class="app-header">
        <div class="header-left">
          <h1>数字逻辑电路模拟器</h1>
          <span class="subtitle">计算机组成原理教学工具</span>
        </div>
        <div class="header-actions">
          <button class="btn" (click)="onUndo()" [disabled]="!canUndo">↶ 撤销</button>
          <button class="btn" (click)="onRedo()" [disabled]="!canRedo">↷ 重做</button>
          <button class="btn" (click)="onClear()">🗑 清空</button>
          <div class="divider"></div>
          <button class="btn btn-primary" (click)="onGenerateTruthTable()">📊 真值表</button>
          <button class="btn" (click)="onToggleKMap()" [class.disabled]="!canShowKMap">🎯 卡诺图</button>
          <button class="btn" (click)="showExpressions = !showExpressions" [class.active]="showExpressions">📝 表达式</button>
          <div class="divider"></div>
          <button class="btn" (click)="onSaveLocal()">💾 保存</button>
          <button class="btn" (click)="onLoadLocal()">📂 加载</button>
          <button class="btn" (click)="onExportJSON()">⬇ 导出</button>
          <button class="btn" (click)="onImportJSON()">⬆ 导入</button>
          <div class="divider"></div>
          <button class="btn btn-accent" (click)="showLevelPanel = !showLevelPanel">
            🎮 关卡
          </button>
        </div>
      </header>

      <div class="app-body">
        <app-toolbar></app-toolbar>
        <app-canvas [showExpressions]="showExpressions"></app-canvas>

        <app-truth-table
          *ngIf="showTruthTable"
          [rows]="truthTableRows"
          [highlightRows]="highlightRows"
          (close)="showTruthTable = false"
          (exportCSV)="onExportCSV()"
        ></app-truth-table>

        <app-karnaugh
          *ngIf="showKMap"
          [showKMap]="showKMap"
          [truthTable]="truthTableRows"
          [outputIndex]="0"
          [disabled]="!canShowKMap"
        ></app-karnaugh>

        <app-level-panel
          *ngIf="showLevelPanel"
          (close)="showLevelPanel = false"
          (startLevel)="onStartLevel($event)"
          (verifyLevel)="onVerifyLevel($event)"
        ></app-level-panel>
      </div>

      <div *ngIf="hasFeedbackLoop" class="feedback-warning">
        ⚠️ 检测到反馈环路，组合电路不允许环路
      </div>

      <input type="file" #fileInput accept=".json" style="display: none" (change)="onFileSelected($event)">

      <div *ngIf="showInfo" class="info-panel">
        <h3>使用说明</h3>
        <ul>
          <li>从左侧工具栏拖拽元件到画布</li>
          <li>点击输入开关切换 0/1</li>
          <li>从输出端口拖拽到输入端口连线</li>
          <li>滚轮缩放，按住空白处拖拽平移</li>
          <li>选中元件后按 Delete 删除</li>
          <li>Ctrl+Z 撤销，Ctrl+Y 重做</li>
          <li>选择输入输出后点击"真值表"生成</li>
        </ul>
        <button class="btn" (click)="showInfo = false">关闭</button>
      </div>
    </div>
  `,
  styles: [
    `
    .app-container {
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .app-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 20px;
      background: #1976D2;
      color: #fff;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .header-left h1 {
      margin: 0;
      font-size: 20px;
    }

    .header-left .subtitle {
      font-size: 12px;
      opacity: 0.8;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .btn {
      padding: 8px 14px;
      border: 1px solid rgba(255,255,255,0.3);
      border-radius: 4px;
      background: rgba(255,255,255,0.15);
      color: #fff;
      cursor: pointer;
      font-size: 13px;
      transition: background 0.2s;
    }

    .btn:hover:not(:disabled) {
      background: rgba(255,255,255,0.25);
    }

    .btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .btn-primary {
      background: #4CAF50;
      border-color: #388E3C;
    }

    .btn-primary:hover {
      background: #388E3C;
    }

    .btn-accent {
      background: #FF9800;
      border-color: #F57C00;
    }

    .btn-accent:hover {
      background: #F57C00;
    }

    .btn.active {
      background: #9C27B0;
      border-color: #7B1FA2;
    }

    .btn.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .divider {
      width: 1px;
      height: 24px;
      background: rgba(255,255,255,0.3);
      margin: 0 4px;
    }

    .app-body {
      flex: 1;
      display: flex;
      overflow: hidden;
    }

    .feedback-warning {
      position: fixed;
      top: 70px;
      left: 50%;
      transform: translateX(-50%);
      background: #f44336;
      color: #fff;
      padding: 10px 20px;
      border-radius: 4px;
      font-size: 14px;
      z-index: 1000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }

    .info-panel {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #fff;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      max-width: 300px;
      z-index: 100;
    }

    .info-panel h3 {
      margin: 0 0 10px 0;
      font-size: 16px;
      color: #333;
    }

    .info-panel ul {
      margin: 0 0 12px 0;
      padding-left: 20px;
      font-size: 13px;
      color: #555;
      line-height: 1.8;
    }

    .info-panel .btn {
      width: 100%;
      background: #f0f0f0;
      color: #333;
      border: 1px solid #ddd;
    }
    `,
  ],
})
export class AppComponent implements OnInit {
  @ViewChild('fileInput') fileInput: any;
  @ViewChild(LevelPanelComponent) levelPanel!: LevelPanelComponent;

  showTruthTable = false;
  showKMap = false;
  showLevelPanel = false;
  showInfo = true;
  truthTableRows: TruthTableRow[] = [];
  highlightRows: number[] = [];
  canUndo = false;
  canRedo = false;
  hasFeedbackLoop = false;
  canShowKMap = false;
  showExpressions = true;

  private selectedInputIds: string[] = [];
  private selectedOutputIds: string[] = [];

  constructor(
    private circuitService: CircuitService,
    private historyService: HistoryService,
    private truthTableService: TruthTableService,
    private storageService: StorageService,
    private booleanExpressionService: BooleanExpressionService,
    private levelService: LevelService
  ) {}

  ngOnInit(): void {
    this.circuitService.state$.subscribe((state) => {
      this.hasFeedbackLoop = state.hasFeedbackLoop;

      const inputNodes = state.nodes.filter((n) => n.type === 'INPUT');
      const outputNodes = state.nodes.filter((n) => n.type === 'OUTPUT');

      this.selectedInputIds = inputNodes.map((n) => n.id);
      this.selectedOutputIds = outputNodes.map((n) => n.id);

      this.canShowKMap = inputNodes.length >= 2 && inputNodes.length <= 4;
    });

    this.updateHistoryButtons();
    this.historyService.reset();
    this.updateHistoryButtons();
  }

  updateHistoryButtons(): void {
    this.canUndo = this.historyService.canUndo();
    this.canRedo = this.historyService.canRedo();
  }

  onUndo(): void {
    this.historyService.undo();
    this.updateHistoryButtons();
  }

  onRedo(): void {
    this.historyService.redo();
    this.updateHistoryButtons();
  }

  onClear(): void {
    if (confirm('确定要清空所有元件吗？')) {
      this.circuitService.clearAll();
      this.historyService.reset();
      this.showTruthTable = false;
      this.showKMap = false;
    }
  }

  onGenerateTruthTable(): void {
    if (this.selectedInputIds.length === 0) {
      alert('请先放置至少一个输入开关');
      return;
    }
    if (this.selectedOutputIds.length === 0) {
      alert('请先放置至少一个输出灯');
      return;
    }

    const table = this.truthTableService.generateTruthTable(
      this.selectedInputIds,
      this.selectedOutputIds
    );

    if (table) {
      this.truthTableRows = table;
      this.showTruthTable = true;
      this.showKMap = false;
    } else {
      alert('无法生成真值表，请检查电路是否有反馈环路');
    }
  }

  onToggleKMap(): void {
    if (!this.canShowKMap) {
      alert('卡诺图仅支持 2 到 4 个输入变量');
      return;
    }

    if (this.truthTableRows.length === 0) {
      this.onGenerateTruthTable();
    }

    if (this.truthTableRows.length > 0) {
      this.showKMap = !this.showKMap;
    }
  }

  onExportCSV(): void {
    if (this.truthTableRows.length > 0) {
      this.truthTableService.downloadCSV(this.truthTableRows);
    }
  }

  onSaveLocal(): void {
    this.storageService.saveToLocalStorage();
    alert('电路已保存到本地');
  }

  onLoadLocal(): void {
    if (this.storageService.hasSavedCircuit()) {
      if (confirm('加载将覆盖当前电路，确定继续吗？')) {
        this.storageService.loadFromLocalStorage();
        this.historyService.reset();
      }
    } else {
      alert('没有找到保存的电路');
    }
  }

  onExportJSON(): void {
    this.storageService.downloadJSON();
  }

  onImportJSON(): void {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.storageService.importFromFile(file).then((success) => {
        if (success) {
          this.historyService.reset();
        } else {
          alert('文件格式错误，无法加载');
        }
      });
    }
    input.value = '';
  }

  onStartLevel(level: Level): void {
    this.circuitService.clearAll();

    const startX = 100;
    const startY = 100;

    level.inputNames.forEach((name, index) => {
      const node = this.circuitService.createNode(
        'INPUT',
        startX,
        startY + index * 80,
        name
      );
      this.circuitService.addNode(node);
    });

    const outputStartY = startY + Math.max(0, (level.inputNames.length - level.outputNames.length) * 40);
    level.outputNames.forEach((name, index) => {
      const node = this.circuitService.createNode(
        'OUTPUT',
        startX + 400,
        outputStartY + index * 80,
        name
      );
      this.circuitService.addNode(node);
    });

    this.historyService.reset();
    this.showTruthTable = false;
    this.showKMap = false;
    alert(`关卡已加载：${level.name}\n请搭建电路并点击"验证电路"按钮`);
  }

  onVerifyLevel(level: Level): void {
    const inputNodes = this.circuitService.state.nodes.filter((n) => n.type === 'INPUT');
    const outputNodes = this.circuitService.state.nodes.filter((n) => n.type === 'OUTPUT');

    if (inputNodes.length === 0 || outputNodes.length === 0) {
      alert('请确保电路中有输入和输出');
      return;
    }

    const studentTable = this.truthTableService.generateTruthTable(
      inputNodes.map((n) => n.id),
      outputNodes.map((n) => n.id)
    );

    if (!studentTable) {
      alert('无法生成真值表，请检查电路');
      return;
    }

    const result = this.levelService.verifyLevel(level, studentTable);

    if (this.levelPanel) {
      this.levelPanel.setVerificationResult(result.passed);
    }

    this.truthTableRows = studentTable;
    this.highlightRows = result.mismatchedRows;
    this.showTruthTable = true;
  }
}
