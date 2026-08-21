const assert = require("node:assert/strict");
const test = require("node:test");

const {
  calculateSummary,
  createCheckItem,
  createCsvFileName,
  createCsvText,
  escapeCsvValue,
  loadChecklistState,
  parseChecklistState,
  removeChecklistState,
  saveChecklistState,
  validateChecklistInput,
} = require("../app-logic.js");

const validInput = {
  projectName: "ECサイト確認",
  featureName: "ログイン機能",
  featureDescription: "認証の確認",
  category: "正常系",
  checkItemText: "正しい情報でログインできる",
};

const validState = {
  projectName: "ECサイト確認",
  featureName: "ログイン機能",
  featureDescription: "認証の確認",
  checkItems: [
    {
      id: 1,
      category: "正常系",
      text: "正しい情報でログインできる",
      checked: false,
      createdAt: "2026-08-21T00:00:00.000Z",
    },
  ],
  nextId: 2,
};

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

test("入力値をトリムして正常値を受け付ける", () => {
  const result = validateChecklistInput({
    ...validInput,
    projectName: "  ECサイト確認  ",
  });

  assert.equal(result.isValid, true);
  assert.equal(result.error, "");
  assert.equal(result.values.projectName, "ECサイト確認");
});

test("必須項目の未入力を入力順に検出する", () => {
  const cases = [
    ["projectName", "プロジェクト名を入力してください。"],
    ["featureName", "機能名を入力してください。"],
    ["checkItemText", "チェック項目を入力してください。"],
  ];

  for (const [field, message] of cases) {
    const result = validateChecklistInput({ ...validInput, [field]: "   " });
    assert.equal(result.isValid, false);
    assert.equal(result.field, field);
    assert.equal(result.error, message);
  }
});

test("文字数上限ちょうどは受け付ける", () => {
  const result = validateChecklistInput({
    projectName: "あ".repeat(50),
    featureName: "い".repeat(50),
    featureDescription: "う".repeat(300),
    category: "境界値",
    checkItemText: "え".repeat(100),
  });

  assert.equal(result.isValid, true);
});

test("文字数上限を1文字超える値を各項目で拒否する", () => {
  const cases = [
    ["projectName", 51, "プロジェクト名は50文字以内で入力してください。"],
    ["featureName", 51, "機能名は50文字以内で入力してください。"],
    ["featureDescription", 301, "機能概要は300文字以内で入力してください。"],
    ["checkItemText", 101, "チェック項目は100文字以内で入力してください。"],
  ];

  for (const [field, length, message] of cases) {
    const result = validateChecklistInput({
      ...validInput,
      [field]: "あ".repeat(length),
    });
    assert.equal(result.isValid, false);
    assert.equal(result.field, field);
    assert.equal(result.error, message);
  }
});

test("チェック項目を初期状態で生成する", () => {
  assert.deepEqual(
    createCheckItem(3, "異常系", "入力を拒否する", "2026-08-21T00:00:00.000Z"),
    {
      id: 3,
      category: "異常系",
      text: "入力を拒否する",
      checked: false,
      createdAt: "2026-08-21T00:00:00.000Z",
    },
  );
});

test("件数を全件・実施済み・未実施に集計する", () => {
  assert.deepEqual(
    calculateSummary([
      { checked: true },
      { checked: false },
      { checked: true },
    ]),
    {
      totalCount: 3,
      checkedCount: 2,
      uncheckedCount: 1,
    },
  );
});

test("localStorage相当の保存先へ保存し復元する", () => {
  const storage = createMemoryStorage();
  saveChecklistState(storage, "qaChecklistData", validState);

  assert.deepEqual(loadChecklistState(storage, "qaChecklistData"), validState);
});

test("保存データがない場合はnullを返す", () => {
  assert.equal(
    loadChecklistState(createMemoryStorage(), "qaChecklistData"),
    null,
  );
});

test("localStorage相当の保存先からデータを削除する", () => {
  const storage = createMemoryStorage();
  saveChecklistState(storage, "qaChecklistData", validState);
  removeChecklistState(storage, "qaChecklistData");
  assert.equal(loadChecklistState(storage, "qaChecklistData"), null);
});

test("保存先の例外を呼び出し元へ通知する", () => {
  const storageError = new Error("quota exceeded");
  const storage = {
    setItem() {
      throw storageError;
    },
  };

  assert.throws(
    () => saveChecklistState(storage, "qaChecklistData", validState),
    storageError,
  );
});

test("壊れたJSONと不正なデータ構造を拒否する", () => {
  assert.throws(() => parseChecklistState("{"), SyntaxError);
  assert.throws(
    () =>
      parseChecklistState(JSON.stringify({ ...validState, checkItems: {} })),
    /チェック項目/,
  );
});

test("復元時に重複IDを拒否する", () => {
  const duplicate = {
    ...validState,
    checkItems: [validState.checkItems[0], validState.checkItems[0]],
  };
  assert.throws(() => parseChecklistState(JSON.stringify(duplicate)), /ID/);
});

test("復元時に次回IDが小さければ既存最大IDの次へ補正する", () => {
  const restored = parseChecklistState(
    JSON.stringify({ ...validState, nextId: 1 }),
  );
  assert.equal(restored.nextId, 2);
});

test("CSV値のカンマ・改行・ダブルクォートをエスケープする", () => {
  assert.equal(escapeCsvValue('a,"b"\nc'), '"a,""b""\nc"');
  assert.equal(escapeCsvValue(null), '""');
});

test("ヘッダーと全項目を含むCSV本文を生成する", () => {
  const csv = createCsvText(validState, [
    validState.checkItems[0],
    {
      ...validState.checkItems[0],
      id: 2,
      checked: true,
      text: '改行\nと"引用符"',
    },
  ]);
  const lines = csv.split("\n");

  assert.equal(
    lines[0],
    '"プロジェクト名","機能名","機能概要","ID","カテゴリ","チェック項目","実施状態","作成日時"',
  );
  assert.match(csv, /"未実施"/);
  assert.match(csv, /"実施済み"/);
  assert.match(csv, /"改行\nと""引用符"""/);
});

test("CSVファイル名の禁止文字を置換し空欄には既定名を使う", () => {
  assert.equal(
    createCsvFileName("EC/確認", "ログイン:機能"),
    "EC_確認_ログイン_機能_qa_checklist.csv",
  );
  assert.equal(createCsvFileName("", ""), "project_feature_qa_checklist.csv");
});
