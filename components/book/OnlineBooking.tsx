"use client";

import dynamic from "next/dynamic";

/**
 * The booking form in its own chunk, fetched only when /book renders it
 * (online booking on). Without it, /book loads only the message form's code.
 */
export const OnlineBooking = dynamic(() => import("./BookingFlow").then((module) => module.BookingFlow));
