import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const modelPath = '/live2d/xiaoxiaolanbai/xiaoxiaolanbai.model3.json';
const avatarPath = '/live2d/xiaoxiaolanbai/avatar.jpg';
const storageKey = 'majdatanet.live2d-mascot.v1';
const songs = Array.from({ length: 6 }, (_, index) => ({
  id: `mascot-test-${index}`,
  title: ['Blue sky', '星のリズム', 'New journey'][index % 3],
  artist: 'Acceptance fixture',
  uploader: 'Test player',
  designer: 'Test designer',
  levels: ['3', '6', '9', '12', ''],
  hash: `fixture-${index}`,
  tags: [],
  publicTags: [],
  timestamp: '2026-09-20T00:00:00Z',
}));

async function mockApi(page: Page) {
  await page.route('**/api3/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/image') || path.endsWith('/Icon')) {
      await route.fulfill({ path: 'public/xxlb.jpg', contentType: 'image/jpeg' });
      return;
    }
    const body = path.includes('/account/info') ? {}
      : path.endsWith('/maichart/list') ? songs
        : path.endsWith('/summary') ? songs[0]
          : path.endsWith('/interactsum') ? { likeCount: 0, commentCount: 0, playCount: 0 }
            : path.endsWith('/score') ? { scores: [] }
              : [];
    await route.fulfill({ json: body });
  });
  // The player itself is outside this feature; keep its real DOM/stacking surface
  // without downloading the Unity game or sending play events to the live API.
  await page.route('**/WebGLBuild/Build.loader.js', (route) => route.fulfill({
    contentType: 'text/javascript',
    body: 'window.createUnityInstance = async (_canvas, _config, progress) => { progress(1); return { SendMessage() {}, Quit: async () => {}, SetFullscreen() {} }; };',
  }));
}

async function expectNoMascotControls(page: Page) {
  await expect(page.locator('button[data-testid^="mascot-"]')).toHaveCount(0);
  await expect(page.locator(`img[src="${avatarPath}"]`)).toHaveCount(0);
  await expect(page.getByTestId('mascot-dialogue')).toHaveCount(0);
  // Loading/error must not leave an invisible character-sized click target.
  expect(await page.evaluate(() => {
    const mascot = document.querySelector('[data-testid="live2d-mascot"]');
    const bounds = mascot?.getBoundingClientRect()
      ?? { left: 12, top: innerHeight - 312, width: 220, height: 300 };
    return [0.25, 0.5, 0.75].every((fraction) => {
      const hit = document.elementFromPoint(
        bounds.left + bounds.width * fraction,
        bounds.top + bounds.height * fraction,
      );
      return !hit?.closest('[data-testid="live2d-mascot"]');
    });
  })).toBe(true);
}

async function expectHiddenPendingModel(page: Page) {
  const mascot = page.getByTestId('live2d-mascot');
  await expect(mascot).toHaveAttribute('data-model-status', 'loading');
  await expect(mascot).toHaveAttribute('aria-hidden', 'true');
  await expect(mascot).toBeHidden();
  await expect(page.getByTestId('mascot-canvas-host')).toHaveCount(1);
  await expect(mascot.locator('button, [tabindex]')).toHaveCount(0);
  await expectNoMascotControls(page);
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.activeElement?.closest('[data-testid="live2d-mascot"]') === null)).toBe(true);
}

