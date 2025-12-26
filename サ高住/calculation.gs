//費用計算ロジック関連
var Calculation = {};

/**
 * 入力値から利用料を計算する
 * 
 * @param {object} inputSheet - 入力シートのオブジェクト
 */
Calculation.calc = function(inputSheet) {
  //全行データ取得
  const inputSheetValues = Input.getInputSheetValues(inputSheet);
  if (!inputSheetValues || inputSheetValues.length <= 0) {
    return;
  }

  //バリデーションチェック
  const errorList = Calculation.checkValidation(inputSheetValues);
  if (errorList.length > 0) {
    const errorMessage = "入力値にエラーがあります\\n\\n" + errorList.join("\\n");

    Browser.msgBox(errorMessage, Browser.Buttons.OK);
    return;
  }

  //対象年月を取得
  const dateInfo = inputSheet.getRange(InputBase.posDate).getValue();
  let year = "";
  let month = "";
  const dateMatch = dateInfo.match(/^(.+?)年　(.+?)月分$/);
  if (dateMatch != null) {
    year = dateMatch[1];
    month = dateMatch[2];
  }

  //税率を取得
  const taxInfo = TaxRateMaster.getTaxRateList();
  const outputValues = [];
  for (let i = 0; i < inputSheetValues.length; i++) {
    //1名分のデータ
    const inputValue = inputSheetValues[i];

    //計算
    Calculation.calcForPerson(inputValue, taxInfo, year, month);

    //有料に合わせて、1行ずつ書き込む
    inputSheet.getRange(InputBase.rowStart + i, 1, 1, inputValue.length).setValues([inputValue]);
  }
}

//*************************************
//バリデーションチェック
//*************************************
Calculation.checkValidation = function(inputSheetValues) {
  return [];//チェック無し
}

//*************************************
//一人分の計算
//*************************************
Calculation.calcForPerson = function(inputValue, taxInfo, year, month) {
  CommonUtil.logger("====[" + inputValue[InputBase.ColIndex['ID']] + "][" + inputValue[InputBase.ColIndex['利用者名']] + "]=======================================================")

  //基本料金
  // Calculation.calcBasicFees(inputValue, taxInfo, year, month);
  //基本料金
  if(inputValue[InputBase.ColIndex['生保']] == "〇"){
    Calculation.calcBasicFeesWelfare(inputValue, taxInfo, year, month);
  }else{
    Calculation.calcBasicFeesGeneral(inputValue, taxInfo, year, month);
  }
}

Calculation['日割り計算する日数'] = 30;//サ高住は30で割る
/**
 * 基本料金の計算 非生保
 * 
 * @param {array} inputValue - 入力値
 * @param {array} taxInfo - 税率
 * @param {string} year - 計算対象年
 * @param {string} month - 計算対象月
 */
