import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: { clientId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("clients")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .unique();
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("clients").collect();
  },
});

export const save = mutation({
  args: {
    clientId: v.string(),
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
        status: v.string(),
        dueDate: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("clients")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    } else {
      return await ctx.db.insert("clients", args);
    }
  },
});

export const seed = mutation({
  args: {
    clients: v.array(
      v.object({
        clientId: v.string(),
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
            status: v.string(),
            dueDate: v.string(),
          })
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const client of args.clients) {
      const existing = await ctx.db
        .query("clients")
        .withIndex("by_clientId", (q) => q.eq("clientId", client.clientId))
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, client);
      } else {
        await ctx.db.insert("clients", client);
      }
    }
  },
});
