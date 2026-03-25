import { useState, useCallback } from "react";
import { FileText, Download, Trash2, MessageSquare, Calendar, User, Eye } from "lucide-react";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import type { Document } from "./Documents";

interface Comment {
  id: string;
  comment_text: string;
  commented_by: string;
  commented_by_role: string;
  created_at: string;
}

interface DocumentCardProps {
  document: Document;
  userRole: "patient" | "professional";
  userName: string;
  onDelete: () => void;
  style?: React.CSSProperties;
}

const categoryLabels: Record<string, string> = {
  lab_results: "Lab Results",
  prescriptions: "Prescriptions",
  reports: "Medical Reports",
  imaging: "Imaging",
  other: "Other",
};

const categoryColors: Record<string, string> = {
  lab_results: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  prescriptions: "bg-green-500/10 text-green-600 dark:text-green-400",
  reports: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  imaging: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  other: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
};

export const DocumentCard = ({ document, userRole, userName, onDelete, style }: DocumentCardProps) => {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);

  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("document_comments")
        .select("*")
        .eq("document_id", document.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error("Error loading comments:", error);
      toast.error("Failed to load comments");
    } finally {
      setLoading(false);
    }
  }, [document.id]);

  // Real-time subscription for comments
  useRealtimeSubscription<Comment>({
    table: "document_comments",
    filter: `document_id=eq.${document.id}`,
    onInsert: (newComment) => {
      setComments((prev) => [newComment, ...prev]);
    },
    onUpdate: (updatedComment) => {
      setComments((prev) =>
        prev.map((c) => (c.id === updatedComment.id ? updatedComment : c))
      );
    },
    onDelete: (deletedComment) => {
      setComments((prev) => prev.filter((c) => c.id !== deletedComment.id));
    },
    showToasts: false,
  });

  const getFileUrl = async () => {
    const { data, error } = await supabase.storage
      .from("patient-documents")
      .createSignedUrl(document.file_path, 3600);
    if (error) throw error;
    return data.signedUrl;
  };

  const handleOpen = async () => {
    try {
      const url = await getFileUrl();
      window.open(url, "_blank");
    } catch (error) {
      console.error("Open error:", error);
      toast.error("Falha ao abrir documento");
    }
  };

  const handleDownload = async () => {
    try {
      const { data, error } = await supabase.storage
        .from("patient-documents")
        .download(document.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = document.file_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Falha ao baixar documento");
    }
  };

  const handleDelete = async () => {
    // Only professionals can delete
    if (userRole === "patient") {
      toast.error("Only healthcare professionals can delete documents");
      return;
    }

    try {
      const { error: storageError } = await supabase.storage
        .from("patient-documents")
        .remove([document.file_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from("documents")
        .delete()
        .eq("id", document.id);

      if (dbError) throw dbError;

      toast.success("Document deleted");
      onDelete();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete document");
    }
  };


  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      const { error } = await supabase.from("document_comments").insert({
        document_id: document.id,
        comment_text: newComment,
        commented_by: userName,
        commented_by_role: userRole,
      });

      if (error) throw error;

      toast.success("Comment added");
      setNewComment("");
      loadComments();
    } catch (error) {
      console.error("Comment error:", error);
      toast.error("Failed to add comment");
    }
  };

  const openCommentsDialog = () => {
    setShowComments(true);
    loadComments();
  };

  const fileSize = (document.file_size / 1024).toFixed(1);

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow animate-fade-in" style={style}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <FileText className="w-8 h-8 text-primary" />
            <Badge className={categoryColors[document.category]}>
              {categoryLabels[document.category]}
            </Badge>
          </div>
          <CardTitle className="text-base mt-2 truncate" title={document.file_name}>
            {document.file_name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center text-muted-foreground">
            <Calendar className="w-4 h-4 mr-2" />
            {format(new Date(document.created_at), "MMM dd, yyyy")}
          </div>
          <div className="flex items-center text-muted-foreground">
            <User className="w-4 h-4 mr-2" />
            {document.uploaded_by} ({document.uploaded_by_role})
          </div>
          <div className="text-muted-foreground">{fileSize} KB</div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleOpen} title="Abrir documento">
            <Eye className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload} title="Baixar documento">
            <Download className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={openCommentsDialog} title="Comentários">
            <MessageSquare className="w-4 h-4" />
          </Button>
          {userRole === "professional" && (
            <Button variant="outline" size="sm" onClick={handleDelete}>
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </CardFooter>
      </Card>

      <Dialog open={showComments} onOpenChange={setShowComments}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Comments - {document.file_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Textarea
                placeholder={
                  userRole === "professional"
                    ? "Add your professional comment..."
                    : "Add a comment..."
                }
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <Button className="mt-2" onClick={handleAddComment}>
                Add Comment
              </Button>
            </div>

            {loading ? (
              <p className="text-center text-muted-foreground">Loading comments...</p>
            ) : comments.length === 0 ? (
              <p className="text-center text-muted-foreground">No comments yet</p>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-4 rounded-lg bg-muted/50 space-y-2 animate-fade-in"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{comment.commented_by}</span>
                        <Badge variant="outline" className="text-xs">
                          {comment.commented_by_role}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(comment.created_at), "MMM dd, yyyy HH:mm")}
                      </span>
                    </div>
                    <p className="text-sm">{comment.comment_text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
