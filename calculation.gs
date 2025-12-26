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
  const taxInfo = TaxRateMaster.getTaxRateList()
  for (let i = 0; i < inputSheetValues.length; i++) {
    //1名分のデータ
    const inputValue = inputSheetValues[i];

    //計算
    Calculation.calcForPerson(inputValue, taxInfo, year, month);

    //inputValue.lengthが生保・非生保で異なるので、1行ずつ書き込む
    inputSheet.getRange(InputBase.rowStart + i, 1, 1, inputValue.length).setValues([inputValue]);
  }
}

//*************************************
//一人分の計算
//*************************************
Calculation.calcForPerson = function(inputValue, taxInfo, year, month) {
  CommonUtil.logger("====[" + inputValue[InputBase.ColIndex['ID']] + "][" + inputValue[InputBase.ColIndex['利用者名']] + "]=======================================================");

  //基本料金
  if(inputValue[InputBase.ColIndex['生保']] == "〇"){
    Calculation.calcBasicFeesWelfare(inputValue, taxInfo, year, month);
  }else{
    Calculation.calcBasicFeesGeneral(inputValue, taxInfo, year, month);
  }
}

/**
 * 基本料金の計算 一般
 * 
 * @param {array} inputValue - 入力値
 * @param {array} taxInfo - 税率
 * @param {string} year - 計算対象年
 * @param {string} month - 計算対象月
 */
Calculation.calcBasicFeesGeneral = function(inputValue, taxInfo, year, month) {
  const managementTax = taxInfo[TaxRateMaster.managementFeeIndex];
  const mealTax = taxInfo[TaxRateMaster.mealFeeIndex];
  const rentTax = taxInfo[TaxRateMaster.rentIndex];

  const COL = InputBase.ColIndex;

  // 生保・非生保 共通の計算項目
  inputValue[COL['オプション（消費税）']] = inputValue[COL['オプション金額（税抜）']] * taxInfo[TaxRateMaster.optionIndex];
  inputValue[COL['オプション（税込み）']] = inputValue[COL['オプション金額（税抜）']] -0/*未入力の場合""なので文字列結合されてしまうのを回避*/ + inputValue[COL['オプション（消費税）']];

  // Configs.facilityObj["calcPattern"]によらず非生保は管理費は請求可能（＝在籍日数で）
  inputValue[COL['管理費計算月額（税抜）']] = inputValue[COL['管理費（日額）']] * Calculation.getMngCalcDaysPerPattern(inputValue);

  inputValue[COL['家賃計算月額（税抜）']] = inputValue[COL['家賃（日額）']] * inputValue[COL['在籍日数']];
  inputValue[COL['家賃（消費税）']] = Math.round(inputValue[COL['家賃計算月額（税抜）']] * rentTax);

  inputValue[COL['管理費（消費税）']] = Math.round(inputValue[COL['管理費計算月額（税抜）']] * managementTax);
  
  inputValue[COL['食費（税抜）']] = inputValue[COL['食費（日額）']] * Calculation.getMealCalcDaysPerPattern(inputValue);
  inputValue[COL['食費（消費税）']] = Math.round(inputValue[COL['食費（税抜）']] * mealTax);
  inputValue[COL['食費（税込）']] = inputValue[COL['食費（税抜）']] + inputValue[COL['食費（消費税）']];

  inputValue[COL['合計金額']] = 
    inputValue[COL['家賃計算月額（税抜）']]
    + inputValue[COL['管理費計算月額（税抜）']]
    + inputValue[COL['食費（税抜）']]
  ;

  Calculation.calcDiscountAndTotal(inputValue, taxInfo, year, month);

  return;

}

