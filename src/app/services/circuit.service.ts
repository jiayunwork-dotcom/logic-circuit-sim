import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  CircuitNode,
  Wire,
  Port,
  SignalValue,
  GateType,
  CircuitState,
  HistoryState,
} from '../models/circuit.models';

@Injectable({
  providedIn: 'root',
})
export class CircuitService {
  private stateSubject = new BehaviorSubject<CircuitState>({
    nodes: [],
    wires: [],
    selectedNodeIds: [],
    selectedWireIds: [],
    hasFeedbackLoop: false,
  });
  state$: Observable<CircuitState> = this.stateSubject.asObservable();

  private nodeIdCounter = 0;
  private wireIdCounter = 0;

  get state(): CircuitState {
    return this.stateSubject.value;
  }

  generateNodeId(): string {
    return `node_${++this.nodeIdCounter}`;
  }

  generateWireId(): string {
    return `wire_${++this.wireIdCounter}`;
  }

  generatePortId(nodeId: string, type: 'input' | 'output', index: number): string {
    return `${nodeId}_${type}_${index}`;
  }

  createNode(type: GateType, x: number, y: number, label?: string): CircuitNode {
    const id = this.generateNodeId();
    const inputCount = this.getInputCount(type);
    const outputCount = this.getOutputCount(type);

    const inputPorts: Port[] = [];
    const outputPorts: Port[] = [];

    const nodeWidth = this.getNodeWidth(type);
    const nodeHeight = this.getNodeHeight(type);

    for (let i = 0; i < inputCount; i++) {
      const portY = nodeHeight / (inputCount + 1) * (i + 1);
      inputPorts.push({
        id: this.generatePortId(id, 'input', i),
        type: 'input',
        index: i,
        nodeId: id,
        position: { x: 0, y: portY },
        value: null,
      });
    }

    for (let i = 0; i < outputCount; i++) {
      const portY = nodeHeight / (outputCount + 1) * (i + 1);
      outputPorts.push({
        id: this.generatePortId(id, 'output', i),
        type: 'output',
        index: i,
        nodeId: id,
        position: { x: nodeWidth, y: portY },
        value: null,
      });
    }

    return {
      id,
      type,
      position: { x, y },
      label,
      inputPorts,
      outputPorts,
      value: type === 'INPUT' ? 0 : null,
    };
  }

  getInputCount(type: GateType): number {
    switch (type) {
      case 'NOT':
        return 1;
      case 'INPUT':
        return 0;
      case 'OUTPUT':
        return 1;
      default:
        return 2;
    }
  }

  getOutputCount(type: GateType): number {
    switch (type) {
      case 'OUTPUT':
        return 0;
      default:
        return 1;
    }
  }

  getNodeWidth(type: GateType): number {
    switch (type) {
      case 'INPUT':
      case 'OUTPUT':
        return 60;
      default:
        return 80;
    }
  }

  getNodeHeight(type: GateType): number {
    switch (type) {
      case 'INPUT':
      case 'OUTPUT':
        return 40;
      default:
        return 60;
    }
  }

  addNode(node: CircuitNode): void {
    const state = this.stateSubject.value;
    this.stateSubject.next({
      ...state,
      nodes: [...state.nodes, node],
    });
    this.propagateSignals();
  }

  removeNode(nodeId: string): void {
    const state = this.stateSubject.value;
    const wires = state.wires.filter(
      (w) => w.fromNodeId !== nodeId && w.toNodeId !== nodeId
    );
    const nodes = state.nodes.filter((n) => n.id !== nodeId);
    const selectedNodeIds = state.selectedNodeIds.filter((id) => id !== nodeId);
    const selectedWireIds = state.selectedWireIds.filter(
      (id) => !state.wires.find((w) => w.id === id && (w.fromNodeId === nodeId || w.toNodeId === nodeId))
    );

    this.stateSubject.next({
      ...state,
      nodes,
      wires,
      selectedNodeIds,
      selectedWireIds,
    });
    this.propagateSignals();
  }

  moveNode(nodeId: string, x: number, y: number): void {
    const state = this.stateSubject.value;
    const nodes = state.nodes.map((n) =>
      n.id === nodeId ? { ...n, position: { x, y } } : n
    );
    const wires = state.wires.map((w) => {
      const points = this.calculateWirePoints(
        w.fromNodeId,
        w.fromPortId,
        w.toNodeId,
        w.toPortId,
        nodes
      );
      return { ...w, points };
    });
    this.stateSubject.next({ ...state, nodes, wires });
  }

