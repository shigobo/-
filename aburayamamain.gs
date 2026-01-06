/**
 * 入力シート作成ボタンクリック
 */
function btnCreateSheet_Click() {
  PriceCalculationLibrary.Configs.initial(CONFIG);
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  //入力シート作成
  const sheet = PriceCalculationLibrary.InputMain.createSheet(ss);

  // 油山Aタイプの既存住户に旧価格を適用
  if (sheet) {
    applyLegacyPriceForAburayama_(sheet);
  }
}

/**
 * 入力シートの計算
 */
function btnCalk_Click() {
  //表示中のシートが対象
  const sheet = SpreadsheetApp.getActiveSheet();
  PriceCalculationLibrary.Configs.initial(CONFIG);

  // 油山Aタイプの既存住户に旧価格を適用（計算前に実行）
  applyLegacyPriceForAburayama_(sheet);

  const facility = sheet.getRange(PriceCalculationLibrary.InputBase.posFacility).getValue();
  PriceCalculationLibrary.Configs.initialFacilityObj(facility);
  PriceCalculationLibrary.Calculation.calc(sheet);
}

/**
 * 実績確定ボタン押下時に入力シートをチェックする
 */
function checkInput(){
  PriceCalculationLibrary.Configs.initial(CONFIG);
  //表示中のシートが対象
  const sheet = SpreadsheetApp.getActiveSheet();

  // 油山Aタイプの既存住户に旧価格を適用（チェック前に実行）
  applyLegacyPriceForAburayama_(sheet);

  const errorList = PriceCalculationLibrary.Input.checkInput(sheet);
  if (errorList.length !== 0) {
    Browser.msgBox(errorList.join("\\n"), Browser.Buttons.OK);
    return;
  }

  //入力シートの計算
  const facility = sheet.getRange(PriceCalculationLibrary.InputBase.posFacility).getValue();
  PriceCalculationLibrary.Configs.initialFacilityObj(facility);
  PriceCalculationLibrary.Calculation.calc(sheet);
  Browser.msgBox('伝送しました', Browser.Buttons.OK);
}

// ============================================================================
// 油山Aタイプ旧価格適用機能
// ============================================================================

/**
 * 油山Aタイプの既存住户（白名单ID）に旧価格を適用する
 *
 * 処理内容：
 *   1. 施設が「油山」であることを確認
 *   2. 白名单に登録されたIDの行を特定
 *   3. 請求区分が「有料老人ホーム油山A」の行に対して
 *      - 請求区分を「有料老人ホーム油山旧A」に変更
 *      - 各日額（家賃、食費、管理費）を旧価格に更新
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - 入力シート
 * @private
 */
function applyLegacyPriceForAburayama_(sheet) {
  const legacyConfig = CONFIG.aburayamaLegacyPrice;

  // 設定が存在しない場合は処理をスキップ
  if (!legacyConfig) {
    return;
  }

  // 対象施設のチェック
  const facility = sheet.getRange(PriceCalculationLibrary.InputBase.posFacility).getValue();
  if (facility !== legacyConfig.facilityName) {
    return;
  }

  // 白名单が空の場合は処理をスキップ
  const whitelistIds = legacyConfig.whitelistIds || [];
  if (whitelistIds.length === 0) {
    return;
  }

  // 入力シートのデータを取得
  const inputValues = PriceCalculationLibrary.Input.getInputSheetValues(sheet);
  if (!inputValues || inputValues.length === 0) {
    return;
  }

  // 旧価格情報をマスタから取得
  const legacyPriceRow = PriceCalculationLibrary.PriceMaster.getPriceListByInvoiceKbn(
    legacyConfig.legacyInvoiceKbn
  );
  if (!legacyPriceRow) {
    console.error(
      '旧価格の請求区分がマスタに見つかりません: ' + legacyConfig.legacyInvoiceKbn
    );
    return;
  }

  // 価格情報を抽出
  const legacyPrices = extractLegacyPrices_(legacyPriceRow);

  // 白名单をMap化して高速検索を可能に
  const whitelistMap = createWhitelistMap_(whitelistIds);

  // 対象行に旧価格を適用
  const updateResult = applyLegacyPricesToRows_(
    inputValues,
    whitelistMap,
    legacyConfig.currentInvoiceKbn,
    legacyConfig.legacyInvoiceKbn,
    legacyPrices
  );

  // 変更があった場合のみシートを更新
  if (updateResult.hasChanges) {
    const startRow = PriceCalculationLibrary.InputBase.rowStart;
    sheet.getRange(startRow, 1, inputValues.length, inputValues[0].length).setValues(inputValues);
    console.log('旧価格適用完了: ' + updateResult.updatedCount + '件');
  }
}

