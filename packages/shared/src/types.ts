import type { Database } from "./database.types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"];
export type Ride = Database["public"]["Tables"]["rides"]["Row"];
export type Booking = Database["public"]["Tables"]["bookings"]["Row"];
export type Rating = Database["public"]["Tables"]["ratings"]["Row"];
export type Message = Database["public"]["Tables"]["messages"]["Row"];
export type PublicProfile = Database["public"]["Views"]["public_profiles"]["Row"];

export type AppRole = Database["public"]["Enums"]["app_role"];
export type RideStatus = Database["public"]["Enums"]["ride_status"];
export type BookingStatus = Database["public"]["Enums"]["booking_status"];

export const ALL_ROLES: AppRole[] = ["rider", "driver"];

export function hasRole(profile: Pick<Profile, "roles">, role: AppRole): boolean {
  return profile.roles.includes(role);
}

export function needsRoleSelection(profile: Pick<Profile, "roles">): boolean {
  return profile.roles.length === 0;
}