Calculation.aggByTaxRate = function(inputValue, taxInfo){
  function decideTaxRatePropertyName(taxRate){
    if(taxRate === 0.1) return '10％';
    if(taxRate === 0.08) return '8％';
    return 'other';
  }

  const COL = InputBase.ColIndex;
  const result = {
    '10％': {'税抜': 0, '消費税': 0, '税込': 0},
    '8％': {'税抜': 0, '消費税': 0, '税込': 0},
    'other': {'税抜': 0, '消費税': 0, '税込': 0}
  };

  var p = decideTaxRatePropertyName(taxInfo[TaxRateMaster.managementFeeIndex]);
  result[p]['税抜'] += inputValue[COL['家賃計算月額（税抜）']] -0;
  result[p]['消費税'] += inputValue[COL['値引き後の家賃（消費税）']] -0;
  result[p]['税込'] += inputValue[COL['家賃計算月額（税抜）']] -0;

  var p = decideTaxRatePropertyName(taxInfo[TaxRateMaster.mealFeeIndex]);
  result[p]['税抜'] += inputValue[COL['値引き後の食費（税抜）']] -0;
  result[p]['消費税'] += inputValue[COL['値引き後の食費（消費税）']] -0;
  result[p]['税込'] += inputValue[COL['値引き後の食費（税込）']] -0;

  var p = decideTaxRatePropertyName(taxInfo[TaxRateMaster.rentIndex]);
  result[p]['税抜'] += inputValue[COL['値引き後の管理費']] -0;
  result[p]['消費税'] += inputValue[COL['値引き後の管理費（消費税）']] -0;
  result[p]['税込'] += inputValue[COL['値引き後の管理費']] -0;

  var p = decideTaxRatePropertyName(taxInfo[TaxRateMaster.optionIndex]);
  result[p]['税抜'] += (inputValue[COL['オプション金額（税抜）']] > 0 ? inputValue[COL['オプション金額（税抜）']] -0 : 0);
  result[p]['消費税'] += inputValue[COL['オプション（消費税）']] -0;
  result[p]['税込'] += inputValue[COL['オプション（税込み）']] -0;
  
  return result;
}

/**
 * 値引きの計算と合計金額の算出
 * 
 * @param {array} inputValue - 入力値
 * @param {array} taxInfo - 税率
 * @param {string} year - 計算対象年
 * @param {string} month - 計算対象月
 */
Calculation.calcDiscountAndTotal = function(inputValue, taxInfo, year, month) {
  const mealTax = taxInfo[TaxRateMaster.mealFeeIndex];

  const COL = InputBase.ColIndex;

  // 値引きが必要か
  if (inputValue[COL['合計金額']] <= inputValue[COL['個別上限額（税抜）']]) {
    // 値引きしない場合
    inputValue[COL['上限額との差額']] = 0;
    Calculation.calcDiscountWithoutDiscount(inputValue);

  } else {
    // 値引きする場合
    inputValue[COL['上限額との差額']] = inputValue[COL['合計金額']] - inputValue[COL['個別上限額（税抜）']];
    // 差額は食費から引く。食費を超える場合は管理費から引く。
    if (inputValue[COL['食費（税抜）']] >= inputValue[COL['上限額との差額']]) {

      inputValue[COL['値引き後の食費（税抜）']] = inputValue[COL['食費（税抜）']] - inputValue[COL['上限額との差額']];
      inputValue[COL['値引き後の食費（消費税）']] = Math.round(inputValue[COL['値引き後の食費（税抜）']] * mealTax);
      inputValue[COL['値引き後の食費（税込）']] = inputValue[COL['値引き後の食費（税抜）']] + inputValue[COL['値引き後の食費（消費税）']];

      inputValue[COL['値引き後の管理費']] = inputValue[COL['管理費計算月額（税抜）']];
      inputValue[COL['値引き後の管理費（消費税）']] = inputValue[COL['管理費（消費税）']];

      inputValue[COL['値引き後の家賃']] = inputValue[COL['家賃計算月額（税抜）']];
      inputValue[COL['値引き後の家賃（消費税）']] = inputValue[COL['家賃（消費税）']];

    } else {
      // ◯管理費がマイナスになるケースがある（家賃よりも個別上限額が低い時）
      // └ 値引き額が食費を上回るときは、管理費から値引き、管理をも上回るときは家賃から値引く

      // 食費を超える場合は管理費からも値引きする。
      inputValue[COL['値引き後の食費（税抜）']] = 0;
      inputValue[COL['値引き後の食費（消費税）']] = Math.round(inputValue[COL['値引き後の食費（税抜）']] * mealTax);
      inputValue[COL['値引き後の食費（税込）']] = inputValue[COL['値引き後の食費（税抜）']] + inputValue[COL['値引き後の食費（消費税）']];

      // 管理費から値引きしても足りない場合は家賃からも値引きする。
      const discountMngNoTax = inputValue[COL['上限額との差額']] - inputValue[COL['食費（税抜）']];
      if ((inputValue[COL['管理費計算月額（税抜）']] - discountMngNoTax) < 0) {

        inputValue[COL['値引き後の管理費']] = 0;
        inputValue[COL['値引き後の管理費（消費税）']] = 0;
  
        inputValue[COL['値引き後の家賃']] = inputValue[COL['家賃計算月額（税抜）']] + (inputValue[COL['管理費計算月額（税抜）']] - discountMngNoTax);
        const rentTax = taxInfo[TaxRateMaster.rentIndex];
        inputValue[COL['値引き後の家賃（消費税）']] = Math.round(inputValue[COL['値引き後の家賃']] * rentTax);
      } else {
        inputValue[COL['値引き後の管理費']] = inputValue[COL['管理費計算月額（税抜）']] - discountMngNoTax;
        inputValue[COL['値引き後の管理費（消費税）']] = inputValue[COL['管理費（消費税）']];
  
        inputValue[COL['値引き後の家賃']] = inputValue[COL['家賃計算月額（税抜）']];
        inputValue[COL['値引き後の家賃（消費税）']] = inputValue[COL['家賃（消費税）']];  
      }

    }
  }

  Calculation.calcByTaxRate(inputValue, taxInfo);
  Calculation.calcTotal(inputValue, taxInfo);
}

