import type { Article, Avatar } from "@repo/shared";
import { saveAccount } from "./account";
import type { PublicAccount } from "./account-types";
import { accountApi } from "./api";
import { adoptAnonymousDays, mergeAccountDays } from "./storage";

/*
 * Signing up, in and out from the browser. The server sets the session
 * cookie; here the browser updates its copy of the account and its days.
 */

export async function createAccount(input: { username: string; password: string; avatar: Avatar; article: Article }): Promise<PublicAccount> {
  const { account } = await accountApi.create(input);
  if (!account) throw new Error("no account in the response");
  // What this browser played without an account is the new account's (the server did the same).
  adoptAnonymousDays(account.id);
  saveAccount(account);
  return account;
}

export async function signIn(username: string, password: string): Promise<PublicAccount> {
  const { account, history } = await accountApi.signIn(username, password);
  if (!account) throw new Error("no account in the response");
  mergeAccountDays(account.id, history ?? []);
  saveAccount(account);
  return account;
}

/** Throws if the server couldn't be reached: the session would still be open. */
export async function signOut(): Promise<void> {
  await accountApi.signOut();
  saveAccount(null);
}
