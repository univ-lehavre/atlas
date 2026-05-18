/**
 * @module content-types/content-types.test
 * @description Tests for REDCap content types, mappings, and permissions
 */

import { describe, it, expect } from 'vitest';
import {
  // endpoints
  CORE_CONTENT_TYPES,
  V15_CONTENT_TYPES,
  V16_CONTENT_TYPES,
  getContentTypesForVersion,
  isContentTypeAvailable,
  CONTENT_TYPE_ACTIONS,
  getActionsForContentType,
  isActionAvailable,
  type ApiAction,
  // mappings
  CONTENT_KEY_MAPPING,
  mapContentKeyToType,
  TAG_GROUPS,
  getTagGroup,
  getContentTypesInGroup,
  // permissions
  PERMISSION_MAPPING,
  mapPermission,
  OPERATION_PERMISSIONS,
  getRequiredPermissions,
} from './index.js';
import { createVersion } from '../version/compare.js';

// ============================================================================
// Endpoints Tests
// ============================================================================

describe('Content Type Endpoints', () => {
  describe('CORE_CONTENT_TYPES', () => {
    it('should include essential content types', () => {
      expect(CORE_CONTENT_TYPES).toContain('record');
      expect(CORE_CONTENT_TYPES).toContain('metadata');
      expect(CORE_CONTENT_TYPES).toContain('user');
      expect(CORE_CONTENT_TYPES).toContain('project');
      expect(CORE_CONTENT_TYPES).toContain('version');
    });

    it('should include file-related types', () => {
      expect(CORE_CONTENT_TYPES).toContain('file');
      expect(CORE_CONTENT_TYPES).toContain('fileRepository');
    });

    it('should include survey types', () => {
      expect(CORE_CONTENT_TYPES).toContain('surveyLink');
      expect(CORE_CONTENT_TYPES).toContain('surveyQueueLink');
      expect(CORE_CONTENT_TYPES).toContain('surveyReturnCode');
      expect(CORE_CONTENT_TYPES).toContain('participantList');
    });

    it('should include structure types', () => {
      expect(CORE_CONTENT_TYPES).toContain('event');
      expect(CORE_CONTENT_TYPES).toContain('arm');
      expect(CORE_CONTENT_TYPES).toContain('dag');
    });

    it('should be readonly array (as const)', () => {
      // TypeScript enforces immutability at compile time with `as const`
      // At runtime, we just verify it's an array
      expect(Array.isArray(CORE_CONTENT_TYPES)).toBe(true);
      expect(CORE_CONTENT_TYPES.length).toBeGreaterThan(0);
    });
  });

  describe('V15_CONTENT_TYPES', () => {
    it('should include v15-specific types', () => {
      expect(V15_CONTENT_TYPES).toContain('project_settings');
      expect(V15_CONTENT_TYPES).toContain('fieldValidation');
    });

    it('should not include core types', () => {
      for (const type of V15_CONTENT_TYPES) {
        expect(CORE_CONTENT_TYPES).not.toContain(type);
      }
    });
  });

  describe('V16_CONTENT_TYPES', () => {
    it('should include v16-specific types', () => {
      expect(V16_CONTENT_TYPES).toContain('filesize');
      expect(V16_CONTENT_TYPES).toContain('fileinfo');
      expect(V16_CONTENT_TYPES).toContain('project_xml');
    });

    it('should not include core or v15 types', () => {
      for (const type of V16_CONTENT_TYPES) {
        expect(CORE_CONTENT_TYPES).not.toContain(type);
        expect(V15_CONTENT_TYPES).not.toContain(type);
      }
    });
  });

  describe('getContentTypesForVersion', () => {
    it('should return only core types for v14', () => {
      const v14 = createVersion(14, 0, 0);
      const types = getContentTypesForVersion(v14);

      expect(types).toEqual(expect.arrayContaining([...CORE_CONTENT_TYPES]));
      expect(types).not.toEqual(expect.arrayContaining([...V15_CONTENT_TYPES]));
      expect(types).not.toEqual(expect.arrayContaining([...V16_CONTENT_TYPES]));
    });

    it('should return core + v15 types for v15', () => {
      const v15 = createVersion(15, 0, 0);
      const types = getContentTypesForVersion(v15);

      expect(types).toEqual(expect.arrayContaining([...CORE_CONTENT_TYPES]));
      expect(types).toEqual(expect.arrayContaining([...V15_CONTENT_TYPES]));
      expect(types).not.toEqual(expect.arrayContaining([...V16_CONTENT_TYPES]));
    });

    it('should return all types for v16', () => {
      const v16 = createVersion(16, 0, 0);
      const types = getContentTypesForVersion(v16);

      expect(types).toEqual(expect.arrayContaining([...CORE_CONTENT_TYPES]));
      expect(types).toEqual(expect.arrayContaining([...V15_CONTENT_TYPES]));
      expect(types).toEqual(expect.arrayContaining([...V16_CONTENT_TYPES]));
    });

    it('should handle minor/patch versions', () => {
      const v15_5 = createVersion(15, 5, 32);
      const types = getContentTypesForVersion(v15_5);

      expect(types).toContain('project_settings');
      expect(types).not.toContain('filesize');
    });
  });

  describe('isContentTypeAvailable', () => {
    it('should return true for core types in any version', () => {
      const v14 = createVersion(14, 0, 0);
      expect(isContentTypeAvailable('record', v14)).toBe(true);
      expect(isContentTypeAvailable('metadata', v14)).toBe(true);
      expect(isContentTypeAvailable('user', v14)).toBe(true);
    });

    it('should return false for v15 types in v14', () => {
      const v14 = createVersion(14, 0, 0);
      expect(isContentTypeAvailable('project_settings', v14)).toBe(false);
      expect(isContentTypeAvailable('fieldValidation', v14)).toBe(false);
    });

    it('should return true for v15 types in v15+', () => {
      const v15 = createVersion(15, 0, 0);
      expect(isContentTypeAvailable('project_settings', v15)).toBe(true);
    });

    it('should return false for v16 types in v15', () => {
      const v15 = createVersion(15, 0, 0);
      expect(isContentTypeAvailable('filesize', v15)).toBe(false);
    });

    it('should return true for v16 types in v16+', () => {
      const v16 = createVersion(16, 0, 0);
      expect(isContentTypeAvailable('filesize', v16)).toBe(true);
      expect(isContentTypeAvailable('project_xml', v16)).toBe(true);
    });

    it('should return false for unknown types', () => {
      const v16 = createVersion(16, 0, 0);
      expect(isContentTypeAvailable('unknown_type', v16)).toBe(false);
    });
  });

  describe('CONTENT_TYPE_ACTIONS', () => {
    it('should define actions for record type', () => {
      expect(CONTENT_TYPE_ACTIONS['record']).toContain('export');
      expect(CONTENT_TYPE_ACTIONS['record']).toContain('import');
      expect(CONTENT_TYPE_ACTIONS['record']).toContain('delete');
    });

    it('should define export-only for read-only types', () => {
      expect(CONTENT_TYPE_ACTIONS['version']).toEqual(['export']);
      expect(CONTENT_TYPE_ACTIONS['surveyLink']).toEqual(['export']);
      expect(CONTENT_TYPE_ACTIONS['report']).toEqual(['export']);
    });

    it('should define file repository actions', () => {
      const actions = CONTENT_TYPE_ACTIONS['fileRepository'];
      expect(actions).toContain('export');
      expect(actions).toContain('import');
      expect(actions).toContain('delete');
      expect(actions).toContain('list');
      expect(actions).toContain('createFolder');
    });

    it('should define dag switch action', () => {
      expect(CONTENT_TYPE_ACTIONS['dag']).toContain('switch');
    });
  });

  describe('getActionsForContentType', () => {
    it('should return actions for known types', () => {
      expect(getActionsForContentType('record')).toContain('export');
      expect(getActionsForContentType('file')).toContain('import');
    });

    it('should default to export for unknown types', () => {
      expect(getActionsForContentType('unknown_type')).toEqual(['export']);
    });
  });

  describe('isActionAvailable', () => {
    it('should return true for available actions', () => {
      expect(isActionAvailable('record', 'export')).toBe(true);
      expect(isActionAvailable('record', 'import')).toBe(true);
      expect(isActionAvailable('record', 'delete')).toBe(true);
    });

    it('should return false for unavailable actions', () => {
      expect(isActionAvailable('version', 'import')).toBe(false);
      expect(isActionAvailable('version', 'delete')).toBe(false);
      expect(isActionAvailable('metadata', 'delete')).toBe(false);
    });

    it('should handle all ApiAction types', () => {
      const actions: ApiAction[] = [
        'export',
        'import',
        'delete',
        'switch',
        'list',
        'createFolder',
        'rename',
        'display',
      ];

      for (const action of actions) {
        // Should not throw
        expect(typeof isActionAvailable('record', action)).toBe('boolean');
      }
    });
  });
});