Calculation.calcBasicFeesGeneral = function(inputValue, taxInfo, year, month) {
  const rentTax = taxInfo[TaxRateMaster.rentIndex];//家賃
  const commonServiceTax = taxInfo[TaxRateMaster.commonServiceFeeIndex];//共益費
  const lifeConsultationTax = taxInfo[TaxRateMaster.lifeConsultationFeeIndex];//生活相談サービス費
  const tubeFeedingManagementTax = taxInfo[TaxRateMaster.tubeFeedingManagementFeeIndex];//経管栄養物品管理費

  const COL = InputBase.ColIndex;

  if(inputValue[COL['個別家賃']] > 0){
    inputValue[COL['家賃非生保']] = inputValue[COL['個別家賃']];
  }else{
    inputValue[COL['家賃非生保']] = inputValue[COL['家賃']];
  }

  inputValue[COL['共益費非生保']] = inputValue[COL['共益費(税抜)']];

  inputValue[COL['サービス相談費の消費税']] = Math.floor(inputValue[COL['生活相談サービス費(税抜)']] * lifeConsultationTax);
  inputValue[COL['税込みのサービス相談費']] = inputValue[COL['生活相談サービス費(税抜)']] + inputValue[COL['サービス相談費の消費税']];

  inputValue[COL['経管栄養物品管理費(税抜)']] = inputValue[COL['経管栄養物品管理費']] * inputValue[COL['経管の利用日数']];
  inputValue[COL['経管栄養の消費税']] = Math.floor(inputValue[COL['経管栄養物品管理費(税抜)']] * tubeFeedingManagementTax);
  inputValue[COL['税込みの経管栄養費']] = inputValue[COL['経管栄養物品管理費(税抜)']] + inputValue[COL['経管栄養の消費税']];

  inputValue[COL['税抜の合計']] =
    inputValue[COL['家賃非生保']]
    + inputValue[COL['共益費非生保']]
    + inputValue[COL['生活相談サービス費(税抜)']]
    + inputValue[COL['経管栄養物品管理費(税抜)']]
  ;

  // 値引きが必要か
  if (!(inputValue[COL['個別上限額（税抜）']] > 0)  // 個別上限額（税抜）が設定されていない
     || inputValue[COL['税抜の合計']] <= inputValue[COL['個別上限額（税抜）']]) {
    // 値引きしない場合
    inputValue[COL['上限額との差額（税抜）']] = 0;
    inputValue[COL['値引き後の家賃（税抜）']] = inputValue[COL['家賃非生保']];
  } else {
    // 値引きする場合
    inputValue[COL['上限額との差額（税抜）']] = inputValue[COL['税抜の合計']] - inputValue[COL['個別上限額（税抜）']];
    inputValue[COL['値引き後の家賃（税抜）']] = inputValue[COL['家賃非生保']] - inputValue[COL['上限額との差額（税抜）']];

  }

  inputValue[COL['消費税の合計']] =
    inputValue[COL['サービス相談費の消費税']]
    + inputValue[COL['経管栄養の消費税']]
  ;
  const aggedTaxRate = aggByTaxRate(inputValue, taxInfo, false/*isWelfare*/);
  inputValue[COL['税込み対象の合計']] = aggedTaxRate['10％']['税込'];
  inputValue[COL['課税対象の税抜合計']] = aggedTaxRate['10％']['税抜'];


  inputValue[COL['値引き後の総額（税抜）']] =
    inputValue[COL['値引き後の家賃（税抜）']]
    + inputValue[COL['共益費非生保']]
    + inputValue[COL['生活相談サービス費(税抜)']]
    + inputValue[COL['経管栄養物品管理費(税抜)']]
  ;

  inputValue[COL['請求金額(税込)']] =
    inputValue[COL['値引き後の総額（税抜）']]
    + inputValue[COL['消費税の合計']]
  ;

}

/**
 * 基本料金の計算 生保
 * 
 * @param {array} inputValue - 入力値
 * @param {array} taxInfo - 税率
 * @param {string} year - 計算対象年
 * @param {string} month - 計算対象月
 */
