import { X, GripVertical } from "lucide-react";
import type { WidgetType } from "@/lib/widgets";
import { WIDGET_REGISTRY } from "@/lib/widgets";

interface WidgetWrapperProps {
  widgetType: WidgetType;
  onRemove: (widgetType: WidgetType) => void;
  children: React.ReactNode;
}

export default function WidgetWrapper({ widgetType, onRemove, children }: WidgetWrapperProps) {
  const config = WIDGET_REGISTRY[widgetType];
  const isStatWidget = config.category === "stat";

  return (
    <div className="widget-container h-full flex flex-col">
      <div className="widget-header flex items-center justify-between px-2 py-1 opacity-0 hover:opacity-100 transition-opacity absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-background/80 to-transparent">
        <div className="widget-drag-handle cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground">
          <GripVertical className="h-3 w-3" />
        </div>
        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
          {config.label}
        </span>
        <button
          type="button"
          onClick={() => onRemove(widgetType)}
          className="p-1 text-muted-foreground hover:text-destructive transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <div className={`widget-content flex-1 ${isStatWidget ? "" : "pt-4"}`}>
        {children}
      </div>
    </div>
  );
}
