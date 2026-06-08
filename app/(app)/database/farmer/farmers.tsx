"use client";

import React, { useEffect, useMemo, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronsUpDown,
  Download,
  Edit2,
  Eye,
  ImageIcon,
  Leaf,
  MapPin,
  MoreVertical,
  Plus,
  Search,
  SlidersHorizontal,
  Store,
  Trash2,
  User,
  Wheat,
  X,
} from "lucide-react";

interface Farmer {
  id: number;
  name: string;
  fatherName: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  phoneNumber: string;
  village: string;
  town: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  farmlandSize: string;
  ownershipType: "Owned" | "Leased" | "Owned + Leased";
  currentCrop: string;
  cropRotation: string;
  cropEntries: Array<{
    type: string;
    category: string;
    produceCropName: string;
    landSize: string;
    ownershipType: "Owned" | "Leased";
    cropRotation: string;
  }>;
  chemicalBiologicalPercentage: string;
  brandProductUses: string;
  brandsRecall: string;
  currentProblem: string;
  majorDiseases: string;
  latLong: string;
}

const SEED: Farmer[] = [
  {
    id: 1,
    name: "Ramesh Patel",
    fatherName: "Mahendra Patel",
    age: 42,
    gender: "Male",
    phoneNumber: "9876501001",
    village: "Navapura",
    town: "Anand",
    city: "Anand",
    district: "Anand",
    state: "Gujarat",
    pincode: "388001",
    farmlandSize: "4.5 Acres",
    ownershipType: "Owned + Leased",
    currentCrop: "Cotton, Wheat",
    cropRotation: "Parcel based",
    cropEntries: [
      { type: "Cash Crop", category: "Fibre", produceCropName: "Cotton (Kapas)", landSize: "3.0 Acres", ownershipType: "Owned", cropRotation: "Cotton -> Wheat" },
      { type: "Cereal", category: "Rabi Cereal", produceCropName: "Wheat", landSize: "1.5 Acres", ownershipType: "Leased", cropRotation: "Wheat -> Fallow" },
    ],
    chemicalBiologicalPercentage: "Chemical 60% / Biological 40%",
    brandProductUses: "Dharitri Shield Insecticide",
    brandsRecall: "Shield, Crop Booster, Root Guard",
    currentProblem: "Whitefly infestation and uneven flowering",
    majorDiseases: "Whitefly, bollworm",
    latLong: "22.5645, 72.9289",
  },
  {
    id: 2,
    name: "Suresh Kumar",
    fatherName: "Ratan Kumar",
    age: 38,
    gender: "Male",
    phoneNumber: "9876501002",
    village: "Kheralu",
    town: "Kheralu",
    city: "Mehsana",
    district: "Mehsana",
    state: "Gujarat",
    pincode: "384325",
    farmlandSize: "2.0 Acres",
    ownershipType: "Leased",
    currentCrop: "Wheat, Cumin",
    cropRotation: "Parcel based",
    cropEntries: [
      { type: "Cereal", category: "Rabi Cereal", produceCropName: "Wheat", landSize: "1.25 Acres", ownershipType: "Leased", cropRotation: "Wheat -> Cumin" },
      { type: "Spice", category: "Seed Spice", produceCropName: "Cumin (Jeera)", landSize: "0.75 Acres", ownershipType: "Leased", cropRotation: "Cumin -> Fallow" },
    ],
    chemicalBiologicalPercentage: "Chemical 70% / Biological 30%",
    brandProductUses: "YieldMax Fungicide",
    brandsRecall: "YieldMax, Soil Plus",
    currentProblem: "Leaf yellowing and low grain weight",
    majorDiseases: "Rust, aphids",
    latLong: "23.8851, 72.6187",
  },
  {
    id: 3,
    name: "Mahesh Singh",
    fatherName: "Shivlal Singh",
    age: 46,
    gender: "Male",
    phoneNumber: "9876501003",
    village: "Bhanpur",
    town: "Raipur Rural",
    city: "Raipur",
    district: "Raipur",
    state: "Chhattisgarh",
    pincode: "492001",
    farmlandSize: "6.0 Acres",
    ownershipType: "Owned + Leased",
    currentCrop: "Paddy, Maize",
    cropRotation: "Parcel based",
    cropEntries: [
      { type: "Cereal", category: "Kharif Cereal", produceCropName: "Rice (Paddy)", landSize: "4.0 Acres", ownershipType: "Owned", cropRotation: "Paddy -> Maize" },
      { type: "Cereal", category: "Kharif Cereal", produceCropName: "Maize (Corn)", landSize: "2.0 Acres", ownershipType: "Leased", cropRotation: "Maize -> Fallow" },
    ],
    chemicalBiologicalPercentage: "Chemical 50% / Biological 50%",
    brandProductUses: "Paddy Care Herbicide",
    brandsRecall: "Paddy Care, BioRoot",
    currentProblem: "Weed pressure and poor water retention",
    majorDiseases: "Stem borer, blast",
    latLong: "21.2514, 81.6296",
  },
  {
    id: 4,
    name: "Prakash Rao",
    fatherName: "Narayana Rao",
    age: 35,
    gender: "Male",
    phoneNumber: "9876501004",
    village: "Tandur",
    town: "Tandur",
    city: "Vikarabad",
    district: "Vikarabad",
    state: "Telangana",
    pincode: "501141",
    farmlandSize: "3.5 Acres",
    ownershipType: "Leased",
    currentCrop: "Maize, Cotton",
    cropRotation: "Parcel based",
    cropEntries: [
      { type: "Cereal", category: "Kharif Cereal", produceCropName: "Maize (Corn)", landSize: "2.0 Acres", ownershipType: "Leased", cropRotation: "Maize -> Cotton" },
      { type: "Cash Crop", category: "Fibre", produceCropName: "Cotton (Kapas)", landSize: "1.5 Acres", ownershipType: "Leased", cropRotation: "Cotton -> Fallow" },
    ],
    chemicalBiologicalPercentage: "Chemical 65% / Biological 35%",
    brandProductUses: "Maize Guard Nutrient Mix",
    brandsRecall: "Maize Guard, Power Spray",
    currentProblem: "Stem weakness and patchy germination",
    majorDiseases: "Fall armyworm",
    latLong: "17.2473, 77.5767",
  },
  {
    id: 5,
    name: "Rajan Verma",
    fatherName: "Bhola Verma",
    age: 41,
    gender: "Male",
    phoneNumber: "9876501005",
    village: "Barwa",
    town: "Fatehpur",
    city: "Fatehpur",
    district: "Fatehpur",
    state: "Uttar Pradesh",
    pincode: "212601",
    farmlandSize: "1.5 Acres",
    ownershipType: "Owned",
    currentCrop: "Sugarcane, Wheat",
    cropRotation: "Parcel based",
    cropEntries: [
      { type: "Cash Crop", category: "Sugar", produceCropName: "Sugarcane", landSize: "1.0 Acre", ownershipType: "Owned", cropRotation: "Sugarcane -> Wheat" },
      { type: "Cereal", category: "Rabi Cereal", produceCropName: "Wheat", landSize: "0.5 Acre", ownershipType: "Owned", cropRotation: "Wheat -> Fallow" },
    ],
    chemicalBiologicalPercentage: "Chemical 75% / Biological 25%",
    brandProductUses: "Cane Boost Micronutrient",
    brandsRecall: "Cane Boost, GrowFast",
    currentProblem: "Low cane thickness and water stress",
    majorDiseases: "Red rot, termites",
    latLong: "25.9270, 80.8120",
  },
  {
    id: 6,
    name: "Haridas Patil",
    fatherName: "Ganesh Patil",
    age: 49,
    gender: "Male",
    phoneNumber: "9876501006",
    village: "Mohol",
    town: "Mohol",
    city: "Solapur",
    district: "Solapur",
    state: "Maharashtra",
    pincode: "413213",
    farmlandSize: "8.0 Acres",
    ownershipType: "Owned + Leased",
    currentCrop: "Soybean, Sorghum (Jowar)",
    cropRotation: "Parcel based",
    cropEntries: [
      { type: "Oil Seed", category: "Oil Seed", produceCropName: "Soybean", landSize: "5.5 Acres", ownershipType: "Owned", cropRotation: "Soybean -> Jowar" },
      { type: "Cereal", category: "Kharif Cereal", produceCropName: "Sorghum (Jowar)", landSize: "2.5 Acres", ownershipType: "Leased", cropRotation: "Jowar -> Fallow" },
    ],
    chemicalBiologicalPercentage: "Chemical 55% / Biological 45%",
    brandProductUses: "Soy Root Stimulator",
    brandsRecall: "Soy Root, LeafCare",
    currentProblem: "Pod drop during late growth stage",
    majorDiseases: "Yellow mosaic, girdle beetle",
    latLong: "17.8112, 75.6411",
  },
  {
    id: 7,
    name: "Gopal Nair",
    fatherName: "Krishnan Nair",
    age: 44,
    gender: "Male",
    phoneNumber: "9876501007",
    village: "Kuttanad",
    town: "Kuttanad",
    city: "Alappuzha",
    district: "Alappuzha",
    state: "Kerala",
    pincode: "688001",
    farmlandSize: "1.0 Acres",
    ownershipType: "Leased",
    currentCrop: "Paddy",
    cropRotation: "Paddy -> Fallow",
    cropEntries: [
      { type: "Cereal", category: "Kharif Cereal", produceCropName: "Rice (Paddy)", landSize: "1.0 Acre", ownershipType: "Leased", cropRotation: "Paddy -> Fallow" },
    ],
    chemicalBiologicalPercentage: "Chemical 40% / Biological 60%",
    brandProductUses: "Bio Paddy Shield",
    brandsRecall: "Bio Paddy Shield, Aqua Protect",
    currentProblem: "Waterlogging and nutrient loss",
    majorDiseases: "Leaf folder, sheath blight",
    latLong: "9.4981, 76.3388",
  },
  {
    id: 8,
    name: "Bharat Das",
    fatherName: "Raghunath Das",
    age: 39,
    gender: "Male",
    phoneNumber: "9876501008",
    village: "Srirampur",
    town: "Srirampur",
    city: "Murshidabad",
    district: "Murshidabad",
    state: "West Bengal",
    pincode: "742149",
    farmlandSize: "2.5 Acres",
    ownershipType: "Owned",
    currentCrop: "Jute, Rice (Paddy)",
    cropRotation: "Parcel based",
    cropEntries: [
      { type: "Cash Crop", category: "Fibre", produceCropName: "Jute", landSize: "1.5 Acres", ownershipType: "Owned", cropRotation: "Jute -> Paddy" },
      { type: "Cereal", category: "Kharif Cereal", produceCropName: "Rice (Paddy)", landSize: "1.0 Acre", ownershipType: "Owned", cropRotation: "Paddy -> Fallow" },
    ],
    chemicalBiologicalPercentage: "Chemical 58% / Biological 42%",
    brandProductUses: "Jute Pro Growth Mix",
    brandsRecall: "Jute Pro, GreenField Bio",
    currentProblem: "Slow stem growth and pest spots",
    majorDiseases: "Semilooper, stem rot",
    latLong: "24.1750, 88.2750",
  },
  {
    id: 9,
    name: "Lakshmi Reddy",
    fatherName: "Srinivas Reddy",
    age: 37,
    gender: "Female",
    phoneNumber: "9876501009",
    village: "Vempalli",
    town: "Vempalli",
    city: "Kadapa",
    district: "Kadapa",
    state: "Andhra Pradesh",
    pincode: "516329",
    farmlandSize: "3.0 Acres",
    ownershipType: "Owned + Leased",
    currentCrop: "Groundnut, Red Gram",
    cropRotation: "Parcel based",
    cropEntries: [
      { type: "Oil Seed", category: "Kharif Oil Seed", produceCropName: "Groundnut", landSize: "2.0 Acres", ownershipType: "Owned", cropRotation: "Groundnut -> Fallow" },
      { type: "Pulse", category: "Kharif Pulse", produceCropName: "Red Gram (Tur)", landSize: "1.0 Acre", ownershipType: "Leased", cropRotation: "Red Gram -> Sesame" },
    ],
    chemicalBiologicalPercentage: "Chemical 52% / Biological 48%",
    brandProductUses: "Groundnut Shield Spray",
    brandsRecall: "Groundnut Shield, BioRise",
    currentProblem: "Pod formation is weak in one parcel",
    majorDiseases: "Leaf miner, tikka disease",
    latLong: "14.3664, 78.6067",
  },
  {
    id: 10,
    name: "Sunita Chauhan",
    fatherName: "Mahipal Chauhan",
    age: 40,
    gender: "Female",
    phoneNumber: "9876501010",
    village: "Ashta",
    town: "Ashta",
    city: "Sehore",
    district: "Sehore",
    state: "Madhya Pradesh",
    pincode: "466116",
    farmlandSize: "5.0 Acres",
    ownershipType: "Owned",
    currentCrop: "Soybean, Chickpea",
    cropRotation: "Parcel based",
    cropEntries: [
      { type: "Oil Seed", category: "Kharif Oil Seed", produceCropName: "Soybean", landSize: "3.0 Acres", ownershipType: "Owned", cropRotation: "Soybean -> Chickpea" },
      { type: "Pulse", category: "Rabi Pulse", produceCropName: "Chickpea (Gram)", landSize: "2.0 Acres", ownershipType: "Owned", cropRotation: "Chickpea -> Fallow" },
    ],
    chemicalBiologicalPercentage: "Chemical 57% / Biological 43%",
    brandProductUses: "Pulse Root Activator",
    brandsRecall: "Pulse Root, SoyCare",
    currentProblem: "Yellowing observed after recent rain",
    majorDiseases: "Pod borer, collar rot",
    latLong: "23.0173, 76.7247",
  },
  {
    id: 11,
    name: "Devendra Yadav",
    fatherName: "Ramvilas Yadav",
    age: 45,
    gender: "Male",
    phoneNumber: "9876501011",
    village: "Hilsa",
    town: "Hilsa",
    city: "Nalanda",
    district: "Nalanda",
    state: "Bihar",
    pincode: "801302",
    farmlandSize: "4.0 Acres",
    ownershipType: "Leased",
    currentCrop: "Rice (Paddy), Mustard",
    cropRotation: "Parcel based",
    cropEntries: [
      { type: "Cereal", category: "Kharif Cereal", produceCropName: "Rice (Paddy)", landSize: "2.5 Acres", ownershipType: "Leased", cropRotation: "Paddy -> Mustard" },
      { type: "Oil Seed", category: "Rabi Oil Seed", produceCropName: "Mustard", landSize: "1.5 Acres", ownershipType: "Leased", cropRotation: "Mustard -> Fallow" },
    ],
    chemicalBiologicalPercentage: "Chemical 68% / Biological 32%",
    brandProductUses: "Mustard Yield Tonic",
    brandsRecall: "Yield Tonic, Paddy Gold",
    currentProblem: "Low tillering in the paddy parcel",
    majorDiseases: "Blast, aphids",
    latLong: "25.3167, 85.2833",
  },
  {
    id: 12,
    name: "Manjunath Gowda",
    fatherName: "Ranga Gowda",
    age: 43,
    gender: "Male",
    phoneNumber: "9876501012",
    village: "Srirangapatna",
    town: "Srirangapatna",
    city: "Mandya",
    district: "Mandya",
    state: "Karnataka",
    pincode: "571438",
    farmlandSize: "6.5 Acres",
    ownershipType: "Owned + Leased",
    currentCrop: "Sugarcane, Rice (Paddy)",
    cropRotation: "Parcel based",
    cropEntries: [
      { type: "Cash Crop", category: "Sugar", produceCropName: "Sugarcane", landSize: "4.0 Acres", ownershipType: "Owned", cropRotation: "Sugarcane -> Ratoon" },
      { type: "Cereal", category: "Kharif Cereal", produceCropName: "Rice (Paddy)", landSize: "2.5 Acres", ownershipType: "Leased", cropRotation: "Paddy -> Fallow" },
    ],
    chemicalBiologicalPercentage: "Chemical 61% / Biological 39%",
    brandProductUses: "Cane Energy Mix",
    brandsRecall: "Cane Energy, Paddy Prime",
    currentProblem: "Stalk thickness is uneven across plots",
    majorDiseases: "Red rot, stem borer",
    latLong: "12.4226, 76.6930",
  },
  {
    id: 13,
    name: "Pooja Jat",
    fatherName: "Bherulal Jat",
    age: 33,
    gender: "Female",
    phoneNumber: "9876501013",
    village: "Sultanpur",
    town: "Digod",
    city: "Kota",
    district: "Kota",
    state: "Rajasthan",
    pincode: "325204",
    farmlandSize: "2.8 Acres",
    ownershipType: "Leased",
    currentCrop: "Coriander, Wheat",
    cropRotation: "Parcel based",
    cropEntries: [
      { type: "Spice", category: "Seed Spice", produceCropName: "Coriander", landSize: "1.2 Acres", ownershipType: "Leased", cropRotation: "Coriander -> Fallow" },
      { type: "Cereal", category: "Rabi Cereal", produceCropName: "Wheat", landSize: "1.6 Acres", ownershipType: "Leased", cropRotation: "Wheat -> Coriander" },
    ],
    chemicalBiologicalPercentage: "Chemical 49% / Biological 51%",
    brandProductUses: "Spice Guard Fungicide",
    brandsRecall: "Spice Guard, Wheat Care",
    currentProblem: "Patchy growth in coriander rows",
    majorDiseases: "Powdery mildew, aphids",
    latLong: "25.1032, 76.1647",
  },
  {
    id: 14,
    name: "Ajay Boro",
    fatherName: "Dharam Boro",
    age: 39,
    gender: "Male",
    phoneNumber: "9876501014",
    village: "Kampur",
    town: "Kampur",
    city: "Nagaon",
    district: "Nagaon",
    state: "Assam",
    pincode: "782426",
    farmlandSize: "3.8 Acres",
    ownershipType: "Owned",
    currentCrop: "Rice (Paddy), Mustard",
    cropRotation: "Parcel based",
    cropEntries: [
      { type: "Cereal", category: "Kharif Cereal", produceCropName: "Rice (Paddy)", landSize: "2.5 Acres", ownershipType: "Owned", cropRotation: "Paddy -> Mustard" },
      { type: "Oil Seed", category: "Rabi Oil Seed", produceCropName: "Mustard", landSize: "1.3 Acres", ownershipType: "Owned", cropRotation: "Mustard -> Fallow" },
    ],
    chemicalBiologicalPercentage: "Chemical 46% / Biological 54%",
    brandProductUses: "Assam Paddy Bio Pack",
    brandsRecall: "Paddy Bio, Mustard Plus",
    currentProblem: "Flood impact on low-lying parcel",
    majorDiseases: "Blast, leaf folder",
    latLong: "26.3582, 92.6925",
  },
  {
    id: 15,
    name: "Rekha Pawar",
    fatherName: "Madhukar Pawar",
    age: 36,
    gender: "Female",
    phoneNumber: "9876501015",
    village: "Niphad",
    town: "Niphad",
    city: "Nashik",
    district: "Nashik",
    state: "Maharashtra",
    pincode: "422303",
    farmlandSize: "2.2 Acres",
    ownershipType: "Owned + Leased",
    currentCrop: "Onion, Millet (Bajra)",
    cropRotation: "Parcel based",
    cropEntries: [
      { type: "Vegetable", category: "Bulb Crop", produceCropName: "Onion", landSize: "1.2 Acres", ownershipType: "Owned", cropRotation: "Onion -> Bajra" },
      { type: "Cereal", category: "Kharif Cereal", produceCropName: "Millet (Bajra)", landSize: "1.0 Acre", ownershipType: "Leased", cropRotation: "Bajra -> Onion" },
    ],
    chemicalBiologicalPercentage: "Chemical 54% / Biological 46%",
    brandProductUses: "Bulb Strength Mix",
    brandsRecall: "Bulb Strength, RainSafe",
    currentProblem: "Neck rot symptoms in stored onions",
    majorDiseases: "Thrips, purple blotch",
    latLong: "20.0837, 74.1078",
  },
  {
    id: 16,
    name: "Tsering Namgyal",
    fatherName: "Dorje Namgyal",
    age: 41,
    gender: "Male",
    phoneNumber: "9876501016",
    village: "Diskit",
    town: "Diskit",
    city: "Leh",
    district: "Leh",
    state: "Ladakh",
    pincode: "194401",
    farmlandSize: "1.8 Acres",
    ownershipType: "Owned",
    currentCrop: "Barley, Pea",
    cropRotation: "Parcel based",
    cropEntries: [
      { type: "Cereal", category: "High Altitude Cereal", produceCropName: "Barley", landSize: "1.0 Acre", ownershipType: "Owned", cropRotation: "Barley -> Pea" },
      { type: "Pulse", category: "Vegetable Pulse", produceCropName: "Pea", landSize: "0.8 Acre", ownershipType: "Owned", cropRotation: "Pea -> Fallow" },
    ],
    chemicalBiologicalPercentage: "Chemical 28% / Biological 72%",
    brandProductUses: "Cold Climate Bio Mix",
    brandsRecall: "Cold Climate Bio, Root Warm",
    currentProblem: "Short growing window limits recovery",
    majorDiseases: "Rust, cutworm",
    latLong: "34.5594, 77.5472",
  },
  {
    id: 17,
    name: "Imran Sheikh",
    fatherName: "Yakub Sheikh",
    age: 34,
    gender: "Male",
    phoneNumber: "9876501017",
    village: "Parbhani Rural",
    town: "Parbhani",
    city: "Parbhani",
    district: "Parbhani",
    state: "Maharashtra",
    pincode: "431401",
    farmlandSize: "4.7 Acres",
    ownershipType: "Leased",
    currentCrop: "Cotton, Soybean",
    cropRotation: "Parcel based",
    cropEntries: [
      { type: "Cash Crop", category: "Fibre", produceCropName: "Cotton (Kapas)", landSize: "2.2 Acres", ownershipType: "Leased", cropRotation: "Cotton -> Soybean" },
      { type: "Oil Seed", category: "Kharif Oil Seed", produceCropName: "Soybean", landSize: "2.5 Acres", ownershipType: "Leased", cropRotation: "Soybean -> Fallow" },
    ],
    chemicalBiologicalPercentage: "Chemical 66% / Biological 34%",
    brandProductUses: "Boll Safe Protector",
    brandsRecall: "Boll Safe, Soy Boost",
    currentProblem: "Flower drop in the cotton section",
    majorDiseases: "Bollworm, yellow mosaic",
    latLong: "19.2699, 76.7708",
  },
  {
    id: 18,
    name: "Nirmala Sahu",
    fatherName: "Raghu Sahu",
    age: 47,
    gender: "Female",
    phoneNumber: "9876501018",
    village: "Bhatapara",
    town: "Bhatapara",
    city: "Baloda Bazar",
    district: "Baloda Bazar",
    state: "Chhattisgarh",
    pincode: "493118",
    farmlandSize: "5.5 Acres",
    ownershipType: "Owned + Leased",
    currentCrop: "Rice (Paddy), Black Gram",
    cropRotation: "Parcel based",
    cropEntries: [
      { type: "Cereal", category: "Kharif Cereal", produceCropName: "Rice (Paddy)", landSize: "3.5 Acres", ownershipType: "Owned", cropRotation: "Paddy -> Black Gram" },
      { type: "Pulse", category: "Rabi Pulse", produceCropName: "Black Gram (Urad)", landSize: "2.0 Acres", ownershipType: "Leased", cropRotation: "Urad -> Fallow" },
    ],
    chemicalBiologicalPercentage: "Chemical 51% / Biological 49%",
    brandProductUses: "Paddy Balance Pack",
    brandsRecall: "Paddy Balance, Pulse Guard",
    currentProblem: "Uneven water distribution across fields",
    majorDiseases: "Bacterial leaf blight, pod borer",
    latLong: "21.7357, 81.9474",
  },
  {
    id: 19,
    name: "Joseph Mathew",
    fatherName: "Mathew Joseph",
    age: 52,
    gender: "Male",
    phoneNumber: "9876501019",
    village: "Pala",
    town: "Pala",
    city: "Kottayam",
    district: "Kottayam",
    state: "Kerala",
    pincode: "686575",
    farmlandSize: "2.9 Acres",
    ownershipType: "Owned",
    currentCrop: "Rubber, Banana",
    cropRotation: "Parcel based",
    cropEntries: [
      { type: "Plantation", category: "Commercial Plantation", produceCropName: "Rubber", landSize: "2.0 Acres", ownershipType: "Owned", cropRotation: "Rubber -> Rubber" },
      { type: "Fruit", category: "Tropical Fruit", produceCropName: "Banana", landSize: "0.9 Acre", ownershipType: "Owned", cropRotation: "Banana -> Fallow" },
    ],
    chemicalBiologicalPercentage: "Chemical 38% / Biological 62%",
    brandProductUses: "Plantation Care Kit",
    brandsRecall: "Plantation Care, Banana Lift",
    currentProblem: "Moisture stress in the banana patch",
    majorDiseases: "Sigatoka, stem weevil",
    latLong: "9.7116, 76.6863",
  },
  {
    id: 20,
    name: "Kavita Solanki",
    fatherName: "Bhupendra Solanki",
    age: 31,
    gender: "Female",
    phoneNumber: "9876501020",
    village: "Santrampur",
    town: "Santrampur",
    city: "Mahisagar",
    district: "Mahisagar",
    state: "Gujarat",
    pincode: "389260",
    farmlandSize: "3.4 Acres",
    ownershipType: "Owned + Leased",
    currentCrop: "Maize (Corn), Castor",
    cropRotation: "Parcel based",
    cropEntries: [
      { type: "Cereal", category: "Kharif Cereal", produceCropName: "Maize (Corn)", landSize: "2.0 Acres", ownershipType: "Owned", cropRotation: "Maize -> Castor" },
      { type: "Oil Seed", category: "Industrial Oil Seed", produceCropName: "Castor", landSize: "1.4 Acres", ownershipType: "Leased", cropRotation: "Castor -> Fallow" },
    ],
    chemicalBiologicalPercentage: "Chemical 59% / Biological 41%",
    brandProductUses: "Corn Vital Spray",
    brandsRecall: "Corn Vital, Castor Shield",
    currentProblem: "Low cob fill in the upland parcel",
    majorDiseases: "Fall armyworm, wilt",
    latLong: "23.1911, 73.8916",
  },
];

