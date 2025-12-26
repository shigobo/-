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
      //mainシートから拠点名を取得
      const facility = SpreadsheetApp.openById(inputSsId).getSheetByName(InputMain.sheetName).getRange(InputMain.posFacility).getValue();
      errorList.push("[" + facility + "]　" + inputSheet.getName() + ' の実績が確定していません');
    }

    const sheetValues = Input.getInputSheetValues(inputSheet);
    if (!sheetValues || sheetValues.length <= 0) {
      continue;
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
  const inputSheetName = year + "年" + month + "月分";
  const sheet = ss.getSheetByName(inputSheetName);

  return sheet;
}

/**
 * 集計ファイルを作成する
 * 
 * @param {string} year - 年
 * @param {string} month - 月
 * @param {string} corporate - 法人名
 * @param {string} facility - 施設名
 * @return {string} 作成した集計SSのID
 */
Totalling.createTotallingFile = function(year, month, corporate, facility) {
  // スプレッドシート「マスター」から会計部門コード情報を取得する
  Totalling.AccountingDepartmentCodes = AccountingDepartmentCode.getAccountingDepartmentCode();
  //ファイル名
  const totallingTargetName = [
    "【売上集計】有料",
    corporate,
    facility ? facility : "",
    year,
    "年",
    month,
    "月分"
  ].join("");

  //新規作成
  const totallingFileId = Totalling.createFileToFolder(totallingTargetName + "_" + CommonUtil.getTimeStamp(), Totalling.folderId);

  return totallingFileId;
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

/**
 * 集計する
 * 
 * @param {string} year - 年
 * @param {string} month - 月
 */
Totalling.total = function(year, month) {
  //集計
  const targetDate = [year, month].join('/');
  const header = [];
  header.push("顧客ID");
  header.push("氏名");
  header.push("拠点");
  header.push("部屋");
  header.push("管理費");
  header.push("食費");
  header.push("家賃");
  header.push("その他費用");
  header.push("請求額");
  header.push("対象月");

  const obj = {};
  // 集計する
  obj[Configs.corporateName] = {};
  for (let facility in Configs.aggedFacilitiesObj) {
    const facilitiesObj = Configs.aggedFacilitiesObj[facility];
    const inputSheet = Totalling.getInputSheet(facilitiesObj['ss']['id'], year, month);
    const _inputSheetValues = Input.getInputSheetValues(inputSheet);
    if (facilitiesObj['拠点ごと集計']) {
      obj[facility] = _inputSheetValues;
    } else {
      obj[Configs.corporateName][facility] = _inputSheetValues;
    }
  }

  // 出力する
  for (let property in obj) {
    // 法人ごと集計
    if (property === Configs.corporateName) {
      let retList = [header];
      if (Object.keys(obj[property]).length === 0) continue;
      const totallingFileId = Totalling.createTotallingFile(year, month, property);
      for (let facility in obj[property]) {
        retList = retList.concat(Totalling.getTotallingByFacility(obj[property][facility], facility, targetDate));
      }
      Totalling.writeToTotallingFile(totallingFileId, retList);

    // 拠点ごと集計
    } else {
      const facility = property;
      let retList = [header];
      const totallingFileId = Totalling.createTotallingFile(year, month, Configs.corporateName, facility);
      retList = retList.concat(Totalling.getTotallingByFacility(obj[facility], facility, targetDate));
      Totalling.writeToTotallingFile(totallingFileId, retList);
    }
  }

}

//*************************************
//集計ファイルに書き込み
//*************************************
Totalling.writeToTotallingFile = function(totallingFileId, totalList, facility) {
  const totallingSs = SpreadsheetApp.openById(totallingFileId);
  let totallingSheet = totallingSs.getSheetByName(Totalling.sheetNameTotalling);
  if(facility){
    totallingSheet = totallingSheet.copyTo(totallingSs).setName(facility);
  }
  totallingSheet.clear();

  //書き込み
  const totallingRange = totallingSheet.getRange(1, 1, totalList.length, totalList[0].length);
  totallingRange.setValues(totalList);
  //罫線を引く
  totallingRange.setBorder(true, true, true, true, true, true);
}

//*************************************
//各拠点ごとに集計
//*************************************
Totalling.getTotallingByFacility = function(sheetValues, facility, targetDate) {
  const retList = [];
  const facilityStr = Totalling.AccountingDepartmentCodes[facility];

  for (let sheetValue of sheetValues) {
    //1行分の情報
    const line = [];
    line.push(sheetValue[InputBase.ColIndex['ID']]);
    line.push(sheetValue[InputBase.ColIndex['利用者名']]);
    line.push(facilityStr);
    line.push([sheetValue[InputBase.ColIndex['階']], sheetValue[InputBase.ColIndex['居室番号']]].join('') + "号入居");
    line.push(sheetValue[InputBase.ColIndex['値引き後の管理費']]);
    line.push(sheetValue[InputBase.ColIndex['値引き後の食費（税込）']]);
    line.push(sheetValue[InputBase.ColIndex['値引き後の家賃']]);
    line.push(sheetValue[InputBase.ColIndex['オプション（税込み）']]);
    line.push(sheetValue[InputBase.ColIndex['請求額']]);
    line.push(targetDate);

    retList.push(line);
  }

  return retList;
}
