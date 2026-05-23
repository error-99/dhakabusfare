export interface Stop {
  stop_name: string;
  cumulative_km: number;
}

export interface Route {
  route_id: string;
  route_name: string;
  fare_per_km: number;
  minimum_fare: number;
  stops: Stop[];
}

export interface FareCalculation {
  route: Route;
  fromStop: Stop;
  toStop: Stop;
  distance: number;
  calculatedFare: number;
}