/**
 * 税率ごとの計算
 */
Calculation.calcByTaxRate = function(inputValue, taxInfo){
  const COL = InputBase.ColIndex;

  const aggedTaxRate = Calculation.aggByTaxRate(inputValue, taxInfo);
  inputValue[COL['10％対象（税抜）']] = aggedTaxRate['10％']['税抜'];
  inputValue[COL['10％対象（消費税）']] = aggedTaxRate['10％']['消費税'];
  inputValue[COL['10％対象（税込）']] = aggedTaxRate['10％']['税込'];
  inputValue[COL['軽減8％対象（税抜）']] = aggedTaxRate['8％']['税抜'];
  inputValue[COL['軽減8％対象（消費税）']] = aggedTaxRate['8％']['消費税'];
  inputValue[COL['軽減8％対象（税込）']] = aggedTaxRate['8％']['税込'];
}

/**
 * 合計金額請求額の計算
 */
Calculation.calcTotal = function(inputValue, taxInfo){
  const COL = InputBase.ColIndex;

  inputValue[COL['値引き後の総額（税抜）']] =
    inputValue[COL['値引き後の家賃']]
    + inputValue[COL['値引き後の管理費']]
    + inputValue[COL['値引き後の食費（税抜）']]
  ;
  inputValue[COL['値引き後の合計金額（税込）']] =
    inputValue[COL['値引き後の家賃']]
    + inputValue[COL['値引き後の管理費']]
    + inputValue[COL['値引き後の食費（税込）']]
  ;

  inputValue[COL['請求額']] = inputValue[COL['値引き後の合計金額（税込）']] -0 + inputValue[COL['オプション（税込み）']];
}

/**
 * 値引き無しの場合の差額と値引き額の計算
 */
