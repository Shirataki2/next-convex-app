"use client";

import React, { useState, useRef, useEffect } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Paperclip, Send, X, FileIcon, Download, Trash2, Edit2 } from "lucide-react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ChatPanelProps {
  workspaceId: Id<"workspaces">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ChatFile {
  _id: Id<"chatFiles">;
  _creationTime: number;
  workspaceId: Id<"workspaces">;
  createdAt: number;
  fileName: string;
  fileSize: number;
  fileType: string;
  storageId: Id<"_storage">;
  uploadedBy: string;
  url?: string | null;
}

interface ChatUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  username: string | null;
  emailAddress: string | null;
}

interface ChatMessage {
  _id: Id<"messages">;
  _creationTime: number;
  workspaceId: Id<"workspaces">;
  userId: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  isEdited: boolean;
  fileIds?: Id<"chatFiles">[];
  files?: ChatFile[];
  user?: ChatUser;
}

export function ChatPanel({ workspaceId, open, onOpenChange }: ChatPanelProps) {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [message, setMessage] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<Id<"messages"> | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Convex hooks
  const messages = useQuery(api.messages.getMessages, { workspaceId, limit: 100 });
  const getMessagesWithUsers = useAction(api.messages.getMessagesWithUsers);
  const sendMessage = useMutation(api.messages.sendMessage);
  const editMessage = useMutation(api.messages.editMessage);
  const deleteMessage = useMutation(api.messages.deleteMessage);

  const [messagesWithUsers, setMessagesWithUsers] = useState<ChatMessage[]>([]);

  // ユーザー情報付きメッセージを取得
  useEffect(() => {
    if (open && workspaceId) {
      getMessagesWithUsers({ workspaceId, limit: 100 }).then(setMessagesWithUsers);
    }
  }, [workspaceId, messages, open, getMessagesWithUsers]);

  // 新しいメッセージが来たら一番下にスクロール
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messagesWithUsers]);

  const handleSendMessage = async () => {
    if (!message.trim() && selectedFiles.length === 0) return;
    if (!user) return;

    try {
      let fileIds: Id<"chatFiles">[] = [];

      // ファイルをアップロード
      if (selectedFiles.length > 0) {
        setUploadingFiles(true);
        fileIds = await uploadFiles(selectedFiles);
        setUploadingFiles(false);
      }

      // メッセージを送信
      await sendMessage({
        workspaceId,
        content: message.trim(),
        fileIds: fileIds.length > 0 ? fileIds : undefined,
      });

      // フォームをリセット
      setMessage("");
      setSelectedFiles([]);
    } catch (error) {
      console.error("メッセージ送信エラー:", error);
      setUploadingFiles(false);
    }
  };

  const uploadFiles = async (files: File[]): Promise<Id<"chatFiles">[]> => {
    const fileIds: Id<"chatFiles">[] = [];

    // JWTトークンを取得
    const token = await getToken();
    if (!token) {
      throw new Error("認証トークンの取得に失敗しました");
    }

    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("workspaceId", workspaceId);
      formData.append("userId", user!.id);

      const response = await fetch(`${process.env.NEXT_PUBLIC_CONVEX_URL!.replace('.cloud', '.site')}/uploadChatFile`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("ファイルアップロードに失敗しました");
      }

      const data = await response.json();
      fileIds.push(data.fileId);
    }

    return fileIds;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEditMessage = async () => {
    if (!editingMessageId || !editingContent.trim()) return;

    try {
      await editMessage({
        messageId: editingMessageId,
        content: editingContent.trim(),
      });
      setEditingMessageId(null);
      setEditingContent("");
    } catch (error) {
      console.error("メッセージ編集エラー:", error);
    }
  };

  const getUserDisplayName = (user: ChatUser | null | undefined) => {
    if (!user) return "Unknown User";
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.username || user.emailAddress || "Unknown User";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // ドラッグ&ドロップハンドラー
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 子要素から親要素へのドラッグリーブイベントを無視
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...droppedFiles]);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:w-[500px] p-0 flex flex-col"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="rounded-lg border-2 border-dashed border-primary p-8">
              <p className="text-lg font-medium">ファイルをドロップしてアップロード</p>
            </div>
          </div>
        )}
        
        <SheetHeader className="p-6 pb-4 border-b">
          <SheetTitle>ワークスペースチャット</SheetTitle>
        </SheetHeader>

        <ScrollArea ref={scrollAreaRef} className="flex-1 p-6">
          <div className="space-y-4">
            {messagesWithUsers.map((msg) => {
              const isOwnMessage = msg.userId === user?.id;
              const isEditing = editingMessageId === msg._id;

              return (
                <div
                  key={msg._id}
                  className={cn(
                    "flex gap-3",
                    isOwnMessage && "flex-row-reverse"
                  )}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={msg.user?.imageUrl || undefined} />
                    <AvatarFallback>
                      {getUserDisplayName(msg.user).substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div
                    className={cn(
                      "flex-1 space-y-1",
                      isOwnMessage && "items-end"
                    )}
                  >
                    <div className={cn("flex items-center gap-2", isOwnMessage && "justify-end")}>
                      <span className="text-sm font-medium">
                        {getUserDisplayName(msg.user)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(msg.createdAt, {
                          addSuffix: true,
                          locale: ja,
                        })}
                      </span>
                      {msg.isEdited && (
                        <Badge variant="secondary" className="text-xs">
                          編集済み
                        </Badge>
                      )}
                      {isOwnMessage && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <span className="sr-only">メッセージオプション</span>
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                                />
                              </svg>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingMessageId(msg._id);
                                setEditingContent(msg.content);
                              }}
                            >
                              <Edit2 className="mr-2 h-4 w-4" />
                              編集
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => deleteMessage({ messageId: msg._id })}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              削除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    <div
                      className={cn(
                        "rounded-lg p-3",
                        isOwnMessage
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      {isEditing ? (
                        <div className="space-y-2">
                          <Input
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleEditMessage();
                              } else if (e.key === "Escape") {
                                setEditingMessageId(null);
                                setEditingContent("");
                              }
                            }}
                            className="bg-background text-foreground"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleEditMessage}>
                              保存
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingMessageId(null);
                                setEditingContent("");
                              }}
                            >
                              キャンセル
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      )}

                      {msg.files && msg.files.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {msg.files.map((file) => (
                            <div
                              key={file._id}
                              className="flex items-center gap-2 p-2 rounded bg-background/10"
                            >
                              <FileIcon className="h-4 w-4" />
                              <span className="text-xs flex-1 truncate">
                                {file.fileName}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatFileSize(file.fileSize)}
                              </span>
                              {file.url && (
                                <a
                                  href={file.url}
                                  download={file.fileName}
                                  className="hover:text-primary"
                                >
                                  <Download className="h-4 w-4" />
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="p-4 border-t space-y-2">
          {selectedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedFiles.map((file, index) => (
                <Badge key={index} variant="secondary" className="pr-1">
                  <FileIcon className="h-3 w-3 mr-1" />
                  <span className="text-xs truncate max-w-[150px]">{file.name}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-4 w-4 ml-1"
                    onClick={() => removeSelectedFile(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button
              size="icon"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFiles}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Input
              placeholder="メッセージを入力..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={uploadingFiles}
            />
            <Button
              size="icon"
              onClick={handleSendMessage}
              disabled={(!message.trim() && selectedFiles.length === 0) || uploadingFiles}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}