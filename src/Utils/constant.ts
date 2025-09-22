// Enum des rôles
export const UserRole = [
  "SuperAdmin",
  "AdminRegion",
  "AdminPointVente",
  "Vendeur",
  "Client",
  "Logisticien",
] as const;

export type UserRoleType =
  | "SuperAdmin"
  | "AdminRegion"
  | "AdminPointVente"
  | "Vendeur"
  | "Logisticien"
  | "Client";

export const USER_ROLES: UserRoleType[] = [
  "SuperAdmin",
  "AdminRegion",
  "AdminPointVente",
  "Vendeur",
  "Logisticien",
  "Client",
];
