import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CircuitSnapshot } from '../../models/circuit.models';
import { SnapshotService } from '../../services/snapshot.service';
import { ReadonlyCanvasComponent } from '../readonly-canvas/readonly-canvas.component';

@Component({
  selector: 'app-snapshot-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, ReadonlyCanvasComponent],
  template: `
    <div class="snapshot-drawer" [class.open]="isOpen">
      <div class="drawer-header">
        <h3>📸 电路快照</h3>
        <button class="close-btn" (click)="onClose()">×</button>
      </div>

      <div class="drawer-content">
        <div *ngIf="snapshots.length === 0" class="empty-state">
          <p>暂无快照</p>
          <p class="hint">点击顶部"拍快照"按钮保存当前电路</p>
        </div>

        <div class="snapshot-list">
          <div
            *ngFor="let snapshot of snapshots"
            class="snapshot-item"
            [class.selected]="selectedIds.includes(snapshot.id)"
            [class.renaming]="renamingId === snapshot.id"
          >
            <div class="snapshot-select" (click)="toggleSelect(snapshot.id)">
              <div class="checkbox" [class.checked]="selectedIds.includes(snapshot.id)">
                <span *ngIf="selectedIds.includes(snapshot.id)">✓</span>
              </div>
            </div>

            <div class="snapshot-main">
              <div class="snapshot-header-row">
                <div *ngIf="renamingId !== snapshot.id" class="snapshot-name">
                  {{ snapshot.name }}
                </div>
                <div *ngIf="renamingId === snapshot.id" class="rename-input">
                  <input
                    #renameInput
                    type="text"
                    [value]="snapshot.name"
                    (keyup.enter)="finishRename(snapshot.id, renameInput.value)"
                    (blur)="finishRename(snapshot.id, renameInput.value)"
                    (click)="$event.stopPropagation()"
                  />
                </div>
                <span class="snapshot-time">{{ formatTime(snapshot.createdAt) }}</span>
              </div>

              <div
                class="snapshot-thumbnail"
                (click)="togglePreview(snapshot.id)"
              >
                <app-readonly-canvas
                  *ngIf="previewId === snapshot.id"
                  [nodes]="snapshot.nodes"
                  [wires]="snapshot.wires"
                  [isThumbnail]="true"
                ></app-readonly-canvas>
                <div *ngIf="previewId !== snapshot.id" class="thumbnail-placeholder">
                  点击预览电路
                </div>
              </div>

              <div class="snapshot-stats">
                <span>{{ snapshot.nodes.length }} 元件</span>
                <span>{{ snapshot.wires.length }} 连线</span>
              </div>

              <div class="snapshot-actions">
                <button class="action-btn" (click)="startRename(snapshot.id, $event)">✏️ 重命名</button>
                <button class="action-btn" (click)="onLoad(snapshot.id, $event)">📂 加载</button>
                <button class="action-btn danger" (click)="onDelete(snapshot.id, $event)">🗑 删除</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="drawer-footer">
        <div class="selection-info" *ngIf="selectedIds.length > 0">
          已选择 {{ selectedIds.length }} 个快照
        </div>
        <div class="footer-actions">
          <button
            class="btn btn-compare"
            [disabled]="selectedIds.length !== 2"
            (click)="onCompare()"
          >
            ⚖️ 对比选中的两个
          </button>
          <button
            class="btn btn-danger"
            *ngIf="snapshots.length > 0"
            (click)="onClearAll()"
          >
            清空全部
          </button>
        </div>
      </div>
    </div>

    <div *ngIf="isOpen" class="drawer-backdrop" (click)="onClose()"></div>
  `,
  styles: [
    `
    .snapshot-drawer {
      position: fixed;
      top: 0;
      right: -400px;
      width: 400px;
      height: 100%;
      background: #fff;
      box-shadow: -2px 0 12px rgba(0,0,0,0.15);
      z-index: 1000;
      display: flex;
      flex-direction: column;
      transition: right 0.3s ease;
    }

    .snapshot-drawer.open {
      right: 0;
    }

    .drawer-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.3);
      z-index: 999;
    }

    .drawer-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid #eee;
      background: #f5f5f5;
    }

    .drawer-header h3 {
      margin: 0;
      font-size: 16px;
      color: #333;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #666;
      padding: 0 8px;
      line-height: 1;
    }

    .close-btn:hover {
      color: #333;
    }

    .drawer-content {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: #999;
    }

    .empty-state p {
      margin: 0;
    }

    .empty-state .hint {
      font-size: 12px;
      margin-top: 8px;
    }

    .snapshot-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .snapshot-item {
      display: flex;
      gap: 10px;
      padding: 12px;
      border: 2px solid #eee;
      border-radius: 8px;
      background: #fafafa;
      transition: border-color 0.2s;
    }

    .snapshot-item.selected {
      border-color: #2196F3;
      background: #e3f2fd;
    }

    .snapshot-select {
      flex-shrink: 0;
      padding-top: 4px;
      cursor: pointer;
    }

    .checkbox {
      width: 20px;
      height: 20px;
      border: 2px solid #999;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      color: #fff;
      background: #fff;
    }

    .checkbox.checked {
      background: #2196F3;
      border-color: #2196F3;
    }

    .snapshot-main {
      flex: 1;
      min-width: 0;
    }

    .snapshot-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .snapshot-name {
      font-weight: 600;
      color: #333;
      font-size: 14px;
      word-break: break-all;
    }

    .rename-input input {
      padding: 4px 8px;
      border: 1px solid #2196F3;
      border-radius: 4px;
      font-size: 13px;
      outline: none;
      width: 160px;
    }

    .snapshot-time {
      font-size: 11px;
      color: #999;
      flex-shrink: 0;
    }

    .snapshot-thumbnail {
      width: 100%;
      height: 100px;
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 4px;
      overflow: hidden;
      cursor: pointer;
      margin-bottom: 8px;
    }

    .thumbnail-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #aaa;
      font-size: 12px;
    }

    .snapshot-stats {
      display: flex;
      gap: 12px;
      font-size: 11px;
      color: #666;
      margin-bottom: 8px;
    }

    .snapshot-actions {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .action-btn {
      padding: 4px 10px;
      font-size: 11px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: #fff;
      cursor: pointer;
      color: #555;
      transition: all 0.2s;
    }

    .action-btn:hover {
      background: #f0f0f0;
      border-color: #ccc;
    }

    .action-btn.danger {
      color: #f44336;
      border-color: #ffcdd2;
    }

    .action-btn.danger:hover {
      background: #ffebee;
    }

    .drawer-footer {
      border-top: 1px solid #eee;
      padding: 12px;
      background: #f9f9f9;
    }

    .selection-info {
      font-size: 12px;
      color: #666;
      margin-bottom: 8px;
      text-align: center;
    }

    .footer-actions {
      display: flex;
      gap: 8px;
    }

    .btn {
      flex: 1;
      padding: 10px 16px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-compare {
      background: #FF9800;
      color: #fff;
    }

    .btn-compare:hover:not(:disabled) {
      background: #F57C00;
    }

    .btn-danger {
      background: #f5f5f5;
      color: #f44336;
      border: 1px solid #ffcdd2;
      flex: none;
      padding: 10px 14px;
    }

    .btn-danger:hover {
      background: #ffebee;
    }
    `,
  ],
})
export class SnapshotPanelComponent implements OnInit {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() compare = new EventEmitter<[string, string]>();
  @Output() loadSnapshot = new EventEmitter<string>();

