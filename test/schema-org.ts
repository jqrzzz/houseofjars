/*
 * The part of the schema.org vocabulary this site's structured data uses,
 * as schema.org defines it (each type's parents, and the properties it
 * declares with the kinds of value they expect), and a validator for it.
 * Unit tests and the smoke test run every page's JSON-LD through it.
 * A property or type the site starts using must be added here, from
 * schema.org's own definition, before its tests can pass.
 */

type DataType = "Text" | "URL" | "Date" | "DateTime" | "Time" | "Boolean" | "Number" | "Integer";

interface TypeDef {
  readonly parents: readonly string[];
  /** Property name -> the data types and schema.org types it expects. */
  readonly properties?: Readonly<Record<string, readonly (DataType | string)[]>>;
  /** For enumerations: the members, e.g. DayOfWeek's Monday. */
  readonly members?: readonly string[];
}

export const vocabulary: Readonly<Record<string, TypeDef>> = {
  Thing: {
    parents: [],
    properties: {
      name: ["Text"],
      alternateName: ["Text"],
      description: ["Text"],
      url: ["URL"],
      image: ["ImageObject", "URL"],
      sameAs: ["URL"],
      mainEntityOfPage: ["CreativeWork", "URL"],
    },
  },
  CreativeWork: {
    parents: ["Thing"],
    properties: {
      about: ["Thing"],
      mentions: ["Thing"],
      mainEntity: ["Thing"],
      inLanguage: ["Language", "Text"],
      isPartOf: ["CreativeWork", "URL"],
      publisher: ["Organization", "Person"],
      dateModified: ["Date", "DateTime"],
      datePublished: ["Date", "DateTime"],
    },
  },
  WebSite: { parents: ["CreativeWork"] },
  WebPage: {
    parents: ["CreativeWork"],
    properties: {
      breadcrumb: ["BreadcrumbList", "Text"],
      lastReviewed: ["Date"],
      reviewedBy: ["Organization", "Person"],
      relatedLink: ["URL"],
      significantLink: ["URL"],
      primaryImageOfPage: ["ImageObject"],
    },
  },
  AboutPage: { parents: ["WebPage"] },
  ContactPage: { parents: ["WebPage"] },
  CollectionPage: { parents: ["WebPage"] },
  MediaObject: { parents: ["CreativeWork"], properties: { contentUrl: ["URL"], encodingFormat: ["Text", "URL"] } },
  ImageObject: { parents: ["MediaObject"], properties: { caption: ["MediaObject", "Text"] } },
  Intangible: { parents: ["Thing"] },
  ItemList: { parents: ["Intangible"], properties: { itemListElement: ["ListItem", "Text", "Thing"], numberOfItems: ["Integer"] } },
  BreadcrumbList: { parents: ["ItemList"] },
  // schema.org expects a Thing for `item`; Google's breadcrumb documentation gives the page's URL, which stands for it.
  ListItem: { parents: ["Intangible"], properties: { position: ["Integer", "Text"], item: ["Thing", "URL"] } },
  StructuredValue: { parents: ["Intangible"] },
  ContactPoint: {
    parents: ["StructuredValue"],
    properties: { telephone: ["Text"], email: ["Text"], contactType: ["Text"], availableLanguage: ["Language", "Text"] },
  },
  PostalAddress: {
    parents: ["ContactPoint"],
    properties: {
      streetAddress: ["Text"],
      addressLocality: ["Text"],
      addressRegion: ["Text"],
      addressCountry: ["Country", "Text"],
      postalCode: ["Text"],
    },
  },
  GeoCoordinates: { parents: ["StructuredValue"], properties: { latitude: ["Number", "Text"], longitude: ["Number", "Text"] } },
  OpeningHoursSpecification: {
    parents: ["StructuredValue"],
    properties: { dayOfWeek: ["DayOfWeek"], opens: ["Time"], closes: ["Time"] },
  },
  PropertyValue: { parents: ["StructuredValue"], properties: { value: ["Boolean", "Number", "StructuredValue", "Text"] } },
  LocationFeatureSpecification: { parents: ["PropertyValue"] },
  Language: { parents: ["Intangible"] },
  Service: { parents: ["Intangible"], properties: { provider: ["Organization", "Person"], serviceType: ["Text"] } },
  GovernmentService: { parents: ["Service"] },
  Enumeration: { parents: ["Intangible"] },
  DayOfWeek: {
    parents: ["Enumeration"],
    members: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "PublicHolidays"],
  },
  Organization: {
    parents: ["Thing"],
    properties: {
      address: ["PostalAddress", "Text"],
      email: ["Text"],
      telephone: ["Text"],
      logo: ["ImageObject", "URL"],
      knowsLanguage: ["Language", "Text"],
    },
  },
  Place: {
    parents: ["Thing"],
    properties: {
      address: ["PostalAddress", "Text"],
      telephone: ["Text"],
      geo: ["GeoCoordinates", "GeoShape"],
      hasMap: ["Map", "URL"],
      amenityFeature: ["LocationFeatureSpecification"],
      containsPlace: ["Place"],
      smokingAllowed: ["Boolean"],
      logo: ["ImageObject", "URL"],
    },
  },
  LocalBusiness: {
    parents: ["Organization", "Place"],
    properties: { openingHoursSpecification: ["OpeningHoursSpecification"], priceRange: ["Text"] },
  },
  LodgingBusiness: {
    parents: ["LocalBusiness"],
    properties: {
      amenityFeature: ["LocationFeatureSpecification"],
      availableLanguage: ["Language", "Text"],
      checkinTime: ["DateTime", "Time"],
      checkoutTime: ["DateTime", "Time"],
    },
  },
  Hostel: { parents: ["LodgingBusiness"] },
  Accommodation: { parents: ["Place"], properties: { amenityFeature: ["LocationFeatureSpecification"] } },
  Room: { parents: ["Accommodation"] },
  CivicStructure: { parents: ["Place"], properties: { openingHours: ["Text"] } },
  Airport: { parents: ["CivicStructure"], properties: { iataCode: ["Text"] } },
  Museum: { parents: ["CivicStructure"] },
};

