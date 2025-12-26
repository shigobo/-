//kintoneAPI関連
var Kintone = {};

//*************************************
//定義
//*************************************

Kintone.API = {
  // '案件顧客管理': {
  //   ID: 375,
  //   TOKEN_FILE_ID: '19WvLj3M-6QZ5GoFsqvQfz9EnBuyD9LyL',//アプリ:案件顧客管理（ソーシャルワーカー）_リニューアル版、アクセス権:レコード閲覧
  //   COL: {//フィールド名 ->フィールドコード
  //     '入居施設名': 'Facility_Name2',
  //     '入居希望者名': 'User_Name',
  //     '契約適用開始日': 'Contract_Application_Start_Date',
  //     'ご退去日': 'Move_Out_Date',
  //     'あおぞらID': 'Aozora_Id',
  //     '個別上限額': 'Individual_Maximum_Amount',
  //     '生活保護受給開始日': 'Welfare_Start_Date',
  //     '生活保護受給終了日': 'Welfare_End_Date',
  //     '施設形態': 'Facility_Type',
  //     '家賃相当額': 'Rent_Amount',
  //     '居室番号':'Room_Name',
  //     'サ高住東千石・個別家賃設定額': 'Individual_Rent_Setting_Amount',
  //   },
  // },
  '入退院管理': {
    ID: 184,
    TOKEN_FILE_ID: '19MpPrjyJU0vQ7KKybn1OFGJh666wgNPD',//アプリ:入退院管理_リニューアル版、アクセス権:レコード閲覧
    COL: {//フィールド名 ->フィールドコード
      'あおぞらID': 'Aozora_Id',
      '入院日': 'Start_Date',
      '退院日': 'End_Date',
      '履歴': 'History',  // "入退院"
    },
  },
  '居室利用変更履歴管理': {
    ID: 197,
    TOKEN_FILE_ID: '1CKtiEYb49LnGmQH0oRYlitBOOS23cvZi',//アプリ:居室変更履歴管理_リニューアル版、アクセス権:レコード閲覧
    COL: {//フィールド名 ->フィールドコード
      '入居施設名': 'Facility_Name', // 事業所
      '入居希望者名': 'User_Name',
      '契約適用開始日': 'Contract_Start_Date',
      '退去日': 'Moving_Out_Date',
      'あおぞらID': 'Aozora_Id',
      '居室番号':'Room_Name',
      '個別上限額': 'Individual_Maximum_Amount',
      '生活保護受給開始日': 'Welfare_Start_Date',
      '生活保護受給終了日': 'Welfare_End_Date',
      '提供事業': 'Provided_Business',
      '家賃相当額': 'Rent_Amount',
      'サ高住東千石・個別家賃設定額': 'Individual_Rent_Setting_Amount',
      '料金プラン': 'Discount_Plan',
    },
  },
};

Kintone.LIMIT = 500;

/**
 * kintoneから指定されたアプリのデータを取得する
 * 
 * @param {object} paramObj - 施設名やあおぞらID等絞り込み条件があれば指定する
 * @param {string} appName - アプリ名(エリア情報を除いた部分)  例：「案件顧客管理：鹿児島エリア」の場合は「案件顧客管理」
 * @param {number} offset - オフセット
 * @return {object} 一覧
 */