async function monitorMascotContinuity(page: Page) {
  return page.evaluateHandle(() => {
    const mascot = document.querySelector<HTMLElement>('[data-testid="live2d-mascot"]')!;
    const host = mascot.querySelector<HTMLElement>('[data-testid="mascot-canvas-host"]')!;
    const canvas = mascot.querySelector('canvas')!;
    const originalUrl = location.href;
    const violations = new Set<string>();
    let frames = 0;
    let frame = 0;

    const inspect = () => {
      if (document.querySelector('[data-testid="live2d-mascot"]') !== mascot) violations.add('mascot node replaced');
      if (!canvas.isConnected || mascot.querySelector('canvas') !== canvas) violations.add('canvas node replaced or detached');
      if (mascot.dataset.modelStatus !== 'ready') violations.add(`model status changed to ${mascot.dataset.modelStatus}`);
      if (mascot.dataset.collapsed === 'true' || mascot.dataset.mascotState === 'collapsed') violations.add('mascot collapsed');
      if (document.querySelector('[data-testid="mascot-restore"]')) violations.add('restore control appeared');
      if (location.href !== originalUrl) violations.add('URL changed');
      for (const element of [mascot, host, canvas]) {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0' || !rect.width || !rect.height) {
          violations.add('model became invisible');
        }
      }
    };
    const inspectMutations = (records: MutationRecord[]) => {
      for (const record of records) {
        for (const removed of record.removedNodes) {
          if (removed === mascot || removed.contains(mascot) || removed === canvas || removed.contains(canvas)) {
            violations.add('original mascot or canvas was removed, even temporarily');
          }
        }
        if (![mascot, host, canvas].includes(record.target as HTMLElement)) continue;
        // oldValue catches changes restored within one microtask, before a frame
        // or a conventional Playwright visibility assertion can observe them.
        if (record.attributeName === 'data-model-status' && record.oldValue !== 'ready') violations.add('transient non-ready status');
        if (record.attributeName === 'data-collapsed' && record.oldValue === 'true') violations.add('transient collapse');
        if (record.attributeName === 'hidden') violations.add('hidden attribute changed');
        if (record.attributeName === 'style' && record.oldValue) {
          const previous = document.createElement('div');
          previous.setAttribute('style', record.oldValue);
          if (previous.style.display === 'none' || previous.style.visibility === 'hidden' || previous.style.opacity === '0') {
            violations.add('transient invisible style');
          }
        }
      }
      inspect();
    };
    const observer = new MutationObserver(inspectMutations);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeOldValue: true,
      attributeFilter: ['style', 'class', 'hidden', 'data-model-status', 'data-collapsed'],
    });
    const sampleFrame = () => {
      frames += 1;
      inspect();
      frame = requestAnimationFrame(sampleFrame);
    };
    sampleFrame();
    return {
      stop: () => {
        inspectMutations(observer.takeRecords());
        observer.disconnect();
        cancelAnimationFrame(frame);
        return { violations: [...violations], frames };
      },
    };
  });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('language')) localStorage.setItem('language', 'zh');
  });
  await mockApi(page);
});

test('desktop: real model, poke, route persistence and language overlay', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  const pageErrors: string[] = [];
  const assistantRequests: string[] = [];
  let modelLoads = 0;
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === modelPath) modelLoads += 1;
    if (/home-assistant|questions/.test(request.url())) assistantRequests.push(request.url());
  });
  await page.goto('/');
  const mascot = page.getByTestId('live2d-mascot');
  await expect(mascot).toHaveAttribute('data-model-status', 'ready');
  await expect(page.getByTestId('mascot-dialogue')).toHaveCount(0);
  await expect(mascot.locator('canvas')).toBeVisible();
  // l2d reads the manifest for version detection and again inside Cubism.
  const initialModelLoads = modelLoads;
  expect(initialModelLoads).toBeGreaterThan(0);
  await mascot.locator('canvas').evaluate((canvas) => canvas.setAttribute('data-identity', 'original'));
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId('mascot-poke').click();
  await expect(page.getByTestId('mascot-dialogue')).toBeVisible();
  await page.screenshot({ path: info.outputPath('desktop-poke.png'), animations: 'disabled' });
  await expect(page.getByTestId('mascot-dialogue')).toBeVisible();
  await expect(page.getByTestId('mascot-dialogue')).toHaveCount(0, { timeout: 7500 });
  await page.locator('header a[href="/chart-events"]').first().click();
  await expect(page).toHaveURL(/chart-events/);
  await expect(mascot.locator('canvas')).toHaveAttribute('data-identity', 'original');
  expect(modelLoads).toBe(initialModelLoads);
  await page.getByRole('button', { name: '语言设置' }).click();
  await expect(page.locator('#language-select')).toBeVisible();
  const aboveMascot = await page.locator('#language-select').evaluate((select) => {
    const box = select.getBoundingClientRect();
    return document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2) === select;
  });
  expect(aboveMascot).toBe(true);
  await page.screenshot({ path: info.outputPath('desktop-language-overlay.png') });
  expect(assistantRequests).toEqual([]);
  expect(pageErrors).toEqual([]);
});

