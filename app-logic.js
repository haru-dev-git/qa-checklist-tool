const QaChecklistLogic = (() => {
  const LIMITS = Object.freeze({
    projectName: 50,
    featureName: 50,
    featureDescription: 300,
    checkItemText: 100,
  });

  const CSV_HEADERS = Object.freeze([
    "プロジェクト名",
    "機能名",
    "機能概要",
    "ID",
    "カテゴリ",
    "チェック項目",
    "実施状態",
    "作成日時",
  ]);

  function normalizeChecklistInput(input = {}) {
    return {
      projectName: String(input.projectName ?? "").trim(),
      featureName: String(input.featureName ?? "").trim(),
      featureDescription: String(input.featureDescription ?? "").trim(),
      category: String(input.category ?? "").trim(),
      checkItemText: String(input.checkItemText ?? "").trim(),
    };
  }

  function validateChecklistInput(input) {
    const values = normalizeChecklistInput(input);

    const validations = [
      [
        !values.projectName,
        "projectName",
        "プロジェクト名を入力してください。",
      ],
      [!values.featureName, "featureName", "機能名を入力してください。"],
      [
        !values.checkItemText,
        "checkItemText",
        "チェック項目を入力してください。",
      ],
      [
        values.projectName.length > LIMITS.projectName,
        "projectName",
        "プロジェクト名は50文字以内で入力してください。",
      ],
      [
        values.featureName.length > LIMITS.featureName,
        "featureName",
        "機能名は50文字以内で入力してください。",
      ],
      [
        values.featureDescription.length > LIMITS.featureDescription,
        "featureDescription",
        "機能概要は300文字以内で入力してください。",
      ],
      [
        values.checkItemText.length > LIMITS.checkItemText,
        "checkItemText",
        "チェック項目は100文字以内で入力してください。",
      ],
    ];

    const failedValidation = validations.find(([failed]) => failed);

    if (failedValidation) {
      return {
        isValid: false,
        field: failedValidation[1],
        error: failedValidation[2],
        values,
      };
    }

    return { isValid: true, field: null, error: "", values };
  }

  function createCheckItem(
    id,
    category,
    text,
    createdAt = new Date().toISOString(),
  ) {
    if (!Number.isSafeInteger(id) || id < 1) {
      throw new TypeError("チェック項目IDは1以上の整数である必要があります。");
    }

    return {
      id,
      category: String(category),
      text: String(text),
      checked: false,
      createdAt: String(createdAt),
    };
  }

  function calculateSummary(checkItems) {
    const totalCount = checkItems.length;
    const checkedCount = checkItems.filter(
      (item) => item.checked === true,
    ).length;

    return {
      totalCount,
      checkedCount,
      uncheckedCount: totalCount - checkedCount,
    };
  }

  function normalizeStoredState(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError("保存データの形式が正しくありません。");
    }

    const stringFields = ["projectName", "featureName", "featureDescription"];
    for (const field of stringFields) {
      if (typeof value[field] !== "string") {
        throw new TypeError("保存データの基本情報が正しくありません。");
      }
    }

    if (!Array.isArray(value.checkItems)) {
      throw new TypeError("保存データのチェック項目が正しくありません。");
    }

    const usedIds = new Set();
    const checkItems = value.checkItems.map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        throw new TypeError("保存データのチェック項目が正しくありません。");
      }

      if (
        !Number.isSafeInteger(item.id) ||
        item.id < 1 ||
        usedIds.has(item.id)
      ) {
        throw new TypeError("保存データのチェック項目IDが正しくありません。");
      }

      if (
        typeof item.category !== "string" ||
        typeof item.text !== "string" ||
        typeof item.checked !== "boolean" ||
        typeof item.createdAt !== "string"
      ) {
        throw new TypeError("保存データのチェック項目が正しくありません。");
      }

      usedIds.add(item.id);
      return {
        id: item.id,
        category: item.category,
        text: item.text,
        checked: item.checked,
        createdAt: item.createdAt,
      };
    });

    const minimumNextId =
      checkItems.reduce((maxId, item) => Math.max(maxId, item.id), 0) + 1;
    const nextId =
      Number.isSafeInteger(value.nextId) && value.nextId >= minimumNextId
        ? value.nextId
        : minimumNextId;

    return {
      projectName: value.projectName,
      featureName: value.featureName,
      featureDescription: value.featureDescription,
      checkItems,
      nextId,
    };
  }

  function serializeChecklistState(state) {
    return JSON.stringify(normalizeStoredState(state));
  }

  function parseChecklistState(serializedState) {
    return normalizeStoredState(JSON.parse(serializedState));
  }

  function saveChecklistState(storage, key, state) {
    storage.setItem(key, serializeChecklistState(state));
  }

  function loadChecklistState(storage, key) {
    const serializedState = storage.getItem(key);
    return serializedState === null
      ? null
      : parseChecklistState(serializedState);
  }

  function removeChecklistState(storage, key) {
    storage.removeItem(key);
  }

  function escapeCsvValue(value) {
    const text = String(value ?? "");
    return `"${text.replaceAll('"', '""')}"`;
  }

  function createCsvText(project, checkItems) {
    const rows = checkItems.map((item) => [
      project.projectName,
      project.featureName,
      project.featureDescription,
      item.id,
      item.category,
      item.text,
      item.checked ? "実施済み" : "未実施",
      item.createdAt,
    ]);

    return [CSV_HEADERS, ...rows]
      .map((row) => row.map(escapeCsvValue).join(","))
      .join("\n");
  }

  function sanitizeFileName(fileName) {
    return String(fileName).replace(/[\\/:*?"<>|]/g, "_");
  }

  function createCsvFileName(projectName, featureName) {
    const safeProjectName = sanitizeFileName(projectName || "project");
    const safeFeatureName = sanitizeFileName(featureName || "feature");
    return `${safeProjectName}_${safeFeatureName}_qa_checklist.csv`;
  }

  return Object.freeze({
    LIMITS,
    calculateSummary,
    createCheckItem,
    createCsvFileName,
    createCsvText,
    escapeCsvValue,
    loadChecklistState,
    normalizeChecklistInput,
    parseChecklistState,
    removeChecklistState,
    saveChecklistState,
    sanitizeFileName,
    serializeChecklistState,
    validateChecklistInput,
  });
})();

if (typeof window !== "undefined") {
  window.QaChecklistLogic = QaChecklistLogic;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = QaChecklistLogic;
}
