import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X, Apple, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ManualNutritionPlanFormProps {
  userId: string;
  patientId: string | null;
  onSaved: () => void;
  onCancel: () => void;
  editingPlan?: any;
}

interface FoodInput {
  text: string;
}

interface MealInput {
  name: string;
  time: string;
  foods: FoodInput[];
  notes: string;
  expanded: boolean;
}

const MEAL_SUGGESTIONS = [
  "Café da manhã", "Lanche da manhã", "Almoço", "Lanche da tarde", "Jantar", "Ceia",
];

const emptyFood = (): FoodInput => ({ text: "" });

const emptyMeal = (index: number): MealInput => ({
  name: MEAL_SUGGESTIONS[index] || `Refeição ${index + 1}`,
  time: "",
  foods: [emptyFood()],
  notes: "",
  expanded: true,
});

const mapEditingMeals = (editingPlan?: any): MealInput[] => {
  if (!editingPlan || !Array.isArray(editingPlan.meals) || editingPlan.meals.length === 0) {
    return [emptyMeal(0), emptyMeal(1), emptyMeal(2)];
  }

  return editingPlan.meals.map((meal: any, index: number) => ({
    name: meal?.name || MEAL_SUGGESTIONS[index] || `Refeição ${index + 1}`,
    time: meal?.time || "",
    foods: Array.isArray(meal?.foods) && meal.foods.length > 0
      ? meal.foods.map((food: string) => ({ text: food }))
      : [emptyFood()],
    notes: meal?.notes || "",
    expanded: true,
  }));
};