for (const dismissal of ['bubble text', 'close button', 'Escape', 'automatic expiry'] as const) {
  test(`desktop: dismissing dialogue by ${dismissal} keeps the same model continuously visible`, async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop');
    const errors: string[] = [];
    let modelLoads = 0;
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === modelPath) modelLoads += 1;
    });
    await page.goto('/');
    const mascot = page.getByTestId('live2d-mascot');
    const poke = page.getByTestId('mascot-poke');
    const dialogue = page.getByTestId('mascot-dialogue');
    await expect(mascot).toHaveAttribute('data-model-status', 'ready');
    await expect(mascot.locator('canvas')).toBeVisible();
    const originalModelLoads = modelLoads;
    const originalUrl = page.url();
    const monitor = await monitorMascotContinuity(page);
    await poke.click();
    await expect(dialogue).toBeVisible();
    const dismiss = page.getByTestId('mascot-dismiss-dialogue');
    await expect(dismiss).toBeVisible();
    if (dismissal === 'bubble text') {
      await page.screenshot({ path: info.outputPath('desktop-dialogue-before-dismiss.png') });
      const bounds = (await dialogue.boundingBox())!;
      // Reproduce a navigation link directly under the bubble, independent of
      // homepage card placement. The bubble must consume this pointer event.
      await page.evaluate((box) => {
        const link = document.createElement('a');
        link.href = '/chart-events';
        link.dataset.testid = 'dialogue-underlay-link';
        Object.assign(link.style, {
          position: 'fixed', left: `${box.x}px`, top: `${box.y}px`,
          width: `${box.width}px`, height: `${box.height}px`, zIndex: '39',
        });
        document.body.appendChild(link);
      }, bounds);
      // Hit the message text area, away from the upper-right close glyph.
      await dialogue.click({ position: { x: 45, y: 46 } });
      await expect(page).toHaveURL(originalUrl);
      await page.getByTestId('dialogue-underlay-link').evaluate((link) => link.remove());
    } else if (dismissal === 'close button') {
      const box = (await dismiss.boundingBox())!;
      await page.mouse.click(box.x + box.width - 12, box.y + 12);
    } else if (dismissal === 'Escape') {
      await dismiss.focus();
      await page.keyboard.press('Escape');
    }
    await expect(dialogue).toHaveCount(0, { timeout: 7500 });
    await expect(poke).toBeFocused();
    // Keep watching beyond the runtime's deferred-load window, so a brief
    // unmount/remount cannot hide behind final-state assertions or cached assets.
    await page.waitForTimeout(1500);
    await expect(mascot).toHaveAttribute('data-model-status', 'ready');
    await expect(page.locator('[data-testid="live2d-mascot"][data-collapsed="true"]')).toHaveCount(0);
    await expect(mascot.locator('canvas')).toBeVisible();
    await expect(page.getByTestId('mascot-restore')).toHaveCount(0);
    await expect(page.getByTestId('mascot-collapse')).toHaveCount(0);
    expect(page.url()).toBe(originalUrl);
    expect(modelLoads).toBe(originalModelLoads);
    await page.screenshot({ path: info.outputPath('desktop-dialogue-dismissed.png') });
    const continuity = await monitor.evaluate((watcher) => watcher.stop());
    await monitor.dispose();
    expect(continuity.frames).toBeGreaterThan(5);
    expect(continuity.violations).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test('desktop: drag and keyboard position persist while legacy collapsed preferences cannot hide the model', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  await page.goto('/');
  const mascot = page.getByTestId('live2d-mascot');
  await expect(mascot).toHaveAttribute('data-model-status', 'ready');
  const button = page.getByTestId('mascot-poke');
  const before = (await mascot.boundingBox())!;
  const hit = (await button.boundingBox())!;
  await page.mouse.move(hit.x + hit.width / 2, hit.y + hit.height / 2);
  await page.mouse.down();
  await page.mouse.move(hit.x + hit.width / 2 + 270, hit.y + hit.height / 2 - 100, { steps: 12 });
  await page.mouse.up();
  const moved = (await mascot.boundingBox())!;
  expect(moved.x - before.x).toBeGreaterThan(250);
  await expect(page.getByTestId('mascot-dialogue')).toHaveCount(0);
  await button.focus();
  await page.keyboard.press('ArrowRight');
  expect((await mascot.boundingBox())!.x).toBeCloseTo(moved.x + 16, 0);
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('mascot-dialogue')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('mascot-dialogue')).toHaveCount(0);
  const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), storageKey);
  expect(stored.position.x).toBeCloseTo(moved.x + 16, 0);
  expect(stored.position.y).toBeCloseTo(moved.y, 0);
  await page.reload();
  await expect(mascot).toHaveAttribute('data-model-status', 'ready');
  expect((await mascot.boundingBox())!.x).toBeCloseTo(moved.x + 16, 0);
  expect((await mascot.boundingBox())!.y).toBeCloseTo(moved.y, 0);
  await page.evaluate((key) => {
    const preferences = JSON.parse(localStorage.getItem(key)!);
    localStorage.setItem(key, JSON.stringify({ ...preferences, collapsed: true }));
  }, storageKey);
  await page.reload();
  await expect(mascot).toHaveAttribute('data-model-status', 'ready');
  await expect(mascot.locator('canvas')).toBeVisible();
  await expect(mascot.locator('img')).toHaveCount(0);
  await expect(page.getByTestId('mascot-restore')).toHaveCount(0);
  await expect(page.getByTestId('mascot-collapse')).toHaveCount(0);
  expect((await mascot.boundingBox())!.x).toBeCloseTo(moved.x + 16, 0);
  expect((await mascot.boundingBox())!.y).toBeCloseTo(moved.y, 0);
  await page.setViewportSize({ width: 800, height: 600 });
  const clamped = (await mascot.boundingBox())!;
  expect(clamped.x + clamped.width).toBeLessThanOrEqual(788);
  expect(clamped.y + clamped.height).toBeLessThanOrEqual(588);
});

