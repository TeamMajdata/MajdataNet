import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const languages = ['en', 'zh', 'ja', 'ko'];
const localeDirectory = path.join(root, 'public', 'i18n');
const sourceDirectory = path.join(root, 'src');
const fullKeyPattern = /^([A-Za-z0-9-]+(?:\/[A-Za-z0-9-]+)+)\.([A-Za-z][A-Za-z0-9_]*)$/;
const namespacePattern = /^[A-Za-z0-9-]+(?:\/[A-Za-z0-9-]+)+$/;
const translationKeyPattern = /^[A-Za-z][A-Za-z0-9_]*$/;
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

const dictionaries = {};
const flattenedKeys = {};

for (const language of languages) {
  const localePath = path.join(localeDirectory, `${language}.json`);
  let dictionary;

  try {
    dictionary = JSON.parse(fs.readFileSync(localePath, 'utf8'));
  } catch (error) {
    addError(`${path.relative(root, localePath)}: cannot parse JSON (${error.message})`);
    continue;
  }

  if (!isRecord(dictionary)) {
    addError(`${path.relative(root, localePath)}: root must be an object`);
    continue;
  }

  const keys = new Set();
  for (const [namespace, translations] of Object.entries(dictionary)) {
    if (!namespacePattern.test(namespace)) {
      addError(`${language}: invalid namespace "${namespace}"; expected route/component`);
    }
    if (!isRecord(translations)) {
      addError(`${language}: namespace "${namespace}" must contain an object`);
      continue;
    }

    for (const [key, value] of Object.entries(translations)) {
      if (!translationKeyPattern.test(key)) {
        addError(`${language}: invalid key "${namespace}.${key}"`);
      }
      if (typeof value !== 'string' || value.trim() === '') {
        addError(`${language}: "${namespace}.${key}" must be a non-empty string`);
      }
      keys.add(`${namespace}.${key}`);
    }
  }

  dictionaries[language] = dictionary;
  flattenedKeys[language] = keys;
}

const referenceLanguage = languages[0];
const referenceKeys = flattenedKeys[referenceLanguage] ?? new Set();
for (const language of languages.slice(1)) {
  const keys = flattenedKeys[language] ?? new Set();
  for (const key of referenceKeys) {
    if (!keys.has(key)) addError(`${language}: missing translation "${key}"`);
  }
  for (const key of keys) {
    if (!referenceKeys.has(key)) addError(`${language}: extra translation "${key}"`);
  }
}

const usedKeys = new Set();
const dynamicCalls = [];
const legacyImports = new Set(['loc', 'useLoc', 'getTranslatedString', 'useTranslation']);

for (const file of walk(sourceDirectory).filter((entry) => /\.(?:ts|tsx)$/.test(entry))) {
  const source = fs.readFileSync(file, 'utf8');
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const relativePath = path.relative(root, file).replaceAll('\\', '/');

  function location(node) {
    return `${relativePath}:${sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1}`;
  }

  function visit(node) {
    if (ts.isImportSpecifier(node) && legacyImports.has(node.name.text)) {
      addError(`${location(node)}: legacy i18n import "${node.name.text}" is not allowed`);
    }

    if (ts.isStringLiteralLike(node) && referenceKeys.has(node.text)) {
      usedKeys.add(node.text);
    }

    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'i18n') {
      const keyArgument = node.arguments[0];
      if (!keyArgument) {
        addError(`${location(node)}: i18n() requires a key`);
      } else if (ts.isStringLiteralLike(keyArgument)) {
        usedKeys.add(keyArgument.text);
        if (!fullKeyPattern.test(keyArgument.text)) {
          addError(`${location(keyArgument)}: invalid i18n key "${keyArgument.text}"; expected route/component.key`);
        }
      } else {
        dynamicCalls.push(`${location(keyArgument)} (${keyArgument.getText(sourceFile)})`);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

for (const key of usedKeys) {
  if (!referenceKeys.has(key)) addError(`source references missing translation "${key}"`);
}
for (const key of referenceKeys) {
  if (!usedKeys.has(key)) addError(`unused translation "${key}"`);
}

if (errors.length > 0) {
  console.error(`i18n check failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(
    `i18n check passed: ${languages.length} languages, ${Object.keys(dictionaries[referenceLanguage] ?? {}).length} namespaces, ${referenceKeys.size} keys.`,
  );
  if (dynamicCalls.length > 0) {
    console.log(`Validated ${dynamicCalls.length} dynamic call site(s) through their namespaced source constants.`);
  }
}
