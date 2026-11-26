# Haze Lens

**A haze research prototype for [God's Eye View](https://github.com/bilawalsidhu/gods-eye-view).**

Haze Lens puts a dated Singapore air-quality snapshot on the globe and provides a structured record for investigating environmental observations, institutional responses and legal obligations. Its immediate contribution is reproducible evidence gathering. It does not identify who caused pollution or establish a legal breach.

## What is working

- Two importable scenes: Singapore air quality and an ASEAN haze research tour.
- Five Singapore regional points, using NEA's published label locations.
- Separate 1-hour PM2.5 and 24-hour PSI values, with observation, provider-update and capture times.
- Four research viewpoints covering the regional context, Riau in Sumatra, Singapore and northern Thailand.
- Official-source cards and an evidence ledger containing ten regional measurement records.
- A manual refresh script that validates both API responses before updating the snapshot and retains successful captures in an archive.
- Checks for malformed, missing and stale readings, scene validity, action targets, asset integrity and export/import preservation.

The snapshot table gives the observation and capture times. Each archived response also records when the provider updated its readings. The archive also preserves the first capture, assembled from the official responses on 15 November 2026. Its record describes how those responses were retrieved and serialised. [Snapshot table](dist/SNAPSHOT.md) · [Capture archive](data/archive/).

## Why this can help

A useful haze investigation needs a reliable sequence of events: what was observed, when information became available, which institution had a relevant duty, and what the primary record shows it did. Haze Lens gives those categories separate fields. It helps preserve evidence and frame a focused investigation, while leaving source attribution and legal conclusions open for proper examination.

Start with one episode. Preserve the environmental product and its metadata, identify corroborating atmospheric evidence, then record separately sourced institutional acts and the applicable legal text. An elapsed interval alone does not establish unlawful delay. Singapore and northern Thailand require their own episode selection and legal analysis.

## Use it in God's Eye View

1. Use a current local installation of God's Eye View with **version-6 scenes and scene bundles**. Follow the upstream README to install the application; this repository contains the extension and portable validators only.
2. Choose **Explore Manually** and a keyless basemap. This pack activates no live or paid data-provider layers and requires no API keys.
3. Open **Director / Authoring**. Export any current project you want to keep: applying an import replaces the active project.
4. Select **IMPORT**, choose [dist/Haze_Lens.gevbundle.json](dist/Haze_Lens.gevbundle.json), review the preview, then apply it.
5. Select the Singapore overview or a regional shot and press **LOAD**. Click a marker, then the source-card button. Actions are inactive during automatic playback.
6. Reimport the bundle after reloading the application, because its asset bytes are held for the current session.

The control names follow the upstream [sharing guide](https://github.com/bilawalsidhu/gods-eye-view/blob/3d25a284f9186dcc936c26e0c4f745337b402e37/docs/DIRECTOR-SHARING.md) and [actions guide](https://github.com/bilawalsidhu/gods-eye-view/blob/3d25a284f9186dcc936c26e0c4f745337b402e37/docs/DIRECTOR-INTERACTIONS.md).

**Verification limit:** document and data checks pass. The complete globe application has not been installed or launched here, so visual rendering and browser interactions remain untested.

## Refresh on demand

Use a supported Node.js version, as specified in `package.json`. No dependencies need to be installed.

```sh
npm run refresh
```

That command retrieves the two public NEA endpoints, validates their contents, saves a timestamped capture, rebuilds the bundle and runs checks. It has no timer, cloud function or scheduled GitHub workflow. A failed response leaves the preceding current snapshot in place. Reimport the rebuilt bundle to see the new snapshot.

On 26 November 2026 the command retrieved both official data feeds and archived the 16:00 Singapore time observations. The offline suite also exercises successful and failed HTTP responses. [Dated source capture](data/archive/2026-11-26T08-26-55-255Z.json).

For an entirely offline rebuild:

```sh
node build.mjs
node check.mjs
```

The scene cards compare observation times with the recorded capture time. Rebuilding an archived capture on a later date therefore preserves its descriptions and file hashes. GitHub Actions rebuilds the saved snapshot on Node.js 24 and 26 and compares the resulting files with the published bundle.

## Meaning and limits of the map

| Content | Meaning | Limit |
| --- | --- | --- |
| Singapore markers | NEA regional label locations with captured measurements | They are not monitoring-station coordinates. |
| 1-hour PM2.5 | Concentration in micrograms per cubic metre | It is not the 24-hour PSI and does not by itself identify a pollution source. |
| 24-hour PSI | A separate air-quality index | Do not compare its numeric value directly with PM2.5 concentration or another country's index. |
| Freshness text | Whether the observations were over two hours old when the bundle was built | This is a display rule, not a health threshold; it does not update while the bundle is open. |
| ASEAN viewpoints | Approximate locations for organising research | They are not fires, emissions sources or allegations. Tour order implies no pollution trajectory. |
| Institutional and legal ledger fields | A structure for a documented assessment | They remain empty until primary records and legal instruments are verified. |

Points have artificial display heights to keep them above terrain: 1,200 metres for the Singapore region labels and 5,000 metres for the ASEAN research markers. Those heights are not measured environmental evidence.

For current readings and official advice, consult [NEA's haze portal](https://www.haze.gov.sg/). This prototype does not produce health recommendations or alerts.

## Sources and attribution

Contains information from **NEA PM2.5 and PSI datasets**, accessed on 15 November 2026 for the initial capture, supplied through [data.gov.sg](https://data.gov.sg/) and reused under the [Singapore Open Data Licence version 1.0](https://data.gov.sg/open-data-licence). Subsequent captures retain their own timestamps. This project has no official status or agency endorsement.

- [PM2.5 endpoint](https://api-open.data.gov.sg/v2/real-time/api/pm25)
- [PSI endpoint](https://api-open.data.gov.sg/v2/real-time/api/psi)
- [PM2.5 dataset documentation](https://data.gov.sg/datasets/d_e1058d6974c877257e32048ab128ad83/view)
- [ASMC advisories](https://asmc.asean.org/asmc-alerts/)
- [ASMC regional haze product](https://wis2.asmc.asean.org/regional-haze-situation/)
- [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/map/)

`sources.json` records the source-page checks. Thai PCD/Air4Thai pages timed out or returned a service error during review; no Thai station readings or legal instruments are incorporated. Satellite fire data, wind products and ASMC advisories are linked for investigation rather than automatically ingested.

The upstream portable validator and bundle helpers are reproduced verbatim under `vendor/gods-eye-view`, pinned to [3d25a284f9186dcc936c26e0c4f745337b402e37](https://github.com/bilawalsidhu/gods-eye-view/commit/3d25a284f9186dcc936c26e0c4f745337b402e37), with their MIT licence retained. That licence does not replace the separate terms governing NEA data, linked materials or imagery.

## Evidence files

- `data/nea-snapshot.json`: current canonicalised source responses and capture method.
- `data/archive/`: preserved successful captures.
- `dist/Haze_Lens.gevbundle.json`: the single file to import.
- `dist/evidence-ledger.json`: ten sourced measurement records; institutional and legal sections remain empty.
- `dist/provenance.json`: source hashes, bundle hash and upstream compatibility.
- `dist/SNAPSHOT.md`: readable measurement table.
- `research-ledger.template.json`: empty structure and coding rules for a new investigation.
- `core.mjs`, `refresh.mjs`, `build.mjs`, `check.mjs`: the implementation and validation.

Public repository: [Albertito-AI/haze-lens](https://github.com/Albertito-AI/haze-lens). Updates run on demand; no scheduled workflow is included.

## Sport governance teaching application

Compare a dated Singapore haze observation with the authorised event advisory. Record the next reassessment and the officer who can change the programme. [Exercise and records](https://github.com/Albertito-AI/sport-governance-and-administration/blob/main/cases/20-paris-seine-triathlon.md) · [Albert Tan’s book and teaching companion](https://alberttansinhon.com/sport-governance/).
