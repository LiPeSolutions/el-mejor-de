/** Where to go back after the account screens (`?volver=`): only paths inside the app. */
export function safeReturnPath(value: unknown, fallback = "/"): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : fallback;
}
