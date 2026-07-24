import { z } from "zod";
import { SPORT_KEYS, DATA_TRUTH_CLASSES } from "@all-sport/core";

const sportOrMulti = z.union([z.enum(SPORT_KEYS), z.literal("multi")]);

/**
 * Static description of a provider. Deliberately minimal — provider-specific
 * retrieval interfaces (schedules, matches, stats) come in later phases. A
 * provider declares which sport it serves and the truth class of the data it
 * returns, so downstream consumers can enforce the quarantine rules.
 */
export const providerDescriptorSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  sport: sportOrMulti,
  truthClass: z.enum(DATA_TRUTH_CLASSES),
});

export type ProviderDescriptor = z.infer<typeof providerDescriptorSchema>;

/**
 * Operational health snapshot for a provider. `null` on reachable/authenticated
 * means "not yet probed"; `configured: false` means the provider has no
 * credentials and is inert by design (later surfaces PROVIDER_NOT_CONFIGURED).
 */
export const providerHealthSchema = z.object({
  configured: z.boolean(),
  reachable: z.boolean().nullable(),
  authenticated: z.boolean().nullable(),
  lastSuccessAt: z.date().nullable(),
  lastFailureAt: z.date().nullable(),
  recentFailureCount: z.number().int().nonnegative(),
});

export type ProviderHealth = z.infer<typeof providerHealthSchema>;
