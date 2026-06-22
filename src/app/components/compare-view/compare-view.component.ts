import { Component, Input, OnChanges, SimpleChanges, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CircuitSnapshot, CircuitNode, Wire, ComparisonResult, EquivalenceResult } from '../../models/circuit.models';
import { SnapshotService } from '../../services/snapshot.service';
import { EquivalenceService } from '../../services/equivalence.service';
import { BooleanExpressionService } from '../../services/boolean-expression.service';
import { ReadonlyCanvasComponent } from '../readonly-canvas/readonly-canvas.component';
import { EquivalenceResultComponent } from '../equivalence-result/equivalence-result.component';

@Component({
  selector: 'app-compare-view',
  standalone: true,
  imports: [CommonModule, FormsModule, ReadonlyCanvasComponent, EquivalenceResultComponent],
  template: `
    <div class="compare-container" *ngIf="initialized">
      <div class="compare-header">
        <div class="header-title">
          <h2>⚖️ 电路对比模式</h2>
          <div class="circuit-labels">
            <span class="label-a">电路 A: {{ snapshotA?.name }}</span>
            <span class="vs">VS</span>
            <span class="label-b">电路 B: {{ snapshotB?.name }}</span>
          </div>
        </div>
        <div class="header-actions">
          <button class="btn btn-primary" (click)="onVerifyEquivalence()">
            🔬 验证等价性
          </button>
          <button class="btn" (click)="onExit()">
            ✕ 退出对比
          </button>
        </div>
      </div>

      <div class="input-controls" *ngIf="sharedInputs.length > 0">
        <span class="controls-label">共享输入：</span>
        <div class="input-switches">
          <div
            *ngFor="let input of sharedInputs; let i = index"
            class="input-switch"
            (click)="toggleInput(i)"
          >
            <div
              class="switch-body"
              [class.on]="currentInputValues[i] === 1"
            >
              <div class="switch-thumb"></div>
            </div>
            <span class="switch-label">{{ input }}</span>
            <span class="switch-value">{{ currentInputValues[i] }}</span>
          </div>
        </div>
      </div>

      <div class="compare-body">
        <div class="canvas-wrapper">
          <div class="canvas-title-a">
            <span>📘 电路 A：{{ snapshotA?.name }}</span>
          </div>
          <div class="canvas-area">
            <app-readonly-canvas
              [nodes]="displayNodesA"
              [wires]="displayWiresA"
              [highlightedNodeIds]="highlightedA"
              [isThumbnail]="false"
            ></app-readonly-canvas>
          </div>
          <div class="expression-panel">
            <div class="expression-label">📝 布尔表达式 (A)</div>
            <div class="expression-content" [innerHTML]="expressionA"></div>
          </div>
        </div>

        <div class="canvas-wrapper">
          <div class="canvas-title-b">
            <span>📗 电路 B：{{ snapshotB?.name }}</span>
          </div>
          <div class="canvas-area">
            <app-readonly-canvas
              [nodes]="displayNodesB"
              [wires]="displayWiresB"
              [highlightedNodeIds]="highlightedB"
              [isThumbnail]="false"
            ></app-readonly-canvas>
          </div>
          <div class="expression-panel">
            <div class="expression-label">📝 布尔表达式 (B)</div>
            <div class="expression-content" [innerHTML]="expressionB"></div>
          </div>
        </div>

        <app-equivalence-result
          *ngIf="showResult && equivalenceResult"
          [result]="equivalenceResult"
          (close)="showResult = false"
          (rowClick)="onResultRowClick($event)"
          (playbackRowChange)="onPlaybackRowChange($event)"
          (playbackStop)="onPlaybackStop()"
          (exportReport)="onExportReport()"
        ></app-equivalence-result>
      </div>

      <div *ngIf="verifying" class="verifying-overlay">
        <div class="verifying-content">
          <div class="spinner"></div>
          <p>正在穷举验证 {{ totalCombinations }} 种组合...</p>
        </div>
      </div>
    </div>

    <div class="compare-container" *ngIf="!initialized">
      <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#666;">
        <p>正在加载对比数据...</p>
      </div>
    </div>
  `,
  styles: [
    `
    .compare-container {
      display: flex;
      flex-direction: column;
      height: 100vh;
      width: 100vw;
      background: #f0f0f0;
      position: fixed;
      top: 0;
      left: 0;
      z-index: 500;
    }

    .compare-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 20px;
      background: linear-gradient(135deg, #5C6BC0, #3949AB);
      color: #fff;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }

    .header-title h2 {
      margin: 0 0 6px 0;
      font-size: 18px;
    }

    .circuit-labels {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 13px;
      opacity: 0.9;
    }

    .label-a {
      background: rgba(33, 150, 243, 0.3);
      padding: 2px 10px;
      border-radius: 4px;
    }

    .label-b {
      background: rgba(76, 175, 80, 0.3);
      padding: 2px 10px;
      border-radius: 4px;
    }

    .vs {
      font-weight: bold;
      font-size: 14px;
    }

    .header-actions {
      display: flex;
      gap: 8px;
    }

    .btn {
      padding: 8px 16px;
      border: 1px solid rgba(255,255,255,0.3);
      border-radius: 6px;
      background: rgba(255,255,255,0.15);
      color: #fff;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.2s;
    }

    .btn:hover {
      background: rgba(255,255,255,0.25);
    }

    .btn-primary {
      background: #FF9800;
      border-color: #F57C00;
      font-weight: 500;
    }

    .btn-primary:hover {
      background: #F57C00;
    }

    .input-controls {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 10px 20px;
      background: #fff;
      border-bottom: 1px solid #ddd;
      flex-shrink: 0;
    }

    .controls-label {
      font-size: 13px;
      font-weight: 600;
      color: #333;
    }

    .input-switches {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }

    .input-switch {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 12px;
      border-radius: 20px;
      background: #f5f5f5;
      cursor: pointer;
      transition: all 0.2s;
      border: 1px solid #e0e0e0;
    }

    .input-switch:hover {
      background: #eee;
    }

    .switch-body {
      width: 36px;
      height: 20px;
      background: #ccc;
      border-radius: 10px;
      position: relative;
      transition: background 0.2s;
    }

    .switch-body.on {
      background: #4CAF50;
    }

    .switch-thumb {
      width: 16px;
      height: 16px;
      background: #fff;
      border-radius: 50%;
      position: absolute;
      top: 2px;
      left: 2px;
      transition: left 0.2s;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }

    .switch-body.on .switch-thumb {
      left: 18px;
    }

    .switch-label {
      font-size: 12px;
      font-weight: 600;
      color: #333;
    }

    .switch-value {
      font-size: 12px;
      font-weight: bold;
      color: #666;
      min-width: 12px;
      text-align: center;
    }

    .compare-body {
      flex: 1;
      display: flex;
      overflow: hidden;
      min-height: 0;
    }

    .canvas-wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      border-right: 2px solid #ccc;
    }

    .canvas-wrapper:last-of-type {
      border-right: none;
    }

    .canvas-title-a,
    .canvas-title-b {
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      flex-shrink: 0;
    }

    .canvas-title-a {
      background: #E3F2FD;
      color: #1565C0;
      border-bottom: 2px solid #1976D2;
    }

    .canvas-title-b {
      background: #E8F5E9;
      color: #2E7D32;
      border-bottom: 2px solid #4CAF50;
    }

    .canvas-area {
      flex: 1;
      overflow: hidden;
      background: #fafafa;
      min-height: 0;
    }

    .expression-panel {
      flex-shrink: 0;
      padding: 12px 16px;
      background: #fff;
      border-top: 1px solid #ddd;
    }

    .expression-label {
      font-size: 12px;
      font-weight: 600;
      color: #666;
      margin-bottom: 6px;
    }

    .expression-content {
      font-family: 'Courier New', monospace;
      font-size: 14px;
      color: #333;
      line-height: 1.6;
      word-break: break-all;
    }

    .expression-content .var-high {
      color: #1565C0;
      font-weight: bold;
      background: #BBDEFB;
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid #64B5F6;
    }

    .expression-content .var-low {
      color: #9E9E9E;
      background: #EEEEEE;
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid #E0E0E0;
      opacity: 0.7;
    }

    .expression-content .expr-output {
      color: #388E3C;
      font-weight: bold;
    }

    .expression-content .expr-empty {
      color: #999;
      font-style: italic;
    }

    .verifying-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
    }

    .verifying-content {
      background: #fff;
      padding: 32px 48px;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    }

    .verifying-content p {
      margin: 16px 0 0 0;
      color: #333;
      font-size: 14px;
    }

    .spinner {
      width: 48px;
      height: 48px;
      border: 4px solid #e0e0e0;
      border-top-color: #2196F3;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    `,
  ],
})
export class CompareViewComponent implements OnInit, OnChanges, OnDestroy {
  @Input() snapshotIdA: string | null = null;
  @Input() snapshotIdB: string | null = null;
  @Output() exit = new EventEmitter<void>();

