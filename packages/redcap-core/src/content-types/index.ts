/**
 * REDCap content types and mappings
 */

export {
  CONTENT_KEY_MAPPING,
  mapContentKeyToType,
  TAG_GROUPS,
  getTagGroup,
  getContentTypesInGroup,
} from './mappings.js';

export {
  PERMISSION_MAPPING,
  mapPermission,
  type ApiPermission,
  OPERATION_PERMISSIONS,
  getRequiredPermissions,
} from './permissions.js';

export {
  type ApiAction,
  CORE_CONTENT_TYPES,
  V15_CONTENT_TYPES,
  V16_CONTENT_TYPES,
  getContentTypesForVersion,
  isContentTypeAvailable,
  CONTENT_TYPE_ACTIONS,
  getActionsForContentType,
  isActionAvailable,
} from './endpoints.js';
