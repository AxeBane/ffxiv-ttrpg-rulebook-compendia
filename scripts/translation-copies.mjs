import { getTranslationKey } from "../../../systems/ffxiv/module/helpers/content-keys.mjs";

const MODULE_ID = "ffxiv-ttrpg-core-rulebook-compendia";

function sourceId(document, collection) {
  const uuid = document?._stats?.compendiumSource ?? document?.flags?.core?.sourceId;
  const prefix = `Compendium.${collection}.`;
  if (uuid?.startsWith(`Compendium.${MODULE_ID}.`) && !uuid.startsWith(prefix)) return null;
  return uuid?.startsWith(prefix) ? uuid.split(".").at(-1) : document?._id ?? document?.id;
}

export function getOriginalTranslationKey(document, { metadata } = {}) {
  const collection = metadata?.id ?? (metadata?.packageName ? `${metadata.packageName}.${metadata.name}` : null);
  const packs = collection ? [game.packs.get(collection)].filter(Boolean) : [...game.packs.values()];
  const keys = packs.filter((pack) => pack.collection.startsWith(`${MODULE_ID}.`)).flatMap((pack) => {
    const original = pack.index.get(sourceId(document, pack.collection));
    return original ? [getTranslationKey(original, pack.folders)] : [];
  });
  return keys.length === 1 ? keys[0] : null;
}

export async function translateCompendiumCopies() {
  const babele = game.babele;
  const originals = [...game.packs.values()].filter(
    (pack) => pack.collection.startsWith(`${MODULE_ID}.`) && babele.translatedCompendiumFor(pack.collection),
  );
  if (!originals.length) return;
  await Promise.all(originals.map((pack) => pack.getIndex()));
  for (const pack of game.packs.values()) {
    if (!pack.collection.startsWith("world.")) continue;
    const candidates = originals.filter((original) => original.documentName === pack.documentName);
    if (!candidates.length) continue;
    const index = await pack.getIndex({ fields: ["_stats.compendiumSource", "flags.core.sourceId"] });
    const references = candidates.filter((original) => index.some(
      (entry) => original.index.has(sourceId(entry, original.collection)),
    )).map((original) => original.collection);
    if (!references.length) continue;
    const mapped = babele.mappedCompendiumFor(pack.collection);
    if (!mapped) continue;
    mapped.reference = [...new Set([...(mapped.reference ?? []), ...references])];
    mapped.translated = true;
    mapped.invalidateCaches();
    mapped.translateIndex(index);
    pack.clear();
  }
}
