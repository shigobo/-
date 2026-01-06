/**
 * ファイル名：config.gs
 * 本番環境用/テスト環境用の切り替え設定ファイル
 */


// ==============================　環境別設定　==============================

/**
 * calcPattern  計算パターンの指定
 *  有料の生保の入院期間が都道府県によってルールが変わる予定
 *  　鹿児島：入院期間は家賃のみ
 *  　福岡：入院期間は食費以外の家賃、管理費が請求可
 */

// ------------------------------　本番環境　------------------------------
const CONFIG = {
  'env': 'production',
  'folder':{
    'ACG': {
      'totalling': {'id': '1mknK6RUjqBRhUVtlRTY6p5BXzVX2jkIw'},//集計出力フォルダID
      'detailedStatement':  {'id':'1Rnb7vQc2v-pos5BLY0aAyv9ZhcJbdvHV'},//明細書出力フォルダID  
    },
    'Lichi': {
      'totalling': {'id': '1_bhlY36edpC6e4nvqB78AYkd-5K3dlYh'},//集計出力フォルダID
      'detailedStatement':  {'id':'1TWy2skWGD9QOWq7YnNXyzYsiSew8Bk7X'},//明細書出力フォルダID  
    },
  },
  'ss': {
    'inputBase': {'id': '1XgpcmFCwyBQslWV9zzJhWV_9AYqaglnxPGGWKql4_qI'},//入力BASEシートID
    'detailedStatementBase': {'id': '1nrEqMyYGj_uTHxCoY1dveg81qTjcM0JIfRfyP5wqdVY'},//明細書BASEシートID
    'userMasterACGDB': {'id': '1BGiq6JgHsX0HQD5DpEDVucon92OiCGHCkvsu6ASQyCQ'},//ACGデータベースID
    'calcForPaidMaster': {'id': '1wDP-1sPyaXESEOoQ1dtCzZC1VhpGdnDSWIYzRSrVE6U'},//利用料計算ツールマスタID
  },
  /**
   * 油山Aタイプ旧価格適用の白名单設定
   *
   * 背景：油山Aタイプの価格改定に伴い、既存住户は旧価格を継続適用する必要がある
   *
   * 設定項目：
   *   facilityName: 対象施設名
   *   currentInvoiceKbn: マスタ上の新価格の請求区分名
   *   legacyInvoiceKbn: マスタ上の旧価格の請求区分名
   *   whitelistIds: 旧価格を適用する利用者のあおぞらID配列
   *
   * 運用：
   *   - 価格改定時に既存の油山A利用者IDをwhitelistIdsに追加する
   *   - 新規入居者はwhitelistIdsに追加しない（新価格が適用される）
   *   - 退去者のIDは残しても問題ない（対象外となる）
   */
  'aburayamaLegacyPrice': {
    'facilityName': '油山',
    'currentInvoiceKbn': '有料老人ホーム油山A',
    'legacyInvoiceKbn': '有料老人ホーム油山旧A',
    'whitelistIds': [
      // 2025/12/19以前に油山Aタイプに入居していた旧利用者（39名）
      '2282', '3491', '8176', '8235', '8268', '8286', '8295', '8298',
      '8327', '8335', '8338', '8347', '8348', '8349', '8350', '8352',
      '8354', '8368', '8375', '8377', '8380', '8381', '8383', '8397',
      '8404', '8413', '8425', '8430', '8441', '8442', '8450', '8473',
      '8483', '8505', '8507', '8528', '8531', '8532', '8566','8262','8591'
    ],
  },
  'facilityList': {
    '永吉': {
      'ss': {'id': '1gnE_N7qrVs9RQQUEyzuFaRMgNTh7dKIoNKjOUhfB16Q'},
      'corporateName': 'Lichi',
      'calcPattern': 1,
    },
    '南栄': {
      'ss': {'id': '17bCpQJxL8QMWC2ofxRHNAEAF1izma0LKGISwoYZujfM'},
      'corporateName': 'ACG',
      'calcPattern': 1,
    },
    '四元': {
      'ss': {'id': '1ubXPBOolBqcqllwrvWwjMA6fBwjM_cGu1shs0aKY57U'},
      'corporateName': 'Lichi',
      'calcPattern': 3,
    },
    '博多': {
      'ss': {'id': '1oJkkZiq8T1q56nJw82zB8eLRx6i5bXI_KJEIiW8f0-I'},
      'corporateName': 'ACG',
      'calcPattern': 1,
    },
    '武': {
      'ss': {'id': '1Uvf1VCuWmC6xTPy1WcrTx_v_YqZY5VNp2shB23uKKtE'},
      'corporateName': 'ACG',
      'calcPattern': 1,
    },
    '下荒田': {
      'ss': {'id': '1G1hXkThQf1QYzk46XfRJZVU12FvJ_ThdS0l-7vD-K7U'},
      'corporateName': 'ACG',
      'calcPattern': 1,
    },
    '笹貫': {
      'ss': {'id': '1t9Ler_gZOQ26DuudyEBixxnrgtNr0CQCZdh7vV4BWxM'},
      'corporateName': 'ACG',
      'calcPattern': 1,
    },
    '田上': {
      'ss': {'id': '16rxvLd6xwnbJXn4E_HnRhLUWHno5pn05i7QO5jTpq1s'},
      'corporateName': 'ACG',
      'calcPattern': 1,
    },
    '宇美': {
      'ss': {'id': '1ukBQsmPX3wy0v7h4W6SjBdUMCPVIWwkDALJ3UjYsb4M'},
      'corporateName': 'ACG',
      'calcPattern': 1,
    },
     '油山': {
      'ss': {'id': '1gchZ5ds45FTUmYjia5K7X8CUAkdi7DiVK4nHvCGo5L0'},
      'corporateName': 'ACG',
      'calcPattern': 1,
    },
  },
};

