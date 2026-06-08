export type DemoMethod =
  | "Live Demo"
  | "Presentation"
  | "Video"
  | "Field Visit"
  | "Training Session";

export type PurchaseIntent =
  | "Immediate"
  | "Within Season"
  | "Future"
  | "Not Interested";

export type DemoAttendeeType = "Farmer" | "Distributor" | "Other";

export interface DemoAttendee {
  id: number;
  name: string;
  type: DemoAttendeeType;
  location: string;
}

export interface DistributorFeedback {
  distributorName: string;
  productInterestLevel: 1 | 2 | 3 | 4 | 5;
  orderPotential: number;
  comments: string;
}

export interface DemoRecord {
  id: number;
  demoCode: string;
  demoTopic: string;
  productCategory: string[];
  productsDemonstrated: string[];
  cropFocus: string[];
  demoObjective: string;
  demoMethod: DemoMethod;
  demonstratorName: string;
  demonstratorContact: string;
  totalFarmersInvited: number;
  totalFarmersAttended: number;
  totalDistributorsInvited: number;
  totalDistributorsAttended: number;
  otherAttendees: number;
  attendeeList: DemoAttendee[];
  interestedInProduct: boolean;
  feedbackRating: 1 | 2 | 3 | 4 | 5;
  feedbackComments: string;
  purchaseIntent: PurchaseIntent;
  followUpRequired: boolean;
  distributorFeedback: DistributorFeedback;
  leadsGenerated: number;
  sampleRequests: number;
  trialRequests: number;
  ordersReceived: number;
  followUpVisitsPlanned: number;
  eventSuccessRating: 1 | 2 | 3 | 4 | 5;
}

