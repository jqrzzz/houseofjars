import { MAX_GUESTS, MAX_MESSAGE, MAX_NAME } from "./types";

/**
 * What a guest reads about each problem with a booking, written once for the
 * server's answers and the booking form's own checks. Browser-safe.
 */
export const guestText = {
  realDates: "Please choose real dates.",
  fromToday: "Please choose dates from today onwards.",
  order: "Check-out must be after check-in.",
  tooFar: "Please choose dates within the next two years.",
  tooLong: "For a stay of more than a year, please send the team a message.",
  guests: `Please choose between 1 and ${MAX_GUESTS} guests.`,
  datesRefused: "These dates can’t be booked online. Please choose other dates, or send the team a message.",
  guestsRefused: "Online booking can’t take this many guests. For a group, please send the team a message.",
  roomRefused: "Please choose your beds again.",
  checkForm: "Please check your booking and try again.",
  name: "Please tell us your name.",
  nameLong: `Please keep your name under ${MAX_NAME} characters.`,
  email: "Please check your email address.",
  phone: "Please check your WhatsApp or phone number.",
  contact: "Please give an email address or a WhatsApp or phone number.",
  preferred: "Please choose how the team should reply.",
  arrival: "Please give a time like 15:30.",
  message: `Please keep your message under ${MAX_MESSAGE.toLocaleString("en-GB")} characters.`,
  consent: "Please agree to the privacy notice so the team can contact you.",
} as const;
