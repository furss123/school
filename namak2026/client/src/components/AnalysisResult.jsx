/**
 * 상담 분석 결과: 요약 카드, 반별 통계, 주제, 표
 */

function StudentResponseHeader({ row }) {
  const classLabel = row.반 && row.반 !== "(미입력)" ? row.반 : "";
  const numLabel = row.번호 != null ? `${row.번호}번` : "";
  const nameLabel = row.이름 || row._raw?.이름 || "";
  if (!classLabel && !numLabel && !nameLabel) return null;
  return (
    <div className="student-response-header mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 border-b border-slate-200 pb-2 font-semibold">
      {classLabel ? (
        <span className="student-class text-sm text-teal-800">{classLabel}</span>
      ) : null}
      {numLabel ? (
        <span className="student-num text-sm font-medium text-slate-600">
          {numLabel}
        </span>
      ) : null}
      {nameLabel ? (
        <span className="student-name text-base text-slate-900">{nameLabel}</span>
      ) : null}
    </div>
  );
}

export default function AnalysisResult({ data, sheetName, multiSheet }) {
  if (!data) return null;

  const { summary, byClass, columnInsights, themes, commonThemes, rows, meta } =
    data;
  const isProfile = meta?.format === "profile";

  if (!summary?.총응답) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">
          {multiSheet && sheetName ? (
            <>
              <strong>{sheetName}</strong> 탭에 분석할 데이터가 없습니다.
            </>
          ) : (
            "이 탭에 분석할 데이터가 없습니다."
          )}
        </p>
      </section>
    );
  }

  const cards = [
    { label: "총 응답", value: summary.총응답, suffix: "건" },
    { label: "완료", value: summary.완료건수, suffix: "건" },
    {
      label: "완료율",
      value: summary.완료율,
      suffix: "%",
      highlight: true,
    },
    { label: "학급 수", value: summary.학급수, suffix: "개" },
    { label: "이름 입력", value: summary.이름입력, suffix: "건" },
    { label: "반 미입력", value: summary.반미입력, suffix: "건" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <div
            key={c.label}
            className={`rounded-xl border bg-white p-4 shadow-sm ${
              c.highlight
                ? "border-teal-200 ring-1 ring-teal-100"
                : "border-slate-200"
            }`}
          >
            <p className="text-xs font-medium text-slate-500">{c.label}</p>
            <p
              className={`mt-1 text-2xl font-bold tabular-nums ${
                c.highlight ? "text-teal-700" : "text-slate-800"
              }`}
            >
              {c.value}
              <span className="ml-0.5 text-sm font-normal text-slate-500">
                {c.suffix}
              </span>
            </p>
          </div>
        ))}
      </div>

      {commonThemes?.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-sm font-semibold text-slate-800">공통 주제</h2>
          <p className="mt-1 text-xs text-slate-500">
            학생 프로필에서 자주 나타난 분류·키워드입니다.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {commonThemes.map((t) => (
              <li
                key={`${t.주제}-${t.유형}`}
                className="rounded-full bg-teal-50 px-3 py-1 text-sm text-teal-800"
              >
                {t.주제}{" "}
                <span className="text-teal-600">({t.언급수})</span>
                <span className="ml-1 text-xs text-slate-500">
                  · {t.유형 === "category" ? "분류" : "키워드"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {themes?.length > 0 && !isProfile && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-sm font-semibold text-slate-800">주요 상담 주제</h2>
          <p className="mt-1 text-xs text-slate-500">
            응답 텍스트에서 자주 언급된 키워드입니다.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {themes.map((t) => (
              <li
                key={t.주제}
                className="rounded-full bg-teal-50 px-3 py-1 text-sm text-teal-800"
              >
                {t.주제}{" "}
                <span className="text-teal-600">({t.언급수})</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {byClass?.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-sm font-semibold text-slate-800">반별 현황</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="py-2 pr-4">반</th>
                  <th className="py-2 pr-4">인원</th>
                  <th className="py-2 pr-4">완료</th>
                  <th className="py-2">완료율</th>
                </tr>
              </thead>
              <tbody>
                {byClass.map((row) => (
                  <tr key={row.반} className="border-b border-slate-100">
                    <td className="py-2 pr-4 font-medium">{row.반}</td>
                    <td className="py-2 pr-4 tabular-nums">{row.인원}</td>
                    <td className="py-2 pr-4 tabular-nums">{row.완료}</td>
                    <td className="py-2 tabular-nums">{row.완료율}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {columnInsights?.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-sm font-semibold text-slate-800">열(컬럼) 입력 현황</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {columnInsights.map((col) => (
              <li
                key={col.열}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2"
              >
                <span>
                  {col.열}
                  {col.상담내용열 && (
                    <span className="ml-2 text-xs text-teal-600">상담 내용</span>
                  )}
                </span>
                <span className="tabular-nums text-slate-600">
                  {col.입력건수}건 ({col.입력률}%)
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {rows?.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-sm font-semibold text-slate-800">응답 목록</h2>
          <p className="mt-1 text-xs text-slate-500">
            형식: {isProfile ? "학생 프로필 (분류별)" : "표"} · 최대 50건
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="py-2 pr-3">완료</th>
                  <th className="py-2">
                    {isProfile ? "카테고리별 응답" : "응답"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 50).map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-100 align-top"
                  >
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {row.완료 ? (
                        <span className="text-teal-600">완료</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-2 max-w-2xl">
                      <StudentResponseHeader row={row} />
                      {isProfile ? (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {(row.categoryList || []).map((item) => (
                            <div
                              key={item.label}
                              className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                            >
                              <p className="text-xs font-semibold text-teal-700">
                                {item.label}
                              </p>
                              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                                {item.value.length > 220
                                  ? `${item.value.slice(0, 220).trim()}…`
                                  : item.value}
                              </p>
                            </div>
                          ))}
                          {!row.categoryList?.length && (
                            <span className="text-slate-400">
                              분류할 내용 없음
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap text-slate-600">
                          {row.미리보기 || row._raw?.미리보기 || "—"}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
