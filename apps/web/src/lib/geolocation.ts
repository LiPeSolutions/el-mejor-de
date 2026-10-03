/*
 * The phone's position, only after the player taps to share it (the browser
 * asks for permission then). It goes to the server to check the place and
 * is dropped: it's never stored.
 */

export interface Position {
  lat: number;
  lon: number;
  /** Meters. */
  accuracy: number;
}

export type PositionProblem = "denied" | "unavailable" | "timeout" | "unsupported";

export class PositionError extends Error {
  constructor(readonly problem: PositionProblem) {
    super(problem);
  }
}

export function currentPosition(): Promise<Position> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new PositionError("unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lon: position.coords.longitude, accuracy: position.coords.accuracy }),
      (error) =>
        reject(new PositionError(error.code === error.PERMISSION_DENIED ? "denied" : error.code === error.TIMEOUT ? "timeout" : "unavailable")),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  });
}
