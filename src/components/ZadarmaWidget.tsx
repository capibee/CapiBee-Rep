import { useEffect } from 'react';

export default function ZadarmaWidget() {
  useEffect(() => {
    let active = true;
    const initWidget = async () => {
      try {
        const res = await fetch('/api/zadarma/webrtc_key');
        const data = await res.json();
        if (data.status === 'success' && data.key && data.sip) {
          if (!active) return;
          if (typeof (window as any).zadarmaWidgetFn === 'function') {
            // Check if already initialized to prevent multiple iframes
            if (!document.getElementById('zadarma-webrtc-widget')) {
                (window as any).zadarmaWidgetFn(
                data.key,
                data.sip.toString(),
                'square', // square|rounded
                'es',
                true,
                { right: '10px', bottom: '25px' }
                );
            }
          }
        }
      } catch (err) {
        console.error('Failed to init zadarma widget', err);
      }
    };

    if (document.readyState === 'complete') {
        initWidget();
    } else {
        window.addEventListener('load', initWidget);
    }
    
    // Fallback if the widget JS loaded later
    const timer = setTimeout(initWidget, 2000);

    return () => {
      active = false;
      window.removeEventListener('load', initWidget);
      clearTimeout(timer);
    };
  }, []);

  return null;
}
