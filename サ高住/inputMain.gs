//メイン(発行)シート関連
var InputMain = {};

//*************************************
//定義
//*************************************

//シート名
InputMain.sheetName = "発行";

//設定値
InputMain.posFacility = "B3"; //拠点
InputMain.posYearMonth = "B6:C6";     //年月

/**
 * 入力シートを作成する
 * 
 * @param {object} ss - 拠点ごとSSオブジェクト
 */
InputMain.createSheet = function(ss) {
  const mainSheet = ss.getSheetByName(InputMain.sheetName);

  //設定値を取得
  const facility = mainSheet.getRange(InputMain.posFacility).getValue();
  const yearMonthVals = mainSheet.getRange(InputMain.posYearMonth).getValues();
  const year = yearMonthVals[0][0];
  const month = yearMonthVals[0][1];

  //入力値チェック
  if (!InputMain.isValidationOk(year, month)) {
    return;
  }

  const targetName = year + "年" + month + "月分";
  let confirmMsg = targetName + "　の入力シートを発行します。よろしいですか？";

  //すでに同名のシートがあるかチェック
  const alreadyHasSheet = InputMain.hasSheet(ss, targetName);
  if (alreadyHasSheet) {
    confirmMsg = targetName + "　の入力シートはすでに存在します。内容をクリアしてよろしいですか？";
  }

  //確認ダイアログ
  const answer = CommonUtil.msgBox(confirmMsg, Browser.Buttons.OK_CANCEL);
  if (answer != "ok" && answer != null/*GASエディタで実行する場合*/) {
    return;
  }

  let sheet = null;
  if (alreadyHasSheet) {
    //シート内容をクリアする
    sheet = ss.getSheetByName(targetName);
    Input.clearInputSheet(sheet);
  } else {
    //シートを新規発行する
    sheet = Input.createSheet(ss, targetName);
  }

  //シート項目・利用者情報をセット
  Input.setFixedInfoToSheet(sheet, facility, year, month);
  return sheet;
}

//*************************************
//入力値チェック
//*************************************
InputMain.isValidationOk = function(year, month) {
  if (isNaN(year)) {
    Browser.msgBox("年に数値以外が入力されています");
    return false;
  }

  if (isNaN(month)) {
    Browser.msgBox("月に数値以外が入力されています");
    return false;
  }

  if (Number(month) < 1 || Number(month) > 12) {
    Browser.msgBox("月を正しく入力してください");
    return false;
  }

  return true;
}

//*************************************
//同名のシートがあるか判定
//*************************************
InputMain.hasSheet = function(ss, sheetName) {
  let ret = false;

  const sheets = ss.getSheets();
  for(const sheet of sheets) {
    if (sheet.getName() == sheetName) {
      ret = true;
      break;
    }
  }

  return ret;
}
