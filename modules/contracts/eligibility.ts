export const CONTRACT_ELIGIBLE_PERSON_STATUSES = ["ACTIVE", "INVITED"] as const;

export function isContractEligiblePersonStatus(status: string): boolean {
  return CONTRACT_ELIGIBLE_PERSON_STATUSES.some(
    (eligibleStatus) => eligibleStatus === status,
  );
}
