/**
 * Geography and location types
 * @module common/geography.types
 */

/**
 * Country entity with ISO code
 */
export interface CountryType {
  id: string;
  name: string;
  /** ISO 3166-1 alpha-2 country code */
  code: string;
  isActive: boolean;
  deletedAt: Date | null;
  deletedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  states?: StateType[];
}

/**
 * State/Province entity within a country
 */
export interface StateType {
  id: string;
  name: string;
  code: string;
  countryId: string;
  isActive: boolean;
  deletedAt: Date | null;
  deletedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  country?: CountryType;
  districts?: DistrictType[];
}

/**
 * District entity within a state
 */
export interface DistrictType {
  id: string;
  name: string;
  code: string;
  stateId: string;
  isActive: boolean;
  deletedAt: Date | null;
  deletedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  state?: StateType;
  warehouses?: WarehouseType[];
}

/**
 * Warehouse entity for asset storage
 */
export interface WarehouseType {
  id: string;
  name: string;
  code: string;
  districtId: string;
  address: string | null;
  
  // Geolocation
  latitude: number | null;
  longitude: number | null;
  
  // Contact
  contactPerson: string | null;
  contactPhone: string | null;
  
  // Capacity tracking
  capacity: number | null;
  currentCount: number;
  
  isActive: boolean;
  deletedAt: Date | null;
  deletedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  district?: DistrictType;
  assets?: any[]; // AssetType imported from types.ts would cause circular dependency
}
