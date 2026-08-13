export const QUORUM_APP_PROPERTIES = {
  feature: "a36Feature",
  eventKey: "a36QuorumEventKey",
  title: "a36QuorumTitle",
  eventDate: "a36QuorumDate",
  quorumTarget: "a36QuorumTarget",
  status: "a36QuorumStatus",
  featured: "a36QuorumFeatured",
  schemaVersion: "a36QuorumSchemaVersion",
} as const

export const QUORUM_FEATURE_VALUE = "quorum"
export const QUORUM_ROOT_PROPERTY_KEY = "a36QuorumRoot"
export const QUORUM_ROOT_PROPERTY_VALUE = "1"
export const QUORUM_SCHEMA_VERSION = "2"
export const QUORUM_SUBMISSIONS_TAB = "Submissions"
export const QUORUM_CONFIG_TAB = "Config"

export const SERVICE_POSITIONS = [
  "general_member",
  "gsr",
  "alt_gsr",
  "dcm",
  "alt_dcm",
  "past_delegate",
  "area_officer",
  "area_committee_chair",
  "district_secretary_treasurer",
  "district_committee_chair",
  "other_trusted_servant",
  "other",
] as const

export type ServicePosition = (typeof SERVICE_POSITIONS)[number]

export const SERVICE_POSITION_OPTIONS: ReadonlyArray<{
  value: ServicePosition
  label: string
}> = [
  { value: "general_member", label: "General A.A. Member" },
  { value: "gsr", label: "GSR" },
  { value: "alt_gsr", label: "Alternate GSR" },
  { value: "dcm", label: "DCM" },
  { value: "alt_dcm", label: "Alternate DCM" },
  { value: "past_delegate", label: "Past Delegate" },
  { value: "area_officer", label: "Area Officer" },
  { value: "area_committee_chair", label: "Area Committee Chair" },
  { value: "district_secretary_treasurer", label: "District Secretary / Treasurer" },
  { value: "district_committee_chair", label: "District Committee Chair" },
  { value: "other_trusted_servant", label: "Other Trusted Servant" },
  { value: "other", label: "Other" },
]

export const NEWSLETTER_DELIVERIES = ["email", "postal_mail", "both", "neither"] as const

export type NewsletterDelivery = (typeof NEWSLETTER_DELIVERIES)[number]

export const NEWSLETTER_DELIVERY_OPTIONS: ReadonlyArray<{
  value: NewsletterDelivery
  label: string
}> = [
  { value: "email", label: "By email" },
  { value: "postal_mail", label: "By postal mail" },
  { value: "both", label: "Both email and postal mail" },
  { value: "neither", label: "Neither" },
]

export const QUORUM_HEADERS = [
  "Submission ID",
  "Submitted At",
  "Name",
  "District",
  "Home Group",
  "Service Position",
  "Position Detail",
  "Is Alternate",
  "Email",
  "Phone",
  "Street Address",
  "City",
  "State",
  "ZIP",
  "Seat Key",
  "Admin Voting Override",
  "Counted",
  "Correction Reason",
  "Corrected By",
  "Corrected At",
  "Source",
  "Newsletter Delivery",
] as const

export const QUORUM_COLUMN = {
  submissionId: 0,
  submittedAt: 1,
  name: 2,
  district: 3,
  homeGroup: 4,
  servicePosition: 5,
  positionDetail: 6,
  isAlternate: 7,
  email: 8,
  phone: 9,
  streetAddress: 10,
  city: 11,
  state: 12,
  zip: 13,
  seatKey: 14,
  adminVotingOverride: 15,
  counted: 16,
  correctionReason: 17,
  correctedBy: 18,
  correctedAt: 19,
  source: 20,
  newsletterDelivery: 21,
} as const
