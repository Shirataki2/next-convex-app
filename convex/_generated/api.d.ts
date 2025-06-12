/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as comments from "../comments.js";
import type * as conflictResolution from "../conflictResolution.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as invitations from "../invitations.js";
import type * as messages from "../messages.js";
import type * as notifications from "../notifications.js";
import type * as presence from "../presence.js";
import type * as tasks from "../tasks.js";
import type * as workspaces from "../workspaces.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  comments: typeof comments;
  conflictResolution: typeof conflictResolution;
  files: typeof files;
  http: typeof http;
  invitations: typeof invitations;
  messages: typeof messages;
  notifications: typeof notifications;
  presence: typeof presence;
  tasks: typeof tasks;
  workspaces: typeof workspaces;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
