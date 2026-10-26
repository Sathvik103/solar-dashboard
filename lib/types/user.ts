/**
 * Core domain types for users and solar profiles.
 * These types are shared across the server-side DAL, Server Actions, and
 * client-side components (read-only display).
 *
 * Phase 2: User and SolarProfile types align with public.users and
 * public.solar_profiles database tables defined in
 * supabase/migrations/001_create_users.sql and
 * supabase/migrations/002_create_solar_profiles.sql.
 */

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

export type User = {
  id: string
  email: string
  fullName: string | null
  avatarUrl: string | null
  createdAt: string
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Solar Profile enum types
// ---------------------------------------------------------------------------

export type RoofType = 'flat-rcc' | 'flat-concrete' | 'sloped-tile' | 'metal-sheet' | 'other'

export type RoofOrientation =
  | 'south'
  | 'south-east'
  | 'south-west'
  | 'east'
  | 'west'
  | 'north'
  | 'flat'
  | 'other'

export type ShadingLevel = 'none' | 'low' | 'medium' | 'high' | 'partial' | 'heavy'

export type BatteryPreference =
  | 'no-battery'
  | 'add-battery-now'
  | 'future-expansion'
  | 'battery-backup'
  | 'off-grid'

// ---------------------------------------------------------------------------
// Solar Profile
// ---------------------------------------------------------------------------

export type SolarProfile = {
  id: string
  userId: string

  // Location
  city: string        // defaults to 'Hyderabad'
  state: string       // defaults to 'Telangana'
  district: string | null
  pincode: string | null

  // Consumption & billing
  monthlyBillInr: number | null
  monthlyUnitsKwh: number | null
  /**
   * User-entered convenience value for Phase 2.
   * NOT authoritative — authoritative tariff data will come from the
   * knowledge base (Phase 3+) and supersede this field.
   */
  electricityTariffInr: number | null

  // Roof details
  roofAreaSqft: number | null
  roofType: RoofType | null
  roofOrientation: RoofOrientation | null
  shadingLevel: ShadingLevel | null

  // Desired system
  budgetInr: number | null
  preferredCapacityKw: number | null
  batteryPreference: BatteryPreference

  // Timestamps
  createdAt: string
  updatedAt: string
}

/**
 * Input type for creating or updating a solar profile.
 * Strips server-generated fields (id, userId, timestamps).
 */
export type SolarProfileInput = Omit<
  SolarProfile,
  'id' | 'userId' | 'createdAt' | 'updatedAt'
>