  addWire(fromNodeId: string, fromPortId: string, toNodeId: string, toPortId: string): Wire | null {
    const state = this.stateSubject.value;

    const fromNode = state.nodes.find((n) => n.id === fromNodeId);
    const toNode = state.nodes.find((n) => n.id === toNodeId);
    if (!fromNode || !toNode) return null;

    const fromPort = fromNode.outputPorts.find((p) => p.id === fromPortId);
    const toPort = toNode.inputPorts.find((p) => p.id === toPortId);
    if (!fromPort || !toPort) return null;

    const existingWire = state.wires.find((w) => w.toNodeId === toNodeId && w.toPortId === toPortId);
    if (existingWire) return null;

    const id = this.generateWireId();
    const points = this.calculateWirePoints(fromNodeId, fromPortId, toNodeId, toPortId, state.nodes);

    const wire: Wire = {
      id,
      fromNodeId,
      fromPortId,
      toNodeId,
      toPortId,
      value: null,
      points,
    };

    this.stateSubject.next({
      ...state,
      wires: [...state.wires, wire],
    });
    this.propagateSignals();
    return wire;
  }

  removeWire(wireId: string): void {
    const state = this.stateSubject.value;
    const wires = state.wires.filter((w) => w.id !== wireId);
    const selectedWireIds = state.selectedWireIds.filter((id) => id !== wireId);
    this.stateSubject.next({ ...state, wires, selectedWireIds });
    this.propagateSignals();
  }

  calculateWirePoints(
    fromNodeId: string,
    fromPortId: string,
    toNodeId: string,
    toPortId: string,
    nodes: CircuitNode[]
  ): { x: number; y: number }[] {
    const fromNode = nodes.find((n) => n.id === fromNodeId);
    const toNode = nodes.find((n) => n.id === toNodeId);
    if (!fromNode || !toNode) return [];
    if (!fromNode.position || !toNode.position) return [];

    const fromPort = fromNode.outputPorts.find((p) => p.id === fromPortId);
    const toPort = toNode.inputPorts.find((p) => p.id === toPortId);
    if (!fromPort || !toPort) return [];
    if (!fromPort.position || !toPort.position) return [];

    const startX = fromNode.position.x + fromPort.position.x;
    const startY = fromNode.position.y + fromPort.position.y;
    const endX = toNode.position.x + toPort.position.x;
    const endY = toNode.position.y + toPort.position.y;

    const midX = (startX + endX) / 2;

    return [
      { x: startX, y: startY },
      { x: midX, y: startY },
      { x: midX, y: endY },
      { x: endX, y: endY },
    ];
  }

  toggleInput(nodeId: string): void {
    const state = this.stateSubject.value;
    const nodes = state.nodes.map((n) => {
      if (n.id === nodeId && n.type === 'INPUT') {
        const newValue = n.value === 1 ? 0 : 1;
        return {
          ...n,
          value: newValue as SignalValue,
          outputPorts: n.outputPorts.map((p) => ({ ...p, value: newValue as SignalValue })),
        };
      }
      return n;
    });
    this.stateSubject.next({ ...state, nodes });
    this.propagateSignals();
  }

  propagateSignals(): void {
    const state = this.stateSubject.value;
    const nodes = [...state.nodes];
    const wires = [...state.wires];

    const order = this.topologicalSort(nodes, wires);
    if (!order) {
      this.stateSubject.next({ ...state, hasFeedbackLoop: true });
      return;
    }

    const nodeMap = new Map<string, CircuitNode>();
    nodes.forEach((n) => nodeMap.set(n.id, n));

    const wireMap = new Map<string, Wire>();
    wires.forEach((w) => wireMap.set(w.id, w));

    for (const nodeId of order) {
      const node = nodeMap.get(nodeId);
      if (!node) continue;

      if (node.type === 'INPUT') {
        node.outputPorts.forEach((p) => {
          p.value = node.value ?? null;
        });
      } else if (node.type === 'OUTPUT') {
        const inputWire = wires.find((w) => w.toNodeId === nodeId);
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
        const inputValues: SignalValue[] = [];
        for (const port of node.inputPorts) {
          const inputWire = wires.find((w) => w.toNodeId === nodeId && w.toPortId === port.id);
          if (inputWire) {
            const fromNode = nodeMap.get(inputWire.fromNodeId);
            const fromPort = fromNode?.outputPorts.find((p) => p.id === inputWire.fromPortId);
            port.value = fromPort?.value ?? null;
            inputValues.push(fromPort?.value ?? null);
          } else {
            port.value = null;
            inputValues.push(null);
          }
        }

        const outputValue = this.calculateGateOutput(node.type, inputValues);
        node.value = outputValue;
        node.outputPorts.forEach((p) => {
          p.value = outputValue;
        });
      }
    }

    const updatedWires = wires.map((w) => {
      const fromNode = nodeMap.get(w.fromNodeId);
      const fromPort = fromNode?.outputPorts.find((p) => p.id === w.fromPortId);
      return { ...w, value: fromPort?.value ?? null };
    });

    this.stateSubject.next({
      ...state,
      nodes: Array.from(nodeMap.values()),
      wires: updatedWires,
      hasFeedbackLoop: false,
    });
  }

