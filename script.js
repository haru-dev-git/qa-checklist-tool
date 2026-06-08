// ==============================
// QAチェックリスト生成ツール
// MVP Step 1：チェック項目を追加する
// ==============================

// HTMLの要素を取得する
const projectNameInput = document.getElementById("projectNameInput");
const featureNameInput = document.getElementById("featureNameInput");
const featureDescriptionInput = document.getElementById("featureDescriptionInput");
const categorySelect = document.getElementById("categorySelect");
const checkItemInput = document.getElementById("checkItemInput");
const addItemButton = document.getElementById("addItemButton");
const errorMessage = document.getElementById("errorMessage");
const projectInfo = document.getElementById("projectInfo");
const summaryText = document.getElementById("summaryText");
const checklistContainer = document.getElementById("checklistContainer");
const saveButton = document.getElementById("saveButton");
const exportCsvButton = document.getElementById("exportCsvButton");
const clearButton = document.getElementById("clearButton");

// チェック項目を保存しておく配列
let checkItems = [];

// localStorageで使う保存名
const STORAGE_KEY = "qaChecklistData";
addItemButton.addEventListener("click", function () {
  addCheckItem();
});

// 保存ボタンがクリックされたときの処理
saveButton.addEventListener("click", function () {
  saveToLocalStorage();
});

// 全クリアボタンがクリックされたときの処理
clearButton.addEventListener("click", function () {
  clearAllData();
});

// CSV出力ボタンがクリックされたときの処理
exportCsvButton.addEventListener("click", function () {
  exportCsv();
});

// ページ読み込み時に保存済みデータを読み込む
window.addEventListener("load", function () {
  loadFromLocalStorage();
});

// ID用の連番
let nextId = 1;


// チェック項目を追加する関数
function addCheckItem() {
  // 入力値を取得する
  const projectName = projectNameInput.value.trim();
  const featureName = featureNameInput.value.trim();
  const featureDescription = featureDescriptionInput.value.trim();
  const category = categorySelect.value;
  const checkItemText = checkItemInput.value.trim();

  // エラーメッセージを一度リセットする
  errorMessage.textContent = "";
  errorMessage.style.color = "#dc2626";
  // 入力値チェック
  if (projectName === "") {
    errorMessage.textContent = "プロジェクト名を入力してください。";
    return;
  }

  if (featureName === "") {
    errorMessage.textContent = "機能名を入力してください。";
    return;
  }

  if (checkItemText === "") {
    errorMessage.textContent = "チェック項目を入力してください。";
    return;
  }

  if (projectName.length > 50) {
    errorMessage.textContent = "プロジェクト名は50文字以内で入力してください。";
    return;
  }

  if (featureName.length > 50) {
    errorMessage.textContent = "機能名は50文字以内で入力してください。";
    return;
  }

  if (featureDescription.length > 300) {
    errorMessage.textContent = "機能概要は300文字以内で入力してください。";
    return;
  }

  if (checkItemText.length > 100) {
    errorMessage.textContent = "チェック項目は100文字以内で入力してください。";
    return;
  }

  // 追加するチェック項目データを作る
  const newItem = {
    id: nextId,
    category: category,
    text: checkItemText,
    checked: false,
    createdAt: new Date().toISOString()
  };

  // 配列に追加する
  checkItems.push(newItem);

  // 次のIDを増やす
  nextId++;

  // チェック項目入力欄だけ空にする
  checkItemInput.value = "";

  // 画面を更新する
  renderProjectInfo();
  renderChecklist();
  renderSummary();
}

// プロジェクト情報を画面に表示する関数
function renderProjectInfo() {
  const projectName = projectNameInput.value.trim();
  const featureName = featureNameInput.value.trim();
  const featureDescription = featureDescriptionInput.value.trim();

  projectInfo.innerHTML = `
    <p>プロジェクト名：${escapeHtml(projectName || "未入力")}</p>
    <p>機能名：${escapeHtml(featureName || "未入力")}</p>
    <p>機能概要：${escapeHtml(featureDescription || "未入力")}</p>
  `;
}

