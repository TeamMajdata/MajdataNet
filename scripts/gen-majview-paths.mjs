#!/usr/bin/env node
// Regenerates src/majview/generated/paths.json from the slide prefabs of MajdataPlay
// (Assets/Prefabs/Game/Slides). Each prefab holds the arrows of one slide shape as child
// transforms; the last child, a nested Just_* prefab, is the arrow drawn at the judgment line.
//
//   node scripts/gen-majview-paths.mjs [prefab-dir]
//
// Without an argument the script takes MAJDATAPLAY_SLIDES, then ../MajdataPlay from this repo.
// The output is checked in: the web player does not read the Unity assets at runtime.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const output = join(root, 'src/majview/generated/paths.json');

const prefabDir = resolve(
  process.argv[2] ?? process.env.MAJDATAPLAY_SLIDES ?? join(root, '../MajdataPlay/MajdataPlay/Assets/Prefabs/Game/Slides'),
);
if (!existsSync(prefabDir)) {
  console.error(`MajdataPlay slide prefabs not found: ${prefabDir}`);
  console.error('Pass the folder as an argument or set MAJDATAPLAY_SLIDES.');
  process.exit(1);
}

// The order of the existing file is kept so that a regeneration only changes what the assets
// changed.
const families = Object.keys(JSON.parse(readFileSync(output, 'utf8')));

const round = (value, digits) => Number(value.toFixed(digits));

