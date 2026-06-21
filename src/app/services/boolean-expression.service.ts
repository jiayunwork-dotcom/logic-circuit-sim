import { Injectable } from '@angular/core';
import { CircuitService } from './circuit.service';

@Injectable({
  providedIn: 'root',
})
export class BooleanExpressionService {
  constructor(private circuitService: CircuitService) {}

  getExpressionForOutput(outputNodeId: string): string | null {
    const state = this.circuitService.state;
    const outputNode = state.nodes.find((n) => n.id === outputNodeId);
    if (!outputNode || outputNode.type !== 'OUTPUT') return null;

    const inputWire = state.wires.find((w) => w.toNodeId === outputNodeId);
    if (!inputWire) return null;

    const expression = this.buildExpression(inputWire.fromNodeId, state.nodes, state.wires);
    return this.simplifyNotation(expression);
  }

  private buildExpression(
    nodeId: string,
    nodes: typeof this.circuitService.state.nodes,
    wires: typeof this.circuitService.state.wires,
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

    while (inputs.length < this.getRequiredInputs(node.type)) {
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

  private getRequiredInputs(type: string): number {
    return type === 'NOT' ? 1 : 2;
  }

  private simplifyNotation(expr: string): string {
    return expr;
  }

  getSOPExpression(truthTable: { inputs: { name: string; value: number }[]; outputs: { name: string; value: number }[] }[], outputIndex: number): string {
    if (truthTable.length === 0) return '';

    const inputNames = truthTable[0].inputs.map((i) => i.name);
    const terms: string[] = [];

    for (const row of truthTable) {
      if (row.outputs[outputIndex]?.value === 1) {
        const termParts: string[] = [];
        for (let i = 0; i < row.inputs.length; i++) {
          if (row.inputs[i].value === 1) {
            termParts.push(inputNames[i]);
          } else {
            termParts.push(`${inputNames[i]}'`);
          }
        }
        terms.push(termParts.join(''));
      }
    }

    if (terms.length === 0) return '0';
    if (terms.length === truthTable.length) return '1';

    return terms.join(' + ');
  }
}