const DATA_TYPES = new Set<string>(["Text", "URL", "Date", "DateTime", "Time", "Boolean", "Number", "Integer"]);

type JsonObject = Record<string, unknown>;

const isObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function typesOf(node: JsonObject): string[] {
  const type = node["@type"];
  if (typeof type === "string") return [type];
  return Array.isArray(type) ? type.filter((item): item is string => typeof item === "string") : [];
}

/** Whether `type` is `ancestor` or descends from it. */
export function isA(type: string, ancestor: string): boolean {
  if (type === ancestor) return true;
  return (vocabulary[type]?.parents ?? []).some((parent) => isA(parent, ancestor));
}

function expectedValues(type: string, property: string): (readonly string[])[] {
  const def = vocabulary[type];
  if (!def) return [];
  const own = def.properties?.[property];
  return [...(own ? [own] : []), ...def.parents.flatMap((parent) => expectedValues(parent, property))];
}

/** What a property expects on a node of these types, or null when schema.org has no such property for them. */
export function propertyRange(types: readonly string[], property: string): string[] | null {
  const ranges = types.flatMap((type) => expectedValues(type, property)).flat();
  return ranges.length > 0 ? [...new Set(ranges)] : null;
}

const isUrl = (value: string) => {
  if (!/^https?:\/\/\S+$/.test(value)) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

const isDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
};

const isTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?(Z|[+-]\d{2}:\d{2})?$/.test(value);

const isDateTime = (value: string) => {
  const [date, time] = value.split("T");
  return Boolean(date && time && isDate(date) && isTime(time));
};

