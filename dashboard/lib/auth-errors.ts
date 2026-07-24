import { AuthRequestError } from "@/lib/api";

export function isNoAccountError(err: unknown): boolean {
  return err instanceof AuthRequestError && err.status === 404;
}

export function authErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof AuthRequestError || err instanceof Error) {
    return err.message;
  }
  return fallback;
}
