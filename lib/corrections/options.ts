export const CORRECTIONS_SOURCE_OPTIONS = [
  "ACFH",
  "Inside AA",
  "Inside Sponsor Request",
  "Other Transition Event",
  "Transition Fair",
] as const

export const CORRECTIONS_FACILITY_OPTIONS = [
  "ACF - Hennepin",
  "FCI - Sandstone",
  "FCI - Waseca",
  "FMC - Rochester",
  "MCF - Faribault",
  "MCF - Lino Lakes",
  "MCF - Moose Lake",
  "MCF - Oak Park Heights",
  "MCF - Red Wing",
  "MCF - Rush City",
  "MCF - Shakopee",
  "MCF - St. Cloud",
  "MCF - Togo",
  "MCF - Willow River",
  "MCF - Stillwater",
  "Wright County Jail",
] as const

export const RECIPIENT_STATUS_OPTIONS = ["unmatched", "pending", "completed"] as const

export type RecipientStatus = (typeof RECIPIENT_STATUS_OPTIONS)[number]
