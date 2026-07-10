# 《再睡五分钟》Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一款可在微信内置浏览器和手机浏览器中游玩的竖屏 H5 小游戏，完整实现点击、拖动、画线、软失败评分、身份反转和立即重玩流程。

**Architecture:** 使用 Vite + TypeScript 提供轻量构建，游戏画面由单个 Canvas 2D 渲染，DOM 只承载加载页、横屏提示和结算层。纯逻辑模块负责手势识别、目标判定、评分和阶段流转；`Game` 只负责组合模块，使核心规则可由 Vitest 独立验证，并由 Playwright 使用加速时钟验证完整流程。

**Tech Stack:** TypeScript 5、Vite 7、Canvas 2D、Web Audio API、Vitest、jsdom、Playwright Chromium

---

## 文件结构

```text
index.html                              页面容器与无脚本提示
package.json                            开发、测试、构建命令
tsconfig.json                           TypeScript 严格模式
vite.config.ts                          Vite 与 Vitest 配置
playwright.config.ts                    竖屏 E2E 配置
src/main.ts                             浏览器启动入口
src/styles.css                          竖屏布局、横屏提示、结算层
src/game/types.ts                       全局共享类型与常量
src/game/scoring.ts                     失误计数与 S/A/B 结算
src/game/input/GestureRecognizer.ts     点击、拖动、画线识别
src/game/tasks/TaskEngine.ts             活跃目标、超时和单次失误规则
src/game/stages/StageDirector.ts         五阶段时间线与切换
src/game/runtime/GameClock.ts            可暂停、可缩放的游戏时钟
src/game/runtime/PerformanceMonitor.ts   帧耗监测与低性能模式
src/game/render/CanvasRenderer.ts        卧室、物件、特效和命中区域
src/game/assets/AssetLoader.ts           资源预加载与降级
src/game/audio/AudioManager.ts           首触解锁、音效与静音降级
src/game/lifecycle/LifecycleController.ts 前后台、方向和尺寸变化
src/game/content/stages.ts               五阶段生成节奏与文案
src/game/Game.ts                         游戏循环与模块编排
tests/unit/*.test.ts                     纯逻辑与生命周期单元测试
tests/e2e/game.spec.ts                   完整流程、重玩和适配测试
public/audio/*.mp3                       可选音效；缺失时不阻塞游戏
```

## Task 1: 建立可测试、可构建的项目骨架

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `playwright.config.ts`
- Create: `index.html`
- Create: `src/main.ts`
- Create: `src/styles.css`
- Create: `tests/unit/smoke.test.ts`

- [ ] **Step 1: 写基础失败测试**

```ts
// tests/unit/smoke.test.ts
import { describe, expect, it } from 'vitest';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../../src/game/types';

describe('game design space', () => {
  it('uses the approved portrait baseline', () => {
    expect({ width: DESIGN_WIDTH, height: DESIGN_HEIGHT }).toEqual({
      width: 375,
      height: 667,
    });
  });
});
```

- [ ] **Step 2: 创建包配置并确认测试失败**

```json
{
  "name": "five-more-minutes",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview --host 0.0.0.0",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "check": "npm run test && npm run build && npm run test:e2e"
  },
  "devDependencies": {
    "@playwright/test": "^1.54.1",
    "jsdom": "^26.1.0",
    "typescript": "^5.8.3",
    "vite": "^7.0.4",
    "vitest": "^3.2.4"
  }
}
```

Run: `npm install && npm test`

Expected: FAIL，提示无法找到 `src/game/types.ts`。

- [ ] **Step 3: 添加最小 TypeScript、Vite 和页面骨架**

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vitest/globals"]
  },
  "include": ["src", "tests", "vite.config.ts", "playwright.config.ts"]
}
```

```ts
// vite.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.ts'],
  },
});
```

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  webServer: {
    command: 'npm run dev -- --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: 'http://127.0.0.1:4173',
    ...devices['iPhone 13'],
    viewport: { width: 375, height: 667 },
  },
});
```

```ts
// src/game/types.ts
export const DESIGN_WIDTH = 375;
export const DESIGN_HEIGHT = 667;
```

```html
<!-- index.html -->
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover" />
    <title>再睡五分钟</title>
  </head>
  <body>
    <main id="app" aria-label="再睡五分钟小游戏"></main>
    <noscript>请启用 JavaScript 后开始游戏。</noscript>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

```ts
// src/main.ts
import './styles.css';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <canvas id="game-canvas" width="375" height="667" aria-label="卧室游戏场景"></canvas>
  <div id="orientation-lock" hidden>请竖屏游玩</div>
`;
```

```css
/* src/styles.css */
:root { font-family: system-ui, "Microsoft YaHei", sans-serif; color: #24212b; background: #17141e; }
* { box-sizing: border-box; }
html, body, #app { width: 100%; height: 100%; margin: 0; overflow: hidden; touch-action: none; }
#app { position: relative; display: grid; place-items: center; background: #17141e; }
#game-canvas { width: min(100vw, calc(100vh * 375 / 667)); height: min(100vh, calc(100vw * 667 / 375)); background: #ffef86; }
#orientation-lock { position: absolute; inset: 0; display: grid; place-items: center; color: white; background: #17141e; font-size: 24px; font-weight: 800; }
#orientation-lock[hidden] { display: none; }
```

- [ ] **Step 4: 验证测试与构建通过**

Run: `npm test && npm run build`

Expected: Vitest 1 test PASS；Vite build exit 0 并生成 `dist/`。

- [ ] **Step 5: 提交骨架**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts playwright.config.ts index.html src/main.ts src/styles.css src/game/types.ts tests/unit/smoke.test.ts
git commit -m "chore(game): scaffold canvas h5 project"
```

## Task 2: 实现软失败评分与结算数据

**Files:**
- Modify: `src/game/types.ts`
- Create: `src/game/scoring.ts`
- Create: `tests/unit/scoring.test.ts`

- [ ] **Step 1: 写评分边界失败测试**

```ts
// tests/unit/scoring.test.ts
import { describe, expect, it } from 'vitest';
import { createResult } from '../../src/game/scoring';