test('mobile: no mascot, runtime, model or focus targets', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile');
  const requests: string[] = [];
  page.on('request', (request) => {
    if (/\/live2d\/|\/l2d[/.]|\/l2d_|l2d_dist/.test(request.url())) requests.push(request.url());
  });
  await page.goto('/');
  await expect(page.locator('header')).toBeVisible();
  // Allow the desktop idle-load window to elapse before asserting zero requests.
  await page.waitForTimeout(1500);
  await expect(page.getByTestId('live2d-mascot')).toHaveCount(0);
  await expect(page.getByTestId('mascot-poke')).toHaveCount(0);
  expect(requests).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('mobile-home.png'), fullPage: true });
});

test('desktop: reduced motion still displays the real interactive model without an avatar fallback', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  const avatars: string[] = [];
  const errors: string[] = [];
  let modelLoads = 0;
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    const pathname = new URL(request.url()).pathname;
    if (pathname === modelPath) modelLoads += 1;
    if (pathname === avatarPath) avatars.push(request.url());
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const mascot = page.getByTestId('live2d-mascot');
  await expect(mascot).toHaveAttribute('data-model-status', 'ready');
  await expect(mascot).toBeVisible();
  await expect(mascot.locator('canvas')).toBeVisible();
  await expect(mascot.locator('img')).toHaveCount(0);
  await expect(page.getByTestId('mascot-dialogue')).toHaveCount(0);
  await page.getByTestId('mascot-poke').click();
  await expect(page.getByTestId('mascot-dialogue')).toBeVisible();
  await page.screenshot({ path: info.outputPath('desktop-reduced-motion.png') });
  expect(modelLoads).toBeGreaterThan(0);
  expect(avatars).toEqual([]);
  expect(errors).toEqual([]);
});

