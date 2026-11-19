import type { SimCard } from "../types";

type SimIdentifier = Pick<
  SimCard,
  "id" | "phoneNumber" | "internalImsi" | "imsi"
>;

/** Shared lookup for manual input and CSV in the group and SIM-code pickers. */
export function resolveSimIdentifiers(
  input: string,
  sims: readonly SimIdentifier[],
) {
  const identifiers = [...new Set(input.split(/[\s,;]+/).filter(Boolean))];
  const identifierToId = new Map<string, string>();
  for (const sim of sims) {
    identifierToId.set(sim.phoneNumber, sim.id);
    const internalImsi = sim.internalImsi ?? sim.imsi?.slice(-10);
    if (internalImsi) identifierToId.set(internalImsi, sim.id);
  }

  const simIds = new Set<string>();
  const notFound: string[] = [];
  for (const identifier of identifiers) {
    const id = identifierToId.get(identifier);
    if (id) simIds.add(id);
    else notFound.push(identifier);
  }
  return { simIds: [...simIds], notFound };
}
