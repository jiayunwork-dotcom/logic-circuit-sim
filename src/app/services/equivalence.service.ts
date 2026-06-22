import { Injectable } from '@angular/core';
import {
  CircuitSnapshot,
  EquivalenceResult,
  ComparisonResult,
  CircuitNode,
  Wire,
} from '../models/circuit.models';
import { SnapshotService } from './snapshot.service';
import { BooleanExpressionService } from './boolean-expression.service';
import { CircuitService } from './circuit.service';

@Injectable({
  providedIn: 'root',
})
export class EquivalenceService {
  constructor(
    private snapshotService: SnapshotService,
    private circuitService: CircuitService
  ) {}

  verifyEquivalence(snapshotA: CircuitSnapshot, snapshotB: CircuitSnapshot): EquivalenceResult {
    const inputNodesA = snapshotA.nodes.filter((n) => n.type === 'INPUT');
    const inputNodesB = snapshotB.nodes.filter((n) => n.type === 'INPUT');
    const outputNodesA = snapshotA.nodes.filter((n) => n.type === 'OUTPUT');
    const outputNodesB = snapshotB.nodes.filter((n) => n.type === 'OUTPUT');

    const inputCount = Math.min(inputNodesA.length, inputNodesB.length);
    const outputCount = Math.min(outputNodesA.length, outputNodesB.length);

    if (inputCount === 0 || outputCount === 0) {
      return {
        isEquivalent: false,
        results: [],
        totalCombinations: 0,
        mismatchedCount: 0,
        inputCount,
        warning: '请确保两个电路都有输入和输出元件',
      };
    }

    let warning: string | undefined;
    if (inputCount > 10) {
      warning = `输入变量过多(${inputCount}个)，穷举验证耗时较长(${Math.pow(2, inputCount)}种组合)`;
    }

    if (inputNodesA.length !== inputNodesB.length) {
      warning =
        (warning ? warning + '；' : '') +
        `两个电路输入数量不同(A:${inputNodesA.length}, B:${inputNodesB.length})，将使用前${inputCount}个进行对比`;
    }
    if (outputNodesA.length !== outputNodesB.length) {
      warning =
        (warning ? warning + '；' : '') +
        `两个电路输出数量不同(A:${outputNodesA.length}, B:${outputNodesB.length})，将使用前${outputCount}个进行对比`;
    }

    const usedInputA = inputNodesA.slice(0, inputCount);
    const usedInputB = inputNodesB.slice(0, inputCount);
    const usedOutputA = outputNodesA.slice(0, outputCount);
    const usedOutputB = outputNodesB.slice(0, outputCount);

    const inputNames = usedInputA.map(
      (n, i) => n.label || usedInputB[i]?.label || `IN${i + 1}`
    );
    const outputNamesA = usedOutputA.map((n, i) => n.label || `OUT${i + 1}`);
    const outputNamesB = usedOutputB.map((n, i) => n.label || `OUT${i + 1}`);

    const results: ComparisonResult[] = [];
    const totalCombinations = Math.pow(2, inputCount);
    let mismatchedCount = 0;

    for (let i = 0; i < totalCombinations; i++) {
      const inputValuesA = new Map<string, 0 | 1>();
      const inputValuesB = new Map<string, 0 | 1>();
      const inputCombination: { name: string; value: number }[] = [];

      for (let j = 0; j < inputCount; j++) {
        const bitValue = ((i >> (inputCount - 1 - j)) & 1) as 0 | 1;
        inputValuesA.set(usedInputA[j].id, bitValue);
        inputValuesB.set(usedInputB[j].id, bitValue);
        inputCombination.push({ name: inputNames[j], value: bitValue });
      }

      const resultA = SnapshotService.evaluateCircuit(
        snapshotA.nodes,
        snapshotA.wires,
        inputValuesA
      );
      const resultB = SnapshotService.evaluateCircuit(
        snapshotB.nodes,
        snapshotB.wires,
        inputValuesB
      );

      const outputA: { name: string; value: number }[] = usedOutputA.map((node, idx) => {
        const found = resultA.outputNodes.find((o) => o.id === node.id);
        return { name: outputNamesA[idx], value: (found?.value ?? 0) as number };
      });

      const outputB: { name: string; value: number }[] = usedOutputB.map((node, idx) => {
        const found = resultB.outputNodes.find((o) => o.id === node.id);
        return { name: outputNamesB[idx], value: (found?.value ?? 0) as number };
      });

      const isDifferent = outputA.some((o, idx) => o.value !== outputB[idx].value);
      if (isDifferent) mismatchedCount++;

      results.push({
        inputCombination,
        outputA,
        outputB,
        isDifferent,
      });
    }

    return {
      isEquivalent: mismatchedCount === 0,
      results,
      totalCombinations,
      mismatchedCount,
      inputCount,
      warning,
    };
  }

