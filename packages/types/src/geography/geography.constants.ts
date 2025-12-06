/**
 * Geography constants
 * @module geography/geography.constants
 */

/**
 * Available districts for operations
 * @deprecated Use geography hierarchy from database (Country → State → District)
 * This is kept for backward compatibility during migration.
 */
export const DISTRICTS = [
  'Hyderabad',
  'Warangal',
  'Nizamabad',
  'Karimnagar',
  'Khammam',
  'Mahbubnagar',
  'Nalgonda',
  'Adilabad',
  'Medak',
  'Rangareddy',
  'Sangareddy',
  'Siddipet',
  'Jagtial',
  'Peddapalli',
  'Mancherial',
  'Kamareddy',
  'Nirmal',
  'Kumuram Bheem',
  'Rajanna Sircilla',
  'Medchal-Malkajgiri',
  'Wanaparthy',
  'Nagarkurnool',
  'Jogulamba Gadwal',
  'Suryapet',
  'Yadadri Bhuvanagiri',
  'Mahabubabad',
  'Bhadradri Kothagudem',
  'Jangaon',
  'Jayashankar Bhupalpally',
  'Mulugu',
  'Narayanpet',
  'Vikarabad',
] as const;

export type District = typeof DISTRICTS[number];
