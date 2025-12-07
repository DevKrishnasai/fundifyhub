/**
 * Geography-related types
 */

export interface CountryDTO {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

export interface StateDTO {
  id: string;
  name: string;
  code: string;
  countryId: string;
  isActive: boolean;
}

export interface DistrictDTO {
  id: string;
  name: string;
  code: string;
  stateId: string;
  isActive: boolean;
}

export interface WarehouseDTO {
  id: string;
  name: string;
  code: string;
  districtId: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  contactPerson?: string | null;
  contactPhone?: string | null;
  capacity?: number | null;
  currentCount: number;
  isActive: boolean;
}
