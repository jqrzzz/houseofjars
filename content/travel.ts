import { fact } from "./fact";
import { sources } from "./sources";

/*
 * Facts for the travel guides: the train, getting around Vientiane, a day in
 * the city and crossing to Thailand. They are about Laos, not the house, so
 * they come from official pages, news reports and travel guides, checked on
 * TRAVEL_CHECKED (content/sources.ts), and the guides say each one the way
 * its source allows (content/certainty.ts). The team can confirm a fact once
 * they have checked it on the ground.
 *
 * Prices, fares and the opening hours sources disagree on are left out: they
 * change too often, and a wrong one costs a traveller a wasted trip.
 * content/open-questions.ts asks the team for them instead.
 */

export const railway = {
  app: fact(
    {
      name: "LCR Ticket",
      appStore: "https://apps.apple.com/us/app/lcr-ticket/id6444795307",
      googlePlay: "https://play.google.com/store/apps/details?id=com.cars.laosticket",
    },
    sources.lcrApp,
    { note: "The railway's own ticket app. Open both store links once to check they still lead to it." },
  ),
  stationTickets: fact(
    "You can also buy tickets at the ticket office of any station on the line, and swap an app ticket for a paper one there",
    sources.lcrLaunch,
    { note: "From the app's launch news in 2023. Worth checking what the office in Vientiane accepts (cash, cards)." },
  ),
  passports: fact(
    {
      short: "Every passenger’s passport details",
      rule: "Tickets are in each traveller’s name, so you need every passenger’s passport details to book",
    },
    sources.lcrGuides,
  ),
  onSale: fact(
    { short: "7 days ahead", rule: "Tickets for trains within Laos go on sale 7 days before the train" },
    sources.lcrGuides,
    { note: "Up from 3 days on 1 July 2025, per Baolau and GeckoRoutes; not seen on an official LCR notice yet." },
  ),
  sellOut: fact("Popular trains and holiday dates sell out", sources.lcrGuides),
  station: fact("About 15 km north-east of central Vientiane", sources.lcrGuides, {
    note: "Vientiane railway station, Ban Donnoun, Xaythany District. The distance is from the city centre, not measured from the house.",
  }),
  arriveEarly: fact("about an hour before your train", sources.lcrGuides, {
    note: "One travel guide (GeckoRoutes); no official cut-off time found.",
  }),
  journeys: fact(
    { vangVieng: "About 1 hour", luangPrabang: "About 2 hours" },
    sources.lcrGuides,
    { note: "On the fast (EMU) trains: Luang Prabang 1 h 45 to 2 h 20. The slow train takes longer." },
  ),
  khamsavath: fact("Trains to Thailand leave from Khamsavath, a different station", sources.lcrGuides),
  toChina: fact(
    "Trains run every day between Vientiane and Kunming, in China, in about 10 hours including the border checks",
    sources.chinaTrains,
    { note: "Two trains a day each way since 18 July 2025." },
  ),
  chinaTickets: fact("Tickets to China are sold in LCR Ticket and on China’s 12306 railway website", sources.lcrGuides),
} as const;

export const gettingAround = {
  loca: fact(
    {
      name: "LOCA",
      summary: "the Lao app for taxis, tuk-tuks and motorbike taxis, day and night, in Vientiane, Luang Prabang and Savannakhet",
      url: "https://loca.la/",
    },
    sources.loca,
  ),
  greenSm: fact(
    "Electric taxis, called Xanh SM until April 2026, booked in the app or stopped in the street",
    sources.cityNews,
    { note: "Launched in Vientiane on 9 November 2023; renamed worldwide on 13 April 2026." },
  ),
  notInLaos: fact("Grab and Uber don’t operate in Laos", sources.cityGuides),
  inDrive: fact("inDrive has been blocked in Laos since May 2025", sources.cityNews, {
    note: "Blocked on 28 May 2025 (Laotian Times); no sign it has returned.",
  }),
  tukTuks: fact("Agree the fare with a tuk-tuk driver before you get in", sources.visitorPractice),
  brt: fact(
    {
      short: "Since March 2026",
      route:
        "Vientiane’s BRT buses started on 10 March 2026, from Dongdok, by the National University of Laos, to Talat Sao (the Morning Market), from 06:00 to 22:00",
    },
    sources.cityNews,
    { note: "Free until 9 May 2026, then normal fares (not found). Extensions to the airport and the railway station were planned for the end of 2026." },
  ),
  brtSecondRoute: fact(
    "A second route opened on 20 April 2026, from Talat Sao along Setthathirath Road to Chao Fa Ngum",
    sources.cityNews,
    { note: "The stops along Setthathirath Road were not found: the team could add the one nearest the house." },
  ),
  northernStation: fact("The Northern Bus Station serves the north of Laos", sources.cityGuides),
  southernStation: fact(
    "The Southern Bus Station, on 450 Years Road, serves the south of Laos, such as Thakhek, Savannakhet and Pakse, and Vietnam",
    sources.busNews,
  ),
  centralStation: fact(
    "The Central Bus Station, beside Talat Sao, serves the city buses and the buses to Nong Khai and Udon Thani in Thailand",
    sources.cityGuides,
  ),
} as const;