Kintone.getRecords = function(paramObj, appName, offset) {
  function getQuery (){
    const limitOffset = Utilities.formatString(' limit %d offset %d', Kintone.LIMIT, offset)
    if (appName === '案件顧客管理') {
      // const whereQuery = [
      //   Utilities.formatString('%s in("認知症GH","介付有料","有料","サ高住")', Kintone.API[appName].COL['施設形態']),
      //   Utilities.formatString('%s != ""', Kintone.API[appName].COL['契約適用開始日']),
      //   Utilities.formatString('(%s = "" or %s >= LAST_YEAR())', Kintone.API[appName].COL['ご退去日'], Kintone.API[appName].COL['ご退去日'])
      // ];
      // if (paramObj && paramObj["施設名"]) {
      //   whereQuery.push(Utilities.formatString('%s in("%s")', Kintone.API[appName].COL['入居施設名'], paramObj["施設名"]));
      // }
      return encodeURIComponent(whereQuery.join(' and ') + limitOffset);

    } else if (appName === '入退院管理') {
      const whereQuery = [
        Utilities.formatString('%s in ("入退院")', Kintone.API[appName].COL['履歴'])
      ];
      if (paramObj && paramObj["あおぞらID"] && paramObj["あおぞらID"].length > 0) {
        whereQuery.push(Utilities.formatString('Aozora_Id in ("%s")', paramObj["あおぞらID"].join('","')));
      }

      return encodeURIComponent(whereQuery.join(' and ') + limitOffset);

    } else if (appName === '居室利用変更履歴管理') {
      const whereQuery = [
        // Utilities.formatString('%s in("認知症GH","介付有料","有料","サ高住")', Kintone.API[appName].COL['施設形態']),
        // 提供事業で高齢者施設もしくは認知症対応型共同生活介護で絞り込む
        Utilities.formatString('%s in("高齢者施設","認知症対応型共同生活介護")', Kintone.API[appName].COL['提供事業']),
        Utilities.formatString('%s != ""', Kintone.API[appName].COL['契約適用開始日']),
        Utilities.formatString('%s not in ("一生涯安心プラン")', Kintone.API[appName].COL['料金プラン']),
        Utilities.formatString('(%s = "" or %s >= LAST_YEAR())', Kintone.API[appName].COL['退去日'], Kintone.API[appName].COL['退去日'])
      ];
      if (paramObj && paramObj["施設名"]) {
        whereQuery.push(Utilities.formatString('%s in("%s")', Kintone.API[appName].COL['入居施設名'], paramObj["施設名"]));
      }
      if (paramObj && paramObj["あおぞらID"] && paramObj["あおぞらID"].length > 0) {
        whereQuery.push(Utilities.formatString('Aozora_Id in ("%s")', paramObj["あおぞらID"].join('","')));
      }

      return encodeURIComponent(whereQuery.join(' and ') + limitOffset);
    }
  }

  const API_URL = "https://acgaozora.cybozu.com/k/v1/records.json";
  const apiTolen = DriveApp.getFileById(Kintone.API[appName].TOKEN_FILE_ID).getBlob().getDataAsString();
  const param = {
    "method": "get",
    "headers": {"X-Cybozu-API-Token": apiTolen},
  };
  const url = Utilities.formatString('%s?app=%s&totalCount=true&query=%s', API_URL, Kintone.API[appName].ID, getQuery());
  console.log('url', url);
  const res = JSON.parse(UrlFetchApp.fetch(url, param));
  let records = res.records;
  console.log('offset, res.records.length', offset, records.length/*, records.map((r) => r.Aozora_Id.value)*/);
  if(records.length === Kintone.LIMIT){
    const result = Kintone.getRecords(paramObj, appName, offset + Kintone.LIMIT);
    records = records.concat(result);
  }
  return records;
}

function debug_kintone() {
  PriceMaster.ssId = '1qV2yQ1ANw6elY_1HkfZZzmlFHr3sdT5XdbrkomQiuOM';
  const records = Kintone.getCustomerMngRecordsByFacilityName("東千石", true/*isAllFacility*/);
  // const records = Kintone.getCustomerMngRecordsByFacilityName("田上", false/*isAllFacility*/);
  // const records = Kintone.getCustomerMngRecordsByFacilityName("笹貫", false/*isAllFacility*/);
records;
}

/**
 * 顧客管理アプリから施設ごとの一覧を取得する
 * 
 * @param {string} facility - 施設名
 * @param {boolean} isAllFacility - 全施設のデータを取得するかどうか true：後で施設名で集約させる場合等
 * @param {number} year - 対象年
 * @param {number} month - 対象月
 * 
 * @return {object} 顧客一覧
 */