// チェックリストを画面に表示する関数
function renderChecklist() {
  // チェック項目が0件の場合
  if (checkItems.length === 0) {
    checklistContainer.innerHTML = "<li>まだチェック項目がありません。</li>";
    return;
  }

  // 一覧を一度空にする
  checklistContainer.innerHTML = "";

  // 配列の中身を1件ずつ画面に表示する
  checkItems.forEach(function (item) {
    const li = document.createElement("li");

    li.innerHTML = `
      <div class="check-item">
        <label class="check-item-label">
          <input
            type="checkbox"
            class="check-toggle"
            data-id="${item.id}"
            ${item.checked ? "checked" : ""}
          >
          <span class="category-label">${escapeHtml(item.category)}</span>
          <span class="check-text ${item.checked ? "is-checked" : ""}">
            ${escapeHtml(item.text)}
          </span>
        </label>

        <button
          type="button"
          class="delete-button"
          data-id="${item.id}"
        >
          削除
        </button>
      </div>
    `;

    checklistContainer.appendChild(li);
  });
}

// チェックリスト内をクリックしたときの処理
checklistContainer.addEventListener("change", function (event) {
  // チェックボックス以外なら何もしない
  if (!event.target.classList.contains("check-toggle")) {
    return;
  }

  const targetId = Number(event.target.dataset.id);

  toggleCheckItem(targetId);
});

// チェックリスト内の削除ボタンをクリックしたときの処理
checklistContainer.addEventListener("click", function (event) {
  // 削除ボタン以外なら何もしない
  if (!event.target.classList.contains("delete-button")) {
    return;
  }

  const targetId = Number(event.target.dataset.id);

  deleteCheckItem(targetId);
});

// チェック状態を切り替える関数
function toggleCheckItem(id) {
  checkItems = checkItems.map(function (item) {
    if (item.id === id) {
      return {
        ...item,
        checked: !item.checked
      };
    }

    return item;
  });

  renderChecklist();
  renderSummary();
}

// チェック項目を削除する関数
function deleteCheckItem(id) {
  checkItems = checkItems.filter(function (item) {
    return item.id !== id;
  });

  renderChecklist();
  renderSummary();
}

// 件数表示を更新する関数
function renderSummary() {
  const totalCount = checkItems.length;
  const checkedCount = checkItems.filter(function (item) {
    return item.checked === true;
  }).length;
  const uncheckedCount = totalCount - checkedCount;

  summaryText.textContent = `全${totalCount}件 / 実施済み${checkedCount}件 / 未実施${uncheckedCount}件`;
}

// HTMLとして解釈されたくない文字を置き換える関数
function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// localStorageに保存する関数
function saveToLocalStorage() {
  const projectName = projectNameInput.value.trim();
  const featureName = featureNameInput.value.trim();
  const featureDescription = featureDescriptionInput.value.trim();

  // 保存するデータを1つのオブジェクトにまとめる
  const saveData = {
    projectName: projectName,
    featureName: featureName,
    featureDescription: featureDescription,
    checkItems: checkItems,
    nextId: nextId
  };

  // JavaScriptのオブジェクトはそのまま保存できないため、JSON文字列に変換する
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));

  errorMessage.textContent = "保存しました。";
  errorMessage.style.color = "#059669";
}

// localStorageから読み込む関数
function loadFromLocalStorage() {
  const savedData = localStorage.getItem(STORAGE_KEY);

  // 保存データがない場合は何もしない
  if (savedData === null) {
    return;
  }

  try {
    const parsedData = JSON.parse(savedData);

    projectNameInput.value = parsedData.projectName || "";
    featureNameInput.value = parsedData.featureName || "";
    featureDescriptionInput.value = parsedData.featureDescription || "";

    checkItems = parsedData.checkItems || [];
    nextId = parsedData.nextId || 1;

    renderProjectInfo();
    renderChecklist();
    renderSummary();
  } catch (error) {
    errorMessage.textContent = "保存データの読み込みに失敗しました。";
    errorMessage.style.color = "#dc2626";
  }
}

