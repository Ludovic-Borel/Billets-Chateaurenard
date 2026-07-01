import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClientForm } from "./ClientForm";
import { useState } from "react";
import type { ClientFormData } from "@/lib/types";

interface ClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientDialog({
  open,
  onOpenChange,
}: ClientDialogProps) {
  const [form, setForm] = useState<ClientFormData>({
  nom: "",
  mail: "",
  adresse: "",
  siret: "",
  siren: "",
  nic: "",
  chorus: "",
});
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            Nouveau client
          </DialogTitle>
        </DialogHeader>

        <ClientForm
  form={form}
  setForm={setForm}
  editing={false}
  onSave={() => {}}
  onCancel={() => onOpenChange(false)}
/>

      </DialogContent>
    </Dialog>
  );
}