export const sights = {
  oldTemples: fact(
    "Wat Si Saket and Haw Phra Kaew stand opposite each other, where Lane Xang Avenue meets Setthathirath Road",
    sources.cityGuides,
  ),
  siSaket: fact("Wat Si Saket’s cloister walls hold thousands of small Buddha images", sources.cityGuides),
  hawPhraKaew: fact("Haw Phra Kaew, once the royal temple, is now a museum of Buddhist art", sources.cityGuides),
  noPhotos: fact("Photos aren’t allowed inside Haw Phra Kaew", sources.cityGuides),
  fees: fact("Wat Si Saket, Haw Phra Kaew and Pha That Luang charge an entry fee", sources.templeNews, {
    note: "KPL reported the fees were waived for Lao New Year (14–16 April 2026), so they are charged the rest of the year. Amounts differ between sources: the team could check them.",
  }),
  lunch: fact("Some sights close for lunch, around 12:00 to 13:00", sources.cityGuides, {
    note: "Sources disagree on the hours of each sight; the team could check them.",
  }),
  cope: fact(
    {
      name: "COPE Visitor Centre",
      about: "unexploded ordnance (UXO) in Laos, and people living with disabilities",
      entry: "Free entry, and donations are welcome",
      url: "https://copelaos.org/",
    },
    sources.cope,
  ),
  copePlace: fact("COPE is on Khouvieng Road", sources.cityGuides),
  patuxai: fact(
    "Patuxai, the victory arch on Lane Xang Avenue, is free to walk around, and climbing it has an entry fee",
    sources.cityGuides,
  ),
  thatLuang: fact(
    "Pha That Luang, the gold stupa that is Laos’s most important national monument, is about 2 km east of Patuxai",
    sources.cityGuides,
  ),
  thatLuangGrounds: fact(
    "Its grounds and the temples beside it are open at all hours, and it looks its best near sunset",
    sources.cityGuides,
  ),
  templeManners: fact(
    "Cover your shoulders and knees, and take off your shoes before you go into a temple building",
    sources.visitorPractice,
  ),
  buddhaPark: fact(
    "Buddha Park (Xieng Khuan), with more than 200 Buddhist and Hindu sculptures, is about 25 km from the centre, and city bus 14 goes there from the Central Bus Station",
    sources.cityGuides,
    { note: "Bus 14 and its stop at the Friendship Bridge are from travel blogs and reviews; the team could check." },
  ),
  museumMoved: fact(
    "The Lao National Museum has moved out of the centre: its new building opened in October 2020 in Xaythany District",
    sources.museumNews,
    { note: "The Booking.com listing still gives a walking time from the house, which fits the old building on Samsenthai Road." },
  ),
} as const;

export const toThailand = {
  bridge: fact(
    {
      name: "First Thai–Lao Friendship Bridge",
      hours: "06:00 to 22:00",
      url: "https://immigration.gov.la/en/checkpoints/detail/friendship-bridge-1",
    },
    sources.bridgeCheckpoint,
    { note: "The Lao checkpoint, open daily, opposite the Thai checkpoint at Nong Khai." },
  ),
  ldifLeaving: fact(
    {
      rule: "At the First Friendship Bridge, the Lao Digital Immigration Form is needed when you leave Laos too, filled in online within 3 days before you cross",
      url: "https://immigration.gov.la/en/news-detail/submit-arrival-or-departure-digital-card",
    },
    sources.ldifNews,
    { note: "Since 1 September 2025 at the Friendship Bridge and three airports, with more checkpoints to follow." },
  ),
  shuttle: fact("You can’t walk across the bridge: a shuttle bus takes you over", sources.borderGuides),
  distance: fact("The bridge is about 20 km from the centre of Vientiane", sources.borderGuides),
  thaiRules: fact(
    {
      changed: "15 September 2026",
      exemption: "Travellers from 60 countries and territories can stay in Thailand for up to 30 days without a visa, for tourism",
      landLimit:
        "Entries over land under this exemption are limited to two a calendar year, except for travellers from Malaysia, Brunei, Indonesia and Singapore",
      url: "https://www.tatnews.org/2026/09/thailand-introduces-new-30-day-and-15-day-visa-exemption-rules-from-15-september/",
    },
    sources.thaiRules,
    { note: "Replaced the 60-day exemption. Rules differ by nationality: the guide sends readers to check theirs." },
  ),
  arrivalCard: fact(
    {
      rule: "Thailand asks every foreign visitor to fill in the free Thailand Digital Arrival Card online, within 3 days before arriving",
      url: "https://tdac.immigration.go.th/",
    },
    sources.borderGuides,
    { note: "From travel guides; the official site itself could not be opened." },
  ),
  train: fact("A direct train between Khamsavath station and Bangkok started in July 2024", sources.thaiTrainNews),
  shortTrain: fact("Shorter trains run to Nong Khai, about half an hour away", sources.borderGuides, {
    note: "Two a day each way in February 2026 timetables.",
  }),
} as const;

export const travel = { railway, gettingAround, sights, toThailand } as const;
