import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  clients: defineTable({
    clientId: v.string(), // e.g. "SYN-000"
    password: v.string(),
    name: v.string(),
    company: v.string(),
    email: v.string(),
    phone: v.string(),
    description: v.string(),
    invoices: v.array(
      v.object({
        ref: v.string(),
        description: v.string(),
        amount: v.number(),
        gst: v.boolean(),
        status: v.string(), // 'due' or 'paid'
        dueDate: v.string(),
      })
    ),
  }).index("by_clientId", ["clientId"]),
});
