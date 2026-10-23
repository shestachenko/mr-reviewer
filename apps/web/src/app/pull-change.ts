import {HttpClient, HttpErrorResponse} from '@angular/common/http';
import {Component, effect, inject, input, signal} from '@angular/core';
import {firstValueFrom} from 'rxjs';

import {positiveInteger} from './positive-integer';

interface ChangeNode {
  id: string;
  name: string;
  role: string;
  mark: string;
  quote: string;
}

interface ChangeLink {
  from: string;
  to: string;
}

interface BlockedChange {
  status: 'blocked';
  reason: 'missing' | 'several';
  changes: string[];
}

interface OpenChange {
  status: 'open';
  change: string;
  nodes: ChangeNode[];
  links: ChangeLink[];
}

type ChangeBody = BlockedChange | OpenChange;

const boxWidth = 260;
const boxHeight = 76;
const stackGap = 16;
const columnGap = 48;
const bandGap = 36;
const nameLimit = 32;

interface GraphNode {
  key: string;
  name: string;
  label: string;
  role: string;
  mark: string;
  quote: string;
  x: number;
  y: number;
}

interface GraphEdge {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface GraphDiagram {
  width: number;
  height: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

@Component({
  selector: 'app-pull-change',
  template: `
    <section class="panel fold">
      @if (status() === 'loading') {
        <p>The change map has not arrived.</p>
      } @else if (status() === 'missing') {
        <p>There is no such pull request.</p>
      } @else if (status() === 'error') {
        <p>The change map did not load.</p>
      } @else if (change(); as change) {
        <details [open]="expanded()" (toggle)="setExpanded($event)">
          <summary>
            <h2>Change map</h2>
            @if (change.status === 'open') {
              <span class="meta">{{ change.change }}</span>
            }
          </summary>
          @if (change.status === 'blocked') {
            <p>{{ blocked(change) }}</p>
            @if (change.changes.length > 0) {
              <ul class="changes">
                @for (name of change.changes; track name) {
                  <li>{{ name }}</li>
                }
              </ul>
            }
          } @else if (change.nodes.length === 0) {
            <p>This section is missing.</p>
          } @else {
            @let picture = drawn(change);
            <div class="graph-scroll">
              <svg
                class="diagram"
                [attr.viewBox]="'0 0 ' + picture.width + ' ' + picture.height"
                [attr.width]="picture.width"
                [attr.height]="picture.height"
              >
                <title>Change map</title>
                @for (edge of picture.edges; track edge.key) {
                  <line class="edge" [attr.x1]="edge.x1" [attr.y1]="edge.y1" [attr.x2]="edge.x2" [attr.y2]="edge.y2" />
                }
                @for (node of picture.nodes; track node.key) {
                  <g [attr.transform]="'translate(' + node.x + ' ' + node.y + ')'">
                    <title>{{ node.quote }}</title>
                    <rect [attr.width]="nodeWidth" [attr.height]="nodeHeight" rx="8" />
                    <text class="node-name" [attr.x]="halfNode" y="22" text-anchor="middle">{{ node.label }}</text>
                    <text class="node-role" [attr.x]="halfNode" y="42" text-anchor="middle">{{ node.role }}</text>
                    @if (node.mark) {
                      <text class="node-mark" [attr.x]="halfNode" y="62" text-anchor="middle">{{ node.mark }}</text>
                    }
                  </g>
                }
              </svg>
            </div>
          }
        </details>
      } @else {
        <p>The change map did not load.</p>
      }
    </section>
  `,
})
export class PullChange {
  private readonly http = inject(HttpClient);
  protected readonly nodeWidth = boxWidth;
  protected readonly nodeHeight = boxHeight;
  protected readonly halfNode = boxWidth / 2;
  readonly number = input.required<string>();
  private requestId = 0;
  protected readonly status = signal<'loading' | 'ready' | 'missing' | 'error'>('loading');
  protected readonly change = signal<ChangeBody | null>(null);
  protected readonly expanded = signal(true);

  constructor() {
    effect(() => {
      const number = this.number();
      void this.load(number);
    });
  }

