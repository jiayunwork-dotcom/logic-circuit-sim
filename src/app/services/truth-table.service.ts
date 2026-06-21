import { Injectable } from '@angular/core';
import { CircuitNode, TruthTableRow } from '../models/circuit.models';
import { CircuitService } from './circuit.service';

@Injectable({
  providedIn: 'root',
})
export class TruthTableService {
  constructor(private circuitService: CircuitService) {}

  generateTruthTable(inputIds: string[], outputIds: string[]): TruthTableRow[] | null {
    const state = this.circuitService.state;
    const inputNodes = inputIds
      .map((id) => state.nodes.find((n) => n.id === id))
      .filter((n): n is CircuitNode => !!n && n.type === 'INPUT');
    const outputNodes = outputIds
      .map((id) => state.nodes.find((n) => n.id === id))
      .filter((n): n is CircuitNode => !!n && n.type === 'OUTPUT');

    if (inputNodes.length === 0 || outputNodes.length === 0) return null;

    if (state.hasFeedbackLoop) return null;

    const rows: TruthTableRow[] = [];
    const inputCount = inputNodes.length;
    const rowCount = Math.pow(2, inputCount);

    const originalValues = new Map<string, number | null>();
    inputNodes.forEach((n) => originalValues.set(n.id, n.value ?? null));

    for (let i = 0; i < rowCount; i++) {
      const inputValues: { name: string; value: number }[] = [];
      for (let j = 0; j < inputCount; j++) {
        const bitValue = (i >> (inputCount - 1 - j)) & 1;
        const node = inputNodes[j];
        this.setInputValue(node.id, bitValue as 0 | 1);
        inputValues.push({
          name: node.label || node.id,
          value: bitValue,
        });
      }

      this.circuitService.propagateSignals();
      const currentState = this.circuitService.state;

      const outputValues: { name: string; value: number }[] = [];
      for (const node of outputNodes) {
        const currentNode = currentState.nodes.find((n) => n.id === node.id);
        outputValues.push({
          name: node.label || node.id,
          value: (currentNode?.value ?? 0) as number,
        });
      }

      rows.push({ inputs: inputValues, outputs: outputValues });
    }

    inputNodes.forEach((n) => {
      const val = originalValues.get(n.id);
      if (val !== null && val !== undefined) {
        this.setInputValue(n.id, val as 0 | 1);
      }
    });
    this.circuitService.propagateSignals();

    return rows;
  }

  private setInputValue(nodeId: string, value: 0 | 1): void {
    const state = this.circuitService.state;
    const nodes = state.nodes.map((n) => {
      if (n.id === nodeId && n.type === 'INPUT') {
        return {
          ...n,
          value: value,
          outputPorts: n.outputPorts.map((p) => ({ ...p, value })),
        };
      }
      return n;
    });
    (this.circuitService as any).stateSubject.next({ ...state, nodes });
  }

  exportToCSV(rows: TruthTableRow[]): string {
    if (rows.length === 0) return '';

    const headers = [
      ...rows[0].inputs.map((i) => i.name),
      ...rows[0].outputs.map((o) => o.name),
    ];

    const lines = [headers.join(',')];

    for (const row of rows) {
      const values = [...row.inputs.map((i) => i.value), ...row.outputs.map((o) => o.value)];
      lines.push(values.join(','));
    }

    return lines.join('\n');
  }

  downloadCSV(rows: TruthTableRow[], filename = 'truth_table.csv'): void {
    const csv = this.exportToCSV(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  compareTruthTables(table1: TruthTableRow[], table2: TruthTableRow[]): boolean {
    if (table1.length !== table2.length) return false;

    for (let i = 0; i < table1.length; i++) {
      const row1 = table1[i];
      const row2 = table2[i];

      if (row1.inputs.length !== row2.inputs.length) return false;
      if (row1.outputs.length !== row2.outputs.length) return false;

      for (let j = 0; j < row1.outputs.length; j++) {
        if (row1.outputs[j].value !== row2.outputs[j].value) {
          return false;
        }
      }
    }

    return true;
  }
}
