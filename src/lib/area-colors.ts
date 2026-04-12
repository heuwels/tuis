/**
 * Shared area/location colour maps used across task and appliance components.
 * Every entry includes both light and dark variants.
 */

export const areaColors: Record<string, string> = {
  Kitchen: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  Bathroom: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  "Whole house": "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
  Garden: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  Exterior: "bg-stone-100 text-stone-800 dark:bg-stone-950 dark:text-stone-300",
  Bedrooms: "bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300",
  Lounge: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
  "Living room": "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
  Interior: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300",
  Laundry: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300",
};

export const areaColorFallback = "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";

export const areaBarColors: Record<string, string> = {
  Kitchen: "bg-orange-500", Bathroom: "bg-blue-500", "Whole house": "bg-purple-500",
  Garden: "bg-green-500", Exterior: "bg-stone-500", Bedrooms: "bg-pink-500",
  Lounge: "bg-yellow-500", "Living room": "bg-yellow-500", Interior: "bg-indigo-500",
  Laundry: "bg-cyan-500",
};

export const locationColors: Record<string, string> = {
  Kitchen: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  Bathroom: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  Laundry: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300",
  Garage: "bg-stone-100 text-stone-800 dark:bg-stone-950 dark:text-stone-300",
  Bedroom: "bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300",
  "Living Room": "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
  Office: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300",
  Basement: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  Outdoor: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
};

export const vendorCategoryColors: Record<string, string> = {
  Plumber: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  Electrician: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
  HVAC: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300",
  "Appliance Repair": "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  Landscaping: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  Cleaning: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
  General: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  Other: "bg-stone-100 text-stone-800 dark:bg-stone-950 dark:text-stone-300",
};

export const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  accepted: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  archived: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

export const activityCategoryColors: Record<string, string> = {
  location: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  activity: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  restaurant: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  dish: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  film: "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300",
};

export const activityStatusColors: Record<string, string> = {
  wishlist: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  planned: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
  completed: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
};