Calculation.calcDiscountWithoutDiscount = function(inputValue){
  const COL = InputBase.ColIndex;

  inputValue[COL['値引き後の食費（税抜）']] = inputValue[COL['食費（税抜）']];
  inputValue[COL['値引き後の食費（消費税）']] = inputValue[COL['食費（消費税）']];
  inputValue[COL['値引き後の食費（税込）']] = Math.floor(inputValue[COL['食費（税込）']]);

  inputValue[COL['値引き後の家賃']] = inputValue[COL['家賃計算月額（税抜）']];
  inputValue[COL['値引き後の家賃（消費税）']] = inputValue[COL['家賃（消費税）']];
  inputValue[COL['値引き後の管理費（消費税）']] = inputValue[COL['管理費（消費税）']];
  inputValue[COL['値引き後の管理費']] = inputValue[COL['管理費計算月額（税抜）']];

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
  const managementTax = taxInfo[TaxRateMaster.managementFeeIndex];
  const mealTax = taxInfo[TaxRateMaster.mealFeeIndex];
  const rentTax = taxInfo[TaxRateMaster.rentIndex];

  const COL = InputBase.ColIndex;
  const daysOfMonth = CommonUtil.getDaysOfMonth(year, month);//1か月の日数

  // 生保・非生保 共通の計算項目
  inputValue[COL['オプション（消費税）']] = inputValue[COL['オプション金額（税抜）']] * taxInfo[TaxRateMaster.optionIndex];
  inputValue[COL['オプション（税込み）']] = inputValue[COL['オプション金額（税抜）']] -0/*未入力の場合""なので文字列結合されてしまうのを回避*/ + inputValue[COL['オプション（消費税）']];

  // ※ 都道府県によって保護課の判断が異なるので生保の対応は都道府県によって変更可とする
  inputValue[COL['管理費計算月額（税抜）']] = inputValue[COL['管理費（日額）']] * Calculation.getMngCalcDaysPerPattern(inputValue);

  if(inputValue[COL['住宅扶助額']]){
    inputValue[COL['住宅扶助額の日割り']] = inputValue[COL['住宅扶助額']] / daysOfMonth;
  } else {
    inputValue[COL['住宅扶助額の日割り']] = 0;
  }
  if(daysOfMonth !== inputValue[COL['在籍日数']]/*入退去ありの場合だけ家賃は日額から計算する*/){
    // 小数点そのまま、との記載があるので切り捨てしない
    inputValue[COL['家賃計算月額（税抜）']] = Math.round(inputValue[COL['住宅扶助額の日割り']] * inputValue[COL['在籍日数']]);
  }else{
    if(inputValue[COL['住宅扶助額']]){
      inputValue[COL['家賃計算月額（税抜）']] = inputValue[COL['住宅扶助額']];
    } else {
      inputValue[COL['家賃計算月額（税抜）']] = 0;
    }
  }

  inputValue[COL['家賃（消費税）']] = Math.round(inputValue[COL['家賃計算月額（税抜）']] * rentTax);
  inputValue[COL['管理費（消費税）']] = Math.round(inputValue[COL['管理費計算月額（税抜）']] * managementTax);

  inputValue[COL['食費（税抜）']] = inputValue[COL['食費（日額）']] * Calculation.getMealCalcDaysPerPattern(inputValue);
  inputValue[COL['食費（消費税）']] = Math.round(inputValue[COL['食費（税抜）']] * mealTax);
  inputValue[COL['食費（税込）']] = inputValue[COL['食費（税抜）']] + inputValue[COL['食費（消費税）']];

  inputValue[COL['合計金額']] = 
    inputValue[COL['家賃計算月額（税抜）']]
    + inputValue[COL['管理費計算月額（税抜）']]
    + inputValue[COL['食費（税抜）']]
  ;

  if(daysOfMonth == inputValue[COL['在籍日数']]){
    inputValue[COL['個別上限額（税抜）日割り']] = null;
    inputValue[COL['個別上限額（税抜）算出した月額']] = null;

    Calculation.calcDiscountAndTotal(inputValue, taxInfo, year, month);

  }else{
    // 生保の入退去月の場合
    inputValue[COL['個別上限額（税抜）日割り']] = inputValue[COL['個別上限額（税抜）']] / daysOfMonth;
    inputValue[COL['個別上限額（税抜）算出した月額']] = Math.round(inputValue[COL['個別上限額（税抜）日割り']] * inputValue[COL['在籍日数']]);
    // 値引きが必要か
    if(inputValue[COL['個別上限額（税抜）算出した月額']] >= inputValue[COL['合計金額']]){
      // 値引きしない場合
      inputValue[COL['上限額との差額']] = 0;
      Calculation.calcDiscountWithoutDiscount(inputValue);
  
    }else{
      // 値引きする場合
      inputValue[COL['上限額との差額']] = inputValue[COL['合計金額']] - inputValue[COL['個別上限額（税抜）算出した月額']];

      // 差額は食費から引く。食費を超える場合は管理費から引く。
      if (inputValue[COL['食費（税抜）']] >= inputValue[COL['上限額との差額']]) {
        inputValue[COL['値引き後の食費（税抜）']] = inputValue[COL['食費（税抜）']] - inputValue[COL['上限額との差額']];
        inputValue[COL['値引き後の食費（消費税）']] = Math.round(inputValue[COL['値引き後の食費（税抜）']] * mealTax);;
        inputValue[COL['値引き後の食費（税込）']] = inputValue[COL['値引き後の食費（税抜）']] + inputValue[COL['値引き後の食費（消費税）']]

        inputValue[COL['値引き後の管理費']] = inputValue[COL['管理費計算月額（税抜）']];
        inputValue[COL['値引き後の管理費（消費税）']] = inputValue[COL['管理費（消費税）']];
  
        inputValue[COL['値引き後の家賃']] = inputValue[COL['家賃計算月額（税抜）']];
        inputValue[COL['値引き後の家賃（消費税）']] = inputValue[COL['家賃（消費税）']];
  
      } else {
        // ◯管理費がマイナスになるケースがある（家賃よりも個別上限額が低い時）
        // └ 値引き額が食費を上回るときは、管理費から値引き、管理をも上回るときは家賃から値引く
        inputValue[COL['値引き後の食費（税抜）']] = 0;
        inputValue[COL['値引き後の食費（消費税）']] = 0;
        inputValue[COL['値引き後の食費（税込）']] = 0;
  
        // 管理費から値引きしても足りない場合は家賃からも値引きする。
        const discountMngNoTax = inputValue[COL['上限額との差額']] - inputValue[COL['食費（税抜）']];
        if ((inputValue[COL['管理費計算月額（税抜）']] - discountMngNoTax) < 0) {
  
          inputValue[COL['値引き後の管理費']] = 0;
          inputValue[COL['値引き後の管理費（消費税）']] = 0;
    
          inputValue[COL['値引き後の家賃']] = inputValue[COL['家賃計算月額（税抜）']] + (inputValue[COL['管理費計算月額（税抜）']] - discountMngNoTax);
          const rentTax = taxInfo[TaxRateMaster.rentIndex];
          inputValue[COL['値引き後の家賃（消費税）']] = Math.round(inputValue[COL['値引き後の家賃']] * rentTax);
        } else {
          inputValue[COL['値引き後の管理費']] = inputValue[COL['管理費計算月額（税抜）']] - discountMngNoTax;
          inputValue[COL['値引き後の管理費（消費税）']] = inputValue[COL['管理費（消費税）']];
    
          inputValue[COL['値引き後の家賃']] = inputValue[COL['家賃計算月額（税抜）']];
          inputValue[COL['値引き後の家賃（消費税）']] = inputValue[COL['家賃（消費税）']];  
        }
      }

    }

  }

  Calculation.calcByTaxRate(inputValue, taxInfo);
  Calculation.calcTotal(inputValue, taxInfo);
 
  // 明細書に出力するため必要
  inputValue[COL['合計金額']] = 
    inputValue[COL['家賃計算月額（税抜）']]
    + inputValue[COL['管理費計算月額（税抜）']]
    + inputValue[COL['食費（税抜）']]
  ;
  // inputValue[COL['上限額との差額']] = inputValue[COL['合計金額']] - inputValue[COL['値引き後の総額（税抜）']];

  return;
}
/**
 * パターンごとに決まった食費計算日数を取得する
 * @param {array} inputValue - 入力値
 */
