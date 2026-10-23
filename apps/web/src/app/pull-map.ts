import {HttpClient, HttpErrorResponse} from '@angular/common/http';
import {Component, effect, inject, input, signal} from '@angular/core';
import {RouterLink} from '@angular/router';
import {firstValueFrom} from 'rxjs';

import {positiveInteger} from './positive-integer';

interface FlowNode {
  name: string;
  role: string;
  changed: boolean;
}

interface FlowRoute {
  name: string;
  changed: boolean;
  columns: FlowNode[][];
}

interface BlockedMap {
  status: 'blocked';
  reason: 'missing' | 'several';
  changes: string[];
}

interface OpenMap {
  status: 'open';
  change: string;
  routes: FlowRoute[];
}

type MapBody = BlockedMap | OpenMap;

const boxWidth = 188;
const boxHeight = 76;
const stackGap = 16;
const columnGap = 36;
const bandGap = 28;
const nameLimit = 22;

interface GraphNode {
  key: string;
  name: string;
  label: string;
  role: string;
  mark: string;
  changed: boolean;
  x: number;
  y: number;
}

interface GraphEdge {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  changed: boolean;
}

interface GraphLabel {
  text: string;
  x: number;
  y: number;
}

interface GraphDiagram {
  width: number;
  height: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
  labels: GraphLabel[];
}

@Component({
  selector: 'app-pull-map',
  imports: [RouterLink],
  template: `
    @if (status() === 'loading') {
      <p>The project map has not arrived.</p>
    } @else if (status() === 'missing') {
      <p>There is no such pull request.</p>
    } @else if (status() === 'error') {
      <p>The project map did not load.</p>
    } @else if (map(); as map) {
      @if (map.status === 'blocked') {
        <section class="panel unit">
          <h2>Project map</h2>
          <p>{{ blocked(map) }}</p>
          @if (map.changes.length > 0) {
            <ul class="changes">
              @for (change of map.changes; track change) {
                <li>{{ change }}</li>
              }
            </ul>
          }
        </section>
      } @else {
        @let picture = drawn(map);
        <section class="panel unit map">
          <p class="step"><a [routerLink]="['/pulls', number(), 'meaning']">Meaning</a></p>
          <h2 class="current">Project map</h2>
          @if (map.routes.length === 0) {
            <p>This section is missing.</p>
          } @else {
          <div class="graph-scroll">
            <svg
              class="diagram"
              [attr.viewBox]="'0 0 ' + picture.width + ' ' + picture.height"
              [attr.width]="picture.width"
              [attr.height]="picture.height"
            >
              <title>Project map</title>
              @for (edge of picture.edges; track edge.key) {
                <line
                  class="edge"
                  [class.changed]="edge.changed"
                  [attr.x1]="edge.x1"
                  [attr.y1]="edge.y1"
                  [attr.x2]="edge.x2"
                  [attr.y2]="edge.y2"
                />
              }
              @for (node of picture.nodes; track node.key) {
                <g [attr.transform]="'translate(' + node.x + ' ' + node.y + ')'">
                  <title>{{ node.name }}</title>
                  <rect [class.changed]="node.changed" [attr.width]="nodeWidth" [attr.height]="nodeHeight" rx="8" />
                  <text class="node-name" [attr.x]="halfNode" y="22" text-anchor="middle">{{ node.label }}</text>
                  @if (node.role) {
                    <text class="node-role" [attr.x]="halfNode" y="42" text-anchor="middle">{{ node.role }}</text>
                  }
                  <text
                    class="node-mark"
                    [class.changed]="node.changed"
                    [attr.x]="halfNode"
                    [attr.y]="node.role ? 62 : 48"
                    text-anchor="middle"
                  >
                    {{ node.mark }}
                  </text>
                </g>
              }
            </svg>
          </div>
          }
          <p class="next"><a [routerLink]="['/pulls', number(), 'units', 1]">Units</a></p>
        </section>
      }
    } @else {
      <p>The project map did not load.</p>
    }
  `,
})
export class PullMap {
  private readonly http = inject(HttpClient);
  protected readonly nodeWidth = boxWidth;
  protected readonly nodeHeight = boxHeight;
  protected readonly halfNode = boxWidth / 2;
  protected readonly number = input.required<string>();
  private requestId = 0;
  protected readonly status = signal<'loading' | 'ready' | 'missing' | 'error'>('loading');
  protected readonly map = signal<MapBody | null>(null);

  constructor() {
    effect(() => {
      const number = this.number();
      void this.load(number);
    });
  }

  protected blocked(map: BlockedMap): string {
    if (map.reason === 'missing') {
      return 'This pull request has no OpenSpec change, so the walkthrough stays closed.';
    }

    return 'This pull request has more than one OpenSpec change, so the walkthrough stays closed.';
  }

  protected drawn(map: OpenMap): GraphDiagram {
    return drawMap(map.routes);
  }

  private async load(rawNumber: string): Promise<void> {
    const requestId = ++this.requestId;
    const number = positiveInteger(rawNumber);
    this.status.set('loading');
    this.map.set(null);

    if (number === null) {
      this.status.set('missing');

      return;
    }

    try {
      const body = await firstValueFrom(this.http.get<MapBody>(`/pulls/${String(number)}/map`));

      if (requestId !== this.requestId) {
        return;
      }

      this.map.set(body);
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

function drawMap(routes: FlowRoute[]): GraphDiagram {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  let y = 0;
  let width = boxWidth;

  for (const route of routes) {
    const rows = Math.max(1, ...route.columns.map((column) => column.length));
    const band = rows * boxHeight + (rows - 1) * stackGap;
    const routeNode = placeNode(route.name, '', route.changed, 0, y + Math.round((band - boxHeight) / 2), `route:${route.name}`);
    nodes.push(routeNode);
    let previous = [routeNode];
    let x = boxWidth + columnGap;

    for (const column of route.columns) {
      const stack = column.length * boxHeight + (column.length - 1) * stackGap;
      const top = y + Math.round((band - stack) / 2);
      const placed = column.map((step, index) => {
        const node = placeNode(
          step.name,
          step.role,
          step.changed,
          x,
          top + index * (boxHeight + stackGap),
          `${route.name}:${step.role}:${step.name}:${String(index)}`,
        );
        nodes.push(node);

        return node;
      });

      for (const from of previous) {
        for (const to of placed) {
          edges.push({
            key: `${from.key}>${to.key}`,
            x1: from.x + boxWidth / 2,
            y1: from.y + boxHeight / 2,
            x2: to.x + boxWidth / 2,
            y2: to.y + boxHeight / 2,
            changed: to.changed,
          });
        }
      }

      previous = placed;
      x += boxWidth + columnGap;
    }

    width = Math.max(width, route.columns.length === 0 ? boxWidth : x - columnGap);
    y += band + bandGap;
  }

  return {width, height: Math.max(y - bandGap, boxHeight), nodes, edges, labels: []};
}

function placeNode(name: string, role: string, changed: boolean, x: number, y: number, key: string): GraphNode {
  return {
    key,
    name,
    label: shortName(name),
    role,
    mark: changed ? 'changed' : 'unchanged',
    changed,
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