/**
 * 旧価格行から各日額を抽出する
 *
 * @param {Array} priceRow - マスタから取得した価格行
 * @returns {Object} 各日額を格納したオブジェクト
 * @private
 */
function extractLegacyPrices_(priceRow) {
  const priceColIndex = PriceCalculationLibrary.PriceMaster.colIndex['priceTablePerInvoiceKbn'];
  return {
    rent: priceRow[priceColIndex['家賃（日額）']],
    meal: priceRow[priceColIndex['食費の日額（税抜）']],
    managementGeneral: priceRow[priceColIndex['管理費の日額（税抜）']],
    managementWelfare: priceRow[priceColIndex['管理費の日額（税抜）生保']],
  };
}

/**
 * 白名单IDの配列をMapに変換する
 *
 * @param {Array<string|number>} whitelistIds - 白名单ID配列
 * @returns {Object} ID検索用Map
 * @private
 */
function createWhitelistMap_(whitelistIds) {
  const map = {};
  whitelistIds.forEach(function(id) {
    map[String(id)] = true;
  });
  return map;
}

/**
 * 対象行に旧価格を適用する
 *
 * @param {Array<Array>} inputValues - 入力シートの全行データ
 * @param {Object} whitelistMap - 白名单Map
 * @param {string} currentInvoiceKbn - 現在の請求区分名（新価格）
 * @param {string} legacyInvoiceKbn - 旧価格の請求区分名
 * @param {Object} legacyPrices - 旧価格オブジェクト
 * @returns {Object} 更新結果 { hasChanges: boolean, updatedCount: number }
 * @private
 */
function applyLegacyPricesToRows_(
  inputValues,
  whitelistMap,
  currentInvoiceKbn,
  legacyInvoiceKbn,
  legacyPrices
) {
  const COL = PriceCalculationLibrary.InputBase.ColIndex;
  let updatedCount = 0;
  const appliedIds = [];
  const skippedDetails = [];

  console.log('============================================================');
  console.log('【旧価格適用処理開始】');
  console.log('対象請求区分: ' + currentInvoiceKbn + ' → ' + legacyInvoiceKbn);
  console.log('白名单登録数: ' + Object.keys(whitelistMap).length + '件');
  console.log('============================================================');

  for (let i = 0; i < inputValues.length; i++) {
    const row = inputValues[i];
    const userId = String(row[COL['ID']]).trim();  // 空白を除去
    const userName = row[COL['氏名']] || '';
    const invoiceKbn = row[COL['請求区分']];

    // 白名单に含まれないIDはスキップ
    if (!whitelistMap[userId]) {
      continue;
    }

    // 請求区分が新価格でない場合はスキップ（既に旧価格適用済み等）
    if (invoiceKbn !== currentInvoiceKbn) {
      skippedDetails.push({
        id: userId,
        name: userName,
        reason: '請求区分が対象外（' + invoiceKbn + '）'
      });
      continue;
    }

    // 請求区分を旧価格に変更
    row[COL['請求区分']] = legacyInvoiceKbn;

    // 各日額を旧価格に更新
    row[COL['家賃（日額）']] = legacyPrices.rent;
    row[COL['食費（日額）']] = legacyPrices.meal;

    // 管理費は生保/非生保で異なる
    const isWelfare = row[COL['生保']] === '〇';
    row[COL['管理費（日額）']] = isWelfare
      ? legacyPrices.managementWelfare
      : legacyPrices.managementGeneral;

    appliedIds.push({ id: userId, name: userName });
    updatedCount++;
  }

  // 詳細ログ出力
  console.log('------------------------------------------------------------');
  console.log('【旧価格適用済み】' + appliedIds.length + '件');
  appliedIds.forEach(function(item) {
    console.log('  ✓ ID: ' + item.id + ' / ' + item.name);
  });

  if (skippedDetails.length > 0) {
    console.log('------------------------------------------------------------');
    console.log('【白名单登録済みだが適用スキップ】' + skippedDetails.length + '件');
    skippedDetails.forEach(function(item) {
      console.log('  ✗ ID: ' + item.id + ' / ' + item.name + ' - ' + item.reason);
    });
  }
  console.log('============================================================');

  return {
    hasChanges: updatedCount > 0,
    updatedCount: updatedCount,
  };
}

