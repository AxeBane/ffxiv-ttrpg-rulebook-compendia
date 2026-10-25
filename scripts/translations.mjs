import { getContentKey, getSourceText, getTranslationKey, normalizeContentKey } from "../../../systems/ffxiv/module/helpers/content-keys.mjs";

export const ITEM_TEXT_FIELDS = [
  "description", "source", "cost", "target", "range", "trigger", "base_effect",
  "combo", "challenge", "condition", "direct_hit", "status_effect", "marker_area",
  "marker_trigger", "marker_effect", "limitations", "job_name",
];
export const ACTOR_TEXT_FIELDS = ["description", "biography", "traits", "tactics", "origin", "motive", "bond", "deity", "specie"];
const LABEL_FIELDS = ["name", "description", "label", "buttonLabel", "criticalButtonLabel", "flavorLabel"];

export function getTranslationMetadata(source, translation = {}) {
  if (!Object.keys(translation).length) return source.flags?.babele;
  const sourceText = {};
  for (const field of ["name", "cost", "target", "combo"]) {
    const original = getSourceText(source, field);
    const translated = field === "name" ? translation.name ?? source.name : translation[field];
    if (typeof translated === "string") sourceText[field] = { original, translated };
  }
  if (!Object.keys(sourceText).length) return source.flags?.babele;
  return { ...source.flags?.babele, sourceText: { ...source.flags?.babele?.sourceText, ...sourceText } };
}

export function translateAutomation(source, translation = {}) {
  if (!source || typeof source !== "object") return source;
  if (Array.isArray(source)) return source.map((entry, index) => translateAutomation(entry, translation[entry?.key ?? index]));
  const result = structuredClone(source);
  for (const [field, value] of Object.entries(source)) {
    if (LABEL_FIELDS.includes(field) && typeof translation[field] === "string") result[field] = translation[field];
    else if (value && typeof value === "object") result[field] = translateAutomation(value, translation[field]);
  }
  const metadata = getTranslationMetadata(source, translation);
  if (metadata) {
    result.flags ??= {};
    result.flags.babele = metadata;
  }
  return result;
}

export function extractAutomation(source) {
  if (!source || typeof source !== "object") return undefined;
  const result = {};
  for (const [field, value] of Object.entries(source)) {
    const key = Array.isArray(source) ? value?.key ?? field : field;
    if (!Array.isArray(source) && LABEL_FIELDS.includes(field) && typeof value === "string") result[key] = value;
    else {
      const nested = extractAutomation(value);
      if (nested) result[key] = nested;
    }
  }
  return Object.keys(result).length ? result : undefined;
}

function entryFor(entries, source) {
  if (!entries || typeof entries !== "object") return null;
  return entries[getTranslationKey(source)]
    ?? entries[getContentKey(source)]
    ?? entries[source?._id] ?? entries[source?.name] ?? null;
}

export function translateLabels(source, translations = {}) {
  if (!Array.isArray(source)) return source;
  return source.map((entry) => {
    const translation = translations[entry.key ?? entry.id ?? getContentKey(entry)] ?? {};
    const result = structuredClone(entry);
    for (const field of LABEL_FIELDS) {
      if (typeof translation[field] === "string") result[field] = translation[field];
    }
    const metadata = getTranslationMetadata(entry, translation);
    if (metadata) {
      result.flags ??= {};
      result.flags.babele = metadata;
    }
    return result;
  });
}

export function translateDocument(source, translation = {}, actor = false) {
  const result = structuredClone(source);
  const metadata = getTranslationMetadata(source, translation);
  if (metadata) {
    result.flags ??= {};
    result.flags.babele = metadata;
  }
  if (typeof translation.name === "string") result.name = translation.name;
  if (typeof translation.description === "string" && !result.system) result.description = translation.description;
  if (result.flags?.ffxiv && translation.automation) result.flags.ffxiv = translateAutomation(result.flags.ffxiv, translation.automation);
  if (result.system) {
    for (const field of actor ? ACTOR_TEXT_FIELDS : ITEM_TEXT_FIELDS) {
      if (typeof translation[field] === "string") result.system[field] = translation[field];
    }
    if (translation.effectRules) result.system.effect_rules = translateLabels(result.system.effect_rules, translation.effectRules);
    if (translation.abilityGrants) result.system.ability_grants = translateGrants(result.system.ability_grants, translation.abilityGrants);
    if (translation.petGrants) result.system.pet_grants = translateGrants(result.system.pet_grants, translation.petGrants, true);
    if (translation.summonActors) result.system.summon_actors = translateGrants(result.system.summon_actors, translation.summonActors, true);
  }
  for (const field of ["effects", "items"]) {
    if (!Array.isArray(result[field])) continue;
    result[field] = result[field].map((entry) => {
      const translated = entryFor(translation[field], entry);
      return translated ? translateDocument(entry, translated) : entry;
    });
  }
  if (actor && typeof translation.tokenName === "string" && result.prototypeToken) result.prototypeToken.name = translation.tokenName;
  return result;
}

export function translateGrants(source, translations = {}, actor = false) {
  if (!Array.isArray(source)) return source;
  const field = actor ? "actor" : "item";
  return source.map((grant) => {
    const entry = grant[field];
    const translation = entryFor(translations, entry ?? grant);
    if (!translation) return structuredClone(grant);
    const result = structuredClone(grant);
    if (typeof translation.name === "string") result.name = translation.name;
    if (entry) result[field] = translateDocument(entry, translation, actor);
    return result;
  });
}

export function extractDocument(source, actor = false) {
  const result = { name: source.name };
  const automation = extractAutomation(source.flags?.ffxiv);
  if (automation) result.automation = automation;
  if (!source.system && source.description) result.description = source.description;
  for (const field of actor ? ACTOR_TEXT_FIELDS : ITEM_TEXT_FIELDS) {
    if (source.system?.[field]) result[field] = source.system[field];
  }
  for (const field of ["effects", "items"]) {
    if (source[field]?.length) result[field] = Object.fromEntries(source[field].map((entry) => [getTranslationKey(entry), extractDocument(entry)]));
  }
  for (const [field, output, isActor] of [["ability_grants", "abilityGrants", false], ["summon_actors", "summonActors", true], ["pet_grants", "petGrants", true]]) {
    const grants = source.system?.[field];
    if (grants?.length) result[output] = Object.fromEntries(grants.map((grant) => {
      const entry = grant[isActor ? "actor" : "item"] ?? grant;
      return [getTranslationKey(entry), extractDocument(entry, isActor)];
    }));
  }
  const rules = source.system?.effect_rules;
  if (rules?.length) result.effectRules = Object.fromEntries(rules.filter((rule) => rule.key || rule.id || rule.name).map((rule) => [rule.key ?? rule.id ?? normalizeContentKey(rule.name), Object.fromEntries(LABEL_FIELDS.filter((field) => typeof rule[field] === "string").map((field) => [field, rule[field]]))]));
  if (actor && source.prototypeToken?.name) result.tokenName = source.prototypeToken.name;
  return result;
}

