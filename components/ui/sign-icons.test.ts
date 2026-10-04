import { describe, expect, it } from "vitest";
import { amenities, rules } from "@/content/stay";
import { signIcon } from "./sign-icons";

describe("icons for rules and amenities", () => {
  it("gives every amenity an icon", () => {
    for (const amenity of amenities) expect(signIcon(amenity.value.name), amenity.value.name).not.toBeNull();
  });

  it("gives the rules the icons on the house's signs", () => {
    const icon = (start: string) => signIcon([...rules.house, ...rules.stay].find((rule) => rule.value.rule.startsWith(start))!.value.rule);
    expect(icon("No smoking")).toBe("no-smoking");
    expect(icon("No outside guests")).toBe("no-outside-guests");
    expect(icon("Eat and drink")).toBe("no-food-in-dorms");
    expect(icon("No outside food")).toBe("no-food-in-dorms");
    expect(icon("No strong-smelling food")).toBe("no-food-in-dorms");
    expect(icon("No shoes upstairs")).toBe("shoes-off");
    expect(icon("No pets")).toBe("no-pets");
    expect(icon("No drugs")).toBe("prohibited");
    expect(icon("The front door is locked")).toBe("front-door");
    expect(icon("A deposit of")).toBe("valuables");
    expect(icon("Arriving after")).toBe("check-in");
    expect(icon("Keep your voice down")).toBe("quiet-hours");
    expect(icon("Leaving very early")).toBe("luggage");
    expect(icon("Check-in from")).toBe("check-in");
    expect(icon("Check-out from")).toBe("check-out-time");
    expect(icon("Leaving before 08:00")).toBe("check-out-time");
    expect(icon("Coming by motorbike")).toBe("motorbike");
  });

  it("matches amenities to the right icon, not the first word that fits", () => {
    expect(signIcon("Café on the ground floor")).toBe("coffee");
    expect(signIcon("Breakfast included")).toBe("breakfast");
    expect(signIcon("A locker or safe for every bed")).toBe("locker");
    expect(signIcon("24-hour reception")).toBe("check-in");
    expect(signIcon("Non-smoking throughout")).toBe("no-smoking");
  });
});
