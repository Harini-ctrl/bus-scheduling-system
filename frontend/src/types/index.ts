export interface Bus {
  _id: string;
  busNumber: string;
  capacity: number;
  status: 'active' | 'inactive' | 'maintenance';
  createdAt: string;
  updatedAt: string;
}

export interface Driver {
  _id: string;
  name: string;
  licenseNumber: string;
  phone?: string;
  shiftStart?: string;
  shiftEnd?: string;
  status: 'available' | 'on-duty' | 'on-rest' | 'off-duty';
  restUntil?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Coordinate {
  lat: number;
  lng: number;
  label: string;
}

export interface Route {
  _id: string;
  routeName: string;
  startLocation: string;
  endLocation: string;
  stops: string[];
  distance: number;
  coordinates: Coordinate[];
  createdAt: string;
  updatedAt: string;
}

export interface Schedule {
  _id: string;
  busId: Bus;
  driverId: Driver;
  routeId: Route;
  departureTime: string;
  arrivalTime: string;
  dutyType: 'linked' | 'unlinked';
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  restDuration: number;
  createdAt: string;
}

export interface AddRouteResponse {
  message: string;
  route: Route;
  overlaps: {
    routeId: string;
    routeName: string;
    overlappingStops: string[];
  }[];
}

export interface AddScheduleResponse {
  message: string;
  schedule: Schedule;
}