for (const language of ['zh', 'en', 'ja', 'ko']) {
  test(`desktop: ready model uses ${language} labels, dialogue and dialogue dismissal`, async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop');
    await page.goto('/');
    const mascot = page.getByTestId('live2d-mascot');
    await expect(mascot).toHaveAttribute('data-model-status', 'ready');
    const locale = JSON.parse(readFileSync(new URL(`../public/i18n/${language}.json`, import.meta.url), 'utf8'));
    const phrases = locale['shared/Live2DMascot'];
    // The global language control updates the same mounted mascot instance.
    await page.locator('button').filter({ hasText: '🌐' }).click();
    await page.locator('#language-select').selectOption(language);
    await expect(mascot).toHaveAttribute('aria-label', phrases.Name);
    await expect(page.getByTestId('mascot-poke')).toHaveAttribute('aria-label', phrases.Poke);
    await page.locator('button').filter({ hasText: '×' }).last().click();
    await expect(page.locator('#language-select')).toHaveCount(0);
    await page.getByTestId('mascot-poke').focus();
    await page.keyboard.press('Space');
    await expect(page.getByTestId('mascot-dialogue')).toBeVisible();
    const dialogue = await page.getByTestId('mascot-dialogue').innerText();
    expect(['Shy1', 'Shy2', 'Encourage1', 'Encourage2', 'Cry1', 'Cry2'].some((key) => dialogue.includes(phrases[key]))).toBe(true);
    const dismiss = page.getByTestId('mascot-dismiss-dialogue');
    await expect(dismiss).toHaveAttribute('aria-label', phrases.DismissDialogue);
    await page.screenshot({ path: info.outputPath(`desktop-${language}-dialogue.png`) });
    await dismiss.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('mascot-dialogue')).toHaveCount(0);
    await expect(page.getByTestId('mascot-poke')).toBeFocused();
    await expect(mascot.locator('canvas')).toBeVisible();
    await expect(page.getByTestId('mascot-collapse')).toHaveCount(0);
  });
}

test('desktop: pending model stays invisible and unfocusable until the real model is ready', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  const avatars: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === avatarPath) avatars.push(request.url());
  });
  let releaseModel!: () => void;
  const release = new Promise<void>((resolve) => { releaseModel = resolve; });
  await page.route('**/xiaoxiaolanbai.moc3', async (route) => {
    await release;
    await route.fulfill({ path: 'public/live2d/xiaoxiaolanbai/xiaoxiaolanbai.moc3' });
  });
  await page.goto('/');
  await expectHiddenPendingModel(page);
  expect(avatars).toEqual([]);
  await page.screenshot({ path: info.outputPath('desktop-model-pending.png') });
  releaseModel();
  const mascot = page.getByTestId('live2d-mascot');
  await expect(mascot).toHaveAttribute('data-model-status', 'ready');
  await expect(mascot).toBeVisible();
  await expect(mascot.locator('canvas')).toBeVisible();
  await expect(page.getByTestId('mascot-poke')).toBeVisible();
  await expect(mascot.locator('img')).toHaveCount(0);
  expect(avatars).toEqual([]);
});

