export interface User {
  id: string;
  name: string;
  photoURL: string;
  status: string;
  lastSeen: string;
  allowMessages: boolean;
  isOnline: boolean;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Place {
  id: string;
  name: string;
  coordinate: {
    latitude: number;
    longitude: number;
  };
  description?: string;
  rating?: number;
  address?: string;
  openingHours?: string;
  photos: string[];
  reviews: Review[];
  users: User[];
} 