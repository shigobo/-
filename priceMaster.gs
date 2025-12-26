//料金情報関連
var PriceMaster = {};

//*************************************
//定義
//*************************************

PriceMaster.sheetName = "有料料金表";

PriceMaster.headerRowNum = 1;

//列インデックス
PriceMaster.colIndex = {
  'invoiceKbnTableEachRoom': {//部屋ごと請求区分表
    "入居施設名": 0,
    "居室番号":1,
    "請求区分":2,
  },
  'priceTablePerInvoiceKbn': {//請求区分ごと金額表
    "請求区分":4,
    "管理費の日額（税抜）": 5,//非生保
    "管理費の日額（税抜）生保": 6,//生保
    "食費の日額（税抜）": 7,
    "家賃（日額）": 8,
    "上限額（税抜）": 9,
    // "上限額（税込）": 11,
    // "税込と税抜の差": 12,
  }
};

/**
 * 施設名や部屋番号ごとの請求区分を取得する
 * 
 * @param {string} facility - 入居施設名
 * @param {string} roomNo - 居室番号
 * 
 * @return {string} 請求区分
 */
PriceMaster.getInvoiceKbnByRoom = function(facility, roomNo){
  PriceMaster.extractRoom2InvoiceKbnList();//PriceMaster.room2InvoiceKbnList
  if(!PriceMaster.room2InvoiceKbnList[facility]
    || !PriceMaster.room2InvoiceKbnList[facility][roomNo]){
      return null;    
  }

  return PriceMaster.room2InvoiceKbnList[facility][roomNo].invoiceKbn;
}

/**
 * 施設名や部屋番号ごとの料金リストを取得する
 * 
 * @param {string} facility - 入居施設名
 * @param {string} roomNo - 居室番号
 * 
 * @return {object} 料金リスト
 */
PriceMaster.getPriceListByRoom = function(facility, roomNo){
  PriceMaster.extractRoom2InvoiceKbnList();//PriceMaster.room2InvoiceKbnList

  const invoiceKbn = PriceMaster.getInvoiceKbnByRoom(facility, roomNo);
  if(!invoiceKbn) return null;

  const COL_IDX = PriceMaster.colIndex['priceTablePerInvoiceKbn'];
  const filtered = PriceMaster.vals.slice(PriceMaster.headerRowNum).filter(function(val){
    const _invoiceKbnAsInput = val[COL_IDX["請求区分"]];
    return _invoiceKbnAsInput === invoiceKbn;
  });

  return filtered.length === 1 ? filtered[0] : null;
}

/**
 * 請求区分ごとの料金リストを取得する
 * 
 * @param {string} invoiceKbn - 請求区分
 * 
 * @return {object} 料金リスト
 */
PriceMaster.getPriceListByInvoiceKbn = function(invoiceKbn){
  PriceMaster.getValues();//PriceMaster.vals
  const COL_IDX = PriceMaster.colIndex['priceTablePerInvoiceKbn'];
  const filtered = PriceMaster.vals.slice(PriceMaster.headerRowNum).filter(function(val){
    const _invoiceKbnAsInput = val[COL_IDX["請求区分"]];
    return _invoiceKbnAsInput === invoiceKbn;
  });

  return filtered.length === 1 ? filtered[0] : null;
}

/**
 * 施設名や部屋番号ごとの請求区分オブジェクトを抽出する
 */
PriceMaster.extractRoom2InvoiceKbnList = function(){
  if(PriceMaster.room2InvoiceKbnList) return;//取得済み
  PriceMaster.getValues();

  const COL_IDX = PriceMaster.colIndex['invoiceKbnTableEachRoom'];
  const obj = {};
  PriceMaster.vals.slice(PriceMaster.headerRowNum).forEach(function(val){
    const _facility = val[COL_IDX["入居施設名"]];
    const _roomNo = val[COL_IDX["居室番号"]];
    const _invoiceKbnAsResult = val[COL_IDX["請求区分"]];
    obj[_facility] = obj[_facility] || {};
    obj[_facility][_roomNo] = {invoiceKbn: _invoiceKbnAsResult};
  });

  PriceMaster.room2InvoiceKbnList = obj;
}

PriceMaster.getValues = function(){
  if(!PriceMaster.vals){
    const ss = SpreadsheetApp.openById(PriceMaster.ssId);
    const sheet = ss.getSheetByName(PriceMaster.sheetName);
    PriceMaster.vals = sheet.getDataRange().getValues();
  }
}
