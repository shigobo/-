//明細書関連
var DetailedStatement = {};

//*************************************
//定義
//*************************************
DetailedStatement.baseSheetName = "有料";

//明細書BASEの範囲
DetailedStatement.baseStartRow = 1;
DetailedStatement.baseStartCol = 1;

DetailedStatement.detailedStatementRowCount = 30; //余白を考慮して調整
DetailedStatement.detailedStatementColCount = 7;

//集計シートに仮作成するシート
DetailedStatement.tmpDetailedStatementSheetName = "tmp明細書ひながた【有料】";
DetailedStatement.tmpDetailedStatementOutputSheetName = "tmp明細書出力【有料】";

/**
 * 明細書作成の準備をする
 * 
 * @param {object} ss - 明細書を作成するSSのオブジェクト
 */
DetailedStatement.initToCreateDetailedStatement = function(ss) {
  //明細書ひながたシート
  let tmpDetailedStatementSheet = ss.getSheetByName(DetailedStatement.tmpDetailedStatementSheetName);
  if (!tmpDetailedStatementSheet) {
    //なければBaseからコピー
    const detailedStatementBaseSs = SpreadsheetApp.openById(DetailedStatement.baseSsId);
    const detailedStatementBaseSheet = detailedStatementBaseSs.getSheetByName(DetailedStatement.baseSheetName);

    tmpDetailedStatementSheet = detailedStatementBaseSheet.copyTo(ss);
    tmpDetailedStatementSheet.setName(DetailedStatement.tmpDetailedStatementSheetName);
  }
  
  //出力用シート
  let tmpDetailedStatementOutputSheet = ss.getSheetByName(DetailedStatement.tmpDetailedStatementOutputSheetName);
  if (tmpDetailedStatementOutputSheet) {
    //すでに存在する場合は削除
    ss.deleteSheet(tmpDetailedStatementOutputSheet);
  }
  tmpDetailedStatementSheet.copyTo(ss).setName(DetailedStatement.tmpDetailedStatementOutputSheetName);
}

/**
 * 明細書データを出力シートに編集する
 * 
 * @param {object} ss - 明細書を作成するSSのオブジェクト
 * @param {string} year - 年
 * @param {string} month - 月
 */
DetailedStatement.createDetailedStatement = function(ss, year, month){
  function sort(a, b) {
    // 利用者ID順に並べる
    if (a[0] < b[0]) return -1;
    if (a[0] > b[0]) return 1;
    return 0;
  }

  const obj = {};
  // 明細書[Configs.corporateName] = {};
  for (let facility in Configs.aggedFacilitiesObj) {
    const facilitiesObj = Configs.aggedFacilitiesObj[facility];
    const inputSheet = Totalling.getInputSheet(facilitiesObj['ss']['id'], year, month);
    const _inputSheetValues = Input.getInputSheetValues(inputSheet);
    if (facilitiesObj['拠点ごと明細書']) {
      obj[facility] = _inputSheetValues;
    } else {
      obj[Configs.corporateName] = obj[Configs.corporateName] || [];
      obj[Configs.corporateName] = obj[Configs.corporateName].concat(_inputSheetValues);
    }
  }
  
  for (let property in obj) {
    const inputSheetValues = obj[property];
    DetailedStatement.initToCreateDetailedStatement(ss);
    if (property === Configs.corporateName) {
      inputSheetValues.sort(sort);
      DetailedStatement.createDetailedStatementOfSheet(ss, inputSheetValues, year, month);
      DetailedStatement.createDetailedStatementPDF(ss, year, month);
    } else {
      const facility = property;
      inputSheetValues.sort(sort);
      DetailedStatement.createDetailedStatementOfSheet(ss, inputSheetValues, year, month);
      DetailedStatement.createDetailedStatementPDF(ss, year, month, facility);
    }
  }

}

/**
 * 明細書データを出力シートに編集する
 * 
 * @param {object} ss - 明細書を作成するSSのオブジェクト
 * @param {array} inputSheetValues - 出力対象ごとvalues
 * @param {string} year - 年
 * @param {string} month - 月
 * @param {string} facility - 施設名
 * @return {number} 出力シートに編集した枚数(本処理実行後までの合計)
 */
