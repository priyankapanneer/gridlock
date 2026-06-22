export const ROLES = {
  COMMAND_COMMISSIONER: 'Command Commissioner',
  FIELD_INSPECTOR: 'Field Inspector',
  TRANSIT_PLANNER: 'Transit Planner',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];
