# Translating the compendia

Translations use Babele 2.9.1 or later and the FFXIV system's translation support. They are loaded over the original compendia, so you do not need to unlock or edit the packs.

## Export a translation file

1. Enable this module, Babele, and Babele's required dependencies in your world.
2. Open the compendium you want to translate. Use **Translation Export** in the compendium window's header menu. If the option is missing, enable translation exports in Babele's settings.
3. Export all entries in the compatible JSON format. Extract the JSON file from the downloaded ZIP.
4. Check the contents before translating. A Jobs export should include `job_name` and `abilityGrants`, not just `name`. If those fields are missing, check that the compendia module is enabled and reload Foundry. Fully restart the application after installing or updating its module manifest.

Export Jobs when translating abilities granted by a job. Jobs contain embedded copies of their actions and traits, so translating only the separate Job Actions & Traits pack will not translate those copies. Translate both packs if you also want standalone actions to be localized.

## Translate values, preserve identifiers

Keep JSON property names and entry identifiers unchanged. Translate the text values inside each entry. For example, keep `Monk (LV 30)` as the lookup key and translate the `name` and `job_name` values beneath it.

| Exported field | Content to translate |
| --- | --- |
| `label`, `name`, `job_name` | Pack, document, and job display names. Translate both `name` and `job_name` for jobs. |
| `description`, `biography`, `base_effect`, `direct_hit` | Descriptive text, including any HTML. |
| `cost`, `target`, `range`, `trigger`, `combo`, `challenge`, `condition`, `limitations` | Display text for abilities. |
| `abilityGrants` | Embedded actions and traits in jobs, augments, and consumables. |
| `petGrants`, `summonActors` | Embedded pet and summon names and descriptions. |
| `items`, `effects`, `pages` | Embedded documents, such as actor actions, effects, and journal pages. |
| `effectRules`, `automation` | Exported names, descriptions, and button labels for automation. |

Do not translate formulas, check attributes, tags, status IDs, resource references, UUIDs, or macro commands. Preserve HTML structure and Foundry links such as `@UUID[...]`. You may translate a link's display label without changing the reference inside the brackets.

An example partial Jobs translation looks like this. Use the identifiers from your own export rather than copying this example's keys into another pack.

```json
{
  "label": "Classes",
  "entries": {
    "Monk (LV 30)": {
      "name": "Moine (LV 30)",
      "job_name": "Moine",
      "abilityGrants": {
        "monk_lv30_primary_bootshine": {
          "name": "Action traduite",
          "base_effect": "<p>Texte traduit.</p>"
        }
      }
    }
  }
}
```

Partial translations are supported. Omit fields or entries you have not translated to retain their source text. Keep the file valid JSON, without comments or trailing commas.

## Entry keys and level variants

Matching keys are calculated from source names. Translation lookups can also use the source folder hierarchy to distinguish different versions of the same ability. These identifiers are generated automatically; there are no item key fields to maintain.

Babele's standard export can use document names for top-level keys. Nested job grants use folder-qualified keys such as `monk_lv30_primary_bootshine`. Preserve whichever identifiers appear in your export.

The standard name-based export can combine same-named standalone actions into one entry. Use the separate entries under each job's `abilityGrants` when different levels need different translated text.

Renaming a source entry or moving it to another source folder can change its generated identifier. Re-export after those changes and transfer your translated values to the corresponding entries.

## Install and load the translation

Save the extracted JSON under this module's `translations/<language>/` directory. Use Foundry's language code, such as `fr`, `de`, or `en`, and retain the exported filename.

For example, a French Jobs translation belongs at:

```text
Data/modules/ffxiv-ttrpg-core-rulebook-compendia/translations/fr/ffxiv-ttrpg-core-rulebook-compendia.axes-compendium-jobs.json
```

Set Foundry's language to the matching language and reload the client. The module registers that language's directory automatically. For a quick test without changing the interface language, place a marked test translation in `translations/en/` while Foundry is set to English.

If you distribute translations in a separate module, keep this compendia module enabled for its FFXIV mappings and register your translation module's directory with Babele:

```js
Hooks.once("babele.init", (babele) => {
  babele.register({
    module: "your-translation-module-id",
    lang: "fr",
    dir: "translations/fr",
  });
});
```

Use your module's actual ID, language, and directory. Changes placed directly inside this compendia module may be replaced by a module update, so keep a separate copy of your translation work.

## If the language is not listed in Foundry

Babele follows Foundry's selected language; it does not add language choices itself. An enabled translation module can add a missing choice through its `module.json` languages declaration. For example, add this property to a Finnish translation module's manifest:

```json
{
  "languages": [
    {
      "lang": "fi",
      "name": "Suomi",
      "path": "lang/fi.json"
    }
  ]
}
```

Create the referenced `lang/fi.json` file. It can contain just `{}` if the module only translates compendia. Foundry will use its English fallback for interface strings without a translation. This interface file is separate from the Babele compendium files in `translations/fi/`.

Register the Babele directory with `lang: "fi"` and `dir: "translations/fi"`, using the registration example above. Fully restart Foundry after changing the manifest, enable the translation module, select Suomi in Foundry's language setting, and reload. All language codes in the manifest, registration, and directory names must match.

See [Foundry's languages and localization documentation](https://foundryvtt.com/article/localization/) for the manifest format.

## Test the result

1. Reopen the compendium and confirm its translated names and text appear.
2. Assign a translated job to a fresh test character. Existing actors do not automatically receive updated compendium content.
3. Check that granted actions, traits, effects, and pets use the translated text. Test at least two job levels if their descriptions differ.
4. With the automation setting you normally use, check an MP-cost action, a combo, a linked trait or effect, and a job resource.

Babele automatically captures source and translated names, costs, targets, and combo text. The system uses the source text while the translated field is unchanged. A subsequent edit to the displayed field takes precedence, so translators do not need to configure separate mechanical keys or parsing overrides.

After changing a translation file, reload Foundry and import fresh test documents. To remove a test translation, delete its JSON file and reload. Previously imported test actors and items retain their imported text.