// ============================================================================
// 油山Aタイプ旧利用者ID抽出ユーティリティ
// ============================================================================




/**
 * 入力シートから油山Aタイプの旧利用者IDを抽出する
 *
 * 【使い方】
 * 1. 油山の入力シートを開いた状態でこの関数を実行
 * 2. 実行ログに出力されたID一覧をコピー
 * 3. CONFIG.aburayamaLegacyPrice.whitelistIds に貼り付け
 *
 * ※居室番号から価格マスタを参照してAタイプかどうかを判定する（P列は参照しない）
 */
function extractLegacyIdsFromInputSheet() {
  PriceCalculationLibrary.Configs.initial(CONFIG);

  const sheet = SpreadsheetApp.getActiveSheet();
  const FACILITY_NAME = '油山';
  const TARGET_INVOICE_KBN = '有料老人ホーム油山A';
  const CUTOFF_DATE = new Date(2025, 11, 19); // 2025年12月19日

  // 入力シートのデータを取得
  const inputValues = PriceCalculationLibrary.Input.getInputSheetValues(sheet);
  if (!inputValues || inputValues.length === 0) {
    console.log('【結果】入力シートにデータがありません');
    return [];
  }

  const COL = PriceCalculationLibrary.InputBase.ColIndex;
  const legacyIds = [];
  const aTypeDetails = [];
  const bTypeDetails = [];

  console.log('============================================================');
  console.log('【入力シートから旧利用者ID抽出】');
  console.log('施設: ' + FACILITY_NAME);
  console.log('対象: 居室番号からマスタ参照し「' + TARGET_INVOICE_KBN + '」の利用者');
  console.log('基準日: 2024/12/19 以前入居');
  console.log('============================================================');

  for (let i = 0; i < inputValues.length; i++) {
    const row = inputValues[i];
    const userId = String(row[COL['ID']]).trim();
    const userName = row[COL['利用者名']] || '';
    const roomNo = row[COL['居室番号']] || '';
    const moveInDateRaw = row[COL['入居日']];

    // 居室番号からマスタを参照して請求区分を取得
    const invoiceKbnFromMaster = PriceCalculationLibrary.PriceMaster.getInvoiceKbnByRoom(
      FACILITY_NAME,
      roomNo
    );

    // Aタイプでない場合はスキップ
    if (invoiceKbnFromMaster !== TARGET_INVOICE_KBN) {
      bTypeDetails.push('  [B] ID: ' + userId + ' / ' + userName + ' - 居室: ' + roomNo + ' → ' + invoiceKbnFromMaster);
      continue;
    }

    // 入居日を取得
    let moveInDate = null;
    if (moveInDateRaw instanceof Date) {
      moveInDate = moveInDateRaw;
    } else if (moveInDateRaw) {
      moveInDate = new Date(moveInDateRaw);
    }

    if (!moveInDate || isNaN(moveInDate.getTime())) {
      aTypeDetails.push('  ? ID: ' + userId + ' / ' + userName + ' - 居室: ' + roomNo + ' - 入居日不明');
      continue;
    }

    // 入居日が基準日以前かチェック
    const moveInDateOnly = new Date(moveInDate.getFullYear(), moveInDate.getMonth(), moveInDate.getDate());
    const cutoffDateOnly = new Date(CUTOFF_DATE.getFullYear(), CUTOFF_DATE.getMonth(), CUTOFF_DATE.getDate());
    const moveInDateStr = Utilities.formatDate(moveInDate, 'Asia/Tokyo', 'yyyy/MM/dd');

    if (moveInDateOnly <= cutoffDateOnly) {
      legacyIds.push(userId);
      aTypeDetails.push('  ✓ ID: ' + userId + ' / ' + userName + ' - 居室: ' + roomNo + ' - 入居日: ' + moveInDateStr + ' → 旧価格対象');
    } else {
      aTypeDetails.push('  ✗ ID: ' + userId + ' / ' + userName + ' - 居室: ' + roomNo + ' - 入居日: ' + moveInDateStr + ' → 新価格（12/19以降入居）');
    }
  }

  // 結果出力
  console.log('------------------------------------------------------------');
  console.log('【Aタイプ利用者】');
  aTypeDetails.forEach(function(d) { console.log(d); });
  console.log('------------------------------------------------------------');
  console.log('【Bタイプ利用者（対象外）】');
  bTypeDetails.forEach(function(d) { console.log(d); });
  console.log('------------------------------------------------------------');
  console.log('【抽出結果】旧価格適用対象: ' + legacyIds.length + '名');

  if (legacyIds.length > 0) {
    legacyIds.sort(function(a, b) { return Number(a) - Number(b); });
    console.log('【以下をCONFIG.aburayamaLegacyPrice.whitelistIdsにコピー】');
    console.log("'" + legacyIds.join("',\n'") + "',");
  }
  console.log('============================================================');

  return legacyIds;
}

