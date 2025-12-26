//明細書関連
var DetailedStatement = {};
//*************************************
//定義
//*************************************
DetailedStatement['非生保'] = {
  baseSheetName: 'サ高住（非生保）',

  //明細書BASEの範囲
  baseStartRow: 1,
  baseStartCol: 1,

  detailedStatementRowCount: 18, //余白を考慮して調整
  detailedStatementColCount: 9,
  '税率別': {
    NO_TAXED_COL: 4,
    TAX_COL: 6,
    TAXED_COL: 8,
  },
  PRICE_COL: 7,
  TAX_COL: 8,

  //集計シートに仮作成するシート
  tmpDetailedStatementSheetName: 'tmp明細書ひながた【サ高住】',
};
DetailedStatement['生保'] = {
  baseSheetName: 'サ高住（生保）',

  //明細書BASEの範囲
  baseStartRow: 1,
  baseStartCol: 1,

  detailedStatementRowCount: 27, //余白を考慮して調整
  detailedStatementColCount: 9,
  '税率別': {
    NO_TAXED_COL: 4,
    TAX_COL: 6,
    TAXED_COL: 8,
  },
  PRICE_COL: 7,
  TAX_COL: 8,

  //集計シートに仮作成するシート
  tmpDetailedStatementSheetName: 'tmp明細書ひながた【サ高住】生保',
};
DetailedStatement.tmpDetailedStatementOutputSheetName = "tmp明細書出力";

/**
 * 明細書作成の準備をする
 *
 * @param {object} ss - 明細書を作成するSSのオブジェクト
 */
DetailedStatement.initToCreateDetailedStatement = function(ss) {
  //明細書ひながたシート
  let tmpDetailedStatementSheet;
  tmpDetailedStatementSheet = ss.getSheetByName(DetailedStatement['非生保'].tmpDetailedStatementSheetName);
  if (!tmpDetailedStatementSheet) {
    //なければBaseからコピー
    const detailedStatementBaseSs = SpreadsheetApp.openById(DetailedStatement.baseSsId);
    const detailedStatementBaseSheet = detailedStatementBaseSs.getSheetByName(DetailedStatement['非生保'].baseSheetName);

    tmpDetailedStatementSheet = detailedStatementBaseSheet.copyTo(ss);
    tmpDetailedStatementSheet.setName(DetailedStatement['非生保'].tmpDetailedStatementSheetName);
  }

  tmpDetailedStatementSheet = ss.getSheetByName(DetailedStatement['生保'].tmpDetailedStatementSheetName);
  if (!tmpDetailedStatementSheet) {
    //なければBaseからコピー
    const detailedStatementBaseSs = SpreadsheetApp.openById(DetailedStatement.baseSsId);
    const detailedStatementBaseSheet = detailedStatementBaseSs.getSheetByName(DetailedStatement['生保'].baseSheetName);

    tmpDetailedStatementSheet = detailedStatementBaseSheet.copyTo(ss);
    tmpDetailedStatementSheet.setName(DetailedStatement['生保'].tmpDetailedStatementSheetName);
  }

}

/**
 * 出力シートを作成する
 * 
 * 生保か非生保かでコピーするテンプレートを切り替える
 * 
 * @param {object} ss - 出力シートを作成するSSオブジェクト
 * @param {string} kind - 非生保か生保の種類を表す文字列
 */
DetailedStatement.initToCreateOutputSheet = function(ss, kind) {
  const tmpDetailedStatementSheet = ss.getSheetByName(DetailedStatement[kind].tmpDetailedStatementSheetName);

  //出力用シート
  let tmpDetailedStatementOutputSheet;
  tmpDetailedStatementOutputSheet = ss.getSheetByName(DetailedStatement.tmpDetailedStatementOutputSheetName);
  if (tmpDetailedStatementOutputSheet) {
    //すでに存在する場合は削除
    ss.deleteSheet(tmpDetailedStatementOutputSheet);
  }
  tmpDetailedStatementSheet.copyTo(ss).setName(DetailedStatement.tmpDetailedStatementOutputSheetName);
}

/**
 * 拠点ごとの明細書データを出力シートに編集する
 *
 * @param {object} ss - 明細書を作成するSSのオブジェクト
 * @param {string} inputSsId - 拠点ごとSSのID
 * @param {string} year - 年
 * @param {string} month - 月
 * @param {number} count - 出力シートに編集した枚数
 * @return 出力シートに編集した枚数(本処理実行後までの合計)
 */
