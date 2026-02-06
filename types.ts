
export enum SlotStatus {
  AVAILABLE = 'Available',
  OCCUPIED = 'Occupied'
}

export interface ParkingSlot {
  id: string;
  slotNumber: string;
  status: SlotStatus;
}

export interface Car {
  plateNumber: string;
  driverName: string;
  phoneNumber: string;
}

export interface ParkingRecord {
  id: string;
  plateNumber: string;
  slotNumber: string;
  entryTime: string;
  exitTime?: string;
  duration?: number; // in hours
  amountPaid?: number;
  status: 'Active' | 'Completed';
}

export interface Payment {
  id: string;
  recordId: string;
  plateNumber: string;
  amountPaid: number;
  paymentDate: string;
}

export interface User {
  username: string;
  isLoggedIn: boolean;
}
