/**
 * Parse student profile blobs (e.g. "[1반] [1] [고경남] 학생 프로필").
 */

const PROFILE_PATTERN = /\[(\d+)반\]\s*\[(\d+)\]\s*\[([^\]]+)\]/;

export function extractProfileMeta(text) {
  const match = String(text ?? "").match(PROFILE_PATTERN);
  if (!match) return null;
  return {
    반: `${match[1]}반`,
    번호: Number(match[2]),
    이름: match[3].trim(),
  };
}

export function isProfileSheetFormat(rawValues) {
  if (!rawValues?.length) return false;

  const sampleRows = rawValues.slice(0, Math.min(5, rawValues.length));
  let hits = 0;
  let checked = 0;

  for (const row of sampleRows) {
    const text = row?.map((c) => String(c ?? "").trim()).join(" ") || "";
    if (!text) continue;
    checked += 1;
    if (PROFILE_PATTERN.test(text)) hits += 1;
  }

  return checked > 0 && hits >= Math.ceil(checked / 2);
}

/**
 * @param {string[][]} rawValues
 */
export function normalizeProfileSheet(rawValues) {
  const dataRows = rawValues.filter((row) =>
    row?.some((cell) => String(cell ?? "").trim() !== "")
  );

  const rows = dataRows
    .map((raw, rowIndex) => {
      const text = raw.map((c) => String(c ?? "").trim()).join("\n").trim();
      const meta = extractProfileMeta(text);
      if (!meta) return null;

      const preview =
        text.length > 160 ? `${text.slice(0, 160).trim()}…` : text;

      return {
        id: rowIndex + 1,
        반: meta.반,
        번호: meta.번호,
        이름: meta.이름,
        미리보기: preview,
        _raw: {
          이름: meta.이름,
          프로필: text,
          미리보기: preview,
        },
        완료: true,
      };
    })
    .filter(Boolean);

  rows.sort((a, b) => {
    const classCmp = String(a.반).localeCompare(String(b.반), "ko");
    if (classCmp !== 0) return classCmp;
    return (a.번호 ?? 0) - (b.번호 ?? 0);
  });

  return {
    headers: ["반", "번호", "이름", "미리보기"],
    rows,
    meta: {
      classColumn: "반",
      numberColumn: "번호",
      completionColumn: "(프로필 제출)",
      format: "profile",
    },
  };
}
