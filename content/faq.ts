import { airportTransport, immigration, location } from "./area";
import { identity } from "./identity";
import type { Inline } from "./inline";
import { atmosphere, bathrooms, beds, breakfast, staff, times } from "./stay";
import { joinList, lowerFirst } from "./text";

export interface FaqEntry {
  readonly id: string;
  readonly question: string;
  readonly answer: readonly Inline[];
}

export interface FaqGroup {
  readonly title: string;
  readonly entries: readonly FaqEntry[];
}

const { mekong, museum, nightMarket, airport } = location.nearby;

export const faq: readonly FaqGroup[] = [
  {
    title: "Arriving and leaving",
    entries: [
      {
        id: "check-in-times",
        question: "What time is check-in and check-out?",
        answer: [
          `Check-in is from ${times.checkIn.value} and check-out is until ${times.checkOut.value}. Early check-in is possible when a bed is free, so tell us your arrival time.`,
        ],
      },
      {
        id: "luggage",
        question: "Can I leave my bags before check-in or after check-out?",
        answer: ["Yes. The house has luggage storage, so you can drop your bags and head out."],
      },
      {
        id: "passport",
        question: "Do I need my passport at check-in?",
        answer: [`Yes. ${immigration.registration.value}`],
      },
      {
        id: "ldif",
        question: "Do I need to fill in an immigration form before arriving in Laos?",
        answer: [
          `${immigration.ldif.value.summary} `,
          { text: "Official information from the Lao Department of Immigration", href: immigration.ldif.value.url },
          ". ",
          { text: "The form, in brief", href: "/guides/lao-digital-immigration-form" },
          ".",
        ],
      },
      {
        id: "airport",
        question: "How far is the airport, and can you arrange transport?",
        answer: [
          `${airport.value.place} is ${lowerFirst(airport.value.distance)} from the house. ${airportTransport.value} Message them with your arrival time. `,
          { text: "From the airport, step by step", href: "/guides/from-wattay-airport" },
          ".",
        ],
      },
      {
        id: "reception",
        question: "Is reception open all night?",
        answer: [
          `Yes. The team is ${lowerFirst(staff.hours.value.summary)}, and reception speaks ${joinList(staff.languages.value)}.`,
        ],
      },
    ],
  },
  {
    title: "The house",
    entries: [
      {
        id: "beds",
        question: "What are the beds like?",
        answer: [
          `Every bed is a pod, its own cubicle with ${joinList(beds.perBed.value.map((item) => `a ${item.toLowerCase()}`))}.`,
        ],
      },
      {
        id: "dorms",
        question: "What kind of dorms do you have?",
        answer: [
          `All the beds are pods, and the dorms include ${joinList(beds.dorms.value)}. To see which beds are free on your dates, check Booking.com or Agoda, or `,
          { text: "ask us", href: "/book" },
          ".",
        ],
      },
      {
        id: "breakfast",
        question: "Is breakfast included?",
        answer: [
          `Yes. Breakfast is included and served in the café on the ground floor: ${joinList(breakfast.items.value.map((item) => item.toLowerCase()))}.`,
        ],
      },
      {
        id: "bathrooms",
        question: "Are the bathrooms shared?",
        answer: [
          `Yes. The bathrooms are shared, with hot showers, and they are ${lowerFirst(bathrooms.cleaning.value)}.`,
        ],
      },
      {
        id: "comfort",
        question: "Is there air-conditioning and Wi-Fi?",
        answer: ["Yes: strong air-conditioning and free Wi-Fi."],
      },
      {
        id: "quiet",
        question: "Is it a party hostel?",
        answer: [
          `No. ${atmosphere.summary.value} Hen and stag parties are not accepted, and there is no smoking anywhere in the house. `,
          { text: "A quiet stay, in brief", href: "/guides/quiet-hostel-vientiane" },
          ".",
        ],
      },
    ],
  },
  {
    title: "Booking",
    entries: [
      {
        id: "prices",
        question: "How much is a bed?",
        answer: [
          "Prices change with the dates and the season, so we don’t list them here. You can see live prices on Booking.com and Agoda, or ",
          { text: "ask us directly", href: "/book" },
          ".",
        ],
      },
      {
        id: "how-to-book",
        question: "How do I book?",
        answer: [
          "Book on Booking.com or Agoda, or send us a message from the ",
          { text: "booking page", href: "/book" },
          " and the team will reply by email or WhatsApp.",
        ],
      },
    ],
  },
  {
    title: "The neighbourhood",
    entries: [
      {
        id: "nearby",
        question: "What is nearby?",
        answer: [
          `The house is in ${location.neighbourhood.value}. The ${mekong.value.place} is ${lowerFirst(mekong.value.distance)}, the ${museum.value.place} is ${lowerFirst(museum.value.distance)}, and the ${lowerFirst(nightMarket.value.place)} is ${lowerFirst(nightMarket.value.distance)}. `,
          { text: "What’s nearby", href: "/guides/whats-nearby" },
          ".",
        ],
      },
    ],
  },
  {
    title: "About us",
    entries: [
      {
        id: "owner",
        question: "Who runs the house?",
        answer: [
          `${identity.name.value} is owned and run by ${identity.owner.name.value}, with a team on site day and night.`,
        ],
      },
      {
        id: "shadow",
        question: "Who is Shadow?",
        answer: [
          "Shadow is the AI concierge on this website. He answers questions about the house and can pass a message to the team. He is an AI, not a person, so he can be wrong: for anything important, ",
          { text: "contact the team", href: "/book#contact" },
          ".",
        ],
      },
      {
        id: "name",
        question: "Why is it called House of Jars?",
        answer: [`${identity.nameStory.value} `, { text: "More about the house", href: "/about" }, "."],
      },
    ],
  },
];