DetailedStatement.createDetailedStatementOfSheet = function(ss, inputSheetValues, year, month, facility) {
  const tmpDetailedStatementSheet = DetailedStatement.getTmpDetailedStatementSheet(ss);
  const tmpDetailedStatementOutputSheet = DetailedStatement.getTmpDetailedStatementOutputSheet(ss);

  const taxInfo = TaxRateMaster.getTaxRateList();

  //ひながたシートを取得
  const range = tmpDetailedStatementSheet.getRange(1, 1, DetailedStatement.detailedStatementRowCount, DetailedStatement.detailedStatementColCount);
  const sheetValues = range.getValues();
  const srcRowHeigths = [];
  for(let rowNum = 1; rowNum <= DetailedStatement.detailedStatementRowCount; rowNum++){
    srcRowHeigths[rowNum] = tmpDetailedStatementSheet.getRowHeight(rowNum);
  }

  let count = 0;
  for (let i = 0; i < inputSheetValues.length; i++) {
    //1名分のデータ
    const detailedStatementInputValue = inputSheetValues[i];
   
    //ひな形シートに入力値をセット
    DetailedStatement.setDetailedStatement(range, sheetValues, detailedStatementInputValue, year, month, taxInfo);

    //出力シートに追加
    DetailedStatement.addDetailedStatementToOutputSheet(tmpDetailedStatementSheet, tmpDetailedStatementOutputSheet, count * DetailedStatement.detailedStatementRowCount, srcRowHeigths);

    count++;
  }

}

/**
 * 明細書の後処理をする
 * 
 * @param {object} ss - 明細書を作成するSSのオブジェクト
 */
DetailedStatement.finishDetailedStatement = function(ss, year, month, facility) {
  const tmpDetailedStatementSheet = DetailedStatement.getTmpDetailedStatementSheet(ss);//実測値:1msだったので、sheetオブジェクトの引数渡し等は検討不要
  const tmpDetailedStatementOutputSheet = DetailedStatement.getTmpDetailedStatementOutputSheet(ss);//実測値:1msだったので、sheetオブジェクトの引数渡し等は検討不要

  //仮シートを削除
  ss.deleteSheet(tmpDetailedStatementSheet);
  ss.deleteSheet(tmpDetailedStatementOutputSheet);
}

/**
 * 明細書を作成する
 * 
 * @param {object} ss - 明細書を作成するSSのオブジェクト
 * @param {string} year - 年
 * @param {string} month - 月
 * @param {string} facility - 施設名
 */
DetailedStatement.createDetailedStatementPDF = function(ss, year, month, facility) {
  const tmpDetailedStatementSheet = DetailedStatement.getTmpDetailedStatementSheet(ss);//実測値:1msだったので、sheetオブジェクトの引数渡し等は検討不要
  const tmpDetailedStatementOutputSheet = DetailedStatement.getTmpDetailedStatementOutputSheet(ss);//実測値:1msだったので、sheetオブジェクトの引数渡し等は検討不要
  SpreadsheetApp.flush();//PDF出力前に、setValues()した内容で更新させるため
  //明細書のファイル名
  const targetName = facility ? 
    "【明細書】有料 " + facility + year + "年" + month + "月分":
    "【明細書】有料" + year + "年" + month + "月分";

   //出力用シートをPDFにして保存
  DetailedStatement.createPdf(
    DetailedStatement.folderConfig['id'],
    ss,
    tmpDetailedStatementOutputSheet.getSheetId(),
    targetName + "_" + CommonUtil.getTimeStamp()
  );

}

//*************************************
//ひな形シート取得
//*************************************
DetailedStatement.getTmpDetailedStatementSheet = function(ss) {
  return ss.getSheetByName(DetailedStatement.tmpDetailedStatementSheetName);
}

