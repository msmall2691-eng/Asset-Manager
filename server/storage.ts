import {
  type ConvertLeadPayload,
  type ConvertQuoteToJobPayload,
  type CreateQuotePayload,
  type Customer,
  type InsertUser,
  type Job,
  type Lead,
  type Property,
  type Quote,
  type UpdateVisitPayload,
  type User,
  type Visit,
  type WebhookLeadPayload,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  ensureSeedAdmin(): Promise<User>;

  createLead(payload: WebhookLeadPayload): Promise<Lead>;
  listLeads(): Promise<Lead[]>;
  getLead(id: string): Promise<Lead | undefined>;
  updateLeadStatus(id: string, status: Lead["status"]): Promise<Lead | undefined>;

  convertLeadToCustomerAndProperty(
    leadId: string,
    payload: ConvertLeadPayload,
  ): Promise<{ customer: Customer; property: Property; lead: Lead }>;

  createQuote(payload: CreateQuotePayload): Promise<Quote>;
  updateQuoteStatus(id: string, status: Quote["status"]): Promise<Quote | undefined>;
  getQuote(id: string): Promise<Quote | undefined>;

  convertAcceptedQuoteToJobAndVisits(
    quoteId: string,
    payload: ConvertQuoteToJobPayload,
  ): Promise<{ job: Job; visits: Visit[]; lead?: Lead }>;

  listVisits(): Promise<Visit[]>;
  listVisitsForCleaner(cleanerId: string): Promise<Visit[]>;
  updateVisit(id: string, payload: UpdateVisitPayload): Promise<Visit | undefined>;
}

