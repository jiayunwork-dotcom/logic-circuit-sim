export type GateType = 'AND' | 'OR' | 'NOT' | 'NAND' | 'NOR' | 'XOR' | 'XNOR' | 'INPUT' | 'OUTPUT';

export type SignalValue = 0 | 1 | null;

export interface Port {
  id: string;
  type: 'input' | 'output';
  index: number;
  nodeId: string;
  position: { x: number; y: number };
  value: SignalValue;
}

export interface CircuitNode {
  id: string;
  type: GateType;
  position: { x: number; y: number };
  label?: string;
  inputPorts: Port[];
  outputPorts: Port[];
  value?: SignalValue;
  delay: number;
}

export interface Wire {
  id: string;
  fromNodeId: string;
  fromPortId: string;
  toNodeId: string;
  toPortId: string;
  value: SignalValue;
  points: { x: number; y: number }[];
}

export interface CircuitState {
  nodes: CircuitNode[];
  wires: Wire[];
  selectedNodeIds: string[];
  selectedWireIds: string[];
  hasFeedbackLoop: boolean;
}

export interface ViewState {
  offsetX: number;
  offsetY: number;
  scale: number;
}

export interface TruthTableRow {
  inputs: { name: string; value: number }[];
  outputs: { name: string; value: number }[];
}

export interface Level {
  id: number;
  name: string;
  description: string;
  targetTruthTable: TruthTableRow[];
  inputNames: string[];
  outputNames: string[];
  hint?: string;
}

export interface HistoryState {
  nodes: CircuitNode[];
  wires: Wire[];
}

export interface TimingPoint {
  time: number;
  value: SignalValue;
}

export interface SignalWaveform {
  signalId: string;
  signalName: string;
  type: 'input' | 'output';
  points: TimingPoint[];
}

export interface TimingSimulationState {
  isEnabled: boolean;
  totalTime: number;
  currentTime: number;
  isPlaying: boolean;
  speed: number;
  waveforms: SignalWaveform[];
}

export interface InputSignalEdit {
  nodeId: string;
  transitions: number[];
  initialValue: SignalValue;
}

export interface CircuitSnapshot {
  id: string;
  name: string;
  createdAt: string;
  nodes: CircuitNode[];
  wires: Wire[];
}

export interface ComparisonResult {
  inputCombination: { name: string; value: number }[];
  outputA: { name: string; value: number }[];
  outputB: { name: string; value: number }[];
  isDifferent: boolean;
}

export interface EquivalenceResult {
  isEquivalent: boolean;
  results: ComparisonResult[];
  totalCombinations: number;
  mismatchedCount: number;
  inputCount: number;
  warning?: string;
}