//*************************************
//明細書書き込みシート取得
//*************************************
DetailedStatement.getTmpDetailedStatementOutputSheet = function(ss) {
  return ss.getSheetByName(DetailedStatement.tmpDetailedStatementOutputSheetName);
}

//*************************************
//明細書1件分をひな形シートにセット
//*************************************
DetailedStatement.setDetailedStatement = function(range, sheetValues, value, year, month, taxInfo) {
  //余白変更できるように相対位置で設定する
  var startRowIndex = 0; //先頭余白行数
  const COL = InputBase.ColIndex;

  AccountingDepartmentCode.getAccountingDepartmentCodeValues();
  const disp_facility_name = AccountingDepartmentCode.AccountingDepartmentCode[value[COL['拠点']]].disp_facility_name;

  sheetValues[startRowIndex + 1][0] = (disp_facility_name ? disp_facility_name : value[COL['拠点']]) + [value[COL['階']], value[COL['居室番号']]].join('');
  sheetValues[startRowIndex + 1][2] = value[COL['利用者名']];
  sheetValues[startRowIndex + 3][2] = year + "年" + month + "月分";
  sheetValues[startRowIndex + 5][3] = value[COL['請求額']];
  
  sheetValues[startRowIndex + 8][4] = value[COL['生保']] === "〇" ? value[COL['住宅扶助額の日割り']]: value[COL['家賃（日額）']];
  sheetValues[startRowIndex + 8][5] = value[COL['在籍日数']];
  sheetValues[startRowIndex + 8][6] = value[COL['家賃計算月額（税抜）']];
  sheetValues[startRowIndex + 9][4] = value[COL['管理費（日額）']];
  sheetValues[startRowIndex + 9][5] = Calculation.getMngCalcDaysPerPattern(value, value[COL['拠点']]);
  sheetValues[startRowIndex + 9][6] = value[COL['管理費計算月額（税抜）']];
  sheetValues[startRowIndex + 10][4] = value[COL['食費（日額）']];
  sheetValues[startRowIndex + 10][5] = value[COL['在室日数']];
  sheetValues[startRowIndex + 10][6] = value[COL['食費（税抜）']];


  sheetValues[startRowIndex + 11][6] = value[COL['合計金額']];
  sheetValues[startRowIndex + 12][6] = value[COL['上限額との差額']];
  sheetValues[startRowIndex + 13][6] = value[COL['値引き後の総額（税抜）']];

  sheetValues[startRowIndex + 16][5] = value[COL['値引き後の家賃']];
  sheetValues[startRowIndex + 17][5] = value[COL['値引き後の管理費']];
  sheetValues[startRowIndex + 18][5] = value[COL['値引き後の食費（税抜）']];
  sheetValues[startRowIndex + 18][6] = taxInfo[TaxRateMaster.mealFeeIndex] === 0 ? null : value[COL['値引き後の食費（税込）']];

  sheetValues[startRowIndex + 19][5] = value[COL['値引き後の総額（税抜）']];
  sheetValues[startRowIndex + 19][6] = value[COL['値引き後の合計金額（税込）']];

  sheetValues[startRowIndex + 22][0] = value[COL['オプション内容']];
  sheetValues[startRowIndex + 22][5] = value[COL['オプション金額（税抜）']] > 0 ? value[COL['オプション金額（税抜）']] : null;
  sheetValues[startRowIndex + 22][6] = value[COL['オプション金額（税抜）']] > 0 ? value[COL['オプション（税込み）']] : null;
  sheetValues[startRowIndex + 23][5] = value[COL['オプション金額（税抜）']] > 0 ? value[COL['オプション金額（税抜）']] : 0;
  sheetValues[startRowIndex + 23][6] = value[COL['オプション金額（税抜）']] > 0 ? value[COL['オプション（税込み）']] : 0;

  // 税率別内訳
  sheetValues[startRowIndex + 26][4] = value[COL['10％対象（消費税）']]
  sheetValues[startRowIndex + 26][5] = value[COL['10％対象（税抜）']];
  sheetValues[startRowIndex + 26][6] = value[COL['10％対象（税込）']]
  sheetValues[startRowIndex + 27][4] = value[COL['軽減8％対象（消費税）']];
  sheetValues[startRowIndex + 27][5] = value[COL['軽減8％対象（税抜）']];
  sheetValues[startRowIndex + 27][6] = value[COL['軽減8％対象（税込）']];

  //書き戻す
  range.setValues(sheetValues);		

}

