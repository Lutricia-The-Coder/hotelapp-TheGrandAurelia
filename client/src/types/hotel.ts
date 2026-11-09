export type Branch = {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  phone?: string | null;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  cancellationPolicy?: string | null;
  images?: string[];
  coverImage?: string | null;
  amenities?: {
    amenity: {
      id: string;
      name: string;
    };
  }[];
};

export type RoomType = {
  id: string;
  name: string;
  description?: string | null;
  capacity: number;
  pricePerNight: number;
  totalRooms: number;
  images?: string[];
  amenities?: {
    amenityId: string;
    amenity: {
      id: string;
      name: string;
    };
  }[];
};

export type Hotel = {
  id: string;
  name: string;
  description?: string | null;
  images?: {
    id: string;
    url: string;
    altText?: string | null;
    sortOrder: number;
  }[];
};
