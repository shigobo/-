var FacilityNameConvert = {};
FacilityNameConvert.sheetName = "拠点名変換マスタ";

/**
 * スプレッドシート「マスター」から拠点名変換マスタを取得し、
 * Kintone事業所名:利用料計算ツール拠点名の連想配列を返す。
 */
FacilityNameConvert.getFacilityNameConvert = function() {
  const ss = SpreadsheetApp.openById(PriceMaster.ssId);
  const sheet = ss.getSheetByName(FacilityNameConvert.sheetName);
  const facilityNameConvert = {};
  sheet.getRange(2, 1, ss.getLastRow(), 2).getValues().forEach(line => {
    const [facility_kintone, facility_tool] = line;
    if (facility_kintone === '') return;
    facilityNameConvert[facility_kintone] = facility_tool;
  });
  return facilityNameConvert;
}