Kintone.getCustomerMngRecordsByFacilityName = function(facility, isAllFacility, year, month) {
  function getCustomerMng (){
    const appName = '居室利用変更履歴管理';
    const paramObj = {"施設名": (isAllFacility ?  null : facility)};
    const records = Kintone.getRecords(paramObj, appName, /* offset= */0);

    const facilityNameConvert = FacilityNameConvert.getFacilityNameConvert();
    const API = Kintone.API[appName];
    const vals = records.map(function(record){
      const data = record[API.COL['入居施設名']].value ?
        record[API.COL['入居施設名']].value.split("・") :
        null;
      const facilityName = data && facilityNameConvert[data[0]] ?
        facilityNameConvert[data[0]] :
        data[0];
      // const facilityName = facilityNameConvert[record[API.COL['入居施設名']].value] ?
      //   facilityNameConvert[record[API.COL['入居施設名']].value] :
      //   record[API.COL['入居施設名']].value;
      return{
        '入居希望者名': record[API.COL['入居希望者名']].value,
        '入居施設名': facilityName,
        '入居日': record[API.COL['契約適用開始日']].value ? new Date(record[API.COL['契約適用開始日']].value.replace(/\-/g, '/')) : null,
        '退去日': record[API.COL['退去日']].value ? new Date(record[API.COL['退去日']].value.replace(/\-/g, '/')) : null,
        'あおぞらID': record[API.COL['あおぞらID']].value,
        '個別上限額': record[API.COL['個別上限額']].value,
        '生活保護受給開始日': record[API.COL['生活保護受給開始日']].value ? new Date(record[API.COL['生活保護受給開始日']].value.replace(/\-/g, '/')) : null,
        '生活保護受給終了日': record[API.COL['生活保護受給終了日']].value ? new Date(record[API.COL['生活保護受給終了日']].value.replace(/\-/g, '/')) : null,
        // '入退院履歴': admissionDischargeList,
        '家賃相当額': record[API.COL['家賃相当額']].value,
        '居室番号': record[API.COL['居室番号']].value,
        '共益費': '', // 2024/09/26追記 削除された？
        'サ高住東千石・個別家賃設定額': record[API.COL['サ高住東千石・個別家賃設定額']].value,
      };
    });
  
    return vals;
  }

  // 顧客管理データを取得する
  const customerMngList = getCustomerMng().filter((record) => {
    // 転居前：3/1退去、転居後：3/1入居だと、2月の集計を転居後の拠点で実施してしまうため、入居日が未来のデータはここで除外する。
    if (Input.isNotMovedIn(record['入居日'], year, month)) {
      console.log("入居日が未来なので対象外", record);
      return false;
    }
    return true;
  });
  // 顧客管理データを転居を考慮して集約する
  const aggedRecordByFacility = Kintone.aggCustomerMngRecordsByFacility(facility, customerMngList);
  if (aggedRecordByFacility.length === 0) {
    console.log(facility + "　の顧客管理データが存在しませんでした。Kintone.getCustomerMngRecordsByFacilityName()");
    return [];
  }

  aggedRecordByFacility.sort((a, b) => {
    if (a['あおぞらID']-0 < b['あおぞらID']-0) return -1;
    if (a['あおぞらID']-0 > b['あおぞらID']-0) return 1;
    return 0;
  });

  const aozoraIds = aggedRecordByFacility.map((r) => r['あおぞらID']);
  const admissionDischargeList = Kintone.getAdmissionDischarge(aozoraIds);
  // 顧客管理データと入退院データを結合させる
  return Kintone.joinKintoneData(aggedRecordByFacility, admissionDischargeList);
}

/**
 * 入退院管理アプリから指定するあおぞらIDの一覧を取得する
 * 
 * @param {array} aozoraIds - あおぞらIDの一覧
 * @return {array} 入退院一覧
 */
Kintone.getAdmissionDischarge = function(aozoraIds){
  const appName = '入退院管理';
  const records = Kintone.getRecords({'あおぞらID': aozoraIds}, appName, /* offset= */0);

  const API = Kintone.API[appName];
  const vals = records.map(function(record){
    return{
      'あおぞらID': record[API.COL['あおぞらID']].value,
      '入院日': record[API.COL['入院日']].value ? new Date(record[API.COL['入院日']].value.replace(/\-/g, '/')) : null,
      '退院日': record[API.COL['退院日']].value ? new Date(record[API.COL['退院日']].value.replace(/\-/g, '/')) : null,
    };
  });
  return vals;
}

