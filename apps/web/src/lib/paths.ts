/** Where to go back after the account screens (`?volver=`): only paths inside the app. */
export function safeReturnPath(value: unknown, fallback = "/"): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : fallback;
}

/**
 * The "Tu lugar" screen: right after creating the account (`signup`, "Paso 2
 * de 2"), to change the place, or to `verify` it (this week's check for the crown).
 */
export function placePath({ back, signup = false, verify = false }: { back?: string; signup?: boolean; verify?: boolean } = {}): string {
  const params = new URLSearchParams();
  if (signup) params.set("paso", "2");
  if (verify) params.set("verificar", "1");
  if (back) params.set("volver", back);
  const query = params.toString();
  return query ? `/cuenta/lugar?${query}` : "/cuenta/lugar";
}
