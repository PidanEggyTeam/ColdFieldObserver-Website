// ============================================================
// MDC AST 序列化
//   @nuxt/content 的 body 是 Minimark 树，服务端要输出 HTML（feed）
//   或纯文本（检索语料）时，用一个极小的序列化器即可，避免引入额外依赖。
// ============================================================

interface MdcNode {
  type?: string;
  tag?: string;
  value?: string | unknown[];
  props?: Record<string, unknown>;
  attributes?: Record<string, unknown>;
  children?: MdcNode[];
}

const VOID_TAGS = new Set(['br', 'hr', 'img', 'input', 'source', 'area', 'base', 'col', 'embed']);

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderAttrs(props: Record<string, unknown> | undefined): string {
  if (!props) return '';
  const parts: string[] = [];
  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'className' || key === 'class') {
      const cls = Array.isArray(value) ? value.join(' ') : String(value);
      parts.push(`class="${escapeHtml(cls)}"`);
      continue;
    }
    if (key === 'style' && typeof value === 'object') {
      const css = Object.entries(value as Record<string, string>)
        .map(([k, v]) => `${k}:${v}`)
        .join(';');
      parts.push(`style="${escapeHtml(css)}"`);
      continue;
    }
    if (typeof value === 'object') continue;
    parts.push(`${key}="${escapeHtml(String(value))}"`);
  }
  return parts.length ? ` ${parts.join(' ')}` : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function minimarkAttrs(props: unknown): string {
  if (!isRecord(props)) return '';
  const attributes: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (['__ignoreMap', 'code', 'language', 'meta'].includes(key)) continue;
    const name =
      key === 'className' ? 'class' : key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
    if (key === 'style' && isRecord(value)) {
      attributes[name] = Object.fromEntries(
        Object.entries(value).map(([property, declaration]) => [
          property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`),
          declaration,
        ]),
      );
    } else {
      attributes[name] = value;
    }
  }
  return renderAttrs(attributes);
}

function minimarkToHtml(node: unknown): string {
  if (typeof node === 'string') return escapeHtml(node);
  if (!Array.isArray(node)) return '';
  const [tag, props, ...children] = node;
  if (typeof tag !== 'string') return node.map(minimarkToHtml).join('');
  const attrs = minimarkAttrs(props);
  if (VOID_TAGS.has(tag)) return `<${tag}${attrs}>`;
  return `<${tag}${attrs}>${children.map(minimarkToHtml).join('')}</${tag}>`;
}

function minimarkToText(node: unknown): string {
  if (typeof node === 'string') return node;
  if (!Array.isArray(node)) return '';
  const [tag, props, ...children] = node;
  if (typeof tag !== 'string') return node.map(minimarkToText).join('');
  const inner = [props, ...children]
    .filter((child) => typeof child !== 'object' || child === null || Array.isArray(child))
    .map(minimarkToText)
    .join('');
  return `${inner} `;
}

export function mdcToHtml(node: MdcNode | null | undefined): string {
  if (!node) return '';
  if (node.type === 'minimark') {
    return Array.isArray(node.value) ? node.value.map(minimarkToHtml).join('') : '';
  }
  if (node.type === 'text') return typeof node.value === 'string' ? escapeHtml(node.value) : '';
  if (node.type === 'comment') return '';
  const children = (node.children ?? []).map((child) => mdcToHtml(child)).join('');
  if (node.type === 'root' || !node.tag) return children;
  const tag = node.tag;
  const attrs = renderAttrs(node.props ?? node.attributes);
  if (VOID_TAGS.has(tag)) return `<${tag}${attrs}>`;
  return `<${tag}${attrs}>${children}</${tag}>`;
}

/** 纯文本（用于本地检索语料）：块级元素之间补空格，避免词粘连 */
export function mdcToText(node: MdcNode | null | undefined): string {
  if (!node) return '';
  if (node.type === 'minimark') {
    return Array.isArray(node.value) ? node.value.map(minimarkToText).join('') : '';
  }
  if (node.type === 'text') return typeof node.value === 'string' ? node.value : '';
  const inner = (node.children ?? []).map((child) => mdcToText(child)).join('');
  return node.tag ? `${inner} ` : inner;
}
