import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BookOpen, Loader2 } from "lucide-react";
import { EvidenceSearchModal } from "./EvidenceSearchModal";

interface EvidenceSearchButtonProps {
  patientId: string;
  patientName: string;
}

export const EvidenceSearchButton = ({
  patientId,
  patientName,
}: EvidenceSearchButtonProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsModalOpen(true)}
        className="gap-2"
      >
        <BookOpen className="h-4 w-4" />
        Buscar Evidências
      </Button>

      <EvidenceSearchModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        patientId={patientId}
        patientName={patientName}
      />
    </>
  );
};
