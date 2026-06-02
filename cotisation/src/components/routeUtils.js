export const dashboardPathByRole = {
  CLIENT: "/client",
  ADMIN: "/admin",
  SUPER_ADMIN: "/super-admin",
  GESTIONNAIRE_DEPENSE: "/expense-manager",
  EQUIPE_TRESORERIE: "/treasury",
};

export function getDashboardPath(role) {
  return dashboardPathByRole[role] || "/client";
}
