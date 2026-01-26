/**
 * REDCap permission mappings
 *
 * Maps internal permission codes to human-readable names.
 */

/** Map permission codes to readable names */
export const PERMISSION_MAPPING: Readonly<Record<string, string>> = {
  e: 'API Export',
  i: 'API Import/Update',
  d: 'Delete Record',
  l: 'API Export',
  iuser: 'User Rights',
  idesign: 'Project Design and Setup',
  iproj: 'Create Projects',
  dag_e: 'Data Access Groups Export',
  dag_i: 'Data Access Groups Import',
  design_e: 'Project Design Export',
  design_i: 'Project Design Import',
  euser: 'User Rights',
  rename: 'Rename Record',
} as const;

/** Map permission code to readable name */
export const mapPermission = (code: string): string => PERMISSION_MAPPING[code] ?? code;

/** REDCap API permission levels */
export type ApiPermission =
  | 'API Export'
  | 'API Import/Update'
  | 'Delete Record'
  | 'User Rights'
  | 'Project Design and Setup'
  | 'Create Projects'
  | 'Data Access Groups Export'
  | 'Data Access Groups Import'
  | 'Project Design Export'
  | 'Project Design Import'
  | 'Rename Record';

/** Permission requirements for common operations */
export const OPERATION_PERMISSIONS: Readonly<Record<string, readonly ApiPermission[]>> = {
  exportRecords: ['API Export'],
  importRecords: ['API Import/Update'],
  deleteRecords: ['Delete Record'],
  exportMetadata: ['API Export'],
  importMetadata: ['API Import/Update', 'Project Design and Setup'],
  exportUsers: ['API Export', 'User Rights'],
  importUsers: ['API Import/Update', 'User Rights'],
  exportDags: ['API Export', 'Data Access Groups Export'],
  importDags: ['API Import/Update', 'Data Access Groups Import'],
} as const;

/** Get required permissions for an operation */
export const getRequiredPermissions = (operation: string): readonly ApiPermission[] =>
  OPERATION_PERMISSIONS[operation] ?? [];
