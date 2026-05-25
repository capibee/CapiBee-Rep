import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // Add Zadarma API route
  app.post("/api/zadarma/call", async (req, res) => {
    const { phoneNumber, internalNumber } = req.body;
    const ZADARMA_KEY = process.env.ZADARMA_KEY || '024313c8754644aa8b4e';
    const ZADARMA_SECRET = process.env.ZADARMA_SECRET || '2ab3b0663c1bc16650c7';

    if (!ZADARMA_KEY || !ZADARMA_SECRET) {
      return res.status(500).json({ error: "Zadarma configuration missing" });
    }

    try {
      // Dynamic import to avoid breaking if not installed (though we installed it)
      const zadarma = await import('zadarma-api');
      const api = new zadarma.default.Api(ZADARMA_KEY, ZADARMA_SECRET);
      
      let fromNumber = internalNumber;
      
      // If no internal number provided, try to get the first PBX or SIP
      if (!fromNumber) {
        try {
          const pbx = await api.getPbxInternal();
          if (pbx && pbx.numbers && pbx.numbers.length > 0) {
            fromNumber = pbx.numbers[0];
          } else {
             const sips = await api.getSip();
             if (sips && sips.sips && sips.sips.length > 0) {
               fromNumber = sips.sips[0].id;
             }
          }
        } catch (e) {
          console.warn("Failed to fetch PBX/SIPs, using fallback.", e);
        }
      }

      if (!fromNumber) {
        return res.status(500).json({ error: "No PBX or SIP number found for Zadarma account" });
      }

      const result = await api.requestCallback(fromNumber.toString(), phoneNumber.toString());
      console.log(`Initiated Zadarma callback from ${fromNumber} to ${phoneNumber}`, result);
      
      res.json({ status: "success", message: `Call initiated from ${fromNumber} to ${phoneNumber}. Please wait for your softphone/device to ring.`, result });
    } catch (error: any) {
      console.error("Zadarma error:", error);
      res.status(500).json({ error: error.message || "Failed to initiate call" });
    }
  });

  app.get("/api/zadarma/webrtc_key", async (req, res) => {
    const ZADARMA_KEY = process.env.ZADARMA_KEY || '024313c8754644aa8b4e';
    const ZADARMA_SECRET = process.env.ZADARMA_SECRET || '2ab3b0663c1bc16650c7';

    if (!ZADARMA_KEY || !ZADARMA_SECRET) {
      return res.status(500).json({ error: "Zadarma configuration missing" });
    }

    try {
      const zadarma = await import('zadarma-api');
      const api = new zadarma.default.Api(ZADARMA_KEY, ZADARMA_SECRET);
      
      let sipLogin = req.query.sipLogin as string;
      
      if (!sipLogin) {
        try {
          const pbx = await api.getPbxInternal();
          if (pbx && pbx.numbers && pbx.numbers.length > 0) {
            sipLogin = pbx.numbers[0].toString();
          } else {
             const sips = await api.getSip();
             if (sips && sips.sips && sips.sips.length > 0) {
               sipLogin = sips.sips[0].id.toString();
             }
          }
        } catch (e) {
          console.warn("Failed to fetch PBX/SIPs", e);
        }
      }

      if (!sipLogin) {
        return res.status(500).json({ error: "No PBX or SIP number found for Zadarma account" });
      }

      const result = await api.getWebrtcKey(sipLogin);
      res.json({ status: "success", key: result.key, sip: sipLogin });
    } catch (error: any) {
      console.error("Zadarma error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch webrtc key" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist'); // Use process.cwd() for robust pathing
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Solicitudes API
  const applications: any[] = [];
  app.get("/api/solicitudes", (req, res) => {
    res.json(applications);
  });
  app.post("/api/solicitudes", (req, res) => {
    const application = req.body;
    application.id = Date.now().toString();
    application.createdAt = new Date().toISOString();
    applications.push(application);
    res.status(201).json(application);
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
