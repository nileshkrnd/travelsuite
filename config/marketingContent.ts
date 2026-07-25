export type ApiProductId = "gds" | "ndc" | "lcc" | "thirdParty" | "hotelMapping";

export interface ApiProduct {
  id: ApiProductId;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  href: string;
  icon: string;
  highlights: string[];
}

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readMins: number;
  author: string;
}

export interface Partner {
  id: string;
  name: string;
  category: string;
  region: string;
  blurb: string;
}

export const API_PRODUCTS: ApiProduct[] = [
  {
    id: "gds",
    name: "GDS Connectivity",
    shortName: "GDS",
    tagline: "Legacy distribution, modern orchestration",
    description:
      "Connect Amadeus, Sabre, and Travelport content into Klyra booking flows with normalized shopping, pricing, and ticketing events.",
    href: "/api/gds",
    icon: "Network",
    highlights: ["Multi-GDS shopping", "PNR sync", "Ticketing events", "Fare rules mapping"],
  },
  {
    id: "ndc",
    name: "NDC Connectivity",
    shortName: "NDC",
    tagline: "Airline offers the way carriers intend",
    description:
      "NDC offer/order management for richer ancillaries, branded fares, and continuous pricing — side by side with GDS in one desk.",
    href: "/api/ndc",
    icon: "Plane",
    highlights: ["Offer & Order", "Ancillaries", "Branded fares", "Airline direct"],
  },
  {
    id: "lcc",
    name: "LCC Connectivity",
    shortName: "LCC",
    tagline: "Low-cost carriers without the chaos",
    description:
      "Integrate LCC content and booking rules with clear seat/baggage ancillaries and hold/confirm patterns suited to low-cost inventory.",
    href: "/api/lcc",
    icon: "Ticket",
    highlights: ["LCC shopping", "Ancillaries", "Hold & ticket", "Route coverage"],
  },
  {
    id: "thirdParty",
    name: "Third-Party API Integration",
    shortName: "3P APIs",
    tagline: "Hotels, cars, transfers, insurance — one contract layer",
    description:
      "Plug in hotel, car, transfer, activities, and insurance suppliers behind a single Klyra integration contract with retries and observability.",
    href: "/api/third-party",
    icon: "Layers",
    highlights: ["Supplier adapters", "Unified errors", "Retry & circuit break", "Usage metering"],
  },
  {
    id: "hotelMapping",
    name: "Hotel Mapping",
    shortName: "Hotel Map",
    tagline: "One property identity across every supplier",
    description:
      "Match and merge hotel content across channels so your OTA and agency desks stop selling the same hotel under five codes.",
    href: "/api/hotel-mapping",
    icon: "MapPinned",
    highlights: ["Fuzzy match", "Content merge", "Geo validation", "Duplicate cleanup"],
  },
];

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "why-modular-travel-erp-wins",
    title: "Why modular travel ERP wins over all-in-one monoliths",
    excerpt:
      "Holdings rarely need every module on day one. Here’s how subscription packaging cuts cost without blocking growth.",
    category: "Product",
    date: "2026-06-12",
    readMins: 6,
    author: "Maya Rahman",
  },
  {
    slug: "ndc-and-gds-together",
    title: "Running NDC and GDS on the same booking desk",
    excerpt:
      "Consultants shouldn’t care which pipe returned an offer. We walk through a practical dual-source shopping UX.",
    category: "API",
    date: "2026-05-28",
    readMins: 8,
    author: "Omar Al-Hassan",
  },
  {
    slug: "property-and-travel-under-one-holding",
    title: "Property buy/rent beside travel ops — one tenant",
    excerpt:
      "How Regency-style holdings keep Travel & Tours and Real Estate as companies under a single Klyra workspace.",
    category: "Customers",
    date: "2026-05-04",
    readMins: 5,
    author: "Leila Costa",
  },
  {
    slug: "pos-for-walk-in-travel",
    title: "POS for walk-in travel retail that doesn’t feel like CRM",
    excerpt:
      "Counter staff need speed. We redesigned Point of Sales around quotations, payments, and same-day tickets.",
    category: "Product",
    date: "2026-04-18",
    readMins: 7,
    author: "Sam Okonkwo",
  },
];

export const PARTNERS: Partner[] = [
  {
    id: "p1",
    name: "Gulf Air Distribution",
    category: "Airline",
    region: "GCC",
    blurb: "NDC & classic content for agency and OTA tenants across the Gulf.",
  },
  {
    id: "p2",
    name: "HarbourStay Hotels",
    category: "Hotel group",
    region: "MENA",
    blurb: "Mapped hotel inventory with stop-sales and allotment sync via Extranet.",
  },
  {
    id: "p3",
    name: "SwiftLane Transfers",
    category: "Ground transport",
    region: "Global",
    blurb: "Airport and city transfers connected through third-party API adapters.",
  },
  {
    id: "p4",
    name: "LedgerPay",
    category: "Payments",
    region: "Global",
    blurb: "Card and wallet acceptance wired into Klyra Online Payment Gateway.",
  },
  {
    id: "p5",
    name: "Atlas DMC Network",
    category: "DMC",
    region: "Europe & Asia",
    blurb: "Package and activity content for mid-office fulfillment queues.",
  },
  {
    id: "p6",
    name: "Qatar Property Desk",
    category: "Real estate",
    region: "Qatar",
    blurb: "Buy and rent workflows for holdings that operate travel and property together.",
  },
];
