(function () {
  const api = globalThis.ReportDraft;
  const form = document.querySelector("#draftForm");
  const storageKey = "outdoor-ad-report-v1";
  let mode = "safety";
  let clearArmed = false;
  let statusTimer = 0;

  const els = {
    typeChoices: document.querySelector("#typeChoices"),
    spotChoices: document.querySelector("#spotChoices"),
    reasonChoices: document.querySelector("#reasonChoices"),
    region: document.querySelector("#region"),
    typeHint: document.querySelector("#typeHint"),
    paper: document.querySelector("#paper"),
    paperKicker: document.querySelector("#paperKicker"),
    paperTitle: document.querySelector("#paperTitle"),
    paperBody: document.querySelector("#paperBody"),
    emptyState: document.querySelector("#emptyState"),
    charCount: document.querySelector("#charCount"),
    charMeter: document.querySelector("#charMeter"),
    trimNote: document.querySelector("#trimNote"),
    exampleBanner: document.querySelector("#exampleBanner"),
    status: document.querySelector("#status"),
    copyReport: document.querySelector("#copyReport"),
    copyTitle: document.querySelector("#copyTitle"),
    downloadReport: document.querySelector("#downloadReport"),
    dockCopy: document.querySelector("#dockCopy"),
    dockCount: document.querySelector("#dockCount"),
    dockHint: document.querySelector("#dockHint"),
    photoShots: document.querySelector("#photoShots"),
    clearForm: document.querySelector("#clearForm"),
  };

  function choiceList(container, items, type, name) {
    container.replaceChildren();
    items.forEach(function (item) {
      const label = document.createElement("label");
      label.className = type === "radio" ? "choice" : "chip";
      const input = document.createElement("input");
      input.type = type;
      input.name = name;
      input.value = item.id;
      const span = document.createElement("span");
      span.textContent = item.label;
      label.append(input, span);
      container.append(label);
    });
  }

  function buildForm() {
    choiceList(els.typeChoices, api.AD_TYPES, "radio", "typeId");
    choiceList(els.spotChoices, api.SPOTS, "checkbox", "spotIds");
    choiceList(els.reasonChoices, api.REASONS, "checkbox", "reasonIds");
    api.REGIONS.forEach(function (region) {
      const option = document.createElement("option");
      option.value = region;
      option.textContent = region;
      els.region.append(option);
    });
    api.PHOTO_SHOTS.forEach(function (shot, index) {
      const label = document.createElement("label");
      label.className = "shot";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.name = "photo" + index;
      const span = document.createElement("span");
      span.textContent = shot;
      label.append(input, span);
      els.photoShots.append(label);
    });
  }

  function checkedValues(name) {
    return Array.from(form.querySelectorAll('input[name="' + name + '"]:checked')).map(function (input) {
      return input.value;
    });
  }

  function readForm() {
    const data = new FormData(form);
    return {
      typeId: data.get("typeId") || "",
      region: data.get("region") || "",
      address: data.get("address") || "",
      spotIds: checkedValues("spotIds"),
      observedAt: data.get("observedAt") || "",
      count: data.get("count") || "",
      size: data.get("size") || "",
      advertiser: data.get("advertiser") || "",
      phone: data.get("phone") || "",
      adCopy: data.get("adCopy") || "",
      reasonIds: checkedValues("reasonIds"),
      customReason: data.get("customReason") || "",
      memo: data.get("memo") || "",
      nonprofit: data.get("nonprofit") === "on",
    };
  }

  function setChecked(name, values) {
    const selected = new Set(values || []);
    form.querySelectorAll('input[name="' + name + '"]').forEach(function (input) {
      input.checked = selected.has(input.value);
    });
  }

  function writeForm(input) {
    const data = input || {};
    setChecked("typeId", data.typeId ? [data.typeId] : []);
    els.region.value = data.region || "";
    form.elements.address.value = data.address || "";
    setChecked("spotIds", data.spotIds);
    form.elements.observedAt.value = data.observedAt || "";
    form.elements.count.value = data.count || "";
    form.elements.size.value = data.size || "";
    form.elements.advertiser.value = data.advertiser || "";
    form.elements.phone.value = data.phone || "";
    form.elements.adCopy.value = data.adCopy || "";
    setChecked("reasonIds", data.reasonIds);
    form.elements.customReason.value = data.customReason || "";
    form.elements.memo.value = data.memo || "";
    form.elements.nonprofit.checked = Boolean(data.nonprofit);
  }

  function nowLocalValue() {
    const now = new Date();
    const pad = function (value) {
      return String(value).padStart(2, "0");
    };
    return (
      now.getFullYear() +
      "-" +
      pad(now.getMonth() + 1) +
      "-" +
      pad(now.getDate()) +
      "T" +
      pad(now.getHours()) +
      ":" +
      pad(now.getMinutes())
    );
  }

  function exampleInput() {
    return {
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
  }

  function sameDraft(left, right) {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  function photoState() {
    return Array.from(form.querySelectorAll('input[name^="photo"]')).map(function (input) {
      return input.checked;
    });
  }

  function restorePhotos(values) {
    form.querySelectorAll('input[name^="photo"]').forEach(function (input, index) {
      input.checked = Boolean(values && values[index]);
    });
  }

  function persist() {
    try {
      const payload = { mode: mode, input: readForm(), photos: photoState() };
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (error) {
      /* 저장을 못해도 글 작성은 계속됩니다. */
    }
  }

  function restore() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "");
      if (!saved || !saved.input) return false;
      writeForm(saved.input);
      restorePhotos(saved.photos);
      if (saved.mode === "office" || saved.mode === "safety") mode = saved.mode;
      return true;
    } catch (error) {
      return false;
    }
  }

  function showErrors(errors) {
    document.querySelectorAll("[data-error-for]").forEach(function (node) {
      node.textContent = errors[node.dataset.errorFor] || "";
    });
  }

  function setStatus(message) {
    els.status.textContent = message;
    window.clearTimeout(statusTimer);
    statusTimer = window.setTimeout(function () {
      els.status.textContent = "";
    }, 1800);
  }

  async function writeClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const area = document.createElement("textarea");
    area.value = text;
    document.body.append(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }

  function currentReport() {
    return api.buildReport(readForm(), mode);
  }

  function render() {
    const input = readForm();
    const report = api.buildReport(input, mode);
    const ready = Object.keys(report.errors).length === 0;
    document.querySelectorAll("[data-mode]").forEach(function (button) {
      button.setAttribute("aria-pressed", String(button.dataset.mode === mode));
    });

    if (report.hint) {
      els.typeHint.hidden = false;
      els.typeHint.textContent = report.hint;
    } else {
      els.typeHint.hidden = true;
      els.typeHint.textContent = "";
    }

    els.exampleBanner.hidden = !sameDraft(input, exampleInput());
    els.trimNote.hidden = !report.trimMessage;
    els.trimNote.textContent = report.trimMessage;

    els.emptyState.hidden = !report.blank;
    els.paper.hidden = report.blank;
    els.paperKicker.textContent = mode === "office" ? "구청 민원에 넣을 글" : "안전신문고에 붙여 넣을 글";
    els.paperTitle.textContent = report.title;
    els.paperBody.textContent = report.body;

    const countLabel = report.limit ? report.charCount + " / " + report.limit + "자" : report.charCount + "자 · 분량 제한 없음";
    els.charCount.textContent = countLabel;
    els.dockCount.textContent = countLabel;
    const ratio = report.limit ? Math.min(100, (report.charCount / report.limit) * 100) : 100;
    els.charMeter.style.width = ratio + "%";
    els.charMeter.classList.toggle("is-tight", Boolean(report.limit && report.charCount > 700));
    els.charMeter.parentElement.hidden = !report.limit;

    const missing = ready ? "복사할 수 있습니다" : "필수 항목을 채우면 복사가 열립니다";
    els.dockHint.textContent = report.blank ? "종류와 위치를 적어 주세요" : missing;
    [els.copyReport, els.copyTitle, els.downloadReport, els.dockCopy].forEach(function (button) {
      button.disabled = !ready;
    });
    showErrors(report.blank ? {} : report.errors);
    persist();
  }

  async function copyReport() {
    const report = currentReport();
    if (Object.keys(report.errors).length) {
      showErrors(report.errors);
      setStatus("비어 있는 항목을 먼저 채워 주세요");
      return;
    }
    try {
      await writeClipboard(report.paste);
      setStatus("신고글을 복사했습니다");
    } catch (error) {
      setStatus("복사에 실패했습니다. 글을 길게 눌러 선택해 주세요");
    }
  }

  async function copyTitle() {
    const report = currentReport();
    if (Object.keys(report.errors).length) return;
    try {
      await writeClipboard(report.title);
      setStatus("제목을 복사했습니다");
    } catch (error) {
      setStatus("제목 복사에 실패했습니다");
    }
  }

  function downloadReport() {
    const report = currentReport();
    if (Object.keys(report.errors).length) return;
    const blob = new Blob([api.fileText(report)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const day = (readForm().observedAt || nowLocalValue()).slice(0, 10).replaceAll("-", "");
    link.href = url;
    link.download = "옥외광고-신고초안-" + day + ".txt";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus("텍스트 파일을 저장했습니다");
  }

  function fillExample() {
    writeForm(exampleInput());
    render();
    document.querySelector(".preview").scrollIntoView({ block: "start" });
  }

  function clearDraft() {
    if (!clearArmed) {
      clearArmed = true;
      els.clearForm.textContent = "한번 더 누르면 지웁니다";
      window.setTimeout(function () {
        clearArmed = false;
        els.clearForm.textContent = "지우기";
      }, 2500);
      return;
    }
    clearArmed = false;
    els.clearForm.textContent = "지우기";
    writeForm({ observedAt: nowLocalValue() });
    restorePhotos([]);
    mode = "safety";
    render();
  }

  buildForm();
  if (!restore()) writeForm({ observedAt: nowLocalValue() });
  form.addEventListener("input", render);
  form.addEventListener("change", render);
  form.addEventListener("submit", function (event) {
    event.preventDefault();
  });
  form.addEventListener("keydown", function (event) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      copyReport();
    }
  });
  document.querySelectorAll("[data-mode]").forEach(function (button) {
    button.addEventListener("click", function () {
      mode = button.dataset.mode;
      render();
    });
  });
  document.querySelector("#fillExample").addEventListener("click", fillExample);
  els.clearForm.addEventListener("click", clearDraft);
  els.copyReport.addEventListener("click", copyReport);
  els.dockCopy.addEventListener("click", copyReport);
  els.copyTitle.addEventListener("click", copyTitle);
  els.downloadReport.addEventListener("click", downloadReport);
  render();
})();
