import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const languages = ['en', 'zh', 'ja', 'ko'];
const localeDirectory = path.join(root, 'src', 'locales');
const sourceDirectory = path.join(root, 'src');
const fullKeyPattern = /^([A-Za-z0-9-]+(?:\/[A-Za-z0-9-]+)+)\.([A-Za-z][A-Za-z0-9_]*)$/;
const namespacePattern = /^[A-Za-z0-9-]+(?:\/[A-Za-z0-9-]+)+$/;
const translationKeyPattern = /^[A-Za-z][A-Za-z0-9]*(?:_(?:zero|one|two|few|many|other))?$/;
const pluralSuffixPattern = /_(zero|one|two|few|many|other)$/;
const interpolationPattern = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g;
const errors = [];

function addError(message) {
  errors.push(message);
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(entryPath) : [entryPath];
  });
}

/** `ns.Key_one` → `ns.Key`; non-plural keys are returned unchanged. */
function baseKey(key) {
  return key.replace(pluralSuffixPattern, '');
}

function variables(value) {
  return [...value.matchAll(interpolationPattern)].map((match) => match[1]).sort().join(',');
}

// 按码点排序（不用 localeCompare，保证各平台结果一致）：并行分支新增的 key 会落在不同位置，减少合并冲突。
function compareKeys(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function sortDeep(value) {
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value).sort(compareKeys).map((key) => [key, sortDeep(value[key])]),
  );
}

function canonicalJson(dictionary) {
  return `${JSON.stringify(sortDeep(dictionary), null, 2)}\n`;
}

const fix = process.argv.includes('--fix');
const fixedFiles = [];

// language → Map<baseKey, Map<pluralCategory | '', value>>
const entries = {};

