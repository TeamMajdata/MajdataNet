import { useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LuChevronRight, LuX } from 'react-icons/lu';
import { defaultSettings, EFFECT_VOLUMES, MAIN_VOLUMES, VIEW_FIELDS, VOLUME_RANGE, type SettingKey, type ViewSettings } from '@/majview/settings';

// 写出完整的 key，i18n 检查才找得到
const LABELS = {
  NoteSpeed: 'song/MajView.SettingNoteSpeed',
  TouchSpeed: 'song/MajView.SettingTouchSpeed',
  Offset: 'song/MajView.SettingOffset',
  FirstOffset: 'song/MajView.SettingFirstOffset',
  BGCover: 'song/MajView.SettingBGCover',
  Master: 'song/MajView.SettingMaster',
  BGM: 'song/MajView.SettingBGM',
  Answer: 'song/MajView.SettingAnswer',
  Effects: 'song/MajView.SettingEffects',
  Judge: 'song/MajView.SettingJudge',
  Slide: 'song/MajView.SettingSlide',
  Break: 'song/MajView.SettingBreak',
  EX: 'song/MajView.SettingEX',
  Touch: 'song/MajView.SettingTouch',
  Hanabi: 'song/MajView.SettingHanabi',
} as const satisfies Record<SettingKey, string>;

const VIEW_KEYS: SettingKey[] = ['NoteSpeed', 'TouchSpeed', 'Offset', 'FirstOffset', 'BGCover'];

/**
 * 数字框里显示和输入用的单位：流速按 Play 显示成 7.5（存的是 75），背景暗度显示成百分比（存的是 0–10），
 * 偏移是毫秒，音量是倍数
 */
function toDisplay(key: SettingKey, value: number) {
  if (key === 'NoteSpeed' || key === 'TouchSpeed') return (value / 10).toFixed(1);
  if (key === 'BGCover') return String(value * 10);
  if (key === 'Offset' || key === 'FirstOffset') return String(value);
  return value.toFixed(1);
}

function fromDisplay(key: SettingKey, value: number) {
  if (key === 'NoteSpeed' || key === 'TouchSpeed') return Math.round(value * 10);
  if (key === 'BGCover') return Math.round(value / 10);
  if (key === 'Offset' || key === 'FirstOffset') return Math.round(value);
  return Math.round(value * 10) / 10;
}

const UNITS: Partial<Record<SettingKey, string>> = { Offset: 'ms', FirstOffset: 'ms', BGCover: '%' };

/** 滑块旁边的数字框：可以直接输入，回车或离开时生效，超出范围按边界算，输错了恢复原值 */
function NumberField({ id, name, value, min, max, onChange }: {
  id: string;
  name: SettingKey;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<string | null>(null);
  const commit = (input: HTMLInputElement) => {
    const parsed = Number(input.value.trim().replace(',', '.'));
    if (input.value.trim() !== '' && Number.isFinite(parsed)) {
      const next = Math.max(min, Math.min(max, fromDisplay(name, parsed)));
      if (next !== value) onChange(next);
    }
    setDraft(null);
  };
  return (
    <span className="flex items-center gap-1 text-white/55 text-xs">
      <input
        type="text"
        // 偏移可以是负数，iOS 的小数键盘没有负号，只好用完整键盘
        inputMode={min < 0 ? 'text' : 'decimal'}
        enterKeyHint="done"
        aria-label={t(LABELS[name])}
        aria-describedby={id}
        value={draft ?? toDisplay(name, value)}
        onFocus={(e) => { setDraft(e.currentTarget.value); e.currentTarget.select(); }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => commit(e.currentTarget)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') {
            // 只撤销这次输入，不关掉整个设置面板
            e.stopPropagation();
            setDraft(null);
            requestAnimationFrame(() => (e.target as HTMLInputElement).blur());
          }
        }}
        // iOS Safari 聚焦字号小于 16px 的输入框会放大整页，所以手机上用 16px
        className="bg-white/[0.05] focus:bg-white/10 px-1.5 border border-white/10 focus:border-sky-300/60 rounded-md outline-none w-14 max-sm:w-16 h-6 max-sm:h-7 text-white/85 text-xs max-sm:text-base text-center tabular-nums transition-colors"
      />
      {/* 单位占固定宽度，有没有单位的数字框都能对齐 */}
      <span className="w-5 text-left">{UNITS[name]}</span>
    </span>
  );
}

/** 滑块头（thumb）中心大概在哪：按值比例算，两端留出半个拇指的宽度 */
function thumbCenterX(input: HTMLInputElement) {
  const rect = input.getBoundingClientRect();
  const min = Number(input.min || 0);
  const max = Number(input.max || 100);
  const ratio = (Number(input.value) - min) / (max - min || 1);
  const inset = 8;
  return rect.left + inset + ratio * Math.max(0, rect.width - 2 * inset);
}

/** 手指落点是否压在滑块头上（给一点容差，方便按住） */
const THUMB_HIT_PX = 18;

