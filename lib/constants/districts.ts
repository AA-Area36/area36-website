// District numbers for Area 36
// Districts 1-9 and 11-27 (District 10 was incorporated into District 23)
export const districtNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27] as const

export type DistrictNumber = (typeof districtNumbers)[number]

export const districtOptions = districtNumbers.map((num) => ({
  value: num.toString(),
  label: `District ${num}`,
}))
