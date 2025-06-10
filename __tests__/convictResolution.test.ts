export {};

import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

const t = convexTest(schema);

await t.run(async (ctx: any) => {
  const mockAuth = {
    getUserIdentity: async () => ({
      subject: "user2",
      email: "user2@example.com",
      tokenIdentifier: "mockTokenIdentifier",
      issuer: "mockIssuer",
    }),
  };
  ctx.auth = mockAuth;

  const taskId: Id<"tasks"> = "someTaskId"; // Replace with actual taskId
  const workspaceId: Id<"workspaces"> = "someWorkspaceId"; // Replace with actual workspaceId

  return await ctx.runMutation(api.conflictResolution.checkForConflicts, {
    taskId,
    workspaceId,
    expectedVersion: 1,
    proposedChanges: { title: "更新されたタイトル" },
  });
}); 