export class MemStorage implements IStorage {
  private users = new Map<string, User>();
  private leads = new Map<string, Lead>();
  private customers = new Map<string, Customer>();
  private properties = new Map<string, Property>();
  private quotes = new Map<string, Quote>();
  private jobs = new Map<string, Job>();
  private visits = new Map<string, Visit>();

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      id,
      username: insertUser.username,
      password: insertUser.password,
      role: insertUser.role ?? "cleaner",
      isActive: true,
    };
    this.users.set(id, user);
    return user;
  }

  async ensureSeedAdmin(): Promise<User> {
    const existing = await this.getUserByUsername("admin");
    if (existing) {
      return existing;
    }

    return this.createUser({
      username: "admin",
      password: "change-me",
      role: "admin",
    });
  }

  async createLead(payload: WebhookLeadPayload): Promise<Lead> {
    const id = randomUUID();
    const createdAt = new Date();
    const lead: Lead = {
      id,
      source: payload.source,
      customerName: payload.customer.name,
      customerPhone: payload.customer.phone ?? null,
      customerEmail: payload.customer.email ?? null,
      propertyAddress: payload.property.address ?? null,
      serviceType: payload.request.serviceType ?? null,
      frequency: payload.request.frequency ?? null,
      preferredDate: payload.request.preferredDate ?? null,
      notes: payload.request.notes ?? null,
      estimateRange: payload.request.estimateRange ?? null,
      status: "new",
      rawPayload: payload,
      createdAt,
    };

    this.leads.set(id, lead);
    return lead;
  }

  async listLeads(): Promise<Lead[]> {
    return Array.from(this.leads.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  async getLead(id: string): Promise<Lead | undefined> {
    return this.leads.get(id);
  }

  async updateLeadStatus(
    id: string,
    status: Lead["status"],
  ): Promise<Lead | undefined> {
    const lead = this.leads.get(id);
    if (!lead) {
      return undefined;
    }

    const updated: Lead = { ...lead, status };
    this.leads.set(id, updated);
    return updated;
  }

  async convertLeadToCustomerAndProperty(
    leadId: string,
    payload: ConvertLeadPayload,
  ): Promise<{ customer: Customer; property: Property; lead: Lead }> {
    const lead = this.leads.get(leadId);
    if (!lead) {
      throw new Error("Lead not found");
    }

    const customerId = randomUUID();
    const customer: Customer = {
      id: customerId,
      name: payload.customer.name,
      phone: payload.customer.phone ?? null,
      email: payload.customer.email ?? null,
      createdAt: new Date(),
    };

    const propertyId = randomUUID();
    const property: Property = {
      id: propertyId,
      customerId,
      address: payload.property.address,
      notes: payload.property.notes ?? null,
      entryNotes: payload.property.entryNotes ?? null,
      lockCode: payload.property.lockCode ?? null,
      parkingNotes: payload.property.parkingNotes ?? null,
      pets: payload.property.pets ?? null,
      createdAt: new Date(),
    };

    this.customers.set(customerId, customer);
    this.properties.set(propertyId, property);

    const updatedLead: Lead = { ...lead, status: "contacted" };
    this.leads.set(leadId, updatedLead);

    return { customer, property, lead: updatedLead };
  }

  async createQuote(payload: CreateQuotePayload): Promise<Quote> {
    const totalCents = payload.lineItems.reduce(
      (sum, item) => sum + item.amountCents,
      0,
    );

    const quote: Quote = {
      id: randomUUID(),
      leadId: payload.leadId,
      customerId: payload.customerId,
      propertyId: payload.propertyId,
      lineItems: payload.lineItems,
      totalCents,
      notes: payload.notes ?? null,
      expiresAt: payload.expiresAt ?? null,
      status: "draft",
      createdAt: new Date(),
    };

    this.quotes.set(quote.id, quote);
    const lead = this.leads.get(payload.leadId);
    if (lead) {
      this.leads.set(payload.leadId, { ...lead, status: "quoted" });
    }

    return quote;
  }

  async updateQuoteStatus(
    id: string,
    status: Quote["status"],
  ): Promise<Quote | undefined> {
    const quote = this.quotes.get(id);
    if (!quote) {
      return undefined;
    }

    const updated = { ...quote, status };
    this.quotes.set(id, updated);
    return updated;
  }

  async getQuote(id: string): Promise<Quote | undefined> {
    return this.quotes.get(id);
  }

  async convertAcceptedQuoteToJobAndVisits(
    quoteId: string,
    payload: ConvertQuoteToJobPayload,
  ): Promise<{ job: Job; visits: Visit[]; lead?: Lead }> {
    const quote = this.quotes.get(quoteId);
    if (!quote) {
      throw new Error("Quote not found");
    }

    if (quote.status !== "accepted") {
      throw new Error("Quote must be accepted before converting to a job");
    }

    const job: Job = {
      id: randomUUID(),
      customerId: quote.customerId,
      propertyId: quote.propertyId,
      quoteId: quote.id,
      serviceType: null,
      frequency: payload.frequency,
      status: "active",
      createdAt: new Date(),
    };

    this.jobs.set(job.id, job);

    const visits: Visit[] = [];
    if (payload.frequency === "one_time") {
      const visit: Visit = {
        id: randomUUID(),
        jobId: job.id,
        scheduledStart: payload.visitStart,
        scheduledEnd: payload.visitEnd,
        assignedCleanerIds: payload.cleanerIds,
        status: "scheduled",
        createdAt: new Date(),
      };
      this.visits.set(visit.id, visit);
      visits.push(visit);
    } else {
      const durationMs = payload.visitEnd.getTime() - payload.visitStart.getTime();
      for (let week = 0; week < payload.weeksToGenerate; week += 1) {
        const start = new Date(payload.visitStart);
        start.setDate(start.getDate() + week * 7);
        const end = new Date(start.getTime() + durationMs);

        const visit: Visit = {
          id: randomUUID(),
          jobId: job.id,
          scheduledStart: start,
          scheduledEnd: end,
          assignedCleanerIds: payload.cleanerIds,
          status: "scheduled",
          createdAt: new Date(),
        };
        this.visits.set(visit.id, visit);
        visits.push(visit);
      }
    }

    const lead = this.leads.get(quote.leadId);
    if (lead) {
      const updatedLead = { ...lead, status: "won" as const };
      this.leads.set(lead.id, updatedLead);
      return { job, visits, lead: updatedLead };
    }

    return { job, visits };
  }

  async listVisits(): Promise<Visit[]> {
    return Array.from(this.visits.values()).sort(
      (a, b) => a.scheduledStart.getTime() - b.scheduledStart.getTime(),
    );
  }

  async listVisitsForCleaner(cleanerId: string): Promise<Visit[]> {
    return (await this.listVisits()).filter((visit) =>
      (visit.assignedCleanerIds as string[]).includes(cleanerId),
    );
  }

  async updateVisit(
    id: string,
    payload: UpdateVisitPayload,
  ): Promise<Visit | undefined> {
    const visit = this.visits.get(id);
    if (!visit) {
      return undefined;
    }

    const updated: Visit = {
      ...visit,
      assignedCleanerIds:
        payload.assignedCleanerIds ?? (visit.assignedCleanerIds as string[]),
      status: payload.status ?? visit.status,
      scheduledStart: payload.scheduledStart ?? visit.scheduledStart,
      scheduledEnd: payload.scheduledEnd ?? visit.scheduledEnd,
    };

    this.visits.set(id, updated);
    return updated;
  }
}

export const storage = new MemStorage();
