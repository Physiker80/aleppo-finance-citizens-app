// Node.js OpenTelemetry initialization (opt-in via env OTEL_TRACING_ENABLED=true)
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const enabled = (process.env.OTEL_TRACING_ENABLED || 'false') === 'true';
if (enabled) {
  try {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.WARN);
    const serviceName = process.env.OTEL_SERVICE_NAME || 'backend';
    const otlpUrl = process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || 'http://localhost:4318/v1/traces';

    const sdk = new NodeSDK({
      resource: new Resource({ [SemanticResourceAttributes.SERVICE_NAME]: serviceName }),
      traceExporter: new OTLPTraceExporter({ url: otlpUrl }),
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': { enabled: false },
        })
      ],
    });
    sdk.start();
    console.log('[OTEL] NodeSDK started', { serviceName, otlpUrl });
    process.on('SIGTERM', () => { sdk.shutdown().finally(() => process.exit(0)); });
  } catch (e) {
    console.warn('[OTEL] init failed', e?.message || e);
  }
}
