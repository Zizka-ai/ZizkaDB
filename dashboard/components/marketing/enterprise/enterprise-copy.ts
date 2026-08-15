import { FOUNDER_EMAIL } from "@/lib/constants";

export const COPY = {
  form: {
    success: "Thanks — we will reach out within one business day.",
    rateLimit: `Too many requests. Try again later or email ${FOUNDER_EMAIL}.`,
    genericError: `Something went wrong. Email ${FOUNDER_EMAIL} and we will help.`,
    websiteHint: "Company domain or linkedin.com/company/…",
  },
} as const;
