import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SmartUploadModal } from "./SmartUploadModal";
import { cn } from "@/lib/utils";

interface FloatingUploadButtonProps {
  patientId?: string;
  userId: string;
  userRole: string;
  userName: string;
  onSuccess?: () => void;
  className?: string;
  categoryHint?: string;
}

export const FloatingUploadButton = ({
  patientId,
  userId,
  userRole,
  userName,
  onSuccess,
  className,
  categoryHint,
}: FloatingUploadButtonProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        size="icon"
        className={cn(
          "fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50",
          "bg-accent hover:bg-accent/90 text-accent-foreground",
          "transition-transform hover:scale-110 active:scale-95",
          className
        )}
        onClick={() => setOpen(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>

      <SmartUploadModal
        open={open}
        onOpenChange={setOpen}
        patientId={patientId}
        userId={userId}
        userRole={userRole}
        userName={userName}
        onSuccess={onSuccess}
      />
    </>
  );
};
