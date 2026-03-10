import express from "express";
import { createServer as createViteServer } from "vite";
import { fetchCryptoList, fetchHistory, fetchQuotes } from "./lib/serverMarketData";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API routes
  app.get("/api/quote", async (req, res) => {
    const { symbol } = req.query;
    if (!symbol || typeof symbol !== "string") {
      return res.status(400).json({ error: "Symbol is required" });
    }
    try {
      const quotes = await fetchQuotes(symbol);
      const requestedSymbols = symbol.split(',').map(item => item.trim()).filter(Boolean);

      if (requestedSymbols.length === 1) {
        const quote = quotes[0];
        if (!quote) {
          return res.status(404).json({ error: "Quote not found", symbol: requestedSymbols[0] });
        }
        return res.json(quote);
      }

      return res.json(quotes);
    } catch (error) {
      console.error("Error fetching quote:", error);
      res.status(500).json({ error: "Failed to fetch quote" });
    }
  });

  app.get("/api/history", async (req, res) => {
    const { symbol } = req.query;
    if (!symbol || typeof symbol !== "string") {
      return res.status(400).json({ error: "Symbol is required" });
    }
    try {
      const result = await fetchHistory(symbol);
      res.json(result);
    } catch (error) {
      console.error("Error fetching history:", error);
      res.status(500).json({ error: "Failed to fetch history" });
    }
  });

  app.get("/api/crypto-list", async (_req, res) => {
    try {
      const result = await fetchCryptoList();
      res.json(result);
    } catch (error) {
      console.error("Error fetching crypto list:", error);
      res.status(502).json({ error: "Failed to fetch crypto list", items: [] });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