Calculation.getMealCalcDaysPerPattern = function (inputValue, facility){
  const COL = InputBase.ColIndex;
  const facilityObj = facility ? Configs.facilitiesObj[facility] : Configs.facilityObj;
  // console.log('facilityObj["calcPattern"]', facilityObj["calcPattern"]);
  if (facilityObj["calcPattern"] === 3) {
    return Calculation.getDaysInRoom(inputValue);
  } else {
    return inputValue[COL['在室日数']];  
  }
}

/**
 * パターンごとに決まった管理費計算日数を取得する
 * @param {array} inputValue - 入力値
 */
Calculation.getMngCalcDaysPerPattern = function (inputValue, facility){
  const COL = InputBase.ColIndex;
  const facilityObj = facility ? Configs.facilitiesObj[facility] : Configs.facilityObj;
  // console.log('facilityObj["calcPattern"]', facilityObj["calcPattern"]);
  if (facilityObj["calcPattern"] === 2) {
    return inputValue[COL['在籍日数']];  
  } else {
    return inputValue[COL['生保']] === "〇" ? inputValue[COL['在室日数']] : inputValue[COL['在籍日数']];
  }
}

/**
 * 在室日数を取得する
 * 経管の利用日数を考慮する
 * @param {array} inputValue - 入力値
 */
Calculation.getDaysInRoom = function(inputValue) {
  const COL = InputBase.ColIndex;
  return inputValue[COL['経管の利用日数']] > 0 ? 
    inputValue[COL['在室日数']] - inputValue[COL['経管の利用日数']] :
    inputValue[COL['在室日数']];
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
