/* Copyright (c) Microsoft Corporation. All rights reserved. */

// RteApiSite.js
// This file contains the RteApiSite object and all functions required to implement it. Functions that 
// begin with Site_ are exposed on the object as public apis. Other functions should not be called from
// outside this file.




// The RteApiSite object is receives requests from the RTE objects, stores the data in a form
// that is easily accessible and communicates with the frameset to send and receive data to/from
// the server. This object does not validate any RTE values.
function RteApiSite() {
    //log4javascript object
    this.Logger = null;
    this.CreateLogger = Site_CreateLogger;

    //Globals
    this.Title = "SkillSoft SCORM Testing Wrapper";
    this.Author = "Martin Holden (martin_holden@skillsoft.com";
    this.Version = "1.0";

    //Default SCORM values
    this.DefaultSCORM = "cmi.core.student_id@Eolsatest@Ncmi.core.student_name@EStudent, Test@N";


    // Initialize variables that will hold the data model information
    this.m_aValues = new Array();  // holds complete data model
    this.m_aChangedValues = new Array();   // holds only elements that have changed in Values array.

    // Functions called from RTE
    this.Terminate = Site_Terminate;
    this.Commit = Site_Commit;
    this.SetValue = Site_SetValue;
    this.GetValue = Site_GetValue;
    this.ClearError = Site_ClearError;
    this.SetError = Site_SetError;
    this.GetLastErrorCode = Site_GetLastErrorCode;
    this.GetErrorString = Site_GetErrorString;
    this.GetErrorDiagnostic = Site_GetErrorDiagnostic;
    this.Init = Site_Init;  // initialize for new activity. Clear all present state. 

    // The rte object for this session. Initialised Below
    this.MlcRteApi = null;
    this.Validator = null;
    this.Parser = null;
    this.InitDataModelValues = Site_InitDataModelValues;
    this.SetMasteryLevel = Site_SetMasteryLevel;
    this.SetDataFromLMS = Site_SetDataFromLMS;
    this.SetStudentId = Site_SetStudentId;

    // "private" functions
    this.GetDataModelValueToCommit = Site_GetDataModelValueToCommit;
    this.Reset = Site_Reset;
    this.ClearValidNavigationCommands = Site_ClearValidNavigationCommands;

    // "private" data
    this.m_validNavigationCommands = new Array();   // index is <command>, value is either "true" or "false". For choice commands, the index is C,<activityId> (no brackets)
    this.m_errorManager = null; // initialized with the RteApi object
    this.m_scormVersion = null;

    //Now Initialise Everything
    this.Init();
}



function Site_CreateLogger() {
    //First lets create a Logger for the SCORM communications
    //Create the logger
    if (typeof (this.Logger) == "undefined" || this.Logger == null) {
        this.Logger = log4javascript.getLogger("SCORM_RTE_COMMUNICATIONS");
        var RTE_layout = new log4javascript.PatternLayout("%d %-5p - %m%n");
        var RTE_appender = new log4javascript.InPageAppender('myLogger', false, false, true, '100%', '100%');
        RTE_appender.setLayout(RTE_layout);
        this.Logger.addAppender(RTE_appender);
        this.Logger.info(this.Title + " (" + this.Version + ")");
        this.Logger.info(this.Author);
    }
}

// Reinitialize object to accept new commands. This removes all current state from memory.
// rteRequired is true if the new activity requires the RTE
function Site_Init() {
    // g_framesetMgr.DebugLog("ApiSite: Init. RteRequired = " + rteRequired);
    this.CreateLogger();


    this.m_scormVersion = '1.2';
    this.MlcRteApi = null;

    this.Validator = new _MS_Scorm1p2_TypeValidator();
    this.Parser = new _MS_DataModelParser_1p2();

    this.MlcRteApi = new Rte1p2Api(this, this.Parser , this.Validator );
    window.API = this.MlcRteApi;

    this.m_aValues = new Array();  // holds complete data model
    this.m_aChangedValues = new Array();   // holds only elements that have changed in Values array.
    this.m_validNavigationCommands = new Array();
    this.m_errorManager = new ErrorMessageManager(this.Logger);

    this.InitDataModelValues();
}

function Site_Terminate() {
    for (i in this.m_aChangedValues) {
        this.m_aValues[i] = this.m_aChangedValues[i];
    }
    this.m_aChangedValues = new Array();
}

function Site_Commit() {
    // Get data model information to post
    var strDmValue;
    strDmValue = this.GetDataModelValueToCommit();
    for (i in this.m_aChangedValues) {
        this.m_aValues[i] = this.m_aChangedValues[i];
    }
    this.m_aChangedValues = new Array();

}