  snapshots: CircuitSnapshot[] = [];
  selectedIds: string[] = [];
  previewId: string | null = null;
  renamingId: string | null = null;

  constructor(private snapshotService: SnapshotService) {}

  ngOnInit(): void {
    this.snapshotService.snapshots$.subscribe((snapshots) => {
      this.snapshots = [...snapshots].reverse();
      this.selectedIds = this.selectedIds.filter((id) =>
        snapshots.some((s) => s.id === id)
      );
    });
  }

  formatTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  toggleSelect(id: string): void {
    const idx = this.selectedIds.indexOf(id);
    if (idx >= 0) {
      this.selectedIds.splice(idx, 1);
    } else {
      if (this.selectedIds.length >= 2) {
        this.selectedIds.shift();
      }
      this.selectedIds.push(id);
    }
  }

  togglePreview(id: string): void {
    this.previewId = this.previewId === id ? null : id;
  }

  startRename(id: string, event: MouseEvent): void {
    event.stopPropagation();
    this.renamingId = id;
  }

  finishRename(id: string, newName: string): void {
    if (newName && newName.trim()) {
      this.snapshotService.renameSnapshot(id, newName.trim());
    }
    this.renamingId = null;
  }

  onDelete(id: string, event: MouseEvent): void {
    event.stopPropagation();
    if (confirm('确定要删除这个快照吗？')) {
      this.snapshotService.deleteSnapshot(id);
    }
  }

  onLoad(id: string, event: MouseEvent): void {
    event.stopPropagation();
    if (confirm('加载此快照将覆盖当前电路，确定继续吗？')) {
      this.snapshotService.loadSnapshotToCircuit(id);
      this.loadSnapshot.emit(id);
    }
  }

  onClearAll(): void {
    if (confirm('确定要清空所有快照吗？此操作不可恢复。')) {
      this.snapshotService.clearAllSnapshots();
      this.selectedIds = [];
    }
  }

  onCompare(): void {
    if (this.selectedIds.length === 2) {
      this.compare.emit([this.selectedIds[0], this.selectedIds[1]]);
    }
  }

  onClose(): void {
    this.close.emit();
  }
}