test('desktop: failed model disappears without an avatar or an invisible click target', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  let attempts = 0;
  const avatars: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === avatarPath) avatars.push(request.url());
  });
  await page.route(`**${modelPath}`, (route) => {
    attempts += 1;
    return route.fulfill({ status: 404, body: 'missing model' });
  });
  await page.goto('/');
  const mascot = page.getByTestId('live2d-mascot');
  await expectHiddenPendingModel(page);
  await expect(mascot).toHaveCount(0);
  await expectNoMascotControls(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(1500);
  await expect(mascot).toHaveCount(0);
  expect(attempts).toBe(1);
  expect(avatars).toEqual([]);
  await page.screenshot({ path: info.outputPath('desktop-model-unavailable.png') });
});

test('desktop: fullscreen and mobile resize release then restore the model', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const mascot = page.getByTestId('live2d-mascot');
  await expect(mascot).toHaveAttribute('data-model-status', 'ready');
  await page.evaluate(() => document.documentElement.requestFullscreen());
  await expect(mascot).toHaveCount(0);
  await page.evaluate(() => document.exitFullscreen());
  await expect(mascot).toHaveAttribute('data-model-status', 'ready');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(mascot).toHaveCount(0);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(mascot).toHaveAttribute('data-model-status', 'ready');
  expect(errors).toEqual([]);
});

test('desktop: player surface stays above the mascot', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  await page.goto('/song?id=mascot-test-0');
  const mascot = page.getByTestId('live2d-mascot');
  await expect(mascot).toHaveAttribute('data-model-status', 'ready');
  await page.locator('button').filter({ has: page.locator('svg[height="120px"]') }).click();
  const player = page.locator('div.z-100').filter({ has: page.locator('canvas') }).last();
  await expect(player).toBeVisible();
  const playerBox = (await player.boundingBox())!;
  const pokeBox = (await page.getByTestId('mascot-poke').boundingBox())!;
  await page.mouse.move(pokeBox.x + pokeBox.width / 2, pokeBox.y + pokeBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(playerBox.x + playerBox.width / 2, playerBox.y + playerBox.height / 2, { steps: 15 });
  await page.mouse.up();
  const layer = await player.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    const parents = [];
    for (let parent: HTMLElement | null = element; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent);
      parents.push({ tag: parent.tagName, class: parent.className, z: style.zIndex, position: style.position, filter: style.filter, backdrop: style.backdropFilter, transform: style.transform, opacity: style.opacity, isolation: style.isolation });
    }
    return { clear: element.contains(hit), hit: hit?.outerHTML.slice(0, 350), parents };
  });
  expect(layer.clear, JSON.stringify(layer, null, 2)).toBe(true);
  await page.screenshot({ path: info.outputPath('desktop-player-layer.png') });
});

test('desktop: a moc3 arriving after the timeout cannot access a destroyed framework', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  const errors: string[] = [];
  const avatars: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === avatarPath) avatars.push(request.url());
  });
  let releaseModel!: () => void;
  const release = new Promise<void>((resolve) => { releaseModel = resolve; });
  let completed = false;
  await page.route('**/xiaoxiaolanbai.moc3', async (route) => {
    await release;
    await route.fulfill({ path: 'public/live2d/xiaoxiaolanbai/xiaoxiaolanbai.moc3' });
    completed = true;
  });
  await page.goto('/');
  const mascot = page.getByTestId('live2d-mascot');
  await expectHiddenPendingModel(page);
  await expect(mascot).toHaveCount(0);
  await expectNoMascotControls(page);
  releaseModel();
  await expect.poll(() => completed).toBe(true);
  // Give the actual Cubism callbacks time to finish after the decoration disappears.
  await page.waitForTimeout(2000);
  await expect(mascot).toHaveCount(0);
  await expectNoMascotControls(page);
  expect(avatars).toEqual([]);
  expect(errors).toEqual([]);
});