  calculateGateOutput(type: GateType, inputs: SignalValue[]): SignalValue {
    if (inputs.some((i) => i === null)) return null;

    const a = inputs[0] as number;
    const b = inputs[1] as number;

    switch (type) {
      case 'AND':
        return (a & b) as SignalValue;
      case 'OR':
        return (a | b) as SignalValue;
      case 'NOT':
        return (1 - a) as SignalValue;
      case 'NAND':
        return (1 - (a & b)) as SignalValue;
      case 'NOR':
        return (1 - (a | b)) as SignalValue;
      case 'XOR':
        return (a ^ b) as SignalValue;
      case 'XNOR':
        return (1 - (a ^ b)) as SignalValue;
      default:
        return null;
    }
  }

  topologicalSort(nodes: CircuitNode[], wires: Wire[]): string[] | null {
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

  selectNode(nodeId: string, addToSelection = false): void {
    const state = this.stateSubject.value;
    let selectedNodeIds: string[];
    if (addToSelection) {
      if (state.selectedNodeIds.includes(nodeId)) {
        selectedNodeIds = state.selectedNodeIds.filter((id) => id !== nodeId);
      } else {
        selectedNodeIds = [...state.selectedNodeIds, nodeId];
      }
    } else {
      selectedNodeIds = [nodeId];
    }
    this.stateSubject.next({
      ...state,
      selectedNodeIds,
      selectedWireIds: addToSelection ? state.selectedWireIds : [],
    });
  }

  deselectAll(): void {
    const state = this.stateSubject.value;
    this.stateSubject.next({
      ...state,
      selectedNodeIds: [],
      selectedWireIds: [],
    });
  }

  selectWire(wireId: string, addToSelection = false): void {
    const state = this.stateSubject.value;
    let selectedWireIds: string[];
    if (addToSelection) {
      if (state.selectedWireIds.includes(wireId)) {
        selectedWireIds = state.selectedWireIds.filter((id) => id !== wireId);
      } else {
        selectedWireIds = [...state.selectedWireIds, wireId];
      }
    } else {
      selectedWireIds = [wireId];
    }
    this.stateSubject.next({
      ...state,
      selectedWireIds,
      selectedNodeIds: addToSelection ? state.selectedNodeIds : [],
    });
  }

  getSelectedNodes(): CircuitNode[] {
    const state = this.stateSubject.value;
    return state.nodes.filter((n) => state.selectedNodeIds.includes(n.id));
  }

  clearAll(): void {
    this.nodeIdCounter = 0;
    this.wireIdCounter = 0;
    this.stateSubject.next({
      nodes: [],
      wires: [],
      selectedNodeIds: [],
      selectedWireIds: [],
      hasFeedbackLoop: false,
    });
  }

  loadCircuit(nodes: CircuitNode[], wires: Wire[]): void {
    let maxNodeNum = 0;
    let maxWireNum = 0;

    nodes.forEach((n) => {
      const match = n.id.match(/node_(\d+)/);
      if (match) {
        maxNodeNum = Math.max(maxNodeNum, parseInt(match[1], 10));
      }
    });

    wires.forEach((w) => {
      const match = w.id.match(/wire_(\d+)/);
      if (match) {
        maxWireNum = Math.max(maxWireNum, parseInt(match[1], 10));
      }
    });

    this.nodeIdCounter = maxNodeNum;
    this.wireIdCounter = maxWireNum;

    const updatedWires = wires.map((w) => ({
      ...w,
      points: this.calculateWirePoints(w.fromNodeId, w.fromPortId, w.toNodeId, w.toPortId, nodes),
    }));

    this.stateSubject.next({
      nodes,
      wires: updatedWires,
      selectedNodeIds: [],
      selectedWireIds: [],
      hasFeedbackLoop: false,
    });
    this.propagateSignals();
  }

  getHistoryState(): HistoryState {
    const state = this.stateSubject.value;
    return {
      nodes: JSON.parse(JSON.stringify(state.nodes)),
      wires: JSON.parse(JSON.stringify(state.wires)),
    };
  }

  restoreHistoryState(historyState: HistoryState): void {
    this.loadCircuit(
      JSON.parse(JSON.stringify(historyState.nodes)),
      JSON.parse(JSON.stringify(historyState.wires))
    );
  }
}
