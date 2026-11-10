import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import CollapsibleSection from '@/components/ui/CollapsibleSection';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('collapsible section', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  async function render(defaultOpen?: boolean) {
    await act(async () => root.render(
      <CollapsibleSection title="最近游玩的谱面" defaultOpen={defaultOpen}>
        <p>section content</p>
      </CollapsibleSection>,
    ));
  }

  it('starts expanded and folds the content away on click', async () => {
    await render();
    const button = container.querySelector('button')!;
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(container.textContent).toContain('section content');

    await act(async () => button.click());

    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(container.textContent).not.toContain('section content');
    expect(container.textContent).toContain('最近游玩的谱面');
  });

  it('unfolds again on the second click', async () => {
    await render();
    const button = container.querySelector('button')!;
    await act(async () => button.click());
    await act(async () => button.click());

    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(container.textContent).toContain('section content');
  });

  it('can start collapsed', async () => {
    await render(false);

    expect(container.querySelector('button')!.getAttribute('aria-expanded')).toBe('false');
    expect(container.textContent).not.toContain('section content');
  });
});