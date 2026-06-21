import { Injectable } from '@angular/core';
import { Level, TruthTableRow } from '../models/circuit.models';

@Injectable({
  providedIn: 'root',
})
export class LevelService {
  private levels: Level[] = [
    {
      id: 1,
      name: '第一关：非门',
      description: '实现一个 NOT 门（反相器）。输入为1时输出为0，输入为0时输出为1。',
      inputNames: ['A'],
      outputNames: ['Y'],
      hint: '使用一个 NOT 门即可完成。',
      targetTruthTable: this.generateTruthTable(['A'], ['Y'], (inputs) => [1 - inputs[0]]),
    },
    {
      id: 2,
      name: '第二关：与门',
      description: '实现一个 2 输入 AND 门。只有当两个输入都为1时输出才为1。',
      inputNames: ['A', 'B'],
      outputNames: ['Y'],
      hint: '使用一个 AND 门。',
      targetTruthTable: this.generateTruthTable(['A', 'B'], ['Y'], (inputs) => [inputs[0] & inputs[1]]),
    },
    {
      id: 3,
      name: '第三关：或门',
      description: '实现一个 2 输入 OR 门。只要有一个输入为1输出就为1。',
      inputNames: ['A', 'B'],
      outputNames: ['Y'],
      hint: '使用一个 OR 门。',
      targetTruthTable: this.generateTruthTable(['A', 'B'], ['Y'], (inputs) => [inputs[0] | inputs[1]]),
    },
    {
      id: 4,
      name: '第四关：与非门',
      description: '用 AND 门和 NOT 门组合实现 NAND 功能。',
      inputNames: ['A', 'B'],
      outputNames: ['Y'],
      hint: 'AND 门的输出再接一个 NOT 门。',
      targetTruthTable: this.generateTruthTable(['A', 'B'], ['Y'], (inputs) => [1 - (inputs[0] & inputs[1])]),
    },
    {
      id: 5,
      name: '第五关：异或门',
      description: '使用基础门（AND、OR、NOT）实现 XOR 功能。输入不同时输出为1。',
      inputNames: ['A', 'B'],
      outputNames: ['Y'],
      hint: 'Y = A\'B + AB\'',
      targetTruthTable: this.generateTruthTable(['A', 'B'], ['Y'], (inputs) => [inputs[0] ^ inputs[1]]),
    },
    {
      id: 6,
      name: '第六关：3输入多数表决器',
      description: '实现一个 3 输入多数表决器。当有 2 个或 3 个输入为 1 时输出为 1。',
      inputNames: ['A', 'B', 'C'],
      outputNames: ['Y'],
      hint: 'Y = AB + BC + AC',
      targetTruthTable: this.generateTruthTable(['A', 'B', 'C'], ['Y'], (inputs) => {
        const count = inputs[0] + inputs[1] + inputs[2];
        return [count >= 2 ? 1 : 0];
      }),
    },
    {
      id: 7,
      name: '第七关：半加器',
      description: '实现半加器。输入 A、B，输出 Sum（和）和 Carry（进位）。',
      inputNames: ['A', 'B'],
      outputNames: ['Sum', 'Carry'],
      hint: 'Sum = A XOR B, Carry = A AND B',
      targetTruthTable: this.generateTruthTable(['A', 'B'], ['Sum', 'Carry'], (inputs) => [
        inputs[0] ^ inputs[1],
        inputs[0] & inputs[1],
      ]),
    },
    {
      id: 8,
      name: '第八关：全加器',
      description: '实现全加器。输入 A、B、Cin，输出 Sum 和 Cout。',
      inputNames: ['A', 'B', 'Cin'],
      outputNames: ['Sum', 'Cout'],
      hint: 'Sum = A XOR B XOR Cin',
      targetTruthTable: this.generateTruthTable(['A', 'B', 'Cin'], ['Sum', 'Cout'], (inputs) => {
        const sum = inputs[0] + inputs[1] + inputs[2];
        return [sum & 1, sum >= 2 ? 1 : 0];
      }),
    },
    {
      id: 9,
      name: '第九关：2选1多路选择器',
      description: '实现 2 选 1 多路选择器。S=0 时输出 A，S=1 时输出 B。',
      inputNames: ['A', 'B', 'S'],
      outputNames: ['Y'],
      hint: 'Y = A·S\' + B·S',
      targetTruthTable: this.generateTruthTable(['A', 'B', 'S'], ['Y'], (inputs) => {
        return [inputs[2] === 0 ? inputs[0] : inputs[1]];
      }),
    },
    {
      id: 10,
      name: '第十关：1位比较器',
      description: '实现 1 位比较器。A < B 输出 1，否则输出 0。',
      inputNames: ['A', 'B'],
      outputNames: ['ALessB'],
      hint: 'ALessB = A\' · B',
      targetTruthTable: this.generateTruthTable(['A', 'B'], ['ALessB'], (inputs) => {
        return [inputs[0] < inputs[1] ? 1 : 0];
      }),
    },
  ];

  private generateTruthTable(
    inputNames: string[],
    outputNames: string[],
    compute: (inputs: number[]) => number[]
  ): TruthTableRow[] {
    const rows: TruthTableRow[] = [];
    const inputCount = inputNames.length;
    const rowCount = Math.pow(2, inputCount);

    for (let i = 0; i < rowCount; i++) {
      const inputValues: number[] = [];
      const inputs: { name: string; value: number }[] = [];

      for (let j = 0; j < inputCount; j++) {
        const val = (i >> (inputCount - 1 - j)) & 1;
        inputValues.push(val);
        inputs.push({ name: inputNames[j], value: val });
      }

      const outputValues = compute(inputValues);
      const outputs = outputNames.map((name, idx) => ({
        name,
        value: outputValues[idx] ?? 0,
      }));

      rows.push({ inputs, outputs });
    }

    return rows;
  }

  getLevels(): Level[] {
    return this.levels;
  }

  getLevel(id: number): Level | undefined {
    return this.levels.find((l) => l.id === id);
  }

  verifyLevel(level: Level, studentTruthTable: TruthTableRow[]): {
    passed: boolean;
    mismatchedRows: number[];
  } {
    const mismatchedRows: number[] = [];

    if (studentTruthTable.length !== level.targetTruthTable.length) {
      return { passed: false, mismatchedRows: [0] };
    }

    for (let i = 0; i < level.targetTruthTable.length; i++) {
      const target = level.targetTruthTable[i];
      const student = studentTruthTable[i];

      if (student.outputs.length !== target.outputs.length) {
        mismatchedRows.push(i);
        continue;
      }

      let match = true;
      for (let j = 0; j < target.outputs.length; j++) {
        if (student.outputs[j].value !== target.outputs[j].value) {
          match = false;
          break;
        }
      }

      if (!match) {
        mismatchedRows.push(i);
      }
    }

    return {
      passed: mismatchedRows.length === 0,
      mismatchedRows,
    };
  }

  getCompletedLevels(): number[] {
    const saved = localStorage.getItem('completed_levels');
    return saved ? JSON.parse(saved) : [];
  }

  completeLevel(levelId: number): void {
    const completed = this.getCompletedLevels();
    if (!completed.includes(levelId)) {
      completed.push(levelId);
      localStorage.setItem('completed_levels', JSON.stringify(completed));
    }
  }
}
