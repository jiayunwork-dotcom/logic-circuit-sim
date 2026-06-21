import { Component, OnInit, OnDestroy, ElementRef, ViewChild, HostListener, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { CircuitService } from '../../services/circuit.service';
import { HistoryService } from '../../services/history.service';
import { BooleanExpressionService } from '../../services/boolean-expression.service';
import { CircuitNode, Wire, Port, SignalValue, GateType, ViewState } from '../../models/circuit.models';

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="canvas-container"
      #canvasContainer
      (dragover)="onDragOver($event)"
      (drop)="onDrop($event)"
      (wheel)="onWheel($event)"
      (mousedown)="onCanvasMouseDown($event)"
      (mousemove)="onMouseMove($event)"
      (mouseup)="onMouseUp($event)"
      (mouseleave)="onMouseUp($event)"
      (contextmenu)="onContextMenu($event)"
    >
      <svg class="canvas-svg" [style.transform]="getTransform()">
        <defs>
          <pattern id="grid-small" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 L 0 20" fill="none" stroke="#e0e0e0" stroke-width="0.5"/>
          </pattern>
          <pattern id="grid-large" width="100" height="100" patternUnits="userSpaceOnUse">
            <rect width="100" height="100" fill="url(#grid-small)"/>
            <path d="M 100 0 L 0 0 L 0 100" fill="none" stroke="#ccc" stroke-width="1"/>
          </pattern>
        </defs>
        <rect width="5000" height="5000" x="-2500" y="-2500" fill="url(#grid-large)"/>

        <g class="wires-layer">
          <g *ngFor="let wire of wires" (mousedown)="onWireMouseDown($event, wire)">
            <polyline
              [attr.points]="getWirePoints(wire)"
              [attr.stroke]="getWireColor(wire.value)"
              [attr.stroke-width]="wire.value === null ? 2 : 3"
              [attr.stroke-dasharray]="wire.value === null ? '5,5' : 'none'"
              fill="none"
              class="wire"
              [class.selected]="selectedWireIds.includes(wire.id)"
            />
          </g>
        </g>

        <g *ngIf="isDrawingWire" class="temp-wire">
          <polyline
            [attr.points]="getTempWirePoints()"
            stroke="#666"
            stroke-width="2"
            stroke-dasharray="5,5"
            fill="none"
          />
        </g>

        <g class="nodes-layer">
          <ng-container *ngFor="let node of nodes">
            <g *ngIf="node && node.position"
              [attr.transform]="getNodeTransform(node)"
              class="node-group"
              [class.selected]="selectedNodeIds.includes(node.id)"
              (mousedown)="onNodeMouseDown($event, node)"
            >
            <ng-container [ngSwitch]="node.type">
              <g *ngSwitchCase="'INPUT'" class="input-node">
                <rect
                  [attr.width]="getNodeWidth(node.type)"
                  [attr.height]="getNodeHeight(node.type)"
                  rx="8"
                  ry="8"
                  [attr.fill]="node.value === 1 ? '#4CAF50' : '#f0f0f0'"
                  stroke="#333"
                  stroke-width="2"
                  class="node-body"
                />
                <text
                  [attr.x]="getNodeWidth(node.type) / 2"
                  [attr.y]="getNodeHeight(node.type) / 2 + 4"
                  text-anchor="middle"
                  [attr.fill]="node.value === 1 ? '#fff' : '#333'"
                  font-size="14"
                  font-weight="bold"
                >{{ node.value }}</text>
                <text
                  *ngIf="node.label"
                  [attr.x]="getNodeWidth(node.type) / 2"
                  y="-8"
                  text-anchor="middle"
                  fill="#333"
                  font-size="12"
                  font-weight="bold"
                >{{ node.label }}</text>
                <circle
                  [attr.cx]="getNodeWidth(node.type)"
                  [attr.cy]="getNodeHeight(node.type) / 2"
                  r="5"
                  fill="#fff"
                  stroke="#333"
                  stroke-width="2"
                  class="port output-port"
                  (mousedown)="onPortMouseDown($event, node, node.outputPorts[0])"
                />
              </g>

              <g *ngSwitchCase="'OUTPUT'" class="output-node">
                <circle
                  [attr.cx]="getNodeWidth(node.type) / 2"
                  [attr.cy]="getNodeHeight(node.type) / 2"
                  r="18"
                  [attr.fill]="node.value === 1 ? '#4CAF50' : '#ddd'"
                  stroke="#333"
                  stroke-width="2"
                  class="node-body lamp"
                  [class.on]="node.value === 1"
                />
                <text
                  *ngIf="node.label"
                  [attr.x]="getNodeWidth(node.type) / 2"
                  y="-8"
                  text-anchor="middle"
                  fill="#333"
                  font-size="12"
                  font-weight="bold"
                >{{ node.label }}</text>
                <text
                  *ngIf="showExpressions && getNodeExpression(node.id)"
                  [attr.x]="getNodeWidth(node.type) / 2"
                  [attr.y]="getNodeHeight(node.type) + 20"
                  text-anchor="middle"
                  fill="#333"
                  font-size="11"
                  font-family="monospace"
                >{{ getNodeExpression(node.id) }}</text>
                <circle
                  cx="3"
                  [attr.cy]="getNodeHeight(node.type) / 2"
                  r="5"
                  fill="#fff"
                  stroke="#333"
                  stroke-width="2"
                  class="port input-port"
                  (mousedown)="onPortMouseDown($event, node, node.inputPorts[0])"
                />
              </g>

              <g *ngSwitchDefault class="gate-node">
                <ng-container [ngSwitch]="node.type">
                  <g *ngSwitchCase="'AND'">
                    <path
                      [attr.d]="getANDGatePath(node)"
                      fill="#fff"
                      stroke="#333"
                      stroke-width="2"
                    />
                  </g>
                  <g *ngSwitchCase="'OR'">
                    <path
                      [attr.d]="getORGatePath(node)"
                      fill="#fff"
                      stroke="#333"
                      stroke-width="2"
                    />
                  </g>
                  <g *ngSwitchCase="'NOT'">
                    <polygon
                      [attr.points]="getNOTGatePoints(node)"
                      fill="#fff"
                      stroke="#333"
                      stroke-width="2"
                    />
                    <circle
                      [attr.cx]="getNodeWidth(node.type) - 3"
                      [attr.cy]="getNodeHeight(node.type) / 2"
                      r="4"
                      fill="#fff"
                      stroke="#333"
                      stroke-width="2"
                    />
                  </g>
                  <g *ngSwitchCase="'NAND'">
                    <path
                      [attr.d]="getNANDGatePath(node)"
                      fill="#fff"
                      stroke="#333"
                      stroke-width="2"
                    />
                    <circle
                      [attr.cx]="getNodeWidth(node.type) - 3"
                      [attr.cy]="getNodeHeight(node.type) / 2"
                      r="4"
                      fill="#fff"
                      stroke="#333"
                      stroke-width="2"
                    />
                  </g>
                  <g *ngSwitchCase="'NOR'">
                    <path
                      [attr.d]="getNORGatePath(node)"
                      fill="#fff"
                      stroke="#333"
                      stroke-width="2"
                    />
                    <circle
                      [attr.cx]="getNodeWidth(node.type) - 3"
                      [attr.cy]="getNodeHeight(node.type) / 2"
                      r="4"
                      fill="#fff"
                      stroke="#333"
                      stroke-width="2"
                    />
                  </g>
                  <g *ngSwitchCase="'XOR'">
                    <path
                      [attr.d]="getXORGatePath(node)"
                      fill="#fff"
                      stroke="#333"
                      stroke-width="2"
                    />
                    <path
                      [attr.d]="getXORBackPath(node)"
                      fill="none"
                      stroke="#333"
                      stroke-width="2"
                    />
                  </g>
                  <g *ngSwitchCase="'XNOR'">
                    <path
                      [attr.d]="getXORGatePath(node)"
                      fill="#fff"
                      stroke="#333"
                      stroke-width="2"
                    />
                    <path
                      [attr.d]="getXORBackPath(node)"
                      fill="none"
                      stroke="#333"
                      stroke-width="2"
                    />
                    <circle
                      [attr.cx]="getNodeWidth(node.type) - 3"
                      [attr.cy]="getNodeHeight(node.type) / 2"
                      r="4"
                      fill="#fff"
                      stroke="#333"
                      stroke-width="2"
                    />
                  </g>
                </ng-container>

                <text
                  [attr.x]="getNodeWidth(node.type) / 2 + 2"
                  [attr.y]="getNodeHeight(node.type) / 2 + 4"
                  text-anchor="middle"
                  fill="#333"
                  font-size="11"
                  font-weight="bold"
                >{{ node.type }}</text>

                <circle
                  *ngFor="let port of node.inputPorts"
                  cx="3"
                  [attr.cy]="getPortY(port)"
                  r="5"
                  fill="#fff"
                  stroke="#333"
                  stroke-width="2"
                  class="port input-port"
                  (mousedown)="onPortMouseDown($event, node, port)"
                />

                <circle
                  *ngFor="let port of node.outputPorts"
                  [attr.cx]="getNodeWidth(node.type) - 3"
                  [attr.cy]="getPortY(port)"
                  r="5"
                  fill="#fff"
                  stroke="#333"
                  stroke-width="2"
                  class="port output-port"
                  (mousedown)="onPortMouseDown($event, node, port)"
                />
              </g>
            </ng-container>
          </g>
        </ng-container>
        </g>
      </svg>
    </div>
  `,
  styles: [
    `
    .canvas-container {
      position: relative;
      overflow: hidden;
      background: #fafafa;
      cursor: default;
      width: 100%;
      height: 100%;
    }

    .canvas-svg {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      transform-origin: 0 0;
      display: block;
    }

    .node-group {
      cursor: move;
    }

    .node-group.selected .node-body {
      stroke: #2196F3;
      stroke-width: 3;
    }

    .node-body {
      cursor: pointer;
    }

    .port {
      cursor: crosshair;
    }

    .port:hover {
      fill: #2196F3;
    }

    .wire {
      cursor: pointer;
      transition: stroke 0.2s;
    }

    .wire:hover {
      stroke-width: 4;
    }

    .wire.selected {
      stroke: #2196F3 !important;
      stroke-width: 3;
    }

    .lamp.on {
      filter: drop-shadow(0 0 8px #4CAF50);
    }

    .temp-wire {
      pointer-events: none;
    }
    `,
  ],
})
export class CanvasComponent implements OnInit, OnDestroy {
  @ViewChild('canvasContainer') canvasContainer!: ElementRef;

  nodes: CircuitNode[] = [];
  wires: Wire[] = [];
  selectedNodeIds: string[] = [];
  selectedWireIds: string[] = [];
  hasFeedbackLoop = false;
  @Input() showExpressions = true;

  viewState: ViewState = {
    offsetX: 0,
    offsetY: 0,
    scale: 1,
  };

  isPanning = false;
  isDraggingNode = false;
  isDrawingWire = false;
  dragStartPos = { x: 0, y: 0 };
  viewStartPos = { x: 0, y: 0 };
  dragNodeStartPos = { x: 0, y: 0 };
  draggingNodeId: string | null = null;
  wireStartNode: CircuitNode | null = null;
  wireStartPort: Port | null = null;
  wireEndPos = { x: 0, y: 0 };
  mouseWorldPos = { x: 0, y: 0 };

  private subscription = new Subscription();

  constructor(
    private circuitService: CircuitService,
    private historyService: HistoryService,
    private booleanExpressionService: BooleanExpressionService
  ) {}

  ngOnInit(): void {
    this.subscription.add(
      this.circuitService.state$.subscribe((state) => {
        this.nodes = state.nodes;
        this.wires = state.wires;
        this.selectedNodeIds = state.selectedNodeIds;
        this.selectedWireIds = state.selectedWireIds;
        this.hasFeedbackLoop = state.hasFeedbackLoop;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  getTransform(): string {
    if (!this.viewState) return 'translate(0px,0px) scale(1)';
    const ox = this.viewState.offsetX ?? 0;
    const oy = this.viewState.offsetY ?? 0;
    const s = this.viewState.scale ?? 1;
    return `translate(${ox}px, ${oy}px) scale(${s})`;
  }

  getNodeWidth(type: GateType): number {
    return this.circuitService.getNodeWidth(type);
  }

  getNodeHeight(type: GateType): number {
    return this.circuitService.getNodeHeight(type);
  }

  getNodeTransform(node: CircuitNode): string {
    if (!node || !node.position) return 'translate(0,0)';
    const x = node.position.x ?? 0;
    const y = node.position.y ?? 0;
    return `translate(${x},${y})`;
  }

  getPortY(port: Port): number {
    if (!port || !port.position) return 0;
    return port.position.y ?? 0;
  }

  getWirePoints(wire: Wire): string {
    if (!wire || !wire.points) return '';
    return wire.points
      .filter((p) => p && typeof p.x === 'number' && typeof p.y === 'number')
      .map((p) => `${p.x},${p.y}`)
      .join(' ');
  }

  getWireColor(value: SignalValue): string {
    if (value === 1) return '#4CAF50';
    if (value === 0) return '#888';
    return '#aaa';
  }

  getNodeExpression(nodeId: string): string | null {
    return this.booleanExpressionService.getExpressionForOutput(nodeId);
  }

  getANDGatePath(node: CircuitNode): string {
    if (!node) return '';
    const w = this.getNodeWidth(node.type);
    const h = this.getNodeHeight(node.type);
    return `M 0 0 L ${w * 0.5} 0 Q ${w} ${h / 2} ${w * 0.5} ${h} L 0 ${h} Z`;
  }

  getORGatePath(node: CircuitNode): string {
    if (!node) return '';
    const w = this.getNodeWidth(node.type);
    const h = this.getNodeHeight(node.type);
    return `M 0 0 Q ${w * 0.3} 0 ${w} ${h / 2} Q ${w * 0.3} ${h} 0 ${h} Q ${w * 0.15} ${h / 2} 0 0 Z`;
  }

  getNOTGatePoints(node: CircuitNode): string {
    if (!node) return '';
    const w = this.getNodeWidth(node.type) - 10;
    const h = this.getNodeHeight(node.type);
    return `0,0 ${w},${h / 2} 0,${h}`;
  }

  getNANDGatePath(node: CircuitNode): string {
    if (!node) return '';
    const w = this.getNodeWidth(node.type) - 10;
    const h = this.getNodeHeight(node.type);
    return `M 0 0 L ${w * 0.5} 0 Q ${w} ${h / 2} ${w * 0.5} ${h} L 0 ${h} Z`;
  }

  getNORGatePath(node: CircuitNode): string {
    if (!node) return '';
    const w = this.getNodeWidth(node.type) - 10;
    const h = this.getNodeHeight(node.type);
    return `M 0 0 Q ${w * 0.3} 0 ${w} ${h / 2} Q ${w * 0.3} ${h} 0 ${h} Q ${w * 0.15} ${h / 2} 0 0 Z`;
  }

  getXORGatePath(node: CircuitNode): string {
    if (!node) return '';
    const w = this.getNodeWidth(node.type);
    const h = this.getNodeHeight(node.type);
    const offset = 8;
    return `M ${offset} 0 Q ${w * 0.3 + offset} 0 ${w} ${h / 2} Q ${w * 0.3 + offset} ${h} ${offset} ${h} Q ${w * 0.15 + offset} ${h / 2} ${offset} 0 Z`;
  }

  getXORBackPath(node: CircuitNode): string {
    if (!node) return '';
    const h = this.getNodeHeight(node.type);
    return `M 0 0 Q 4 ${h / 2} 0 ${h}`;
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const gateType = event.dataTransfer?.getData('gateType') as GateType;
    if (!gateType) return;

    const pos = this.screenToWorld(event.clientX, event.clientY);
    const node = this.circuitService.createNode(gateType, pos.x, pos.y);
    this.circuitService.addNode(node);
    this.historyService.saveState();
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    if (!this.canvasContainer || !this.canvasContainer.nativeElement) return;
    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.2, Math.min(3, this.viewState.scale * delta));

    const rect = this.canvasContainer.nativeElement.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const worldX = (mouseX - (this.viewState.offsetX ?? 0)) / (this.viewState.scale ?? 1);
    const worldY = (mouseY - (this.viewState.offsetY ?? 0)) / (this.viewState.scale ?? 1);

    this.viewState.scale = newScale;
    this.viewState.offsetX = mouseX - worldX * newScale;
    this.viewState.offsetY = mouseY - worldY * newScale;
  }

  onCanvasMouseDown(event: MouseEvent): void {
    if (event.button === 0) {
      this.isPanning = true;
      this.dragStartPos = { x: event.clientX, y: event.clientY };
      this.viewStartPos = { x: this.viewState.offsetX, y: this.viewState.offsetY };
      this.circuitService.deselectAll();
    } else if (event.button === 2) {
      if (this.isDrawingWire) {
        this.isDrawingWire = false;
        this.wireStartNode = null;
        this.wireStartPort = null;
      }
    }
  }

  onMouseMove(event: MouseEvent): void {
    this.mouseWorldPos = this.screenToWorld(event.clientX, event.clientY);

    if (this.isPanning) {
      const dx = event.clientX - this.dragStartPos.x;
      const dy = event.clientY - this.dragStartPos.y;
      this.viewState.offsetX = this.viewStartPos.x + dx;
      this.viewState.offsetY = this.viewStartPos.y + dy;
    }

    if (this.isDraggingNode && this.draggingNodeId) {
      const pos = this.screenToWorld(event.clientX, event.clientY);
      const x = Math.round((pos.x - this.dragNodeStartPos.x) / 10) * 10;
      const y = Math.round((pos.y - this.dragNodeStartPos.y) / 10) * 10;
      this.circuitService.moveNode(this.draggingNodeId, x, y);
    }

    if (this.isDrawingWire) {
      this.wireEndPos = { ...this.mouseWorldPos };
    }
  }

  onMouseUp(event: MouseEvent): void {
    if (this.isPanning) {
      this.isPanning = false;
    }

    if (this.isDraggingNode) {
      this.isDraggingNode = false;
      this.draggingNodeId = null;
      this.historyService.saveState();
    }

    if (this.isDrawingWire) {
      this.tryConnectWire();
    }
  }

  onContextMenu(event: MouseEvent): void {
    event.preventDefault();
  }

  onNodeMouseDown(event: MouseEvent, node: CircuitNode): void {
    event.stopPropagation();

    if (event.button === 0) {
      if (node.type === 'INPUT') {
        this.circuitService.toggleInput(node.id);
        this.historyService.saveState();
        return;
      }

      this.isDraggingNode = true;
      this.draggingNodeId = node.id;
      const pos = this.screenToWorld(event.clientX, event.clientY);
      this.dragNodeStartPos = {
        x: pos.x - (node?.position?.x ?? 0),
        y: pos.y - (node?.position?.y ?? 0),
      };
      this.circuitService.selectNode(node.id, event.shiftKey);
    }
  }

  onPortMouseDown(event: MouseEvent, node: CircuitNode, port: Port): void {
    event.stopPropagation();

    if (port.type === 'output') {
      this.isDrawingWire = true;
      this.wireStartNode = node;
      this.wireStartPort = port;
      this.wireEndPos = {
        x: (node?.position?.x ?? 0) + (port?.position?.x ?? 0),
        y: (node?.position?.y ?? 0) + (port?.position?.y ?? 0),
      };
    } else if (port.type === 'input' && this.isDrawingWire) {
      const existingWire = this.wires.find(
        (w) => w.toNodeId === node.id && w.toPortId === port.id
      );
      if (!existingWire && this.wireStartNode && this.wireStartPort) {
        this.circuitService.addWire(
          this.wireStartNode.id,
          this.wireStartPort.id,
          node.id,
          port.id
        );
        this.historyService.saveState();
      }
      this.isDrawingWire = false;
      this.wireStartNode = null;
      this.wireStartPort = null;
    }
  }

  onWireMouseDown(event: MouseEvent, wire: Wire): void {
    event.stopPropagation();
    this.circuitService.selectWire(wire.id, event.shiftKey);
  }

  private tryConnectWire(): void {
    if (!this.wireStartNode || !this.wireStartPort) {
      this.isDrawingWire = false;
      return;
    }

    let connected = false;
    for (const node of this.nodes) {
      if (node.id === this.wireStartNode.id) continue;
      if (!node || !node.position) continue;

      for (const port of node.inputPorts) {
        if (!port || !port.position) continue;
        const portX = node.position.x + port.position.x;
        const portY = node.position.y + port.position.y;
        const dist = Math.sqrt(
          Math.pow(this.wireEndPos.x - portX, 2) + Math.pow(this.wireEndPos.y - portY, 2)
        );

        if (dist < 15) {
          const existingWire = this.wires.find(
            (w) => w.toNodeId === node.id && w.toPortId === port.id
          );
          if (!existingWire) {
            this.circuitService.addWire(
              this.wireStartNode!.id,
              this.wireStartPort!.id,
              node.id,
              port.id
            );
            this.historyService.saveState();
          }
          connected = true;
          break;
        }
      }
      if (connected) break;
    }

    this.isDrawingWire = false;
    this.wireStartNode = null;
    this.wireStartPort = null;
  }

  getTempWirePoints(): string {
    if (!this.wireStartNode || !this.wireStartPort) return '';
    if (!this.wireStartNode.position || !this.wireStartPort.position) return '';

    const startX = this.wireStartNode.position.x + this.wireStartPort.position.x;
    const startY = this.wireStartNode.position.y + this.wireStartPort.position.y;
    const endX = this.wireEndPos.x;
    const endY = this.wireEndPos.y;

    const midX = (startX + endX) / 2;

    return `${startX},${startY} ${midX},${startY} ${midX},${endY} ${endX},${endY}`;
  }

  private screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    if (!this.canvasContainer || !this.canvasContainer.nativeElement) {
      return { x: 0, y: 0 };
    }
    const rect = this.canvasContainer.nativeElement.getBoundingClientRect();
    return {
      x: (screenX - rect.left - (this.viewState?.offsetX ?? 0)) / (this.viewState?.scale ?? 1),
      y: (screenY - rect.top - (this.viewState?.offsetY ?? 0)) / (this.viewState?.scale ?? 1),
    };
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      const selectedNodes = [...this.selectedNodeIds];
      const selectedWires = [...this.selectedWireIds];

      if (selectedNodes.length > 0 || selectedWires.length > 0) {
        selectedNodes.forEach((id) => this.circuitService.removeNode(id));
        selectedWires.forEach((id) => this.circuitService.removeWire(id));
        this.historyService.saveState();
      }
    }

    if (event.ctrlKey || event.metaKey) {
      if (event.key === 'z' || event.key === 'Z') {
        event.preventDefault();
        if (event.shiftKey) {
          this.historyService.redo();
        } else {
          this.historyService.undo();
        }
      }
      if (event.key === 'y' || event.key === 'Y') {
        event.preventDefault();
        this.historyService.redo();
      }
    }
  }
}