type SortKey =
  | "name"
  | "phoneNumber"
  | "village"
  | "district"
  | "state"
  | "currentCrop"
  | "farmlandSize"
  | "ownershipType";

function parseAreaValue(value: string) {
  const numericValue = Number.parseFloat(value.replace(/[^\d.]/g, ""));
  return Number.isNaN(numericValue) ? 0 : numericValue;
}

function formatAreaNumber(value: number) {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(2).replace(/\.?0+$/, "");
}

function getOwnedLeasedSummary(farmer: Farmer) {
  const ownedArea = farmer.cropEntries
    .filter((entry) => entry.ownershipType === "Owned")
    .reduce((sum, entry) => sum + parseAreaValue(entry.landSize), 0);
  const leasedArea = farmer.cropEntries
    .filter((entry) => entry.ownershipType === "Leased")
    .reduce((sum, entry) => sum + parseAreaValue(entry.landSize), 0);

  const parts: string[] = [];

  if (ownedArea > 0) {
    parts.push(`${formatAreaNumber(ownedArea)} Owned`);
  }

  if (leasedArea > 0) {
    parts.push(`${formatAreaNumber(leasedArea)} Leased`);
  }

  return parts.join(" + ") || farmer.ownershipType;
}

function SortTh({
  label,
  col,
  sortKey,
  sortDir,
  onSort,
}: {
  label: string;
  col: SortKey;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onSort: (col: SortKey) => void;
}) {
  const active = sortKey === col;

  return (
    <th
      onClick={() => onSort(col)}
      className={cn(
        "px-4 py-3 text-left text-xs font-semibold cursor-pointer select-none group whitespace-nowrap",
        active && "bg-brand-50/60",
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className={active ? "text-brand-700" : "text-foreground"}>{label}</span>
        {active ? (
          <ChevronDown
            className={cn(
              "w-3 h-3 text-brand-600 transition-transform",
              sortDir === "desc" && "rotate-180",
            )}
          />
        ) : (
          <ChevronsUpDown className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
        )}
      </div>
    </th>
  );
}

function SectionBlock({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-5 space-y-4">
      <div className="flex items-center gap-2.5 pb-3 border-b border-border">
        <div className="w-7 h-7 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
          <Icon className="w-3.5 h-3.5 text-brand-600" />
        </div>
        <div>
          <p className="text-xs font-semibold text-foreground">{title}</p>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function ReadOnlyField({
  label,
  value,
  mono = false,
  multiline = false,
  className,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  multiline?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <p className="text-xs font-medium text-foreground">{label}</p>
      <div
        className={cn(
          "min-h-9 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground",
          multiline ? "flex items-start leading-5" : "flex items-center",
          mono && "font-mono text-xs font-semibold text-brand-700",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function FarmerPhoto({ farmer }: { farmer: Farmer }) {
  const initials = farmer.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-foreground">Farmer Photo</p>
      <div className="h-[156px] rounded-xl border border-border bg-brand-50/70 flex flex-col items-center justify-center gap-2">
        <div className="w-16 h-16 rounded-full bg-brand-600 text-white flex items-center justify-center text-lg font-bold shadow-sm">
          {initials}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-brand-700">
          <ImageIcon className="w-3.5 h-3.5" />
          Farmer Photo
        </div>
      </div>
    </div>
  );
}

function FarmerViewDialog({
  farmer,
  onClose,
  onPrevious,
  onNext,
  canPrevious,
  canNext,
}: {
  farmer: Farmer | null;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  canPrevious: boolean;
  canNext: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"farmer-details" | "crop-land" | "product">("farmer-details");

  useEffect(() => {
    if (farmer) {
      setActiveTab("farmer-details");
    }
  }, [farmer?.id]);

  const canNavigateRecords = activeTab === "farmer-details";

  return (
    <Dialog open={!!farmer} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-x-0 bottom-0 top-[104px] z-[300] bg-black/40" />
        <DialogPrimitive.Content className="fixed inset-x-0 bottom-0 top-[104px] z-[300] flex w-screen flex-col overflow-hidden bg-muted outline-none">
          {farmer && (
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "farmer-details" | "crop-land" | "product")} className="flex flex-1 min-h-0 flex-col overflow-hidden">
              <div className="flex-shrink-0 px-6 pt-5 pb-3">
                <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
                  <div className="relative border-b border-border px-5 py-3">
                    <DialogHeader className={cn("space-y-0.5", canNavigateRecords ? "pr-32" : "pr-10")}>
                      <DialogTitle className="text-sm font-semibold text-foreground">Farmer Details</DialogTitle>
                      {/* <DialogDescription className="text-[11px] text-muted-foreground">
                        View-only farmer profile, land, and product usage details
                      </DialogDescription> */}
                    </DialogHeader>
                    <div className="absolute right-4 top-1/2 z-10 flex -translate-y-1/2 items-center gap-1.5">
                      {canNavigateRecords && (
                        <>
                          <button
                            type="button"
                            onClick={onPrevious}
                            disabled={!canPrevious}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-white text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="Previous farmer"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={onNext}
                            disabled={!canNext}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-white text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="Next farmer"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      <DialogPrimitive.Close className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-white text-muted-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                        <X className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                      </DialogPrimitive.Close>
                    </div>
                  </div>

                  <div className="px-4 py-2.5">
                    <TabsList className="h-9 rounded-lg bg-muted/70 p-1">
                      <TabsTrigger value="farmer-details" className="h-7 gap-1.5 px-3 text-xs">
                        <User className="w-3.5 h-3.5" />
                        Farmer Details
                      </TabsTrigger>
                      <TabsTrigger value="crop-land" className="h-7 gap-1.5 px-3 text-xs">
                        <Leaf className="w-3.5 h-3.5" />
                        Crop and Land Details
                      </TabsTrigger>
                      <TabsTrigger value="product" className="h-7 gap-1.5 px-3 text-xs">
                        <Store className="w-3.5 h-3.5" />
                        Product Details
                      </TabsTrigger>
                    </TabsList>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 pb-5">
                <TabsContent value="farmer-details" className="m-0 space-y-4">
                  <SectionBlock icon={User} title="Farmer Basic Details" subtitle="Identity, family, contact, and demographics">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                      <div className="lg:row-span-2">
                        <FarmerPhoto farmer={farmer} />
                      </div>
                      <ReadOnlyField label="Farmer Name" value={farmer.name} />
                      <ReadOnlyField label="Farmer Father's Name" value={farmer.fatherName} />
                      <ReadOnlyField label="Age" value={farmer.age} />
                      <ReadOnlyField label="Gender" value={farmer.gender} />
                      <ReadOnlyField label="Phone Number" value={farmer.phoneNumber} mono />
                    </div>
                  </SectionBlock>

                  <SectionBlock icon={MapPin} title="Address & Geography Details" subtitle="Village, location, and farm coordinates">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <ReadOnlyField label="Village" value={farmer.village} />
                      <ReadOnlyField label="Town" value={farmer.town} />
                      <ReadOnlyField label="City" value={farmer.city} />
                      <ReadOnlyField label="District" value={farmer.district} />
                      <ReadOnlyField label="State" value={farmer.state} />
                      <ReadOnlyField label="Pincode" value={farmer.pincode} mono />
                      <ReadOnlyField label="Lat-long" value={farmer.latLong} mono />
                    </div>
                  </SectionBlock>
                </TabsContent>

                <TabsContent value="crop-land" className="m-0 space-y-4">
                  <SectionBlock icon={Leaf} title="Crop & Land Details" subtitle="Landholding and cultivation information">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <ReadOnlyField label="Total Size of Farmland" value={farmer.farmlandSize} />
                      <ReadOnlyField label="Owned / Leased Summary" value={getOwnedLeasedSummary(farmer)} />
                      <ReadOnlyField label="Current Crop Grown Summary" value={farmer.currentCrop} className="lg:col-span-2" />
                    </div>

                    <div className="pt-2 space-y-3">
                      <div>
                        <p className="text-xs font-semibold text-foreground">Crop Portfolio</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Multiple crop records linked to this farmer
                        </p>
                      </div>

                      <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="bg-muted/40 border-b border-border">
                                <th className="px-4 py-3 text-left text-xs font-semibold text-foreground whitespace-nowrap">Type</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-foreground whitespace-nowrap">Category</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-foreground whitespace-nowrap">Produce / Crop Name</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-foreground whitespace-nowrap">Land Size</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-foreground whitespace-nowrap">Owned / Leased</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-foreground whitespace-nowrap">Crop Rotation</th>
                              </tr>
                            </thead>
                            <tbody>
                              {farmer.cropEntries.map((entry, index) => (
                                <tr key={`${entry.produceCropName}-${index}`} className="border-b border-border/60 last:border-b-0">
                                  <td className="px-4 py-2 text-xs text-foreground whitespace-nowrap">{entry.type}</td>
                                  <td className="px-4 py-2 text-xs text-foreground whitespace-nowrap">{entry.category}</td>
                                  <td className="px-4 py-2 text-xs text-foreground whitespace-nowrap">{entry.produceCropName}</td>
                                  <td className="px-4 py-2 text-xs text-foreground whitespace-nowrap">{entry.landSize}</td>
                                  <td className="px-4 py-2 text-xs text-foreground whitespace-nowrap">{entry.ownershipType}</td>
                                  <td className="px-4 py-2 text-xs text-foreground whitespace-nowrap">{entry.cropRotation}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </SectionBlock>
                </TabsContent>

                <TabsContent value="product" className="m-0 space-y-4">
                  <SectionBlock icon={Store} title="Product Details" subtitle="Usage patterns, brand recall, and field issues">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <ReadOnlyField
                        label="Chemical / Biological / Percentage"
                        value={farmer.chemicalBiologicalPercentage}
                        multiline
                        className="lg:col-span-2"
                      />
                      <ReadOnlyField
                        label="Which Brand Product He Uses"
                        value={farmer.brandProductUses}
                        multiline
                      />
                      <ReadOnlyField
                        label="Brands and Product He Recall"
                        value={farmer.brandsRecall}
                        multiline
                      />
                      <ReadOnlyField
                        label="Currently Struggling With Which Problem"
                        value={farmer.currentProblem}
                        multiline
                        className="lg:col-span-2"
                      />
                      <ReadOnlyField
                        label="Major Diseases / Pest Encountered in His Farm"
                        value={farmer.majorDiseases}
                        multiline
                        className="lg:col-span-2"
                      />
                    </div>
                  </SectionBlock>
                </TabsContent>
              </div>
            </Tabs>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </Dialog>
  );
}

const PER_PAGE = 10;
const VIEW_FARMER_STORAGE_KEY = "farmer:view-id";

export default function FarmerRegistrationPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [farmers] = useState<Farmer[]>(SEED);
  const [search, setSearch] = useState("");
  const [filterState, setFilterState] = useState<string[]>([]);
  const [filterCrop, setFilterCrop] = useState<string[]>([]);
  const [filterOwnership, setFilterOwnership] = useState<Farmer["ownershipType"][]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [viewFarmer, setViewFarmer] = useState<Farmer | null>(null);

  useEffect(() => {
    if (pathname !== "/database/farmer/view") {
      setViewFarmer(null);
      return;
    }

    let selectedFarmer: Farmer | undefined;
    if (typeof window !== "undefined") {
      const selectedId = window.sessionStorage.getItem(VIEW_FARMER_STORAGE_KEY);
      selectedFarmer = farmers.find((farmer) => String(farmer.id) === selectedId);
    }

    setViewFarmer(selectedFarmer ?? farmers[0] ?? null);
  }, [farmers, pathname]);

  const states = useMemo(() => [...new Set(farmers.map((farmer) => farmer.state))], [farmers]);
  const crops = useMemo(
    () => [...new Set(farmers.flatMap((farmer) => farmer.cropEntries.map((entry) => entry.produceCropName)))],
    [farmers],
  );

  const stats = useMemo(() => ({
    total: farmers.length,
    owned: farmers.filter((farmer) => farmer.cropEntries.some((entry) => entry.ownershipType === "Owned")).length,
    leased: farmers.filter((farmer) => farmer.cropEntries.some((entry) => entry.ownershipType === "Leased")).length,
  }), [farmers]);

  const filtered = useMemo(() => {
    let result = farmers.filter((farmer) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchSearch = [
          farmer.name,
          farmer.fatherName,
          farmer.phoneNumber,
          farmer.village,
          farmer.town,
          farmer.city,
          farmer.district,
          farmer.state,
          farmer.currentCrop,
          ...farmer.cropEntries.map((entry) => entry.produceCropName),
        ].some((field) => field.toLowerCase().includes(q));
        if (!matchSearch) return false;
      }

      if (filterState.length > 0 && !filterState.includes(farmer.state)) return false;
      if (filterCrop.length > 0 && !farmer.cropEntries.some((entry) => filterCrop.includes(entry.produceCropName))) return false;
      if (filterOwnership.length > 0 && !farmer.cropEntries.some((entry) => filterOwnership.includes(entry.ownershipType))) return false;

      return true;
    });

    result.sort((a, b) => {
      const aVal = String(a[sortKey] ?? "").toLowerCase();
      const bVal = String(b[sortKey] ?? "").toLowerCase();
      const comparison = aVal.localeCompare(bVal);
      return sortDir === "asc" ? comparison : -comparison;
    });

    return result;
  }, [farmers, search, filterState, filterCrop, filterOwnership, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const start = (page - 1) * PER_PAGE;
  const visibleFarmers = filtered.slice(start, start + PER_PAGE);
  const hasActiveFilters = search.trim() !== "" || filterState.length > 0 || filterCrop.length > 0 || filterOwnership.length > 0;
  const viewFarmerRecords = useMemo(() => {
    if (!viewFarmer) return filtered;
    return filtered.some((farmer) => farmer.id === viewFarmer.id) ? filtered : farmers;
  }, [filtered, farmers, viewFarmer]);
  const currentViewFarmerIndex = viewFarmer
    ? viewFarmerRecords.findIndex((farmer) => farmer.id === viewFarmer.id)
    : -1;

  const handleSort = (col: SortKey) => {
    if (sortKey === col) {
      setSortDir((current) => current === "asc" ? "desc" : "asc");
    } else {
      setSortKey(col);
      setSortDir("asc");
    }
  };

  const toggleStringFilter = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    current: string[],
  ) => {
    setter(current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
    setPage(1);
  };

  const toggleOwnershipFilter = (value: Farmer["ownershipType"]) => {
    setFilterOwnership((current) => (
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    ));
    setPage(1);
  };

  const clearAllFilters = () => {
    setSearch("");
    setFilterState([]);
    setFilterCrop([]);
    setFilterOwnership([]);
    setPage(1);
  };

  const handleViewFarmer = (farmer: Farmer) => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(VIEW_FARMER_STORAGE_KEY, String(farmer.id));
    }
    setViewFarmer(farmer);
    router.push("/database/farmer/view");
  };

  const handleStepViewFarmer = (direction: -1 | 1) => {
    if (currentViewFarmerIndex < 0) return;

    const nextFarmer = viewFarmerRecords[currentViewFarmerIndex + direction];
    if (!nextFarmer) return;

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(VIEW_FARMER_STORAGE_KEY, String(nextFarmer.id));
    }
    setViewFarmer(nextFarmer);
    router.push("/database/farmer/view");
  };

  const handleCloseView = () => {
    setViewFarmer(null);
    if (pathname === "/database/farmer/view") {
      router.push("/database/farmer");
    }
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Farmer Listing</h1>
            {/* <p className="text-xs text-muted-foreground mt-0.5">Register and manage farmer profiles</p> */}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
            {/* <Button size="sm" className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white">
              <Plus className="w-3.5 h-3.5" /> Register Farmer
            </Button> */}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-border p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center flex-shrink-0">
              <Wheat className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-base font-bold text-foreground leading-none">{stats.total}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Total Farmers</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-border p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-base font-bold text-foreground leading-none">{stats.owned}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Owned</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-border p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-base font-bold text-foreground leading-none">{stats.leased}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Leased</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 rounded-xl border border-border bg-white">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by farmer name, phone number, village, district, or crop..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              className="flex-1 border-0 h-8 text-sm bg-transparent focus-visible:ring-0 placeholder:text-muted-foreground"
            />

            <Popover>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    "h-8 px-2.5 text-xs border rounded-lg inline-flex items-center gap-1.5 font-medium transition-colors",
                    hasActiveFilters
                      ? "border-brand-400 bg-brand-50 text-brand-700"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Filter
                  {hasActiveFilters && (
                    <span className="w-4 h-4 text-[10px] bg-brand-600 text-white rounded-full inline-flex items-center justify-center font-bold">
                      {filterState.length + filterCrop.length + filterOwnership.length}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-56 p-0">
                <div className="space-y-3 p-3">
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-2">State</p>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {states.map((state) => (
                        <label key={state} className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded accent-brand-600"
                            checked={filterState.includes(state)}
                            onChange={() => toggleStringFilter(state, setFilterState, filterState)}
                          />
                          <span className="text-xs text-foreground">{state}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-border pt-3">
                    <p className="text-xs font-semibold text-foreground mb-2">Current Crop</p>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {crops.map((crop) => (
                        <label key={crop} className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded accent-brand-600"
                            checked={filterCrop.includes(crop)}
                            onChange={() => toggleStringFilter(crop, setFilterCrop, filterCrop)}
                          />
                          <span className="text-xs text-foreground">{crop}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-border pt-3">
                    <p className="text-xs font-semibold text-foreground mb-2">Owned / Leased</p>
                    <div className="space-y-1.5">
                      {(["Owned", "Leased"] as Farmer["ownershipType"][]).map((ownershipType) => (
                        <label key={ownershipType} className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded accent-brand-600"
                            checked={filterOwnership.includes(ownershipType)}
                            onChange={() => toggleOwnershipFilter(ownershipType)}
                          />
                          <span className="text-xs text-foreground">{ownershipType}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {hasActiveFilters && (
                    <div className="border-t border-border pt-2">
                      <button
                        onClick={clearAllFilters}
                        className="text-xs text-brand-600 hover:underline font-medium"
                      >
                        Clear all filters
                      </button>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {hasActiveFilters && (
            <div className="flex items-center flex-wrap gap-2">
              {search && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium">
                  {search}
                  <button onClick={() => { setSearch(""); setPage(1); }}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filterState.map((state) => (
                <span key={`state-${state}`} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium">
                  {state}
                  <button onClick={() => setFilterState(filterState.filter((item) => item !== state))}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {filterCrop.map((crop) => (
                <span key={`crop-${crop}`} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium">
                  {crop}
                  <button onClick={() => setFilterCrop(filterCrop.filter((item) => item !== crop))}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {filterOwnership.map((ownershipType) => (
                <span key={`ownership-${ownershipType}`} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium">
                  {ownershipType}
                  <button onClick={() => setFilterOwnership(filterOwnership.filter((item) => item !== ownershipType))}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <SortTh label="Farmer Name" col="name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Phone Number" col="phoneNumber" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Village" col="village" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="District" col="district" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="State" col="state" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Current Crop Grown" col="currentCrop" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Size of Farmland" col="farmlandSize" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Owned / Leased" col="ownershipType" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-foreground whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleFarmers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <Wheat className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-foreground">No farmers match your filters</p>
                        <p className="text-xs text-muted-foreground">Try adjusting your search or filters</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  visibleFarmers.map((farmer) => (
                    <tr key={farmer.id} className="border-b border-border/60 hover:bg-muted/20 transition-colors group">
                      <td className="px-4 py-2 text-xs font-semibold text-foreground whitespace-nowrap">{farmer.name}</td>
                      <td className="px-4 py-2 text-xs text-foreground whitespace-nowrap">{farmer.phoneNumber}</td>
                      <td className="px-4 py-2 text-xs text-foreground whitespace-nowrap">{farmer.village}</td>
                      <td className="px-4 py-2 text-xs text-foreground whitespace-nowrap">{farmer.district}</td>
                      <td className="px-4 py-2 text-xs text-foreground whitespace-nowrap">{farmer.state}</td>
                      <td className="px-4 py-2 text-xs text-foreground max-w-[180px] truncate">{farmer.currentCrop}</td>
                      <td className="px-4 py-2 text-xs text-foreground whitespace-nowrap">{farmer.farmlandSize}</td>
                      <td className="px-4 py-2 text-xs text-foreground whitespace-nowrap">{farmer.ownershipType}</td>
                      <td className="px-4 py-2 text-xs whitespace-nowrap">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1.5 hover:bg-muted rounded-md transition-colors">
                              <MoreVertical className="w-4 h-4 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-widest py-1">
                              Actions
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <button
                              className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted rounded-sm transition-colors"
                              onClick={() => handleViewFarmer(farmer)}
                            >
                              <Eye className="w-3.5 h-3.5" /> View
                            </button>
                            <button className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted rounded-sm transition-colors">
                              <Edit2 className="w-3.5 h-3.5" /> Edit
                            </button>
                            <DropdownMenuSeparator />
                            <button className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted rounded-sm transition-colors">
                              <MapPin className="w-3.5 h-3.5" /> Map Distributor
                            </button>
                            <DropdownMenuSeparator />
                            <button className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-sm transition-colors">
                              <Trash2 className="w-3.5 h-3.5" /> Archive
                            </button>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
            <p className="text-[11px] text-muted-foreground">
              Showing <span className="font-medium text-foreground">{Math.min(start + PER_PAGE, filtered.length)}</span> of{" "}
              <span className="font-medium text-foreground">{filtered.length}</span> records
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs"
                disabled={page === 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs"
                disabled={page === totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>

      <FarmerViewDialog
        farmer={viewFarmer}
        onClose={handleCloseView}
        onPrevious={() => handleStepViewFarmer(-1)}
        onNext={() => handleStepViewFarmer(1)}
        canPrevious={currentViewFarmerIndex > 0}
        canNext={currentViewFarmerIndex >= 0 && currentViewFarmerIndex < viewFarmerRecords.length - 1}
      />
    </AppLayout>
  );
}
