export function webhookDecision(signatureValid: boolean, alreadyStored: boolean) {
  if (!signatureValid) return "reject" as const;
  if (alreadyStored) return "duplicate" as const;
  return "process" as const;
}