Calculation.calcBasicFeesWelfare = function(inputValue, taxInfo, year, month) {
  const rentTax = taxInfo[TaxRateMaster.rentIndex];//家賃
  const commonServiceTax = taxInfo[TaxRateMaster.commonServiceFeeIndex];//共益費
  const lifeConsultationTax = taxInfo[TaxRateMaster.lifeConsultationFeeIndex];//生活相談サービス費
  const tubeFeedingManagementTax = taxInfo[TaxRateMaster.tubeFeedingManagementFeeIndex];//経管栄養物品管理費
  const mealTax = taxInfo[TaxRateMaster.mealFeeIndex];

  const COL = InputBase.ColIndex;
  const daysOfMonth = CommonUtil.getDaysOfMonth(year, month);//1か月の日数

  //費用の計算-------------  
  inputValue[COL['日割り家賃']] = inputValue[COL['住宅扶助額']] / daysOfMonth;
  if(inputValue[COL['個別共益費']] > 0) {
    inputValue[COL['日割り共益費']] = inputValue[COL['個別共益費']] / daysOfMonth;
  } else {
    inputValue[COL['日割り共益費']] = inputValue[COL['共益費日額(税抜)']];
  }
  inputValue[COL['日割りサービス相談費（税抜）']] = inputValue[COL['生活相談サービス費(税抜)']] / daysOfMonth;
  inputValue[COL['食費の積み上げ（税抜）']] = inputValue[COL['食費']] * inputValue[COL['在室日数']];

  if(daysOfMonth !== inputValue[COL['在籍日数']]/*入退去ありの場合だけ家賃は日額から計算する*/){
    inputValue[COL['家賃の積み上げ']] = Math.round(inputValue[COL['日割り家賃']] * inputValue[COL['在籍日数']]);
  }else{
    inputValue[COL['家賃の積み上げ']] = inputValue[COL['住宅扶助額']];
  }
  if(daysOfMonth !== inputValue[COL['在室日数']]){
    inputValue[COL['共益費の積み上げ']] = Math.round(inputValue[COL['日割り共益費']] * inputValue[COL['在室日数']]);
    inputValue[COL['サービス相談費の積み上げ']] = Math.round(inputValue[COL['日割りサービス相談費（税抜）']] * inputValue[COL['在室日数']]);
  }else{
    if(inputValue[COL['個別共益費']] > 0) {
      inputValue[COL['共益費の積み上げ']] = inputValue[COL['個別共益費']] -0;
    }else{
      inputValue[COL['共益費の積み上げ']] = inputValue[COL['日割り共益費']] * inputValue[COL['在室日数']];
    }
    inputValue[COL['サービス相談費の積み上げ']] = inputValue[COL['生活相談サービス費(税抜)']];
  }
  inputValue[COL['経管栄養物品管理費(税抜)']] = inputValue[COL['経管栄養物品管理費']] * inputValue[COL['経管の利用日数']];

  inputValue[COL['サービス相談費の消費税']] = Math.floor(inputValue[COL['サービス相談費の積み上げ']] * lifeConsultationTax);
  inputValue[COL['税込みのサービス相談費']] = inputValue[COL['サービス相談費の積み上げ']] + inputValue[COL['サービス相談費の消費税']];

  inputValue[COL['経管栄養の消費税']] = Math.floor(inputValue[COL['経管栄養物品管理費(税抜)']] * tubeFeedingManagementTax);
  inputValue[COL['税込みの経管栄養費']] = inputValue[COL['経管栄養物品管理費(税抜)']] + inputValue[COL['経管栄養の消費税']];

  inputValue[COL['税抜の合計']] =
    inputValue[COL['家賃の積み上げ']]
    + inputValue[COL['共益費の積み上げ']]
    + inputValue[COL['サービス相談費の積み上げ']]
    + inputValue[COL['経管栄養物品管理費(税抜)']]
    + inputValue[COL['食費の積み上げ（税抜）']]
  ;


  // 値引きが必要か
  if (inputValue[COL['税抜の合計']] <= inputValue[COL['個別上限額（税抜）']]) {
    // 値引きしない場合
    inputValue[COL['上限額との差額（税抜）']] = 0;
    // Calculation.calcDiscountWithoutDiscount(inputValue);
    inputValue[COL['値引き後の食費（税抜）']] = inputValue[COL['食費の積み上げ（税抜）']];
    inputValue[COL['値引き後の食費（消費税）']] = Math.round(inputValue[COL['値引き後の食費（税抜）']] * mealTax);
    inputValue[COL['値引き後の食費（税込）']] = inputValue[COL['値引き後の食費（税抜）']] + inputValue[COL['値引き後の食費（消費税）']];
    inputValue[COL['値引き後の共益費（税抜）']] = inputValue[COL['共益費の積み上げ']];

  } else {
    // 値引きする場合
    inputValue[COL['上限額との差額（税抜）']] = inputValue[COL['税抜の合計']] - inputValue[COL['個別上限額（税抜）']];
    // 差額は食費から引く。食費を超える場合は共益費から引く。
    if (inputValue[COL['食費の積み上げ（税抜）']] >= inputValue[COL['上限額との差額（税抜）']]) {
      inputValue[COL['値引き後の食費（税抜）']] = inputValue[COL['食費の積み上げ（税抜）']] - inputValue[COL['上限額との差額（税抜）']];
      inputValue[COL['値引き後の食費（消費税）']] = Math.round(inputValue[COL['値引き後の食費（税抜）']] * mealTax);
      inputValue[COL['値引き後の食費（税込）']] = inputValue[COL['値引き後の食費（税抜）']] + inputValue[COL['値引き後の食費（消費税）']];
      inputValue[COL['値引き後の共益費（税抜）']] = inputValue[COL['共益費の積み上げ']];
    } else {

      // 食費を超える場合は共益費からも値引きする。
      inputValue[COL['値引き後の食費（税抜）']] = 0;
      inputValue[COL['値引き後の食費（消費税）']] = Math.round(inputValue[COL['値引き後の食費（税抜）']] * mealTax);
      inputValue[COL['値引き後の食費（税込）']] = inputValue[COL['値引き後の食費（税抜）']] + inputValue[COL['値引き後の食費（消費税）']];
      const discountCommonServiceNoTax = inputValue[COL['上限額との差額（税抜）']] - inputValue[COL['食費の積み上げ（税抜）']];
      inputValue[COL['値引き後の共益費（税抜）']] = inputValue[COL['共益費の積み上げ']] - discountCommonServiceNoTax;
    }
  }

  inputValue[COL['値引き後の総額（税抜）']] =
    inputValue[COL['家賃の積み上げ']]
    + inputValue[COL['サービス相談費の積み上げ']]
    + inputValue[COL['経管栄養物品管理費(税抜)']]
    + inputValue[COL['値引き後の共益費（税抜）']]
    + inputValue[COL['値引き後の食費（税抜）']]



  const aggedTaxRate = aggByTaxRate(inputValue, taxInfo, true/*isWelfare*/);
  inputValue[COL['税込み対象の合計']] = aggedTaxRate['10％']['税込'];
  inputValue[COL['課税対象の税抜合計']] = aggedTaxRate['10％']['税抜'];
  inputValue[COL['消費税の合計']] = aggedTaxRate['10％']['消費税'];

  inputValue[COL['税込み対象の合計（8％）']] = aggedTaxRate['8％']['税込'];
  inputValue[COL['課税対象の税抜合計（8％）']] = aggedTaxRate['8％']['税抜'];
  inputValue[COL['消費税の合計（8％）']] = aggedTaxRate['8％']['消費税'];

  inputValue[COL['請求金額(税込)']] =
    inputValue[COL['値引き後の総額（税抜）']]
    + inputValue[COL['消費税の合計']]
    + inputValue[COL['消費税の合計（8％）']]
  ;

}

