import { TimelineCard, TimelineEvent } from "./TimelineCard";

interface TimelineProps {
  events: TimelineEvent[];
  isEditable?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function Timeline({ events, isEditable = false, emptyMessage = "No events to display", className = "" }: TimelineProps) {
  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Vertical timeline line */}
      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
      
      {/* Timeline events */}
      <div className="space-y-8 pl-6">
        {events.map((event, index) => (
          <div
            key={event.id}
            className="animate-fade-in"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <TimelineCard event={event} isEditable={isEditable} />
          </div>
        ))}
      </div>
    </div>
  );
}

export type { TimelineEvent };
