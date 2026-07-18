/** Session helpers for managed-cloud signup (keys cleared on account delete). */

export const SIGNUP_PLAN_KEY = "signup_plan";
export const SIGNUP_CONSENT_GDPR_KEY = "signup_consent_gdpr";
export const SIGNUP_CONSENT_MARKETING_KEY = "signup_consent_marketing";

export function clearSignupSession(): void {
  try {
    sessionStorage.removeItem(SIGNUP_PLAN_KEY);
    sessionStorage.removeItem(SIGNUP_CONSENT_GDPR_KEY);
    sessionStorage.removeItem(SIGNUP_CONSENT_MARKETING_KEY);
  } catch {
    /* ignore */
  }
}
