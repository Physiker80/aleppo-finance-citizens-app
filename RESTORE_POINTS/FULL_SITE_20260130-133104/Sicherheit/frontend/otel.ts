// Frontend OpenTelemetry initialization (opt-in via SECURITY_CONFIG.tracing.enable)
import { SECURITY_CONFIG } from '../config';
import { log } from '../logger';

export async function initFrontendOTEL() {
  if (!SECURITY_CONFIG.tracing.enable) return;
  try {
    const [web, base, otlp, resMod, semconv, instr, fetchMod, docLoadMod]
      = await Promise.all([
        import('@opentelemetry/sdk-trace-web'),
        import('@opentelemetry/sdk-trace-base'),
        import('@opentelemetry/exporter-trace-otlp-http'),
        import('@opentelemetry/resources'),
        import('@opentelemetry/semantic-conventions'),
        import('@opentelemetry/instrumentation'),
        import('@opentelemetry/instrumentation-fetch'),
        import('@opentelemetry/instrumentation-document-load')
      ] as any);
    const { WebTracerProvider } = web;
    const { BatchSpanProcessor } = base;
    const { OTLPTraceExporter } = otlp;
    const { Resource } = resMod;
    const { SemanticResourceAttributes } = semconv;
    const { registerInstrumentations } = instr;
    const { FetchInstrumentation } = fetchMod;
    const { DocumentLoadInstrumentation } = docLoadMod;

    const resAttrs: Record<string, string> = {};
    if (SECURITY_CONFIG.tracing.resourceAttributes) {
      SECURITY_CONFIG.tracing.resourceAttributes.split(',').forEach((kv) => {
        const [k, v] = kv.split('='); if (k && v) resAttrs[k.trim()] = v.trim();
      });
    }

    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: SECURITY_CONFIG.tracing.serviceName || 'frontend',
      ...resAttrs,
    });

    const provider = new WebTracerProvider({ resource });
    const exporter = new OTLPTraceExporter({ url: SECURITY_CONFIG.tracing.otlpHttpUrl });
    provider.addSpanProcessor(new BatchSpanProcessor(exporter));
    provider.register();

    registerInstrumentations({
      instrumentations: [
        new FetchInstrumentation({ propagateTraceHeaderCorsUrls: [/./] }),
        new DocumentLoadInstrumentation(),
      ],
    });

    log.info('otel.frontend.init', { ok: true, url: SECURITY_CONFIG.tracing.otlpHttpUrl });
  } catch (e: any) {
    log.error('otel.frontend.init.error', { error: e?.message || String(e) });
  }
}
