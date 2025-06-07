import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  workspaces: defineTable({
    name: v.string(),
    ownerId: v.string(),
    members: v.array(v.string()),
  }),

  tasks: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    status: v.string(),
    workspaceId: v.id("workspaces"),
    assigneeId: v.optional(v.string()),
    deadline: v.optional(v.string()),
    order: v.number(),
    priority: v.string(),
  }),

  taskActivities: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.string(),
    taskId: v.id("tasks"),
    action: v.string(),
    timestamp: v.number(),
  }),
});
