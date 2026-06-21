import { Injectable } from '@angular/core';
import { HistoryState } from '../models/circuit.models';
import { CircuitService } from './circuit.service';

@Injectable({
  providedIn: 'root',
})
export class HistoryService {
  private undoStack: HistoryState[] = [];
  private redoStack: HistoryState[] = [];
  private maxHistory = 50;
  private isRestoring = false;

  constructor(private circuitService: CircuitService) {}

  saveState(): void {
    if (this.isRestoring) return;

    const state = this.circuitService.getHistoryState();
    this.undoStack.push(state);
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  undo(): boolean {
    if (this.undoStack.length <= 1) return false;

    const current = this.undoStack.pop()!;
    this.redoStack.push(current);

    const previous = this.undoStack[this.undoStack.length - 1];
    this.isRestoring = true;
    this.circuitService.restoreHistoryState(previous);
    this.isRestoring = false;
    return true;
  }

  redo(): boolean {
    if (this.redoStack.length === 0) return false;

    const next = this.redoStack.pop()!;
    this.undoStack.push(next);

    this.isRestoring = true;
    this.circuitService.restoreHistoryState(next);
    this.isRestoring = false;
    return true;
  }

  canUndo(): boolean {
    return this.undoStack.length > 1;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  reset(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.saveState();
  }
}
