import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { CircuitSnapshot, CircuitNode, Wire } from '../models/circuit.models';
import { CircuitService } from './circuit.service';

export interface SnapshotDiffItem {
  type: 'add' | 'remove' | 'move';
  category: 'node' | 'wire';
  id: string;
  description: string;
  details?: string;
}

export interface SnapshotDiffResult {
  items: SnapshotDiffItem[];
  addedNodes: number;
  removedNodes: number;
  movedNodes: number;
  addedWires: number;
  removedWires: number;
}

@Injectable({
  providedIn: 'root',
})
export class SnapshotService {
  private readonly STORAGE_KEY = 'logic_circuit_snapshots';
  private snapshotsSubject = new BehaviorSubject<CircuitSnapshot[]>([]);
  snapshots$: Observable<CircuitSnapshot[]> = this.snapshotsSubject.asObservable();

  constructor(private circuitService: CircuitService) {
    this.loadSnapshotsFromStorage();
    if (this.snapshotsSubject.value.length === 0) {
      this.createDemoSnapshots();
    }
  }

  private createDemoSnapshots(): void {
    const demos = [
      this.createAndGateSnapshot(),
      this.createNandNotSnapshot(),
    ];
    this.snapshotsSubject.next(demos);
    this.saveSnapshotsToStorage();
  }

  private createAndGateSnapshot(): CircuitSnapshot {
    const baseY = 120;
    const x1 = 80, x2 = 300, x3 = 520;
    const yA = baseY, yB = baseY + 100, yY = baseY + 50;

    const nodeInputA = {
      id: 'demo1_inA', type: 'INPUT' as const,
      position: { x: x1, y: yA }, label: 'A', value: 0 as const,
      inputPorts: [],
      outputPorts: [{ id: 'demo1_inA_out', type: 'output' as const, nodeId: 'demo1_inA', index: 0, value: 0 as const, position: { x: 60, y: 20 } }],
      delay: 0,
    };

    const nodeInputB = {
      id: 'demo1_inB', type: 'INPUT' as const,
      position: { x: x1, y: yB }, label: 'B', value: 0 as const,
      inputPorts: [],
      outputPorts: [{ id: 'demo1_inB_out', type: 'output' as const, nodeId: 'demo1_inB', index: 0, value: 0 as const, position: { x: 60, y: 20 } }],
      delay: 0,
    };

    const nodeAnd = {
      id: 'demo1_and', type: 'AND' as const,
      position: { x: x2, y: yY - 10 }, label: '', value: 0 as const,
      inputPorts: [
        { id: 'demo1_and_in0', type: 'input' as const, nodeId: 'demo1_and', index: 0, value: null, position: { x: 0, y: 15 } },
        { id: 'demo1_and_in1', type: 'input' as const, nodeId: 'demo1_and', index: 1, value: null, position: { x: 0, y: 45 } },
      ],
      outputPorts: [{ id: 'demo1_and_out', type: 'output' as const, nodeId: 'demo1_and', index: 0, value: 0 as const, position: { x: 80, y: 30 } }],
      delay: 0,
    };

    const nodeOutput = {
      id: 'demo1_out', type: 'OUTPUT' as const,
      position: { x: x3, y: yY }, label: 'Y', value: 0 as const,
      inputPorts: [{ id: 'demo1_out_in', type: 'input' as const, nodeId: 'demo1_out', index: 0, value: null, position: { x: 0, y: 20 } }],
      outputPorts: [],
      delay: 0,
    };

    const wire1 = {
      id: 'demo1_w1',
      fromNodeId: 'demo1_inA', fromPortId: 'demo1_inA_out',
      toNodeId: 'demo1_and', toPortId: 'demo1_and_in0',
      points: [
        { x: x1 + 60, y: yA + 20 },
        { x: x2, y: yY - 10 + 15 },
      ],
      value: 0 as 0,
    };

    const wire2 = {
      id: 'demo1_w2',
      fromNodeId: 'demo1_inB', fromPortId: 'demo1_inB_out',
      toNodeId: 'demo1_and', toPortId: 'demo1_and_in1',
      points: [
        { x: x1 + 60, y: yB + 20 },
        { x: x2, y: yY - 10 + 45 },
      ],
      value: 0 as 0,
    };

    const wire3 = {
      id: 'demo1_w3',
      fromNodeId: 'demo1_and', fromPortId: 'demo1_and_out',
      toNodeId: 'demo1_out', toPortId: 'demo1_out_in',
      points: [
        { x: x2 + 80, y: yY - 10 + 30 },
        { x: x3, y: yY + 20 },
      ],
      value: 0 as 0,
    };

    return {
      id: 'demo_snap_1',
      name: '电路A - A与B',
      createdAt: new Date().toISOString(),
      nodes: [nodeInputA, nodeInputB, nodeAnd, nodeOutput],
      wires: [wire1, wire2, wire3],
    };
  }

