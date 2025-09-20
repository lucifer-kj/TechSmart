// Feature flag scaffolding for portal replacement rollout
// Flags are read from environment variables. Prefer boolean-like strings: "true", "1", "yes", "on".

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value == null) return defaultValue;
  const normalized = value.trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalized);
}

export type FeatureFlags = {
  invitationsEnabled: boolean;
  customerPasswordlessLogin: boolean;
  adminLinkExistingUser: boolean;
};

export const features: FeatureFlags = {
  invitationsEnabled: parseBoolean(process.env.FEATURES_INVITATIONS_ENABLED, false),
  customerPasswordlessLogin: parseBoolean(process.env.FEATURES_PASSWORDLESS_CUSTOMER_LOGIN, false),
  adminLinkExistingUser: parseBoolean(process.env.FEATURES_ADMIN_LINK_EXISTING_USER, false),
};

export function isFeatureEnabled<K extends keyof FeatureFlags>(flag: K): boolean {
  return features[flag];
}


