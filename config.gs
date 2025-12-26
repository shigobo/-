//フォルダ・シートID等　定数定義
var Configs = {};

Configs.initial = function(config){
  InputBase.baseSsId = config['ss']['inputBase']['id'];
  DetailedStatement.baseSsId = config['ss']['detailedStatementBase']['id'];
  PriceMaster.ssId = config['ss']['calcForPaidMaster']['id'];
  TaxRateMaster.ssId = config['ss']['calcForPaidMaster']['id'];
  Configs.facilitiesObj = config['facilityInputServicedHousingForElderlyList'];
  // Totalling.folderId = config['folder']['totalling']['id'];
  // Totalling.inputSsIdList = [];
  // for(const facility in config['facilityInputServicedHousingForElderlyList']){
  //   Totalling.inputSsIdList.push(config['facilityInputServicedHousingForElderlyList'][facility]['ss']['id']);
  // }
  UserMaster.ACGDB.ssId = config['ss']['userMasterACGDB']['id'];
  Configs.convertFacilityNameToCode = config['convertFacilityNameToCode'];
};

Configs.initialFacilityObj = function(facility) {
  Configs.facilityObj = Configs.facilitiesObj[facility];
}

Configs.aggFacilityObjPerCorporateName = function(config, corporateName) {
  const aggedFacilitiesObj = {};
  const inputSsIdList = []
  Object.keys(Configs.facilitiesObj).forEach((facility) => {
    const facilityObj = Configs.facilitiesObj[facility];
    if(facilityObj['corporateName'] === corporateName) {
      aggedFacilitiesObj[facility] = facilityObj;
      inputSsIdList.push(facilityObj['ss']['id']);
    }
  });

  Configs.aggedFacilitiesObj = aggedFacilitiesObj;
  Totalling.inputSsIdList = inputSsIdList;
  DetailedStatement.folderId = config['folder'][corporateName]['detailedStatement']['id'];
  Totalling.folderId = config['folder'][corporateName]['totalling']['id'];
}

Configs.existFacilityOfServicedHousing = function() {
  return Totalling.inputSsIdList.length > 0;
}
