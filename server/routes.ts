import type { Express, Request, Response } from "express";
import { type Server } from "http";
import {
  convertLeadSchema,
  convertQuoteToJobSchema,
  createQuoteSchema,
  quoteStatusSchema,
  updateVisitSchema,
  webhookLeadSchema,
} from "@shared/schema";
import { storage } from "./storage";

function requireWebhookSecret(req: Request, res: Response): boolean {
  const configuredSecret = process.env.WEBHOOK_SECRET;
  if (!configuredSecret) {
    res.status(500).json({
      message:
        "WEBHOOK_SECRET is not configured on the server. Set this env var before receiving leads.",
    });
    return false;
  }

  const incomingSecret = req.header("X-WEBHOOK-SECRET");
  if (incomingSecret !== configuredSecret) {
    res.status(401).json({ message: "Invalid webhook secret" });
    return false;
  }

  return true;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  await storage.ensureSeedAdmin();

  app.post("/api/leads", async (req, res) => {
    if (!requireWebhookSecret(req, res)) {
      return;
    }

    const parsed = webhookLeadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid lead payload",
        issues: parsed.error.flatten(),
      });
    }

    const lead = await storage.createLead(parsed.data);
    return res.status(201).json({ lead });
  });

  app.get("/api/leads", async (_req, res) => {
    const leads = await storage.listLeads();
    return res.json({ leads });
  });

  app.post("/api/leads/:leadId/convert", async (req, res) => {
    const parsed = convertLeadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid conversion payload",
        issues: parsed.error.flatten(),
      });
    }

    try {
      const result = await storage.convertLeadToCustomerAndProperty(
        req.params.leadId,
        parsed.data,
      );
      return res.json(result);
    } catch (error) {
      return res.status(404).json({ message: (error as Error).message });
    }
  });

  app.post("/api/quotes", async (req, res) => {
    const parsed = createQuoteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid quote payload",
        issues: parsed.error.flatten(),
      });
    }

    const quote = await storage.createQuote(parsed.data);
    return res.status(201).json({ quote });
  });

  app.patch("/api/quotes/:quoteId/status", async (req, res) => {
    const parsed = quoteStatusSchema.safeParse(req.body?.status);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid quote status" });
    }

    const quote = await storage.updateQuoteStatus(req.params.quoteId, parsed.data);
    if (!quote) {
      return res.status(404).json({ message: "Quote not found" });
    }

    return res.json({ quote });
  });

  app.post("/api/quotes/:quoteId/convert-to-job", async (req, res) => {
    const parsed = convertQuoteToJobSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid convert-to-job payload",
        issues: parsed.error.flatten(),
      });
    }

    try {
      const result = await storage.convertAcceptedQuoteToJobAndVisits(
        req.params.quoteId,
        parsed.data,
      );
      return res.status(201).json(result);
    } catch (error) {
      return res.status(400).json({ message: (error as Error).message });
    }
  });

  app.get("/api/visits", async (req, res) => {
    const cleanerId = req.query.cleanerId;
    if (typeof cleanerId === "string" && cleanerId.length > 0) {
      const visits = await storage.listVisitsForCleaner(cleanerId);
      return res.json({ visits });
    }

    const visits = await storage.listVisits();
    return res.json({ visits });
  });

  app.patch("/api/visits/:visitId", async (req, res) => {
    const parsed = updateVisitSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid visit update payload",
        issues: parsed.error.flatten(),
      });
    }

    const visit = await storage.updateVisit(req.params.visitId, parsed.data);
    if (!visit) {
      return res.status(404).json({ message: "Visit not found" });
    }

    return res.json({ visit });
  });

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "elite-ops-suite" });
  });

  return httpServer;
}
