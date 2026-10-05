/**
 * Removes the fabricated demo fixtures from an existing database file.
 *
 * `defaultSeedData` in `server-storage.ts` no longer contains them, but that
 * only affects a fresh install: `loadFromDisk` merges the file on disk over
 * the seed, so an install created before this change keeps them forever.
 *
 * What goes, and why - every one of these reports a number that a sensor or
 * a person would have had to produce, and none was ever measured:
 *
 *   conv-1, conv-2  a chat thread in which the assistant reports 12.2 Brix
 *                   at 134 Hz from a knock recording. There is no acoustic
 *                   model; the endpoint answers 503. conv-2 carries
 *                   messageCount: 4 with no messages stored.
 *   wm-1..wm-3      specimens with predicted Brix, confidence and dominant
 *                   frequency, plus cut-and-taste ground truth signed by a
 *                   named researcher.
 *   cand-1          a training candidate derived from the conv-1 audio,
 *                   labelled 12.2 Brix.
 *   doc-1           a reference document tabulating 80-200 Hz against
 *                   ripeness for five cultivars. No such document exists.
 *   p-1             a starter prompt for knock analysis, which 503s.
 *   f-1, f-2        folders reporting conversation counts they never had.
 *
 * Real records are matched by id and left alone: the generated ids all carry
 * a timestamp, the fixtures are the short hand-written ones.
 *
 * Stop the API server first. It holds the database in memory and its next
 * debounced write would put the fixtures straight back.
 *
 *   node tools/purge-seed-fixtures.mjs           # report only
 *   node tools/purge-seed-fixtures.mjs --apply   # write, after a backup
 */
import fs from "node:fs";
import path from "node:path";

const DB_FILE = path.resolve("data/watermelon_db.json");
const APPLY = process.argv.includes("--apply");

const FIXTURE_IDS = {
  conversations: ["conv-1", "conv-2"],
  watermelons: ["wm-1", "wm-2", "wm-3"],
  trainingCandidates: ["cand-1"],
  knowledge: ["doc-1"],
  prompts: ["p-1"],
  folders: ["f-1", "f-2"],
};

const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
const removed = [];

for (const [key, ids] of Object.entries(FIXTURE_IDS)) {
  const list = db[key];
  if (!Array.isArray(list)) continue;
  const keep = list.filter((row) => !ids.includes(row?.id));
  if (keep.length !== list.length) {
    removed.push(`${key}: ${list.length - keep.length} removed, ${keep.length} kept`);
    db[key] = keep;
  }
}

for (const id of FIXTURE_IDS.conversations) {
  if (db.messages && Object.prototype.hasOwnProperty.call(db.messages, id)) {
    removed.push(`messages[${id}]: ${db.messages[id]?.length ?? 0} removed`);
    delete db.messages[id];
  }
}

// Anything else still quoting the retired acoustic model is a fixture that
// was missed, so it is reported rather than deleted on a guess.
const leftovers = JSON.stringify(db).match(/WM-Knock-v[\d.]+-Acoustic|sweetnessEstimateBrix/g);

if (removed.length === 0) {
  console.log("Nothing to remove - this database has no seed fixtures left.");
} else {
  console.log(removed.join("\n"));
}
if (leftovers) {
  console.warn(`\n⚠️  ${leftovers.length} reference(s) to the retired acoustic model remain. Inspect them by hand.`);
}

if (!APPLY) {
  console.log("\nReport only. Re-run with --apply to write.");
  process.exit(0);
}

const backup = `${DB_FILE}.${new Date().toISOString().replace(/[:.]/g, "-")}.bak`;
fs.copyFileSync(DB_FILE, backup);
fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
console.log(`\nBackup: ${backup}\nWritten: ${DB_FILE}`);