function textFits(value: string, range: readonly string[]): boolean {
  if (range.includes("Text")) return true;
  if (range.includes("URL") && isUrl(value)) return true;
  if (range.includes("Date") && isDate(value)) return true;
  if (range.includes("DateTime") && isDateTime(value)) return true;
  if (range.includes("Time") && isTime(value)) return true;
  // An enumeration member, e.g. https://schema.org/Monday for DayOfWeek.
  return range.some((type) =>
    (vocabulary[type]?.members ?? []).some((member) => value === `https://schema.org/${member}`),
  );
}

/**
 * Checks a JSON-LD document against the vocabulary above: known types,
 * properties that belong to them, values of the expected kinds, and
 * references (`{"@id": …}`) that point at a node of the right type in the
 * same document. Returns what is wrong; an empty list means valid.
 */
export function validateJsonLd(document: unknown): string[] {
  const problems: string[] = [];
  if (!isObject(document)) return ["the document is not a JSON object"];
  if (document["@context"] !== "https://schema.org") problems.push('@context is not "https://schema.org"');

  const roots = Array.isArray(document["@graph"]) ? (document["@graph"] as unknown[]) : [document];
  const byId = new Map<string, string[]>();

  const index = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(index);
    if (!isObject(node)) return;
    const id = node["@id"];
    const types = typesOf(node);
    if (typeof id === "string" && types.length > 0) {
      if (byId.has(id)) problems.push(`${id}: more than one node has this @id`);
      byId.set(id, types);
    }
    Object.values(node).forEach(index);
  };
  index(roots);

  const checkValue = (value: unknown, range: readonly string[], where: string): void => {
    if (typeof value === "string") {
      if (!textFits(value, range)) problems.push(`${where}: "${value}" is not a ${range.join(" or ")}`);
      return;
    }
    if (typeof value === "number") {
      const fits = range.includes("Number") || (range.includes("Integer") && Number.isInteger(value));
      if (!fits) problems.push(`${where}: ${value} is not a ${range.join(" or ")}`);
      return;
    }
    if (typeof value === "boolean") {
      if (!range.includes("Boolean")) problems.push(`${where}: ${value} is not a ${range.join(" or ")}`);
      return;
    }
    if (!isObject(value)) {
      problems.push(`${where}: unexpected value ${JSON.stringify(value)}`);
      return;
    }
    const expected = range.filter((type) => !DATA_TYPES.has(type));
    const isReference = Object.keys(value).length === 1 && typeof value["@id"] === "string";
    const types = isReference ? byId.get(value["@id"] as string) : typesOf(value);
    if (!types) {
      problems.push(`${where}: nothing in the document has @id ${String(value["@id"])}`);
      return;
    }
    if (!types.some((type) => expected.some((wanted) => isA(type, wanted)))) {
      problems.push(`${where}: a ${types.join("/") || "node without @type"} is not a ${range.join(" or ")}`);
    }
    if (!isReference) checkNode(value, where);
  };

  const checkNode = (node: JsonObject, where: string): void => {
    const types = typesOf(node);
    if (types.length === 0) problems.push(`${where}: no @type`);
    for (const type of types) {
      if (!vocabulary[type] || vocabulary[type]!.members) problems.push(`${where}: unknown type ${type}`);
    }
    for (const [key, value] of Object.entries(node)) {
      if (key === "@id" || key === "@type" || (key === "@context" && node === document)) continue;
      if (key.startsWith("@")) {
        problems.push(`${where}: unexpected keyword ${key}`);
        continue;
      }
      const range = propertyRange(types, key);
      if (!range) {
        problems.push(`${where}: schema.org has no property "${key}" for ${types.join("/")}`);
        continue;
      }
      const values = Array.isArray(value) ? value : [value];
      if (values.length === 0) problems.push(`${where}.${key}: empty list`);
      values.forEach((item, position) =>
        checkValue(item, range, Array.isArray(value) ? `${where}.${key}[${position}]` : `${where}.${key}`),
      );
    }
  };

  roots.forEach((root, position) => {
    if (!isObject(root)) problems.push(`@graph[${position}]: not an object`);
    else checkNode(root, typeof root["@id"] === "string" ? root["@id"] : `@graph[${position}]`);
  });
  return problems;
}
