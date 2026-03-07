export interface Flags {
  CONTEXT: "production" | "development";
  API_ADD: boolean;
}

export function getFlags(): Flags {
  return {
    CONTEXT:
      process.env.NODE_ENV === "development" ? "development" : "production",
    API_ADD: process.env.FEATURE_API_ADD === "true",
  };
}

export const FLAGS = getFlags();
