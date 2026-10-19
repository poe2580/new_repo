import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  SAFETY_LIMIT,
  buildReport,
  charLen,
  formatObservedAt,
  validate,
} = require("../js/report.js");

const sample = {
  typeId: "banner",
  region: "서울특별시",
  address: "마포구 월드컵로 12 인근, 예시초등학교 정문 맞은편 횡단보도 옆",
  spotIds: ["tree", "cross"],
  observedAt: "2026-10-18T09:30",
  count: "3",
  size: "가로 약 5m",
  advertiser: "예시상호",
  phone: "02-000-0000",
  adCopy: "겨울특강 모집",
  reasonIds: ["streetfurniture", "nopermit", "sightline", "repeat"],
  customReason: "",
  memo: "같은 문구 현수막이 횡단보도 양쪽에 있습니다.",
  nonprofit: false,
};

test("날짜와 시각을 신고 문장으로 바꿉니다", function () {
  assert.equal(formatObservedAt("2026-10-18T09:05"), "2026년 10월 18일 9시 5분경");
  assert.equal(formatObservedAt("2026-10-18"), "2026년 10월 18일");
  assert.equal(formatObservedAt(""), "");
});

test("안전신문고 본문은 위치, 광고 문구, 확인 내용을 담고 900자 안입니다", function () {
  const report = buildReport(sample, "safety");
  assert.equal(report.mode, "safety");
  assert.equal(report.limit, SAFETY_LIMIT);
  assert.ok(report.charCount <= SAFETY_LIMIT);
  assert.equal(report.charCount, charLen(report.paste));
  assert.match(report.paste, /현수막/);
  assert.match(report.paste, /마포구 월드컵로 12/);
  assert.match(report.paste, /가로수, 교차로·신호등 근처/);
  assert.match(report.paste, /2026년 10월 18일 9시 30분경/);
  assert.match(report.paste, /3개, 가로 약 5m/);
  assert.match(report.paste, /예시상호, 02-000-0000, 겨울특강 모집/);
  assert.match(report.paste, /허가·신고 표지나 관리번호가 보이지 않습니다/);
  assert.match(report.title, /불법광고물 현장 확인 요청/);
  assert.equal(report.paste.includes("제목:"), false);
  assert.deepEqual(report.errors, {});
});

test("긴 추가 설명은 안전신문고 글에서만 줄입니다", function () {
  const input = Object.assign({}, sample, { memo: "현장 ".repeat(800) });
  const safety = buildReport(input, "safety");
  const office = buildReport(input, "office");
  assert.ok(safety.charCount <= SAFETY_LIMIT);
  assert.equal(safety.trimmed.memo, true);
  assert.match(safety.trimMessage, /추가 설명/);
  assert.ok(office.body.includes(input.memo.trim()));
  assert.ok(office.charCount > SAFETY_LIMIT);
  assert.match(office.paste, /^제목: /);
});

test("비영리 행사 안내로 보이면 불법이라고 단정하지 않습니다", function () {
  const report = buildReport(Object.assign({}, sample, { nonprofit: true }), "safety");
  assert.equal(report.title.includes("불법"), false);
  assert.match(report.paste, /현장 확인을 요청합니다/);
  assert.match(report.paste, /30일 이내 비영리 표시는 허용될 수 있어/);
  assert.equal(report.paste.includes("불법 옥외광고물로 보여"), false);
});

test("종류, 시·도, 위치, 확인 내용이 없으면 복사할 수 없습니다", function () {
  const errors = validate({ address: "짧음", reasonIds: [] });
  assert.ok(errors.typeId);
  assert.ok(errors.region);
  assert.ok(errors.address);
  assert.ok(errors.facts);
});

test("구청 민원용은 법령 이름과 사진 안내를 포함합니다", function () {
  const report = buildReport(sample, "office");
  assert.match(report.body, /옥외광고물 등의 관리와 옥외광고산업 진흥에 관한 법률/);
  assert.match(report.body, /적법 여부는 관할 시·군·구가 판단합니다/);
  assert.match(report.body, /문구와 연락처가 읽히게/);
});
