import { fact, type Fact } from "./fact";
import { sources } from "./sources";

export const identity = {
  name: fact("House of Jars", sources.booking, {
    note: 'Listed as "House Of Jars" on Booking.com and "House of jars Hostel" on Google.',
  }),
  fullName: fact("House of Jars Hostel, Vientiane", sources.google),

  address: {
    street: fact("005/4, Unit 2, Khun Bu Lom Rd", sources.booking),
    village: fact("Ban Anou", sources.booking),
    district: fact("Chanthabouly District", sources.booking),
    city: fact("Vientiane Capital", sources.booking),
    country: fact("Laos", sources.booking),
  },

  contact: {
    phone: fact(
      { display: "+856 20 23 978 946", e164: "+8562023978946" },
      sources.booking,
      { note: "Also used for WhatsApp." },
    ),
    whatsapp: fact(true, sources.booking, { note: "WhatsApp on the phone number above." }),
    email: fact("houseofjarslaos@gmail.com", sources.booking),
  },

  links: {
    booking: fact("https://www.booking.com/hotel/la/house-of-jars.html", sources.booking),
    agoda: fact("https://www.agoda.com/house-of-jars/hotel/vientiane-la.html", sources.agoda),
    tripadvisor: fact(
      "https://www.tripadvisor.com/Hotel_Review-g293950-d27469992-Reviews-House_Of_Jars-Vientiane_Vientiane_Prefecture.html",
      sources.tripadvisor,
    ),
    facebook: fact("https://www.facebook.com/p/House-of-Jars-Laos-61553402555538/", sources.facebook),
  },

  owner: {
    name: fact("Nang", sources.booking, { note: "Owner-operator." }),
    /**
     * Nang's own words, if she chooses to add them. The site shows nothing
     * here until she writes it: never write a note or quote on her behalf.
     */
    note: null as Fact<string> | null,
  },

  /** Why the house is called House of Jars. */
  nameStory: fact(
    "The name nods to the Plain of Jars, the fields of ancient stone jars in Xieng Khouang province.",
    sources.assumption,
    { note: "Assumed from the name. Nang to confirm, or tell us the real story." },
  ),
} as const;

/** One-line postal address, e.g. for footers and structured data. */
export function formatAddress(): string {
  const a = identity.address;
  return [a.street, a.village, a.district, a.city, a.country].map((f) => f.value).join(", ");
}

/** The address in three lines, for the footer and contact cards. */
export function addressLines(): string[] {
  const a = identity.address;
  return [a.street.value, `${a.village.value}, ${a.district.value}`, `${a.city.value}, ${a.country.value}`];
}

/** WhatsApp click-to-chat link for the house's number. */
export function whatsappUrl(): string {
  return `https://wa.me/${identity.contact.phone.value.e164.replace(/\D/g, "")}`;
}
