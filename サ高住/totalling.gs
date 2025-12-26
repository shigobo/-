var Totalling = {};

//*************************************
//定義
//*************************************

//集計ファイルのシート名
Totalling.sheetNameTotalling = "シート1";

/**
 * 全拠点の入力値をチェックする
 * 
 * @param {string} year - 年
 * @param {string} month - 月
 * @return {object} チェック結果の配列
 */
Totalling.checkInputSheets = function(year, month) {
  const errorList = Totalling.checkInputFiles(year, month);

  return errorList;
}

/**
 * 集計ファイルを作成する
 * 
 * @param {string} year - 年
 * @param {string} month - 月
 * @return {string} 作成した集計SSのID
 */
Totalling.createTotallingFile = function(year, month) {
  //ファイル名
  const totallingTargetName = "【売上集計】サ高住" + year + "年" + month + "月分";

  //新規作成
  let totallingFileId = "";
  try {
    totallingFileId = Totalling.createFileToFolder(totallingTargetName + "_" + CommonUtil.getTimeStamp(), Totalling.folderId);
  } catch {}

  return totallingFileId;
}

/**
 * 集計する
 * 
 * @param {string} year - 年
 * @param {string} month - 月
 * @param {string} totallingFileId - 集計SSのID
 */
Totalling.total = function(year, month, totallingFileId) {
  //集計
  const totalList = Totalling.getTotalling(year, month);

  //ファイル書き込み
  Totalling.writeToTotallingFile(totallingFileId, totalList);
}

//*************************************
//各拠点の情報を集めて集計する
//*************************************
Totalling.getTotalling = function(year, month) {
  const taxInfo = TaxRateMaster.getTaxRateList();
  let retList = [];

  //ヘッダ
  const header = [];
  header.push("顧客ID");
  header.push("氏名");
  header.push("拠点");
  header.push("部屋");
  header.push("経管栄養物品管理費");
  header.push("食費");
  header.push("家賃");
  header.push("共益費");
  header.push("生活相談サービス費");
  header.push("請求額");
  header.push("対象月");
  retList.push(header);

  //拠点ごとに集計して配列に追加
  for(let inputSsId of Totalling.inputSsIdList) {
    const inputSheet = Totalling.getInputSheet(inputSsId, year, month);
    //拠点名を取得
    const facility = inputSheet.getRange(InputBase.posFacility).getValue();

    //全行データ取得
    const inputSheetValues = Input.getInputSheetValues(inputSheet);
    if (!inputSheetValues || inputSheetValues.length <= 0) {
      continue;
    }
    const targetDate = [year, month].join('/');
    //集計
    retList = retList.concat(Totalling.getTotallingByFacility(inputSheetValues, facility, targetDate, taxInfo));
  }

  return retList;
}

//*************************************
//集計ファイルに書き込み
//*************************************
Totalling.writeToTotallingFile = function(totallingFileId, totalList) {
  const totallingSs = SpreadsheetApp.openById(totallingFileId);
  const totallingSheet = totallingSs.getSheetByName(Totalling.sheetNameTotalling);

  totallingSheet.clear();

  //書き込み
  const totallingRange = totallingSheet.getRange(1, 1, totalList.length, totalList[0].length);
  totallingRange.setValues(totalList);
  //罫線を引く
  totallingRange.setBorder(true, true, true, true, true, true);
}

//*************************************
//集計対象の入力ファイルの正当性をチェック
//*************************************
Totalling.checkInputFiles = function(year, month) {

  const errorList = [];

  for (let inputSsId of Totalling.inputSsIdList) {
    const inputSheet = Totalling.getInputSheet(inputSsId, year, month);
    if (!inputSheet) {
      //mainシートから拠点名を取得
      const facility = SpreadsheetApp.openById(inputSsId).getSheetByName(InputMain.sheetName).getRange(InputMain.posFacility).getValue();
      errorList.push("[" + facility + "]　入力シートがまだ作成されていません");
      continue;
    }

    const _errorList = Input.checkInput(inputSheet);
    if(_errorList.length > 0){
      errorList.push(inputSheet.getName() + ' の実績が確定していません');
    }

    const sheetValues = Input.getInputSheetValues(inputSheet);
    if (!sheetValues || sheetValues.length <= 0) {
      continue;
    }

    for (let sheetValue of sheetValues) {
      if (sheetValue[InputBase.ColIndex['ID']]) {
        if (!sheetValue[InputBase.ColIndex['請求金額(税込)']]) {
          const facility = inputSheet.getRange(InputBase.posFacility).getValue();
          errorList.push("[" + facility + "]　入力が完了していません");
          break;
        }
      }
    }
  }

  return errorList;
}

//*************************************
//入力シートを取得
//*************************************
Totalling.getInputSheet = function(ssId, year, month) {
  const ss = SpreadsheetApp.openById(ssId);
  const inputMainSheet = ss.getSheetByName(InputMain.sheetName);
  const facility = inputMainSheet.getRange(InputMain.posFacility).getValue();

  const inputSheetName = year + "年" + month + "月分";
  const sheet = ss.getSheetByName(inputSheetName);

  return sheet;
}

//*************************************
//各拠点ごとに集計
//*************************************
Totalling.getTotallingByFacility = function(sheetValues, facility, targetDate, taxInfo) {
    const retList = [];
    const facilityConfig = Configs.convertFacilityNameToCode[facility];
    const facilityStr = facilityConfig['code'] + '_' + facility + (facilityConfig['拠点を付与しない'] ? '': '拠点');

    for (let sheetValue of sheetValues) {
      const isWelfare = sheetValue[InputBase.ColIndex['生保']] == "〇";
      const tubeFeedingManagementFee = sheetValue[InputBase.ColIndex['税込みの経管栄養費']];
      const meal = isWelfare ? sheetValue[InputBase.ColIndex['値引き後の食費（税込）']] : 0;
      const rent = isWelfare ? sheetValue[InputBase.ColIndex['家賃の積み上げ']] :sheetValue[InputBase.ColIndex['家賃非生保']];
      const commonServiceFee = isWelfare ? sheetValue[InputBase.ColIndex['値引き後の共益費（税抜）']] : sheetValue[InputBase.ColIndex['共益費非生保']];

      //1行分の情報
      const line = [];
      line.push(sheetValue[InputBase.ColIndex['ID']]);
      line.push(sheetValue[InputBase.ColIndex['利用者名']]);
      line.push(facilityStr);
      line.push(sheetValue[InputBase.ColIndex['階']] + '-' + sheetValue[InputBase.ColIndex['居室番号']] + "号入居");
      line.push(tubeFeedingManagementFee);
      line.push(meal);
      line.push(rent);
      line.push(commonServiceFee);
      line.push(sheetValue[InputBase.ColIndex['税込みのサービス相談費']]);
      line.push(sheetValue[InputBase.ColIndex['請求金額(税込)']]);
      line.push(targetDate);

      retList.push(line);
    }

    return retList;
}

//*************************************
//新規ファイルを追加
//*************************************
Totalling.createFileToFolder = function(targetName, folderId) {
  const ss = SpreadsheetApp.create(targetName);
  const file = DriveApp.getFileById(ss.getId());
  
  DriveApp.getFolderById(folderId).addFile(file);
  
  DriveApp.getRootFolder().removeFile(file);

  return file.getId();
}