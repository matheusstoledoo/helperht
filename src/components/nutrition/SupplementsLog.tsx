import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pill, Plus, X, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface SupplementsLogProps {
  userId: string;
  patientId: string | null;
}

interface SupplementEntry {
  id: string;
  product: string;
  quantity: string | null;
  timing: string;
  notes: string | null;
  log_date: string;
  created_at: string;
}

const TIMING_OPTIONS = [
  { value: "pre_treino", label: "Pré-treino" },
  { value: "durante_treino", label: "Durante treino" },
  { value: "pos_treino", label: "Pós-treino" },
  { value: "manha", label: "Manhã" },
  { value: "almoco", label: "Almoço" },
  { value: "tarde", label: "Tarde" },
  { value: "noite", label: "Noite" },
  { value: "jejum", label: "Em jejum" },
];

const timingLabel = (v: string) => TIMING_OPTIONS.find((o) => o.value === v)?.label || v;

export default function SupplementsLog({ userId, patientId }: SupplementsLogProps) {
  const [entries, setEntries] = useState<SupplementEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [product, setProduct] = useState("");
  const [quantity, setQuantity] = useState("");
  const [timing, setTiming] = useState("manha");
  const [saving, setSaving] = useState(false);

  const fetchEntries = async () => {
    const { data } = await supabase
      .from("supplements_log")
      .select("*")
      .eq("user_id", userId)
      .order("log_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setEntries(data as SupplementEntry[]);
  };

  useEffect(() => {
    fetchEntries();
  }, [userId]);

  const handleAdd = async () => {
    if (!product.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("supplements_log").insert({
      user_id: userId,
      patient_id: patientId,
      product: product.trim(),
      quantity: quantity.trim() || null,
      timing,
    });
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar suplemento");
      return;
    }
    toast.success("Suplemento registrado!");
    setProduct("");
    setQuantity("");
    setShowForm(false);
    fetchEntries();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("supplements_log").delete().eq("id", id);
    fetchEntries();
  };

  // Group by date
  const grouped = entries.reduce<Record<string, SupplementEntry[]>>((acc, e) => {
    const d = e.log_date;
    if (!acc[d]) acc[d] = [];
    acc[d].push(e);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium flex items-center gap-2">
          <Pill className="h-4 w-4 text-purple-500" />
          Registro de Suplementação
        </h3>
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
          {showForm ? "Cancelar" : "Registrar"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="space-y-1.5">
              <Label>Produto</Label>
              <Input placeholder="Ex: Creatina, Whey, Gel de carboidrato..." value={product} onChange={(e) => setProduct(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Quantidade</Label>
                <Input placeholder="Ex: 5g, 1 scoop, 30ml" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Momento</Label>
                <Select value={timing} onValueChange={setTiming}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIMING_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleAdd} disabled={saving || !product.trim()} className="w-full">
              {saving ? "Salvando..." : "Salvar registro"}
            </Button>
          </CardContent>
        </Card>
      )}

      {entries.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Pill className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">Nenhum registro de suplementação</p>
            <p className="text-sm text-muted-foreground mt-1">Registre seus suplementos pré, durante e pós-treino</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([date, items]) => (
          <div key={date} className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              {format(new Date(date + "T12:00:00"), "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </p>
            {items.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {timingLabel(item.timing)}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium">{item.product}</p>
                      {item.quantity && <p className="text-xs text-muted-foreground">{item.quantity}</p>}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="h-7 w-7">
                    <X className="h-3 w-3" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
