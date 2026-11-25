// Zero-dependency OTLP/HTTP JSON trace emitter. Fail-open, never touches stdout (MCP JSON-RPC owns it).
import { AsyncLocalStorage } from "node:async_hooks"
import { randomBytes } from "node:crypto"

const SERVICE = "llm-wiki-mcp"
const URL_TRACES = `${(process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://127.0.0.1:4318").replace(/\/+$/, "")}/v1/traces`
const TP = /^00-([0-9a-f]{32})-([0-9a-f]{16})-[0-9a-f]{2}$/
const store = new AsyncLocalStorage<{ traceId: string; spanId: string }>()
type Attrs = Record<string, string | number | boolean>
const queue: Record<string, unknown>[] = []
let timer: NodeJS.Timeout | undefined

const attr = (key: string, v: string | number | boolean) => ({
  key,
  value: typeof v === "boolean" ? { boolValue: v } : typeof v === "number" ? { intValue: String(Math.trunc(v)) } : { stringValue: v },
})

function flush(): void {
  timer = undefined
  const spans = queue.splice(0, 50)
  if (queue.length) timer = setTimeout(flush, 500).unref()
  if (!spans.length) return
  const body = { resourceSpans: [{ resource: { attributes: [attr("service.name", SERVICE)] }, scopeSpans: [{ scope: { name: "otel_lite" }, spans }] }] }
  fetch(URL_TRACES, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(1500) }).catch(() => {})
}

export function currentTraceparent(): string | undefined {
  const c = store.getStore()
  return c ? `00-${c.traceId}-${c.spanId}-01` : undefined
}

/** kind: 1 internal, 2 server, 3 client. Continues the active span's trace, else starts one. */
export async function withSpan<T>(name: string, kind: number, attrs: Attrs, fn: (rec: Attrs) => Promise<T>): Promise<T> {
  const parent = store.getStore()
  const traceId = parent?.traceId ?? randomBytes(16).toString("hex")
  const spanId = randomBytes(8).toString("hex")
  const rec: Attrs = { ...attrs }
  const start = BigInt(Date.now()) * 1_000_000n
  let failed = false
  try {
    return await store.run({ traceId, spanId }, () => fn(rec))
  } catch (e) {
    failed = true
    rec["exception.type"] = e instanceof Error ? e.name : "error"
    throw e
  } finally {
    try {
      queue.length < 2000 &&
        queue.push({
          traceId, spanId, name, kind,
          ...(parent ? { parentSpanId: parent.spanId } : {}),
          startTimeUnixNano: String(start), endTimeUnixNano: String(BigInt(Date.now()) * 1_000_000n),
          attributes: Object.entries(rec).map(([k, v]) => attr(k, v)),
          status: { code: failed || Number(rec["http.response.status_code"] ?? 0) >= 500 ? 2 : 1 },
        })
      timer ??= setTimeout(flush, 500).unref()
    } catch { /* fail-open */ }
  }
}

export { TP as TRACEPARENT_RE }