function aggByTaxRate(inputValue, taxInfo, isWelfare){
  function decideTaxRatePropertyName(taxRate){
    if(taxRate === 0.1) return '10％';
    if(taxRate === 0.08) return '8％';
    return 'other';
  }

  const COL = InputBase.ColIndex;
  const result = {'10％': {'税抜': 0, '消費税': 0, '税込': 0}, '8％': {'税抜': 0, '消費税': 0, '税込': 0}, 'other': {'税抜': 0, '消費税': 0, '税込': 0}};

  var p = decideTaxRatePropertyName(taxInfo[TaxRateMaster.rentIndex]);
  result[p]['税抜'] += isWelfare ? inputValue[COL['家賃の積み上げ']] : inputValue[COL['家賃非生保']];
  result[p]['税込'] += isWelfare ? inputValue[COL['家賃の積み上げ']] : inputValue[COL['家賃非生保']];

  var p = decideTaxRatePropertyName(taxInfo[TaxRateMaster.commonServiceFeeIndex]);
  result[p]['税抜'] += isWelfare ? inputValue[COL['値引き後の共益費（税抜）']] : inputValue[COL['共益費非生保']];
  result[p]['税込'] += isWelfare ? inputValue[COL['値引き後の共益費（税抜）']] : inputValue[COL['共益費非生保']];

  var p = decideTaxRatePropertyName(taxInfo[TaxRateMaster.lifeConsultationFeeIndex]);
  result[p]['税抜'] += isWelfare ? inputValue[COL['サービス相談費の積み上げ']]: inputValue[COL['生活相談サービス費(税抜)']];
  result[p]['消費税'] += inputValue[COL['サービス相談費の消費税']];
  result[p]['税込'] += inputValue[COL['税込みのサービス相談費']];

  var p = decideTaxRatePropertyName(taxInfo[TaxRateMaster.tubeFeedingManagementFeeIndex]);
  result[p]['税抜'] += inputValue[COL['経管栄養物品管理費(税抜)']];
  result[p]['消費税'] += inputValue[COL['経管栄養の消費税']];
  result[p]['税込'] += inputValue[COL['税込みの経管栄養費']];

  var p = decideTaxRatePropertyName(taxInfo[TaxRateMaster.mealFeeIndex]);
  result[p]['税抜'] += inputValue[COL['値引き後の食費（税抜）']];
  result[p]['消費税'] += inputValue[COL['値引き後の食費（消費税）']];
  result[p]['税込'] += inputValue[COL['値引き後の食費（税込）']];
  return result;
}

