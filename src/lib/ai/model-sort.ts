import type { ModelInfo } from "@/types/ai";

export function compareModelsForDisplay(
  a: Pick<ModelInfo, "id" | "name">,
  b: Pick<ModelInfo, "id" | "name">
): number {
  const byName = a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true });
  if (byName !== 0) return byName;
  return a.id.localeCompare(b.id, undefined, { numeric: true });
}

export function sortModelsForDisplay<T extends Pick<ModelInfo, "id" | "name">>(models: T[]): T[] {
  return [...models].sort(compareModelsForDisplay);
}