DetailedStatement.createDetailedStatementOfSheet = function(ss, inputSsId, year, month, count) {
  function sort(a, b) {
    // 利用者ID順に並べる
    if (a[0] < b[0]) return -1;
    if (a[0] > b[0]) return 1;
    return 0;
  }

  const tmpDetailedStatementSheetObj = DetailedStatement.getTmpDetailedStatementSheet(ss);

  const inputSheet = Totalling.getInputSheet(inputSsId, year, month);

  //全行データ取得
  const inputSheetValues = Input.getInputSheetValues(inputSheet);
  if (!inputSheetValues || inputSheetValues.length <= 0) {
    return count;
  }
  inputSheetValues.sort(sort);
  
  const taxInfo = TaxRateMaster.getTaxRateList();
  const userInfo = UserMaster.ACGDB.getUserInfo();

  //ひながたシートを取得
  const rangeObj = {
    '非生保': tmpDetailedStatementSheetObj['非生保'].getRange(1, 1,
        DetailedStatement['非生保'].detailedStatementRowCount, DetailedStatement['非生保'].detailedStatementColCount),
    '生保': tmpDetailedStatementSheetObj['生保'].getRange(1, 1,
        DetailedStatement['生保'].detailedStatementRowCount, DetailedStatement['非生保'].detailedStatementColCount),
  };
  const sheetValuesObj = {
    '非生保': rangeObj['非生保'].getValues(),
    '生保': rangeObj['生保'].getValues(),
  };
  const srcRowHeigthsObj = {
    '非生保': [],
    '生保': [],
  };
  ['非生保', '生保'].forEach(function(kind){
    for(let rowNum = 1; rowNum <= DetailedStatement[kind].detailedStatementRowCount; rowNum++){
      srcRowHeigthsObj[kind][rowNum] = tmpDetailedStatementSheetObj[kind].getRowHeight(rowNum);
    }
  });
  const firstKind = inputSheetValues[0][InputBase.ColIndex['生保']] == "〇" ? '生保' : '非生保'
  DetailedStatement.initToCreateOutputSheet(ss, firstKind);
  const tmpDetailedStatementOutputSheet = DetailedStatement.getTmpDetailedStatementOutputSheet(ss);

  let offset = 0;
  for (let i = 0; i < inputSheetValues.length; i++) {
    //1名分のデータ
    const detailedStatementInputValue = inputSheetValues[i];
    const kind = detailedStatementInputValue[InputBase.ColIndex['生保']] == "〇" ? '生保' : '非生保';
    //ひな形シートに入力値をセット
    if (kind == "生保"){
      DetailedStatement.setDetailedStatementWelfare(
        rangeObj,
        sheetValuesObj,
        detailedStatementInputValue,
        year, month, taxInfo, userInfo
      );
    } else {
      DetailedStatement.setDetailedStatement(
        rangeObj,
        sheetValuesObj,
        detailedStatementInputValue,
        year, month, taxInfo, userInfo
      );
    }

    //出力シートに追加
    offset += DetailedStatement.addDetailedStatementToOutputSheet(
      tmpDetailedStatementSheetObj[kind],
      tmpDetailedStatementOutputSheet,
      offset,
      srcRowHeigthsObj[kind],
      kind
    );

    count++;
  }

  return count;
}

/**
 * 明細書作成の後処理をする
 *
 * @param {object} ss - 明細書を作成するSSのオブジェクト
 * @param {number} count - 出力シートに編集した枚数
 * @param {string} year - 年
 * @param {string} month - 月
 */
DetailedStatement.finishCreateDetailedStatement = function(ss, count, year, month) {
  const tmpDetailedStatementSheet = DetailedStatement.getTmpDetailedStatementSheet(ss);
  const tmpDetailedStatementOutputSheet = DetailedStatement.getTmpDetailedStatementOutputSheet(ss);
  SpreadsheetApp.flush();

  //明細書のファイル名
  const targetName = "【明細書】サ高住" + year + "年" + month + "月分";

  //出力用シートをPDFにして保存
  DetailedStatement.createPdf(DetailedStatement.folderId, ss, tmpDetailedStatementOutputSheet.getSheetId(), targetName + "_" + CommonUtil.getTimeStamp());

  //仮シートを削除
  ss.deleteSheet(tmpDetailedStatementSheet['非生保']);
  ss.deleteSheet(tmpDetailedStatementSheet['生保']);
  ss.deleteSheet(tmpDetailedStatementOutputSheet);
}

