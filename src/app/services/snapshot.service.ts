import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { CircuitSnapshot, CircuitNode, Wire } from '../models/circuit.models';
import { CircuitService } from './circuit.service';

@Injectable({
  providedIn: 'root',
})
export class SnapshotService {
  private readonly STORAGE_KEY = 'logic_circuit_snapshots';
  private snapshotsSubject = new BehaviorSubject<CircuitSnapshot[]>([]);
  snapshots$: Observable<CircuitSnapshot[]> = this.snapshotsSubject.asObservable();

  constructor(private circuitService: CircuitService) {
    this.loadSnapshotsFromStorage();
  }

  get snapshots(): CircuitSnapshot[] {
    return this.snapshotsSubject.value;
  }

  takeSnapshot(name: string): CircuitSnapshot {
    const state = this.circuitService.state;
    const snapshot: CircuitSnapshot = {
      id: this.generateId(),
      name,
      createdAt: new Date().toISOString(),
      nodes: JSON.parse(JSON.stringify(state.nodes)),
      wires: JSON.parse(JSON.stringify(state.wires)),
    };

    const currentSnapshots = this.snapshotsSubject.value;
    this.snapshotsSubject.next([...currentSnapshots, snapshot]);
    this.saveSnapshotsToStorage();
    return snapshot;
  }

  deleteSnapshot(id: string): void {
    const snapshots = this.snapshotsSubject.value.filter((s) => s.id !== id);
    this.snapshotsSubject.next(snapshots);
    this.saveSnapshotsToStorage();
  }

  renameSnapshot(id: string, newName: string): void {
    const snapshots = this.snapshotsSubject.value.map((s) =>
      s.id === id ? { ...s, name: newName } : s
    );
    this.snapshotsSubject.next(snapshots);
    this.saveSnapshotsToStorage();
  }

  getSnapshot(id: string): CircuitSnapshot | undefined {
    return this.snapshotsSubject.value.find((s) => s.id === id);
  }

  loadSnapshotToCircuit(id: string): boolean {
    const snapshot = this.getSnapshot(id);
    if (!snapshot) return false;
    this.circuitService.loadCircuit(
      JSON.parse(JSON.stringify(snapshot.nodes)),
      JSON.parse(JSON.stringify(snapshot.wires))
    );
    return true;
  }

  clearAllSnapshots(): void {
    this.snapshotsSubject.next([]);
    this.saveSnapshotsToStorage();
  }

  private generateId(): string {
    return `snap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private saveSnapshotsToStorage(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.snapshotsSubject.value));
  }

  private loadSnapshotsFromStorage(): void {
    const data = localStorage.getItem(this.STORAGE_KEY);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          this.snapshotsSubject.next(parsed);
        }
      } catch {
        this.snapshotsSubject.next([]);
      }
    }
  }

  static evaluateCircuit(
    nodes: CircuitNode[],
    wires: Wire[],
    inputValues: Map<string, 0 | 1>
  ): { outputNodes: { id: string; label: string; value: 0 | 1 | null }[] } {
    const clonedNodes: CircuitNode[] = JSON.parse(JSON.stringify(nodes));
    const clonedWires: Wire[] = JSON.parse(JSON.stringify(wires));

    clonedNodes.forEach((node) => {
      if (node.type === 'INPUT') {
        const val = inputValues.get(node.id) ?? 0;
        node.value = val;
        node.outputPorts.forEach((p) => {
          p.value = val;
        });
      }
    });

    const order = SnapshotService.topologicalSort(clonedNodes, clonedWires);
    if (!order) {
      return { outputNodes: [] };
    }

    const nodeMap = new Map<string, CircuitNode>();
    clonedNodes.forEach((n) => nodeMap.set(n.id, n));

    for (const nodeId of order) {
      const node = nodeMap.get(nodeId);
      if (!node) continue;

      if (node.type === 'INPUT') {
        continue;
      } else if (node.type === 'OUTPUT') {
        const inputWire = clonedWires.find((w) => w.toNodeId === nodeId);
        if (inputWire) {
          const fromNode = nodeMap.get(inputWire.fromNodeId);
          const fromPort = fromNode?.outputPorts.find((p) => p.id === inputWire.fromPortId);
          node.value = fromPort?.value ?? null;
          node.inputPorts[0].value = fromPort?.value ?? null;
        } else {
          node.value = null;
          node.inputPorts[0].value = null;
        }
      } else {
        const inputValuesArr: (0 | 1 | null)[] = [];
        for (const port of node.inputPorts) {
          const inputWire = clonedWires.find(
            (w) => w.toNodeId === nodeId && w.toPortId === port.id
          );
          if (inputWire) {
            const fromNode = nodeMap.get(inputWire.fromNodeId);
            const fromPort = fromNode?.outputPorts.find((p) => p.id === inputWire.fromPortId);
            port.value = fromPort?.value ?? null;
            inputValuesArr.push(fromPort?.value ?? null);
          } else {
            port.value = null;
            inputValuesArr.push(null);
          }
        }
        const outputValue = SnapshotService.calculateGateOutput(node.type, inputValuesArr);
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

    const outputNodes = clonedNodes
      .filter((n) => n.type === 'OUTPUT')
      .map((n) => ({
        id: n.id,
        label: n.label || n.id,
        value: n.value ?? null,
      }));

    return { outputNodes };
  }

  private static topologicalSort(nodes: CircuitNode[], wires: Wire[]): string[] | null {
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

    if (result.length !== nodes.length) {
      return null;
    }
    return result;
  }

  private static calculateGateOutput(
    type: string,
    inputs: (0 | 1 | null)[]
  ): 0 | 1 | null {
    if (inputs.some((i) => i === null)) return null;

    const a = inputs[0] as number;
    const b = inputs[1] as number;

    switch (type) {
      case 'AND':
        return (a & b) as 0 | 1;
      case 'OR':
        return (a | b) as 0 | 1;
      case 'NOT':
        return (1 - a) as 0 | 1;
      case 'NAND':
        return (1 - (a & b)) as 0 | 1;
      case 'NOR':
        return (1 - (a | b)) as 0 | 1;
      case 'XOR':
        return (a ^ b) as 0 | 1;
      case 'XNOR':
        return (1 - (a ^ b)) as 0 | 1;
      default:
        return null;
    }
  }
}