  applyInputCombination(
    nodes: CircuitNode[],
    wires: Wire[],
    inputCombination: { name: string; value: number }[]
  ): { nodes: CircuitNode[]; wires: Wire[] } {
    const clonedNodes: CircuitNode[] = JSON.parse(JSON.stringify(nodes));
    const clonedWires: Wire[] = JSON.parse(JSON.stringify(wires));

    const inputNodes = clonedNodes.filter((n) => n.type === 'INPUT');

    inputCombination.forEach((input, idx) => {
      const node = inputNodes[idx];
      if (node) {
        node.value = input.value as 0 | 1;
        node.outputPorts.forEach((p) => {
          p.value = input.value as 0 | 1;
        });
      }
    });

    const order = this.topologicalSort(clonedNodes, clonedWires);
    if (!order) return { nodes: clonedNodes, wires: clonedWires };

    const nodeMap = new Map<string, CircuitNode>();
    clonedNodes.forEach((n) => nodeMap.set(n.id, n));

    for (const nodeId of order) {
      const node = nodeMap.get(nodeId);
      if (!node) continue;

      if (node.type === 'INPUT') continue;

      if (node.type === 'OUTPUT') {
        const inputWire = clonedWires.find((w) => w.toNodeId === nodeId);
        if (inputWire) {
          const fromNode = nodeMap.get(inputWire.fromNodeId);
          const fromPort = fromNode?.outputPorts.find((p) => p.id === inputWire.fromPortId);
          node.value = fromPort?.value ?? null;
          node.inputPorts[0].value = fromPort?.value ?? null;
        }
      } else {
        const inputVals: (0 | 1 | null)[] = [];
        for (const port of node.inputPorts) {
          const inputWire = clonedWires.find(
            (w) => w.toNodeId === nodeId && w.toPortId === port.id
          );
          if (inputWire) {
            const fromNode = nodeMap.get(inputWire.fromNodeId);
            const fromPort = fromNode?.outputPorts.find((p) => p.id === inputWire.fromPortId);
            port.value = fromPort?.value ?? null;
            inputVals.push(fromPort?.value ?? null);
          } else {
            port.value = null;
            inputVals.push(null);
          }
        }
        const outputValue = this.calculateGateOutput(node.type, inputVals);
        node.value = outputValue;
        node.outputPorts.forEach((p) => {
          p.value = outputValue;
        });
      }
    }

    clonedWires.forEach((w) => {
      const fromNode = nodeMap.get(w.fromNodeId);
      const fromPort = fromNode?.outputPorts.find((p) => p.id === w.fromPortId);
      w.value = fromPort?.value ?? null;
    });

    return { nodes: clonedNodes, wires: clonedWires };
  }

