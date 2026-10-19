(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.ReportDraft = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const SAFETY_LIMIT = 900;

  const REGIONS = [
    "서울특별시",
    "부산광역시",
    "대구광역시",
    "인천광역시",
    "광주광역시",
    "대전광역시",
    "울산광역시",
    "세종특별자치시",
    "경기도",
    "강원특별자치도",
    "충청북도",
    "충청남도",
    "전북특별자치도",
    "전라남도",
    "경상북도",
    "경상남도",
    "제주특별자치도",
  ];

  const AD_TYPES = [
    {
      id: "banner",
      label: "현수막",
      hint: "현수막은 지정 게시대, 허가·신고된 게시시설, 공사 현장 가림막에 표시합니다. 가로수·전신주·가로시설물에 단 경우가 불법 사례로 안내되어 있습니다.",
    },
    {
      id: "poster",
      label: "벽보",
      hint: "벽보는 지정벽보판이나 지정게시판에 붙입니다. 그 밖 벽면이나 기둥에 붙인 경우가 불법 사례로 안내되어 있습니다.",
    },
    {
      id: "flyer",
      label: "전단",
      hint: "전단은 신고한 뒤 직접 나누어 주거나 적법한 배부시설로 배포합니다. 신고 없이 뿌리거나 벽·전신주에 붙인 경우가 불법 사례로 안내되어 있습니다.",
    },
    {
      id: "aframe",
      label: "입간판",
      hint: "입간판은 자기 업소 건물 면 1미터 이내, 높이 1.2미터·한 면 0.6제곱미터 이하로, 조명 없이 영업시간에만 둡니다. 보도로 나오거나 조명을 쓰면 불법 사례로 안내되어 있습니다.",
    },
    {
      id: "air",
      label: "에어간판",
      hint: "보도나 차도에 세워 통행이나 시야를 방해하는 에어간판은 현장 확인이 필요합니다.",
    },
    {
      id: "wall",
      label: "벽면 간판",
      hint: "벽면 이용 간판은 보통 업소당 하나이고, 건물 폭과 층 사이 벽면을 넘지 않게 표시합니다. 벽면 전체를 광고로 덮은 경우가 불법 사례로 안내되어 있습니다.",
    },
    {
      id: "projecting",
      label: "돌출 간판",
      hint: "돌출 간판이 건물 벽면 높이를 넘거나 공공시설물에 무단으로 달린 경우가 불법 사례로 안내되어 있습니다.",
    },
    {
      id: "balloon",
      label: "애드벌룬",
      hint: "허가 없이 띄우거나 통행·시야·안전에 지장을 주는 애드벌룬은 현장 확인이 필요합니다.",
    },
    {
      id: "vehicle",
      label: "차량·교통수단 광고",
      hint: "허가나 신고 없이 차량·교통수단에 표시된 광고는 현장 확인이 필요합니다.",
    },
    {
      id: "etc",
      label: "그 밖의 옥외광고물",
      hint: "종류가 목록에 없으면 추가 설명에 모양과 설치 위치를 구체적으로 적어 주세요.",
    },
  ];

  const SPOTS = [
    { id: "tree", label: "가로수" },
    { id: "pole", label: "전신주" },
    { id: "lamp", label: "가로등" },
    { id: "rail", label: "난간·가드레일" },
    { id: "wall", label: "담장·벽면" },
    { id: "stop", label: "버스승강장·공공시설물" },
    { id: "walk", label: "인도·보행로" },
    { id: "cross", label: "교차로·신호등 근처" },
    { id: "facade", label: "건물 외벽" },
    { id: "vehicle", label: "차량" },
  ];

  const REASONS = [
    { id: "offspot", label: "지정 게시대나 게시판이 아닌 곳에 있습니다." },
    { id: "streetfurniture", label: "가로수, 전신주, 가로등, 난간 등 가로시설물에 붙어 있습니다." },
    { id: "nopermit", label: "허가·신고 표지나 관리번호가 보이지 않습니다." },
    { id: "expired", label: "적힌 기간이 지났거나, 안내한 행사가 이미 끝났습니다." },
    { id: "pedestrian", label: "보행로를 막아 통행이 불편합니다." },
    { id: "sightline", label: "교차로, 횡단보도, 신호등 근처에서 시야를 가릴 수 있습니다." },
    { id: "repeat", label: "같은 내용이 주변에 여러 개 붙어 있습니다." },
    { id: "hazard", label: "찢어지거나 떨어져 보행에 위험이 있습니다." },
    { id: "afterhours", label: "입간판이 영업시간 이후에도 보도에 놓여 있습니다." },
    { id: "sidewalk", label: "건물 바깥 보도까지 나와 있습니다." },
    { id: "fullwall", label: "벽면 대부분을 광고로 덮고 있습니다." },
    { id: "lighted", label: "조명이나 전기를 쓰는 입간판입니다." },
  ];

  const PHOTO_SHOTS = [
    "멀리서, 주변 건물이나 도로가 같이 보이게",
    "가까이서, 문구와 연락처가 읽히게",
    "부착된 시설물이나 바닥에 놓인 상태가 보이게",
  ];

  function charLen(text) {
    return Array.from(text || "").length;
  }

  function clip(text, max) {
    const chars = Array.from(text || "");
    if (chars.length <= max) return chars.join("");
    if (max <= 1) return "…";
    return chars.slice(0, max - 1).join("") + "…";
  }

  function clean(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function findById(list, id) {
    return list.find(function (item) {
      return item.id === id;
    });
  }

  function formatObservedAt(value) {
    if (!value) return "";
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
    if (!match) return "";
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = year + "년 " + month + "월 " + day + "일";
    if (match[4] == null) return date;
    return date + " " + Number(match[4]) + "시 " + Number(match[5]) + "분경";
  }

  function selectedLabels(list, ids) {
    return (ids || [])
      .map(function (id) {
        const item = findById(list, id);
        return item ? item.label : "";
      })
      .filter(Boolean);
  }

  function locationLine(input, address) {
    const place = clean([input.region, address].filter(Boolean).join(" "));
    const spots = selectedLabels(SPOTS, input.spotIds);
    if (!place && spots.length === 0) return "";
    if (spots.length === 0) return place;
    if (!place) return spots.join(", ");
    return place + " (" + spots.join(", ") + ")";
  }

  function adLine(input, adText) {
    return [input.advertiser, input.phone, adText]
      .map(clean)
      .filter(Boolean)
      .join(", ");
  }

  function qtyLine(input) {
    const bits = [];
    const count = clean(input.count);
    if (count) bits.push(/^\d+$/.test(count) ? count + "개" : count);
    const size = clean(input.size);
    if (size) bits.push(size);
    return bits.join(", ");
  }

  function customSentence(custom) {
    const text = clean(custom);
    if (!text) return "";
    if (/[.?!。]$/.test(text)) return text;
    return text + ".";
  }

  function reasonSentences(input, custom) {
    const lines = selectedLabels(REASONS, input.reasonIds);
    const extra = customSentence(custom);
    if (extra) lines.push(extra);
    return lines;
  }

  function typeOf(input) {
    return findById(AD_TYPES, input.typeId) || null;
  }

  function buildTitle(input, address) {
    const type = typeOf(input);
    const kind = type ? type.label : "옥외광고물";
    const where = clean([input.region, clip(clean(address), 28)].filter(Boolean).join(" "));
    const head = input.nonprofit ? "옥외광고물 확인 요청" : "불법광고물 현장 확인 요청";
    return clean("[" + head + "] " + where + " " + kind);
  }

  function nonprofitNote() {
    return "정치·노동·선거·관혼상제·학교·종교 행사 안내로 보입니다. 30일 이내 비영리 표시는 허용될 수 있어, 기간·장소·수량은 행정청 확인이 필요합니다.";
  }

  function safetyClosing() {
    return "위치·문구·부착 부위가 보이는 사진을 함께 제출합니다. 확인 후 필요하면 조치를 요청드립니다.";
  }

  function composeSafety(input, draft) {
    const type = typeOf(input);
    const lines = [];
    lines.push(
      input.nonprofit
        ? "옥외광고물 현장 확인을 요청합니다."
        : "불법 옥외광고물로 보여 현장 확인을 요청합니다."
    );
    lines.push("종류: " + (type ? type.label : "옥외광고물"));
    const place = locationLine(input, draft.address);
    if (place) lines.push("위치: " + place);
    const when = formatObservedAt(input.observedAt);
    if (when) lines.push("발견: " + when);
    const qty = qtyLine(input);
    if (qty) lines.push("수량·크기: " + qty);
    const ad = adLine(input, draft.ad);
    if (ad) lines.push("광고 내용: " + ad);
    const reasons = reasonSentences(input, draft.custom);
    if (reasons.length) {
      lines.push("현장에서 본 내용:");
      reasons.forEach(function (reason) {
        lines.push("- " + reason);
      });
    }
    if (input.nonprofit) lines.push(nonprofitNote());
    if (draft.memo) lines.push("추가: " + draft.memo);
    lines.push(safetyClosing());
    return lines.join("\n");
  }

  function emptyTrim() {
    return { memo: false, custom: false, ad: false, address: false, hard: false };
  }

  function fitSafety(input) {
    const draft = {
      address: clean(input.address),
      ad: clean(input.adCopy),
      memo: clean(input.memo),
      custom: clean(input.customReason),
    };
    const trimmed = emptyTrim();
    let body = composeSafety(input, draft);
    if (charLen(body) <= SAFETY_LIMIT) return { body: body, trimmed: trimmed };

    draft.memo = "";
    trimmed.memo = true;
    body = composeSafety(input, draft);
    if (charLen(body) <= SAFETY_LIMIT) return { body: body, trimmed: trimmed };

    ["custom", "ad", "address"].forEach(function (key) {
      let guard = 0;
      while (charLen(body) > SAFETY_LIMIT && charLen(draft[key]) > 8 && guard < 40) {
        trimmed[key] = true;
        const next = Math.max(8, charLen(draft[key]) - 24);
        draft[key] = clip(draft[key].replace(/…$/, ""), next);
        body = composeSafety(input, draft);
        guard += 1;
      }
    });

    if (charLen(body) > SAFETY_LIMIT) {
      trimmed.hard = true;
      body = clip(body, SAFETY_LIMIT);
    }
    return { body: body, trimmed: trimmed };
  }

  function pushBlock(lines, state, title, contentLines) {
    if (!contentLines.length) return;
    state.n += 1;
    lines.push("");
    lines.push(state.n + ". " + title);
    contentLines.forEach(function (line) {
      lines.push(line);
    });
  }

  function composeOffice(input) {
    const type = typeOf(input);
    const lines = [];
    const state = { n: 0 };
    lines.push(
      input.nonprofit
        ? "아래에서 본 옥외광고물이 허용 요건에 해당하는지 현장 확인을 요청드립니다."
        : "아래에서 본 옥외광고물이 허가·신고와 표시 방법을 지켰는지 현장 확인을 요청드립니다."
    );
    pushBlock(lines, state, "광고물 종류", [type ? type.label : "옥외광고물"]);
    pushBlock(lines, state, "위치", [locationLine(input, clean(input.address)) || "(위치 미입력)"]);
    const when = formatObservedAt(input.observedAt);
    if (when) pushBlock(lines, state, "발견 일시", [when]);
    const qty = qtyLine(input);
    if (qty) pushBlock(lines, state, "수량·크기", [qty]);
    const ad = adLine(input, clean(input.adCopy));
    if (ad) pushBlock(lines, state, "광고에 적힌 내용", [ad]);
    const reasons = reasonSentences(input, clean(input.customReason));
    pushBlock(
      lines,
      state,
      "현장에서 확인한 내용",
      reasons.length ? reasons.map(function (reason) { return "- " + reason; }) : ["- 따로 고른 항목은 없습니다."]
    );
    if (clean(input.memo)) pushBlock(lines, state, "현장 설명", [clean(input.memo)]);
    if (input.nonprofit) {
      lines.push("");
      lines.push(nonprofitNote());
    }
    pushBlock(lines, state, "요청", [
      input.nonprofit
        ? "현장을 확인해 주시고, 「옥외광고물 등의 관리와 옥외광고산업 진흥에 관한 법률」상 허가·신고가 필요한지, 비영리 표시로 허용되는 기간·장소·수량인지를 검토해 주시기 바랍니다. 위반이 확인되면 철거·원상복구 등 필요한 조치를 요청드립니다."
        : "현장을 확인해 주시고, 「옥외광고물 등의 관리와 옥외광고산업 진흥에 관한 법률」에 따른 허가·신고와 표시 방법 준수 여부를 검토해 주시기 바랍니다. 위반이 확인되면 철거·원상복구 등 필요한 조치를 요청드립니다.",
    ]);
    pushBlock(
      lines,
      state,
      "함께 제출할 사진",
      PHOTO_SHOTS.map(function (shot) { return "- " + shot; })
    );
    lines.push("");
    lines.push("이 글은 신고자가 현장에서 본 사실을 정리한 초안입니다. 적법 여부는 관할 시·군·구가 판단합니다.");
    return lines.join("\n");
  }

  function hasTrim(trimmed) {
    return Boolean(trimmed && (trimmed.memo || trimmed.custom || trimmed.ad || trimmed.address || trimmed.hard));
  }

  function trimMessage(trimmed) {
    if (!trimmed) return "";
    if (trimmed.hard) {
      return "900자를 넘겨 본문 끝을 잘랐습니다. 구청 민원용은 잘리지 않습니다.";
    }
    const parts = [];
    if (trimmed.memo) parts.push("추가 설명");
    if (trimmed.custom) parts.push("직접 입력");
    if (trimmed.ad) parts.push("광고 문구");
    if (trimmed.address) parts.push("주소");
    if (!parts.length) return "";
    return "안전신문고 900자에 맞추느라 다음 내용이 짧아졌습니다: " + parts.join(", ") + ". 구청 민원용은 전문이 유지됩니다.";
  }

  function validate(input) {
    const errors = {};
    const data = input || {};
    if (!data.typeId || !findById(AD_TYPES, data.typeId)) {
      errors.typeId = "광고물 종류를 골라 주세요.";
    }
    if (!data.region || REGIONS.indexOf(data.region) === -1) {
      errors.region = "시·도를 골라 주세요.";
    }
    if (clean(data.address).length < 5) {
      errors.address = "동, 도로명, 근처 건물이 드러나게 적어 주세요.";
    }
    const hasFact =
      (data.reasonIds && data.reasonIds.length > 0) ||
      clean(data.customReason).length > 0 ||
      clean(data.memo).length > 0;
    if (!hasFact) {
      errors.facts = "현장에서 본 점을 하나 이상 적거나 골라 주세요.";
    }
    return errors;
  }

  function isBlank(input) {
    const data = input || {};
    return (
      !data.typeId &&
      !clean(data.region) &&
      !clean(data.address) &&
      !(data.spotIds && data.spotIds.length) &&
      !clean(data.count) &&
      !clean(data.size) &&
      !clean(data.advertiser) &&
      !clean(data.phone) &&
      !clean(data.adCopy) &&
      !(data.reasonIds && data.reasonIds.length) &&
      !clean(data.customReason) &&
      !clean(data.memo) &&
      !data.nonprofit
    );
  }

  function buildReport(input, mode) {
    const data = input || {};
    const reportMode = mode === "office" ? "office" : "safety";
    const title = buildTitle(data, data.address);
    let body = "";
    let trimmed = emptyTrim();
    if (reportMode === "office") {
      body = composeOffice(data);
    } else {
      const fitted = fitSafety(data);
      body = fitted.body;
      trimmed = fitted.trimmed;
    }
    const paste = reportMode === "office" ? "제목: " + title + "\n\n" + body : body;
    const limit = reportMode === "safety" ? SAFETY_LIMIT : null;
    return {
      mode: reportMode,
      title: title,
      body: body,
      paste: paste,
      charCount: charLen(paste),
      limit: limit,
      trimmed: trimmed,
      trimmedAny: reportMode === "safety" && hasTrim(trimmed),
      trimMessage: reportMode === "safety" ? trimMessage(trimmed) : "",
      hint: typeOf(data) ? typeOf(data).hint : "",
      errors: validate(data),
      blank: isBlank(data),
    };
  }

  function fileText(report) {
    return [
      report.title,
      "",
      report.body,
      "",
      "접수 안내",
      "안전신문고 앱 또는 https://www.safetyreport.go.kr",
      "생활불편신고 > 불법광고물",
      "본문은 900자, 사진·동영상은 4개까지입니다.",
      "",
      "이 파일은 신고 초안입니다. 안전신문고가 접수를 대신하지 않습니다.",
    ].join("\n");
  }

  return {
    SAFETY_LIMIT: SAFETY_LIMIT,
    REGIONS: REGIONS,
    AD_TYPES: AD_TYPES,
    SPOTS: SPOTS,
    REASONS: REASONS,
    PHOTO_SHOTS: PHOTO_SHOTS,
    charLen: charLen,
    formatObservedAt: formatObservedAt,
    validate: validate,
    isBlank: isBlank,
    buildReport: buildReport,
    fileText: fileText,
    trimMessage: trimMessage,
  };
});