describe('createResult', () => {
  it.each([
    [0, 'S', 5, 300, '完美封印，全勤奖彻底消失。'],
    [2, 'S', 5, 300, '完美封印，全勤奖彻底消失。'],
    [3, 'A', 5, 200, '世界获救，但他差点醒了。'],
    [6, 'A', 5, 200, '世界获救，但他差点醒了。'],
    [7, 'B', 5, 100, '勉强多睡五分钟，扣款照常发生。'],
  ])('maps %i misses to %s', (misses, grade, lateMinutes, deduction, message) => {
    expect(createResult(misses)).toEqual({ grade, misses, lateMinutes, deduction, message });
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/unit/scoring.test.ts`

Expected: FAIL，提示 `src/game/scoring.ts` 不存在。

- [ ] **Step 3: 添加共享类型和最小评分实现**

```ts
// append to src/game/types.ts
export type Grade = 'S' | 'A' | 'B';

export interface GameResult {
  grade: Grade;
  misses: number;
  lateMinutes: 5;
  deduction: 300 | 200 | 100;
  message: string;
}
```

```ts
// src/game/scoring.ts
import type { GameResult } from './types';

export function createResult(misses: number): GameResult {
  if (misses <= 2) {
    return { grade: 'S', misses, lateMinutes: 5, deduction: 300, message: '完美封印，全勤奖彻底消失。' };
  }
  if (misses <= 6) {
    return { grade: 'A', misses, lateMinutes: 5, deduction: 200, message: '世界获救，但他差点醒了。' };
  }
  return { grade: 'B', misses, lateMinutes: 5, deduction: 100, message: '勉强多睡五分钟，扣款照常发生。' };
}
```

- [ ] **Step 4: 运行评分测试**

Run: `npx vitest run tests/unit/scoring.test.ts`

Expected: 5 tests PASS。

- [ ] **Step 5: 提交评分模块**

```bash
git add src/game/types.ts src/game/scoring.ts tests/unit/scoring.test.ts
git commit -m "feat(game): add soft-failure scoring"
```

## Task 3: 实现点击、拖动和闭合画线识别

**Files:**
- Modify: `src/game/types.ts`
- Create: `src/game/input/GestureRecognizer.ts`
- Create: `tests/unit/gesture-recognizer.test.ts`

- [ ] **Step 1: 写三类手势失败测试**

```ts
// tests/unit/gesture-recognizer.test.ts
import { describe, expect, it } from 'vitest';
import { GestureRecognizer } from '../../src/game/input/GestureRecognizer';

describe('GestureRecognizer', () => {
  it('recognizes a short stationary gesture as tap', () => {
    const input = new GestureRecognizer();
    input.start({ x: 100, y: 100 }, 0);
    expect(input.end({ x: 104, y: 102 }, 180)).toMatchObject({ kind: 'tap' });
  });

  it('recognizes displacement as drag', () => {
    const input = new GestureRecognizer();
    input.start({ x: 20, y: 100 }, 0);
    input.move({ x: 130, y: 100 });
    expect(input.end({ x: 160, y: 100 }, 300)).toMatchObject({ kind: 'drag', delta: { x: 140, y: 0 } });
  });

  it('recognizes a sufficiently long closed path as loop', () => {
    const input = new GestureRecognizer();
    input.start({ x: 100, y: 100 }, 0);
    for (const point of [{ x: 140, y: 90 }, { x: 155, y: 130 }, { x: 125, y: 155 }, { x: 92, y: 130 }, { x: 104, y: 103 }]) input.move(point);
    expect(input.end({ x: 104, y: 103 }, 700)).toMatchObject({ kind: 'loop' });
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/unit/gesture-recognizer.test.ts`

Expected: FAIL，提示 `GestureRecognizer` 不存在。

- [ ] **Step 3: 添加手势类型和识别器**

```ts
// append to src/game/types.ts
export interface Point { x: number; y: number }
export type Gesture =
  | { kind: 'tap'; point: Point }
  | { kind: 'drag'; start: Point; end: Point; delta: Point }
  | { kind: 'loop'; points: Point[] };
```

```ts
// src/game/input/GestureRecognizer.ts
import type { Gesture, Point } from '../types';

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export class GestureRecognizer {
  private points: Point[] = [];
  private startedAt = 0;

  start(point: Point, timestamp: number): void {
    this.points = [point];
    this.startedAt = timestamp;
  }

  move(point: Point): void {
    if (this.points.length) this.points.push(point);
  }

  end(point: Point, timestamp: number): Gesture {
    this.points.push(point);
    const start = this.points[0]!;
    const travel = this.points.slice(1).reduce((sum, current, index) => sum + distance(this.points[index]!, current), 0);
    const displacement = distance(start, point);
    const duration = timestamp - this.startedAt;
    const result: Gesture = travel >= 120 && displacement <= 24 && this.points.length >= 5
      ? { kind: 'loop', points: [...this.points] }
      : displacement >= 18
        ? { kind: 'drag', start, end: point, delta: { x: point.x - start.x, y: point.y - start.y } }
        : { kind: 'tap', point };
    this.points = [];
    this.startedAt = duration;
    return result;
  }

  cancel(): void { this.points = []; }
}
```

- [ ] **Step 4: 运行手势测试**

Run: `npx vitest run tests/unit/gesture-recognizer.test.ts`

Expected: 3 tests PASS。

- [ ] **Step 5: 提交输入模块**

```bash
git add src/game/types.ts src/game/input/GestureRecognizer.ts tests/unit/gesture-recognizer.test.ts
git commit -m "feat(game): recognize touch gestures"
```

## Task 4: 实现目标判定、超时和单次失误

**Files:**
- Modify: `src/game/types.ts`
- Create: `src/game/tasks/TaskEngine.ts`
- Create: `tests/unit/task-engine.test.ts`

- [ ] **Step 1: 写目标成功和超时失败测试**

```ts
// tests/unit/task-engine.test.ts
import { describe, expect, it, vi } from 'vitest';
import { TaskEngine } from '../../src/game/tasks/TaskEngine';

describe('TaskEngine', () => {
  it('completes a target only with the required gesture', () => {
    const engine = new TaskEngine();
    engine.spawn({ id: 'clock-1', kind: 'tap', bounds: { x: 50, y: 400, width: 80, height: 80 }, expiresAt: 1000 });
    expect(engine.apply({ kind: 'tap', point: { x: 80, y: 430 } })).toBe('success');
    expect(engine.active()).toHaveLength(0);
  });

  it('reports one miss for an expired target', () => {
    const miss = vi.fn();
    const engine = new TaskEngine(miss);
    engine.spawn({ id: 'phone-1', kind: 'loop', bounds: { x: 200, y: 350, width: 80, height: 120 }, expiresAt: 1000 });
    engine.update(1001);
    engine.update(2000);
    expect(miss).toHaveBeenCalledTimes(1);
    expect(engine.active()).toHaveLength(0);
  });

  it('accepts a loop that encloses the target center', () => {
    const engine = new TaskEngine();
    engine.spawn({ id: 'phone-2', kind: 'loop', bounds: { x: 200, y: 350, width: 80, height: 120 }, expiresAt: 1000 });
    const result = engine.apply({ kind: 'loop', points: [
      { x: 190, y: 340 }, { x: 290, y: 340 }, { x: 290, y: 480 }, { x: 190, y: 480 }, { x: 190, y: 340 },
    ] });
    expect(result).toBe('success');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/unit/task-engine.test.ts`

Expected: FAIL，提示 `TaskEngine` 不存在。

- [ ] **Step 3: 添加目标类型和任务引擎**

```ts
// append to src/game/types.ts
export interface Rect { x: number; y: number; width: number; height: number }
export type TargetKind = 'tap' | 'drag' | 'loop';
export interface Target { id: string; kind: TargetKind; bounds: Rect; expiresAt: number }
```

```ts
// src/game/tasks/TaskEngine.ts
import type { Gesture, Point, Rect, Target } from '../types';

const contains = (rect: Rect, point: Point) => point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
const loopContainsCenter = (points: Point[], rect: Rect) => {
  const xs = points.map(point => point.x); const ys = points.map(point => point.y);
  const center = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  return center.x >= Math.min(...xs) && center.x <= Math.max(...xs) && center.y >= Math.min(...ys) && center.y <= Math.max(...ys);
};

export class TaskEngine {
  private targets: Target[] = [];
  constructor(private readonly onMiss: (target: Target) => void = () => undefined) {}

  spawn(target: Target): void {
    if (this.targets.length >= 2) throw new Error('At most two active targets are allowed');
    this.targets.push(target);
  }

  active(): readonly Target[] { return this.targets; }

  apply(gesture: Gesture): 'success' | 'ignored' {
    const index = this.targets.findIndex(target => {
      if (target.kind !== gesture.kind) return false;
      if (gesture.kind === 'loop') return loopContainsCenter(gesture.points, target.bounds);
      return contains(target.bounds, gesture.kind === 'tap' ? gesture.point : gesture.end);
    });
    if (index < 0) return 'ignored';
    this.targets.splice(index, 1);
    return 'success';
  }

  update(now: number): void {
    const expired = this.targets.filter(target => target.expiresAt <= now);
    this.targets = this.targets.filter(target => target.expiresAt > now);
    expired.forEach(this.onMiss);
  }

  reset(): void { this.targets = []; }
}
```

- [ ] **Step 4: 运行目标引擎测试**

Run: `npx vitest run tests/unit/task-engine.test.ts`

Expected: 3 tests PASS。

- [ ] **Step 5: 提交任务模块**

```bash
git add src/game/types.ts src/game/tasks/TaskEngine.ts tests/unit/task-engine.test.ts
git commit -m "feat(game): add timed target engine"
```

## Task 5: 实现可暂停、可加速的游戏时钟与五阶段导演

**Files:**
- Modify: `src/game/types.ts`
- Create: `src/game/runtime/GameClock.ts`
- Create: `src/game/stages/StageDirector.ts`
- Create: `tests/unit/game-clock.test.ts`
- Create: `tests/unit/stage-director.test.ts`

- [ ] **Step 1: 写暂停和阶段边界失败测试**

```ts
// tests/unit/game-clock.test.ts
import { expect, it } from 'vitest';
import { GameClock } from '../../src/game/runtime/GameClock';

it('does not advance while paused', () => {
  const clock = new GameClock(10);
  clock.tick(100);
  clock.pause();
  clock.tick(500);
  clock.resume();
  clock.tick(100);
  expect(clock.now()).toBe(2000);
});
```

```ts
// tests/unit/stage-director.test.ts
import { expect, it } from 'vitest';
import { StageDirector } from '../../src/game/stages/StageDirector';

it('moves through the approved five stages', () => {
  const director = new StageDirector();
  expect(director.at(0).id).toBe('alarms');
  expect(director.at(40_000).id).toBe('curtains');
  expect(director.at(85_000).id).toBe('silence');
  expect(director.at(140_000).id).toBe('invasion');
  expect(director.at(210_000).id).toBe('reveal');
  expect(director.at(260_000).id).toBe('result');
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/unit/game-clock.test.ts tests/unit/stage-director.test.ts`

Expected: FAIL，提示两个类不存在。

- [ ] **Step 3: 添加阶段类型、时钟和导演**

```ts
// append to src/game/types.ts
export type StageId = 'alarms' | 'curtains' | 'silence' | 'invasion' | 'reveal' | 'result';
export interface StageDefinition { id: StageId; startsAt: number; prompt: string }
```

```ts
// src/game/runtime/GameClock.ts
export class GameClock {
  private elapsed = 0;
  private paused = false;
  constructor(private readonly scale = 1) {}
  tick(realDeltaMs: number): void { if (!this.paused) this.elapsed += realDeltaMs * this.scale; }
  now(): number { return this.elapsed; }
  pause(): void { this.paused = true; }
  resume(): void { this.paused = false; }
  reset(): void { this.elapsed = 0; this.paused = false; }
}
```

```ts
// src/game/stages/StageDirector.ts
import type { StageDefinition } from '../types';

export const STAGES: readonly StageDefinition[] = [
  { id: 'alarms', startsAt: 0, prompt: '摧毁声波装置！' },
  { id: 'curtains', startsAt: 40_000, prompt: '封锁天穹裂隙！' },
  { id: 'silence', startsAt: 85_000, prompt: '绘制静音结界！' },
  { id: 'invasion', startsAt: 140_000, prompt: '全勤奖马上消失，坚持住！' },
  { id: 'reveal', startsAt: 210_000, prompt: '世界已获救' },
  { id: 'result', startsAt: 260_000, prompt: '封印完成' },
];

export class StageDirector {
  at(elapsed: number): StageDefinition {
    return [...STAGES].reverse().find(stage => elapsed >= stage.startsAt) ?? STAGES[0]!;
  }
}
```

- [ ] **Step 4: 运行时钟和导演测试**

Run: `npx vitest run tests/unit/game-clock.test.ts tests/unit/stage-director.test.ts`

Expected: 2 tests PASS。

- [ ] **Step 5: 提交时间线模块**

```bash
git add src/game/types.ts src/game/runtime/GameClock.ts src/game/stages/StageDirector.ts tests/unit/game-clock.test.ts tests/unit/stage-director.test.ts
git commit -m "feat(game): add pausable five-stage timeline"
```

## Task 6: 定义阶段内容和确定性目标生成

**Files:**
- Create: `src/game/content/stages.ts`
- Create: `tests/unit/stage-content.test.ts`

- [ ] **Step 1: 写阶段内容失败测试**

```ts
// tests/unit/stage-content.test.ts
import { expect, it } from 'vitest';
import { createTargetForStage } from '../../src/game/content/stages';

it('uses only the taught gesture before the invasion stage', () => {
  expect(createTargetForStage('alarms', 0, 5000).kind).toBe('tap');
  expect(createTargetForStage('curtains', 0, 5000).kind).toBe('drag');
  expect(createTargetForStage('silence', 0, 5000).kind).toBe('loop');
});

it('rotates all gestures during invasion', () => {
  expect([0, 1, 2].map(index => createTargetForStage('invasion', index, 5000).kind)).toEqual(['tap', 'drag', 'loop']);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/unit/stage-content.test.ts`

Expected: FAIL，提示 `createTargetForStage` 不存在。

- [ ] **Step 3: 实现确定性目标工厂**

```ts
// src/game/content/stages.ts
import type { Rect, StageId, Target, TargetKind } from '../types';

const BOUNDS: Record<TargetKind, Rect> = {
  tap: { x: 38, y: 420, width: 92, height: 92 },
  drag: { x: 56, y: 115, width: 263, height: 210 },
  loop: { x: 205, y: 340, width: 110, height: 155 },
};

export function createTargetForStage(stage: StageId, index: number, now: number): Target {
  const kind: TargetKind = stage === 'alarms' ? 'tap'
    : stage === 'curtains' ? 'drag'
      : stage === 'silence' ? 'loop'
        : (['tap', 'drag', 'loop'] as const)[index % 3]!;
  return { id: `${stage}-${index}`, kind, bounds: BOUNDS[kind], expiresAt: now + (stage === 'invasion' ? 2600 : 4200) };
}

export function spawnInterval(stage: StageId): number {
  return stage === 'invasion' ? 1800 : 3400;
}
```

- [ ] **Step 4: 运行阶段内容测试**

Run: `npx vitest run tests/unit/stage-content.test.ts`

Expected: 2 tests PASS。

- [ ] **Step 5: 提交阶段内容**

```bash
git add src/game/content/stages.ts tests/unit/stage-content.test.ts
git commit -m "feat(game): define stage target sequences"
```

## Task 7: 实现 Canvas 卧室、漫画反馈和坐标映射

**Files:**
- Create: `src/game/render/CanvasRenderer.ts`
- Create: `tests/unit/canvas-renderer.test.ts`

- [ ] **Step 1: 写坐标映射失败测试**

```ts
// tests/unit/canvas-renderer.test.ts
import { expect, it } from 'vitest';
import { toDesignPoint } from '../../src/game/render/CanvasRenderer';

it('maps CSS coordinates into the 375x667 design space', () => {
  expect(toDesignPoint({ x: 187.5, y: 333.5 }, { width: 750, height: 1334 })).toEqual({ x: 93.75, y: 166.75 });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/unit/canvas-renderer.test.ts`

Expected: FAIL，提示渲染模块不存在。

- [ ] **Step 3: 实现坐标映射和首版几何渲染器**

```ts
// src/game/render/CanvasRenderer.ts
import { DESIGN_HEIGHT, DESIGN_WIDTH, type Point, type StageDefinition, type Target } from '../types';

export function toDesignPoint(point: Point, viewport: { width: number; height: number }): Point {
  return { x: point.x * DESIGN_WIDTH / viewport.width, y: point.y * DESIGN_HEIGHT / viewport.height };
}

export class CanvasRenderer {
  constructor(private readonly canvas: HTMLCanvasElement, private readonly context = canvas.getContext('2d')!) {
    canvas.width = DESIGN_WIDTH;
    canvas.height = DESIGN_HEIGHT;
  }

  render(stage: StageDefinition, targets: readonly Target[], danger: number, flash = ''): void {
    const c = this.context;
    c.clearRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
    c.fillStyle = '#ffef86'; c.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
    c.fillStyle = '#df724d'; c.fillRect(0, 500, DESIGN_WIDTH, 167);
    c.lineWidth = 6; c.strokeStyle = '#24212b'; c.fillStyle = '#42a9c9';
    c.beginPath(); c.roundRect(48, 390, 278, 150, 24); c.fill(); c.stroke();
    c.fillStyle = '#f2b17c'; c.beginPath(); c.arc(125, 407 - Math.min(18, danger * 2), 30, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = '#7651a8'; c.beginPath(); c.roundRect(145, 400, 165, 125, 35); c.fill(); c.stroke();
    c.fillStyle = '#24212b'; c.font = '800 21px sans-serif'; c.textAlign = 'center'; c.fillText(stage.prompt, DESIGN_WIDTH / 2, 48);
    c.fillStyle = '#ef5f62'; c.fillRect(350, 90, 12, Math.min(450, danger * 45));
    for (const target of targets) {
      c.save(); c.lineWidth = 5;
      if (target.kind === 'tap') {
        c.fillStyle = '#ef5f62'; c.beginPath();
        c.arc(target.bounds.x + target.bounds.width / 2, target.bounds.y + target.bounds.height / 2, target.bounds.width / 2, 0, Math.PI * 2);
        c.fill(); c.stroke(); c.fillStyle = '#24212b'; c.font = '900 16px sans-serif'; c.fillText('7:59', target.bounds.x + target.bounds.width / 2, target.bounds.y + 52);
      } else if (target.kind === 'drag') {
        c.fillStyle = '#85dcff'; c.fillRect(target.bounds.x, target.bounds.y, target.bounds.width, target.bounds.height); c.strokeRect(target.bounds.x, target.bounds.y, target.bounds.width, target.bounds.height);
        c.fillStyle = '#7651a8'; c.fillRect(target.bounds.x, target.bounds.y, 58, target.bounds.height); c.fillRect(target.bounds.x + target.bounds.width - 58, target.bounds.y, 58, target.bounds.height);
      } else {
        c.fillStyle = '#2f2a3a'; c.beginPath(); c.roundRect(target.bounds.x, target.bounds.y, target.bounds.width, target.bounds.height, 15); c.fill(); c.stroke();
        c.fillStyle = '#ffda45'; c.font = '900 32px sans-serif'; c.fillText('♪', target.bounds.x + target.bounds.width / 2, target.bounds.y + 85);
      }
      c.strokeStyle = target.kind === 'tap' ? '#ef5f62' : target.kind === 'drag' ? '#2aa9ca' : '#7651a8';
      c.setLineDash([10, 7]); c.strokeRect(target.bounds.x, target.bounds.y, target.bounds.width, target.bounds.height); c.setLineDash([]);
      c.restore();
    }
    if (flash) { c.fillStyle = '#24212b'; c.font = '900 42px sans-serif'; c.fillText(flash, DESIGN_WIDTH / 2, 230); }
  }
}
```

- [ ] **Step 4: 运行渲染单元测试**

Run: `npx vitest run tests/unit/canvas-renderer.test.ts`

Expected: 1 test PASS。

- [ ] **Step 5: 提交渲染模块**

```bash
git add src/game/render/CanvasRenderer.ts tests/unit/canvas-renderer.test.ts
git commit -m "feat(game): render comic bedroom scene"
```

## Task 8: 实现资源降级、首触音频解锁和生命周期

**Files:**
- Create: `src/game/assets/AssetLoader.ts`
- Create: `src/game/audio/AudioManager.ts`
- Create: `src/game/lifecycle/LifecycleController.ts`
- Create: `tests/unit/asset-loader.test.ts`
- Create: `tests/unit/lifecycle.test.ts`

- [ ] **Step 1: 写资源失败和生命周期失败测试**

```ts
// tests/unit/asset-loader.test.ts
import { expect, it } from 'vitest';
import { AssetLoader } from '../../src/game/assets/AssetLoader';

it('returns a fallback instead of rejecting a missing optional asset', async () => {
  const loader = new AssetLoader(async () => { throw new Error('missing'); });
  await expect(loader.optional('alarm', '/audio/alarm.mp3')).resolves.toEqual({ id: 'alarm', available: false });
});
```

```ts
// tests/unit/lifecycle.test.ts
import { expect, it, vi } from 'vitest';
import { LifecycleController } from '../../src/game/lifecycle/LifecycleController';

it('pauses on hidden and resumes on visible', () => {
  const pause = vi.fn(); const resume = vi.fn();
  const controller = new LifecycleController(pause, resume);
  controller.applyVisibility(true);
  controller.applyVisibility(false);
  expect(pause).toHaveBeenCalledOnce();
  expect(resume).toHaveBeenCalledOnce();
});

it('does not resume until every pause reason is cleared', () => {
  const pause = vi.fn(); const resume = vi.fn();
  const controller = new LifecycleController(pause, resume);
  controller.applyVisibility(true);
  controller.applyOrientation(667, 375);
  controller.applyVisibility(false);
  expect(resume).not.toHaveBeenCalled();
  controller.applyOrientation(375, 667);
  expect(resume).toHaveBeenCalledOnce();
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/unit/asset-loader.test.ts tests/unit/lifecycle.test.ts`

Expected: FAIL，提示资源加载器和生命周期控制器不存在。

- [ ] **Step 3: 实现降级和生命周期模块**

```ts
// src/game/assets/AssetLoader.ts
export interface AssetStatus { id: string; available: boolean; data?: ArrayBuffer }

export class AssetLoader {
  constructor(private readonly fetcher: (url: string) => Promise<ArrayBuffer> = async url => (await fetch(url)).arrayBuffer()) {}
  async optional(id: string, url: string): Promise<AssetStatus> {
    try { return { id, available: true, data: await this.fetcher(url) }; }
    catch { return { id, available: false }; }
  }
}
```

```ts
// src/game/audio/AudioManager.ts
export class AudioManager {
  private context?: AudioContext;
  private unlocked = false;
  async unlock(): Promise<void> {
    this.context ??= new AudioContext();
    await this.context.resume();
    this.unlocked = true;
  }
  playHit(): void {
    if (!this.unlocked || !this.context) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.frequency.value = 120; gain.gain.value = 0.04;
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(); oscillator.stop(this.context.currentTime + 0.06);
  }
  pause(): void { void this.context?.suspend(); }
  resume(): void { if (this.unlocked) void this.context?.resume(); }
}
```

```ts
// src/game/lifecycle/LifecycleController.ts
export class LifecycleController {
  private readonly reasons = new Set<'hidden' | 'landscape'>();
  constructor(private readonly pause: () => void, private readonly resume: () => void) {}
  applyVisibility(hidden: boolean): void { this.setReason('hidden', hidden); }
  applyOrientation(width: number, height: number): void { this.setReason('landscape', width > height); }
  isLandscape(width: number, height: number): boolean { return width > height; }
  bind(): () => void {
    const visibility = () => this.applyVisibility(document.hidden);
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }
  private setReason(reason: 'hidden' | 'landscape', active: boolean): void {
    const wasPaused = this.reasons.size > 0;
    active ? this.reasons.add(reason) : this.reasons.delete(reason);
    const isPaused = this.reasons.size > 0;
    if (!wasPaused && isPaused) this.pause();
    if (wasPaused && !isPaused) this.resume();
  }
}
```

- [ ] **Step 4: 运行降级和生命周期测试**

Run: `npx vitest run tests/unit/asset-loader.test.ts tests/unit/lifecycle.test.ts`

Expected: 3 tests PASS。

- [ ] **Step 5: 提交平台兼容模块**

```bash
git add src/game/assets/AssetLoader.ts src/game/audio/AudioManager.ts src/game/lifecycle/LifecycleController.ts tests/unit/asset-loader.test.ts tests/unit/lifecycle.test.ts
git commit -m "feat(game): add resilient mobile lifecycle"
```

## Task 9: 编排可玩的完整游戏循环

**Files:**
- Create: `src/game/Game.ts`
- Modify: `src/main.ts`
- Modify: `src/styles.css`
- Create: `tests/unit/game-reset.test.ts`

- [ ] **Step 1: 写重开状态失败测试**

```ts
// tests/unit/game-reset.test.ts
import { expect, it } from 'vitest';
import { GameState } from '../../src/game/Game';

it('clears misses and elapsed time on replay', () => {
  const state = new GameState();
  state.miss(); state.advance(12_000); state.reset();
  expect(state.snapshot()).toEqual({ misses: 0, elapsed: 0, danger: 0 });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/unit/game-reset.test.ts`

Expected: FAIL，提示 `GameState` 不存在。

- [ ] **Step 3: 实现状态、循环和触控接线**

```ts
// src/game/Game.ts
import { AudioManager } from './audio/AudioManager';
import { createTargetForStage, spawnInterval } from './content/stages';
import { GestureRecognizer } from './input/GestureRecognizer';
import { CanvasRenderer, toDesignPoint } from './render/CanvasRenderer';
import { GameClock } from './runtime/GameClock';
import { createResult } from './scoring';
import { StageDirector } from './stages/StageDirector';
import { TaskEngine } from './tasks/TaskEngine';

export class GameState {
  private misses = 0; private elapsed = 0;
  miss(): void { this.misses += 1; }
  advance(delta: number): void { this.elapsed += delta; }
  reset(): void { this.misses = 0; this.elapsed = 0; }
  snapshot() { return { misses: this.misses, elapsed: this.elapsed, danger: this.misses }; }
}

export class Game {
  readonly state = new GameState();
  private readonly clock: GameClock;
  private readonly director = new StageDirector();
  private readonly input = new GestureRecognizer();
  private readonly audio = new AudioManager();
  private readonly renderer: CanvasRenderer;
  private readonly tasks = new TaskEngine(() => this.state.miss());
  private lastFrame = performance.now(); private lastSpawn = -Infinity; private spawnIndex = 0; private frame = 0; private running = false; private finished = false;

  constructor(private readonly canvas: HTMLCanvasElement, private readonly onResult: (result: ReturnType<typeof createResult>) => void, speed = 1) {
    this.clock = new GameClock(speed); this.renderer = new CanvasRenderer(canvas); this.bindInput();
  }

  start(): void {
    if (this.running || this.finished) return;
    this.running = true;
    this.lastFrame = performance.now();
    this.frame = requestAnimationFrame(this.loop);
  }
  pause(): void {
    if (!this.running) return;
    this.running = false;
    this.clock.pause();
    cancelAnimationFrame(this.frame);
    this.audio.pause();
  }
  resume(): void {
    if (this.running) return;
    this.clock.resume();
    this.audio.resume();
    this.start();
  }
  reset(): void {
    this.state.reset(); this.clock.reset(); this.tasks.reset();
    this.lastSpawn = -Infinity; this.spawnIndex = 0;
    this.running = false; this.finished = false; cancelAnimationFrame(this.frame); this.start();
  }

  private readonly loop = (realNow: number): void => {
    const delta = Math.min(50, realNow - this.lastFrame); this.lastFrame = realNow; this.clock.tick(delta); this.state.advance(delta);
    const now = this.clock.now(); const stage = this.director.at(now); this.tasks.update(now);
    if (!['reveal', 'result'].includes(stage.id) && now - this.lastSpawn >= spawnInterval(stage.id) && this.tasks.active().length < 2) {
      this.tasks.spawn(createTargetForStage(stage.id, this.spawnIndex++, now)); this.lastSpawn = now;
    }
    const snapshot = this.state.snapshot(); this.renderer.render(stage, this.tasks.active(), snapshot.danger);
    if (stage.id === 'result') {
      this.running = false; this.finished = true;
      this.onResult(createResult(snapshot.misses));
      return;
    }
    this.frame = requestAnimationFrame(this.loop);
  };

  private bindInput(): void {
    const point = (event: PointerEvent) => toDesignPoint({ x: event.offsetX, y: event.offsetY }, { width: this.canvas.clientWidth, height: this.canvas.clientHeight });
    this.canvas.addEventListener('pointerdown', event => { this.canvas.setPointerCapture(event.pointerId); this.input.start(point(event), performance.now()); void this.audio.unlock(); });
    this.canvas.addEventListener('pointermove', event => { if (this.canvas.hasPointerCapture(event.pointerId)) this.input.move(point(event)); });
    this.canvas.addEventListener('pointerup', event => {
      const outcome = this.tasks.apply(this.input.end(point(event), performance.now()));
      if (outcome === 'success') { this.audio.playHit(); navigator.vibrate?.(20); }
    });
    this.canvas.addEventListener('pointercancel', () => this.input.cancel());
  }
}
```

```ts
// replace src/main.ts
import './styles.css';
import { Game } from './game/Game';
import { LifecycleController } from './game/lifecycle/LifecycleController';
import type { GameResult } from './game/types';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `<canvas id="game-canvas" width="375" height="667" aria-label="卧室游戏场景"></canvas><div id="orientation-lock" hidden>请竖屏游玩</div><section id="result" hidden></section>`;
const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas')!;
const resultLayer = document.querySelector<HTMLElement>('#result')!;
const orientation = document.querySelector<HTMLElement>('#orientation-lock')!;
const speed = import.meta.env.DEV ? new URLSearchParams(location.search).get('testSpeed') : null;
let game: Game;

function showResult(result: GameResult): void {
  resultLayer.innerHTML = `<div class="result-card"><strong>${result.grade}</strong><h1>世界已获救？</h1><p>${result.message}</p><p>迟到 ${result.lateMinutes} 分钟 · 扣款 ¥${result.deduction}</p><button id="replay">再睡一次</button></div>`;
  resultLayer.hidden = false;
  document.querySelector<HTMLButtonElement>('#replay')!.addEventListener('click', () => { resultLayer.hidden = true; game.reset(); }, { once: true });
}

game = new Game(canvas, showResult, speed ? Number(speed) : 1);
const lifecycle = new LifecycleController(() => game.pause(), () => game.resume());
lifecycle.bind();
const syncOrientation = () => {
  const landscape = lifecycle.isLandscape(innerWidth, innerHeight);
  orientation.hidden = !landscape;
  lifecycle.applyOrientation(innerWidth, innerHeight);
};
addEventListener('resize', syncOrientation);
game.start();
lifecycle.applyVisibility(document.hidden);
syncOrientation();
```

```css
/* append to src/styles.css */
#result { position: absolute; inset: 0; display: grid; place-items: center; padding: 24px; background: #ffef86; }
#result[hidden] { display: none; }
.result-card { width: 100%; padding: 28px; text-align: center; border: 5px solid #24212b; border-radius: 24px; background: white; box-shadow: 9px 10px 0 #24212b; }
.result-card strong { display: block; color: #ef5f62; font-size: 112px; line-height: 1; }
.result-card button { width: 100%; min-height: 52px; border: 4px solid #24212b; border-radius: 14px; color: #24212b; background: #ffda45; font-size: 20px; font-weight: 900; }
```

- [ ] **Step 4: 运行全部单元测试和构建**

Run: `npm test && npm run build`

Expected: 所有 Vitest 测试 PASS；Vite build exit 0。

- [ ] **Step 5: 提交完整游戏循环**

```bash
git add src/game/Game.ts src/main.ts src/styles.css tests/unit/game-reset.test.ts
git commit -m "feat(game): connect playable stage loop"
```

## Task 10: 补强反转演出、教学提示和漫画反馈

**Files:**
- Modify: `src/game/render/CanvasRenderer.ts`
- Modify: `src/game/Game.ts`
- Modify: `src/main.ts`
- Create: `tests/unit/reveal-copy.test.ts`

- [ ] **Step 1: 写反转文案失败测试**

```ts
// tests/unit/reveal-copy.test.ts
import { expect, it } from 'vitest';
import { revealLines } from '../../src/game/render/CanvasRenderer';

it('reframes the seal as the snooze button', () => {
  expect(revealLines()).toEqual(['世界已获救', '封印系统正在解除伪装…', '稍后提醒：5 分钟']);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/unit/reveal-copy.test.ts`

Expected: FAIL，提示 `revealLines` 不存在。

- [ ] **Step 3: 添加确定反转文案、漫画反馈和一次性教学**

```ts
// add to src/game/render/CanvasRenderer.ts
export const revealLines = () => ['世界已获救', '封印系统正在解除伪装…', '稍后提醒：5 分钟'] as const;

// Change render() signature:
render(stage: StageDefinition, stageElapsed: number, targets: readonly Target[], danger: number, flash = ''): void {
  // existing room drawing stays here

  // After drawing the room and before flash:
if (stage.id === 'reveal') {
  const line = revealLines()[Math.min(2, Math.floor(stageElapsed / 16_667))]!;
  c.fillStyle = '#24212bdd'; c.fillRect(20, 180, 335, 210);
  c.fillStyle = '#ffda45'; c.font = '900 25px sans-serif'; c.fillText(line, DESIGN_WIDTH / 2, 290);
}
  // existing flash drawing stays here
}
```

```ts
// Changes in src/game/Game.ts
import type { TargetKind } from './types';

private flash = '';
private readonly learned = new Set<TargetKind>();
private activeHint?: TargetKind;

constructor(
  private readonly canvas: HTMLCanvasElement,
  private readonly onResult: (result: ReturnType<typeof createResult>) => void,
  private readonly onHint: (text: string) => void = () => undefined,
  speed = 1,
) {
  this.clock = new GameClock(speed);
  this.renderer = new CanvasRenderer(canvas);
  this.bindInput();
}

// In loop(), before renderer.render():
const tutorialKind: TargetKind | undefined = stage.id === 'alarms' ? 'tap'
  : stage.id === 'curtains' ? 'drag'
    : stage.id === 'silence' ? 'loop' : undefined;
if (tutorialKind && !this.learned.has(tutorialKind) && this.activeHint !== tutorialKind) {
  this.activeHint = tutorialKind;
  this.onHint({ tap: '点击拍灭闹钟', drag: '拖动窗帘封住晨光', loop: '画线围住噪音源' }[tutorialKind]);
}
this.renderer.render(stage, now - stage.startsAt, this.tasks.active(), snapshot.danger, this.flash);
this.flash = '';

// Replace the pointerup handler body:
const gesture = this.input.end(point(event), performance.now());
const outcome = this.tasks.apply(gesture);
if (outcome === 'success') {
  this.learned.add(gesture.kind);
  if (this.activeHint === gesture.kind) { this.activeHint = undefined; this.onHint(''); }
  this.flash = { tap: '啪！', drag: '唰！', loop: '静音！' }[gesture.kind];
  this.audio.playHit();
  navigator.vibrate?.(20);
}

// Add to reset():
this.learned.clear();
this.activeHint = undefined;
this.onHint('');
```

```ts
// Changes in src/main.ts
app.innerHTML = `<canvas id="game-canvas" width="375" height="667" aria-label="卧室游戏场景"></canvas><div id="tutorial" hidden></div><div id="orientation-lock" hidden>请竖屏游玩</div><section id="result" hidden></section>`;
const tutorial = document.querySelector<HTMLElement>('#tutorial')!;
const showHint = (text: string) => { tutorial.textContent = text; tutorial.hidden = text.length === 0; };
game = new Game(canvas, showResult, showHint, speed ? Number(speed) : 1);
```

```css
/* append to src/styles.css */
#tutorial { position: absolute; left: 50%; bottom: max(24px, env(safe-area-inset-bottom)); transform: translateX(-50%) rotate(-2deg); padding: 9px 14px; border: 3px solid #24212b; border-radius: 10px; background: #fff; font-weight: 900; white-space: nowrap; box-shadow: 4px 5px 0 #24212b; }
#tutorial[hidden] { display: none; }
```

- [ ] **Step 4: 运行单元测试、构建并人工查看加速流程**

Run: `npm test && npm run build`

Expected: 全部测试 PASS，构建成功。

Run: `npm run dev -- --port 4173`

Open: `http://127.0.0.1:4173/?testSpeed=60`

Expected: 约 4.5 秒依次看到五阶段、反转文案和结算页；正常 URL 不带 `testSpeed` 时保持 3–5 分钟。

- [ ] **Step 5: 提交反馈与反转演出**

```bash
git add src/game/render/CanvasRenderer.ts src/game/Game.ts src/main.ts tests/unit/reveal-copy.test.ts
git commit -m "feat(game): add comic feedback and identity reveal"
```

## Task 11: 添加完整流程、重玩、横屏和静音 E2E

**Files:**
- Create: `tests/e2e/game.spec.ts`
- Modify: `playwright.config.ts`

- [ ] **Step 1: 写完整流程 E2E 测试**

```ts
// tests/e2e/game.spec.ts
import { expect, test } from '@playwright/test';

test('always reaches the reveal and can replay', async ({ page }) => {
  await page.goto('/?testSpeed=120');
  await expect(page.getByLabel('卧室游戏场景')).toBeVisible();
  await expect(page.getByRole('heading', { name: '世界已获救？' })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('迟到 5 分钟')).toBeVisible();
  await page.getByRole('button', { name: '再睡一次' }).click();
  await expect(page.getByRole('heading', { name: '世界已获救？' })).toBeHidden();
  await expect(page.getByLabel('卧室游戏场景')).toBeVisible();
});

test('shows portrait guidance in landscape', async ({ page }) => {
  await page.setViewportSize({ width: 667, height: 375 });
  await page.goto('/?testSpeed=120');
  await expect(page.getByText('请竖屏游玩')).toBeVisible();
});

test('finishes when audio creation is unavailable', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(window, 'AudioContext', { value: undefined }); });
  await page.goto('/?testSpeed=120');
  await page.getByLabel('卧室游戏场景').click({ position: { x: 20, y: 20 } });
  await expect(page.getByRole('heading', { name: '世界已获救？' })).toBeVisible({ timeout: 10_000 });
});
```

- [ ] **Step 2: 运行 E2E 确认暴露真实问题**

Run: `npx playwright install chromium && npm run test:e2e`

Expected: 前两个测试 PASS；第三个测试 FAIL，错误来自不可用的 `AudioContext` 构造或调用。

- [ ] **Step 3: 修复音频 API 缺失时的静默降级**

```ts
// replace unlock() guard in src/game/audio/AudioManager.ts
async unlock(): Promise<void> {
  const AudioContextClass = window.AudioContext;
  if (!AudioContextClass) return;
  this.context ??= new AudioContextClass();
  await this.context.resume();
  this.unlocked = true;
}
```

同时将 `void this.audio.unlock()` 改为 `void this.audio.unlock().catch(() => undefined)`，保证浏览器拒绝音频恢复时不产生未处理异常。

- [ ] **Step 4: 运行 E2E、单元测试和构建**

Run: `npm run test:e2e && npm test && npm run build`

Expected: 3 个 Playwright 测试 PASS；全部 Vitest 测试 PASS；Vite build exit 0。

- [ ] **Step 5: 提交浏览器流程验证**

```bash
git add tests/e2e/game.spec.ts src/game/audio/AudioManager.ts src/game/Game.ts playwright.config.ts
git commit -m "test(game): cover mobile game journey"
```

## Task 12: 首版验收、性能降级和交付文档

**Files:**
- Create: `README.md`
- Create: `tests/unit/performance-mode.test.ts`
- Create: `src/game/runtime/PerformanceMonitor.ts`
- Modify: `src/game/render/CanvasRenderer.ts`
- Modify: `src/game/Game.ts`

- [ ] **Step 1: 写低性能模式失败测试**

```ts
// tests/unit/performance-mode.test.ts
import { expect, it } from 'vitest';
import { feedbackBudget } from '../../src/game/render/CanvasRenderer';
import { PerformanceMonitor } from '../../src/game/runtime/PerformanceMonitor';

it('keeps core feedback but removes particles in reduced mode', () => {
  expect(feedbackBudget(true)).toEqual({ particles: 0, shake: 2, squash: true, words: true });
  expect(feedbackBudget(false)).toEqual({ particles: 18, shake: 6, squash: true, words: true });
});

it('enters reduced mode after 60 slow frames', () => {
  const monitor = new PerformanceMonitor(false);
  for (let frame = 0; frame < 60; frame += 1) monitor.sample(25);
  expect(monitor.reduced()).toBe(true);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/unit/performance-mode.test.ts`

Expected: FAIL，提示 `feedbackBudget` 不存在。

- [ ] **Step 3: 添加降级策略和 README**

```ts
// add to src/game/render/CanvasRenderer.ts
export function feedbackBudget(reduced: boolean) {
  return reduced
    ? { particles: 0, shake: 2, squash: true, words: true }
    : { particles: 18, shake: 6, squash: true, words: true };
}
```

```ts
// src/game/runtime/PerformanceMonitor.ts
export class PerformanceMonitor {
  private readonly samples: number[] = [];
  constructor(private readonly prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches) {}
  sample(frameMs: number): void {
    this.samples.push(frameMs);
    if (this.samples.length > 60) this.samples.shift();
  }
  reduced(): boolean {
    if (this.prefersReduced) return true;
    if (this.samples.length < 60) return false;
    return this.samples.reduce((sum, value) => sum + value, 0) / this.samples.length > 24;
  }
}
```

```ts
// Changes in src/game/Game.ts
import { PerformanceMonitor } from './runtime/PerformanceMonitor';
private readonly performanceMonitor = new PerformanceMonitor();

// In loop(), immediately after delta is calculated:
this.performanceMonitor.sample(delta);

// Change render call:
this.renderer.render(stage, now - stage.startsAt, this.tasks.active(), snapshot.danger, this.flash, this.performanceMonitor.reduced());
```

```ts
// Change CanvasRenderer.render signature and wrap scene drawing:
render(stage: StageDefinition, stageElapsed: number, targets: readonly Target[], danger: number, flash = '', reduced = false): void {
  const budget = feedbackBudget(reduced);
  const c = this.context;
  c.clearRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
  c.save();
  if (flash) c.translate((Math.random() - 0.5) * budget.shake, (Math.random() - 0.5) * budget.shake);
  // Existing room, targets, reveal and flash drawing remains inside this save/restore pair.
  if (flash) {
    c.fillStyle = '#ef5f62';
    for (let i = 0; i < budget.particles; i += 1) c.fillRect(170 + (i % 6) * 8, 205 + Math.floor(i / 6) * 8, 4, 4);
  }
  c.restore();
}
```

````md
<!-- README.md -->
# 再睡五分钟

竖屏 H5 漫画风互动小游戏。玩家通过点击、拖动和画线保护“沉睡巨兽”，最终发现自己只是手机闹钟的“稍后提醒”按钮。

## 开发

```bash
npm install
npm run dev
```

## 验证

```bash
npm test
npm run build
npm run test:e2e
```

使用 `/?testSpeed=120` 只用于自动化和本地快速验收；发布链接不得携带该参数。
````

- [ ] **Step 4: 执行完整验收**

Run: `npm run check`

Expected: Vitest 0 failures；Vite build exit 0；Playwright 0 failures。

Run: `git diff --check && git status --short`

Expected: `git diff --check` 无输出；工作区只包含本任务预期文件。

人工设备检查：

1. iOS 微信竖屏进入，首次触摸后有声或静默降级，不阻塞游戏。
2. Android 微信竖屏完成点击、拖动、画线各一次。
3. 游戏切后台 5 秒再返回，阶段不会跳过。
4. 横屏显示“请竖屏游玩”，恢复竖屏后继续。
5. 正常速度完整游玩一局，计时处于 3–5 分钟。
6. 结算后点击“再睡一次”，评分、危机值和计时全部归零。

- [ ] **Step 5: 提交首版交付状态**

```bash
git add README.md src/game/runtime/PerformanceMonitor.ts src/game/render/CanvasRenderer.ts src/game/Game.ts tests/unit/performance-mode.test.ts
git commit -m "docs(game): document mvp delivery and checks"
```

## 最终规格覆盖检查

- 核心操作：Tasks 3、4、6、9。
- 五阶段节奏与 3–5 分钟时长：Tasks 5、6、9、11。
- 软失败和 S/A/B 评分：Tasks 2、4、9。
- 漫画视觉、拟声词、形变和反转：Tasks 7、10。
- 音频首触解锁、静音降级、振动：Tasks 8、9、11。
- 前后台暂停、横屏提示、尺寸映射：Tasks 5、7、8、11。
- 资源失败与低性能降级：Tasks 8、11、12。
- 完整结算和立即重玩：Tasks 2、9、11。
- 微信与移动设备验收：Task 12。
- 首版排除项：计划未引入后端、登录、排行、广告、养成、多结局或横屏专用布局。