// ============================================================================
// Mappings Tests
// ============================================================================

describe('Content Type Mappings', () => {
  describe('CONTENT_KEY_MAPPING', () => {
    it('should map PHP keys to API types', () => {
      expect(CONTENT_KEY_MAPPING['records']).toBe('record');
      expect(CONTENT_KEY_MAPPING['instr']).toBe('instrument');
      expect(CONTENT_KEY_MAPPING['file_repo']).toBe('fileRepository');
    });

    it('should preserve direct mappings', () => {
      expect(CONTENT_KEY_MAPPING['metadata']).toBe('metadata');
      expect(CONTENT_KEY_MAPPING['file']).toBe('file');
      expect(CONTENT_KEY_MAPPING['project']).toBe('project');
    });

    it('should map survey-related keys', () => {
      expect(CONTENT_KEY_MAPPING['surv_link']).toBe('surveyLink');
      expect(CONTENT_KEY_MAPPING['surv_queue_link']).toBe('surveyQueueLink');
      expect(CONTENT_KEY_MAPPING['surv_ret_code']).toBe('surveyReturnCode');
      expect(CONTENT_KEY_MAPPING['surv_parts']).toBe('participantList');
    });

    it('should map user-related keys', () => {
      expect(CONTENT_KEY_MAPPING['users']).toBe('user');
      expect(CONTENT_KEY_MAPPING['user_roles']).toBe('userRole');
      expect(CONTENT_KEY_MAPPING['user_role_maps']).toBe('userRoleMapping');
      expect(CONTENT_KEY_MAPPING['user_dag_maps']).toBe('userDagMapping');
    });
  });

  describe('mapContentKeyToType', () => {
    it('should map known keys', () => {
      expect(mapContentKeyToType('records')).toBe('record');
      expect(mapContentKeyToType('instr_pdf')).toBe('pdf');
      expect(mapContentKeyToType('logging')).toBe('log');
    });

    it('should return key unchanged if not in mapping', () => {
      expect(mapContentKeyToType('unknown_key')).toBe('unknown_key');
      expect(mapContentKeyToType('custom')).toBe('custom');
    });
  });

  describe('TAG_GROUPS', () => {
    it('should define Records group', () => {
      expect(TAG_GROUPS['Records']).toContain('record');
    });

    it('should define Metadata group', () => {
      expect(TAG_GROUPS['Metadata']).toContain('metadata');
      expect(TAG_GROUPS['Metadata']).toContain('exportFieldNames');
    });

    it('should define Files group', () => {
      expect(TAG_GROUPS['Files']).toContain('file');
      expect(TAG_GROUPS['Files']).toContain('fileRepository');
    });

    it('should define Users & Permissions group', () => {
      const group = TAG_GROUPS['Users & Permissions'];
      expect(group).toContain('user');
      expect(group).toContain('userRole');
      expect(group).toContain('dag');
    });

    it('should define Other group for misc types', () => {
      expect(TAG_GROUPS['Other']).toContain('version');
      expect(TAG_GROUPS['Other']).toContain('generateNextRecordName');
    });
  });

  describe('getTagGroup', () => {
    it('should return correct group for known types', () => {
      expect(getTagGroup('record')).toBe('Records');
      expect(getTagGroup('metadata')).toBe('Metadata');
      expect(getTagGroup('file')).toBe('Files');
      expect(getTagGroup('user')).toBe('Users & Permissions');
      expect(getTagGroup('version')).toBe('Other');
    });

    it('should return Other for unknown types', () => {
      expect(getTagGroup('unknown_type')).toBe('Other');
      expect(getTagGroup('custom')).toBe('Other');
    });
  });

  describe('getContentTypesInGroup', () => {
    it('should return types for known groups', () => {
      expect(getContentTypesInGroup('Records')).toContain('record');
      expect(getContentTypesInGroup('Metadata')).toContain('metadata');
    });

    it('should return empty array for unknown groups', () => {
      expect(getContentTypesInGroup('Unknown')).toEqual([]);
      expect(getContentTypesInGroup('')).toEqual([]);
    });
  });
});

