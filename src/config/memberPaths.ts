/** Public member profile routes */
export const MEMBERS_BASE = "/members";

export function memberProfilePath(userId: string) {
  return `${MEMBERS_BASE}/${userId}`;
}