export const SEED: DemoRecord[] = [
  {
    id: 1,
    demoCode: "DEM-001",
    demoTopic: "Bio Insecticide Performance Demo",
    productCategory: ["Bio Solutions", "Crop Protection"],
    productsDemonstrated: ["BioShield X", "PestGuard Liquid"],
    cropFocus: ["Cotton", "Chilli"],
    demoObjective: "Show visible pest reduction and explain application timing for early-stage infestation control.",
    demoMethod: "Live Demo",
    demonstratorName: "Rajesh Kumar",
    demonstratorContact: "9876503101",
    totalFarmersInvited: 42,
    totalFarmersAttended: 36,
    totalDistributorsInvited: 6,
    totalDistributorsAttended: 4,
    otherAttendees: 3,
    attendeeList: [
      { id: 1, name: "Ramesh Patel", type: "Farmer", location: "Navapura" },
      { id: 2, name: "Suresh Kumar", type: "Farmer", location: "Kheralu" },
      { id: 3, name: "Anand Agro Traders", type: "Distributor", location: "Anand" },
      { id: 4, name: "Block Agriculture Officer", type: "Other", location: "Anand" },
    ],
    interestedInProduct: true,
    feedbackRating: 4,
    feedbackComments: "Farmers responded well to the visible comparison patch and asked for dosage charts.",
    purchaseIntent: "Within Season",
    followUpRequired: true,
    distributorFeedback: {
      distributorName: "Anand Agro Traders",
      productInterestLevel: 4,
      orderPotential: 18.5,
      comments: "Interested in bundling with existing cotton protection range.",
    },
    leadsGenerated: 14,
    sampleRequests: 9,
    trialRequests: 5,
    ordersReceived: 2.5,
    followUpVisitsPlanned: 7,
    eventSuccessRating: 4,
  },
  {
    id: 2,
    demoCode: "DEM-002",
    demoTopic: "Water Soluble Nutrition Field Session",
    productCategory: ["Plant Nutrition"],
    productsDemonstrated: ["NutriMax WS", "CalBoost Pro"],
    cropFocus: ["Paddy", "Vegetables"],
    demoObjective: "Position foliar nutrition program during stress stage and improve crop vigor understanding.",
    demoMethod: "Training Session",
    demonstratorName: "Neha Patel",
    demonstratorContact: "9876503102",
    totalFarmersInvited: 55,
    totalFarmersAttended: 47,
    totalDistributorsInvited: 5,
    totalDistributorsAttended: 5,
    otherAttendees: 2,
    attendeeList: [
      { id: 1, name: "Mahesh Singh", type: "Farmer", location: "Bhanpur" },
      { id: 2, name: "Haridas Patil", type: "Farmer", location: "Mohol" },
      { id: 3, name: "Raipur Krishi Seva", type: "Distributor", location: "Raipur" },
    ],
    interestedInProduct: true,
    feedbackRating: 5,
    feedbackComments: "Training deck and nutrient deficiency visuals were well received.",
    purchaseIntent: "Immediate",
    followUpRequired: true,
    distributorFeedback: {
      distributorName: "Raipur Krishi Seva",
      productInterestLevel: 5,
      orderPotential: 26,
      comments: "Ready to place immediate season-opening order.",
    },
    leadsGenerated: 19,
    sampleRequests: 12,
    trialRequests: 6,
    ordersReceived: 6,
    followUpVisitsPlanned: 8,
    eventSuccessRating: 5,
  },
  {
    id: 3,
    demoCode: "DEM-003",
    demoTopic: "Seed Treatment Product Presentation",
    productCategory: ["Seed Treatment"],
    productsDemonstrated: ["RootStart Treat"],
    cropFocus: ["Soybean", "Maize"],
    demoObjective: "Explain pre-sowing treatment benefits and distributor-led retail talking points.",
    demoMethod: "Presentation",
    demonstratorName: "Amit Sharma",
    demonstratorContact: "9876503103",
    totalFarmersInvited: 33,
    totalFarmersAttended: 25,
    totalDistributorsInvited: 8,
    totalDistributorsAttended: 6,
    otherAttendees: 1,
    attendeeList: [
      { id: 1, name: "Devendra Yadav", type: "Farmer", location: "Indore Rural" },
      { id: 2, name: "Kisan Inputs Hub", type: "Distributor", location: "Indore" },
    ],
    interestedInProduct: true,
    feedbackRating: 3,
    feedbackComments: "Need clearer germination comparison photos for retailer meetings.",
    purchaseIntent: "Future",
    followUpRequired: true,
    distributorFeedback: {
      distributorName: "Kisan Inputs Hub",
      productInterestLevel: 3,
      orderPotential: 9.5,
      comments: "Wants secondary retailer feedback before committing volume.",
    },
    leadsGenerated: 8,
    sampleRequests: 4,
    trialRequests: 3,
    ordersReceived: 1,
    followUpVisitsPlanned: 5,
    eventSuccessRating: 3,
  },
  {
    id: 4,
    demoCode: "DEM-004",
    demoTopic: "Fungicide Spray Comparison Visit",
    productCategory: ["Crop Protection", "Fungicide"],
    productsDemonstrated: ["ShieldPro SC", "FungiStop Gold"],
    cropFocus: ["Wheat"],
    demoObjective: "Compare disease suppression on untreated versus treated plots during mid-season pressure.",
    demoMethod: "Field Visit",
    demonstratorName: "Priya Singh",
    demonstratorContact: "9876503104",
    totalFarmersInvited: 28,
    totalFarmersAttended: 23,
    totalDistributorsInvited: 4,
    totalDistributorsAttended: 3,
    otherAttendees: 2,
    attendeeList: [
      { id: 1, name: "Suresh Kumar", type: "Farmer", location: "Kheralu" },
      { id: 2, name: "Mehsana Agri Center", type: "Distributor", location: "Mehsana" },
    ],
    interestedInProduct: true,
    feedbackRating: 4,
    feedbackComments: "Field comparison created strong recall; dosage repeat questions remain.",
    purchaseIntent: "Within Season",
    followUpRequired: true,
    distributorFeedback: {
      distributorName: "Mehsana Agri Center",
      productInterestLevel: 4,
      orderPotential: 14,
      comments: "Likely to convert after one more village-level activity.",
    },
    leadsGenerated: 11,
    sampleRequests: 6,
    trialRequests: 4,
    ordersReceived: 3,
    followUpVisitsPlanned: 4,
    eventSuccessRating: 4,
  },
  {
    id: 5,
    demoCode: "DEM-005",
    demoTopic: "Drip Fertigation Video Session",
    productCategory: ["Plant Nutrition", "Water Management"],
    productsDemonstrated: ["FertiFlow NPK", "RootActive"],
    cropFocus: ["Tomato", "Capsicum"],
    demoObjective: "Explain fertigation scheduling and compatibility in protected vegetable cultivation.",
    demoMethod: "Video",
    demonstratorName: "Sunil Patil",
    demonstratorContact: "9876503105",
    totalFarmersInvited: 38,
    totalFarmersAttended: 29,
    totalDistributorsInvited: 7,
    totalDistributorsAttended: 5,
    otherAttendees: 4,
    attendeeList: [
      { id: 1, name: "Pooja Jat", type: "Farmer", location: "Nashik" },
      { id: 2, name: "Greenline Agri Trade", type: "Distributor", location: "Nashik" },
    ],
    interestedInProduct: false,
    feedbackRating: 3,
    feedbackComments: "Useful session, but farmers asked for local language printed schedules.",
    purchaseIntent: "Not Interested",
    followUpRequired: false,
    distributorFeedback: {
      distributorName: "Greenline Agri Trade",
      productInterestLevel: 2,
      orderPotential: 4.5,
      comments: "Needs stronger grower pull before expanding inventory.",
    },
    leadsGenerated: 5,
    sampleRequests: 2,
    trialRequests: 1,
    ordersReceived: 0.5,
    followUpVisitsPlanned: 2,
    eventSuccessRating: 3,
  },
  {
    id: 6,
    demoCode: "DEM-006",
    demoTopic: "Herbicide Use Training Session",
    productCategory: ["Crop Protection", "Herbicide"],
    productsDemonstrated: ["CleanField Max"],
    cropFocus: ["Paddy"],
    demoObjective: "Train farmers and channel partners on safe application timing and tank-mix precautions.",
    demoMethod: "Training Session",
    demonstratorName: "Kavita Solanki",
    demonstratorContact: "9876503106",
    totalFarmersInvited: 61,
    totalFarmersAttended: 54,
    totalDistributorsInvited: 9,
    totalDistributorsAttended: 7,
    otherAttendees: 3,
    attendeeList: [
      { id: 1, name: "Lakshmi Reddy", type: "Farmer", location: "Karimnagar" },
      { id: 2, name: "Sri Sai Agro Depot", type: "Distributor", location: "Karimnagar" },
    ],
    interestedInProduct: true,
    feedbackRating: 5,
    feedbackComments: "Strong engagement and clear understanding of stage-specific application.",
    purchaseIntent: "Immediate",
    followUpRequired: true,
    distributorFeedback: {
      distributorName: "Sri Sai Agro Depot",
      productInterestLevel: 5,
      orderPotential: 22,
      comments: "Wants immediate retailer rollout after monsoon stock planning.",
    },
    leadsGenerated: 21,
    sampleRequests: 10,
    trialRequests: 7,
    ordersReceived: 7.5,
    followUpVisitsPlanned: 9,
    eventSuccessRating: 5,
  },
];

export const VIEW_DEMO_STORAGE_KEY = "events:demo:view-id";
