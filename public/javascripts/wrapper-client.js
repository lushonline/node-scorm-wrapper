$(function() {
  //Initialise the RTE
  var mySite = new RteApiSite();

  mySite.Logger.info(JSON.stringify(response));
  mySite.SetMasteryLevel(response.mastery ? response.mastery.toString() : '');
  mySite.SetStudentId(new Date().getTime().toString());
  mySite.SetDataFromLMS(response.datafromlms ? response.datafromlms : '');
  var strWindowFeatures = 'menubar=yes,location=yes,resizable=yes,scrollbars=yes,status=yes';

  $('#btnLaunch').click(function() {
    mySite.Logger.info("RTE Status: "+ mySite.MlcRteApi.Status);
    switch (mySite.MlcRteApi.Status)
		{
			case "Running":
        alert("Existing LMS session is still active as LMSFinish() hasn't been called");
				return;
			case "Terminated":
			case "NotInitialized":
		}
    var scoWindow = window.open(response.launch, 'scoWindow', strWindowFeatures);
  });

  $('#btnReset').click(function() {
    mySite.Init();
    mySite.SetMasteryLevel(response.mastery ? response.mastery.toString() : '');
    mySite.SetStudentId(new Date().getTime().toString());
    mySite.SetDataFromLMS(response.datafromlms ? response.datafromlms : '');
  });
});
