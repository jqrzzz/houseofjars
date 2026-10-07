import { airportTransport, immigration, location } from "./area";
import { identity } from "./identity";
import type { Inline } from "./inline";
import { atmosphere, bathrooms, beds, breakfast, policies, services, staff, times } from "./stay";
import { joinList, lowerFirst } from "./text";
import { gettingAround, railway, sights, toThailand } from "./travel";

export interface FaqEntry {
  readonly id: string;
  readonly question: string;
  readonly answer: readonly Inline[];
  /** The answer when the site takes bookings online (faqFor). */
  readonly online?: readonly Inline[];
}

export interface FaqGroup {
  readonly title: string;
  readonly entries: readonly FaqEntry[];
}

const { mekong, nightMarket, airport } = location.nearby;

export const faq: readonly FaqGroup[] = [
  {
    title: "Arriving and leaving",
    entries: [
      {
        id: "check-in-times",
        question: "What time is check-in and check-out?",
        answer: [
          `Check-in is from ${times.checkIn.value} until ${times.checkInUntil.value}, and check-out is until ${times.checkOut.value}. Early check-in is possible when a bed is free, so tell us your arrival time. Arriving after ${times.checkInUntil.value}? Message the team before you travel.`,
        ],
      },
      {
        id: "late-at-night",
        question: "What if I come back late at night?",
        answer: [
          `The front door is locked from ${times.frontDoorLocked.value.from} until ${times.frontDoorLocked.value.until}. Knock on the glass door and the night staff will let you in.`,
        ],
      },
      {
        id: "shoes",
        question: "Do I take my shoes off?",
        answer: [
          "Yes, before you go upstairs. Shoes are fine on the ground floor, in the café and at the front desk. Take them off at the foot of the stairs and carry them up to the shoe cubbies on the 1st floor landing: the 1st and 2nd floors, where the dorms are, are shoes-off. ",
          { text: "The house rules", href: "/house-rules" },
          ".",
        ],
      },
      {
        id: "deposit",
        question: "Is there a deposit?",
        answer: [
          `Yes: ${policies.deposit.value.amount} for ${policies.deposit.value.covers}, refunded at reception when you return them at check-out. A second towel is ${policies.secondTowel.value}, not refunded.`,
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
          `${airport.value.place} is ${lowerFirst(airport.value.distance)} from the house. Guests say ${lowerFirst(airportTransport.value)} Message them with your arrival time. `,
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
          `All the beds are pods, and each dorm has ${beds.podsPerDorm.value} of them. Booking.com lists the beds as ${joinList(beds.roomTypes.value.map((type) => `a ${lowerFirst(type)}`))}. To see which beds are free on your dates, check Booking.com or Agoda, or `,
          { text: "ask us", href: "/book" },
          ".",
        ],
      },
      {
        id: "breakfast",
        question: "Is breakfast included?",
        answer: [
          `Yes. Breakfast is included and served ${breakfast.hours.value} in the café on the ground floor: ${joinList(breakfast.items.value.map((item) => item.toLowerCase()))}.`,
        ],
      },
      {
        id: "bathrooms",
        question: "Are the bathrooms shared?",
        answer: [
          `Yes. The bathrooms are shared, with hot showers, and guests say they are ${lowerFirst(bathrooms.cleaning.value)}.`,
        ],
      },
      {
        id: "comfort",
        question: "Is there air-conditioning and Wi-Fi?",
        answer: [
          "Yes: free Wi-Fi, and guests praise the strong air-conditioning. The dorms are kept cool on purpose, for sleep; if you sleep cold, ask the team for a bed further from the air-conditioning or an extra blanket.",
        ],
      },
      {
        id: "quiet",
        question: "Is it a party hostel?",
        answer: [
          `No. ${atmosphere.summary.value} Hen and stag parties are not accepted, and there is no smoking in the house or on the terrace (smokers go out past it, to the small jar for cigarette butts). `,
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
          `Prices change with the dates and the season, so we don’t list them here. ${policies.directPrice.value} Send the team your dates from the `,
          { text: "booking page", href: "/book" },
          " and ask, or see live prices on Booking.com and Agoda.",
        ],
        online: [
          "Prices change with the dates and the season. The ",
          { text: "booking page", href: "/book" },
          ` shows the free beds for your dates, with the price wherever the house has set one; Booking.com and Agoda show live prices too. ${policies.directPrice.value}`,
        ],
      },
      {
        id: "how-to-book",
        question: "How do I book?",
        answer: [
          "Book direct with the house: choose your dates on the ",
          { text: "booking page", href: "/book" },
          ` and send them to the team on WhatsApp or by email, and they will reply with what is free. ${policies.directPrice.value} You can also book on Booking.com or Agoda.`,
        ],
        online: [
          "Choose your dates on the ",
          { text: "booking page", href: "/book" },
          ` and book directly with the house: you pay when you arrive, or online where your booking offers it. ${policies.directPrice.value} You can also book on Booking.com or Agoda, or send the team a message from the same page.`,
        ],
      },
      {
        id: "cancel",
        question: "Can I cancel?",
        answer: [
          "If you cancel your stay after paying, there is no refund. If you booked on Booking.com or Agoda, check the cancellation terms in your booking there.",
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
          `The house is in ${location.neighbourhood.value}. The ${mekong.value.place} is ${lowerFirst(mekong.value.distance)}, and guests say the ${lowerFirst(nightMarket.value.place)} is ${lowerFirst(nightMarket.value.distance)}. `,
          { text: "What’s nearby", href: "/guides/whats-nearby" },
          ".",
        ],
      },
      {
        id: "laundry",
        question: "Can I get my clothes washed?",
        answer: [`${services.laundry.value.summary}, ${services.laundry.value.price} (prices vary).`],
      },
    ],
  },
  {
    title: "Travelling on",
    entries: [
      {
        id: "train-tickets",
        question: "How do I buy train tickets to Vang Vieng or Luang Prabang?",
        answer: [
          `Yourself, in ${railway.app.value.name}, the Laos–China Railway’s own app, or through the team, who book train tickets for guests. Travel sites report that ${lowerFirst(railway.onSale.value.rule)}, so book early. `,
          { text: "How to buy Laos–China Railway tickets", href: "/guides/laos-china-railway-tickets" },
          ".",
        ],
      },
      {
        id: "book-for-me",
        question: "Can the house book tickets or tours for me?",
        answer: [`Yes. ${services.bookingHelp.value}. Ask at the desk, or `, { text: "send them your trip", href: "/trips" }, "."],
      },
      {
        id: "getting-around",
        question: "How do I get around Vientiane?",
        answer: [
          `Walk around the centre. For longer rides, book a taxi or tuk-tuk in ${gettingAround.loca.value.name}, or ${lowerFirst(gettingAround.tukTuks.value)}, as is usual in Laos. `,
          { text: "Getting around Vientiane", href: "/guides/getting-around-vientiane" },
          ".",
        ],
      },
      {
        id: "one-day",
        question: "What can I do with a day in Vientiane?",
        answer: [
          `Temples in the morning, the ${sights.cope.value.name} at midday (${lowerFirst(sights.cope.value.entry)}), Patuxai and Pha That Luang in the afternoon, and sunset by the Mekong. `,
          { text: "A day in Vientiane, step by step", href: "/guides/one-day-in-vientiane" },
          ".",
        ],
      },
      {
        id: "thailand",
        question: "How do I get to Thailand from Vientiane?",
        answer: [
          `Cross the ${toThailand.bridge.value.name} to Nong Khai: the Lao checkpoint is open daily from ${toThailand.bridge.value.hours}. Fill in the Lao Digital Immigration Form for leaving, and check Thailand’s entry rules first: they changed on ${toThailand.thaiRules.value.changed}. `,
          { text: "Crossing to Thailand", href: "/guides/vientiane-to-thailand" },
          ".",
        ],
      },
    ],
  },
  {
    title: "About us",
    entries: [
      {
        id: "team",
        question: "Who runs the house?",
        answer: [`${identity.name.value} is run by its own team, on site day and night and speaking ${joinList(staff.languages.value)}.`],
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

/** The questions and answers as a build shows them: with online booking, the booking answers say so. */
export function faqFor(onlineBooking: boolean): readonly FaqGroup[] {
  if (!onlineBooking) return faq;
  return faq.map((group) => ({
    ...group,
    entries: group.entries.map((entry) => (entry.online ? { ...entry, answer: entry.online } : entry)),
  }));
}
