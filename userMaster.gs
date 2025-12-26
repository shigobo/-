//利用者リスト関連メソッド
var UserMaster = {};

//*************************************
//定義
//*************************************

UserMaster.ACGDB = {};
UserMaster.ACGDB.sheetName = "顧客";
UserMaster.ACGDB.headerRowNum = 1;
UserMaster.ACGDB.idColIndex = 0;
UserMaster.ACGDB.familyNameColIndex = 1;
UserMaster.ACGDB.firstNameColIndex = 2;
UserMaster.ACGDB.billingNameColIndex = 6;
UserMaster.ACGDB.billingAddressColIndex = 7;

UserMaster.ACGDB.getUserInfoListAll = function() {
  if(UserMaster.ACGDB.userInfoListAll){
    return UserMaster.ACGDB.userInfoListAll;
  }

  const ss = SpreadsheetApp.openById(UserMaster.ACGDB.ssId);
  const sheet = ss.getSheetByName(UserMaster.ACGDB.sheetName);
  const vals = sheet.getDataRange().getValues();
  
  UserMaster.ACGDB.userInfoListAll = vals.slice(UserMaster.ACGDB.headerRowNum);
  return UserMaster.ACGDB.userInfoListAll;
}

/**
 * ACGデータベースから顧客データを取得する
 * 
 * @return {object} 顧客リスト
 */
UserMaster.ACGDB.getUserInfo = function() {
  const userInfo = {};
  //ACGデータベース全行取得
  const allUserList = UserMaster.ACGDB.getUserInfoListAll();
  allUserList.forEach(function(val){
    userInfo[val[UserMaster.ACGDB.idColIndex]] = {
      '名前': val[UserMaster.ACGDB.familyNameColIndex] + val[UserMaster.ACGDB.firstNameColIndex],
    };
  });

  return userInfo;
}
