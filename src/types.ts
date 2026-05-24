export type Priority = 'high' | 'medium' | 'low';
export type FollowUpStatus = 'pending' | 'completed' | 'cancelled';

export interface Visit {
  id: string;
  customerId: string;
  userId: string;
  visitDate: string; // ISO datetime
  visitNotes: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone?: string;
  email?: string;
  lat?: number;
  lng?: number;
  priority: Priority;
  lastVisitDate?: string;
  visitNotes?: string;
  followUpDate?: string;
  followUpStatus?: FollowUpStatus;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RouteStop {
  customerId: string;
  order: number;
}

export interface SavedRoute {
  id: string;
  userId: string;
  routeName: string;
  routeDate: string; // ISO date
  startAddress: string;
  stops: RouteStop[]; // ordered list
  createdAt: string;
}

export interface AppSettings {
  defaultRadius: number;
  defaultCity: string;
  companyName: string;
  salesRepName: string;
  homeBase: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  defaultRadius: 25,
  defaultCity: '',
  companyName: '',
  salesRepName: '',
  homeBase: '',
};
