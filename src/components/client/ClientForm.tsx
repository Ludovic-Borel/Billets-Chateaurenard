import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { CHORUS_OPTIONS } from "@/lib/types";

import type { ClientFormData } from "@/lib/types";

interface ClientFormProps {
  form: ClientFormData;
  setForm: React.Dispatch<React.SetStateAction<ClientFormData>>;
  editing: boolean;
  onSave: () => void;
  onCancel?: () => void;
}

export function ClientForm({
  form,
  setForm,
  editing,
  onSave,
  onCancel,
}: ClientFormProps) {
  
  return (
    <div className="space-y-4">

      <div className="grid grid-cols-2 gap-3">

        <div className="col-span-2">
          <Label>Nom</Label>
          <Input
            value={form.nom}
            onChange={(e) =>
              setForm({ ...form, nom: e.target.value })
            }
          />
        </div>

        <div className="col-span-2">
          <Label>Email</Label>
          <Input
            value={form.mail}
            onChange={(e) =>
              setForm({ ...form, mail: e.target.value })
            }
          />
        </div>

        <div className="col-span-2">
          <Label>Adresse</Label>
          <Input
            value={form.adresse}
            onChange={(e) =>
              setForm({ ...form, adresse: e.target.value })
            }
          />
        </div>

        <div>
          <Label>SIRET</Label>
          <Input
            value={form.siret}
            onChange={(e) =>
              setForm({ ...form, siret: e.target.value })
            }
          />
        </div>

        <div>
          <Label>SIREN</Label>
          <Input
            value={form.siren}
            onChange={(e) =>
              setForm({ ...form, siren: e.target.value })
            }
          />
        </div>

        <div>
          <Label>NIC</Label>
          <Input
            value={form.nic}
            onChange={(e) =>
              setForm({ ...form, nic: e.target.value })
            }
          />
        </div>

        <div>
          <Label>Chorus</Label>

          <Select
            value={form.chorus}
            onValueChange={(value) =>
              setForm({
                ...form,
                chorus: value,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Choisir..." />
            </SelectTrigger>

            <SelectContent>
              {CHORUS_OPTIONS.map((option) => (
                <SelectItem
                  key={option}
                  value={option}
                >
                  {option || "Non défini"}
                </SelectItem>
              ))}
            </SelectContent>

          </Select>

        </div>

      </div>

      <div className="flex justify-end gap-2">

        <Button
          variant="outline"
          onClick={onCancel}
        >
          Annuler
        </Button>

        <Button onClick={onSave}>
  {editing ? "Modifier" : "Ajouter"}
</Button>

      </div>

    </div>
  );
}