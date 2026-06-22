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
  TimingSimulationState,
  SignalWaveform,
  TimingPoint,
  InputSignalEdit,
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

  private timingStateSubject = new BehaviorSubject<TimingSimulationState>({
    isEnabled: false,
    totalTime: 100,
    currentTime: 0,
    isPlaying: false,
    speed: 1,
    waveforms: [],
  });
  timingState$: Observable<TimingSimulationState> = this.timingStateSubject.asObservable();

  private inputSignalEdits = new Map<string, InputSignalEdit>();
  private allNodeWaveforms = new Map<string, TimingPoint[]>();
  private preTimingState: { nodes: CircuitNode[]; wires: Wire[] } | null = null;

  private nodeIdCounter = 0;
  private wireIdCounter = 0;

  get timingState(): TimingSimulationState {
    return this.timingStateSubject.value;
  }

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

    const delay = type === 'INPUT' ? 0 : 10;

    return {
      id,
      type,
      position: { x, y },
      label,
      inputPorts,
      outputPorts,
      value: type === 'INPUT' ? 0 : null,
      delay,
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
    if (this.timingStateSubject.value.isEnabled) {
      this.generateWaveforms();
      this.updateCircuitForTime(this.timingStateSubject.value.currentTime);
    }
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
    if (this.timingStateSubject.value.isEnabled) {
      this.generateWaveforms();
      this.updateCircuitForTime(this.timingStateSubject.value.currentTime);
    }
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
    if (this.timingStateSubject.value.isEnabled) {
      this.generateWaveforms();
      this.updateCircuitForTime(this.timingStateSubject.value.currentTime);
    }
    return wire;
  }

  removeWire(wireId: string): void {
    const state = this.stateSubject.value;
    const wires = state.wires.filter((w) => w.id !== wireId);
    const selectedWireIds = state.selectedWireIds.filter((id) => id !== wireId);
    this.stateSubject.next({ ...state, wires, selectedWireIds });
    this.propagateSignals();
    if (this.timingStateSubject.value.isEnabled) {
      this.generateWaveforms();
      this.updateCircuitForTime(this.timingStateSubject.value.currentTime);
    }
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

  setNodeDelay(nodeId: string, delay: number): void {
    const state = this.stateSubject.value;
    const nodes = state.nodes.map((n) =>
      n.id === nodeId && n.type !== 'INPUT' ? { ...n, delay: Math.max(0, delay) } : n
    );
    this.stateSubject.next({ ...state, nodes });
    if (this.timingStateSubject.value.isEnabled) {
      this.generateWaveforms();
    }
  }

  toggleTimingSimulation(): void {
    const current = this.timingStateSubject.value;
    const isEnabled = !current.isEnabled;

    if (isEnabled) {
      this.preTimingState = {
        nodes: JSON.parse(JSON.stringify(this.stateSubject.value.nodes)),
        wires: JSON.parse(JSON.stringify(this.stateSubject.value.wires)),
      };
      this.initInputSignalEdits();

      this.timingStateSubject.next({
        ...current,
        isEnabled: true,
        isPlaying: false,
        currentTime: 0,
      });

      this.generateWaveforms();
      this.updateCircuitForTime(0);
    } else {
      if (this.preTimingState) {
        this.stateSubject.next({
          ...this.stateSubject.value,
          nodes: this.preTimingState.nodes,
          wires: this.preTimingState.wires,
        });
        this.preTimingState = null;
      }
      this.allNodeWaveforms.clear();

      this.timingStateSubject.next({
        isEnabled: false,
        totalTime: current.totalTime,
        currentTime: 0,
        isPlaying: false,
        speed: current.speed,
        waveforms: [],
      });
    }
  }

  setTotalTime(totalTime: number): void {
    const current = this.timingStateSubject.value;
    this.timingStateSubject.next({
      ...current,
      totalTime: Math.max(10, totalTime),
    });
    if (current.isEnabled) {
      this.generateWaveforms();
    }
  }

  setCurrentTime(time: number): void {
    const current = this.timingStateSubject.value;
    const clampedTime = Math.max(0, Math.min(current.totalTime, time));
    this.timingStateSubject.next({
      ...current,
      currentTime: clampedTime,
    });
    this.updateCircuitForTime(clampedTime);
  }

  setPlaying(playing: boolean): void {
    const current = this.timingStateSubject.value;
    this.timingStateSubject.next({
      ...current,
      isPlaying: playing,
    });
  }

  setSpeed(speed: number): void {
    const current = this.timingStateSubject.value;
    this.timingStateSubject.next({
      ...current,
      speed,
    });
  }

  private initInputSignalEdits(): void {
    const state = this.stateSubject.value;
    const inputNodes = state.nodes.filter((n) => n.type === 'INPUT');
    this.inputSignalEdits.clear();
    inputNodes.forEach((node) => {
      this.inputSignalEdits.set(node.id, {
        nodeId: node.id,
        transitions: [],
        initialValue: node.value ?? 0,
      });
    });
  }

  getInputSignalEdit(nodeId: string): InputSignalEdit | undefined {
    return this.inputSignalEdits.get(nodeId);
  }

  setInputSignalEdit(nodeId: string, edit: InputSignalEdit): void {
    this.inputSignalEdits.set(nodeId, edit);
    if (this.timingStateSubject.value.isEnabled) {
      this.generateWaveforms();
    }
  }

  addTransition(nodeId: string, time: number): void {
    const edit = this.inputSignalEdits.get(nodeId);
    if (!edit) return;

    const totalTime = this.timingStateSubject.value.totalTime;
    const clampedTime = Math.max(0, Math.min(totalTime, time));

    const existingIndex = edit.transitions.findIndex((t) => Math.abs(t - clampedTime) < 1);
    if (existingIndex >= 0) {
      edit.transitions.splice(existingIndex, 1);
    } else {
      edit.transitions.push(clampedTime);
      edit.transitions.sort((a, b) => a - b);
    }

    this.inputSignalEdits.set(nodeId, edit);
    if (this.timingStateSubject.value.isEnabled) {
      this.generateWaveforms();
    }
  }

  setInitialValue(nodeId: string, value: SignalValue): void {
    const edit = this.inputSignalEdits.get(nodeId);
    if (!edit) return;
    edit.initialValue = value;
    this.inputSignalEdits.set(nodeId, edit);
    if (this.timingStateSubject.value.isEnabled) {
      this.generateWaveforms();
    }
  }

  getSignalValueAtTime(waveform: SignalWaveform, time: number): SignalValue {
    if (waveform.points.length === 0) return null;

    let value: SignalValue = waveform.points[0].value;
    for (const point of waveform.points) {
      if (point.time <= time) {
        value = point.value;
      } else {
        break;
      }
    }
    return value;
  }

  private generateWaveforms(): void {
    const state = this.stateSubject.value;
    const timing = this.timingStateSubject.value;
    const totalTime = timing.totalTime;

    const inputNodes = state.nodes.filter((n) => n.type === 'INPUT');
    const outputNodes = state.nodes.filter((n) => n.type === 'OUTPUT');
    const gateNodes = state.nodes.filter((n) => n.type !== 'INPUT' && n.type !== 'OUTPUT');

    const allNodes = [...inputNodes, ...gateNodes, ...outputNodes];
    const nodeMap = new Map<string, CircuitNode>();
    allNodes.forEach((n) => nodeMap.set(n.id, n));

    const order = this.topologicalSort(allNodes, state.wires);
    if (!order) return;

    const waveforms: SignalWaveform[] = [];
    const nodeOutputWaveforms = new Map<string, TimingPoint[]>();

    for (const nodeId of order) {
      const node = nodeMap.get(nodeId);
      if (!node) continue;

      let points: TimingPoint[] = [];

      if (node.type === 'INPUT') {
        points = this.generateInputWaveform(node.id, totalTime);
      } else if (node.type === 'OUTPUT') {
        const inputWire = state.wires.find((w) => w.toNodeId === nodeId);
        if (inputWire) {
          const inputWaveform = nodeOutputWaveforms.get(inputWire.fromNodeId);
          if (inputWaveform) {
            points = [...inputWaveform];
          }
        }
      } else {
        points = this.generateGateWaveform(node, state.wires, nodeOutputWaveforms, totalTime);
      }

      nodeOutputWaveforms.set(nodeId, points);

      if (node.type === 'INPUT' || node.type === 'OUTPUT') {
        waveforms.push({
          signalId: node.id,
          signalName: node.label || node.id,
          type: node.type === 'INPUT' ? 'input' : 'output',
          points,
        });
      }
    }

    this.allNodeWaveforms = nodeOutputWaveforms;

    this.timingStateSubject.next({
      ...timing,
      waveforms,
    });
  }

  private generateInputWaveform(nodeId: string, totalTime: number): TimingPoint[] {
    const edit = this.inputSignalEdits.get(nodeId);
    if (!edit) {
      return [{ time: 0, value: 0 }];
    }

    const points: TimingPoint[] = [];
    let currentValue = edit.initialValue ?? 0;

    points.push({ time: 0, value: currentValue });

    for (const transitionTime of edit.transitions) {
      if (transitionTime > 0 && transitionTime <= totalTime) {
        currentValue = currentValue === 1 ? 0 : 1;
        points.push({ time: transitionTime, value: currentValue as SignalValue });
      }
    }

    return points;
  }

  private generateGateWaveform(
    node: CircuitNode,
    wires: Wire[],
    nodeOutputWaveforms: Map<string, TimingPoint[]>,
    totalTime: number
  ): TimingPoint[] {
    const inputWire = wires.find((w) => w.toNodeId === node.id && w.toPortId === node.inputPorts[0]?.id);
    if (!inputWire) {
      return [{ time: 0, value: null }];
    }

    const inputWaveform = nodeOutputWaveforms.get(inputWire.fromNodeId);
    if (!inputWaveform || inputWaveform.length === 0) {
      return [{ time: 0, value: null }];
    }

    if (node.inputPorts.length === 1) {
      return this.generateSingleInputGateWaveform(node, inputWaveform, totalTime);
    } else {
      const inputWire2 = wires.find((w) => w.toNodeId === node.id && w.toPortId === node.inputPorts[1]?.id);
      if (!inputWire2) {
        return [{ time: 0, value: null }];
      }
      const inputWaveform2 = nodeOutputWaveforms.get(inputWire2.fromNodeId);
      if (!inputWaveform2) {
        return [{ time: 0, value: null }];
      }
      return this.generateDualInputGateWaveform(node, inputWaveform, inputWaveform2, totalTime);
    }
  }

  private generateSingleInputGateWaveform(
    node: CircuitNode,
    inputWaveform: TimingPoint[],
    totalTime: number
  ): TimingPoint[] {
    const delay = node.delay;
    const outputPoints: TimingPoint[] = [];

    const initialInputValue = inputWaveform[0]?.value;
    const initialOutputValue = initialInputValue !== null
      ? this.calculateGateOutput(node.type, [initialInputValue])
      : null;

    outputPoints.push({ time: 0, value: initialOutputValue });

    for (const inputPoint of inputWaveform) {
      if (inputPoint.time === 0) continue;

      const outputTime = inputPoint.time + delay;
      if (outputTime > totalTime) continue;

      const outputValue = inputPoint.value !== null
        ? this.calculateGateOutput(node.type, [inputPoint.value])
        : null;

      outputPoints.push({ time: outputTime, value: outputValue });
    }

    return outputPoints;
  }

  private findLastPoint(waveform: TimingPoint[], time: number): TimingPoint | null {
    let result: TimingPoint | null = null;
    for (const point of waveform) {
      if (point.time <= time) {
        result = point;
      } else {
        break;
      }
    }
    return result;
  }

  private generateDualInputGateWaveform(
    node: CircuitNode,
    inputWaveform1: TimingPoint[],
    inputWaveform2: TimingPoint[],
    totalTime: number
  ): TimingPoint[] {
    const delay = node.delay;
    const outputPoints: TimingPoint[] = [];

    const allEventTimes = new Set<number>();
    inputWaveform1.forEach((p) => allEventTimes.add(p.time));
    inputWaveform2.forEach((p) => allEventTimes.add(p.time));

    const sortedTimes = Array.from(allEventTimes).sort((a, b) => a - b);

    let val1: SignalValue = inputWaveform1[0]?.value ?? null;
    let val2: SignalValue = inputWaveform2[0]?.value ?? null;
    const initialOutput = this.calculateGateOutput(node.type, [val1, val2]);
    outputPoints.push({ time: 0, value: initialOutput });

    const delayedEvents: { time: number; val1: SignalValue; val2: SignalValue }[] = [];

    for (const t of sortedTimes) {
      if (t === 0) continue;

      const p1 = this.findLastPoint(inputWaveform1, t);
      const p2 = this.findLastPoint(inputWaveform2, t);

      const newVal1 = p1 ? p1.value : val1;
      const newVal2 = p2 ? p2.value : val2;

      if (newVal1 !== val1 || newVal2 !== val2) {
        val1 = newVal1 ?? val1;
        val2 = newVal2 ?? val2;
        const outputTime = t + delay;
        if (outputTime <= totalTime) {
          const outputVal = this.calculateGateOutput(node.type, [val1, val2]);
          delayedEvents.push({ time: outputTime, val1, val2 });
        }
      }
    }

    delayedEvents.sort((a, b) => a.time - b.time);

    let lastOutputVal = initialOutput;
    for (const event of delayedEvents) {
      const outputVal = this.calculateGateOutput(node.type, [event.val1, event.val2]);
      if (outputVal !== lastOutputVal) {
        outputPoints.push({ time: event.time, value: outputVal });
        lastOutputVal = outputVal;
      }
    }

    return outputPoints;
  }

  private updateCircuitForTime(time: number): void {
    const state = this.stateSubject.value;

    const nodes = state.nodes.map((node) => {
      const waveform = this.allNodeWaveforms.get(node.id);
      if (!waveform || waveform.length === 0) return node;

      const value = this.getSignalValueAtTime({ signalId: node.id, signalName: node.label || '', type: 'input', points: waveform }, time);

      return {
        ...node,
        value,
        outputPorts: node.outputPorts.map((p) => ({ ...p, value })),
        inputPorts: node.inputPorts.map((p) => ({ ...p, value })),
      };
    });

    const wires = state.wires.map((wire) => {
      const fromNode = nodes.find((n) => n.id === wire.fromNodeId);
      const fromPort = fromNode?.outputPorts.find((p) => p.id === wire.fromPortId);
      return { ...wire, value: fromPort?.value ?? null };
    });

    this.stateSubject.next({
      ...state,
      nodes,
      wires,
    });
  }

  exportVCD(): string {
    const timing = this.timingStateSubject.value;
    const waveforms = timing.waveforms;

    let vcd = '$timescale 1ns $end\n';
    vcd += '$scope module logic_circuit $end\n';

    const signalCodes: Map<string, string> = new Map();
    let codeIndex = 0;

    for (const waveform of waveforms) {
      const code = this.generateVCDCode(codeIndex++);
      signalCodes.set(waveform.signalId, code);
      vcd += `$var wire 1 ${code} ${waveform.signalName} $end\n`;
    }

    vcd += '$upscope $end\n';
    vcd += '$enddefinitions $end\n';

    vcd += '#0\n';
    for (const waveform of waveforms) {
      const code = signalCodes.get(waveform.signalId);
      const initialValue = waveform.points[0]?.value ?? 0;
      vcd += `${initialValue}${code}\n`;
    }

    const allEvents: { time: number; signalId: string; value: SignalValue }[] = [];
    for (const waveform of waveforms) {
      for (const point of waveform.points) {
        if (point.time > 0) {
          allEvents.push({ time: point.time, signalId: waveform.signalId, value: point.value });
        }
      }
    }

    allEvents.sort((a, b) => a.time - b.time);

    let lastTime = -1;
    for (const event of allEvents) {
      if (event.time !== lastTime) {
        vcd += `#${event.time}\n`;
        lastTime = event.time;
      }
      const code = signalCodes.get(event.signalId);
      vcd += `${event.value}${code}\n`;
    }

    return vcd;
  }

  private generateVCDCode(index: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    let i = index;
    do {
      result = chars[i % chars.length] + result;
      i = Math.floor(i / chars.length) - 1;
    } while (i >= 0);
    return result;
  }
}