  snapshotA: CircuitSnapshot | null = null;
  snapshotB: CircuitSnapshot | null = null;

  displayNodesA: CircuitNode[] = [];
  displayWiresA: Wire[] = [];
  displayNodesB: CircuitNode[] = [];
  displayWiresB: Wire[] = [];

  sharedInputs: string[] = [];
  currentInputValues: (0 | 1)[] = [];
  highlightedA: string[] = [];
  highlightedB: string[] = [];

  showResult = false;
  equivalenceResult: EquivalenceResult | null = null;
  verifying = false;
  totalCombinations = 0;
  initialized = false;
  expressionA = '';
  expressionB = '';

  constructor(
    private snapshotService: SnapshotService,
    private equivalenceService: EquivalenceService,
    private booleanExpressionService: BooleanExpressionService
  ) {}

  ngOnInit(): void {
    this.initializeFromIds();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['snapshotIdA'] || changes['snapshotIdB']) {
      this.initializeFromIds();
    }
  }

  ngOnDestroy(): void {}

  private initializeFromIds(): void {
    if (!this.snapshotIdA || !this.snapshotIdB) {
      this.initialized = false;
      return;
    }

    const snapA = this.snapshotService.getSnapshot(this.snapshotIdA);
    const snapB = this.snapshotService.getSnapshot(this.snapshotIdB);

    if (!snapA || !snapB) {
      this.initialized = false;
      return;
    }

    this.snapshotA = snapA;
    this.snapshotB = snapB;

    const inputsA = snapA.nodes.filter((n) => n.type === 'INPUT');
    const inputsB = snapB.nodes.filter((n) => n.type === 'INPUT');
    const inputCount = Math.min(inputsA.length, inputsB.length);

    this.sharedInputs = [];
    this.currentInputValues = [];
    for (let i = 0; i < inputCount; i++) {
      const name = inputsA[i]?.label || inputsB[i]?.label || `IN${i + 1}`;
      this.sharedInputs.push(name);
      this.currentInputValues.push(0);
    }

    this.applyCurrentInputs();
    this.updateExpressions();
    this.initialized = true;
  }

  toggleInput(index: number): void {
    this.currentInputValues[index] = this.currentInputValues[index] === 1 ? 0 : 1;
    this.applyCurrentInputs();
    this.highlightedA = [];
    this.highlightedB = [];
  }

  private applyCurrentInputs(): void {
    if (!this.snapshotA || !this.snapshotB) return;

    const combination = this.sharedInputs.map((name, i) => ({
      name,
      value: this.currentInputValues[i],
    }));

    const resultA = this.equivalenceService.applyInputCombination(
      this.snapshotA.nodes,
      this.snapshotA.wires,
      combination
    );
    this.displayNodesA = resultA.nodes;
    this.displayWiresA = resultA.wires;

    const resultB = this.equivalenceService.applyInputCombination(
      this.snapshotB.nodes,
      this.snapshotB.wires,
      combination
    );
    this.displayNodesB = resultB.nodes;
    this.displayWiresB = resultB.wires;

    this.updateExpressions();
  }

  private updateExpressions(): void {
    if (!this.snapshotA || !this.snapshotB) return;

    const inputValueMap = new Map<string, 0 | 1>();
    this.sharedInputs.forEach((name, i) => {
      inputValueMap.set(name, this.currentInputValues[i]);
    });

    this.expressionA = this.getHighlightedExpression(
      this.snapshotA,
      inputValueMap
    );
    this.expressionB = this.getHighlightedExpression(
      this.snapshotB,
      inputValueMap
    );
  }

  private getHighlightedExpression(
    snapshot: CircuitSnapshot,
    inputValueMap: Map<string, 0 | 1>
  ): string {
    const outputNodes = snapshot.nodes.filter((n) => n.type === 'OUTPUT');
    if (outputNodes.length === 0) return '<span class="expr-empty">暂无输出</span>';

    const expressions: string[] = [];
    for (const outputNode of outputNodes) {
      const wire = snapshot.wires.find((w) => w.toNodeId === outputNode.id);
      if (wire) {
        const expr = this.buildExpression(wire.fromNodeId, snapshot.nodes, snapshot.wires);
        const highlightedExpr = this.highlightVariables(expr, inputValueMap);
        const label = outputNode.label || outputNode.id;
        expressions.push(`<span class="expr-output">${label}</span> = ${highlightedExpr}`);
      }
    }
    return expressions.join('<br/>');
  }

  private highlightVariables(
    expr: string,
    inputValueMap: Map<string, 0 | 1>
  ): string {
    let result = expr;
    const sortedNames = Array.from(inputValueMap.keys()).sort((a, b) => b.length - a.length);

    const parts: string[] = [];
    let current = '';
    let inTag = false;

    for (let i = 0; i < result.length; i++) {
      const char = result[i];
      if (char === '<') {
        if (current) {
          parts.push(current);
          current = '';
        }
        inTag = true;
        current += char;
      } else if (char === '>') {
        current += char;
        parts.push(current);
        current = '';
        inTag = false;
      } else {
        current += char;
      }
    }
    if (current) {
      parts.push(current);
    }

    for (let i = 0; i < parts.length; i++) {
      if (parts[i].startsWith('<')) continue;
      for (const name of sortedNames) {
        const value = inputValueMap.get(name);
        const colorClass = value === 1 ? 'var-high' : 'var-low';
        const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedName}\\b`, 'g');
        parts[i] = parts[i].replace(regex, `<span class="${colorClass}">${name}</span>`);
      }
    }

    return parts.join('');
  }

  onVerifyEquivalence(): void {
    if (!this.snapshotA || !this.snapshotB) return;

    const inputsA = this.snapshotA.nodes.filter((n) => n.type === 'INPUT');
    this.totalCombinations = Math.pow(2, Math.min(inputsA.length, 10));

    if (inputsA.length > 10) {
      if (!confirm(`输入变量过多(${inputsA.length}个)，穷举验证需要计算 ${Math.pow(2, inputsA.length)} 种组合，可能耗时较长，是否继续？`)) {
        return;
      }
    }

    this.verifying = true;

    setTimeout(() => {
      if (this.snapshotA && this.snapshotB) {
        this.equivalenceResult = this.equivalenceService.verifyEquivalence(
          this.snapshotA,
          this.snapshotB
        );
        this.showResult = true;
      }
      this.verifying = false;
    }, 100);
  }

  onResultRowClick(row: ComparisonResult): void {
    if (!this.snapshotA || !this.snapshotB) return;

    row.inputCombination.forEach((input, i) => {
      this.currentInputValues[i] = input.value as 0 | 1;
    });
    this.applyCurrentInputs();

    const diffIds = this.equivalenceService.getDifferentOutputNodeIds(
      this.snapshotA.nodes,
      this.snapshotB.nodes,
      row
    );
    this.highlightedA = diffIds.a;
    this.highlightedB = diffIds.b;
  }

  onPlaybackRowChange(event: { row: ComparisonResult; index: number }): void {
    if (!this.snapshotA || !this.snapshotB) return;

    event.row.inputCombination.forEach((input, i) => {
      this.currentInputValues[i] = input.value as 0 | 1;
    });
    this.applyCurrentInputs();

    const diffIds = this.equivalenceService.getDifferentOutputNodeIds(
      this.snapshotA.nodes,
      this.snapshotB.nodes,
      event.row
    );
    this.highlightedA = diffIds.a;
    this.highlightedB = diffIds.b;
  }

  onPlaybackStop(): void {
    this.highlightedA = [];
    this.highlightedB = [];
  }

  onExportReport(): void {
    if (!this.snapshotA || !this.snapshotB || !this.equivalenceResult) return;

    const exprA = this.getExpressionForSnapshot(this.snapshotA);
    const exprB = this.getExpressionForSnapshot(this.snapshotB);

    const html = this.equivalenceService.generateHTMLReport(
      this.snapshotA,
      this.snapshotB,
      this.equivalenceResult,
      exprA,
      exprB
    );

    const filename = `equivalence_report_${Date.now()}.html`;
    this.equivalenceService.downloadHTMLReport(html, filename);
  }

  private getExpressionForSnapshot(snapshot: CircuitSnapshot): string {
    const outputNodes = snapshot.nodes.filter((n) => n.type === 'OUTPUT');
    if (outputNodes.length === 0) return '';

    const expressions: string[] = [];
    for (const outputNode of outputNodes) {
      const wire = snapshot.wires.find((w) => w.toNodeId === outputNode.id);
      if (wire) {
        const expr = this.buildExpression(wire.fromNodeId, snapshot.nodes, snapshot.wires);
        const label = outputNode.label || outputNode.id;
        expressions.push(`${label} = ${expr}`);
      }
    }
    return expressions.join('; ');
  }

  private buildExpression(
    nodeId: string,
    nodes: CircuitNode[],
    wires: Wire[],
    depth = 0
  ): string {
    if (depth > 100) return '...';

    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return '';

    if (node.type === 'INPUT') {
      return node.label || node.id;
    }

    const inputWires = wires.filter((w) => w.toNodeId === nodeId);
    const inputs = inputWires
      .sort((a, b) => {
        const portA = node.inputPorts.find((p) => p.id === a.toPortId);
        const portB = node.inputPorts.find((p) => p.id === b.toPortId);
        return (portA?.index ?? 0) - (portB?.index ?? 0);
      })
      .map((w) => this.buildExpression(w.fromNodeId, nodes, wires, depth + 1));

    while (inputs.length < (node.type === 'NOT' ? 1 : 2)) {
      inputs.push('0');
    }

    switch (node.type) {
      case 'AND':
        return `(${inputs[0]} · ${inputs[1]})`;
      case 'OR':
        return `(${inputs[0]} + ${inputs[1]})`;
      case 'NOT':
        return `${inputs[0]}'`;
      case 'NAND':
        return `(${inputs[0]} · ${inputs[1]})'`;
      case 'NOR':
        return `(${inputs[0]} + ${inputs[1]})'`;
      case 'XOR':
        return `(${inputs[0]} ⊕ ${inputs[1]})`;
      case 'XNOR':
        return `(${inputs[0]} ⊙ ${inputs[1]})`;
      default:
        return '';
    }
  }

  onExit(): void {
    this.exit.emit();
  }
}
