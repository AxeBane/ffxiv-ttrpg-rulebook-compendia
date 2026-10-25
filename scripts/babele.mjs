import { getContentKey, getTranslationKey } from "../../../systems/ffxiv/module/helpers/content-keys.mjs";
import { ACTOR_TEXT_FIELDS, ITEM_TEXT_FIELDS, extractAutomation, extractDocument, getTranslationMetadata, translateAutomation, translateGrants, translateLabels } from "./translations.mjs";

Hooks.once("babele.init", (babele) => {
  Hooks.once("i18nInit", () => {
    const lang = game.settings.get("core", "language");
    babele.register({ module: "ffxiv-ttrpg-core-rulebook-compendia", lang, dir: `translations/${lang}` });
  });
  babele.registerIdentityExtractors({
    ffxivKey: getContentKey,
    ffxivTranslationKey: getTranslationKey,
  });
  const identity = { export: ["ffxivTranslationKey", "name", "_id"], match: ["ffxivTranslationKey", "ffxivKey", "_id", "name", "sourceId"] };
  const abilityGrants = (source, translation) => translateGrants(source, translation);
  abilityGrants.extract = (source) => extractDocument({ system: { ability_grants: source } }).abilityGrants;
  const summonActors = (source, translation) => translateGrants(source, translation, true);
  summonActors.extract = (source) => extractDocument({ system: { summon_actors: source } }).summonActors;
  const petGrants = (source, translation) => translateGrants(source, translation, true);
  petGrants.extract = (source) => extractDocument({ system: { pet_grants: source } }).petGrants;
  const effectRules = (source, translation) => translateLabels(source, translation);
  effectRules.extract = (source) => extractDocument({ system: { effect_rules: source } }).effectRules;
  const automation = (source, translation) => translateAutomation(source, translation);
  automation.extract = extractAutomation;
  babele.registerConverters({ ffxivAbilityGrants: abilityGrants, ffxivSummonActors: summonActors, ffxivPetGrants: petGrants, ffxivEffectRules: effectRules, ffxivAutomation: automation });
  Hooks.on("babele.translateDocumentData", ({ source, translated, translation }) => {
    const metadata = getTranslationMetadata(source, translation);
    if (!metadata?.sourceText) return;
    translated.flags ??= {};
    translated.flags.babele ??= {};
    translated.flags.babele.sourceText = metadata.sourceText;
  });
  const automationMapping = { path: "flags.ffxiv", converter: "ffxivAutomation" };
  babele.registerMapping({
    Item: {
      _identity: identity,
      ...Object.fromEntries(ITEM_TEXT_FIELDS.map((field) => [field, `system.${field}`])),
      abilityGrants: { path: "system.ability_grants", converter: "ffxivAbilityGrants" },
      summonActors: { path: "system.summon_actors", converter: "ffxivSummonActors" },
      petGrants: { path: "system.pet_grants", converter: "ffxivPetGrants" },
      effectRules: { path: "system.effect_rules", converter: "ffxivEffectRules" },
      automation: automationMapping,
    },
    Actor: {
      _identity: identity,
      ...Object.fromEntries(ACTOR_TEXT_FIELDS.map((field) => [field, `system.${field}`])),
      automation: automationMapping,
    },
    ActiveEffect: { _identity: identity, automation: automationMapping },
    JournalEntry: { _identity: identity },
    JournalEntryPage: { _identity: identity },
    RollTable: { _identity: identity },
    Macro: { _identity: identity },
  });
});