//*************************************
//居住日数を計算
//*************************************
Calculation.calcLivingDays = function(moveInDateVal, moveOutDateStr, year, month) {
  //入居日・退去日が月内の場合は利用日数を計算
  const firstDate = CommonUtil.getFirstDayOfMonth(year, month);
  const lastDate = CommonUtil.getLastDayOfMonth(year, month);

  let startDate = firstDate;
  let endDate = lastDate;

  let moveInFlg = false;
  let moveOutFlg = false;

  if (moveInDateVal != "") {
    const moveInDate = new Date(Date.parse(moveInDateVal));
    if (moveInDate
      && moveInDate.getFullYear() == Number(year)
      && moveInDate.getMonth() + 1 == Number(month)) {
      //入居日が当月内
      moveInFlg = true;
      startDate = moveInDate;
    }
  }

  if (moveOutDateStr != "") {
    const moveOutDate = new Date(Date.parse(moveOutDateStr));
    if (moveOutDate
      && moveOutDate.getFullYear() == Number(year)
      && moveOutDate.getMonth() + 1 == Number(month)) {
      //退去日が当月内
      moveOutFlg = true;
      endDate = moveOutDate;
    }
  }

  const logStr = CommonUtil.getFormatedDate(startDate) + (moveInFlg ? "(途中入居)" : "") +  " ～ " + CommonUtil.getFormatedDate(endDate) + (moveOutFlg ? "(途中退去)" : "");

  //日数を出すためには1日加算する必要がある
  endDate = new Date(endDate.setDate(endDate.getDate() + 1));
  const livingDays = (endDate - startDate) / 86400000;

  CommonUtil.logger("◆居住日数:" + livingDays + "日間[" + logStr + "]");
  return livingDays;
}

/**
 * 入院日退院日から入院日数を計算する
 * 
 * @param {number} year - 対象年
 * @param {number} month - 対象月
 * @param {date} admissionDate - 入院日
 * @param {date} dischargeDate - 退院日
 * 
 * @return {number} 入院日数
 */
