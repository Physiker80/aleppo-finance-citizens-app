import React from 'react';
import mermaid from 'mermaid';

interface MermaidProps {
  chart: string;
  className?: string;
}

const Mermaid: React.FC<MermaidProps> = ({ chart, className }) => {
  const [svg, setSvg] = React.useState<string>('');
  const renderId = React.useRef<string>(() => `mermaid-${Math.random().toString(36).slice(2)}` as unknown as string);

  React.useEffect(() => {
    try {
      const isDark = document.documentElement.classList.contains('dark');
      mermaid.initialize({ startOnLoad: false, theme: isDark ? 'dark' : 'default', securityLevel: 'loose' as any });
      (async () => {
        const id = `m-${Math.random().toString(36).slice(2)}`;
        const { svg } = await mermaid.render(id, chart);
        setSvg(svg);
      })();
    } catch (e) {
      setSvg(`<pre style="direction:ltr; white-space:pre-wrap;">${chart.replace(/</g, '&lt;')}</pre>`);
    }
  }, [chart]);

  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: svg }} />
  );
};

export default Mermaid;
