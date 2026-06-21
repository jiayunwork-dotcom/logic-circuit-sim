import { Injectable } from '@angular/core';
import { CircuitNode, Wire } from '../models/circuit.models';
import { CircuitService } from './circuit.service';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private readonly STORAGE_KEY = 'logic_circuit_save';

  constructor(private circuitService: CircuitService) {}

  saveToLocalStorage(): void {
    const state = this.circuitService.state;
    const data = {
      nodes: state.nodes,
      wires: state.wires,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  }

  loadFromLocalStorage(): boolean {
    const data = localStorage.getItem(this.STORAGE_KEY);
    if (!data) return false;

    try {
      const parsed = JSON.parse(data);
      this.circuitService.loadCircuit(parsed.nodes || [], parsed.wires || []);
      return true;
    } catch {
      return false;
    }
  }

  hasSavedCircuit(): boolean {
    return !!localStorage.getItem(this.STORAGE_KEY);
  }

  exportToJSON(): string {
    const state = this.circuitService.state;
    const data = {
      nodes: state.nodes,
      wires: state.wires,
      version: '1.0',
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  }

  downloadJSON(filename = 'circuit.json'): void {
    const json = this.exportToJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  importFromJSON(json: string): boolean {
    try {
      const parsed = JSON.parse(json);
      if (!parsed.nodes || !parsed.wires) return false;
      this.circuitService.loadCircuit(parsed.nodes, parsed.wires);
      return true;
    } catch {
      return false;
    }
  }

  importFromFile(file: File): Promise<boolean> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(this.importFromJSON(content));
      };
      reader.onerror = () => resolve(false);
      reader.readAsText(file);
    });
  }

  clearLocalStorage(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}