for (const language of languages) {
  const localePath = path.join(localeDirectory, `${language}.json`);
  const relativeLocalePath = path.relative(root, localePath).replaceAll('\\', '/');
  let dictionary;
  let text;

  try {
    // 统一换行符，Windows 上 checkout 成 CRLF 也不误报
    text = fs.readFileSync(localePath, 'utf8').replaceAll('\r\n', '\n');
    dictionary = JSON.parse(text);
  } catch (error) {
    addError(`${relativeLocalePath}: cannot parse JSON (${error.message})`);
    continue;
  }

  if (!isRecord(dictionary)) {
    addError(`${relativeLocalePath}: root must be an object`);
    continue;
  }

  const canonical = canonicalJson(dictionary);
  if (text !== canonical) {
    if (fix) {
      fs.writeFileSync(localePath, canonical);
      fixedFiles.push(relativeLocalePath);
    } else {
      addError(`${relativeLocalePath}: keys are not sorted or formatting differs; run "pnpm i18n:fix"`);
    }
  }

  const keys = new Map();
  for (const [namespace, translations] of Object.entries(dictionary)) {
    if (!namespacePattern.test(namespace)) {
      addError(`${language}: invalid namespace "${namespace}"; expected route/component`);
    }
    if (!isRecord(translations)) {
      addError(`${language}: namespace "${namespace}" must contain an object`);
      continue;
    }

    for (const [key, value] of Object.entries(translations)) {
      const fullKey = `${namespace}.${key}`;
      if (!translationKeyPattern.test(key)) {
        addError(`${language}: invalid key "${fullKey}"`);
      }
      if (typeof value !== 'string' || value.trim() === '') {
        addError(`${language}: "${fullKey}" must be a non-empty string`);
        continue;
      }
      if (/\$\{/.test(value)) {
        addError(`${language}: "${fullKey}" uses \${...}; use {{name}} interpolation instead`);
      }
      const category = key.match(pluralSuffixPattern)?.[1] ?? '';
      if (!keys.has(baseKey(fullKey))) keys.set(baseKey(fullKey), new Map());
      keys.get(baseKey(fullKey)).set(category, value);
    }
  }

  entries[language] = keys;
}

const referenceLanguage = languages[0];
const referenceKeys = entries[referenceLanguage] ?? new Map();

for (const language of languages) {
  const keys = entries[language] ?? new Map();
  const requiredCategories = new Intl.PluralRules(language).resolvedOptions().pluralCategories;

  for (const [key, forms] of keys) {
    const isPlural = !forms.has('');
    if (isPlural) {
      for (const category of requiredCategories) {
        if (!forms.has(category)) addError(`${language}: plural "${key}" is missing "_${category}"`);
      }
    } else if (forms.size > 1) {
      addError(`${language}: "${key}" mixes plural and non-plural forms`);
    }
  }

  if (language === referenceLanguage) continue;
  for (const [key, forms] of referenceKeys) {
    if (!keys.has(key)) {
      addError(`${language}: missing translation "${key}"`);
      continue;
    }
    const expected = variables([...forms.values()][0]);
    for (const value of keys.get(key).values()) {
      if (variables(value) !== expected) {
        addError(`${language}: "${key}" interpolates {${variables(value)}} but ${referenceLanguage} uses {${expected}}`);
      }
    }
  }
  for (const key of keys.keys()) {
    if (!referenceKeys.has(key)) addError(`${language}: extra translation "${key}"`);
  }
}

const usedKeys = new Set();
const dynamicCalls = [];
const legacyImports = new Set(['loc', 'useLoc', 'getTranslatedString', 'useI18n', 'I18nProvider']);

function isTranslateCall(node) {
  const callee = node.expression;
  // t('key') / i18n.t('key')
  return (ts.isIdentifier(callee) && callee.text === 't')
    || (ts.isPropertyAccessExpression(callee) && callee.name.text === 't');
}

for (const file of walk(sourceDirectory).filter((entry) => /\.(?:ts|tsx)$/.test(entry) && !entry.endsWith('.d.ts'))) {
  const source = fs.readFileSync(file, 'utf8');
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const relativePath = path.relative(root, file).replaceAll('\\', '/');

  function location(node) {
    return `${relativePath}:${sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1}`;
  }

  function visit(node) {
    if (ts.isImportSpecifier(node) && legacyImports.has(node.name.text)) {
      addError(`${location(node)}: legacy i18n import "${node.name.text}" is not allowed; use useTranslation from react-i18next`);
    }

    // Covers t('key'), <Trans i18nKey="key">, and keys stored in constants.
    if (ts.isStringLiteralLike(node) && referenceKeys.has(node.text)) {
      usedKeys.add(node.text);
    }

    if (ts.isCallExpression(node) && isTranslateCall(node)) {
      const keyArgument = node.arguments[0];
      if (keyArgument && ts.isStringLiteralLike(keyArgument)) {
        usedKeys.add(keyArgument.text);
        if (!fullKeyPattern.test(keyArgument.text)) {
          addError(`${location(keyArgument)}: invalid i18n key "${keyArgument.text}"; expected route/component.key`);
        }
        const fallback = node.arguments[1];
        if (fallback && ts.isStringLiteralLike(fallback)) {
          addError(`${location(fallback)}: inline fallback text is not allowed; missing keys fall back to ${referenceLanguage}`);
        }
      } else if (keyArgument) {
        dynamicCalls.push(`${location(keyArgument)} (${keyArgument.getText(sourceFile)})`);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

for (const key of usedKeys) {
  if (fullKeyPattern.test(key) && !referenceKeys.has(key)) addError(`source references missing translation "${key}"`);
}
for (const key of referenceKeys.keys()) {
  if (!usedKeys.has(key)) addError(`unused translation "${key}"`);
}

for (const file of fixedFiles) console.log(`Sorted and formatted ${file}`);

if (errors.length > 0) {
  console.error(`i18n check failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  const namespaces = new Set([...referenceKeys.keys()].map((key) => key.slice(0, key.lastIndexOf('.'))));
  console.log(
    `i18n check passed: ${languages.length} languages, ${namespaces.size} namespaces, ${referenceKeys.size} keys.`,
  );
  if (dynamicCalls.length > 0) {
    console.log(`Validated ${dynamicCalls.length} dynamic call site(s) through their namespaced source constants.`);
  }
}
