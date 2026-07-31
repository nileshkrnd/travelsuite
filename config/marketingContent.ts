export type ApiProductId =
  | "flight"
  | "hotel"
  | "transfer"
  | "rail"
  | "insurance"
  | "paymentGateway"
  | "thirdParty"
  | "hotelMapping";

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
    id: "flight",
    name: "Flight API",
    shortName: "Flight",
    tagline: "Air content across GDS, NDC and LCC",
    description:
      "Shop, price, book and ticket air inventory through a single Flight API — covering traditional GDS, NDC offer/order flows and low-cost carrier rules with normalised responses for POS, B2B, CBT and B2C.",
    href: "/api/flight",
    icon: "Plane",
    highlights: ["GDS / NDC / LCC shopping", "PNR & Order lifecycle", "Ancillaries & EMDs", "Fare rules"],
  },
  {
    id: "hotel",
    name: "Hotel API",
    shortName: "Hotel",
    tagline: "Hotel search, rates and reservations",
    description:
      "Connect hotel suppliers and aggregators for availability, rates, room content and booking confirmation — ready for agency desks and digital channels under Al Asmakh Nexus.",
    href: "/api/hotel",
    icon: "BedDouble",
    highlights: ["Multi-supplier search", "Rate & room plans", "Book / cancel / modify", "Content & images"],
  },
  {
    id: "transfer",
    name: "Transfer API",
    shortName: "Transfer",
    tagline: "Airport and point-to-point ground transfers",
    description:
      "Quote and book private and shared transfers with vehicle class, meet-and-greet and flight-aware pickup windows for leisure and corporate journeys.",
    href: "/api/transfer",
    icon: "Car",
    highlights: ["Airport transfers", "Point-to-point", "Vehicle classes", "Flight-aware pickup"],
  },
  {
    id: "rail",
    name: "Rail API",
    shortName: "Rail",
    tagline: "Train search, fares and reservations",
    description:
      "Integrate rail inventory for regional and international routes — shopping, seat reservation and ticket fulfilment alongside air and hotel in the same booking journey.",
    href: "/api/rail",
    icon: "TrainFront",
    highlights: ["Schedule & fare shop", "Seat reservation", "Ticket fulfilment", "Multi-city rail"],
  },
  {
    id: "insurance",
    name: "Insurance API",
    shortName: "Insurance",
    tagline: "Travel insurance quotes and policies",
    description:
      "Offer travel protection at point of sale with quote, bind and document retrieval — linked to the trip so POS and digital channels can attach cover without a separate process.",
    href: "/api/insurance",
    icon: "ShieldCheck",
    highlights: ["Trip-linked quotes", "Policy bind", "Document delivery", "Claim hand-off path"],
  },
  {
    id: "paymentGateway",
    name: "Payment Gateway API",
    shortName: "Payment Gateway",
    tagline: "Collect and reconcile online payments",
    description:
      "Accept cards and local payment methods for bookings, with authorisation, capture, refund and reconciliation hooks into Finance for Al Asmakh Nexus tenants.",
    href: "/api/payment-gateway",
    icon: "CreditCard",
    highlights: ["Authorise & capture", "Refunds", "Webhook events", "Finance reconciliation"],
  },
  {
    id: "thirdParty",
    name: "Third-Party API",
    shortName: "Third Party API",
    tagline: "Supplier and partner adapters in one contract layer",
    description:
      "Plug additional suppliers and partner systems behind a unified integration contract — with retries, error normalisation, credentials management and usage metering.",
    href: "/api/third-party",
    icon: "Layers",
    highlights: ["Supplier adapters", "Unified errors", "Retry & circuit break", "Usage metering"],
  },
  {
    id: "hotelMapping",
    name: "Hotel Mapping",
    shortName: "Hotel Mapping",
    tagline: "One property identity across every supplier",
    description:
      "Match and merge hotel content across channels so OTA and agency desks stop selling the same property under multiple supplier codes.",
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
      "How Regency-style holdings keep Travel & Tours and Real Estate as companies under a single Nexus workspace.",
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
    blurb: "Card and wallet acceptance wired into Nexus Online Payment Gateway.",
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
