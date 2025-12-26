//共通ユーティリティメソッド
var CommonUtil = {};

//*************************************
//フォルダ内にファイルが存在すればIDを取得。なければnullを返す
//*************************************
CommonUtil.getFileId = function(fileName, folderId) {
  let ret = null;

  const folder = DriveApp.getFolderById(folderId);
  const files = folder.getFiles();

  while (files.hasNext()) {
    const file = files.next();
    if(file.getName() == fileName) {
      ret = file.getId();
      break;
    }
  }

  return ret;
}

//*************************************
//Dateを日本時間に変換
//*************************************
CommonUtil.dateConvertToJst = function(date) {
  const dateStr = Utilities.formatDate(date, 'Asia/Tokyo', 'yyyy/MM/dd');
  const dateStrSplit = dateStr.split('/');
  const year = dateStrSplit[0];
  const month = dateStrSplit[1];
  const day = dateStrSplit[2];

  return new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0);
}

//*************************************
//指定月の最初の日付を求める
//*************************************
CommonUtil.getFirstDayOfMonth = function(year, month) {
  const date = new Date(Number(year), Number(month) - 1, 1, 0, 0, 0, 0);

  return date;
}

//*************************************
//指定月の最終日を求める
//*************************************
CommonUtil.getLastDayOfMonth = function(year, month) {
  //次月の1日から1日引くと当月最終日が取得できる。
  const date = new Date(Number(year), Number(month), 1, 0, 0, 0, 0);
  const resDate = new Date(date.setDate(date.getDate() - 1));

  return resDate;
}

//*************************************
//指定月の日数を求める
//*************************************
CommonUtil.getDaysOfMonth = function(year, month) {
  let lastDate = CommonUtil.getLastDayOfMonth(year, month);
  lastDate = CommonUtil.dateConvertToJst(lastDate);
  const resDays = lastDate.getDate();

  return resDays;
}

//*************************************
//年月日表示文字列に変換
//*************************************
CommonUtil.getFormatedDate = function(date) {
  return Utilities.formatDate(date, 'Asia/Tokyo', 'yyyy/MM/dd');
}

//*************************************
//現在時刻のタイムスタンプ文字列を取得
//*************************************
CommonUtil.getTimeStamp = function() {
  return Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMMddHHmmss');
}
//*************************************
//デバッグログ制御
//*************************************
CommonUtil.logger = function(text) {
  console.log(text);
}

/**
 * 住所と郵便番号を抽出する
 *
 * @param {string} str - 住所と郵便番号が含まれた文字列
 * 
 * @return {object} 住所と郵便番号が含まれたオブジェクト
 */
CommonUtil.extractAddress = function(str){
  const matched = str.match(/〒(\d{3}-\d{4})\s(.+)$/);
  if(matched){
    return {address: matched[2], postCode: matched[1]};
  }

  return {address: '', postCode: ''};
}

/**
 * 指定した月数後の年月文字列を生成する
 * @param {number} year 年
 * @param {number} month 月
 * @param {number} monthsToAdd 何ヶ月後か
 * @returns {string} 年月文字列
 */
CommonUtil.generateMonthsLaterStr = function(year, month, monthsToAdd) {
  const currentDate = new Date(year, month - 1, 1);

  currentDate.setMonth(currentDate.getMonth() + monthsToAdd);

  return Utilities.formatDate(currentDate, "JST", "yyyy年M月");
}

/**
 * ダイアログを開を表示する
 * テスト等でBrowser.msgBoxのふるまいを変えたい場合に場合にこちらのメソッドを使用する
 * 
 * @param {string} prompt - ダイアログ ボックスに表示されるテキスト
 * @param {ButtonSet} buttons - 使用するボタンセットのタイプ
 * @returns {string} ユーザーが入力したテキスト
 */
CommonUtil.msgBox = function(prompt, buttons){
  return Browser.msgBox(prompt, buttons);
}