// 全データをクリアする関数
function clearAllData() {
  const result = confirm("入力内容とチェックリストをすべて削除します。よろしいですか？");

  if (result === false) {
    return;
  }

  // 入力欄を空にする
  projectNameInput.value = "";
  featureNameInput.value = "";
  featureDescriptionInput.value = "";
  checkItemInput.value = "";
  categorySelect.value = "正常系";

  // 配列とIDを初期化する
  checkItems = [];
  nextId = 1;

  // localStorageからも削除する
  localStorage.removeItem(STORAGE_KEY);

  // 画面を更新する
  renderProjectInfo();
  renderChecklist();
  renderSummary();

  errorMessage.textContent = "すべてのデータを削除しました。";
  errorMessage.style.color = "#dc2626";
}


// CSVを出力する関数
function exportCsv() {
  const projectName = projectNameInput.value.trim();
  const featureName = featureNameInput.value.trim();
  const featureDescription = featureDescriptionInput.value.trim();

  // エラーメッセージをリセット
  errorMessage.textContent = "";
  errorMessage.style.color = "#dc2626";

  // チェック項目がない場合はCSV出力しない
  if (checkItems.length === 0) {
    errorMessage.textContent = "CSV出力するチェック項目がありません。";
    return;
  }

  // CSVのヘッダー行
  const headers = [
    "プロジェクト名",
    "機能名",
    "機能概要",
    "ID",
    "カテゴリ",
    "チェック項目",
    "実施状態",
    "作成日時"
  ];

  // チェック項目をCSV用の行に変換する
  const rows = checkItems.map(function (item) {
    return [
      projectName,
      featureName,
      featureDescription,
      item.id,
      item.category,
      item.text,
      item.checked ? "実施済み" : "未実施",
      item.createdAt
    ];
  });

  // ヘッダーとデータ行をまとめる
  const csvArray = [headers, ...rows];

  // CSV文字列に変換する
  const csvText = csvArray
    .map(function (row) {
      return row.map(escapeCsvValue).join(",");
    })
    .join("\n");

  // Excelで文字化けしにくいようにBOMを付ける
  const bom = "\uFEFF";
  const blob = new Blob([bom + csvText], {
    type: "text/csv;charset=utf-8;"
  });

  // ダウンロード用URLを作る
  const url = URL.createObjectURL(blob);

  // ダウンロード用のaタグを一時的に作る
  const link = document.createElement("a");
  link.href = url;
  link.download = createCsvFileName(projectName, featureName);

  // aタグをクリックしてダウンロードする
  document.body.appendChild(link);
  link.click();

  // 使い終わったaタグとURLを削除する
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  errorMessage.textContent = "CSVを出力しました。";
  errorMessage.style.color = "#059669";
}

// CSVの1項目を安全な形式に変換する関数
function escapeCsvValue(value) {
  const text = String(value ?? "");

  // ダブルクォーテーションは2つに増やす
  const escapedText = text.replaceAll('"', '""');

  // カンマ、改行、ダブルクォーテーション対策として全体を"で囲む
  return `"${escapedText}"`;
}

// CSVファイル名を作る関数
function createCsvFileName(projectName, featureName) {
  const safeProjectName = sanitizeFileName(projectName || "project");
  const safeFeatureName = sanitizeFileName(featureName || "feature");

  return `${safeProjectName}_${safeFeatureName}_qa_checklist.csv`;
}

// ファイル名に使いにくい文字を置き換える関数
function sanitizeFileName(fileName) {
  return fileName.replace(/[\\/:*?"<>|]/g, "_");
}