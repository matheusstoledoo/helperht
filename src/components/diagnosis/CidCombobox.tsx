import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCidSearch, CidEntry } from "@/hooks/useCidSearch";
import { Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface CidComboboxProps {
  value: string;
  selectedCode: string;
  onSelect: (entry: CidEntry) => void;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const CidCombobox = ({
  value,
  selectedCode,
  onSelect,
  onChange,
  placeholder = "Digite o nome da doença ou código CID...",
  disabled = false,
}: CidComboboxProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { results, loading } = useCidSearch(value, 50);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset highlighted index when results change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [results]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setIsOpen(true);
  };

  const handleSelect = (entry: CidEntry) => {
    onSelect(entry);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => 
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        if (results[highlightedIndex]) {
          handleSelect(results[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  const showDropdown = isOpen && value.length >= 2;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onFocus={() => value.length >= 2 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-9"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {selectedCode && (
        <p className="text-xs text-muted-foreground mt-1">
          CID selecionado: <span className="font-medium">{selectedCode}</span>
        </p>
      )}

      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg">
          {results.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground text-center">
              {loading ? "Carregando..." : "Nenhum resultado encontrado"}
            </div>
          ) : (
            <ScrollArea className="max-h-[300px]">
              <div className="p-1">
                {results.map((entry, index) => (
                  <button
                    key={`${entry.code}-${index}`}
                    type="button"
                    onClick={() => handleSelect(entry)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-sm text-sm transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      highlightedIndex === index && "bg-accent text-accent-foreground"
                    )}
                  >
                    <span className="font-medium text-primary">{entry.code}</span>
                    <span className="mx-2 text-muted-foreground">—</span>
                    <span>{entry.description}</span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      )}
    </div>
  );
};
