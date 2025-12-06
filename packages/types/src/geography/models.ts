import { District } from './constants';

/**
 * Country entity with ISO code
 */
export interface Country {
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
  states?: State[];
  _count?: {
    states?: number;
    [key: string]: number | undefined;
  };
}

/**
 * State/Province entity within a country
 */
export interface State {
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
  country?: Country;
  districts?: DistrictType[]; // Using DistrictType to avoid conflict with District string literal
  _count?: {
    districts?: number;
    [key: string]: number | undefined;
  };
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
  state?: State;
  warehouses?: Warehouse[];
  _count?: {
    warehouses?: number;
    [key: string]: number | undefined;
  };
}

/**
 * Warehouse entity for asset storage
 */
export interface Warehouse {
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
  assets?: any[]; // Avoid circular dependency
  _count?: {
    assets?: number;
    [key: string]: number | undefined;
  };
}

// Aliases
export type CountryType = Country;
export type StateType = State;
export type WarehouseType = Warehouse;
// DistrictType is already defined as interface