  getDifferentOutputNodeIds(
    nodesA: CircuitNode[],
    nodesB: CircuitNode[],
    combination: ComparisonResult
  ): { a: string[]; b: string[] } {
    const outputNodesA = nodesA.filter((n) => n.type === 'OUTPUT');
    const outputNodesB = nodesB.filter((n) => n.type === 'OUTPUT');
    const diffA: string[] = [];
    const diffB: string[] = [];

    combination.outputA.forEach((out, idx) => {
      if (out.value !== combination.outputB[idx]?.value) {
        if (outputNodesA[idx]) diffA.push(outputNodesA[idx].id);
        if (outputNodesB[idx]) diffB.push(outputNodesB[idx].id);
      }
    });

    return { a: diffA, b: diffB };
  }

  generateHTMLReport(
    snapshotA: CircuitSnapshot,
    snapshotB: CircuitSnapshot,
    result: EquivalenceResult,
    expressionA: string,
    expressionB: string
  ): string {
    const timestamp = new Date().toLocaleString();

    let tableRows = '';
    result.results.forEach((row) => {
      const inputStr = row.inputCombination.map((i) => i.value).join(' ');
      const outputAStr = row.outputA.map((o) => o.value).join(' ');
      const outputBStr = row.outputB.map((o) => o.value).join(' ');
      const diffClass = row.isDifferent ? 'style="background-color: #ffebee;"' : '';
      tableRows += `
        <tr ${diffClass}>
          <td>${inputStr}</td>
          <td>${outputAStr}</td>
          <td>${outputBStr}</td>
          <td>${row.isDifferent ? '❌ 不一致' : '✅ 一致'}</td>
        </tr>
      `;
    });

    const inputHeader = result.results[0]?.inputCombination.map((i) => i.name).join(' ') || '';
    const outputAHeader = result.results[0]?.outputA.map((o) => o.name).join(' ') || '';
    const outputBHeader = result.results[0]?.outputB.map((o) => o.name).join(' ') || '';

    const statusBanner = result.isEquivalent
      ? `<div style="background:#4CAF50;color:#fff;padding:16px;border-radius:8px;text-align:center;font-size:18px;font-weight:bold;">✅ 两个电路功能等价</div>`
      : `<div style="background:#f44336;color:#fff;padding:16px;border-radius:8px;text-align:center;font-size:18px;font-weight:bold;">❌ 两个电路功能不等价（共 ${result.mismatchedCount}/${result.totalCombinations} 处不一致）</div>`;

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>电路等价验证报告</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 1000px;
      margin: 0 auto;
      padding: 24px;
      background: #f5f5f5;
    }
    h1 { color: #1976D2; text-align: center; margin-bottom: 8px; }
    .subtitle { text-align: center; color: #666; margin-bottom: 24px; }
    .section {
      background: #fff;
      border-radius: 8px;
      padding: 16px 20px;
      margin-bottom: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .section h2 { color: #333; margin-top: 0; font-size: 18px; border-bottom: 1px solid #eee; padding-bottom: 8px; }
    .circuit-info { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .circuit-card { padding: 12px; background: #f9f9f9; border-radius: 6px; border-left: 4px solid #1976D2; }
    .circuit-card h3 { margin: 0 0 8px 0; font-size: 15px; color: #1976D2; }
    .circuit-card p { margin: 4px 0; font-size: 13px; color: #555; }
    .circuit-card .expr {
      font-family: 'Courier New', monospace;
      background: #fff;
      padding: 8px;
      border-radius: 4px;
      margin-top: 8px;
      border: 1px solid #eee;
      color: #333;
    }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { padding: 8px 12px; text-align: center; border-bottom: 1px solid #eee; font-size: 13px; }
    th { background: #f0f0f0; font-weight: 600; position: sticky; top: 0; }
    .input-col { background: #e3f2fd; }
    .output-col { background: #fce4ec; }
    .stats { display: flex; gap: 24px; flex-wrap: wrap; }
    .stat-item { flex: 1; min-width: 150px; }
    .stat-value { font-size: 24px; font-weight: bold; color: #1976D2; }
    .stat-label { font-size: 12px; color: #666; }
    .footer { text-align: center; color: #999; font-size: 12px; margin-top: 24px; }
    .warning {
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      color: #856404;
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 16px;
    }
    .table-container { max-height: 500px; overflow-y: auto; }
  </style>
</head>
<body>
  <h1>🔬 电路等价验证报告</h1>
  <p class="subtitle">生成时间：${timestamp}</p>

  ${result.warning ? `<div class="warning">⚠️ ${result.warning}</div>` : ''}

  ${statusBanner}

  <div class="section">
    <h2>📊 验证统计</h2>
    <div class="stats">
      <div class="stat-item">
        <div class="stat-value">${result.inputCount}</div>
        <div class="stat-label">输入变量数</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${result.totalCombinations}</div>
        <div class="stat-label">穷举组合数</div>
      </div>
      <div class="stat-item">
        <div class="stat-value" style="color: ${result.isEquivalent ? '#4CAF50' : '#f44336'}">${result.mismatchedCount}</div>
        <div class="stat-label">不一致数量</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${((result.totalCombinations - result.mismatchedCount) / result.totalCombinations * 100).toFixed(1)}%</div>
        <div class="stat-label">匹配率</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>🔧 电路信息</h2>
    <div class="circuit-info">
      <div class="circuit-card">
        <h3>电路 A：${this.escapeHtml(snapshotA.name)}</h3>
        <p>保存时间：${new Date(snapshotA.createdAt).toLocaleString()}</p>
        <p>元件数量：${snapshotA.nodes.length} 个节点，${snapshotA.wires.length} 条连线</p>
        <div class="expr">布尔表达式：${this.escapeHtml(expressionA || '无法生成')}</div>
      </div>
      <div class="circuit-card">
        <h3>电路 B：${this.escapeHtml(snapshotB.name)}</h3>
        <p>保存时间：${new Date(snapshotB.createdAt).toLocaleString()}</p>
        <p>元件数量：${snapshotB.nodes.length} 个节点，${snapshotB.wires.length} 条连线</p>
        <div class="expr">布尔表达式：${this.escapeHtml(expressionB || '无法生成')}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>📋 完整对比表</h2>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th class="input-col">输入 (${inputHeader})</th>
            <th class="output-col">电路A输出 (${outputAHeader})</th>
            <th class="output-col">电路B输出 (${outputBHeader})</th>
            <th>结果</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>
  </div>

  <div class="footer">
    由数字逻辑电路模拟器自动生成
  </div>
</body>
</html>`;
  }

  downloadHTMLReport(html: string, filename = 'equivalence_report.html'): void {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  private topologicalSort(nodes: CircuitNode[], wires: Wire[]): string[] | null {
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();

    nodes.forEach((n) => {
      inDegree.set(n.id, 0);
      adjacency.set(n.id, []);
    });

    wires.forEach((w) => {
      const from = w.fromNodeId;
      const to = w.toNodeId;
      adjacency.get(from)?.push(to);
      inDegree.set(to, (inDegree.get(to) || 0) + 1);
    });

    const queue: string[] = [];
    nodes.forEach((n) => {
      if (inDegree.get(n.id) === 0) {
        queue.push(n.id);
      }
    });

    const result: string[] = [];
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      result.push(nodeId);
      const neighbors = adjacency.get(nodeId) || [];
      for (const neighbor of neighbors) {
        const newDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }

    if (result.length !== nodes.length) return null;
    return result;
  }

  private calculateGateOutput(type: string, inputs: (0 | 1 | null)[]): 0 | 1 | null {
    if (inputs.some((i) => i === null)) return null;
    const a = inputs[0] as number;
    const b = inputs[1] as number;
    switch (type) {
      case 'AND': return (a & b) as 0 | 1;
      case 'OR': return (a | b) as 0 | 1;
      case 'NOT': return (1 - a) as 0 | 1;
      case 'NAND': return (1 - (a & b)) as 0 | 1;
      case 'NOR': return (1 - (a | b)) as 0 | 1;
      case 'XOR': return (a ^ b) as 0 | 1;
      case 'XNOR': return (1 - (a ^ b)) as 0 | 1;
      default: return null;
    }
  }

  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
