import { afterEach, describe, expect, it } from 'vitest';
import { defaultSettings, loadSettings, migrateLegacySettings } from '@/majview/settings';

/**
 * 旧版 Unity 播放器的 `MajdataSettings` 顺序（MajdataView_web 的 SettingsManager.cs）：
 * Offset, NoteSpeed, TouchSpeed, BGCover, BGM, Answer, Judge, Slide, Break, EX, Touch, Hanabi, Others, Combo
 * 音量那 9 项是 dB，只占位置、不迁移。
 */
const legacy = (offset: number, note: number, touch: number, bgCover: number, combo = 1) =>
  [offset, note, touch, bgCover, ...Array.from({ length: 9 }, () => -10), combo].join(',');

afterEach(() => {
  localStorage.clear();
});

describe('migrateLegacySettings', () => {
  it('reads the speed fields from their real positions', () => {
    expect(migrateLegacySettings(legacy(0, 82, 64, 7))).toEqual({
      NoteSpeed: 82,
      TouchSpeed: 64,
      BGCover: 7,
      Combo: true,
    });
  });

  it('never migrates the offsets', () => {
    const migrated = migrateLegacySettings(legacy(123, 75, 75, 8));
    expect(migrated).not.toHaveProperty('Offset');
    expect(migrated).not.toHaveProperty('FirstOffset');
  });

  it('keeps touch speed when the old background slider sits at 0', () => {
    // 旧的 BGCover 与旧的 TouchSpeed 是两回事：BGCover 为 0 不能让 TouchSpeed 变成 0
    expect(migrateLegacySettings(legacy(0, 75, 68, 0))).toMatchObject({ TouchSpeed: 68, BGCover: 0 });
  });

  it('accepts the early builds that put TargetFPS first', () => {
    const withFps = ['2', ...legacy(0, 80, 60, 9).split(',')].join(',');
    expect(migrateLegacySettings(withFps)).toEqual({ NoteSpeed: 80, TouchSpeed: 60, BGCover: 9, Combo: true });
  });

  it('reads the combo flag from the last field', () => {
    expect(migrateLegacySettings(legacy(0, 75, 75, 8, 0))?.Combo).toBe(false);
  });

  it('skips data whose shape is unknown', () => {
    expect(migrateLegacySettings(null)).toBeNull();
    expect(migrateLegacySettings('')).toBeNull();
    expect(migrateLegacySettings('0,75,75,8')).toBeNull();
    expect(migrateLegacySettings('a,b,c,d,e,f,g,h,i,j,k,l,m,1')).toBeNull();
    expect(migrateLegacySettings(`${legacy(0, 75, 75, 8, 0)},2`)).toBeNull();
  });
});

describe('loadSettings', () => {
  it('falls back to the Play defaults', () => {
    expect(defaultSettings()).toMatchObject({
      Offset: 0, FirstOffset: 0, NoteSpeed: 75, TouchSpeed: 75, BGCover: 8, Combo: true,
    });
  });

  it('migrates the old Unity settings with zeroed offsets', () => {
    localStorage.setItem('MajdataSettings', legacy(250, 90, 55, 6, 0));
    const settings = loadSettings();
    expect(settings.NoteSpeed).toBe(90);
    expect(settings.TouchSpeed).toBe(55);
    expect(settings.BGCover).toBe(6);
    expect(settings.Offset).toBe(0);
    expect(settings.FirstOffset).toBe(0);
    expect(settings.Combo).toBe(false);
  });

  it('never leaves the touch speed at zero', () => {
    localStorage.setItem('MajdataSettings', legacy(0, 75, 0, 0));
    expect(loadSettings().TouchSpeed).toBeGreaterThanOrEqual(1);
  });

  it('prefers the saved MajViewSettingsV2 over the legacy string', () => {
    localStorage.setItem('MajdataSettings', legacy(0, 90, 60, 6));
    localStorage.setItem('MajViewSettingsV2', JSON.stringify({ NoteSpeed: 120, TouchSpeed: 130, FirstOffset: -40 }));
    const settings = loadSettings();
    expect(settings.NoteSpeed).toBe(120);
    expect(settings.TouchSpeed).toBe(130);
    expect(settings.FirstOffset).toBe(-40);
    expect(settings.BGCover).toBe(8);
  });

  it('ignores a corrupted legacy value instead of guessing', () => {
    localStorage.setItem('MajdataSettings', 'not,a,setting,string');
    expect(loadSettings()).toMatchObject({ NoteSpeed: 75, TouchSpeed: 75, Offset: 0, FirstOffset: 0 });
  });
});