// ------------------------------　ステージング環境　------------------------------
/*
const CONFIG = {
  'env': 'staging',
  'folder':{
    'ACG': {
      'totalling': {'id': '1wrcmTq7WTH7HZZhpAmQ3XCP38wBjYI33'},//集計出力フォルダID
      'detailedStatement':  {'id':'1v6tFMNpF9bc1deHhltTDZHXHVjTORYfw'},//明細書出力フォルダID  
    },
    'Lichi': {
      'totalling': {'id': '1wrcmTq7WTH7HZZhpAmQ3XCP38wBjYI33'},//集計出力フォルダID
      'detailedStatement':  {'id':'1v6tFMNpF9bc1deHhltTDZHXHVjTORYfw'},//明細書出力フォルダID  
    },
  },
  // 効率がいいので本番運用開始前は本番環境とステージング環境で一部同じファイルを参照する
  'ss': {
    'inputBase': {'id': '12Awk-pgcbjjJgYmOPdD3idcAh5JjiBP3gaF1QKsSPKc'},//入力BASEシートID
    'detailedStatementBase': {'id': '1nrEqMyYGj_uTHxCoY1dveg81qTjcM0JIfRfyP5wqdVY'},//明細書BASEシートID
    'userMasterACGDB': {'id': '1BGiq6JgHsX0HQD5DpEDVucon92OiCGHCkvsu6ASQyCQ'},//ACGデータベースID
    'calcForPaidMaster': {'id': '1B2orN9yBlnIoddk2kab59aumkg4p1xKYBo9jJ9bBmbo'},//利用料計算ツールマスタID
  },
  'facilityList': {
    '永吉': {
      'ss': {'id': '1gBg0GVkGUE15wGo28kXc74uzQuBB2DPFgybq6DmuXiE'},
      'corporateName': 'Lichi',
      'calcPattern': 1,
    },
    '南栄': {
      'ss': {'id': '1RIzVnuNoyjzNVPS7iZ20yXJTMdA6A8vY6Tz7mlaSSnc'},
      'corporateName': 'ACG',
      'calcPattern': 1,
    },
    '四元': {
      'ss': {'id': '1G54zuYiC6pAONGyxq6_7s19m_tQCepymTwiYBSedRGA'},
      'corporateName': 'Lichi',
      'calcPattern': 3,
    },
    '博多': {
      'ss': {'id': '1V5QMnLfdljC9Ja5YDJRw-GYbFKn0srZjCT4kWVW_Bcs'},
      'corporateName': 'ACG',
      'calcPattern': 1,
    },
  },
};
*/

