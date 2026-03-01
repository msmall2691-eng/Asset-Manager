import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("cleaner"),
  isActive: boolean("is_active").notNull().default(true),
});

export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const properties = pgTable("properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  address: text("address").notNull(),
  notes: text("notes"),
  entryNotes: text("entry_notes"),
  lockCode: text("lock_code"),
  parkingNotes: text("parking_notes"),
  pets: text("pets"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  source: text("source").notNull().default("elite_service_suite"),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone"),
  customerEmail: text("customer_email"),
  propertyAddress: text("property_address"),
  serviceType: text("service_type"),
  frequency: text("frequency"),
  preferredDate: text("preferred_date"),
  notes: text("notes"),
  estimateRange: text("estimate_range"),
  status: text("status").notNull().default("new"),
  rawPayload: jsonb("raw_payload").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const quotes = pgTable("quotes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").notNull(),
  customerId: varchar("customer_id").notNull(),
  propertyId: varchar("property_id").notNull(),
  lineItems: jsonb("line_items").notNull(),
  totalCents: integer("total_cents").notNull(),
  notes: text("notes"),
  expiresAt: timestamp("expires_at"),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const jobs = pgTable("jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  propertyId: varchar("property_id").notNull(),
  quoteId: varchar("quote_id").notNull(),
  serviceType: text("service_type"),
  frequency: text("frequency").notNull().default("one_time"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const visits = pgTable("visits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull(),
  scheduledStart: timestamp("scheduled_start").notNull(),
  scheduledEnd: timestamp("scheduled_end").notNull(),
  assignedCleanerIds: jsonb("assigned_cleaner_ids").notNull(),
  status: text("status").notNull().default("scheduled"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const leadStatusSchema = z.enum([
  "new",
  "contacted",
  "quoted",
  "won",
  "lost",
]);
export const quoteStatusSchema = z.enum([
  "draft",
  "sent",
  "accepted",
  "declined",
]);
export const jobFrequencySchema = z.enum(["one_time", "recurring"]);
export const jobStatusSchema = z.enum(["active", "paused", "completed"]);
export const visitStatusSchema = z.enum([
  "scheduled",
  "in_progress",
  "done",
  "canceled",
]);

export const webhookLeadSchema = z.object({
  source: z.string().default("elite_service_suite"),
  customer: z.object({
    name: z.string().min(1),
    phone: z.string().optional(),
    email: z.string().email().optional(),
  }),
  property: z.object({
    address: z.string().min(1).optional(),
    notes: z.string().optional(),
  }),
  request: z.object({
    serviceType: z.string().optional(),
    frequency: z.string().optional(),
    preferredDate: z.string().optional(),
    notes: z.string().optional(),
    estimateRange: z.string().optional(),
  }),
});

export const convertLeadSchema = z.object({
  customer: z.object({
    name: z.string().min(1),
    phone: z.string().optional(),
    email: z.string().email().optional(),
  }),
  property: z.object({
    address: z.string().min(1),
    notes: z.string().optional(),
    entryNotes: z.string().optional(),
    lockCode: z.string().optional(),
    parkingNotes: z.string().optional(),
    pets: z.string().optional(),
  }),
});

export const createQuoteSchema = z.object({
  leadId: z.string().min(1),
  customerId: z.string().min(1),
  propertyId: z.string().min(1),
  lineItems: z.array(
    z.object({
      label: z.string().min(1),
      amountCents: z.number().int().nonnegative(),
    }),
  ),
  notes: z.string().optional(),
  expiresAt: z.coerce.date().optional(),
});

export const convertQuoteToJobSchema = z.object({
  frequency: jobFrequencySchema,
  visitStart: z.coerce.date(),
  visitEnd: z.coerce.date(),
  cleanerIds: z.array(z.string()).default([]),
  weeksToGenerate: z.number().int().min(1).max(26).default(8),
});

export const updateVisitSchema = z.object({
  assignedCleanerIds: z.array(z.string()).optional(),
  status: visitStatusSchema.optional(),
  scheduledStart: z.coerce.date().optional(),
  scheduledEnd: z.coerce.date().optional(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type Customer = typeof customers.$inferSelect;
export type Property = typeof properties.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type Quote = typeof quotes.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type Visit = typeof visits.$inferSelect;

export type WebhookLeadPayload = z.infer<typeof webhookLeadSchema>;
export type ConvertLeadPayload = z.infer<typeof convertLeadSchema>;
export type CreateQuotePayload = z.infer<typeof createQuoteSchema>;
export type ConvertQuoteToJobPayload = z.infer<typeof convertQuoteToJobSchema>;
export type UpdateVisitPayload = z.infer<typeof updateVisitSchema>;
