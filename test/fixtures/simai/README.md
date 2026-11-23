# Simai parity fixtures

`charts.json` holds chart texts and `golden.json` the model MajSimai 3.0.1
(`Lingfeng-bbben.MajSimai`, `SimaiParser.ParseChart`) produces for them. The JS port in
`src/majview/simai.js` is tested against these recordings in
`test/majview/simai.parity.test.ts`, so a change of the parser shows up as a diff instead of a
silent drift from the player.

`golden.json` is generated, never edited by hand. It needs a .NET SDK (10 or newer) and a NuGet
restore of the package:

```bash
pnpm simai:golden
```

The script builds a throwaway console app that references the pinned package version, runs it
over `charts.json` and overwrites `golden.json`. Bump `MAJSIMAI_VERSION` in
`scripts/gen-simai-golden.mjs` when a new MajSimai release changes the model, then review the
diff of `golden.json` before committing it: every change there means the port has to change too.

Fixtures cover:

- declarations: `(bpm)`, `{beats}`, `{#seconds}`, `<HS*x>`, `<SV*x>`, `||s3/4`, comments;
- notes: taps, holds, slides (including chains, `*` same head groups, `!`/`?` heads and `@` tap
  heads), touches, touch holds, each and fake each, flags `b`/`x`/`m`/`$`/`$$`/`c`/`f`;
- durations: `[division:beats]`, `[#seconds]`, `[bpm#division:beats]`, `[bpm#seconds]`,
  `[wait##division:beats]` and `[wait##bpm#division:beats]`;
- the end marker `E`, stray text, and the text a lenient parse drops.