/**
 * Kintoneから取得したデータを結合させる
 * 
 * @param {array} customerMngList - 顧客管理データ
 * @param {array} admissionDischargeList - 入退院データ
 * 
 * @return {array} 結合したデータ
*/
Kintone.joinKintoneData = function(customerMngList, admissionDischargeList){
  customerMngList.forEach((customerMng) => {
    const _list = admissionDischargeList.filter((ad) => ad['あおぞらID'] === customerMng['あおぞらID']);
    // console.log(customerMng['あおぞらID'], _list.map((l) => l['入院日']).join());
    customerMng['入退院履歴'] = _list.sort((a, b) => {
      if (a['入院日'] < b['入院日']) return -1;
      if (a['入院日'] > b['入院日']) return 1;
      return 0;

    });
    // console.log(customerMng['あおぞらID'], _list.map((l) => l['入院日']).join());
  });
  return customerMngList;
}

/**
 * 指定した施設のKintone取得データを集約する
 * 
 * @param {string} facility - 施設名
 * @param {object} records - Kintone取得データ配列
 * 
 * @return {object} 指定した施設の集約されたKintone取得データ配列
 */
Kintone.aggCustomerMngRecordsByFacility = function(facility, records){
  const aggedRecordById = Kintone.aggCustomerMngRecords(records);
  const aggedRecordByFacility = [];
  Object.keys(aggedRecordById).forEach(function(id){
    const record = aggedRecordById[id];
    if(record['入居施設名'] === facility){
      aggedRecordByFacility.push(record);
    }
  });

  return aggedRecordByFacility;
}

/**
 * Kintoneからのデータ配列を集約する
 * 
 * @param {object} records - Kintone取得データ配列
 * @param {number} year - 対象年
 * @param {number} month - 対象月
 * 
 * @return {object} 集約されたKintone取得データオブジェクト(idごと)
 */
Kintone.aggCustomerMngRecords = function(records, year, month){
  //あおぞらIDごとにまとめる
  const recordsById = {};
  records.forEach(function(record){
    recordsById[record['あおぞらID']] = recordsById[record['あおぞらID']] || [];
    recordsById[record['あおぞらID']].push(record);
  });

  const aggedRecordById = {};

  Object.keys(recordsById).forEach(function(id){
    const _records = recordsById[id];
    if(_records.length > 1) console.log('_records.length > 1', _records);
    _records.sort(function(a, b){//入居日順に並べる
      return a['入居日'] -  b['入居日'];
    });
    // let admissionDischargeList = [];
    // _records.forEach(function(_record){
    //   admissionDischargeList = admissionDischargeList.concat(_record['入退院履歴']);
    // });

    //同じ利用者が複数あったら、入退院の履歴とか後ろの拠点に寄せる。
    aggedRecordById[id] = _records[_records.length - 1];//後ろの拠点に寄せる
    // aggedRecordById[id]['入退院履歴'] = admissionDischargeList;//入退院の履歴は集約させる
    aggedRecordById[id]['入居日'] = _records[0]['入居日'];//最初に入居した日が入居日
    aggedRecordById[id]['生活保護受給開始日'] = _records[0]['生活保護受給開始日'];//最初に生活保護受給開始した日が生活保護受給開始日
  });
  // console.log(aggedRecordById);
  return aggedRecordById;
}

/**
 * 生活保護受給開始日と生活保護受給終了日から生保かどうか判定する
 * 
 * 受給期間内に対象年月末日が含まれているか
 * @param {date} startDate - 生活保護受給開始日
 * @param {date} endDate - 生活保護受給終了日
 * @param {number} year - 対象年
 * @param {number} month - 対象月
 */
Kintone.isWelfareWithDate = function(startDate, endDate, year, month){
  if(!startDate){
    console.log('生保でない'); return false;
  }

  const lastDayMonth = new Date(year, month, 0);
  const lastDayMonthStr = Utilities.formatDate(lastDayMonth, 'JST', 'yyyyMMdd');
  const startDateStr = Utilities.formatDate(startDate, 'JST', 'yyyyMMdd');
  if(lastDayMonthStr < startDateStr){
    console.log('翌月以降受給開始');
    return false;
  }else if(startDateStr <= lastDayMonthStr){
    if(!endDate){
      console.log('当月以前受給開始〜受給終了していない');
      return true;
    }
    const endDateStr = Utilities.formatDate(endDate, 'JST', 'yyyyMMdd');
    if(lastDayMonthStr <= endDateStr){
      console.log('当月以前受給開始〜翌月以降受給終了');
      return true;
    }else{
      console.log('当月以前受給開始〜当月以前受給終了');
      return false;
    }
  }
}
