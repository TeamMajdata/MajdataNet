// 一次性脚本：把 public/events.json 导入后端的 api/event。
//
// 用法：
//   MAJDATA_PASSWORD=<密码> node scripts/import-events.mjs --api <API 根地址> --username <用户名> [--replace] [--file <路径>]
//   node scripts/import-events.mjs --dry-run            # 只打印转换后的请求体，不连接后端
//
// <API 根地址> 是带 /api 的地址：本地后端为 http://127.0.0.1:34613/api，线上为 https://majdata.net/api3/api。
// 账号需属于 eventManager 或 administrator 组，并且是用密码登录的会话（脚本会自己登录，结束时注销）。
// 已存在的活动默认跳过；加 --replace 则用 PUT 覆盖。
//
// events.json 里的纯日期（如 2026-9-14）按北京时间补全：开始取当天 00:00:00，结束取当天 23:59:59.999，
// 与 ffmc-re 等已带时区的条目写法一致；已带时区的时间原样提交。

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
const BEIJING_OFFSET = '+08:00';

/**
 * 把 events.json 中的时间转换为后端接受的、带秒和时区的 ISO 8601 时间。
 * @param {string} value events.json 中的 createDate 或 endDate
 * @param {'start' | 'end'} boundary 开始时间取当天开头，结束时间取当天末尾
 * @returns {string} 转换后的时间；已带时区的时间原样返回，由后端校验
 */
export function toZonedDateTime(value, boundary) {
  const match = DATE_ONLY_PATTERN.exec(value);
  if (!match) return value;
  const [, year, month, day] = match;
  const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  const time = boundary === 'start' ? '00:00:00' : '23:59:59.999';
  return `${date}T${time}${BEIJING_OFFSET}`;
}

/**
 * 把 events.json 的一项转换为 POST api/event 的请求体。
 * @param {Record<string, unknown>} event events.json 中的一项
 * @returns {Record<string, unknown>} 请求体
 */
export function toEventRequest(event) {
  return {
    id: event.id,
    type: event.type,
    asset: event.asset,
    src: event.src,
    alt: event.alt,
    title: event.title,
    category: event.category,
    createDate: toZonedDateTime(String(event.createDate), 'start'),
    endDate: toZonedDateTime(String(event.endDate), 'end'),
    description: event.description ?? '',
  };
}

/**
 * 读取响应体中的错误说明。
 * @param {Response} response 后端响应
 * @returns {Promise<string>} 状态码与后端返回的 message
 */
async function describeFailure(response) {
  const text = await response.text();
  try {
    const body = JSON.parse(text);
    return `HTTP ${response.status} (code ${body.code}): ${body.message}`;
  } catch {
    return `HTTP ${response.status}${text ? `: ${text}` : ''}`;
  }
}

/**
 * 用账号密码登录，返回会话 Cookie。网页端提交的是密码的 MD5，这里保持一致。
 * @returns {Promise<string>} 形如 token=... 的 Cookie
 */
async function login(api, username, password) {
  const form = new FormData();
  form.set('username', username);
  form.set('password', createHash('md5').update(password).digest('hex'));
  const response = await fetch(`${api}/account/Login`, { method: 'POST', body: form });
  if (!response.ok) throw new Error(`登录失败：${await describeFailure(response)}`);
  const token = response.headers.getSetCookie()
    .map(cookie => cookie.split(';')[0])
    .find(cookie => cookie.startsWith('token='));
  if (!token) throw new Error('登录成功但响应里没有 token Cookie');
  return token;
}

async function main() {
  const { values } = parseArgs({
    options: {
      api: { type: 'string' },
      username: { type: 'string' },
      file: { type: 'string', default: 'public/events.json' },
      replace: { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
    },
  });

  const events = JSON.parse(fs.readFileSync(path.resolve(values.file), 'utf8'));
  const requests = events.map(toEventRequest);
  if (values['dry-run']) {
    console.log(JSON.stringify(requests, null, 2));
    return;
  }

  const password = process.env.MAJDATA_PASSWORD;
  if (!values.api || !values.username || !password) {
    throw new Error('需要 --api、--username 和环境变量 MAJDATA_PASSWORD；只想查看转换结果请用 --dry-run');
  }
  const api = values.api.replace(/\/+$/, '');
  const cookie = await login(api, values.username, password);
  const jsonRequest = (method, body) => ({
    method,
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify(body),
  });

  const summary = { created: 0, replaced: 0, skipped: 0, failed: 0 };
  try {
    for (const request of requests) {
      const created = await fetch(`${api}/event`, jsonRequest('POST', request));
      if (created.status === 201) {
        summary.created++;
        console.log(`创建 ${request.id}`);
        continue;
      }
      if (created.status !== 409) {
        summary.failed++;
        console.error(`失败 ${request.id}：${await describeFailure(created)}`);
        continue;
      }
      if (!values.replace) {
        summary.skipped++;
        console.log(`跳过 ${request.id}（已存在）`);
        continue;
      }
      const replaced = await fetch(`${api}/event/${encodeURIComponent(request.id)}`, jsonRequest('PUT', request));
      if (replaced.ok) {
        summary.replaced++;
        console.log(`覆盖 ${request.id}`);
      } else {
        summary.failed++;
        console.error(`失败 ${request.id}：${await describeFailure(replaced)}`);
      }
    }
  } finally {
    await fetch(`${api}/account/logout`, { method: 'POST', headers: { Cookie: cookie } }).catch(() => {});
  }

  console.log(`共 ${requests.length} 个：创建 ${summary.created}，覆盖 ${summary.replaced}，跳过 ${summary.skipped}，失败 ${summary.failed}`);
  if (summary.failed > 0) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