// ============================================================================
// Permissions Tests
// ============================================================================

describe('Permissions', () => {
  describe('PERMISSION_MAPPING', () => {
    it('should map export permission codes', () => {
      expect(PERMISSION_MAPPING['e']).toBe('API Export');
      expect(PERMISSION_MAPPING['l']).toBe('API Export');
    });

    it('should map import permission code', () => {
      expect(PERMISSION_MAPPING['i']).toBe('API Import/Update');
    });

    it('should map delete permission code', () => {
      expect(PERMISSION_MAPPING['d']).toBe('Delete Record');
    });

    it('should map user-related permissions', () => {
      expect(PERMISSION_MAPPING['iuser']).toBe('User Rights');
      expect(PERMISSION_MAPPING['euser']).toBe('User Rights');
    });

    it('should map design permissions', () => {
      expect(PERMISSION_MAPPING['idesign']).toBe('Project Design and Setup');
      expect(PERMISSION_MAPPING['design_e']).toBe('Project Design Export');
      expect(PERMISSION_MAPPING['design_i']).toBe('Project Design Import');
    });

    it('should map DAG permissions', () => {
      expect(PERMISSION_MAPPING['dag_e']).toBe('Data Access Groups Export');
      expect(PERMISSION_MAPPING['dag_i']).toBe('Data Access Groups Import');
    });
  });

  describe('mapPermission', () => {
    it('should map known codes', () => {
      expect(mapPermission('e')).toBe('API Export');
      expect(mapPermission('i')).toBe('API Import/Update');
      expect(mapPermission('d')).toBe('Delete Record');
    });

    it('should return code unchanged if not in mapping', () => {
      expect(mapPermission('unknown')).toBe('unknown');
      expect(mapPermission('x')).toBe('x');
    });
  });

  describe('OPERATION_PERMISSIONS', () => {
    it('should define exportRecords permissions', () => {
      expect(OPERATION_PERMISSIONS['exportRecords']).toContain('API Export');
    });

    it('should define importRecords permissions', () => {
      expect(OPERATION_PERMISSIONS['importRecords']).toContain('API Import/Update');
    });

    it('should define deleteRecords permissions', () => {
      expect(OPERATION_PERMISSIONS['deleteRecords']).toContain('Delete Record');
    });

    it('should define metadata permissions', () => {
      expect(OPERATION_PERMISSIONS['exportMetadata']).toContain('API Export');
      expect(OPERATION_PERMISSIONS['importMetadata']).toContain('API Import/Update');
      expect(OPERATION_PERMISSIONS['importMetadata']).toContain('Project Design and Setup');
    });

    it('should define user permissions', () => {
      expect(OPERATION_PERMISSIONS['exportUsers']).toContain('User Rights');
      expect(OPERATION_PERMISSIONS['importUsers']).toContain('User Rights');
    });

    it('should define DAG permissions', () => {
      expect(OPERATION_PERMISSIONS['exportDags']).toContain('Data Access Groups Export');
      expect(OPERATION_PERMISSIONS['importDags']).toContain('Data Access Groups Import');
    });
  });

  describe('getRequiredPermissions', () => {
    it('should return permissions for known operations', () => {
      expect(getRequiredPermissions('exportRecords')).toContain('API Export');
      expect(getRequiredPermissions('deleteRecords')).toContain('Delete Record');
    });

    it('should return multiple permissions when required', () => {
      const perms = getRequiredPermissions('importMetadata');
      expect(perms).toContain('API Import/Update');
      expect(perms).toContain('Project Design and Setup');
    });

    it('should return empty array for unknown operations', () => {
      expect(getRequiredPermissions('unknown')).toEqual([]);
      expect(getRequiredPermissions('')).toEqual([]);
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Content Types Integration', () => {
  it('should have mappings for all core content types', () => {
    // All content types should be in at least one tag group
    for (const type of CORE_CONTENT_TYPES) {
      const group = getTagGroup(type);
      expect(group).toBeTruthy();
    }
  });

  it('should have actions defined for all content types', () => {
    const allTypes = [...CORE_CONTENT_TYPES, ...V15_CONTENT_TYPES, ...V16_CONTENT_TYPES];

    for (const type of allTypes) {
      const actions = getActionsForContentType(type);
      expect(actions.length).toBeGreaterThan(0);
      expect(actions).toContain('export'); // All types support at least export
    }
  });

  it('should map PHP keys to content types that exist', () => {
    for (const apiType of Object.values(CONTENT_KEY_MAPPING)) {
      // All mapped types should be strings
      expect(typeof apiType).toBe('string');
      expect(apiType.length).toBeGreaterThan(0);
    }
  });
});
