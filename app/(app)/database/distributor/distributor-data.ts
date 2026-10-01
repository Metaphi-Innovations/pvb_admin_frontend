export type DistributorSource = "sfa" | "erp";

export type DistributorConversionStatus =
  | "not_converted"
  | "draft_customer"
  | "customer_completed";

/** Raw distributor data — scoring/category/credit are computed in ERP only. */
export interface Distributor {
  id: number;
  firmName: string;
  contactPersonName: string;
  yearsInBusiness: number;
  address: string;
  addressLine2?: string;
  gender: "Male" | "Female" | "Other";
  phoneNumber: string;
  village: string;
  town: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  companiesDealingIn: string;
  latLong: string;
  annualTurnover: string;
  /** Annual Business Plan — raw SFA field (amount in crores) */
  annualBusinessPotential: string;
  farmerNetwork: string;
  /** SFA mobile submission metadata */
  source: DistributorSource;
  submittedAt?: string;
  photos?: string[];
  conversionStatus?: DistributorConversionStatus;
  /** Linked Customer Master record after conversion */
  convertedCustomerId?: number | null;
}

export const SEED: Distributor[] = [
  {
    id: 1,
    firmName: "Anand Agro Traders",
    contactPersonName: "Rahul Sharma",
    yearsInBusiness: 14,
    address: "12 Market Yard Road, Opp. Grain Depot",
    gender: "Male",
    phoneNumber: "9876502001",
    village: "Navapura",
    town: "Anand",
    city: "Anand",
    district: "Anand",
    state: "Gujarat",
    pincode: "388001",
    companiesDealingIn: "UPL, Bayer, Dharitri Sutra",
    latLong: "22.5645, 72.9289",
    annualTurnover: "₹1.8 Cr",
    annualBusinessPotential: "₹0.42 Cr",
    farmerNetwork: "1,250 Farmers",
    source: "sfa",
    submittedAt: "2026-06-15",
  },
  {
    id: 2,
    firmName: "Mehsana Agri Center",
    contactPersonName: "Nilesh Shah",
    yearsInBusiness: 9,
    address: "45 Station Road, Near APMC Gate",
    gender: "Male",
    phoneNumber: "9876502002",
    village: "Kheralu",
    town: "Kheralu",
    city: "Mehsana",
    district: "Mehsana",
    state: "Gujarat",
    pincode: "384325",
    companiesDealingIn: "Syngenta, PI Industries",
    latLong: "23.8851, 72.6187",
    annualTurnover: "₹0.95 Cr",
    annualBusinessPotential: "₹0.24 Cr",
    farmerNetwork: "820 Farmers",
    source: "sfa",
    submittedAt: "2026-06-13",
  },
  {
    id: 3,
    firmName: "Raipur Krishi Seva",
    contactPersonName: "Anita Verma",
    yearsInBusiness: 11,
    address: "Plot 8, Krishi Upaj Mandi Complex",
    gender: "Female",
    phoneNumber: "9876502003",
    village: "Bhanpur",
    town: "Raipur Rural",
    city: "Raipur",
    district: "Raipur",
    state: "Chhattisgarh",
    pincode: "492001",
    companiesDealingIn: "Dhanuka, Dharitri Sutra",
    latLong: "21.2514, 81.6296",
    annualTurnover: "₹1.15 Cr",
    annualBusinessPotential: "₹0.31 Cr",
    farmerNetwork: "960 Farmers",
    source: "sfa",
    submittedAt: "2026-06-14",
  },
  {
    id: 4,
    firmName: "Tandur Crop Care",
    contactPersonName: "Prakash Rao",
    yearsInBusiness: 7,
    address: "Main Bazaar Street, Near Bus Stand",
    gender: "Male",
    phoneNumber: "9876502004",
    village: "Tandur",
    town: "Tandur",
    city: "Vikarabad",
    district: "Vikarabad",
    state: "Telangana",
    pincode: "501141",
    companiesDealingIn: "Coromandel, Bayer",
    latLong: "17.2473, 77.5767",
    annualTurnover: "₹0.72 Cr",
    annualBusinessPotential: "₹0.18 Cr",
    farmerNetwork: "640 Farmers",
    source: "sfa",
    submittedAt: "2026-06-13",
  },
  {
    id: 5,
    firmName: "Fatehpur Agro Traders",
    contactPersonName: "Priya Singh",
    yearsInBusiness: 13,
    address: "Civil Lines Road, Near Block Office",
    gender: "Female",
    phoneNumber: "9876502005",
    village: "Barwa",
    town: "Fatehpur",
    city: "Fatehpur",
    district: "Fatehpur",
    state: "Uttar Pradesh",
    pincode: "212601",
    companiesDealingIn: "IFFCO, Dharitri Sutra",
    latLong: "25.9270, 80.8120",
    annualTurnover: "₹1.05 Cr",
    annualBusinessPotential: "₹0.27 Cr",
    farmerNetwork: "1,020 Farmers",
    source: "sfa",
    submittedAt: "2026-06-14",
  },
  {
    id: 6,
    firmName: "Solapur Agro Mart",
    contactPersonName: "Amit Patil",
    yearsInBusiness: 16,
    address: "Wholesale Agri Market, Lane 3",
    gender: "Male",
    phoneNumber: "9876502006",
    village: "Mohol",
    town: "Mohol",
    city: "Solapur",
    district: "Solapur",
    state: "Maharashtra",
    pincode: "413213",
    companiesDealingIn: "UPL, Rallis, Dharitri Sutra",
    latLong: "17.8112, 75.6411",
    annualTurnover: "₹2.1 Cr",
    annualBusinessPotential: "₹0.48 Cr",
    farmerNetwork: "1,540 Farmers",
    source: "sfa",
    submittedAt: "2026-06-12",
  },
  {
    id: 7,
    firmName: "Alappuzha Farm Inputs",
    contactPersonName: "Meera Nair",
    yearsInBusiness: 6,
    address: "Canal View Road, Junction Corner",
    gender: "Female",
    phoneNumber: "9876502007",
    village: "Kuttanad",
    town: "Kuttanad",
    city: "Alappuzha",
    district: "Alappuzha",
    state: "Kerala",
    pincode: "688001",
    companiesDealingIn: "BioStadt, Organic India",
    latLong: "9.4981, 76.3388",
    annualTurnover: "₹0.58 Cr",
    annualBusinessPotential: "₹0.16 Cr",
    farmerNetwork: "510 Farmers",
    source: "sfa",
    submittedAt: "2026-06-11",
  },
  {
    id: 8,
    firmName: "Murshidabad Agri Supply",
    contactPersonName: "Subhash Dey",
    yearsInBusiness: 10,
    address: "Godown Lane, Near Rice Mill",
    gender: "Male",
    phoneNumber: "9876502008",
    village: "Srirampur",
    town: "Srirampur",
    city: "Murshidabad",
    district: "Murshidabad",
    state: "West Bengal",
    pincode: "742149",
    companiesDealingIn: "Dharitri Sutra, UPL",
    latLong: "24.1750, 88.2750",
    annualTurnover: "₹0.88 Cr",
    annualBusinessPotential: "₹0.22 Cr",
    farmerNetwork: "870 Farmers",
    source: "sfa",
    submittedAt: "2026-06-13",
  },
  {
    id: 9,
    firmName: "Kadapa Rural Inputs",
    contactPersonName: "Lakshmi Reddy",
    yearsInBusiness: 8,
    address: "APMC Link Road, Near Cold Storage",
    gender: "Female",
    phoneNumber: "9876502009",
    village: "Vempalli",
    town: "Vempalli",
    city: "Kadapa",
    district: "Kadapa",
    state: "Andhra Pradesh",
    pincode: "516329",
    companiesDealingIn: "UPL, Dharitri Sutra, Crystal",
    latLong: "14.3664, 78.6067",
    annualTurnover: "₹0.84 Cr",
    annualBusinessPotential: "₹0.21 Cr",
    farmerNetwork: "760 Farmers",
    source: "sfa",
    submittedAt: "2026-06-13",
  },
  {
    id: 10,
    firmName: "Sehore Krishi Bazaar",
    contactPersonName: "Sunita Chauhan",
    yearsInBusiness: 12,
    address: "Mandi Square, Plot 11",
    gender: "Female",
    phoneNumber: "9876502010",
    village: "Ashta",
    town: "Ashta",
    city: "Sehore",
    district: "Sehore",
    state: "Madhya Pradesh",
    pincode: "466116",
    companiesDealingIn: "Dhanuka, Bayer, Dharitri Sutra",
    latLong: "23.0173, 76.7247",
    annualTurnover: "₹1.22 Cr",
    annualBusinessPotential: "₹0.29 Cr",
    farmerNetwork: "1,110 Farmers",
    source: "sfa",
    submittedAt: "2026-06-14",
  },
  {
    id: 11,
    firmName: "Nalanda Agro House",
    contactPersonName: "Devendra Yadav",
    yearsInBusiness: 10,
    address: "Old Grain Market, Ward 5",
    gender: "Male",
    phoneNumber: "9876502011",
    village: "Hilsa",
    town: "Hilsa",
    city: "Nalanda",
    district: "Nalanda",
    state: "Bihar",
    pincode: "801302",
    companiesDealingIn: "IFFCO, UPL, PI Industries",
    latLong: "25.3167, 85.2833",
    annualTurnover: "₹0.78 Cr",
    annualBusinessPotential: "₹0.19 Cr",
    farmerNetwork: "690 Farmers",
    source: "sfa",
    submittedAt: "2026-06-13",
  },
  {
    id: 12,
    firmName: "Mandya Cane Services",
    contactPersonName: "Manjunath Gowda",
    yearsInBusiness: 15,
    address: "Sugar Mill Road, Gate 2",
    gender: "Male",
    phoneNumber: "9876502012",
    village: "Srirangapatna",
    town: "Srirangapatna",
    city: "Mandya",
    district: "Mandya",
    state: "Karnataka",
    pincode: "571438",
    companiesDealingIn: "Coromandel, Dharitri Sutra, Rallis",
    latLong: "12.4226, 76.6930",
    annualTurnover: "₹1.68 Cr",
    annualBusinessPotential: "₹0.36 Cr",
    farmerNetwork: "1,320 Farmers",
    source: "sfa",
    submittedAt: "2026-06-12",
  },
  {
    id: 13,
    firmName: "Kota Seed & Spice Point",
    contactPersonName: "Pooja Jat",
    yearsInBusiness: 7,
    address: "NH Junction Market, Shop 6",
    gender: "Female",
    phoneNumber: "9876502013",
    village: "Sultanpur",
    town: "Digod",
    city: "Kota",
    district: "Kota",
    state: "Rajasthan",
    pincode: "325204",
    companiesDealingIn: "Syngenta, Dharitri Sutra",
    latLong: "25.1032, 76.1647",
    annualTurnover: "₹0.66 Cr",
    annualBusinessPotential: "₹0.17 Cr",
    farmerNetwork: "540 Farmers",
    source: "sfa",
    submittedAt: "2026-06-11",
  },
  {
    id: 14,
    firmName: "Nagaon Input Depot",
    contactPersonName: "Ajay Boro",
    yearsInBusiness: 9,
    address: "College Road, Near Rice Yard",
    gender: "Male",
    phoneNumber: "9876502014",
    village: "Kampur",
    town: "Kampur",
    city: "Nagaon",
    district: "Nagaon",
    state: "Assam",
    pincode: "782426",
    companiesDealingIn: "Organic India, Dharitri Sutra, UPL",
    latLong: "26.3582, 92.6925",
    annualTurnover: "₹0.74 Cr",
    annualBusinessPotential: "₹0.18 Cr",
    farmerNetwork: "680 Farmers",
    source: "sfa",
    submittedAt: "2026-06-13",
  },
  {
    id: 15,
    firmName: "Nashik Crop Link",
    contactPersonName: "Rekha Pawar",
    yearsInBusiness: 11,
    address: "Onion Market Lane, Unit 14",
    gender: "Female",
    phoneNumber: "9876502015",
    village: "Niphad",
    town: "Niphad",
    city: "Nashik",
    district: "Nashik",
    state: "Maharashtra",
    pincode: "422303",
    companiesDealingIn: "Bayer, Rallis, Dharitri Sutra",
    latLong: "20.0837, 74.1078",
    annualTurnover: "₹1.14 Cr",
    annualBusinessPotential: "₹0.26 Cr",
    farmerNetwork: "940 Farmers",
    source: "sfa",
    submittedAt: "2026-06-14",
  },
  {
    id: 16,
    firmName: "Ladakh Agri Solutions",
    contactPersonName: "Tsering Namgyal",
    yearsInBusiness: 5,
    address: "Main Bazaar, Near Cooperative Bank",
    gender: "Male",
    phoneNumber: "9876502016",
    village: "Diskit",
    town: "Diskit",
    city: "Leh",
    district: "Leh",
    state: "Ladakh",
    pincode: "194401",
    companiesDealingIn: "Organic India, Dharitri Sutra",
    latLong: "34.5594, 77.5472",
    annualTurnover: "₹0.36 Cr",
    annualBusinessPotential: "₹0.11 Cr",
    farmerNetwork: "280 Farmers",
    source: "sfa",
    submittedAt: "2026-06-11",
  },
  {
    id: 17,
    firmName: "Parbhani Agri Network",
    contactPersonName: "Imran Sheikh",
    yearsInBusiness: 13,
    address: "Seed Market Road, Block C",
    gender: "Male",
    phoneNumber: "9876502017",
    village: "Parbhani Rural",
    town: "Parbhani",
    city: "Parbhani",
    district: "Parbhani",
    state: "Maharashtra",
    pincode: "431401",
    companiesDealingIn: "UPL, PI Industries, Dharitri Sutra",
    latLong: "19.2699, 76.7708",
    annualTurnover: "₹1.31 Cr",
    annualBusinessPotential: "₹0.33 Cr",
    farmerNetwork: "1,180 Farmers",
    source: "sfa",
    submittedAt: "2026-06-14",
  },
  {
    id: 18,
    firmName: "Baloda Bazar Agri Mart",
    contactPersonName: "Nirmala Sahu",
    yearsInBusiness: 10,
    address: "Mandi Frontage Road, Plot 3",
    gender: "Female",
    phoneNumber: "9876502018",
    village: "Bhatapara",
    town: "Bhatapara",
    city: "Baloda Bazar",
    district: "Baloda Bazar",
    state: "Chhattisgarh",
    pincode: "493118",
    companiesDealingIn: "Dharitri Sutra, Dhanuka, Coromandel",
    latLong: "21.7357, 81.9474",
    annualTurnover: "₹0.97 Cr",
    annualBusinessPotential: "₹0.23 Cr",
    farmerNetwork: "850 Farmers",
    source: "sfa",
    submittedAt: "2026-06-13",
  },
  {
    id: 19,
    firmName: "Kottayam Plantation Inputs",
    contactPersonName: "Joseph Mathew",
    yearsInBusiness: 18,
    address: "Rubber Board Road, Shop 22",
    gender: "Male",
    phoneNumber: "9876502019",
    village: "Pala",
    town: "Pala",
    city: "Kottayam",
    district: "Kottayam",
    state: "Kerala",
    pincode: "686575",
    companiesDealingIn: "BioStadt, Dharitri Sutra, Organic India",
    latLong: "9.7116, 76.6863",
    annualTurnover: "₹0.82 Cr",
    annualBusinessPotential: "₹0.20 Cr",
    farmerNetwork: "610 Farmers",
    source: "sfa",
    submittedAt: "2026-06-13",
  },
  {
    id: 20,
    firmName: "Mahisagar Farm Channel",
    contactPersonName: "Kavita Solanki",
    yearsInBusiness: 6,
    address: "Bus Stand Circle, Ward 2",
    gender: "Female",
    phoneNumber: "9876502020",
    village: "Santrampur",
    town: "Santrampur",
    city: "Mahisagar",
    district: "Mahisagar",
    state: "Gujarat",
    pincode: "389260",
    companiesDealingIn: "Dharitri Sutra, Crystal, IFFCO",
    latLong: "23.1911, 73.8916",
    annualTurnover: "₹0.63 Cr",
    annualBusinessPotential: "₹0.16 Cr",
    farmerNetwork: "520 Farmers",
    source: "sfa",
    submittedAt: "2026-06-11",
  },
];

