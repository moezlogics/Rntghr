/**
 * The features a Pakistani listing is actually described by, ready to tick.
 *
 * They used to be free text: every agent typed their own ("car porch", "Car
 * Porch", "carporch"), so nothing could be filtered, counted or searched, and
 * two identical houses read as different properties. These are the phrases
 * Zameen, Graana and the local market already use — picked from a list, they
 * mean the same thing on every listing.
 *
 * Existing listings are untouched: whatever was typed into them stays, shown
 * alongside these as a custom feature (see FeaturesPicker).
 *
 * Wording is deliberately the Pakistani one rather than the textbook one —
 * "sui gas", "boring", "fard", "intiqal", "car porch", "west open". An agent
 * in Multan should recognise their own listing in this list, and a tenant
 * searching for "west open" should find the houses that are.
 */

/** Keys match the capitalised types the property forms use. */
export type PropertyTypeKey =
  | "House"
  | "Upper Portion"
  | "Lower Portion"
  | "Flat"
  | "Apartment"
  | "Room"
  | "Hostel"
  | "Shop"
  | "Office"
  | "Warehouse"
  | "Commercial";

export interface FeatureGroup {
  title: string;
  /** Which property types this group makes sense for. Empty = all of them. */
  types?: PropertyTypeKey[];
  /**
   * Which listing type it belongs to, when it belongs to only one.
   *
   * Rent Ghar lists rentals only, so this is always 'rent' when set.
   */
  purpose?: 'rent';
  features: string[];
}

const RESIDENTIAL: PropertyTypeKey[] = ["House", "Upper Portion", "Lower Portion", "Apartment", "Flat", "Room", "Hostel"];
const BUILT: PropertyTypeKey[] = [
  "House",
  "Upper Portion",
  "Lower Portion",
  "Apartment",
  "Flat",
  "Room",
  "Hostel",
  "Commercial",
  "Shop",
  "Office",
  "Warehouse",
];
const COMMERCIAL: PropertyTypeKey[] = [
  "Commercial",
  "Shop",
  "Office",
  "Warehouse",
];