/** Reads a Unity prefab into its transforms and the nested prefab instances they hold. */
function parsePrefab(file) {
  const text = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const blocks = text
    .split(/^--- !u!\d+ &/m)
    .slice(1)
    .map((doc) => {
      const id = doc.slice(0, doc.indexOf('\n')).trim();
      const type = doc.slice(doc.indexOf('\n') + 1).split(':')[0].trim();
      return { id, type, body: doc };
    });

  const names = new Map();
  for (const block of blocks) {
    if (block.type === 'GameObject') {
      const match = block.body.match(/  m_Name: (.*)/);
      names.set(block.id, match ? match[1] : undefined);
    }
  }

  const transforms = new Map();
  const nested = new Map();
  for (const block of blocks) {
    if (block.type === 'Transform') {      const gameObject = block.body.match(/m_GameObject: \{fileID: (-?\d+)\}/);
      const position = block.body.match(/m_LocalPosition: \{x: ([-\d.e]+), y: ([-\d.e]+)/);
      const rotation = block.body.match(/m_LocalRotation: \{x: ([-\d.e]+), y: ([-\d.e]+), z: ([-\d.e]+), w: ([-\d.e]+)\}/);
      const scale = block.body.match(/m_LocalScale: \{x: ([-\d.e]+), y: ([-\d.e]+)/);
      const children = block.body.match(/m_Children:\n((?:  - \{fileID: -?\d+(?:, guid: [0-9a-f]+)?(?:, type: \d)?\}\n)*)/);
      transforms.set(block.id, {
        key: block.id,
        name: gameObject ? names.get(gameObject[1]) : undefined,
        x: position ? Number(position[1]) : 0,
        y: position ? Number(position[2]) : 0,
        angle: rotation ? (2 * Math.atan2(Number(rotation[3]), Number(rotation[4])) * 180) / Math.PI : 0,
        sx: scale ? Number(scale[1]) : 1,
        sy: scale ? Number(scale[2]) : 1,
        father: block.body.match(/m_Father: \{fileID: (-?\d+)\}/)?.[1],
        children: children ? [...children[1].matchAll(/fileID: (-?\d+)/g)].map((match) => match[1]) : [],
        values: null,
      });
    } else if (block.type === 'PrefabInstance') {
      // A nested Just_* prefab: its root transform lives in another file, so read the
      // overrides the parent prefab applies to it.
      const values = new Map();
      let target = null;
      for (const modification of block.body.matchAll(
        /- target: \{fileID: (-?\d+), guid: [0-9a-f]+, type: \d\}\n\s+propertyPath: ([^\n]+)\n\s+value: ([^\n]+)\n/g,
      )) {
        target ??= modification[1];
        values.set(modification[2].trim(), modification[3].trim());
      }
      const parent = block.body.match(/m_TransformParent: \{fileID: (-?\d+)\}/)?.[1];
      if (target) nested.set(target, { values, parent });
    }
  }
  return { transforms, nested };
}

function local(node) {
  if (!node.values) return { x: node.x, y: node.y, angle: node.angle, sx: node.sx, sy: node.sy };
  const value = (name, fallback) => {
    const raw = node.values.get(name);
    return raw === undefined ? fallback : Number(raw);
  };
  return {
    x: value('m_LocalPosition.x', 0),
    y: value('m_LocalPosition.y', 0),
    angle: (2 * Math.atan2(value('m_LocalRotation.z', 0), value('m_LocalRotation.w', 1)) * 180) / Math.PI,
    sx: value('m_LocalScale.x', 1),
    sy: value('m_LocalScale.y', 1),
  };
}

/** Places a transform in the space of the prefab root. */
function world(node, lookup, cache = new Map(), depth = 0) {
  if (cache.has(node.key)) return cache.get(node.key);
  const localTransform = local(node);
  const radians = (localTransform.angle * Math.PI) / 180;
  let result = { ...localTransform, angle: radians };
  if (node.father && node.father !== '0' && depth < 32) {
    const fatherNode = lookup(node.father);
    if (fatherNode) {
      const father = world(fatherNode, lookup, cache, depth + 1);
      const cos = Math.cos(father.angle);
      const sin = Math.sin(father.angle);
      const x = localTransform.x * father.sx;
      const y = localTransform.y * father.sy;
      result = {
        x: father.x + cos * x - sin * y,
        y: father.y + sin * x + cos * y,
        angle: father.angle + radians,
        sx: father.sx * localTransform.sx,
        sy: father.sy * localTransform.sy,
      };
    }
  }
  cache.set(node.key, result);
  return result;
}

const paths = {};
for (const name of families) {
  const { transforms, nested } = parsePrefab(join(prefabDir, name + '.prefab'));
  // A nested prefab (the Just_* arrow) has no Transform of its own in this file: the parent
  // lists it as a child and the PrefabInstance block holds the overrides the parent applies.
  const instanceOf = (parentId) => {
    const matches = [...nested.values()].filter((instance) => instance.parent === parentId);
    return matches.length === 1 ? matches[0] : null;
  };
  const lookup = (id, parentId) => {
    const transform = transforms.get(id);
    if (transform) return transform;
    const instance = instanceOf(parentId);
    if (!instance) return null;
    return { key: id, name: 'just', father: parentId, values: instance.values };
  };
  const rootNode = [...transforms.values()].find((transform) => transform.father === '0');
  if (!rootNode) throw new Error(`${name}: the prefab has no root transform`);

  const bars = [];
  let just = null;
  for (const child of rootNode.children) {
    const node = lookup(child, rootNode.key);
    if (!node) continue;
    const transform = world(node, (id) => lookup(id, node.father ?? rootNode.key));
    // The web player works in a 1080 px disc where one Unity unit is 100 px, y down.
    const bar = [transform.x * 100, -transform.y * 100, -transform.angle, transform.sx, transform.sy];
    if (node.values || /just/i.test(node.name ?? '')) just = [round(bar[0], 3), round(bar[1], 3), round(bar[2], 6)];
    else bars.push([round(bar[0], 3), round(bar[1], 3), round(bar[2], 6), bar[3], bar[4]]);
  }
  if (!just) throw new Error(`${name}: the prefab has no Just_* arrow`);
  paths[name] = { bars, just };
}

writeFileSync(output, JSON.stringify(paths, null, 0) + '\n');
console.log(`wrote ${Object.keys(paths).length} slide shapes to ${output}`);