// Save the name / value pair as a changed value.
function Site_SetValue(name, value) {

    this.m_aChangedValues[name] = value;
    // If this SetValue invalidated the list of valid navigation commands, then clear that list. For simplicity sake, 
    // the list is cleared if interactions, score, completion_status, progress_measure, exit, or success_status is set. 
    var matches;
    if ((name.match(/^.*\.interactions\..*/) != null) ||
        (name.match(/^.*\.score\..*/) != null) ||
        (name.match(/^.*\.completion_status\..*/) != null) ||
        (name.match(/^.*\.exit\..*/) != null) ||
        (name.match(/^.*\.success_status\..*/) != null) ||
        (name.match(/^.*\.progress_measure\..*/) != null)) {
        this.ClearValidNavigationCommands();
    }
}

// Clear the collection of IsMove*Valid commands.
function Site_ClearValidNavigationCommands() {
    for (i in this.m_validNavigationCommands)
        this.m_validNavigationCommands[i] = null;
}

// The GetValue function will always return the most recent value of the variable, 
// regardless of whether or not the value has been committed. 
// If the site object cannot return a value – preseumably because it does not have such a 
// value in its current data model – then ‘undefined’ is returned.
function Site_GetValue(name) {
    var getValue = this.m_aChangedValues[name];
    if (this.m_aChangedValues[name] == undefined) {
        return this.m_aValues[name];
    }
    else {
        return getValue;
    }
}

function Site_ClearError() {
    this.m_errorManager.SetError("0");
}


// Set an error condition in the api. This function takes optional additional parameters to substitute into
// the error string. For instance, if errorID 25 corresponds to the string "The {0} parameter is not valid", then
// an additional parameter would be expected to be provided to replace the {0} value.
function Site_SetError(strErrorCode, strErrorMessageId, param1, param2, param3) {
    if (this.m_errorManager == undefined) {
        this.m_errorManager = new ErrorMessageManager(this.m_scormVersion);
    }

    this.m_errorManager.SetError(strErrorCode, strErrorMessageId, param1, param2, param3);
}

function Site_GetLastErrorCode() {
    return this.m_errorManager.GetLastError();
}

// Return the error message as a string. The api object will call this when the SCO calls GetErrorString, 
// after the api object has verified that it is legal to call this function and that the errorId is within 
// a valid range (in 2004, that’s between 0 and 65536, inclusive).
//
// errorCode is the id of the error that is requested. If this value is an empty string (""), then the 
// error message for the current error state will be returned. In that case, the message that is returned will 
// have any substitutions of messageTokens completed. In other cases, any token markers in the message will be
// replaced with "unknown".
//
// If the errorCode does not correspond to a valid error code for our application, then an empty character 
// string ("") is returned.
function Site_GetErrorString(strErrorId) {
    return this.m_errorManager.GetErrorString(strErrorId);
}

// Return any additional information about the requested error code. If the errorCode value is 
// an empty string (""), then the message for the current error state will be returned. In that case, 
// the message that is returned will have any substitutions of messageTokens completed. In other cases, 
// any token markers in the message will be replaced with "unknown". If there is no additional error 
// information, an empty character string ("") will be returned.
function Site_GetErrorDiagnostic(errorCode) {
    return this.m_errorManager.GetDiagnostic(errorCode);
}


// Initialize the data model with dmValues. This will reset the m_aValuesChanged to an empty array and 
// initialize the m_aValues array to the values passed in through strDmValues.
// strDmValues is a string of the following form:
// 
// If dmValues is null, then the data model values are all cleared.
function Site_InitDataModelValues(strDmValues) {
    // Called during initialization of a new activity.

    if (strDmValues == undefined) {
        strDmValues = this.DefaultSCORM;
    }

    var aDmPairs;   // array of name@Evalue strings
    var aStrNameValue;  // string array with 2 elements: 0 is name, 1 is value

    // Clear the master array copy. We do not clear the aChangedValues array because it may contain changes
    // since the last post. (It was reinitialized when the post happened.)
    this.m_aValues = new Array();

    // replace @A with @, @L with <, @G with >
    strDmValues = strDmValues.replace(/@G/g, ">").replace(/@L/g, "<").replace(/@A/g, "@");

    // split long string into name@Evalue pairs
    aDmPairs = strDmValues.split("@N");

    var i;
    for (i = 0; i < aDmPairs.length; i++) {
        aStrNameValue = aDmPairs[i].split("@E");
        if (aStrNameValue.length == 2) {
            this.m_aValues[aStrNameValue[0]] = aStrNameValue[1];
        }
    }
}

