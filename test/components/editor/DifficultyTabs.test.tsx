import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import DifficultyTabs, { DIFFICULTY_NAMES } from '@/components/editor/DifficultyTabs';

vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);

async function mount(element: React.ReactElement) {
  const container = document.createElement('div');
  const root = createRoot(container);
  await act(async () => { root.render(element); });
  return {
    container,
    unmount: async () => { await act(async () => { root.unmount(); }); },
  };
}

it('七个难度常驻，包括没有内容的档位', async () => {
  const { container, unmount } = await mount(<DifficultyTabs active={4} dirty={[]} onSelect={() => {}} />);
  try {
    const tabs = [...container.querySelectorAll('[role="tab"]')];
    expect(tabs.map((tab) => tab.textContent)).toEqual([...DIFFICULTY_NAMES]);
  } finally {
    await unmount();
  }
});

it('只在有未保存改动的档位上显示星号', async () => {
  const dirty = [false, false, false, false, true, false, false];
  const { container, unmount } = await mount(<DifficultyTabs active={4} dirty={dirty} onSelect={() => {}} />);
  try {
    const tabs = [...container.querySelectorAll('[role="tab"]')];
    expect(tabs[4].textContent).toBe('MASTER*');
    expect(tabs[3].textContent).toBe('EXPERT');
    expect(container.querySelectorAll('.editor-tab-dirty')).toHaveLength(1);
  } finally {
    await unmount();
  }
});

it('当前档位有选中态，点击回调难度下标', async () => {
  const onSelect = vi.fn();
  const { container, unmount } = await mount(<DifficultyTabs active={2} dirty={[]} onSelect={onSelect} />);
  try {
    const tabs = [...container.querySelectorAll('[role="tab"]')];
    expect(tabs[2].getAttribute('aria-selected')).toBe('true');
    expect(tabs[4].getAttribute('aria-selected')).toBe('false');
    (tabs[4] as HTMLButtonElement).click();
    expect(onSelect).toHaveBeenCalledWith(4);
  } finally {
    await unmount();
  }
});