export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    // What the market actually pays a premium for.
    title: "Main features",
    features: [
      "Corner",
      "Park facing",
      "Boulevard / main road",
      "West open",
      "East open",
      "Back open",
      "Two side open",
      "Three side open",
      "Facing mosque",
      "Sun facing",
      "Wide street (40 ft+)",
      "Cul-de-sac / dead end street",
      "Near entrance gate",
    ],
  },
  {
    /*
     * Split out of "Main features", which was shown to every property type
     * and asked whether a plot of land was furnished.
     */
    title: "Condition & handover",
    types: BUILT,
    features: [
      "Newly built",
      "Renovated",
      "Furnished",
      "Semi furnished",
      "Separate entrance",
      "Double unit",
    ],
  },
  {
    title: "Floors & layout",
    types: BUILT,
    features: [
      "Single storey",
      "Double storey",
      "Triple storey",
      "Ground floor",
      "First floor",
      "Top floor",
      "Ground + basement",
      "Ground portion only",
      "Upper portion only",
      "Separate portions (two families)",
      "Independent unit",
      "Open plan",
      "Corner unit",
    ],
  },
  {
    title: "Rooms",
    types: RESIDENTIAL,
    features: [
      "Drawing room",
      "Dining room",
      "TV lounge",
      "Lounge / sitting room",
      "Family lounge",
      "Guest room",
      "Study room",
      "Store room",
      "Powder room",
      "Servant quarter",
      "Maid room",
      "Laundry room",
      "Basement",
      "Attached bathrooms",
      "Master bedroom",
      "Built-in wardrobes",
      "Walk-in closet",
      "Roof access",
      "Room on roof",
      "Separate kitchen",
      "Open / American kitchen",
      "Dirty kitchen",
      "Two kitchens",
      "Prayer room",
    ],
  },
  {
    title: "Utilities",
    types: BUILT,
    features: [
      "Electricity",
      "Sui gas",
      "Water supply",
      "Water tank",
      "Overhead tank",
      "Underground tank",
      "Boring / water pump",
      "Water filter plant",
      "Solar panels",
      "Solar net metering",
      "Generator",
      "UPS backup",
      "Standby electricity",
      "Three phase meter",
      "Separate meters",
      "Gas geyser",
      "Electric geyser",
      "Internet / fibre",
      "Sewerage",
      "Underground wiring",
      "Rain water drainage",
    ],
  },
  {
    title: "Finishing",
    types: BUILT,
    features: [
      "Marble flooring",
      "Imported marble",
      "Tile flooring",
      "Wooden flooring",
      "Chip / mosaic flooring",
      "False ceiling",
      "POP / gypsum ceiling",
      "Wood work",
      "Imported fittings",
      "Imported sanitary",
      "Kitchen cabinets",
      "Designer kitchen",
      "Double glazed windows",
      "uPVC windows",
      "Aluminium windows",
      "Glass railing",
      "Wooden doors",
      "Centrally air conditioned",
      "Air conditioning installed",
      "Heating / gas heaters",
      "Painted recently",
      "Grey structure",
    ],
  },
  {
    title: "Outside",
    types: BUILT,
    features: [
      "Lawn / garden",
      "Kitchen garden",
      "Fruit trees",
      "Car porch",
      "Garage",
      "Parking space",
      "Parking for 2+ cars",
      "Driveway",
      "Terrace",
      "Rooftop sitting area",
      "Balcony",
      "Veranda",
      "Swimming pool",
      "Boundary wall",
      "Main gate",
      "Grill work",
      "Tube well",
      "Servant entrance",
      "Open space",
    ],
  },
  {
    title: "Building facilities",
    types: ["Apartment", "Flat", "Hostel", "Commercial", "Office"],
    features: [
      "Lift / elevator",
      "Backup lift",
      "Reception",
      "Security staff",
      "CCTV cameras",
      "Intercom",
      "Fire alarm",
      "Maintenance staff",
      "Service stairs",
      "Visitor parking",
      "Basement parking",
      "Community lawn",
      "Rooftop community area",
      "Children play area",
      "Gym",
      "Prayer area",
      "Mosque in building",
      "Water filtration plant",
      "Waste disposal",
      "Standby generator for common areas",
    ],
  },
  {
    title: "Society & nearby",
    features: [
      "Gated community",
      "Security 24/7",
      "Mosque nearby",
      "Park nearby",
      "School nearby",
      "College / university nearby",
      "Hospital nearby",
      "Market / bazaar nearby",
      "Bank / ATM nearby",
      "Public transport nearby",
      "Metro / Orange Line nearby",
      "Main highway access",
      "Motorway interchange nearby",
      "Ring road nearby",
      "Airport nearby",
      "Railway station nearby",
      "Commercial area nearby",
      "Society maintenance",
      "Street lights",
      "Carpeted roads",
      "Developed sector",
      "Under-development sector",
    ],
  },
  {
    title: "Rental terms",
    purpose: 'rent',
    features: [
      "Rent negotiable",
      "Advance required",
      "Family only",
      "Bachelors allowed",
      "Short term rent",
      "Long term rent",
      "Maintenance included in rent",
      "Utilities separate",
    ],
  },
  {
    title: "Commercial",
    types: COMMERCIAL,
    features: [
      "Shutter front",
      "Glass front",
      "Mezzanine floor",
      "Freight elevator",
      "Loading bay",
      "Conference room",
      "Separate washrooms",
      "Three phase electricity",
      "Industrial power",
      "Fire safety system",
      "Staff area",
      "Signboard space",
      "Running business",
      "Food court / plaza",
      "Customer parking",
      "Warehouse / godown space",
      "Cold storage",
      "Boundary secured yard",
      "Office cabins",
      "Server / IT room",
    ],
  },
];

/** The groups that apply to one property type, and one listing type. */
export function featureGroupsFor(
  type?: string,
  purpose?: 'rent',
): FeatureGroup[] {
  const key = type as PropertyTypeKey | undefined;

  return FEATURE_GROUPS.filter((group) => {
    if (group.types && (!key || !group.types.includes(key))) return false;
    if (group.purpose && purpose && group.purpose !== purpose) return false;
    return true;
  });
}

/** Every feature offered for a type, flattened — used to spot custom ones. */
export function knownFeaturesFor(type?: string, purpose?: 'rent'): Set<string> {
  const all = new Set<string>();
  for (const group of featureGroupsFor(type, purpose)) {
    for (const feature of group.features) all.add(feature);
  }
  return all;
}

/** Every feature in the catalogue, whatever the type. */
export const ALL_KNOWN_FEATURES: Set<string> = new Set(
  FEATURE_GROUPS.flatMap((group) => group.features),
);