function Site_SetMasteryLevel(strMasteryLevel) {
    if (this.Validator.Validate(strMasteryLevel, 'CmiDecimal0-100OrBlank')) {
        this.Logger.info(String.format("Setting Mastery Score: {0}", strMasteryLevel));
        this.m_aValues['cmi.student_data.mastery_score'] = strMasteryLevel;
    } else {
        this.Logger.error(String.format("Mastery Score not set, value is not in range 0-100 or blank: {0}", strMasteryLevel));
    }
}

function Site_SetStudentId(strStudentId) {
    if (this.Validator.Validate(strStudentId, 'CmiIdentifier')) {
        this.Logger.info(String.format("Setting Student Id: {0}", strStudentId));
        this.m_aValues['cmi.core.student_id'] = strStudentId;
    } else {
        this.Logger.error(String.format("StudentId not set, value is not valid: {0}", strStudentId));
    }
}

function Site_SetDataFromLMS(strDataFromLMS) {
    if (this.Validator.Validate(strDataFromLMS, 'CmiString4096')) {
        this.Logger.info(String.format("Setting Data From LMS: {0}", strDataFromLMS));
        this.m_aValues['cmi.launch_data'] = strDataFromLMS;
    } else {
        this.Logger.error(String.format("Data From LMS not set, value is not valid: {0}", strDataFromLMS));
    }
}

// Return the value of the datamodel string that will be posted. This puts all the values changed 
// since the last commit into the returned string.
function Site_GetDataModelValueToCommit() {
    var i;
    var strDmValue = ""; // return value

    for (i in this.m_aChangedValues) {
        // don't ever commit names that end in _count.
        var findCount = /.*_count$/g;
        if (i.match(findCount) == null) {
            var name = PrepToPost(i);
            var value = PrepToPost(this.m_aChangedValues[i]);
            strDmValue += name + "@E" + value + "@N";
        }
    }
    return strDmValue;
}

// Prepare the string to be a name or value to be posted to the server.
// Remove any < or > tags from name, in order to make information postable within a form field
function PrepToPost(name) {
    return name.replace(/@/g, "@A").replace(/</g, "@L").replace(/>/g, "@G");
}

// Reset internal state after data is posted to server
function Site_Reset(strDmValues) {
    this.m_aValues = new Array();
    this.m_aChangedValues = new Array();
    this.InitDataModelValues(strDmValues);
}