Calculation.calcHospitalizationDays = function(year, month, admissionDate, dischargeDate){
  function isTargetMonth(date, year, month){
    return (date.getFullYear() === year) && (date.getMonth() + 1 === month);
  }

  const firstDayMonth = new Date(year, month - 1, 1);
  const lastDayMonth = new Date(year, month, 0);

  let 除外日数 = 0;
  if(admissionDate && isTargetMonth(admissionDate, year, month)){
    除外日数++;
  }
  if(dischargeDate && isTargetMonth(dischargeDate, year, month)){
    除外日数++;
  }

  //対象月以降に入院している場合は対象外
  if(lastDayMonth < admissionDate){
    return 0;
  }
  //対象月以前に入院していて対象月以前に退院している場合は対象外
  if((admissionDate < firstDayMonth) &&
     (dischargeDate !== null/*退院日が指定されていない場合日付の比較でtrueとなるのでnullチェックする*/ && dischargeDate < firstDayMonth)){
    return 0;
  }

  let hospitalizationDays = 0;
  if(!admissionDate || (admissionDate < firstDayMonth)) admissionDate  = firstDayMonth;//入院日が指定されていないなら月初日を
  if(!dischargeDate || (lastDayMonth < dischargeDate)) dischargeDate  = lastDayMonth;//退院日が指定されていないなら月末日を
  if(dischargeDate < admissionDate) dischargeDate = lastDayMonth;//入院日より退院日が前が指定されているなら退院日は月末日を

  hospitalizationDays = (dischargeDate - admissionDate)
  hospitalizationDays = hospitalizationDays / 1000 / 60 / 60 /24;
  hospitalizationDays++;
  //入院日、退院日、は除いて入院日数は算出する
  hospitalizationDays -= 除外日数;
  if(hospitalizationDays < 0){
    return 0;
  }
  return hospitalizationDays;
}

/**
 * 入退院リストから入院オブジェクト(入院日数、期間表示用文字列)を取得する
 * 
 * @param {number} year - 対象年
 * @param {number} month - 対象月
 * @param {array} admissionDischargeList - 入退院リスト
 * @param {date} dischargeDate - 退去日 未設定の場合はnull値
 * 例: [
 *    {"あおぞらID":"90001","入院日":date object,"退院日":date object},
 *    {"あおぞらID":"90001","入院日":date object,"退院日":null},
 *  ]
 * 
 * @return {object} {'入院日数': number, '期間表示用文字列': string}
 */
Calculation.getHospitalizationDaysByList = function(year, month, admissionDischargeList, dischargeDate){
  function isTargetMonth(date, year, month){
    return (date.getFullYear() === year) && (date.getMonth() + 1 === month);
  }

  let hospitalizationDays = 0;
  const hospitalizationDispStrList = [];
  //日付順に並び替えて、入退院をセットにして入院日数を合算する。
  admissionDischargeList.sort(function(a, b){
    return a["入院日"].getTime() - b["入院日"].getTime();
  });
  admissionDischargeList.forEach(function(d, i){
    const taiinnDate = d["退院日"] || dischargeDate;
    hospitalizationDays += Calculation.calcHospitalizationDays(year, month, d["入院日"], taiinnDate);

    if(dischargeDate && isTargetMonth(dischargeDate, year, month)) {
      // 退院日が未指定かつ、退去日が指定されている場合は入院日数にカウントする
      if (!d["退院日"] && dischargeDate) hospitalizationDays += 1;
      // 退院日と退去日に同じ日にちの場合に退院日の食事が発生してしまうのを調整する。Kintoneリニューアル後は入力する同じ日を入力する。
      if (d["退院日"] && dischargeDate && Utilities.formatDate(d["退院日"], 'JST', 'yyyy/MM/dd') === Utilities.formatDate(dischargeDate, 'JST', 'yyyy/MM/dd')) hospitalizationDays += 1;
    }

    if(hospitalizationDays > 0){
      let str = Utilities.formatDate(d["入院日"], 'JST', 'yyyy/MM/dd') + '〜';
      str += (taiinnDate ? Utilities.formatDate(taiinnDate, 'JST', 'yyyy/MM/dd') : '');
      hospitalizationDispStrList.push(str)
    }
  });

  return {'入院日数': hospitalizationDays, '期間表示用文字列': hospitalizationDispStrList.join(', ')};
}
