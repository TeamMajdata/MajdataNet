#!/usr/bin/env node
// Regenerates test/fixtures/simai/golden.json by running the C# MajSimai parser over
// test/fixtures/simai/charts.json. The result is the reference the JS port is tested against,
// so it is checked in and only this script needs a .NET SDK and a NuGet restore.
//
//   pnpm simai:golden
//
// The package version is pinned below; bump it when MajSimai brings a new note model and
// re-record the fixtures, so a behaviour change shows up as a test diff rather than a
// silent drift.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAJSIMAI_VERSION = '3.0.1';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const chartsPath = join(root, 'test/fixtures/simai/charts.json');
const goldenPath = join(root, 'test/fixtures/simai/golden.json');

const program = `using System.Text.Json;
using MajSimai;

var cases = JsonSerializer.Deserialize<string[]>(File.ReadAllText(args[0]))!;
var result = new List<object>();
foreach (var text in cases)
{
    try
    {
        var chart = SimaiParser.ParseChart(text);
        var timings = new List<object>();
        foreach (var tp in chart.NoteTimings.ToArray())
        {
            var notes = tp.Notes;
            var list = new List<object>();
            for (var i = 0; i < notes.Length; i++)
            {
                var n = notes[i];
                var related = new List<int>();
                foreach (var r in n.RelatedNotes)
                {
                    related.Add(Array.IndexOf(notes, r));
                }
                list.Add(new
                {
                    type = n.Type.ToString(),
                    start = n.StartPosition,
                    area = n.TouchArea.ToString(),
                    hold = n.HoldTime,
                    slideStart = n.SlideStartTime,
                    slideTime = n.SlideTime,
                    raw = n.RawContent,
                    @break = n.IsBreak,
                    ex = n.IsEx,
                    mine = n.IsMine,
                    star = n.IsStar,
                    starDouble = n.IsStarDouble,
                    each = n.IsEach,
                    hanabi = n.IsHanabi,
                    forceStar = n.IsForceStar,
                    fakeRotate = n.IsFakeRotate,
                    tapHeadSlide = n.IsTapHeadSlide,
                    usingSV = n.UsingSV,
                    related,
                });
            }
            timings.Add(new
            {
                time = tp.Timing,
                bpm = (double)tp.Bpm,
                hs = (double)tp.HSpeed,
                sv = (double)tp.SVeloc,
                raw = tp.RawContent,
                notes = list,
            });
        }
        result.Add(new { ok = true, timings });
    }
    catch (Exception e)
    {
        result.Add(new { ok = false, error = e.GetType().Name });
    }
}
Console.WriteLine(JsonSerializer.Serialize(result));
`;

const project = `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <OutputType>Exe</OutputType>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <InvariantGlobalization>true</InvariantGlobalization>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Lingfeng-bbben.MajSimai" Version="${MAJSIMAI_VERSION}" />
  </ItemGroup>
</Project>
`;

const work = mkdtempSync(join(tmpdir(), 'majsimai-golden-'));
try {
  writeFileSync(join(work, 'Oracle.csproj'), project);
  writeFileSync(join(work, 'Program.cs'), program);
  const output = execFileSync('dotnet', ['run', '--project', work, '--', chartsPath], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  const line = output
    .split(/\r?\n/)
    .filter((l) => l.startsWith('['))
    .at(-1);
  if (!line) throw new Error('the oracle printed no JSON');
  const parsed = JSON.parse(line);
  writeFileSync(goldenPath, JSON.stringify(parsed));
  const charts = JSON.parse(readFileSync(chartsPath, 'utf8'));
  console.log(`wrote ${parsed.length} results for ${charts.length} charts to ${goldenPath}`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
