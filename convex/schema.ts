import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  workspaces: defineTable({
    name: v.string(),
    ownerId: v.string(),
    members: v.array(v.string()),
  })
    .index("by_owner", ["ownerId"])
    .searchIndex("search_name", {
      searchField: "name",
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
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_status", ["workspaceId", "status"])
    .index("by_workspace_status_order", ["workspaceId", "status", "order"])
    .index("by_assignee", ["assigneeId"])
    .index("by_status", ["status"])
    .index("by_priority", ["priority"])
    .index("by_deadline", ["deadline"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["workspaceId", "status"],
    }),

  taskActivities: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.string(),
    taskId: v.id("tasks"),
    action: v.string(),
    timestamp: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_task", ["taskId"])
    .index("by_user", ["userId"])
    .index("by_timestamp", ["timestamp"]),

  workspaceInvitations: defineTable({
    workspaceId: v.id("workspaces"),
    inviterUserId: v.string(),
    email: v.string(),
    status: v.string(), // "pending" | "accepted" | "rejected" | "expired"
    token: v.string(),
    role: v.string(), // "member" | "admin"
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_email", ["email"])
    .index("by_token", ["token"])
    .index("by_status", ["status"]),

  userPresence: defineTable({
    userId: v.string(),
    workspaceId: v.id("workspaces"),
    status: v.string(), // "online" | "offline" | "away"
    lastSeen: v.number(),
    currentPage: v.optional(v.string()), // URLパス
    isEditing: v.optional(v.id("tasks")), // 編集中のタスクID
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_user", ["userId"])
    .index("by_workspace_user", ["workspaceId", "userId"])
    .index("by_last_seen", ["lastSeen"]),

  taskLocks: defineTable({
    taskId: v.id("tasks"),
    userId: v.string(),
    workspaceId: v.id("workspaces"),
    lockedAt: v.number(),
    lockType: v.string(), // "editing" | "viewing"
  })
    .index("by_task", ["taskId"])
    .index("by_user", ["userId"])
    .index("by_workspace", ["workspaceId"])
    .index("by_locked_at", ["lockedAt"]),

  taskConflicts: defineTable({
    conflictId: v.string(),
    taskId: v.id("tasks"),
    workspaceId: v.id("workspaces"),
    conflictType: v.string(), // "simultaneous_edit" | "stale_data" | "permission_denied"
    initiatingUserId: v.string(),
    conflictingUserId: v.string(),
    timestamp: v.number(),
    isResolved: v.boolean(),
    resolution: v.optional(v.string()), // "force_save" | "merge" | "discard" | "reload"
    initiatingVersion: v.number(),
    conflictingVersion: v.number(),
    metadata: v.optional(v.any()),
  })
    .index("by_task", ["taskId"])
    .index("by_workspace", ["workspaceId"])
    .index("by_conflict_id", ["conflictId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_resolved", ["isResolved"]),

  notifications: defineTable({
    workspaceId: v.id("workspaces"),
    targetUserId: v.string(),
    senderUserId: v.string(),
    type: v.string(), // "task_created" | "task_updated" | "task_assigned" | etc.
    title: v.string(),
    message: v.string(),
    priority: v.string(), // "low" | "medium" | "high" | "urgent"
    relatedTaskId: v.optional(v.id("tasks")),
    relatedUserId: v.optional(v.string()),
    metadata: v.optional(v.any()),
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_target_user", ["targetUserId"])
    .index("by_workspace", ["workspaceId"])
    .index("by_created_at", ["createdAt"])
    .index("by_unread", ["targetUserId", "isRead"])
    .index("by_type", ["type"]),

  taskComments: defineTable({
    taskId: v.id("tasks"),
    workspaceId: v.id("workspaces"),
    userId: v.string(),
    content: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    isEdited: v.boolean(),
  })
    .index("by_task", ["taskId"])
    .index("by_workspace", ["workspaceId"])
    .index("by_user", ["userId"])
    .index("by_created_at", ["createdAt"])
    .index("by_task_created", ["taskId", "createdAt"]),
});
