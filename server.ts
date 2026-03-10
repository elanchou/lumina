import express from "express";
import { createServer as createViteServer } from "vite";
import yahooFinance from "yahoo-finance2";

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
      const symbols = symbol.split(',');
      if (symbols.length === 1) {
        const quote = await yahooFinance.quote(symbols[0]);
        res.json(quote);
      } else {
        const quotes = await yahooFinance.quote(symbols);
        res.json(quotes);
      }
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
      const date = new Date();
      date.setMonth(date.getMonth() - 1);
      const queryOptions = { period1: date }; // 1 month history
      const result = await yahooFinance.historical(symbol, queryOptions);
      res.json(result);
    } catch (error) {
      console.error("Error fetching history:", error);
      res.status(500).json({ error: "Failed to fetch history" });
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
