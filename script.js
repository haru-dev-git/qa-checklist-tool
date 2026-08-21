// ==============================
// QAチェックリスト生成ツール
// MVP Step 1：チェック項目を追加する
// ==============================

// HTMLの要素を取得する
const projectNameInput = document.getElementById("projectNameInput");
const featureNameInput = document.getElementById("featureNameInput");
const featureDescriptionInput = document.getElementById(
  "featureDescriptionInput",
);
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

const {
  calculateSummary,
  createCheckItem,
  createCsvFileName,
  createCsvText,
  loadChecklistState,
  removeChecklistState,
  saveChecklistState,
  validateChecklistInput,
} = window.QaChecklistLogic;

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
  const validation = validateChecklistInput({
    projectName: projectNameInput.value,
    featureName: featureNameInput.value,
    featureDescription: featureDescriptionInput.value,
    category: categorySelect.value,
    checkItemText: checkItemInput.value,
  });

  showMessage("");

  if (!validation.isValid) {
    showMessage(validation.error, "error");
    const inputsByField = {
      projectName: projectNameInput,
      featureName: featureNameInput,
      featureDescription: featureDescriptionInput,
      checkItemText: checkItemInput,
    };
    inputsByField[validation.field].focus();
    return;
  }

  const { category, checkItemText } = validation.values;

  // 追加するチェック項目データを作る
  const newItem = createCheckItem(nextId, category, checkItemText);

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
          aria-label="${escapeHtml(`「${item.text}」を削除`)}"
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
        checked: !item.checked,
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
  const { totalCount, checkedCount, uncheckedCount } =
    calculateSummary(checkItems);

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
    nextId: nextId,
  };

  try {
    saveChecklistState(localStorage, STORAGE_KEY, saveData);
    showMessage("保存しました。", "success");
  } catch {
    showMessage(
      "保存に失敗しました。ブラウザの保存設定と空き容量を確認してください。",
      "error",
    );
  }
}

// localStorageから読み込む関数
function loadFromLocalStorage() {
  try {
    const parsedData = loadChecklistState(localStorage, STORAGE_KEY);

    // 保存データがない場合は何もしない
    if (parsedData === null) {
      return;
    }

    projectNameInput.value = parsedData.projectName;
    featureNameInput.value = parsedData.featureName;
    featureDescriptionInput.value = parsedData.featureDescription;

    checkItems = parsedData.checkItems;
    nextId = parsedData.nextId;

    renderProjectInfo();
    renderChecklist();
    renderSummary();
  } catch {
    showMessage("保存データの読み込みに失敗しました。", "error");
  }
}

// 全データをクリアする関数
function clearAllData() {
  const result = confirm(
    "入力内容とチェックリストをすべて削除します。よろしいですか？",
  );

  if (result === false) {
    return;
  }

  try {
    removeChecklistState(localStorage, STORAGE_KEY);
  } catch {
    showMessage(
      "保存データを削除できませんでした。ブラウザの保存設定を確認してください。",
      "error",
    );
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

  // 画面を更新する
  renderProjectInfo();
  renderChecklist();
  renderSummary();

  showMessage("すべてのデータを削除しました。", "error");
}

// CSVを出力する関数
function exportCsv() {
  const projectName = projectNameInput.value.trim();
  const featureName = featureNameInput.value.trim();
  const featureDescription = featureDescriptionInput.value.trim();

  // メッセージをリセット
  showMessage("");

  // チェック項目がない場合はCSV出力しない
  if (checkItems.length === 0) {
    showMessage("CSV出力するチェック項目がありません。", "error");
    return;
  }

  // CSV文字列に変換する
  const csvText = createCsvText(
    { projectName, featureName, featureDescription },
    checkItems,
  );

  try {
    // Excelで文字化けしにくいようにBOMを付ける
    const bom = "\uFEFF";
    const blob = new Blob([bom + csvText], {
      type: "text/csv;charset=utf-8;",
    });

    // ダウンロード用URLを作る
    const url = URL.createObjectURL(blob);

    // ダウンロード用のaタグを一時的に作る
    const link = document.createElement("a");
    link.href = url;
    link.download = createCsvFileName(projectName, featureName);

    try {
      // aタグをクリックしてダウンロードする
      document.body.appendChild(link);
      link.click();
    } finally {
      // 使い終わったaタグとURLを削除する
      link.remove();
      URL.revokeObjectURL(url);
    }

    showMessage("CSVを出力しました。", "success");
  } catch {
    showMessage(
      "CSVの出力に失敗しました。ブラウザのダウンロード設定を確認してください。",
      "error",
    );
  }
}

// 成功・エラーメッセージの表示を統一する関数
function showMessage(message, type = "error") {
  errorMessage.textContent = message;
  errorMessage.classList.toggle("is-success", type === "success");
}
