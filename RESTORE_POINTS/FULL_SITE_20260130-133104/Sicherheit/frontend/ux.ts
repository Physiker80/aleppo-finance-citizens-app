import { SECURITY_CONFIG } from '../config';
import { log } from '../logger';

export function initUXMonitoring() {
  if (!SECURITY_CONFIG.ux.enable) return;
  try {
    if (SECURITY_CONFIG.ux.clarityId) {
      // Microsoft Clarity
      (function(c,l,a,r,i,t,y){
        // @ts-ignore
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode?.insertBefore(t,y);
        // @ts-ignore
      })(window, document, 'clarity', 'script', SECURITY_CONFIG.ux.clarityId);
      log.info('ux.clarity.init', { id: SECURITY_CONFIG.ux.clarityId });
    }
    if (SECURITY_CONFIG.ux.hotjarId) {
      // Hotjar
      (function(h,o,t,j,a,r){
        // @ts-ignore
        h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
        h._hjSettings={hjid: Number(SECURITY_CONFIG.ux.hotjarId), hjsv: Number(SECURITY_CONFIG.ux.hotjarSv || '6')};
        a=o.getElementsByTagName('head')[0];
        r=o.createElement('script');r.async=1;r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
        a.appendChild(r);
      })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
      log.info('ux.hotjar.init', { id: SECURITY_CONFIG.ux.hotjarId });
    }
  } catch (e: any) {
    log.error('ux.init.error', { error: e?.message || String(e) });
  }
}
