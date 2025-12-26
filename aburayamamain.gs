/**
 * 入力シート作成ボタンクリック
 */
function btnCreateSheet_Click() {
  PriceCalculationLibrary.Configs.initial(CONFIG);
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  //入力シート作成
  const sheet = PriceCalculationLibrary.InputMain.createSheet(ss);
}

/**
 * 入力シートの計算
 */
function btnCalk_Click() {
  //表示中のシートが対象
  const sheet = SpreadsheetApp.getActiveSheet();
  PriceCalculationLibrary.Configs.initial(CONFIG);
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
