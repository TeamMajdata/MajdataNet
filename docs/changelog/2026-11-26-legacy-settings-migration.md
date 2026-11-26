# 旧版 MajView 设置的迁移错位：Touch 流速变成 0、偏移凭空多出来

日期：2026-11-26
分支：`main`

## 背景

`MajdataSettings` 是旧版 Unity 播放器（[MajdataView_web](https://github.com/TeamMajdata/MajdataView_web)
`unity6` 分支 `Assets/Scripts/SettingsManager.cs`）写的一行逗号分隔值：

```
Offset, NoteSpeed, TouchSpeed, BGCover,
BGM, Answer, Judge, Slide, Break, EX, Touch, Hanabi, Others,   ← dB
Combo(0/1)
```

共 14 项（更早的 build 前面多一个 `TargetFPS`，15 项）。

迁移代码按 `VIEW_FIELDS` 的**下标**取值，而 `VIEW_FIELDS` 后来在 `Offset` 后面插入了
`FirstOffset`，于是整体错位一格：

| 新设置 | 实际读到的旧字段 | 结果 |
| --- | --- | --- |
| `Offset` | `Offset` | 尚可，但旧偏移和新版含义不同 |
| `FirstOffset` | **`NoteSpeed`**（75） | First 偏移凭空 +75ms |
| `NoteSpeed` | `TouchSpeed` | 碰巧同值 |
| `TouchSpeed` | **`BGCover`** | 旧背景暗度被当成触屏流速：旧值 0 时被 clamp 到 1，显示成 0.1（看起来就是 0） |
| `BGCover` | **`BGM` 音量（dB）** | 负数 clamp 到 0 → 背景不再压暗 |

所以「Touch 流速有时变成 0」= 旧版背景暗度滑条在 0 的位置。

## 前端改动

| 位置 | 改动 |
| --- | --- |
| `src/majview/settings.ts` | 新增 `migrateLegacySettings`：按旧版的真实顺序取 `NoteSpeed` / `TouchSpeed` / `BGCover` / `Combo`，支持 14/15 两种长度；字段数或数值对不上就整份跳过，回退默认值 |
| `src/majview/settings.ts` | 迁移不再写 `Offset` / `FirstOffset`（一律 0），也不再尝试迁移 dB 音量 |

## 验证

- 新增 `test/majview/settings.test.ts`（14 个用例）：字段位置、偏移不迁移、旧 BGCover 为 0 时
  TouchSpeed 不归零、带 `TargetFPS` 的 15 项格式、Combo 末位、形状不认识时跳过、V2 优先于旧版、
  损坏数据回退默认。
- 浏览器手测：旧串 `250,82,68,6,…`（Offset 250 / Note 82 / Touch 68 / BGCover 6）迁移后
  设置面板显示 8.2 / 6.8 / 60% / 偏移 0 / 连击关。
- `pnpm lint`、`tsc -b`、`pnpm test`（473）、`pnpm i18n:check` 全部通过。

## 注意

- 旧版的 `Offset` 是给 Unity 播放器校准音画用的纯毫秒值；新版 `Offset` 之外还有谱面自带的
  `&first` 和独立的 `First 偏移`，三者叠加，直接搬运旧值会让整张谱面莫名平移，所以只把偏移归零。
- 旧版音量是 dB、并且依赖它自己混音器的基准音量，换算成新版的线性倍数不可靠，所以音量不迁移
  （沿用新版默认值：Slide 静音、Judge 0.7，其余 1.0）。
- 迁移只在没有 `MajViewSettingsV2` 时执行；用户改过一次设置后就会写入 V2，之后不再读旧键。
  已经被错位迁移过、并写进 V2 的浏览器不会自动修好（分不清哪些是用户自己改的），在设置面板点
  一次「重置」即可回到默认值。
- 旧格式的顺序是硬编码在 `migrateLegacySettings` 里的，**不要再用 `VIEW_FIELDS` 的下标去映射**：
  这次的问题就是给 `VIEW_FIELDS` 插入 `FirstOffset` 时，下标映射整体错位了一格。