  private createNandNotSnapshot(): CircuitSnapshot {
    const baseY = 120;
    const x1 = 80, x2 = 280, x3 = 420, x4 = 560;
    const yA = baseY, yB = baseY + 100, yM = baseY + 50, yY = baseY + 50;

    const nodeInputA = {
      id: 'demo2_inA', type: 'INPUT' as const,
      position: { x: x1, y: yA }, label: 'A', value: 0 as const,
      inputPorts: [],
      outputPorts: [{ id: 'demo2_inA_out', type: 'output' as const, nodeId: 'demo2_inA', index: 0, value: 0 as const, position: { x: 60, y: 20 } }],
      delay: 0,
    };

    const nodeInputB = {
      id: 'demo2_inB', type: 'INPUT' as const,
      position: { x: x1, y: yB }, label: 'B', value: 0 as const,
      inputPorts: [],
      outputPorts: [{ id: 'demo2_inB_out', type: 'output' as const, nodeId: 'demo2_inB', index: 0, value: 0 as const, position: { x: 60, y: 20 } }],
      delay: 0,
    };

    const nodeNand = {
      id: 'demo2_nand', type: 'NAND' as const,
      position: { x: x2, y: yM - 10 }, label: '', value: 0 as const,
      inputPorts: [
        { id: 'demo2_nand_in0', type: 'input' as const, nodeId: 'demo2_nand', index: 0, value: null, position: { x: 0, y: 15 } },
        { id: 'demo2_nand_in1', type: 'input' as const, nodeId: 'demo2_nand', index: 1, value: null, position: { x: 0, y: 45 } },
      ],
      outputPorts: [{ id: 'demo2_nand_out', type: 'output' as const, nodeId: 'demo2_nand', index: 0, value: 0 as const, position: { x: 80, y: 30 } }],
      delay: 0,
    };

    const nodeNot = {
      id: 'demo2_not', type: 'NOT' as const,
      position: { x: x3, y: yY }, label: '', value: 0 as const,
      inputPorts: [
        { id: 'demo2_not_in0', type: 'input' as const, nodeId: 'demo2_not', index: 0, value: null, position: { x: 0, y: 20 } },
      ],
      outputPorts: [{ id: 'demo2_not_out', type: 'output' as const, nodeId: 'demo2_not', index: 0, value: 0 as const, position: { x: 70, y: 20 } }],
      delay: 0,
    };

    const nodeOutput = {
      id: 'demo2_out', type: 'OUTPUT' as const,
      position: { x: x4, y: yY }, label: 'Y', value: 0 as const,
      inputPorts: [{ id: 'demo2_out_in', type: 'input' as const, nodeId: 'demo2_out', index: 0, value: null, position: { x: 0, y: 20 } }],
      outputPorts: [],
      delay: 0,
    };

    const wire1 = {
      id: 'demo2_w1',
      fromNodeId: 'demo2_inA', fromPortId: 'demo2_inA_out',
      toNodeId: 'demo2_nand', toPortId: 'demo2_nand_in0',
      points: [
        { x: x1 + 60, y: yA + 20 },
        { x: x2, y: yM - 10 + 15 },
      ],
      value: 0 as 0,
    };

    const wire2 = {
      id: 'demo2_w2',
      fromNodeId: 'demo2_inB', fromPortId: 'demo2_inB_out',
      toNodeId: 'demo2_nand', toPortId: 'demo2_nand_in1',
      points: [
        { x: x1 + 60, y: yB + 20 },
        { x: x2, y: yM - 10 + 45 },
      ],
      value: 0 as 0,
    };

    const wire3 = {
      id: 'demo2_w3',
      fromNodeId: 'demo2_nand', fromPortId: 'demo2_nand_out',
      toNodeId: 'demo2_not', toPortId: 'demo2_not_in0',
      points: [
        { x: x2 + 80, y: yM - 10 + 30 },
        { x: x3, y: yY + 20 },
      ],
      value: 0 as 0,
    };

    const wire4 = {
      id: 'demo2_w4',
      fromNodeId: 'demo2_not', fromPortId: 'demo2_not_out',
      toNodeId: 'demo2_out', toPortId: 'demo2_out_in',
      points: [
        { x: x3 + 70, y: yY + 20 },
        { x: x4, y: yY + 20 },
      ],
      value: 0 as 0,
    };

    return {
      id: 'demo_snap_2',
      name: '电路B - (A与非B)非 = A与B',
      createdAt: new Date(Date.now() - 1000).toISOString(),
      nodes: [nodeInputA, nodeInputB, nodeNand, nodeNot, nodeOutput],
      wires: [wire1, wire2, wire3, wire4],
    };
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
    this.snapshotsSubject.next([snapshot, ...currentSnapshots]);
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

  reorderSnapshots(fromIndex: number, toIndex: number): void {
    const snapshots = [...this.snapshotsSubject.value];
    const [removed] = snapshots.splice(fromIndex, 1);
    snapshots.splice(toIndex, 0, removed);
    this.snapshotsSubject.next(snapshots);
    this.saveSnapshotsToStorage();
  }

  clearAllSnapshots(): void {
    this.snapshotsSubject.next([]);
    this.saveSnapshotsToStorage();
  }

  compareSnapshots(snapshotIdA: string, snapshotIdB: string): SnapshotDiffResult | null {
    const snapA = this.getSnapshot(snapshotIdA);
    const snapB = this.getSnapshot(snapshotIdB);

    if (!snapA || !snapB) return null;

    const items: SnapshotDiffItem[] = [];
    let addedNodes = 0;
    let removedNodes = 0;
    let movedNodes = 0;
    let addedWires = 0;
    let removedWires = 0;

    const getNodeKey = (node: CircuitNode): string => {
      const label = node.label ? node.label.trim() : '';
      return label ? `${node.type}:${label}` : node.id;
    };

    const nodeKeyMapA = new Map<string, CircuitNode>();
    const nodeKeyMapB = new Map<string, CircuitNode>();
    const nodeIdToKeyA = new Map<string, string>();
    const nodeIdToKeyB = new Map<string, string>();

    snapA.nodes.forEach((n) => {
      const key = getNodeKey(n);
      nodeKeyMapA.set(key, n);
      nodeIdToKeyA.set(n.id, key);
    });
    snapB.nodes.forEach((n) => {
      const key = getNodeKey(n);
      nodeKeyMapB.set(key, n);
      nodeIdToKeyB.set(n.id, key);
    });

    for (const node of snapA.nodes) {
      const key = getNodeKey(node);
      if (!nodeKeyMapB.has(key)) {
        removedNodes++;
        items.push({
          type: 'remove',
          category: 'node',
          id: node.id,
          description: `删除元件: ${node.label || node.type}`,
          details: `类型: ${node.type}`,
        });
      }
    }

    for (const node of snapB.nodes) {
      const key = getNodeKey(node);
      if (!nodeKeyMapA.has(key)) {
        addedNodes++;
        items.push({
          type: 'add',
          category: 'node',
          id: node.id,
          description: `新增元件: ${node.label || node.type}`,
          details: `类型: ${node.type}`,
        });
      } else {
        const oldNode = nodeKeyMapA.get(key)!;
        const dx = Math.abs(node.position.x - oldNode.position.x);
        const dy = Math.abs(node.position.y - oldNode.position.y);
        if (dx > 20 || dy > 20) {
          movedNodes++;
          const deltaX = (node.position.x - oldNode.position.x).toFixed(0);
          const deltaY = (node.position.y - oldNode.position.y).toFixed(0);
          const deltaStr = `${deltaX.startsWith('-') ? '' : '+'}${deltaX}px, ${deltaY.startsWith('-') ? '' : '+'}${deltaY}px`;
          items.push({
            type: 'move',
            category: 'node',
            id: node.id,
            description: `移动元件: ${node.label || node.type}`,
            details: `从 (${oldNode.position.x.toFixed(0)}, ${oldNode.position.y.toFixed(0)}) → 到 (${node.position.x.toFixed(0)}, ${node.position.y.toFixed(0)})，位移: ${deltaStr}`,
          });
        }
      }
    }

    const getWireKey = (wire: Wire, idToKey: Map<string, string>): string => {
      const fromKey = idToKey.get(wire.fromNodeId) || wire.fromNodeId;
      const toKey = idToKey.get(wire.toNodeId) || wire.toNodeId;
      return `${fromKey}->${toKey}:${wire.fromPortId}-${wire.toPortId}`;
    };

    const wireKeyMapA = new Map<string, Wire>();
    const wireKeyMapB = new Map<string, Wire>();

    snapA.wires.forEach((w) => {
      const key = getWireKey(w, nodeIdToKeyA);
      wireKeyMapA.set(key, w);
    });
    snapB.wires.forEach((w) => {
      const key = getWireKey(w, nodeIdToKeyB);
      wireKeyMapB.set(key, w);
    });

    const getNodeDesc = (nodeId: string, idToKey: Map<string, string>, snap: CircuitSnapshot): string => {
      const node = snap.nodes.find((n) => n.id === nodeId);
      return node?.label || node?.type || nodeId;
    };

    for (const wire of snapA.wires) {
      const key = getWireKey(wire, nodeIdToKeyA);
      if (!wireKeyMapB.has(key)) {
        removedWires++;
        items.push({
          type: 'remove',
          category: 'wire',
          id: wire.id,
          description: `删除连线`,
          details: `从 ${getNodeDesc(wire.fromNodeId, nodeIdToKeyA, snapA)} 到 ${getNodeDesc(wire.toNodeId, nodeIdToKeyA, snapA)}`,
        });
      }
    }

    for (const wire of snapB.wires) {
      const key = getWireKey(wire, nodeIdToKeyB);
      if (!wireKeyMapA.has(key)) {
        addedWires++;
        items.push({
          type: 'add',
          category: 'wire',
          id: wire.id,
          description: `新增连线`,
          details: `从 ${getNodeDesc(wire.fromNodeId, nodeIdToKeyB, snapB)} 到 ${getNodeDesc(wire.toNodeId, nodeIdToKeyB, snapB)}`,
        });
      }
    }

    return {
      items,
      addedNodes,
      removedNodes,
      movedNodes,
      addedWires,
      removedWires,
    };
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