//*************************************
//ひな形シート取得
//*************************************
DetailedStatement.getTmpDetailedStatementSheet = function(ss) {
  return {
    '非生保': ss.getSheetByName(DetailedStatement['非生保'].tmpDetailedStatementSheetName),
    '生保': ss.getSheetByName(DetailedStatement['生保'].tmpDetailedStatementSheetName)
  };
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
DetailedStatement.setDetailedStatementWelfare = function(rangeObj, sheetValuesObj, value, year, month, taxInfo, userInfo) {
  //余白変更できるように相対位置で設定する
  var startRowIndex = 0; //先頭余白行数
  const COL = InputBase.ColIndex;
  const kind = '生保';
  const mealFeeTax = taxInfo[TaxRateMaster.mealFeeIndex];

  //部屋番号
  sheetValuesObj[kind][startRowIndex + 1][0] = [value[COL['階']], value[COL['居室番号']]].join('') + "入居";

  //氏名
  sheetValuesObj[kind][startRowIndex + 1][2] = value[InputBase.ColIndex['利用者名']];

  //件名(〇月請求分)
  sheetValuesObj[kind][startRowIndex + 3][2] = CommonUtil.generateMonthsLaterStr(year, month, 0) + "請求分";

  //内訳
  sheetValuesObj[kind][startRowIndex + 8][DetailedStatement[kind].PRICE_COL] = value[COL['家賃の積み上げ']];
  sheetValuesObj[kind][startRowIndex + 9][DetailedStatement[kind].PRICE_COL] = value[COL['共益費の積み上げ']];
  sheetValuesObj[kind][startRowIndex + 10][DetailedStatement[kind].PRICE_COL] = value[InputBase.ColIndex['食費の積み上げ（税抜）']];
  sheetValuesObj[kind][startRowIndex + 10][DetailedStatement[kind].TAX_COL] = Math.round(value[InputBase.ColIndex['食費の積み上げ（税抜）']] * mealFeeTax);
  sheetValuesObj[kind][startRowIndex + 11][DetailedStatement[kind].PRICE_COL] = value[COL['サービス相談費の積み上げ']];
  sheetValuesObj[kind][startRowIndex + 11][DetailedStatement[kind].TAX_COL] = value[COL['サービス相談費の消費税']];

  //合計
  sheetValuesObj[kind][startRowIndex + 12][DetailedStatement[kind].PRICE_COL] = value[COL['税抜の合計']];
  sheetValuesObj[kind][startRowIndex + 12][DetailedStatement[kind].TAX_COL] = Math.round(value[InputBase.ColIndex['食費の積み上げ（税抜）']] * mealFeeTax) + value[COL['サービス相談費の消費税']];

  sheetValuesObj[kind][startRowIndex + 13][DetailedStatement[kind].PRICE_COL] = value[COL['値引き後の総額（税抜）']];
  sheetValuesObj[kind][startRowIndex + 13][DetailedStatement[kind].TAX_COL] = value[COL['消費税の合計']] + value[COL['消費税の合計（8％）']];

  //値引き後の内訳
  sheetValuesObj[kind][startRowIndex + 16][DetailedStatement[kind].PRICE_COL] = value[COL['家賃の積み上げ']];
  sheetValuesObj[kind][startRowIndex + 17][DetailedStatement[kind].PRICE_COL] = value[COL['値引き後の共益費（税抜）']];
  sheetValuesObj[kind][startRowIndex + 18][DetailedStatement[kind].PRICE_COL] = value[InputBase.ColIndex['値引き後の食費（税抜）']];
  sheetValuesObj[kind][startRowIndex + 18][DetailedStatement[kind].TAX_COL] = value[InputBase.ColIndex['値引き後の食費（消費税）']];
  sheetValuesObj[kind][startRowIndex + 19][DetailedStatement[kind].PRICE_COL] = value[COL['サービス相談費の積み上げ']];
  sheetValuesObj[kind][startRowIndex + 19][DetailedStatement[kind].TAX_COL] = value[COL['サービス相談費の消費税']];

  //小計
  sheetValuesObj[kind][startRowIndex + 20][DetailedStatement[kind].PRICE_COL] = value[COL['値引き後の総額（税抜）']];
  sheetValuesObj[kind][startRowIndex + 20][DetailedStatement[kind].TAX_COL] = value[COL['消費税の合計']] + value[COL['消費税の合計（8％）']];

  //10％対象
  sheetValuesObj[kind][startRowIndex + 23][DetailedStatement[kind]['税率別'].NO_TAXED_COL] = value[COL['課税対象の税抜合計']];
  sheetValuesObj[kind][startRowIndex + 23][DetailedStatement[kind]['税率別'].TAX_COL] = value[COL['消費税の合計']];
  sheetValuesObj[kind][startRowIndex + 23][DetailedStatement[kind]['税率別'].TAXED_COL] = value[COL['税込み対象の合計']];
  //10％対象
  sheetValuesObj[kind][startRowIndex + 24][DetailedStatement[kind]['税率別'].NO_TAXED_COL] = value[COL['課税対象の税抜合計（8％）']];
  sheetValuesObj[kind][startRowIndex + 24][DetailedStatement[kind]['税率別'].TAX_COL] = value[COL['消費税の合計（8％）']];
  sheetValuesObj[kind][startRowIndex + 24][DetailedStatement[kind]['税率別'].TAXED_COL] = value[COL['税込み対象の合計（8％）']];

  //総計
  sheetValuesObj[kind][startRowIndex + 5][3] = value[COL['請求金額(税込)']];

  //書き戻す
  rangeObj[kind].setValues(sheetValuesObj[kind]);

}

DetailedStatement.setDetailedStatement = function(rangeObj, sheetValuesObj, value, year, month, taxInfo, userInfo) {
  //余白変更できるように相対位置で設定する
  var startRowIndex = 0; //先頭余白行数
  const COL = InputBase.ColIndex;
  const kind = '非生保';

  //部屋番号
  sheetValuesObj[kind][startRowIndex + 1][0] = [value[COL['階']], value[COL['居室番号']]].join('') + "入居";

  //氏名
  sheetValuesObj[kind][startRowIndex + 1][2] = value[InputBase.ColIndex['利用者名']];

  //件名(〇月請求分)
  sheetValuesObj[kind][startRowIndex + 3][2] = CommonUtil.generateMonthsLaterStr(year, month, 0) + "請求分";

  //内訳
  sheetValuesObj[kind][startRowIndex + 8][DetailedStatement[kind].PRICE_COL] = value[COL['家賃非生保']];
  sheetValuesObj[kind][startRowIndex + 9][DetailedStatement[kind].PRICE_COL] = value[COL['共益費非生保']];
  sheetValuesObj[kind][startRowIndex + 10][DetailedStatement[kind].PRICE_COL] = value[COL['生活相談サービス費(税抜)']];
  sheetValuesObj[kind][startRowIndex + 10][DetailedStatement[kind].TAX_COL] = value[COL['サービス相談費の消費税']];
  sheetValuesObj[kind][startRowIndex + 11][DetailedStatement[kind].PRICE_COL] = value[InputBase.ColIndex['経管栄養物品管理費(税抜)']];
  sheetValuesObj[kind][startRowIndex + 11][DetailedStatement[kind].TAX_COL] = value[InputBase.ColIndex['経管栄養の消費税']];

  //合計
  sheetValuesObj[kind][startRowIndex + 12][DetailedStatement[kind].PRICE_COL] = value[COL['税抜の合計']];
  sheetValuesObj[kind][startRowIndex + 12][DetailedStatement[kind].TAX_COL] = value[COL['消費税の合計']];

  //10％対象
  sheetValuesObj[kind][startRowIndex + 15][DetailedStatement[kind]['税率別'].NO_TAXED_COL] = value[COL['課税対象の税抜合計']];
  sheetValuesObj[kind][startRowIndex + 15][DetailedStatement[kind]['税率別'].TAX_COL] = value[COL['消費税の合計']];
  sheetValuesObj[kind][startRowIndex + 15][DetailedStatement[kind]['税率別'].TAXED_COL] = value[COL['税込み対象の合計']];

  //総計
  sheetValuesObj[kind][startRowIndex + 5][3] = value[COL['請求金額(税込)']];

  //書き戻す
  rangeObj[kind].setValues(sheetValuesObj[kind]);
}

//*************************************
//明細書を出力用シートに転記
//*************************************
DetailedStatement.addDetailedStatementToOutputSheet = function(tmpDetailedStatementSheet, tmpOutputSheet, offset, srcRowHeigths, kind) {
  //行が足りなくなるため、追加
  if(offset !== 0){
    tmpOutputSheet.insertRowsAfter(offset, DetailedStatement[kind].detailedStatementRowCount);
  }

  //ひな形シートの内容を出力シートに追加する
  const srcRange = tmpDetailedStatementSheet.getRange(DetailedStatement[kind].baseStartRow, DetailedStatement[kind].baseStartCol, DetailedStatement[kind].detailedStatementRowCount, DetailedStatement[kind].detailedStatementColCount);
  const dstRange = tmpOutputSheet.getRange(DetailedStatement[kind].baseStartRow + offset, DetailedStatement[kind].baseStartCol, DetailedStatement[kind].detailedStatementRowCount, DetailedStatement[kind].detailedStatementColCount);
  srcRange.copyTo(dstRange);
  for(let rowNum = 1; rowNum <= DetailedStatement[kind].detailedStatementRowCount; rowNum++){
    tmpOutputSheet.setRowHeight(offset + rowNum, srcRowHeigths[rowNum]);
  }
  return DetailedStatement[kind].detailedStatementRowCount;
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
