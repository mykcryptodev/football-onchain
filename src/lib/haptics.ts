import { sdk } from "@farcaster/miniapp-sdk";

export type ImpactType = "light" | "medium" | "heavy" | "soft" | "rigid";
export type NotificationType = "success" | "warning" | "error";

type HapticCapability =
  | "haptics.impactOccurred"
  | "haptics.notificationOccurred"
  | "haptics.selectionChanged";

const webPatterns: Record<ImpactType | NotificationType | "selection", number[]> = {
  light: [10],
  medium: [20],
  heavy: [35],
  soft: [15],
  rigid: [25],
  success: [15, 30, 15],
  warning: [25, 40, 25],
  error: [35, 40, 35],
  selection: [8],
};

let capabilityPromise: Promise<ReadonlySet<string>> | undefined;

async function getCapabilities() {
  capabilityPromise ??= sdk
    .getCapabilities()
    .then((capabilities) => new Set<string>(capabilities))
    .catch(() => new Set<string>());

  return capabilityPromise;
}

function vibrate(pattern: number[]) {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) {
    return false;
  }

  return navigator.vibrate(pattern);
}

async function runHaptic(
  capability: HapticCapability,
  nativeHaptic: () => Promise<void>,
  fallbackPattern: number[],
) {
  const capabilities = await getCapabilities();

  if (capabilities.has(capability)) {
    try {
      await nativeHaptic();
      return;
    } catch {
      // A host can advertise haptics but still reject a call. Fall back to web.
    }
  }

  vibrate(fallbackPattern);
}

export function impactOccurred(type: ImpactType = "medium") {
  return runHaptic(
    "haptics.impactOccurred",
    () => sdk.haptics.impactOccurred(type),
    webPatterns[type],
  );
}

export function notificationOccurred(type: NotificationType) {
  return runHaptic(
    "haptics.notificationOccurred",
    () => sdk.haptics.notificationOccurred(type),
    webPatterns[type],
  );
}

export function selectionChanged() {
  return runHaptic(
    "haptics.selectionChanged",
    () => sdk.haptics.selectionChanged(),
    webPatterns.selection,
  );
}
