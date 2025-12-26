//入力シート関連
var Input = {};

//*************************************
//入力シートBASEをコピーして入力シートを発行
//*************************************
Input.createSheet = function(ss, targetName) {
    //シートをBASEからコピーして新規発行する
    const inputBaseSs = SpreadsheetApp.openById(InputBase.baseSsId);
    const baseSheet = inputBaseSs.getSheetByName(InputBase.baseSheetName);
    const sheet = baseSheet.copyTo(ss);
    sheet.setName(targetName);

    return sheet;
}

//*************************************
//入力シートをクリアする
//*************************************
Input.clearInputSheet = function(sheet) {
  //保護を解除する
  Input.releaseProtect(sheet);

  sheet.getRange(InputBase.CHECKBOX).clearContent();
  sheet.getRange(InputBase.STAFF).clearContent();

  const startRow = InputBase.rowStart;
  const startCol = 1;
  const endRow = sheet.getLastRow() - (startRow - 1);
  const endCol = sheet.getLastColumn() - (startCol - 1);

  console.log(endCol);

  if (endRow < 1) {
    //console.log("1行も入っていない");
    return;
  }
  sheet.getRange(startRow, startCol, endRow, endCol).clearContent();
}

//*************************************
//入力シートに固定値を貼り付ける
//*************************************
Input.setFixedInfoToSheet = function(sheet, facility, year, month) {
  //タイトル
  sheet.getRange(InputBase.posFacility).setValue(facility);
  sheet.getRange(InputBase.posDate).setValue(year + "年　" + month + "月分");

  //拠点で絞り込んだ利用者情報
  const userList = Kintone.getCustomerMngRecordsByFacilityName(facility, true/*isAllFacility*/, year, month);
  if (userList.length === 0) {
    //利用者がいない場合はここまで
    CommonUtil.msgBox("Kintoneから取得したデータがありませんでした。userList.length === 0");
    return;
  }

  const acgDbUserInfo = UserMaster.ACGDB.getUserInfo();

  //利用者ごとの配列を作ってまとめて書き込む
  const userArray = [];
  for (let user of userList) {
    //退去日が前月以前の場合は対象外
    if (Input.isAlreadyMovedOut(user['退去日'], year, month)) {
      console.log("退去日が前月以前なので対象外", user);
      continue;
    }

    //入居日が未来の場合は対象外
    if (Input.isNotMovedIn(user['入居日'], year, month)) {
      console.log("入居日が未来なので対象外", user);
      continue;
    }
    
    const acgDb = acgDbUserInfo[user['あおぞらID']];
    if(!acgDb){
      console.log('あおぞらIDがACGデータベースに見つかりませんでした', user);
      continue;
    }
    
    const line = [];
    line.push(user['あおぞらID']);
    line.push(acgDb['名前']);//顧客名はACGデータベースから
    for (var i = 0; i < 3; i++) { line.push(''); }//空白
    line.push(facility);
    line.push(user['居室番号']);
    line.push(user['入居日']);
    line.push(user['退去日']);

    let hospitalizationDays = 0;
    const obj = Calculation.getHospitalizationDaysByList(year, month, user['入退院履歴'], user['退去日']);
    hospitalizationDays = obj['入院日数'];
    line.push(obj['期間表示用文字列']);

    line.push(user['生活保護受給開始日']);
    line.push(user['生活保護受給終了日']);
    const isWelfareWithDate = Kintone.isWelfareWithDate(user['生活保護受給開始日'], user['生活保護受給終了日'], year, month)
    line.push(isWelfareWithDate ? '〇' : null);
    line.push(user['家賃相当額']);
    line.push(user['個別上限額']);  // 個別上限額（税抜）

    line.push(PriceMaster.getInvoiceKbnByRoom(facility, user['居室番号']));//請求区分
    const priceList = PriceMaster.getPriceListByRoom(facility, user['居室番号']);
    const COL_IDX = PriceMaster.colIndex['priceTablePerInvoiceKbn'];
    line.push(priceList ? priceList[COL_IDX['家賃（日額）']] : null);
    line.push(priceList ? priceList[COL_IDX['食費の日額（税抜）']] : null);
    if(isWelfareWithDate){
      line.push(priceList ? priceList[COL_IDX['管理費の日額（税抜）生保']] : null);
    }else{
      line.push(priceList ? priceList[COL_IDX['管理費の日額（税抜）']] : null);
    }
    const livingDays = Calculation.calcLivingDays(user['入居日'], user['退去日'], year, month);
    line.push(livingDays);//在籍日数 居住日数 請求日数
    line.push(hospitalizationDays !== 0 ? hospitalizationDays : '');//入院日数
    line.push(livingDays - hospitalizationDays);//在室日数

    userArray.push(line);
  }

  if(userArray.length === 0){
    CommonUtil.msgBox("対象の利用者が存在しませんでした。userArray.length === 0");
    return;
  }

  //書き込み
  sheet.getRange(InputBase.rowStart, 1, userArray.length, userArray[0].length).setValues(userArray);

  //固定範囲の保護
  Input.protect(sheet);

  return;
}