//*************************************
//明細書を出力用シートに転記
//*************************************
DetailedStatement.addDetailedStatementToOutputSheet = function(tmpDetailedStatementSheet, tmpOutputSheet, offset, srcRowHeigths) {
  //行が足りなくなるため、追加
  if(offset !== 0){
    tmpOutputSheet.insertRowsAfter(offset, DetailedStatement.detailedStatementRowCount)
  }

  //ひな形シートの内容を出力シートに追加する
  const srcRange = tmpDetailedStatementSheet.getRange(DetailedStatement.baseStartRow, DetailedStatement.baseStartCol, DetailedStatement.detailedStatementRowCount, DetailedStatement.detailedStatementColCount);
  const dstRange = tmpOutputSheet.getRange(DetailedStatement.baseStartRow + offset, DetailedStatement.baseStartCol, DetailedStatement.detailedStatementRowCount, DetailedStatement.detailedStatementColCount);
  srcRange.copyTo(dstRange);
  for(let rowNum = 1; rowNum <= DetailedStatement.detailedStatementRowCount; rowNum++){
    tmpOutputSheet.setRowHeight(offset + rowNum, srcRowHeigths[rowNum]);
  }
}

//*************************************
//出力用シートをPDF出力
//*************************************
DetailedStatement.createPdf = function(folderId, ss, shId, fileName){
  //PDFを作成するためのベースとなるURL
  const baseUrl = "https://docs.google.com/spreadsheets/d/"
          +  ss.getId()
          + "/export?gid="
          + shId;
 
  //PDFのオプションを指定
  const pdfOptions = "&exportFormat=pdf&format=pdf"
              + "&size=A4" //用紙サイズ (A4)
              + "&portrait=true"  //用紙の向き true: 縦向き / false: 横向き
              + "&fitw=true"  //ページ幅を用紙にフィットさせるか true: フィットさせる / false: 原寸大
              + "&top_margin=0.50" //上の余白
              + "&right_margin=0.50" //右の余白
              + "&bottom_margin=0.50" //下の余白
              + "&left_margin=0.50" //左の余白
              + "&horizontal_alignment=CENTER" //水平方向の位置
              + "&vertical_alignment=TOP" //垂直方向の位置
              + "&printtitle=false" //スプレッドシート名の表示有無
              + "&sheetnames=false" //シート名の表示有無
              + "&gridlines=false" //グリッドラインの表示有無
              + "&fzr=false" //固定行の表示有無
              + "&fzc=false" //固定列の表示有無;

  //PDFを作成するためのURL
  const url = baseUrl + pdfOptions;

  //アクセストークンを取得する
  const token = ScriptApp.getOAuthToken();

  //headersにアクセストークンを格納する
  const options = {
    headers: {
        'Authorization': 'Bearer ' +  token
    }
  };
 
  //PDFを作成する
  const blob = UrlFetchApp.fetch(url, options).getBlob().setName(fileName + '.pdf');

  //PDFの保存先フォルダー
  //フォルダーIDは引数のfolderIdを使用します
  const folder = DriveApp.getFolderById(folderId);

  //PDFを指定したフォルダに保存する
  folder.createFile(blob);
}

//*************************************
//現在日付文字列を取得
//*************************************
DetailedStatement.getNowDateStr = function() {
  if(DetailedStatement.nowDateStr){
    return DetailedStatement.nowDateStr;
  }

  const nowDateStr = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd');
  const nowDateStrSplit = nowDateStr.split('/');
  const year = nowDateStrSplit[0];
  const month = nowDateStrSplit[1];
  const day = nowDateStrSplit[2];
  DetailedStatement.nowDateStr = year + "年" + month + "月" + day + "日";
  return DetailedStatement.nowDateStr;
}
