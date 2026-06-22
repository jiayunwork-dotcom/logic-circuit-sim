import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { CircuitService } from '../../services/circuit.service';
import { SignalWaveform, TimingSimulationState } from '../../models/circuit.models';

@Component({
  selector: 'app-waveform-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="waveform-panel" [class.collapsed]="isCollapsed">
      <div class="panel-header" (click)="toggleCollapse()">
        <span class="panel-title">📊 时序波形图</span>
        <div class="header-actions" (click)="$event.stopPropagation()">
          <button class="btn-icon" (click)="exportPNG()" title="导出PNG">🖼️ PNG</button>
          <button class="btn-icon" (click)="exportVCD()" title="导出VCD">📄 VCD</button>
          <span class="collapse-icon">{{ isCollapsed ? '▲' : '▼' }}</span>
        </div>
      </div>

      <div class="panel-content" *ngIf="!isCollapsed">
        <div class="controls-bar">
          <div class="play-controls">
            <button class="btn-play" (click)="togglePlay()">
              {{ timingState?.isPlaying ? '⏸ 暂停' : '▶ 播放' }}
            </button>
          </div>

          <div class="progress-container">
            <span class="time-label">{{ formatTime(timingState?.currentTime || 0) }}</span>
            <input
              type="range"
              class="progress-slider"
              [min]="0"
              [max]="timingState?.totalTime || 100"
              [value]="timingState?.currentTime || 0"
              (input)="onProgressChange($event)"
              step="0.1"
            />
            <span class="time-label">{{ formatTime(timingState?.totalTime || 100) }}</span>
          </div>

          <div class="speed-controls">
            <span class="speed-label">速度:</span>
            <button
              *ngFor="let s of speeds"
              class="btn-speed"
              [class.active]="timingState?.speed === s"
              (click)="setSpeed(s)"
            >
              {{ s }}x
            </button>
          </div>

          <div class="total-time-control">
            <span class="speed-label">总时长:</span>
            <input
              type="number"
              class="total-time-input"
              [value]="timingState?.totalTime || 100"
              (change)="onTotalTimeChange($event)"
              min="10"
              step="10"
            />
            <span class="unit">ns</span>
          </div>
        </div>

        <div class="waveform-container" #waveformContainer>
          <svg class="waveform-svg" [attr.width]="svgWidth" [attr.height]="svgHeight">
            <defs>
              <pattern id="waveformGrid" width="50" height="1" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0" stroke="#e0e0e0" stroke-width="0.5"/>
              </pattern>
            </defs>

            <g class="labels-column">
              <g *ngFor="let waveform of waveforms; let i = index">
                <rect
                  [attr.x]="0"
                  [attr.y]="getWaveformY(i)"
                  [attr.width]="labelWidth"
                  [attr.height]="waveformHeight"
                  [attr.fill]="i % 2 === 0 ? '#f8f8f8' : '#fff'"
                />
                <text
                  [attr.x]="labelWidth - 10"
                  [attr.y]="getWaveformY(i) + waveformHeight / 2 + 4"
                  text-anchor="end"
                  font-size="12"
                  [attr.fill]="waveform.type === 'input' ? '#1976D2' : '#388E3C'"
                  font-weight="500"
                >
                  {{ waveform.signalName }}
                </text>
                <text
                  [attr.x]="5"
                  [attr.y]="getWaveformY(i) + waveformHeight / 2 + 4"
                  font-size="10"
                  fill="#999"
                >
                  {{ waveform.type === 'input' ? 'IN' : 'OUT' }}
                </text>
              </g>
            </g>

            <g class="waveform-area" [attr.transform]="'translate(' + labelWidth + ', 0)'">
              <rect
                x="0"
                y="0"
                [attr.width]="waveformWidth"
                [attr.height]="svgHeight"
                fill="url(#waveformGrid)"
              />

              <g *ngFor="let waveform of waveforms; let i = index">
                <rect
                  x="0"
                  [attr.y]="getWaveformY(i)"
                  [attr.width]="waveformWidth"
                  [attr.height]="waveformHeight"
                  [attr.fill]="i % 2 === 0 ? 'rgba(248,248,248,0.5)' : 'transparent'"
                />
                <path
                  [attr.d]="getWaveformPath(waveform, i)"
                  fill="none"
                  [attr.stroke]="waveform.type === 'input' ? '#1976D2' : '#388E3C'"
                  stroke-width="2"
                />
              </g>

              <line
                class="cursor-line"
                [attr.x1]="cursorX"
                y1="0"
                [attr.x2]="cursorX"
                [attr.y2]="svgHeight"
                stroke="#f44336"
                stroke-width="1.5"
                stroke-dasharray="4,2"
              />
            </g>

            <g class="time-axis" [attr.transform]="'translate(' + labelWidth + ', 0)'">
              <line
                x1="0"
                [attr.y1]="svgHeight - 20"
                [attr.x2]="waveformWidth"
                [attr.y2]="svgHeight - 20"
                stroke="#333"
                stroke-width="1"
              />
              <g *ngFor="let tick of timeTicks">
                <line
                  [attr.x1]="tick.x"
                  [attr.y1]="svgHeight - 20"
                  [attr.x2]="tick.x"
                  [attr.y2]="svgHeight - 15"
                  stroke="#333"
                  stroke-width="1"
                />
                <text
                  [attr.x]="tick.x"
                  [attr.y]="svgHeight - 5"
                  text-anchor="middle"
                  font-size="10"
                  fill="#666"
                >
                  {{ tick.label }}
                </text>
              </g>
            </g>
          </svg>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
    .waveform-panel {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: #fff;
      border-top: 2px solid #ddd;
      box-shadow: 0 -2px 8px rgba(0,0,0,0.1);
      z-index: 100;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .waveform-panel.collapsed {
      height: auto;
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 16px;
      background: #f5f5f5;
      border-bottom: 1px solid #ddd;
      cursor: pointer;
      user-select: none;
    }

    .panel-title {
      font-size: 13px;
      font-weight: 600;
      color: #333;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-icon {
      padding: 4px 8px;
      font-size: 11px;
      border: 1px solid #ccc;
      border-radius: 3px;
      background: #fff;
      cursor: pointer;
      color: #333;
    }

    .btn-icon:hover {
      background: #e8e8e8;
    }

    .collapse-icon {
      font-size: 10px;
      color: #666;
      margin-left: 4px;
    }

    .panel-content {
      padding: 10px 16px;
    }

    .controls-bar {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 10px;
      flex-wrap: wrap;
    }

    .play-controls {
      flex-shrink: 0;
    }

    .btn-play {
      padding: 6px 16px;
      font-size: 13px;
      border: none;
      border-radius: 4px;
      background: #4CAF50;
      color: #fff;
      cursor: pointer;
      font-weight: 500;
    }

    .btn-play:hover {
      background: #388E3C;
    }

    .progress-container {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 200px;
    }

    .time-label {
      font-size: 11px;
      color: #666;
      font-family: monospace;
      min-width: 50px;
      text-align: center;
    }

    .progress-slider {
      flex: 1;
      height: 6px;
      -webkit-appearance: none;
      appearance: none;
      background: #ddd;
      border-radius: 3px;
      outline: none;
      cursor: pointer;
    }

    .progress-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 14px;
      height: 14px;
      background: #f44336;
      border-radius: 50%;
      cursor: pointer;
    }

    .speed-controls {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }

    .speed-label {
      font-size: 12px;
      color: #666;
      margin-right: 4px;
    }

    .btn-speed {
      padding: 3px 8px;
      font-size: 11px;
      border: 1px solid #ccc;
      border-radius: 3px;
      background: #fff;
      cursor: pointer;
      color: #333;
    }

    .btn-speed.active {
      background: #2196F3;
      border-color: #1976D2;
      color: #fff;
    }

    .total-time-control {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }

    .total-time-input {
      width: 60px;
      padding: 3px 6px;
      font-size: 12px;
      border: 1px solid #ccc;
      border-radius: 3px;
    }

    .unit {
      font-size: 11px;
      color: #666;
    }

    .waveform-container {
      width: 100%;
      overflow-x: auto;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: #fff;
    }

    .waveform-svg {
      display: block;
      min-width: 100%;
    }

    .cursor-line {
      pointer-events: none;
    }
    `,
  ],
})
export class WaveformPanelComponent implements OnInit, OnDestroy {
  @ViewChild('waveformContainer') waveformContainer!: ElementRef;

  waveforms: SignalWaveform[] = [];
  timingState: TimingSimulationState | null = null;

  isCollapsed = false;
  speeds = [1, 2, 5, 10];

  svgWidth = 800;
  svgHeight = 300;
  labelWidth = 120;
  waveformHeight = 30;
  waveformVerticalPadding = 5;

  private playInterval: any = null;
  private subscription = new Subscription();

  constructor(private circuitService: CircuitService) {}

  ngOnInit(): void {
    this.subscription.add(
      this.circuitService.timingState$.subscribe((state) => {
        this.timingState = state;
        this.waveforms = state.waveforms;
        this.updateSvgDimensions();

        if (state.isPlaying && !this.playInterval) {
          this.startPlayback();
        } else if (!state.isPlaying && this.playInterval) {
          this.stopPlayback();
        }
      })
    );

    this.updateSvgDimensions();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.stopPlayback();
  }

  get waveformWidth(): number {
    return this.svgWidth - this.labelWidth;
  }

  get cursorX(): number {
    if (!this.timingState) return 0;
    const ratio = this.timingState.currentTime / (this.timingState.totalTime || 100);
    return ratio * this.waveformWidth;
  }

  get timeTicks(): { x: number; label: string }[] {
    if (!this.timingState) return [];
    const totalTime = this.timingState.totalTime;
    const tickCount = 10;
    const ticks: { x: number; label: string }[] = [];

    for (let i = 0; i <= tickCount; i++) {
      const time = (totalTime / tickCount) * i;
      const x = (time / totalTime) * this.waveformWidth;
      ticks.push({ x, label: `${Math.round(time)}ns` });
    }

    return ticks;
  }

  private updateSvgDimensions(): void {
    const waveformCount = Math.max(1, this.waveforms.length);
    this.svgHeight = waveformCount * this.waveformHeight + 25;
  }

  getWaveformY(index: number): number {
    return index * this.waveformHeight + this.waveformVerticalPadding;
  }

  getWaveformPath(waveform: SignalWaveform, index: number): string {
    if (waveform.points.length === 0) return '';

    const totalTime = this.timingState?.totalTime || 100;
    const y = this.getWaveformY(index);
    const highY = y + 5;
    const lowY = y + this.waveformHeight - 5 - this.waveformVerticalPadding;

    let path = '';
    let lastValue = waveform.points[0].value;
    let lastX = 0;

    const startY = lastValue === 1 ? highY : lowY;
    path += `M 0 ${startY}`;

    for (let i = 0; i < waveform.points.length; i++) {
      const point = waveform.points[i];
      const x = (point.time / totalTime) * this.waveformWidth;

      if (i === 0) {
        const currentY = point.value === 1 ? highY : lowY;
        path += ` L ${x} ${currentY}`;
      } else {
        const prevY = lastValue === 1 ? highY : lowY;
        const currY = point.value === 1 ? highY : lowY;

        path += ` L ${x} ${prevY}`;
        path += ` L ${x} ${currY}`;
      }

      lastValue = point.value;
      lastX = x;
    }

    const endX = this.waveformWidth;
    const endY = lastValue === 1 ? highY : lowY;
    path += ` L ${endX} ${endY}`;

    return path;
  }

  toggleCollapse(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  togglePlay(): void {
    if (!this.timingState) return;

    if (this.timingState.isPlaying) {
      this.circuitService.setPlaying(false);
    } else {
      if (this.timingState.currentTime >= this.timingState.totalTime) {
        this.circuitService.setCurrentTime(0);
      }
      this.circuitService.setPlaying(true);
    }
  }

  private startPlayback(): void {
    this.stopPlayback();

    this.playInterval = setInterval(() => {
      if (!this.timingState) return;

      const increment = 0.1 * this.timingState.speed;
      const newTime = this.timingState.currentTime + increment;

      if (newTime >= this.timingState.totalTime) {
        this.circuitService.setCurrentTime(this.timingState.totalTime);
        this.circuitService.setPlaying(false);
      } else {
        this.circuitService.setCurrentTime(newTime);
      }
    }, 16);
  }

  private stopPlayback(): void {
    if (this.playInterval) {
      clearInterval(this.playInterval);
      this.playInterval = null;
    }
  }

  onProgressChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const time = parseFloat(input.value);
    this.circuitService.setCurrentTime(time);
  }

  setSpeed(speed: number): void {
    this.circuitService.setSpeed(speed);
  }

  onTotalTimeChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const time = parseFloat(input.value);
    this.circuitService.setTotalTime(time);
  }

  formatTime(time: number): string {
    return `${time.toFixed(1)}ns`;
  }

  exportPNG(): void {
    const svg = this.waveformContainer?.nativeElement?.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = svg.width.baseVal.value * 2;
      canvas.height = svg.height.baseVal.value * 2;
      ctx!.scale(2, 2);
      ctx!.fillStyle = '#fff';
      ctx!.fillRect(0, 0, canvas.width, canvas.height);
      ctx!.drawImage(img, 0, 0);

      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = 'waveform.png';
      link.href = pngUrl;
      link.click();

      URL.revokeObjectURL(url);
    };

    img.src = url;
  }

  exportVCD(): void {
    const vcdContent = this.circuitService.exportVCD();
    const blob = new Blob([vcdContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'waveform.vcd';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }
}
