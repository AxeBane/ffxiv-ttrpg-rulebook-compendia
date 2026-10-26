import { getTranslationKey } from "../../../systems/ffxiv/module/helpers/content-keys.mjs";

export function registerTranslationExports(TranslationExport, ExportKeys) {
  const exportData = TranslationExport.prototype.data;
  TranslationExport.prototype.data = async function (options = {}) {
    if (!this.pack.collection.startsWith("ffxiv-ttrpg-core-rulebook-compendia.")) {
      return exportData.call(this, options);
    }
    const mappedCompendium = options.mappedCompendium ?? this.mappedCompendium;
    const entries = options.entries ?? await this.entries(mappedCompendium);
    const keys = new ExportKeys();
    const mapping = {
      exportKeyCandidates: (source) => [getTranslationKey(source, this.pack.folders), source._id].filter(Boolean),
    };
    return exportData.call(this, {
      ...options,
      entries: entries.map((entry) => ({
        ...entry,
        entity: { name: keys.keyFor(entry.sourceData, "entry", mapping) },
      })),
    });
  };
}
