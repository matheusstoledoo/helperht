import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

const slides = [
  {
    image: "/images/dashboard-profissional.png",
    caption:
      "Saiba quais pacientes contatar em cada dia de forma rápida e prática",
  },
  {
    image: "/images/trilhas-acompanhamento.png",
    caption:
      "Escolha trilhas de acompanhamento ou monte suas próprias e tenha uma relação próxima e automatizada com seus pacientes mesmo após a consulta",
  },
  {
    image: "/images/dashboard-paciente.png",
    caption:
      "Chega de ficar perdido em meio a diversas informações. Relembre rapidamente os diagnósticos, tratamentos, exames, metas, objetivos e as trilhas de acompanhamento de cada paciente, sem perder tempo com isso.",
  },
  {
    image: "/images/pagina-paciente.png",
    caption:
      "Seus pacientes têm acesso aos próprios diagnósticos, condutas e orientações definidas por você e demais profissionais. Tudo em um só lugar, sem perder nenhuma informação. Ele ainda pode otimizar o acompanhamento fazendo o upload dos próprios exames no sistema.",
  },
];

const SLIDE_INTERVAL = 10000;

export function ImageShowcase() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % slides.length);
  }, []);

  const prev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
  }, []);

  useEffect(() => {
    if (paused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(next, SLIDE_INTERVAL);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [next, paused]);

  return (
    <div className="mt-10 lg:mt-16 max-w-5xl mx-auto px-2 sm:px-0">
      <div className="relative rounded-xl sm:rounded-2xl overflow-hidden border border-border shadow-xl bg-card">
        {/* Image */}
        <div className="relative aspect-[4/3] sm:aspect-[16/9] overflow-hidden bg-muted/30">
          {slides.map((slide, index) => (
            <img
              key={index}
              src={slide.image}
              alt={slide.caption}
              className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-700 ${
                index === current ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}

          {/* Navigation arrows */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-1 sm:left-3 top-1/2 -translate-y-1/2 bg-background/70 hover:bg-background/90 rounded-full shadow-md w-8 h-8 sm:w-10 sm:h-10"
            onClick={prev}
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 sm:right-3 top-1/2 -translate-y-1/2 bg-background/70 hover:bg-background/90 rounded-full shadow-md w-8 h-8 sm:w-10 sm:h-10"
            onClick={next}
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
        </div>

        {/* Caption */}
        <div className="p-4 sm:p-6 text-center min-h-[80px] sm:min-h-[100px] flex items-center justify-center bg-gradient-to-br from-primary to-secondary">
          <p className="text-white text-sm sm:text-base lg:text-lg max-w-3xl transition-opacity duration-500">
            {slides[current].caption}
          </p>
        </div>
      </div>

      {/* Dots */}
      <div className="flex justify-center items-center gap-2 sm:gap-3 mt-4">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrent(index)}
            className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-all duration-300 ${
              index === current
                ? "bg-accent w-5 sm:w-6"
                : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
            }`}
          />
        ))}
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 ml-2"
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? "Retomar apresentação" : "Pausar apresentação"}
        >
          {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}