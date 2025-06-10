return await ctx.runMutation(api.conflictResolution.checkForConflicts, {
  taskId,
  workspaceId,
  expectedVersion: 1,
  proposedChanges: { title: "更新されたタイトル" },
}); 