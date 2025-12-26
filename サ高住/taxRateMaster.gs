//税率関連
var TaxRateMaster = {};

//*************************************
//定義
//*************************************

TaxRateMaster.sheetName = "サ高住料金表";

//開始行
TaxRateMaster.rowStart = 2;
//開始列
TaxRateMaster.colStart = 15;

//インデックス
TaxRateMaster.rentIndex = 0;
TaxRateMaster.commonServiceFeeIndex = 1;
TaxRateMaster.lifeConsultationFeeIndex = 2;
TaxRateMaster.tubeFeedingManagementFeeIndex = 3;
TaxRateMaster.mealFeeIndex = 4;

TaxRateMaster.lastIndex = TaxRateMaster.mealFeeIndex;

//*************************************
//税率設定を取得
//*************************************
TaxRateMaster.getTaxRateList = function() {
  const ss = SpreadsheetApp.openById(TaxRateMaster.ssId);
  const sheet = ss.getSheetByName(TaxRateMaster.sheetName);

  const retList = sheet.getRange( TaxRateMaster.rowStart, TaxRateMaster.colStart, TaxRateMaster.lastIndex + 1, 1)
    .getValues().map(function(val){
      if(val[0] === "非課税") return 0;
      return val[0];
    });
  return retList;
}
