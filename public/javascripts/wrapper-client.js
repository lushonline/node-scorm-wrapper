$(function () {
    //Initialise the RTE
    var mySite = new RteApiSite();

    mySite.Logger.info(JSON.stringify(response));

    
    mySite.SetMasteryLevel(response.mastery.toString());
    mySite.SetStudentId(new Date().getTime().toString());
    mySite.SetDataFromLMS( response.datafromlms ? response.datafromlms: "");

    var strWindowFeatures = "menubar=yes,location=yes,resizable=yes,scrollbars=yes,status=yes";

    var scoWindow = window.open(response.launch, "scoWindow", strWindowFeatures);
});