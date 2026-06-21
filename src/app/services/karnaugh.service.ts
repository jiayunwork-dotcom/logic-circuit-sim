import { Injectable } from '@angular/core';

export interface KMapCell {
  row: number;
  col: number;
  value: number;
  rowLabel: string;
  colLabel: string;
  grouped: boolean;
}

export interface KMapGroup {
  cells: { row: number; col: number }[];
  color: string;
  expression: string;
}

@Injectable({
  providedIn: 'root',
})
export class KarnaughService {
  private colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#00BCD4'];

  generateKMap(
    inputNames: string[],
    truthTable: { inputs: { name: string; value: number }[]; outputs: { name: string; value: number }[] }[],
    outputIndex: number
  ): { cells: KMapCell[][]; rowVars: string[]; colVars: string[]; rowCount: number; colCount: number } | null {
    const varCount = inputNames.length;
    if (varCount < 2 || varCount > 4) return null;

    const rowVarCount = Math.ceil(varCount / 2);
    const colVarCount = varCount - rowVarCount;

    const rowVars = inputNames.slice(0, rowVarCount);
    const colVars = inputNames.slice(rowVarCount);

    const rowCount = Math.pow(2, rowVarCount);
    const colCount = Math.pow(2, colVarCount);

    const cells: KMapCell[][] = [];
    for (let r = 0; r < rowCount; r++) {
      const row: KMapCell[] = [];
      for (let c = 0; c < colCount; c++) {
        const rowGray = this.grayCode(r, rowVarCount);
        const colGray = this.grayCode(c, colVarCount);

        const inputValues: { [key: string]: number } = {};
        for (let i = 0; i < rowVarCount; i++) {
          inputValues[rowVars[i]] = (rowGray >> (rowVarCount - 1 - i)) & 1;
        }
        for (let i = 0; i < colVarCount; i++) {
          inputValues[colVars[i]] = (colGray >> (colVarCount - 1 - i)) & 1;
        }

        const rowIndex = this.getTruthTableRowIndex(inputNames, inputValues, truthTable);
        const value = rowIndex >= 0 ? truthTable[rowIndex].outputs[outputIndex]?.value ?? 0 : 0;

        row.push({
          row: r,
          col: c,
          value,
          rowLabel: this.binaryToString(rowGray, rowVarCount),
          colLabel: this.binaryToString(colGray, colVarCount),
          grouped: false,
        });
      }
      cells.push(row);
    }

    return { cells, rowVars, colVars, rowCount, colCount };
  }

  findPrimeImplicants(
    kmap: { cells: KMapCell[][]; rowVars: string[]; colVars: string[]; rowCount: number; colCount: number },
    inputNames: string[]
  ): KMapGroup[] {
    const { cells, rowCount, colCount } = kmap;
    const groups: KMapGroup[] = [];
    const groupedCells = new Set<string>();

    const sizes = [8, 4, 2, 1];

    for (const size of sizes) {
      for (let r = 0; r < rowCount; r++) {
        for (let c = 0; c < colCount; c++) {
          const groupCells = this.findGroup(cells, r, c, size, rowCount, colCount, groupedCells);
          if (groupCells.length > 0) {
            const expression = this.getGroupExpression(groupCells, inputNames, kmap);
            const color = this.colors[groups.length % this.colors.length];
            groups.push({ cells: groupCells, color, expression });
            groupCells.forEach((cell) => groupedCells.add(`${cell.row},${cell.col}`));
          }
        }
      }
    }

    return groups;
  }

  private findGroup(
    cells: KMapCell[][],
    startRow: number,
    startCol: number,
    size: number,
    rowCount: number,
    colCount: number,
    groupedCells: Set<string>
  ): { row: number; col: number }[] {
    const group: { row: number; col: number }[] = [];

    const rowSpan = size <= colCount ? 1 : size / colCount;
    const colSpan = size <= colCount ? size : colCount;

    for (let i = 0; i < rowSpan; i++) {
      for (let j = 0; j < colSpan; j++) {
        const r = (startRow + i) % rowCount;
        const c = (startCol + j) % colCount;
        const key = `${r},${c}`;

        if (cells[r][c].value !== 1) return [];
        if (groupedCells.has(key)) return [];

        group.push({ row: r, col: c });
      }
    }

    if (group.length !== size) return [];

    return group;
  }

  private getGroupExpression(
    group: { row: number; col: number }[],
    inputNames: string[],
    kmap: { cells: KMapCell[][]; rowVars: string[]; colVars: string[]; rowCount: number; colCount: number }
  ): string {
    const { cells, rowVars, colVars, rowCount, colCount } = kmap;
    const terms: string[] = [];

    for (let i = 0; i < rowVars.length; i++) {
      const values = new Set<number>();
      for (const cell of group) {
        const gray = this.grayCode(cell.row, rowVars.length);
        values.add((gray >> (rowVars.length - 1 - i)) & 1);
      }
      if (values.size === 1) {
        const val = values.values().next().value;
        terms.push(val === 1 ? rowVars[i] : `${rowVars[i]}'`);
      }
    }

    for (let i = 0; i < colVars.length; i++) {
      const values = new Set<number>();
      for (const cell of group) {
        const gray = this.grayCode(cell.col, colVars.length);
        values.add((gray >> (colVars.length - 1 - i)) & 1);
      }
      if (values.size === 1) {
        const val = values.values().next().value;
        terms.push(val === 1 ? colVars[i] : `${colVars[i]}'`);
      }
    }

    return terms.join('');
  }

  getMinimalExpression(groups: KMapGroup[]): string {
    if (groups.length === 0) return '0';
    return groups.map((g) => g.expression || '1').join(' + ');
  }

  private grayCode(n: number, bits: number): number {
    return n ^ (n >> 1);
  }

  private binaryToString(n: number, bits: number): string {
    return n.toString(2).padStart(bits, '0');
  }

  private getTruthTableRowIndex(
    inputNames: string[],
    inputValues: { [key: string]: number },
    truthTable: { inputs: { name: string; value: number }[] }[]
  ): number {
    for (let i = 0; i < truthTable.length; i++) {
      let match = true;
      for (let j = 0; j < inputNames.length; j++) {
        const tableVal = truthTable[i].inputs.find((inp) => inp.name === inputNames[j])?.value;
        if (tableVal !== inputValues[inputNames[j]]) {
          match = false;
          break;
        }
      }
      if (match) return i;
    }
    return -1;
  }
}
