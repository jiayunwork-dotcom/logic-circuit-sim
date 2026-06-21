import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LevelService } from '../../services/level.service';
import { Level } from '../../models/circuit.models';

@Component({
  selector: 'app-level-panel',
  standalone: true,
  imports: [CommonModule],
  providers: [LevelService],
  template: `
    <div class="level-panel">
      <div class="panel-header">
        <h3>教学关卡</h3>
        <button class="btn-close" (click)="onClose()">×</button>
      </div>

      <div class="level-list">
        <div
          *ngFor="let level of levels"
          class="level-item"
          [class.completed]="isCompleted(level.id)"
          (click)="onSelectLevel(level)"
        >
          <div class="level-number">{{ level.id }}</div>
          <div class="level-info">
            <div class="level-name">{{ level.name }}</div>
            <div class="level-desc">{{ level.description }}</div>
          </div>
          <div class="level-status">
            <span *ngIf="isCompleted(level.id)" class="status-done">✓</span>
          </div>
        </div>
      </div>

      <div class="current-level" *ngIf="selectedLevel">
        <h4>{{ selectedLevel.name }}</h4>
        <p class="level-desc">{{ selectedLevel.description }}</p>
        <div class="level-hint" *ngIf="selectedLevel.hint">
          <strong>提示：</strong>{{ selectedLevel.hint }}
        </div>
        <div class="level-actions">
          <button class="btn btn-primary" (click)="onStartLevel(selectedLevel)">
            开始挑战
          </button>
          <button class="btn" (click)="onVerify()">
            验证电路
          </button>
        </div>
      </div>

      <div *ngIf="verificationResult !== null" class="verification-result">
        <div *ngIf="verificationResult" class="result-success">
          <h4>🎉 恭喜通关！</h4>
          <p>你的电路真值表与目标完全一致。</p>
        </div>
        <div *ngIf="!verificationResult" class="result-fail">
          <h4>❌ 未通过</h4>
          <p>电路输出与目标不一致，请再检查一下。</p>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
    .level-panel {
      width: 350px;
      background: #fff;
      border-left: 1px solid #ddd;
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .panel-header {
      padding: 12px 16px;
      border-bottom: 1px solid #ddd;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .panel-header h3 {
      margin: 0;
      font-size: 16px;
      color: #333;
    }

    .btn-close {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #888;
      line-height: 1;
    }

    .btn-close:hover {
      color: #333;
    }

    .level-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }

    .level-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.2s;
      margin-bottom: 4px;
    }

    .level-item:hover {
      background: #f0f0f0;
    }

    .level-item.completed {
      background: #e8f5e9;
    }

    .level-number {
      width: 32px;
      height: 32px;
      background: #2196F3;
      color: #fff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 14px;
    }

    .level-item.completed .level-number {
      background: #4CAF50;
    }

    .level-info {
      flex: 1;
      min-width: 0;
    }

    .level-name {
      font-weight: 600;
      color: #333;
      font-size: 14px;
    }

    .level-desc {
      font-size: 12px;
      color: #666;
      margin-top: 2px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .level-status {
      font-size: 18px;
    }

    .status-done {
      color: #4CAF50;
    }

    .current-level {
      padding: 16px;
      border-top: 1px solid #ddd;
    }

    .current-level h4 {
      margin: 0 0 8px 0;
      font-size: 15px;
      color: #333;
    }

    .current-level .level-desc {
      font-size: 13px;
      color: #555;
      white-space: normal;
      margin-bottom: 8px;
    }

    .level-hint {
      background: #fff3e0;
      padding: 8px;
      border-radius: 4px;
      font-size: 12px;
      color: #e65100;
      margin-bottom: 12px;
    }

    .level-actions {
      display: flex;
      gap: 8px;
    }

    .btn {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid #ccc;
      border-radius: 4px;
      background: #f5f5f5;
      cursor: pointer;
      font-size: 13px;
    }

    .btn:hover {
      background: #e8e8e8;
    }

    .btn-primary {
      background: #2196F3;
      color: #fff;
      border-color: #1976D2;
    }

    .btn-primary:hover {
      background: #1976D2;
    }

    .verification-result {
      padding: 16px;
      border-top: 1px solid #ddd;
    }

    .result-success {
      background: #e8f5e9;
      padding: 12px;
      border-radius: 6px;
    }

    .result-success h4 {
      color: #2e7d32;
      margin: 0 0 4px 0;
    }

    .result-success p {
      color: #388e3c;
      margin: 0;
      font-size: 13px;
    }

    .result-fail {
      background: #ffebee;
      padding: 12px;
      border-radius: 6px;
    }

    .result-fail h4 {
      color: #c62828;
      margin: 0 0 4px 0;
    }

    .result-fail p {
      color: #d32f2f;
      margin: 0;
      font-size: 13px;
    }
    `,
  ],
})
export class LevelPanelComponent {
  @Output() close = new EventEmitter<void>();
  @Output() startLevel = new EventEmitter<Level>();
  @Output() verifyLevel = new EventEmitter<Level>();

  levels: Level[] = [];
  selectedLevel: Level | null = null;
  verificationResult: boolean | null = null;

  constructor(private levelService: LevelService) {}

  ngOnInit(): void {
    this.levels = this.levelService.getLevels();
  }

  isCompleted(levelId: number): boolean {
    return this.levelService.getCompletedLevels().includes(levelId);
  }

  onSelectLevel(level: Level): void {
    this.selectedLevel = level;
    this.verificationResult = null;
  }

  onStartLevel(level: Level): void {
    this.startLevel.emit(level);
    this.verificationResult = null;
  }

  onVerify(): void {
    if (this.selectedLevel) {
      this.verifyLevel.emit(this.selectedLevel);
    }
  }

  setVerificationResult(passed: boolean): void {
    this.verificationResult = passed;
    if (passed && this.selectedLevel) {
      this.levelService.completeLevel(this.selectedLevel.id);
      this.levels = this.levelService.getLevels();
    }
  }

  onClose(): void {
    this.close.emit();
  }
}