  protected setExpanded(event: Event): void {
    if (!(event.target instanceof HTMLDetailsElement) || event.target !== event.currentTarget) {
      return;
    }

    this.expanded.set(event.target.open);
  }

  protected blocked(change: BlockedChange): string {
    if (change.reason === 'missing') {
      return 'This pull request has no OpenSpec change, so the walkthrough stays closed.';
    }

    return 'This pull request has more than one OpenSpec change, so the walkthrough stays closed.';
  }

  protected drawn(change: OpenChange): GraphDiagram {
    return drawChange(change.nodes, change.links);
  }

  private async load(rawNumber: string): Promise<void> {
    const requestId = ++this.requestId;
    const number = positiveInteger(rawNumber);
    this.status.set('loading');
    this.change.set(null);

    if (number === null) {
      this.status.set('missing');

      return;
    }

    try {
      const body = await firstValueFrom(this.http.get<ChangeBody>(`/pulls/${String(number)}/change`));

      if (requestId !== this.requestId) {
        return;
      }

      this.change.set(body);
      this.status.set('ready');
    } catch (error) {
      if (requestId !== this.requestId) {
        return;
      }

      if (error instanceof HttpErrorResponse && (error.status === 400 || error.status === 404)) {
        this.status.set('missing');

        return;
      }

      this.status.set('error');
    }
  }
}

function drawChange(nodes: ChangeNode[], links: ChangeLink[]): GraphDiagram {
  const placed = new Map<string, GraphNode>();
  const bands = splitBands(nodes);
  let y = 0;
  let width = boxWidth;

  for (const band of bands) {
    const present = [0, 1, 2, 3].filter((column) => band.some((node) => columnOf(node.role) === column));
    const bandHeight = Math.max(
      boxHeight,
      ...present.map((column) => stackHeight(band.filter((node) => columnOf(node.role) === column).length)),
    );

    for (const [index, column] of present.entries()) {
      const columnNodes = band.filter((node) => columnOf(node.role) === column);
      const top = y + Math.round((bandHeight - stackHeight(columnNodes.length)) / 2);
      const x = index * (boxWidth + columnGap);

      for (const [nodeIndex, node] of columnNodes.entries()) {
        placed.set(node.id, placeNode(node, x, top + nodeIndex * (boxHeight + stackGap)));
      }
    }

    width = Math.max(width, present.length * boxWidth + Math.max(present.length - 1, 0) * columnGap);
    y += bandHeight + bandGap;
  }

  const edges: GraphEdge[] = [];

  for (const link of links) {
    const from = placed.get(link.from);
    const to = placed.get(link.to);

    if (!from || !to) {
      continue;
    }

    edges.push({
      key: `${from.key}>${to.key}`,
      x1: from.x + boxWidth / 2,
      y1: from.y + boxHeight / 2,
      x2: to.x + boxWidth / 2,
      y2: to.y + boxHeight / 2,
    });
  }

  return {width, height: Math.max(y - bandGap, boxHeight), nodes: [...placed.values()], edges};
}

function splitBands(nodes: readonly ChangeNode[]): ChangeNode[][] {
  const bands: ChangeNode[][] = [];
  let current: ChangeNode[] = [];

  for (const node of nodes) {
    if (columnOf(node.role) === 0 && current.length > 0) {
      bands.push(current);
      current = [];
    }

    current.push(node);
  }

  if (current.length > 0) {
    bands.push(current);
  }

  return bands;
}

function columnOf(role: string): number {
  if (role === 'capability' || role === 'tasks') {
    return 0;
  }

  if (role === 'decision') {
    return 1;
  }

  if (role === 'file' || role === 'shared') {
    return 3;
  }

  return 2;
}

function stackHeight(count: number): number {
  if (count === 0) {
    return 0;
  }

  return count * boxHeight + (count - 1) * stackGap;
}

function placeNode(node: ChangeNode, x: number, y: number): GraphNode {
  return {
    key: node.id,
    name: node.name,
    label: shortName(node.name),
    role: node.role,
    mark: shortName(node.mark),
    quote: node.quote,
    x,
    y,
  };
}

function shortName(name: string): string {
  if (name.length <= nameLimit) {
    return name;
  }

  return `${name.slice(0, nameLimit - 1)}…`;
}
