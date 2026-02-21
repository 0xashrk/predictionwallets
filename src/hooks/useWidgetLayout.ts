import { useState, useCallback, useEffect } from "react";
import {
  type WidgetType,
  type WidgetLayouts,
  type WidgetLayoutExport,
  type LayoutItem,
  DEFAULT_LAYOUTS,
  ALL_WIDGET_TYPES,
  WIDGET_STORAGE_KEY,
  WIDGET_REGISTRY,
  GRID_CONFIG,
} from "@/lib/widgets";

interface StoredWidgetState {
  layouts: WidgetLayouts;
  activeWidgets: WidgetType[];
}

function loadStoredState(): StoredWidgetState {
  try {
    const saved = localStorage.getItem(WIDGET_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.layouts && parsed.activeWidgets) {
        return parsed;
      }
    }
  } catch {}
  return {
    layouts: DEFAULT_LAYOUTS,
    activeWidgets: [...ALL_WIDGET_TYPES],
  };
}

function saveState(state: StoredWidgetState) {
  localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(state));
}

export function useWidgetLayout() {
  const [layouts, setLayouts] = useState<WidgetLayouts>(() => loadStoredState().layouts);
  const [activeWidgets, setActiveWidgets] = useState<WidgetType[]>(() => loadStoredState().activeWidgets);
  const [currentBreakpoint, setCurrentBreakpoint] = useState<"lg" | "md" | "sm">("lg");

  useEffect(() => {
    saveState({ layouts, activeWidgets });
  }, [layouts, activeWidgets]);

  const onLayoutChange = useCallback(
    (_currentLayout: LayoutItem[], allLayouts: WidgetLayouts) => {
      setLayouts(allLayouts);
    },
    []
  );

  const onBreakpointChange = useCallback((newBreakpoint: string) => {
    setCurrentBreakpoint(newBreakpoint as "lg" | "md" | "sm");
  }, []);

  const addWidget = useCallback((widgetType: WidgetType) => {
    if (activeWidgets.includes(widgetType)) return;

    const config = WIDGET_REGISTRY[widgetType];
    const cols = GRID_CONFIG.cols;

    const newLayouts = { ...layouts };
    for (const bp of ["lg", "md", "sm"] as const) {
      const existing = newLayouts[bp];
      const maxY = existing.length > 0 ? Math.max(...existing.map((l) => l.y + l.h)) : 0;
      
      newLayouts[bp] = [
        ...existing,
        {
          i: widgetType,
          x: 0,
          y: maxY,
          w: Math.min(config.defaultW, cols[bp]),
          h: config.defaultH,
          minW: config.minW,
          minH: config.minH,
          maxW: config.maxW,
          maxH: config.maxH,
        },
      ];
    }

    setLayouts(newLayouts);
    setActiveWidgets((prev) => [...prev, widgetType]);
  }, [activeWidgets, layouts]);

  const removeWidget = useCallback((widgetType: WidgetType) => {
    setActiveWidgets((prev) => prev.filter((w) => w !== widgetType));
    setLayouts((prev) => ({
      lg: prev.lg.filter((l) => l.i !== widgetType),
      md: prev.md.filter((l) => l.i !== widgetType),
      sm: prev.sm.filter((l) => l.i !== widgetType),
    }));
  }, []);

  const resetToDefault = useCallback(() => {
    setLayouts(DEFAULT_LAYOUTS);
    setActiveWidgets([...ALL_WIDGET_TYPES]);
  }, []);

  const exportLayout = useCallback((): WidgetLayoutExport => {
    return {
      version: 1,
      layouts,
      activeWidgets,
      exportedAt: new Date().toISOString(),
    };
  }, [layouts, activeWidgets]);

  const importLayout = useCallback((data: WidgetLayoutExport) => {
    if (data.version !== 1) {
      throw new Error("Unsupported layout version");
    }
    
    const validWidgets = data.activeWidgets.filter((w) => ALL_WIDGET_TYPES.includes(w));
    
    const filteredLayouts: WidgetLayouts = {
      lg: data.layouts.lg.filter((l) => validWidgets.includes(l.i as WidgetType)),
      md: data.layouts.md.filter((l) => validWidgets.includes(l.i as WidgetType)),
      sm: data.layouts.sm.filter((l) => validWidgets.includes(l.i as WidgetType)),
    };

    setLayouts(filteredLayouts);
    setActiveWidgets(validWidgets);
  }, []);

  const getAvailableWidgets = useCallback(() => {
    return ALL_WIDGET_TYPES.filter((w) => !activeWidgets.includes(w));
  }, [activeWidgets]);

  const filteredLayouts: WidgetLayouts = {
    lg: layouts.lg.filter((l) => activeWidgets.includes(l.i as WidgetType)),
    md: layouts.md.filter((l) => activeWidgets.includes(l.i as WidgetType)),
    sm: layouts.sm.filter((l) => activeWidgets.includes(l.i as WidgetType)),
  };

  return {
    layouts: filteredLayouts,
    activeWidgets,
    currentBreakpoint,
    onLayoutChange,
    onBreakpointChange,
    addWidget,
    removeWidget,
    resetToDefault,
    exportLayout,
    importLayout,
    getAvailableWidgets,
  };
}
