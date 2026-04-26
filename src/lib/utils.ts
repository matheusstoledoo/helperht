import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Traduz códigos de frequência (vindos de imports/extrações) para português brasileiro.
 * Aceita strings já em PT, retornando-as inalteradas.
 */
export function formatFrequency(frequency: string | null | undefined): string {
  if (!frequency) return "";
  const key = frequency.trim().toLowerCase();
  const map: Record<string, string> = {
    once_daily: "1x ao dia",
    twice_daily: "2x ao dia",
    three_times_daily: "3x ao dia",
    four_times_daily: "4x ao dia",
    every_other_day: "Em dias alternados",
    weekly: "Semanal",
    biweekly: "Quinzenal",
    monthly: "Mensal",
    as_needed: "Quando necessário",
    prn: "Quando necessário",
    bedtime: "Ao deitar",
    morning: "Pela manhã",
    night: "À noite",
  };
  return map[key] || frequency;
}

/**
 * Saudação baseada no horário atual (manhã/tarde/noite).
 */
export function getGreeting(name?: string | null): string {
  const hour = new Date().getHours();
  let greeting = "Olá";
  if (hour >= 5 && hour < 12) greeting = "Bom dia";
  else if (hour >= 12 && hour < 18) greeting = "Boa tarde";
  else greeting = "Boa noite";
  const firstName = name?.trim().split(" ")[0];
  return firstName ? `${greeting}, ${firstName}` : greeting;
}