// Class to manage the error code, error message and diagnostic message.
function ErrorMessageManager(logger) {
    this.Logger = logger;


    // Default parameter to replace the {n} tags in error message format string.
    var defaultParameterValue = " unknown";

    var errorDescriptions = new Object();

    InitializeDescriptions_12();

    var lastError = '0';
    var lastErrorMessage = errorDescriptions[lastError];
    var lastDiagnosticMessage = errorDescriptions[lastError];


    var L_InvalidErrorCode_TXT = "Internal error. The error code {0} is not defined.";
    var L_InvalidErrorMsgId_TXT = "Internal error. The error message id {0} is not defined.";

    // Set an error condition
    // errorCode = SCORM error code (e.g., "201")
    // errorMessageId = diagnostic message id  (e.g., "201-1").
    // param1,2,3: parameters to the diagnostic message
    this.SetError = function(errorCode, errorMessageId, param1, param2, param3) {
        lastError = errorCode;

        if (errorMessageId == null || errorMessageId == "") {
            errorMessageId = errorCode;
        }
        lastErrorMessage = errorDescriptions[errorCode];

        if (lastErrorMessage == null) {
            throw L_InvalidErrorCode_TXT.replace("{0}", errorCode);
        }
        lastDiagnosticMessage = errorDescriptions[errorMessageId];
        if (lastDiagnosticMessage == null) {
            throw L_InvalidErrorMsgId_TXT.replace("{0}", errorMessageId);
        }

        // Possible bug: if the parameter (for example, a data model name) contains '$', 
        // the replace function will treat $ as special character. 
        lastDiagnosticMessage = lastDiagnosticMessage.replace(/\{0\}/g, param1 == null ? defaultParameterValue : param1);
        lastDiagnosticMessage = lastDiagnosticMessage.replace(/\{1\}/g, param2 == null ? defaultParameterValue : param2);
        lastDiagnosticMessage = lastDiagnosticMessage.replace(/\{2\}/g, param3 == null ? defaultParameterValue : param3);

        //Log Any Errors
        if (lastError != 0) {
            this.Logger.error(String.format('LastError: {0} ', lastError));
            this.Logger.error(String.format('LastErrorMessage: {0} ', lastErrorMessage));
            this.Logger.error(String.format('LastDiagnosticMessage: {0} ', lastDiagnosticMessage));
        }
    }

    this.GetLastError = function() {
        return lastError;
    }

    this.GetErrorString = function(errorId) {
        // If the caller wants to retrieve the last error string, return a formatted string
        if (errorId == lastError)
            return lastErrorMessage;

        var msg = errorDescriptions[errorId];
        if (msg == null) msg = "";
        return msg;
    }

    this.GetDiagnostic = function(errorCode) {
        if (errorCode == null || errorCode == "" || errorCode == lastError) {
            if (lastDiagnosticMessage != null && lastDiagnosticMessage != "")
                return lastDiagnosticMessage;
        }
        else {
            if ((errorCode != null) && (errorCode != ""))
                return this.GetErrorString(errorCode);
        }
        return "";
    }

    // Initialize errors for SCORM 1.2
    function InitializeDescriptions_12() {
        var L_ERROR0_TXT = "No error.";

        var L_ERROR101_TXT = "General exception error.";
        var L_ERROR1011_TXT = "General exception error. The API instance is already initalized.";
        var L_ERROR1012_TXT = "General exception error. The API instance is already terminated.";
        var L_ERROR1013_TXT = "General exception error. The data model '{0}' is not initialized.";
        var L_ERROR1014_TXT = "General exception error. The type of the data model element {0} cannot be determined.";

        var L_ERROR201_TXT = "General argument error.";
        var L_ERROR2011_TXT = "General argument error. Please pass an empty string for '{0}' function.";
        var L_ERROR2012_TXT = "General argument error. '{0}' is not a valid CMI data model element.";
        var L_ERROR2013_TXT = "General argument error. The given data model name must be a string type.";
        var L_ERROR2014_TXT = "General argument error. The value cannot be null or undefined.";
        var L_ERROR2015_TXT = "The index of data model element '{0}' is expected to be smaller than the value of '{1}', which is '{2}'.";
        var L_ERROR2016_TXT = "The index of data model element '{0}' is expected to be smaller than or equal to the value of '{1}', which is '{2}'.";

        var L_ERROR202_TXT = "Element cannot have children.";
        var L_ERROR2021_TXT = "The data model element '{0}' cannot have children.";

        var L_ERROR203_TXT = "Element is not an array.";
        var L_ERROR2031_TXT = "The data model element '{0}' cannot have count.";

        var L_ERROR301_TXT = "The API instance is not initialized.";

        var L_ERROR402_TXT = "Invalid set value. Data model element is a keyword.";
        var L_ERROR4021_TXT = "Cannot set value for data model element '{0}' because it is a keyword.";

        var L_ERROR403_TXT = "Data model element is read-only.";
        var L_ERROR4031_TXT = "The data model element '{0}' is read-only.";

        var L_ERROR404_TXT = "Data model element is write-only.";
        var L_ERROR4041_TXT = "The data model element '{0}' is write-only.";

        var L_ERROR405_TXT = "Incorrect data type.";
        var L_ERROR4051_TXT = "The value '{0}' is not valid for data model element '{1}'.";

        errorDescriptions["0"] = L_ERROR0_TXT;

        errorDescriptions["101"] = L_ERROR101_TXT;
        errorDescriptions["101-1"] = L_ERROR1011_TXT;
        errorDescriptions["101-2"] = L_ERROR1012_TXT;
        errorDescriptions["101-3"] = L_ERROR1013_TXT;
        errorDescriptions["101-4"] = L_ERROR1014_TXT;

        errorDescriptions["201"] = L_ERROR201_TXT;
        errorDescriptions["201-1"] = L_ERROR2011_TXT;
        errorDescriptions["201-2"] = L_ERROR2012_TXT;
        errorDescriptions["201-3"] = L_ERROR2013_TXT;
        errorDescriptions["201-4"] = L_ERROR2014_TXT;
        errorDescriptions["201-5"] = L_ERROR2015_TXT;
        errorDescriptions["201-6"] = L_ERROR2016_TXT;

        errorDescriptions["202"] = L_ERROR202_TXT;
        errorDescriptions["202-1"] = L_ERROR2021_TXT;

        errorDescriptions["203"] = L_ERROR203_TXT;
        errorDescriptions["203-1"] = L_ERROR2031_TXT;

        errorDescriptions["301"] = L_ERROR301_TXT;

        errorDescriptions["402"] = L_ERROR402_TXT;
        errorDescriptions["402-1"] = L_ERROR4021_TXT;

        errorDescriptions["403"] = L_ERROR403_TXT;
        errorDescriptions["403-1"] = L_ERROR4031_TXT;

        errorDescriptions["404"] = L_ERROR404_TXT;
        errorDescriptions["404-1"] = L_ERROR4041_TXT;

        errorDescriptions["405"] = L_ERROR405_TXT;
        errorDescriptions["405-1"] = L_ERROR4051_TXT;
    }
}