//*************************************
//入力シートの対象行配列を取得
//*************************************
Input.getInputSheetValues = function(sheet) {
    //シート全体のデータ取得
    const lastRow = sheet.getLastRow();
    if (lastRow - InputBase.rowStart + 1 < 1) {
      return null;
    }
    return sheet.getDataRange().getValues().slice(InputBase.rowStart - 1);
}

//*************************************
//退去済み判定
//*************************************
Input.isAlreadyMovedOut = function(moveOutDate, year, month) {
  //退去日が前月以前ならtrue
  if (!moveOutDate) {
    return false;
  }

  //退去日
  const outDate = CommonUtil.dateConvertToJst(moveOutDate);

  //対象月1日の日付
  let targetDate = new Date(Number(year), Number(month) - 1, 1, 0, 0, 0, 0);
  targetDate = CommonUtil.dateConvertToJst(targetDate);

  console.log('isAlreadyMovedOut()', outDate, targetDate);

  if (outDate < targetDate) {
    return true;
  }

  return false;
}

//*************************************
//入居前判定
//*************************************
Input.isNotMovedIn = function(movedInDate, year, month) {
  //入居日が来月以降ならtrue
  if (!movedInDate) {
    return false;
  }

  //入居日
  const inDate = CommonUtil.dateConvertToJst(movedInDate);

  //来月1日
  let targetDate = new Date(Number(year), Number(month), 1, 0, 0, 0, 0);
  targetDate = CommonUtil.dateConvertToJst(targetDate);

  console.log('isNotMovedIn', inDate, targetDate);

  if (inDate >= targetDate) {
    return true;
  }

  return false;
}

//*************************************
//入力範囲以外を保護
//*************************************
Input.protect = function(sheet) {
  const protectionMessage = "編集しようとしている範囲は変更が禁止されています";
  sheet.protect().setDescription(protectionMessage);

  // const me = Session.getEffectiveUser();
  InputBase.protectA1Notations.forEach(function(a1Notation){
    const protection = sheet.getRange(a1Notation).protect();
    protection.setDescription(protectionMessage);
    protection.setWarningOnly(true);
  });
  /* 編集権限を自分だけにする方法だと、共有ユーザも編集できるため実用に耐えない。*/
}

//*************************************
//保護をすべて解除
//*************************************
Input.releaseProtect = function(sheet) {
    const protections = sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE);
    // 取得した保護されたセル範囲の数だけ処理
    for (let i = 0; i < protections.length; i++) {
        // 保護を取得
        const protection = protections[i];
        // 保護の種類が編集可能である場合
        if (protection.canEdit()) {
          // 保護を削除
          protection.remove();
        }
    }
 }

/**
 * 入力シートをチェックする
 * 
 * @param {object} sheet 
 * @return {object} errorList - チェック結果のエラーリスト
 */
Input.checkInput = function(sheet) {
  const errorList = [];

  const checkBoxResult = sheet.getRange(InputBase.CHECKBOX).getValues().filter(function(val){
    return !val[0];
  });
  if(checkBoxResult.length > 0){
    errorList.push('チェックボックスがチェックされていません');
  }
  const staff = sheet.getRange(InputBase.STAFF).getValue();
  if(!staff){
    errorList.push('担当者名が入力されていません');
  }

  const COL = InputBase.ColIndex;
  const inputSheetValues = sheet.getDataRange().getValues().slice(InputBase.rowStart - 1);
  inputSheetValues.forEach(function(inputValue){

    if (inputValue[COL['個別上限額（税抜）']] == null || inputValue[COL['個別上限額（税抜）']] == "") {
      errorList.push(inputValue[COL['利用者名']] + "様 " + "の個別上限額（税抜）が入力されていません");
    }
 
    if (inputValue[COL['入院']] == null || inputValue[COL['入院']] == "") {
    }else{
      if (!(inputValue[COL['入院']]+"").match(/\d{4}\/\d{2}\/\d{2}〜/)) {
        errorList.push(inputValue[COL['利用者名']] + "様 " + "の入院にメッセージが出力されているので確認してください");
      }
    }
  });

  return errorList;
}