export const DISTRIBUTORS_STORAGE_KEY = "database:distributors";
export const VIEW_DISTRIBUTOR_STORAGE_KEY = "distributor:view-id";

function normalizeDistributor(raw: Record<string, unknown>): Distributor {
  const { distributorCategory: _removed, ...rest } = raw;
  const base = rest as unknown as Distributor;
  const convertedCustomerId =
    raw.convertedCustomerId === undefined ? null : (raw.convertedCustomerId as number | null);

  let conversionStatus = raw.conversionStatus as DistributorConversionStatus | undefined;
  if (!conversionStatus) {
    if (convertedCustomerId) conversionStatus = "customer_completed";
    else conversionStatus = "not_converted";
  }

  return {
    ...base,
    source: (raw.source as DistributorSource) ?? "sfa",
    addressLine2: (raw.addressLine2 as string) ?? "",
    convertedCustomerId,
    conversionStatus,
  };
}

export function getConversionStatusLabel(status: DistributorConversionStatus): string {
  switch (status) {
    case "draft_customer":
      return "Draft Customer Created";
    case "customer_completed":
      return "Customer Completed";
    default:
      return "Not Converted";
  }
}

export function updateDistributorConversion(
  distributorId: number,
  customerId: number,
  status: DistributorConversionStatus,
) {
  const distributors = loadDistributors();
  const updated = distributors.map((distributor) =>
    distributor.id === distributorId
      ? {
          ...distributor,
          convertedCustomerId: customerId,
          conversionStatus: status,
        }
      : distributor,
  );
  saveDistributors(updated);
}

export function markDistributorConverted(distributorId: number, customerId: number) {
  updateDistributorConversion(distributorId, customerId, "customer_completed");
}

export function loadDistributors(): Distributor[] {
  if (typeof window === "undefined") {
    return SEED.map((distributor) => ({ ...distributor }));
  }

  try {
    const storedDistributors = window.localStorage.getItem(DISTRIBUTORS_STORAGE_KEY);
    if (!storedDistributors) {
      return SEED.map((distributor) => ({ ...distributor }));
    }

    const parsedDistributors = JSON.parse(storedDistributors);
    if (!Array.isArray(parsedDistributors) || parsedDistributors.length === 0) {
      return SEED.map((distributor) => ({ ...distributor }));
    }

    return parsedDistributors.map((item) =>
      normalizeDistributor(item as Record<string, unknown>),
    );
  } catch {
    return SEED.map((distributor) => ({ ...distributor }));
  }
}

export function getDistributorById(id: number): Distributor | undefined {
  return loadDistributors().find((distributor) => distributor.id === id);
}

export function saveDistributors(distributors: Distributor[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(DISTRIBUTORS_STORAGE_KEY, JSON.stringify(distributors));
}