// ------------------------------　テスト環境　------------------------------
/*
const CONFIG = {
  'env': 'test',
  'folder':{
    'ACG': {
      'totalling': {'id': '1T_xl4z2L3P_KQ_kNpalNUBrNI5EDLbdJ'},//集計出力フォルダID
      'detailedStatement':  {'id':'1NGVHWMwEj7PT12nm10heD09OXAR6xaBd'},//明細書出力フォルダID  
    },
    'Lichi': {
      'totalling': {'id': '1fY3vWzVjlESvaS4iQyML9IiG8AwrudYg'},//集計出力フォルダID
      'detailedStatement':  {'id':'1vMKgojPHxV_AGPnS0SHuiml1gPPH36Rs'},//明細書出力フォルダID  
    },
  },

  'ss': {
    'inputBase': {'id': '1oIqnuSkJ6QFBQ6tOMUk5sQ5WbixS0l_MROFVtBAnO6s'},//入力BASEシートID
    'detailedStatementBase': {'id': '1fCsjF4t0RyYjLLLqcFRSrZtKVi3DYGtNU-zmGnb1XTs'},//明細書BASEシートID
    'userMasterACGDB': {'id': '1BGiq6JgHsX0HQD5DpEDVucon92OiCGHCkvsu6ASQyCQ'},//ACGデータベースID
    'calcForPaidMaster': {'id': '1qV2yQ1ANw6elY_1HkfZZzmlFHr3sdT5XdbrkomQiuOM'},//利用料計算ツールマスタID
  },
  'facilityList': {
    '武': {
      'ss': {'id': '1mD8_GX0s-XoTkm-N72Y8OrHgfRB9myr7CPdDBBZv14Q'},
      'corporateName': 'ACG',
      'calcPattern': 1,
    },
    // '田上': {
    //   'ss': {'id': ''},
    //   'corporateName': 'ACG',
    //   'calcPattern': 1,
    // },
    // '笹貫': {
    //   'ss': {'id': ''},
    //   'corporateName': 'ACG',
    //   'calcPattern': 1,
    // },
    // '下荒田': {
    //   'ss': {'id': ''},
    //   'corporateName': 'ACG',
    //   'calcPattern': 1,
    // },
    '南栄': {
      'ss': {'id': '16Le-iS-JgRyD3EZdiW9J8tBSt774b6gnELEMSyHohF8'},
      'corporateName': 'ACG',
      'calcPattern': 1,
    },
    '永吉': {
      'ss': {'id': '1VGiFsoE7IYLYL_czDwLsYi5OtLIHLL4af0pZG1D-n6c'},
      'corporateName': 'Lichi',
      'calcPattern': 1,
    },
    '四元': {
      'ss': {'id': '1e2zrrPey9CeTUes24WfHnhqHPL5neQYmaU5ujw0RnKo'},
      'corporateName': 'Lichi',
      'calcPattern': 3,
    },

    '博多': {
      'ss': {'id': '1ZsMGRXIsgWFacDFhOuxDulfx-a_j4fMacmx-9nKACKI'},
      'corporateName': 'ACG',
      'calcPattern': 1,
    },
  },
};
*/

// ==============================　共通設定　==============================
/**
 * 'code': '0000' ->集計SSの「拠点」に付与する拠点コード
 * '拠点を付与しない': true ->集計SSの「拠点」に出力する文字に"拠点"を含めない
 */
CONFIG['convertFacilityNameToCode'] = {
  '武': {'code': '0005'},
  '田上': {'code': '0006'},
  '笹貫': {'code': '0007'},
  '下荒田': {'code': '0008'},
  '南栄': {'code': '0010'},
  '永吉': {'code': '0042'},
  '四元': {'code': '0037', '拠点を付与しない': true},
  '博多': {'code': '0013'},
};
