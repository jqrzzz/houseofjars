/** How the team will reply, in the words the booking form and Shadow use ("by email", "on WhatsApp"). */
export function replyChannel(preferred: string | null, email: string | null, phone: string | null): string {
  if (preferred === "email") return "by email";
  if (preferred === "whatsapp") return "on WhatsApp";
  if (preferred === "phone") return "by phone";
  if (email && phone) return "by email or WhatsApp";
  return email ? "by email" : "on WhatsApp or by phone";
}