/**
 * 旧価格適用対象の利用者をフィルタする
 * @private
 */
function filterLegacyAburayamaUsers_(userList, facilityName, targetInvoiceKbn, cutoffDate) {
  const legacyIds = [];
  const cutoffDateOnly = new Date(
    cutoffDate.getFullYear(),
    cutoffDate.getMonth(),
    cutoffDate.getDate()
  );

  userList.forEach(function(user) {
    // 入居日がない場合はスキップ
    if (!user['入居日']) {
      return;
    }

    // 入居日が基準日以前かチェック（日付単位で比較）
    const moveInDate = user['入居日'];
    const moveInDateOnly = new Date(
      moveInDate.getFullYear(),
      moveInDate.getMonth(),
      moveInDate.getDate()
    );
    if (moveInDateOnly > cutoffDateOnly) {
      return;
    }

    // 現在の請求区分をチェック
    const roomNo = user['居室番号'];
    const invoiceKbn = PriceCalculationLibrary.PriceMaster.getInvoiceKbnByRoom(
      facilityName,
      roomNo
    );
    if (invoiceKbn !== targetInvoiceKbn) {
      return;
    }

    legacyIds.push(user['あおぞらID']);
  });

  // IDを昇順ソート
  legacyIds.sort(function(a, b) {
    return Number(a) - Number(b);
  });

  return legacyIds;
}

/**
 * 抽出結果をログに出力する
 * @private
 */
function outputExtractionResult_(ids, cutoffDate) {
  const dateStr = Utilities.formatDate(cutoffDate, 'Asia/Tokyo', 'yyyy/MM/dd');

  console.log('============================================================');
  console.log('油山Aタイプ旧価格適用対象者抽出結果');
  console.log('基準日: ' + dateStr + ' 以前入居');
  console.log('対象者数: ' + ids.length + '名');
  console.log('============================================================');

  if (ids.length > 0) {
    console.log('【以下をCONFIG.aburayamaLegacyPrice.whitelistIdsにコピー】');
    console.log("'" + ids.join("',\n'") + "',");
  }

  console.log('============================================================');
}
