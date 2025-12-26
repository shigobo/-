var AccountingDepartmentCode = {};

//スプレッドシート「マスタ」の会計部門コードが格納されているシート名
AccountingDepartmentCode.sheetName = "会計部門コード";

/**
 * スプレッドシート「マスター」から会計部門コード一覧を取得し、
 * 施設名：会計部門コードの連想配列を返す
 */
AccountingDepartmentCode.getAccountingDepartmentCode = function() {
  const ss = SpreadsheetApp.openById(PriceMaster.ssId);
  const codeSheet = ss.getSheetByName(AccountingDepartmentCode.sheetName);
  const codes = {};
  codeSheet.getRange(2, 1, ss.getLastRow(), 2).getValues().forEach(line => {
    console.log(line);
    const [facility_name, ad_code] = line;
    if (facility_name === '') return;
    codes[facility_name] = ad_code;
  });
  return codes;
}

/**
 * スプレッドシート「マスター」から会計部門コード一覧を取得する
 */
AccountingDepartmentCode.getAccountingDepartmentCodeValues = function(facilityName) {
  if (!AccountingDepartmentCode.AccountingDepartmentCodeValues) {
    const ss = SpreadsheetApp.openById(PriceMaster.ssId);
    const codeSheet = ss.getSheetByName(AccountingDepartmentCode.sheetName);
    AccountingDepartmentCode.AccountingDepartmentCodeValues = codeSheet.getDataRange().getValues();  
  }

  if(!AccountingDepartmentCode.AccountingDepartmentCode) {
    AccountingDepartmentCode.AccountingDepartmentCode = {};
    AccountingDepartmentCode.AccountingDepartmentCodeValues.forEach((vals) => {
      const [facility_name, ad_code, disp_facility_name] = vals;
      AccountingDepartmentCode.AccountingDepartmentCode[facility_name] = {
        ad_code: ad_code,
        disp_facility_name: disp_facility_name,
      };
    });
  
  }

}
