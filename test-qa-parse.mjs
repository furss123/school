/**
 * QA: 8-tab probe + profile section parsing (mirrors index.html logic)
 */
const SPREADSHEET_ID = "1oH3Er_9UF_A6HDQEK_1KjFxp54M_JJrU";
const PROFILE_PATTERN = /\[(\d+)반\]\s*\[(\d+)\]\s*\[([^\]]+)\]/;
const PROFILE_HEADER_PATTERN = /^(?:👤\s*)?\[\d+반\]\s*\[\d+\]\s*\[[^\]]+\]\s*학생\s*프로필\s*/i;
const PROFILE_MARKERS_RE = /학생\s*프로필|💌|📚|📖|📝|영역별\s*\(|선생님께\s*전하는/;
const SECTION_START_RE = /(?=(?:💌|📚|📖|📝|✏️|🎯)|영역별\s*\()/;
const SUBJECT_START_RE = /(?=과목\s*\d+\s*\([^)]+\))/;

function parseGvizJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  return JSON.parse(text.slice(start, end + 1));
}

function gvizTableToValues(json) {
  const table = json?.table;
  if (!table?.rows?.length) return [];
  const headers = (table.cols || []).map((c) => String(c?.label || "").trim());
  const rows = table.rows.map((row) =>
    (row.c || []).map((cell) => {
      if (cell == null) return "";
      if (cell.v != null) return String(cell.v);
      if (cell.f != null) return String(cell.f);
      return "";
    })
  );
  return [headers].concat(rows);
}

