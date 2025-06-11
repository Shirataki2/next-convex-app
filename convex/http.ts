import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

// CORS preflight リクエスト対応 - /uploadChatFile
http.route({
  path: "/uploadChatFile",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    const headers = new Headers();
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    headers.set("Access-Control-Max-Age", "86400"); // 24時間キャッシュ

    return new Response(null, {
      status: 204,
      headers,
    });
  }),
});

// ファイルアップロードエンドポイント
http.route({
  path: "/uploadChatFile",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // CORSヘッダーを設定
    const headers = new Headers();
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    try {
      // 認証チェック - Convexの組み込み認証を使用
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers,
        });
      }

      // FormDataを解析
      const formData = await request.formData();
      const file = formData.get("file") as File;
      const workspaceId = formData.get("workspaceId") as string;
      
      // 認証されたユーザーIDを使用
      const userId = identity.subject;

      if (!file || !workspaceId) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          {
            status: 400,
            headers,
          }
        );
      }

      // ファイルのBlobを取得（Fileは既にBlobを継承している）
      const blob = file as Blob;

      // ストレージに保存
      const storageId = await ctx.storage.store(blob);

      // ファイル情報をデータベースに保存
      const fileId = await ctx.runMutation(internal.messages.saveChatFile, {
        storageId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || "application/octet-stream",
        uploadedBy: userId,
        workspaceId: workspaceId as any,
      });

      // ファイルURLを生成
      const url = await ctx.storage.getUrl(storageId);

      return new Response(
        JSON.stringify({
          fileId,
          storageId,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          url,
        }),
        {
          status: 200,
          headers,
        }
      );
    } catch (error) {
      console.error("Upload error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        {
          status: 500,
          headers,
        }
      );
    }
  }),
});

// CORS preflight リクエスト対応 - /generateUploadUrl
http.route({
  path: "/generateUploadUrl",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    const headers = new Headers();
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    headers.set("Access-Control-Max-Age", "86400"); // 24時間キャッシュ

    return new Response(null, {
      status: 204,
      headers,
    });
  }),
});

// アップロードURL生成エンドポイント
http.route({
  path: "/generateUploadUrl",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const headers = new Headers();
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    try {
      // 認証チェック - Convexの組み込み認証を使用
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers,
        });
      }

      // アップロードURLを生成
      const uploadUrl = await ctx.storage.generateUploadUrl();

      return new Response(
        JSON.stringify({ uploadUrl }),
        {
          status: 200,
          headers,
        }
      );
    } catch (error) {
      console.error("Generate upload URL error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        {
          status: 500,
          headers,
        }
      );
    }
  }),
});

export default http;