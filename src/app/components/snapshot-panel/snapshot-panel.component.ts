import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CircuitSnapshot } from '../../models/circuit.models';
import { SnapshotService, SnapshotDiffResult } from '../../services/snapshot.service';
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
            *ngFor="let snapshot of snapshots; let i = index"
            class="snapshot-item"
            [class.selected]="selectedIds.includes(snapshot.id)"
            [class.renaming]="renamingId === snapshot.id"
            [class.dragging]="dragIndex === i"
            [class.drag-over-top]="dragOverIndex === i && dragIndex !== null && dragIndex > i"
            [class.drag-over-bottom]="dragOverIndex === i && dragIndex !== null && dragIndex < i"
            draggable="true"
            (dragstart)="onDragStart(i, $event)"
            (dragover)="onDragOver(i, $event)"
            (dragleave)="onDragLeave()"
            (drop)="onDrop(i, $event)"
            (dragend)="onDragEnd()"
          >
            <div class="drag-handle" (mousedown)="$event.stopPropagation()">
              <span class="handle-dots">⋮⋮</span>
            </div>

            <div class="snapshot-select" (click)="toggleSelect(snapshot.id)">
              <div class="checkbox" [class.checked]="selectedIds.includes(snapshot.id)">
                <span *ngIf="selectedIds.includes(snapshot.id)">✓</span>
              </div>
            </div>

            <div class="snapshot-main">
              <div
                class="snapshot-header-row"
                (click)="togglePreview(snapshot.id)"
                style="cursor:pointer;"
              >
                <div *ngIf="renamingId !== snapshot.id" class="snapshot-name">
                  {{ snapshot.name }} <span class="preview-hint">[点击预览]</span>
                </div>
                <div *ngIf="renamingId === snapshot.id" class="rename-input" (click)="$event.stopPropagation()">
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

            <div *ngIf="dragOverIndex === i && dragIndex !== null && dragIndex > i" class="drop-indicator top"></div>
            <div *ngIf="dragOverIndex === i && dragIndex !== null && dragIndex < i" class="drop-indicator bottom"></div>
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
            ⚖️ 对比
          </button>
          <button
            class="btn btn-diff"
            [disabled]="selectedIds.length !== 2"
            (click)="onShowDiff()"
          >
            🔍 差异
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

    <div *ngIf="showDiffModal" class="diff-modal-backdrop" (click)="onCloseDiff()">
      <div class="diff-modal" (click)="$event.stopPropagation()">
        <div class="diff-modal-header">
          <h3>🔍 快照结构差异</h3>
          <button class="close-btn" (click)="onCloseDiff()">×</button>
        </div>

        <div class="diff-modal-subtitle">
          <span class="diff-snapshot-name">{{ getSnapshotName(selectedIds[0]) }}</span>
          <span class="diff-arrow">→</span>
          <span class="diff-snapshot-name">{{ getSnapshotName(selectedIds[1]) }}</span>
        </div>

        <div class="diff-stats" *ngIf="diffResult">
          <div class="diff-stat-item add">
            <div class="diff-stat-value">{{ diffResult.addedNodes }}</div>
            <div class="diff-stat-label">新增元件</div>
          </div>
          <div class="diff-stat-item remove">
            <div class="diff-stat-value">{{ diffResult.removedNodes }}</div>
            <div class="diff-stat-label">删除元件</div>
          </div>
          <div class="diff-stat-item move">
            <div class="diff-stat-value">{{ diffResult.movedNodes }}</div>
            <div class="diff-stat-label">移动元件</div>
          </div>
          <div class="diff-stat-item add">
            <div class="diff-stat-value">{{ diffResult.addedWires }}</div>
            <div class="diff-stat-label">新增连线</div>
          </div>
          <div class="diff-stat-item remove">
            <div class="diff-stat-value">{{ diffResult.removedWires }}</div>
            <div class="diff-stat-label">删除连线</div>
          </div>
        </div>

        <div class="diff-list" *ngIf="diffResult">
          <div class="diff-list-title">详细差异</div>
          <div *ngIf="diffResult.items.length === 0" class="diff-empty">
            两个快照结构完全相同
          </div>
          <div *ngFor="let item of diffResult.items" class="diff-item" [class.diff-add]="item.type === 'add'" [class.diff-remove]="item.type === 'remove'" [class.diff-move]="item.type === 'move'">
            <div class="diff-type-badge">
              <span *ngIf="item.type === 'add'">➕ 新增</span>
              <span *ngIf="item.type === 'remove'">➖ 删除</span>
              <span *ngIf="item.type === 'move'">↔️ 移动</span>
            </div>
            <div class="diff-content">
              <div class="diff-desc">{{ item.description }}</div>
              <div class="diff-details" *ngIf="item.details">{{ item.details }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
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
      transition: border-color 0.2s, opacity 0.2s;
      position: relative;
    }

    .snapshot-item.dragging {
      opacity: 0.5;
    }

    .drag-handle {
      flex-shrink: 0;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding-top: 4px;
      cursor: grab;
      color: #999;
      user-select: none;
      width: 20px;
    }

    .drag-handle:active {
      cursor: grabbing;
    }

    .handle-dots {
      font-size: 16px;
      line-height: 1;
      letter-spacing: -2px;
    }

    .drop-indicator {
      position: absolute;
      left: 0;
      right: 0;
      height: 4px;
      background: #2196F3;
      border-radius: 2px;
      z-index: 10;
    }

    .drop-indicator.top {
      top: -3px;
    }

    .drop-indicator.bottom {
      bottom: -3px;
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

    .preview-hint {
      font-size: 11px;
      color: #2196F3;
      font-weight: normal;
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

    .btn-diff {
      background: #9C27B0;
      color: #fff;
      border-color: #7B1FA2;
    }

    .btn-diff:hover:not(:disabled) {
      background: #7B1FA2;
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

    .diff-modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
    }

    .diff-modal {
      background: #fff;
      border-radius: 12px;
      width: 90%;
      max-width: 600px;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    }

    .diff-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid #eee;
      background: #f5f5f5;
      border-radius: 12px 12px 0 0;
    }

    .diff-modal-header h3 {
      margin: 0;
      font-size: 16px;
      color: #333;
    }

    .diff-modal-subtitle {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 12px 20px;
      background: #fafafa;
      border-bottom: 1px solid #eee;
      font-size: 13px;
      color: #666;
    }

    .diff-snapshot-name {
      font-weight: 600;
      color: #333;
      background: #fff;
      padding: 4px 12px;
      border-radius: 4px;
      border: 1px solid #ddd;
    }

    .diff-arrow {
      font-size: 18px;
      color: #999;
    }

    .diff-stats {
      display: flex;
      gap: 8px;
      padding: 16px 20px;
      border-bottom: 1px solid #eee;
      flex-wrap: wrap;
    }

    .diff-stat-item {
      flex: 1;
      min-width: 80px;
      text-align: center;
      padding: 10px 8px;
      border-radius: 6px;
      background: #f9f9f9;
    }

    .diff-stat-item.add .diff-stat-value {
      color: #4CAF50;
    }

    .diff-stat-item.remove .diff-stat-value {
      color: #f44336;
    }

    .diff-stat-item.move .diff-stat-value {
      color: #FF9800;
    }

    .diff-stat-value {
      font-size: 24px;
      font-weight: bold;
      color: #333;
    }

    .diff-stat-label {
      font-size: 11px;
      color: #666;
      margin-top: 4px;
    }

    .diff-list {
      flex: 1;
      overflow-y: auto;
      padding: 12px 20px 20px 20px;
    }

    .diff-list-title {
      font-size: 14px;
      font-weight: 600;
      color: #333;
      margin-bottom: 12px;
    }

    .diff-empty {
      text-align: center;
      padding: 30px;
      color: #999;
      font-size: 14px;
    }

    .diff-item {
      display: flex;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 6px;
      margin-bottom: 8px;
      border-left: 4px solid #ddd;
      background: #fafafa;
    }

    .diff-item.diff-add {
      border-left-color: #4CAF50;
      background: #E8F5E9;
    }

    .diff-item.diff-remove {
      border-left-color: #f44336;
      background: #FFEBEE;
    }

    .diff-item.diff-move {
      border-left-color: #FF9800;
      background: #FFF3E0;
    }

    .diff-type-badge {
      flex-shrink: 0;
      font-size: 12px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 4px;
      background: #fff;
      border: 1px solid #ddd;
      height: fit-content;
    }

    .diff-add .diff-type-badge {
      color: #2E7D32;
      border-color: #81C784;
    }

    .diff-remove .diff-type-badge {
      color: #C62828;
      border-color: #E57373;
    }

    .diff-move .diff-type-badge {
      color: #E65100;
      border-color: #FFB74D;
    }

    .diff-content {
      flex: 1;
      min-width: 0;
    }

    .diff-desc {
      font-size: 13px;
      font-weight: 500;
      color: #333;
      margin-bottom: 4px;
    }

    .diff-details {
      font-size: 12px;
      color: #666;
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
  dragIndex: number | null = null;
  dragOverIndex: number | null = null;
  isDragging = false;
  showDiffModal = false;
  diffResult: SnapshotDiffResult | null = null;

  constructor(private snapshotService: SnapshotService) {}

  ngOnInit(): void {
    this.snapshotService.snapshots$.subscribe((snapshots) => {
      this.snapshots = [...snapshots];
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

  onShowDiff(): void {
    if (this.selectedIds.length === 2) {
      this.diffResult = this.snapshotService.compareSnapshots(
        this.selectedIds[0],
        this.selectedIds[1]
      );
      this.showDiffModal = true;
    }
  }

  onCloseDiff(): void {
    this.showDiffModal = false;
    this.diffResult = null;
  }

  getSnapshotName(id: string): string {
    const snap = this.snapshots.find((s) => s.id === id);
    return snap?.name || '';
  }

  onDragStart(index: number, event: DragEvent): void {
    this.dragIndex = index;
    this.isDragging = true;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(index));
    }
  }

  onDragOver(index: number, event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    this.dragOverIndex = index;
  }

  onDragLeave(): void {
    this.dragOverIndex = null;
  }

  onDrop(index: number, event: DragEvent): void {
    event.preventDefault();
    if (this.dragIndex === null || this.dragIndex === index) {
      this.resetDragState();
      return;
    }
    this.snapshotService.reorderSnapshots(this.dragIndex, index);
    this.resetDragState();
  }

  onDragEnd(): void {
    this.resetDragState();
  }

  private resetDragState(): void {
    this.dragIndex = null;
    this.dragOverIndex = null;
    this.isDragging = false;
  }

  onClose(): void {
    this.close.emit();
  }
}
