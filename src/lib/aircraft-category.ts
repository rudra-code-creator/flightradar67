import type { AircraftCategory } from "./types";

/** Freighter / military cargo ICAO type designators */
const CARGO_TYPE =
  /^(B74[678]F|B77F|B772F|B744F|B748F|B752F|B763F|MD11F|A332F|A333F|A339F|A3ST|A124|A225|C17|C5M|C130|AN12|AN124|AN225|IL76|E190F|B733F|B737F|B738F|DC10F)/i;

/** Business jet / GA type designators */
const PRIVATE_TYPE =
  /^(GLF[456]?|G[456]5?|GLEX|GA6C|GA5C|GA7C|C56X|C68A|C25[ABC]|C510|C525|C550|C560|C680|C700|C750|E55P|E50P|E545|E550|CL30|CL35|CL60|CL65|FA50|FA7X|FA8X|P180|BE40|BE20|BE9L|H25[AB]|HA4T|LJ[34567]|LJ75|HDJT|PC12|PC24|TBM[789]|C208|C172|C182|C206|C210|C310|C340|C414|C421|C441|DA40|DA42|DA62|PA28|PA32|PA34|PA44|PA46|SR20|SR22|SF50|EA50|GALX|F2TH|F900|PRM1|WW24|ASTR|SBR1|E314|EV35|R44|R66|EC35|EC45|AS50|B407|B429|A109|AW13)/i;

/** Known cargo / freighter operator callsign prefixes (ICAO) */
const CARGO_CALLSIGN =
  /^(FDX|UPS|GTI|CLX|BOX|GEC|CKS|ABW|ADB|AZG|NCA|PAC|SOO|AJT|CTT|DHX|TAY|BCS|ABD|AHK|CAO|CKK|CYZ|ICV|MPH|NCR|SQC|YZR|RRR|SXA|TRA|TNB|TGX)/i;

/**
 * Classify ADS-B / OpenSky traffic into commercial / cargo / private.
 * Prefer explicit freighter typecodes and cargo callsigns; use emitter category for GA.
 */
export function classifyAircraft(opts: {
  typecode?: string | null;
  category?: string | null;
  callsign?: string | null;
}): AircraftCategory {
  const type = (opts.typecode ?? "").trim().toUpperCase();
  const cat = (opts.category ?? "").trim().toUpperCase();
  const cs = (opts.callsign ?? "").trim().toUpperCase();
  const prefix = cs.replace(/[^A-Z]/g, "").slice(0, 3);

  if (type && CARGO_TYPE.test(type)) return "cargo";
  if (type.endsWith("F") && /^(B7|A3|MD|DC)/.test(type)) return "cargo";
  if (prefix && CARGO_CALLSIGN.test(prefix)) return "cargo";
  if (/\b(CARGO|FREIGHT)\b/.test(cs)) return "cargo";

  if (type && PRIVATE_TYPE.test(type)) return "private";

  // ADS-B emitter category (DO-260B)
  // A1 light → GA; A6 high-performance → bizjets; A7 rotorcraft
  // B1–B4 glider / balloon / parachute / ultralight
  // A2 is ambiguous (regionals + large GA) — rely on typecode instead
  if (
    cat === "A1" ||
    cat === "A6" ||
    cat === "A7" ||
    cat.startsWith("B1") ||
    cat.startsWith("B2") ||
    cat.startsWith("B3") ||
    cat.startsWith("B4")
  ) {
    return "private";
  }

  return "commercial";
}
