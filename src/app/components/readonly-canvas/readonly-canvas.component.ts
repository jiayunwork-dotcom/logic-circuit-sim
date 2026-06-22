import { Component, Input, OnInit, OnChanges, SimpleChanges, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CircuitNode, Wire, Port, SignalValue, GateType, ViewState } from '../../models/circuit.models';

@Component({
  selector: 'app-readonly-canvas',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="readonly-canvas-container" [class.thumbnail]="isThumbnail">
      <svg class="canvas-svg" [style.transform]="getTransform()">
        <defs>
          <pattern [attr.id]="'grid-small-' + canvasId" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 L 0 20" fill="none" stroke="#e0e0e0" stroke-width="0.5"/>
          </pattern>
          <pattern [attr.id]="'grid-large-' + canvasId" width="100" height="100" patternUnits="userSpaceOnUse">
            <rect width="100" height="100" [attr.fill]="'url(#grid-small-' + canvasId + ')'"/>
            <path d="M 100 0 L 0 0 L 0 100" fill="none" stroke="#ccc" stroke-width="1"/>
          </pattern>
        </defs>
        <rect width="5000" height="5000" x="-2500" y="-2500" [attr.fill]="'url(#grid-large-' + canvasId + ')'"/>

        <g class="wires-layer">
          <g *ngFor="let wire of wires">
            <polyline
              [attr.points]="getWirePoints(wire)"
              [attr.stroke]="getWireColor(wire.value)"
              [attr.stroke-width]="wire.value === null ? 2 : 3"
              [attr.stroke-dasharray]="wire.value === null ? '5,5' : 'none'"
              fill="none"
            />
          </g>
        </g>

        <g class="nodes-layer">
          <ng-container *ngFor="let node of nodes">
            <g *ngIf="node && node.position"
              [attr.transform]="getNodeTransform(node)"
              class="node-group"
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
                  *ngIf="node.label && !isThumbnail"
                  [attr.x]="getNodeWidth(node.type) / 2"
                  y="-8"
                  text-anchor="middle"
                  fill="#333"
                  font-size="12"
                  font-weight="bold"
                >{{ node.label }}</text>
              </g>

              <g *ngSwitchCase="'OUTPUT'" class="output-node">
                <circle
                  *ngIf="highlightedNodeIds.includes(node.id)"
                  [attr.cx]="getNodeWidth(node.type) / 2"
                  [attr.cy]="getNodeHeight(node.type) / 2"
                  r="28"
                  fill="none"
                  stroke="#f44336"
                  stroke-width="3"
                  stroke-dasharray="8,4"
                  class="highlight-ring"
                />
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
                  *ngIf="node.label && !isThumbnail"
                  [attr.x]="getNodeWidth(node.type) / 2"
                  y="-8"
                  text-anchor="middle"
                  fill="#333"
                  font-size="12"
                  font-weight="bold"
                >{{ node.label }}</text>
              </g>

              <g *ngSwitchDefault class="gate-node">
                <ng-container [ngSwitch]="node.type">
                  <g *ngSwitchCase="'AND'">
                    <path [attr.d]="getANDGatePath(node)" fill="#fff" stroke="#333" stroke-width="2" />
                  </g>
                  <g *ngSwitchCase="'OR'">
                    <path [attr.d]="getORGatePath(node)" fill="#fff" stroke="#333" stroke-width="2" />
                  </g>
                  <g *ngSwitchCase="'NOT'">
                    <polygon [attr.points]="getNOTGatePoints(node)" fill="#fff" stroke="#333" stroke-width="2" />
                    <circle [attr.cx]="getNodeWidth(node.type) - 3" [attr.cy]="getNodeHeight(node.type) / 2" r="4" fill="#fff" stroke="#333" stroke-width="2" />
                  </g>
                  <g *ngSwitchCase="'NAND'">
                    <path [attr.d]="getNANDGatePath(node)" fill="#fff" stroke="#333" stroke-width="2" />
                    <circle [attr.cx]="getNodeWidth(node.type) - 3" [attr.cy]="getNodeHeight(node.type) / 2" r="4" fill="#fff" stroke="#333" stroke-width="2" />
                  </g>
                  <g *ngSwitchCase="'NOR'">
                    <path [attr.d]="getNORGatePath(node)" fill="#fff" stroke="#333" stroke-width="2" />
                    <circle [attr.cx]="getNodeWidth(node.type) - 3" [attr.cy]="getNodeHeight(node.type) / 2" r="4" fill="#fff" stroke="#333" stroke-width="2" />
                  </g>
                  <g *ngSwitchCase="'XOR'">
                    <path [attr.d]="getXORGatePath(node)" fill="#fff" stroke="#333" stroke-width="2" />
                    <path [attr.d]="getXORBackPath(node)" fill="none" stroke="#333" stroke-width="2" />
                  </g>
                  <g *ngSwitchCase="'XNOR'">
                    <path [attr.d]="getXORGatePath(node)" fill="#fff" stroke="#333" stroke-width="2" />
                    <path [attr.d]="getXORBackPath(node)" fill="none" stroke="#333" stroke-width="2" />
                    <circle [attr.cx]="getNodeWidth(node.type) - 3" [attr.cy]="getNodeHeight(node.type) / 2" r="4" fill="#fff" stroke="#333" stroke-width="2" />
                  </g>
                </ng-container>

                <text
                  *ngIf="!isThumbnail"
                  [attr.x]="getNodeWidth(node.type) / 2 + 2"
                  [attr.y]="getNodeHeight(node.type) / 2 + 4"
                  text-anchor="middle"
                  fill="#333"
                  font-size="11"
                  font-weight="bold"
                >{{ node.type }}</text>
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
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }

    .readonly-canvas-container {
      position: relative;
      overflow: hidden;
      background: #fafafa;
      width: 100%;
      height: 100%;
    }

    .readonly-canvas-container.thumbnail {
      border: 1px solid #ddd;
      border-radius: 4px;
      background: #fff;
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

    .node-body {
      cursor: default;
    }

    .lamp.on {
      filter: drop-shadow(0 0 6px #4CAF50);
    }

    .highlight-ring {
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    `,
  ],
})
export class ReadonlyCanvasComponent implements OnInit, OnChanges, AfterViewInit {
  @Input() nodes: CircuitNode[] = [];
  @Input() wires: Wire[] = [];
  @Input() isThumbnail = false;
  @Input() highlightedNodeIds: string[] = [];
  @Input() autoFit = true;

  canvasId = Math.random().toString(36).substr(2, 9);

  viewState: ViewState = {
    offsetX: 100,
    offsetY: 100,
    scale: 1,
  };

  ngOnInit(): void {
    if (this.autoFit) {
      this.calculateAutoFit();
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      if (this.autoFit) {
        this.calculateAutoFit();
      }
    }, 0);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['nodes'] || changes['wires']) && this.autoFit) {
      this.calculateAutoFit();
    }
  }

  private calculateAutoFit(): void {
    if (this.nodes.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    this.nodes.forEach((node) => {
      if (!node.position) return;
      const w = this.getNodeWidth(node.type);
      const h = this.getNodeHeight(node.type);
      minX = Math.min(minX, node.position.x - 20);
      minY = Math.min(minY, node.position.y - 20);
      maxX = Math.max(maxX, node.position.x + w + 20);
      maxY = Math.max(maxY, node.position.y + h + 20);
    });

    const width = maxX - minX || 100;
    const height = maxY - minY || 100;

    const containerW = this.isThumbnail ? 180 : 800;
    const containerH = this.isThumbnail ? 120 : 600;

    const scaleX = containerW / width;
    const scaleY = containerH / height;
    const scale = Math.min(scaleX, scaleY, 1.5);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    this.viewState.scale = this.isThumbnail ? scale * 0.9 : Math.min(scale, 1);
    this.viewState.offsetX = containerW / 2 - centerX * this.viewState.scale;
    this.viewState.offsetY = containerH / 2 - centerY * this.viewState.scale;
  }

  getTransform(): string {
    if (!this.viewState) return 'translate(0px,0px) scale(1)';
    const ox = this.viewState.offsetX ?? 0;
    const oy = this.viewState.offsetY ?? 0;
    const s = this.viewState.scale ?? 1;
    return `translate(${ox}px, ${oy}px) scale(${s})`;
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
}