export default function ManualNutritionPlanForm({ userId, patientId, onSaved, onCancel, editingPlan }: ManualNutritionPlanFormProps) {
  const [totalCalories, setTotalCalories] = useState(editingPlan?.total_calories?.toString() || "");
  const [proteinGrams, setProteinGrams] = useState(editingPlan?.protein_grams?.toString() || "");
  const [carbsGrams, setCarbsGrams] = useState(editingPlan?.carbs_grams?.toString() || "");
  const [fatGrams, setFatGrams] = useState(editingPlan?.fat_grams?.toString() || "");
  const [observations, setObservations] = useState(editingPlan?.observations || "");
  const [meals, setMeals] = useState<MealInput[]>(() => mapEditingMeals(editingPlan));
  const [saving, setSaving] = useState(false);

  const updateMeal = (idx: number, patch: Partial<MealInput>) => {
    setMeals(prev => prev.map((m, i) => i === idx ? { ...m, ...patch } : m));
  };

  const addMeal = () => {
    setMeals(prev => [...prev, emptyMeal(prev.length)]);
  };

  const removeMeal = (idx: number) => {
    setMeals(prev => prev.filter((_, i) => i !== idx));
  };

  const updateFood = (mIdx: number, fIdx: number, text: string) => {
    setMeals(prev => prev.map((m, mi) => mi === mIdx ? {
      ...m, foods: m.foods.map((f, fi) => fi === fIdx ? { text } : f),
    } : m));
  };

  const addFood = (mIdx: number) => {
    setMeals(prev => prev.map((m, mi) => mi === mIdx ? {
      ...m, foods: [...m.foods, emptyFood()],
    } : m));
  };

  const removeFood = (mIdx: number, fIdx: number) => {
    setMeals(prev => prev.map((m, mi) => mi === mIdx ? {
      ...m, foods: m.foods.filter((_, fi) => fi !== fIdx),
    } : m));
  };

  const handleSave = async () => {
    const validMeals = meals.filter(m => m.foods.some(f => f.text.trim()));
    if (validMeals.length === 0 && !totalCalories) {
      toast.error("Adicione pelo menos uma refeição ou as calorias");
      return;
    }

    setSaving(true);
    const mealsPayload = validMeals.map(m => ({
      name: m.name,
      time: m.time || undefined,
      foods: m.foods.filter(f => f.text.trim()).map(f => f.text.trim()),
      notes: m.notes || undefined,
    }));

    const cal = totalCalories ? parseFloat(totalCalories) : null;
    const prot = proteinGrams ? parseFloat(proteinGrams) : null;
    const carbs = carbsGrams ? parseFloat(carbsGrams) : null;
    const fat = fatGrams ? parseFloat(fatGrams) : null;

    // Calculate percentages if we have calories and macros
    let protPercent: number | null = null;
    let carbsPercent: number | null = null;
    let fatPercent: number | null = null;
    if (cal && cal > 0) {
      if (prot) protPercent = Math.round((prot * 4 / cal) * 100);
      if (carbs) carbsPercent = Math.round((carbs * 4 / cal) * 100);
      if (fat) fatPercent = Math.round((fat * 9 / cal) * 100);
    }

    const payload = {
      user_id: userId,
      patient_id: patientId,
      total_calories: cal,
      protein_grams: prot,
      protein_percent: protPercent,
      carbs_grams: carbs,
      carbs_percent: carbsPercent,
      fat_grams: fat,
      fat_percent: fatPercent,
      meals: mealsPayload,
      observations: observations.trim() || null,
      status: "active",
      start_date: editingPlan?.start_date || new Date().toISOString().slice(0, 10),
    };

    const { error } = editingPlan
      ? await supabase.from("nutrition_plans").update(payload).eq("id", editingPlan.id)
      : await supabase.from("nutrition_plans").insert(payload);

    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar plano alimentar");
      return;
    }
    toast.success(editingPlan ? "Plano atualizado com sucesso!" : "Plano alimentar criado! 🥗");
    onSaved();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-medium flex items-center gap-2">
              <Apple className="h-4 w-4 text-green-500" />
              {editingPlan ? "Editar Plano Alimentar" : "Novo Plano Alimentar"}
            </h3>
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Macronutrientes (opcional)</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Calorias (kcal/dia)</Label>
                <Input type="number" placeholder="Ex: 2000" value={totalCalories} onChange={e => setTotalCalories(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Proteínas (g)</Label>
                <Input type="number" placeholder="Ex: 150" value={proteinGrams} onChange={e => setProteinGrams(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Carboidratos (g)</Label>
                <Input type="number" placeholder="Ex: 250" value={carbsGrams} onChange={e => setCarbsGrams(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Gorduras (g)</Label>
                <Input type="number" placeholder="Ex: 60" value={fatGrams} onChange={e => setFatGrams(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Observações gerais</Label>
            <Textarea placeholder="Ex: Dieta com restrição de lactose..." value={observations} onChange={e => setObservations(e.target.value)} rows={2} />
          </div>
        </CardContent>
      </Card>

      {meals.map((meal, mIdx) => (
        <Card key={mIdx}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <button
                className="flex items-center gap-2 text-sm font-medium"
                onClick={() => updateMeal(mIdx, { expanded: !meal.expanded })}
              >
                <div className="h-7 w-7 rounded-full bg-green-500/10 flex items-center justify-center text-green-600 text-xs font-bold">
                  {mIdx + 1}
                </div>
                {meal.name}
                {meal.expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {meals.length > 1 && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeMeal(mIdx)}>
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {meal.expanded && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nome</Label>
                    <Input placeholder="Ex: Café da manhã" value={meal.name} onChange={e => updateMeal(mIdx, { name: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Horário</Label>
                    <Input type="time" value={meal.time} onChange={e => updateMeal(mIdx, { time: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Alimentos</Label>
                  {meal.foods.map((food, fIdx) => (
                    <div key={fIdx} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-4">•</span>
                      <Input
                        placeholder="Ex: 2 ovos mexidos, 1 fatia de pão integral..."
                        value={food.text}
                        onChange={e => updateFood(mIdx, fIdx, e.target.value)}
                        className="flex-1"
                      />
                      {meal.foods.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeFood(mIdx, fIdx)}>
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="w-full" onClick={() => addFood(mIdx)}>
                    <Plus className="h-3 w-3 mr-1" /> Adicionar alimento
                  </Button>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Observações da refeição</Label>
                  <Input placeholder="Ex: Pode substituir por aveia" value={meal.notes} onChange={e => updateMeal(mIdx, { notes: e.target.value })} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <Button variant="outline" className="w-full" onClick={addMeal}>
        <Plus className="h-4 w-4 mr-1" /> Adicionar refeição
      </Button>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? "Salvando..." : editingPlan ? "Salvar alterações" : "Criar plano alimentar"}
      </Button>
    </div>
  );
}