async function fetchSheet(title) {
  const params = new URLSearchParams({ tqx: "out:json", sheet: title });
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${title}`);
  return gvizTableToValues(parseGvizJson(await res.text()));
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isMarkerOnlyTitle(title) {
  const t = String(title || "").trim();
  if (!t) return true;
  if (/^[\s💌📚📖📝✏️🎯⭐🔖•\-👤]+$/.test(t)) return true;
  if (/^👤\s*\[\d+반\]/.test(t)) return true;
  if (/학생\s*프로필\s*$/i.test(t) && t.length < 120) return true;
  return false;
}

function isMeaningfulSection(sec) {
  if (!sec) return false;
  if (sec.body && String(sec.body).trim()) return true;
  if (sec.fields?.length) return true;
  return !isMarkerOnlyTitle(sec.title);
}

function hasProfileContent(text) {
  const s = String(text || "").trim();
  return PROFILE_PATTERN.test(s) || PROFILE_MARKERS_RE.test(s);
}

function longestCellText(cells) {
  let best = "";
  for (const c of cells || []) {
    const t = String(c || "").trim();
    if (t.length > best.length) best = t;
  }
  return best;
}

function extractProfileMeta(text) {
  const match = String(text || "").match(PROFILE_PATTERN);
  if (!match) return null;
  return { 반: match[1] + "반", 번호: Number(match[2]), 이름: match[3].trim() };
}

function stripProfileHeader(text, meta) {
  let s = String(text || "").trim().replace(/^👤\s*/, "");
  if (meta?.반 != null && meta?.번호 != null && meta?.이름) {
    const classNum = String(meta.반).replace(/반$/, "");
    const specific = new RegExp(
      `^\\[?${escapeRegex(classNum)}반\\]?\\s*\\[?${meta.번호}\\]?\\s*\\[?${escapeRegex(meta.이름)}\\]?\\s*학생\\s*프로필\\s*`,
      "i"
    );
    s = s.replace(specific, "");
  }
  return s.replace(PROFILE_HEADER_PATTERN, "").trim();
}

function parseSectionFields(body) {
  const fields = [];
  const text = String(body || "").trim();
  if (!text) return fields;
  const re = /(?:^|[\n\r]|\s)-\s*([^:\n]+?)\s*:\s*([\s\S]*?)(?=(?:[\n\r]|\s)-\s*[^:]+:|$)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const key = m[1].trim();
    const val = m[2].trim().replace(/\s+/g, " ");
    if (key && val) fields.push({ key, value: val });
  }
  return fields;
}

function parseTeacherSection(chunk) {
  const headerMatch = chunk.match(/^(💌[^\n"]*)/);
  const title = headerMatch ? headerMatch[1].trim() : "💌 선생님께 전하는 한마디";
  const quoteMatch = chunk.match(/[""]([^""]+)[""]/s) || chunk.match(/[""]([^""]+)[""]/);
  const body = quoteMatch
    ? quoteMatch[1].trim()
    : chunk.replace(/^💌[^\n]*\n?/, "").replace(title, "").trim();
  return { title, body, fields: [] };
}

function parseSubjectSections(chunk, parentTitle) {
  const sections = [];
  let surveyParent = parentTitle || "";
  const parts = chunk.split(SUBJECT_START_RE).map((p) => p.trim()).filter(Boolean);
  const list = parts.length <= 1 && /과목\s*\d+\s*\(/.test(chunk) ? [chunk] : parts;
  for (const part of list) {
    const subjMatch = part.match(/^(과목\s*\d+\s*\([^)]+\))/);
    if (!subjMatch) continue;
    const subjTitle = subjMatch[1].trim();
    let title = surveyParent ? `${surveyParent.replace(/\s+$/, "")} ${subjTitle}` : `📚 ${subjTitle}`;
    if (/영역별/.test(part) && !surveyParent) {
      const areaMatch = part.match(
        /((?:📚\s*)?영역별\s*\([^)]+\)[^\n]*?(?:학습\s*설문[^:\n]*)?)/
      );
      if (areaMatch) title = `${areaMatch[1].trim()} ${subjTitle}`;
    }
    const bodyStart = part.slice(subjMatch[0].length).trim();
    sections.push({ title, body: "", fields: parseSectionFields(bodyStart) });
  }
  return sections;
}

function parseSections(text, meta) {
  const body = stripProfileHeader(text, meta);
  if (!body) return [];
  const sections = [];
  const chunks = body.split(SECTION_START_RE).map((c) => c.trim()).filter(Boolean);
  let surveyParent = "";
  for (const chunk of chunks) {
    if (/^💌/.test(chunk)) {
      sections.push(parseTeacherSection(chunk));
      continue;
    }
    if (/^📚|^영역별/.test(chunk)) {
      const parentMatch = chunk.match(
        /^((?:📚\s*)?영역별\s*\([^)]+\)[^\n]*?(?:학습\s*설문[^\n]*)?)/
      );
      surveyParent = parentMatch ? parentMatch[1].trim() : chunk.split(/\n/)[0].trim();
      if (/과목\s*\d+\s*\(/.test(chunk)) {
        sections.push(...parseSubjectSections(chunk, surveyParent));
      } else if (!SUBJECT_START_RE.test(chunk)) {
        const remainder = chunk.replace(surveyParent, "").trim();
        if (remainder && !isMarkerOnlyTitle(surveyParent)) {
          sections.push({ title: surveyParent, body: remainder, fields: [] });
        }
      }
      continue;
    }
    if (/^과목\s*\d+\s*\(/.test(chunk)) {
      sections.push(...parseSubjectSections(chunk, surveyParent));
      continue;
    }
    const firstLine = chunk.split(/\n/)[0].trim();
    if (firstLine) {
      sections.push({
        title: firstLine,
        body: chunk.slice(firstLine.length).trim(),
        fields: parseSectionFields(chunk),
      });
    }
  }
  return sections.filter(isMeaningfulSection);
}

function isProfileSheetFormat(rawValues) {
  const sampleRows = rawValues.slice(0, Math.min(8, rawValues.length));
  let hits = 0,
    checked = 0;
  for (const cells of sampleRows) {
    const joined = (cells || []).map((c) => String(c || "").trim()).join(" ");
    const longest = longestCellText(cells);
    const text = longest.length > joined.length * 0.55 ? longest : joined;
    if (!text) continue;
    checked += 1;
    if (hasProfileContent(text)) hits += 1;
  }
  return checked > 0 && hits >= Math.ceil(checked / 2);
}

// --- 8-tab probe ---
const probed = [];
for (let i = 1; i <= 20; i++) {
  const title = `${i}반`;
  try {
    const values = await fetchSheet(title);
    if (!values.length) break;
    const sig = (values[1] || values[0] || [])
      .map((c) => String(c || "").trim())
      .join(" ")
      .slice(0, 80);
    probed.push({ title, rows: values.length - 1, profile: isProfileSheetFormat(values) });
    if (i > 8 && !sig.includes("반")) break;
  } catch (e) {
    break;
  }
}
console.log("=== Tab probe (1반~20반) ===");
console.log("count:", probed.length);
console.log(probed.map((p) => `${p.title}:${p.rows}rows profile=${p.profile}`).join(", "));

// --- Parse sample from 1반 ---
const v1 = await fetchSheet("1반");
const dataRows = v1.filter((r) => r.some((c) => String(c || "").trim()));
const firstText = longestCellText(dataRows[0]?.map((c) => String(c || "").trim()) || []);
const meta = extractProfileMeta(firstText);
const sections = parseSections(firstText, meta);
console.log("\n=== 1반 first student sections ===");
console.log("meta:", meta);
console.log(
  "titles:",
  sections.map((s) => s.title)
);
console.log(
  "field keys:",
  sections.flatMap((s) => (s.fields || []).map((f) => f.key))
);
const hasPreviewBlob =
  sections.some((s) => /학생\s*프로필/.test(s.title)) ||
  sections.some((s) => /학생\s*프로필/.test(s.body || ""));
console.log("has raw profile blob in sections:", hasPreviewBlob);
const emojiOnly = sections.filter((s) => isMarkerOnlyTitle(s.title));
console.log("emoji-only sections:", emojiOnly.length, emojiOnly.map((s) => s.title));
