export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  district: string;
  isActive: boolean;
}