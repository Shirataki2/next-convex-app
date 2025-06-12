"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { Send, Edit2, Trash2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useAction } from "convex/react";
import { CommentWithUser } from "@/convex/comments";
import { useQuery } from "convex/react";
import { Skeleton } from "@/components/ui/skeleton";

interface TaskCommentsProps {
  taskId: Id<"tasks">;
  workspaceId: Id<"workspaces">;
}

export function TaskComments({ taskId, workspaceId }: TaskCommentsProps) {
  const { user } = useUser();
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] =
    useState<Id<"taskComments"> | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // コメント関連のmutationとaction
  const createComment = useMutation(api.comments.createComment);
  const updateComment = useMutation(api.comments.updateComment);
  const deleteComment = useMutation(api.comments.deleteComment);
  const getTaskComments = useAction(api.comments.getTaskComments);
  const commentCount = useQuery(api.comments.getCommentCount, { taskId });

  // コメント一覧を取得
  const [comments, setComments] = useState<CommentWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // コメントを取得
  useEffect(() => {
    const fetchComments = async () => {
      try {
        setIsLoading(true);
        const fetchedComments = await getTaskComments({ taskId });
        setComments(fetchedComments);
      } catch (error) {
        console.error("Failed to fetch comments:", error);
        toast.error("コメントの取得に失敗しました");
      } finally {
        setIsLoading(false);
      }
    };

    fetchComments();
  }, [taskId, getTaskComments]);

  // コメント投稿
  const handleSubmitComment = async () => {
    if (!newComment.trim() || !user || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createComment({
        taskId,
        workspaceId,
        userId: user.id,
        content: newComment.trim(),
      });

      setNewComment("");

      // コメント一覧を再取得
      const updatedComments = await getTaskComments({ taskId });
      setComments(updatedComments);

      toast.success("コメントを投稿しました");
    } catch (error) {
      console.error("Failed to create comment:", error);
      toast.error("コメントの投稿に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  // コメント編集
  const handleEditComment = async (commentId: Id<"taskComments">) => {
    if (!editingContent.trim() || !user) return;

    try {
      await updateComment({
        commentId,
        content: editingContent.trim(),
        userId: user.id,
      });

      setEditingCommentId(null);
      setEditingContent("");

      // コメント一覧を再取得
      const updatedComments = await getTaskComments({ taskId });
      setComments(updatedComments);

      toast.success("コメントを更新しました");
    } catch (error) {
      console.error("Failed to update comment:", error);
      toast.error("コメントの更新に失敗しました");
    }
  };

  // コメント削除
  const handleDeleteComment = async (commentId: Id<"taskComments">) => {
    if (!user || !confirm("コメントを削除してもよろしいですか？")) return;

    try {
      await deleteComment({
        commentId,
        userId: user.id,
      });

      // コメント一覧を再取得
      const updatedComments = await getTaskComments({ taskId });
      setComments(updatedComments);

      toast.success("コメントを削除しました");
    } catch (error) {
      console.error("Failed to delete comment:", error);
      toast.error("コメントの削除に失敗しました");
    }
  };

  const startEditing = (comment: CommentWithUser) => {
    setEditingCommentId(comment._id);
    setEditingContent(comment.content);
  };

  const cancelEditing = () => {
    setEditingCommentId(null);
    setEditingContent("");
  };

  if (!user) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5" />
        <h3 className="font-semibold">
          コメント {commentCount !== undefined && `(${commentCount})`}
        </h3>
      </div>

      {/* コメント一覧 */}
      <div className="space-y-4">
        {isLoading ? (
          <>
            <CommentSkeleton />
            <CommentSkeleton />
          </>
        ) : comments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            まだコメントがありません
          </p>
        ) : (
          comments.map((comment) => (
            <Card key={comment._id} className="p-4">
              <div className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={comment.user?.imageUrl || undefined}
                    alt={comment.user?.firstName || ""}
                  />
                  <AvatarFallback>
                    {comment.user?.firstName?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-medium">
                        {comment.user?.firstName} {comment.user?.lastName}
                      </span>
                      <span className="text-sm text-muted-foreground ml-2">
                        {formatDistanceToNow(new Date(comment.createdAt), {
                          addSuffix: true,
                          locale: ja,
                        })}
                        {comment.isEdited && " (編集済み)"}
                      </span>
                    </div>
                    {comment.userId === user.id && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditing(comment)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteComment(comment._id)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {editingCommentId === comment._id ? (
                    <div className="mt-2 space-y-2">
                      <Textarea
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        className="resize-none"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleEditComment(comment._id)}
                          disabled={!editingContent.trim()}
                        >
                          保存
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEditing}
                        >
                          キャンセル
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* コメント投稿フォーム */}
      <Card className="p-4">
        <div className="flex gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={user.imageUrl || undefined}
              alt={user.firstName || ""}
            />
            <AvatarFallback>{user.firstName?.[0] || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder="コメントを入力..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="resize-none"
              rows={3}
              disabled={isSubmitting}
            />
            <div className="flex justify-end">
              <Button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || isSubmitting}
                size="sm"
              >
                <Send className="h-4 w-4 mr-2" />
                投稿
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function CommentSkeleton() {
  return (
    <Card className="p-4">
      <div className="flex gap-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    </Card>
  );
}