function Slider({ name, value, onChange }: { name: SettingKey; value: number; onChange: (value: number) => void }) {
  const { t } = useTranslation();
  const id = useId();
  const field: { min: number; max: number; step?: number } = VIEW_FIELDS.find((f) => f.key === name) ?? VOLUME_RANGE;
  // 手机上点滑条身体会直接跳到那个值，翻页时很容易误触，所以只允许从滑块头开始拖
  const blockedRef = useRef(false);
  return (
    <div className="items-center gap-x-3 grid grid-cols-[1fr_auto] py-1.5">
      <label htmlFor={id} className="text-white/75 text-sm">{t(LABELS[name])}</label>
      <NumberField id={id} name={name} value={value} min={field.min} max={field.max} onChange={onChange} />
      <input
        id={id}
        type="range"
        min={field.min}
        max={field.max}
        step={field.step ?? 1}
        value={value}
        onPointerDown={(e) => {
          // 只对触摸生效：鼠标点滑条照样可以跳
          blockedRef.current = e.pointerType === 'touch'
            && Math.abs(e.clientX - thumbCenterX(e.currentTarget)) > THUMB_HIT_PX;
        }}
        onPointerUp={() => { blockedRef.current = false; }}
        onPointerCancel={() => { blockedRef.current = false; }}
        onChange={(e) => {
          if (blockedRef.current) {
            // 没按住滑块头：把浏览器的“跳到点击位置”改回去，状态不变
            e.currentTarget.value = String(value);
            return;
          }
          onChange(Math.round(Number(e.target.value) * 10) / 10);
        }}
        className="col-span-2 mt-1 w-full accent-sky-300 cursor-pointer touch-pan-y"
      />
    </div>
  );
}

/**
 * 播放器里的设置面板：画在播放器内部（而不是全站弹窗），这样全屏时也能打开。
 */
export default function MajViewSettings({ settings, onChange, onClose }: {
  settings: ViewSettings;
  onChange: (patch: Partial<ViewSettings>) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const headingId = useId();
  return (
    <div
      className="majview-settings"
      role="dialog"
      aria-labelledby={headingId}
      onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}
    >
      <div className="flex justify-between items-center mb-2">
        <h3 id={headingId} className="m-0 font-semibold text-white text-base">{t('song/MajView.Settings')}</h3>
        <button type="button" onClick={onClose} aria-label={t('song/MajView.CloseSettings')}
          className="grid place-items-center hover:bg-white/10 rounded-lg w-8 h-8 text-white/70 hover:text-white transition-colors cursor-pointer">
          <LuX aria-hidden="true" className="w-4 h-4" />
        </button>
      </div>

      <section>
        {VIEW_KEYS.map((key) => <Slider key={key} name={key} value={settings[key]} onChange={(value) => onChange({ [key]: value })} />)}
        <label className="flex justify-between items-center py-2 text-white/75 text-sm cursor-pointer">
          {t('song/MajView.SettingCombo')}
          <input type="checkbox" checked={settings.Combo} onChange={(e) => onChange({ Combo: e.target.checked })} className="w-4 h-4 accent-sky-300 cursor-pointer" />
        </label>
        <label className="flex justify-between items-center py-2 text-white/75 text-sm cursor-pointer">
          {t('song/MajView.SettingCounter')}
          <input type="checkbox" checked={settings.Counter} onChange={(e) => onChange({ Counter: e.target.checked })} className="w-4 h-4 accent-sky-300 cursor-pointer" />
        </label>
        <label className="flex justify-between items-center py-2 text-white/75 text-sm cursor-pointer">
          {t('song/MajView.SettingPerf')}
          <input type="checkbox" checked={settings.Perf} onChange={(e) => onChange({ Perf: e.target.checked })} className="w-4 h-4 accent-sky-300 cursor-pointer" />
        </label>
        <label className="flex justify-between items-center py-2 text-white/75 text-sm cursor-pointer">
          {t('song/MajView.SettingSlideClassic')}
          <input type="checkbox" checked={settings.SlideClassic} onChange={(e) => onChange({ SlideClassic: e.target.checked })} className="w-4 h-4 accent-sky-300 cursor-pointer" />
        </label>
        {/* 开关本身叫“禁用手势”，存的是“启用手势”，勾上才是关 */}
        <label className="flex justify-between items-center py-2 text-white/75 text-sm cursor-pointer">
          {t('song/MajView.SettingDisableGestures')}
          <input type="checkbox" checked={!settings.Gestures} onChange={(e) => onChange({ Gestures: !e.target.checked })} className="w-4 h-4 accent-sky-300 cursor-pointer" />
        </label>
      </section>

      <section className="mt-2 pt-3 border-white/10 border-t">
        <h4 className="m-0 mb-1 font-medium text-white/50 text-xs">{t('song/MajView.Volume')}</h4>
        {MAIN_VOLUMES.map((key) => <Slider key={key} name={key} value={settings[key]} onChange={(value) => onChange({ [key]: value })} />)}
        <details className="group mt-1">
          <summary className="flex items-center gap-1 py-1.5 text-white/55 hover:text-white/80 text-xs list-none cursor-pointer [&::-webkit-details-marker]:hidden">
            <LuChevronRight aria-hidden="true" className="w-3.5 h-3.5 group-open:rotate-90 transition-transform" />
            {t('song/MajView.EffectDetails')}
          </summary>
          <div className="pl-3 border-white/10 border-l">
            {EFFECT_VOLUMES.map((key) => <Slider key={key} name={key} value={settings[key]} onChange={(value) => onChange({ [key]: value })} />)}
          </div>
        </details>
      </section>

      <button type="button" onClick={() => onChange(defaultSettings())}
        className="hover:bg-white/10 mt-3 py-2 border border-white/15 rounded-lg w-full text-white/75 hover:text-white text-sm transition-colors cursor-pointer">
        {t('song/MajView.ResetSettings')}
      </button>
    </div>
  );
}
