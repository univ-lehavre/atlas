import type { EAV } from '../types';

const buildName = (data: EAV[]): string => {
  const first_name = data
    .filter((record) => record.field_name === 'first_name')
    .map((record) => record.value)[0];
  const middle_name = data
    .filter((record) => record.field_name === 'middle_name')
    .map((record) => record.value)[0];
  const last_name = data
    .filter((record) => record.field_name === 'last_name')
    .map((record) => record.value)[0];
  const name = transformToName(first_name, middle_name, last_name);
  return name;
};

const transformToName = (first_name: string, middle_name: string, last_name: string): string => {
  const name = [first_name, middle_name, last_name]
    .filter((value) => typeof value === 'string')
    .filter((value) => value !== '')
    .map((value) => value.trim())
    .map((value) => capitalizeFirstLetter(value))
    .filter((value) => value !== '')
    .join(' ');
  return name;
};

const capitalizeFirstLetter = (name: string): string => {
  if (!name) return '';
  return name
    .split(' ')
    .map((part) => {
      if (part.toLowerCase() === 'de') {
        return part.toLowerCase();
      }
      return part
        .split('-')
        .map((subPart) => subPart.charAt(0).toUpperCase() + subPart.slice(1).toLowerCase())
        .join('-');
    })
    .join(' ');
};

export { buildName, transformToName };
