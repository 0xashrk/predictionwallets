import { useState, useRef } from "react";
import { Plus, X, Download, Upload, RotateCcw } from "lucide-react";
import type { WidgetType, WidgetLayoutExport } from "@/lib/widgets";
import { WIDGET_REGISTRY } from "@/lib/widgets";
import { toast } from "sonner";

interface WidgetFABProps {
  availableWidgets: WidgetType[];
  onAddWidget: (widgetType: WidgetType) => void;
  onExport: () => WidgetLayoutExport;
  onImport: (data: WidgetLayoutExport) => void;
  onReset: () => void;
}

export default function WidgetFAB({
  availableWidgets,
  onAddWidget,
  onExport,
  onImport,
  onReset,
}: WidgetFABProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showWidgetPicker, setShowWidgetPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const data = onExport();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `widget-layout-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Layout exported");
    setIsOpen(false);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        onImport(data);
        toast.success("Layout imported");
        setIsOpen(false);
      } catch {
        toast.error("Invalid layout file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleReset = () => {
    onReset();
    toast.success("Layout reset to default");
    setIsOpen(false);
  };

  const handleAddWidget = (widgetType: WidgetType) => {
    onAddWidget(widgetType);
    setShowWidgetPicker(false);
    setIsOpen(false);
    toast.success(`Added ${WIDGET_REGISTRY[widgetType].label} widget`);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />

      {showWidgetPicker && (
        <div className="absolute bottom-16 right-0 w-64 bg-card border border-border rounded-lg shadow-xl p-3 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Add Widget</span>
            <button
              type="button"
              onClick={() => setShowWidgetPicker(false)}
              className="p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {availableWidgets.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">All widgets are active</p>
          ) : (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {availableWidgets.map((widgetType) => {
                const config = WIDGET_REGISTRY[widgetType];
                const Icon = config.icon;
                return (
                  <button
                    key={widgetType}
                    type="button"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", widgetType);
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    onClick={() => handleAddWidget(widgetType)}
                    className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-secondary transition-colors text-left group"
                  >
                    <div className="p-1.5 rounded bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{config.label}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {config.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {isOpen && !showWidgetPicker && (
        <div className="absolute bottom-16 right-0 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setShowWidgetPicker(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            Add Widget
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-card border border-border text-foreground rounded-full shadow-lg hover:bg-secondary transition-colors whitespace-nowrap"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          <button
            type="button"
            onClick={handleImportClick}
            className="flex items-center gap-2 px-4 py-2 bg-card border border-border text-foreground rounded-full shadow-lg hover:bg-secondary transition-colors whitespace-nowrap"
          >
            <Upload className="h-4 w-4" />
            Import
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-card border border-border text-muted-foreground rounded-full shadow-lg hover:bg-secondary hover:text-foreground transition-colors whitespace-nowrap"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setShowWidgetPicker(false);
        }}
        className={`p-4 rounded-full shadow-lg transition-all ${
          isOpen
            ? "bg-secondary text-foreground rotate-45"
            : "bg-primary text-primary-foreground"
        }`}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </button>
    </div>
  );
}
