import type { SetlistGroup, SetlistItem } from "./setlist-types";

/** Découpe une setlist en sets séparés par les pauses. */
export function computeSetlistGroups(
  items: Array<{ kind: string; durationSeconds: number }>,
): SetlistGroup[] {
  const groups: SetlistGroup[] = [];
  let songCount = 0;
  let durationSeconds = 0;

  const flush = (): void => {
    if (songCount === 0) return;
    const index = groups.length + 1;
    groups.push({
      index,
      label: `Set ${index}`,
      songCount,
      durationSeconds,
    });
    songCount = 0;
    durationSeconds = 0;
  };

  for (const item of items) {
    if (item.kind === "pause") {
      flush();
      continue;
    }
    songCount += 1;
    durationSeconds += item.durationSeconds;
  }
  flush();
  return groups;
}

export function summarizeSetlistDurations(items: SetlistItem[]): {
  estimatedDurationSeconds: number;
  pauseDurationSeconds: number;
  estimatedTotalSeconds: number;
  groups: SetlistGroup[];
} {
  let estimatedDurationSeconds = 0;
  let pauseDurationSeconds = 0;

  for (const item of items) {
    if (item.kind === "pause") {
      pauseDurationSeconds += item.durationSeconds;
    } else {
      estimatedDurationSeconds += item.durationSeconds;
    }
  }

  return {
    estimatedDurationSeconds,
    pauseDurationSeconds,
    estimatedTotalSeconds: estimatedDurationSeconds + pauseDurationSeconds,
    groups: computeSetlistGroups(items),
  };
}
