import { useEffect } from 'react';

export default function ZadarmaWidget() {
  useEffect(() => {
    let active = true;
    let pollInterval: any;

    const initWidget = async () => {
      try {
        const res = await fetch('/api/zadarma/webrtc_key');
        const data = await res.json();
        if (data.status === 'success' && data.key && data.sip) {
          if (!active) return;
          
          pollInterval = setInterval(() => {
            if (typeof (window as any).zadarmaWidgetFn === 'function' && typeof (window as any).zdrmWebrtcPhoneInterface !== 'undefined') {
              clearInterval(pollInterval);
              if (!document.getElementById('zadarma-webrtc-widget')) {
                  try {
                    (window as any).zadarmaWidgetFn(
                      data.key,
                      data.sip.toString(),
                      'square',
                      'es',
                      true,
                      { right: '10px', bottom: '25px' }
                    );
                  } catch (e) {
                    console.error('Failed to start zadarmaWidgetFn', e);
                  }
              }
            }
          }, 500);

        }
      } catch (err) {
        console.error('Failed to init zadarma widget', err);
      }
    };

    initWidget();

    return () => {
      active = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, []);

  return null;
}
