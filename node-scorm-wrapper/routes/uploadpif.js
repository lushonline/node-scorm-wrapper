'use strict';
var express = require('express');
var router = express.Router();
var unzipper = require('unzipper');
var fs = require('fs');
var path = require('path');
var zipfile = require('is-zip-file');
var _ = require('lodash');
var url = require('url');
var urljoin = require('url-join');
var libxml = require('libxmljs');


var multer = require('multer');
var upload = null;
var storage = null;
var uploadPath = 'public/uploads';


function deleteFile(dir, file) {
    return new Promise(function (resolve, reject) {
        var filePath = path.join(dir, file);
        fs.lstat(filePath, function (err, stats) {
            if (err) {
                return reject(err);
            }
            if (stats.isDirectory()) {
                resolve(deleteDirectory(filePath));
            } else {
                fs.unlink(filePath, function (err) {
                    if (err) {
                        return reject(err);
                    }
                    resolve();
                });
            }
        });
    });
};

function deleteDirectory(dir) {
    return new Promise(function (resolve, reject) {
        fs.access(dir, function (err) {
            if (err) {
                return reject(err);
            }
            fs.readdir(dir, function (err, files) {
                if (err) {
                    return reject(err);
                }
                Promise.all(files.map(function (file) {
                    return deleteFile(dir, file);
                })).then(function () {
                    fs.rmdir(dir, function (err) {
                        if (err) {
                            return reject(err);
                        }
                        resolve();
                    });
                }).catch(reject);
            });
        });
    });
};


//overwrite the storage variable
storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        //call the callback, passing it the dynamic file name
        cb(null, file.originalname);
    }
});

//overwrite the upload variable
upload = multer({ storage });


function colonToDollar(obj){
    var r={};
    for(var k in obj){
        r[k.replace(/:/g,'$')] = (typeof obj[k]==='object') ? colonToDollar(obj[k]) : obj[k];
    }
    return r;
}

//add a handler for the POST / route
router.post('/',
    upload.single('scormpif'),
    (req, res, next) => {
        var response = {};
        response.errors = [];
        response.success = false;
        response.message = null;
        response.launch = null;
        response.title =  null;
        response.datafromlms = null;
        response.mastery = null;
        response.sco = null;
        response.organization = null;
        response.organizationItem = null;

        const file = req.file;

        if (!file) {
            response.errors.push("Please upload a file");
            response.success = false;

            res.json(JSON.stringify(response));
        } else if (!zipfile.isZipSync(req.file.path)) {
            response.errors.push("Please upload a ZIP file");
            response.success = false;

            res.json(JSON.stringify(response));
        } else {
            const uniquePath = req.file.filename + '_' + Date.now();
            const fileExtractPath = path.join(uploadPath,uniquePath );

            var unzipPromise = fs.createReadStream(req.file.path)
                .pipe(unzipper.Extract({ path: fileExtractPath }))
                .promise();


            unzipPromise
                .then(
                    () => {
                        // fulfilled the unzip
                        //Now we need to check if the ZIP contained an imsmanifest.xml
                        if (!fs.existsSync(path.join(fileExtractPath, 'imsmanifest.xml'))) {
                            throw new Error('File did not contain an imsmanifest.xml');
                        }
                    }, (reason) => {
                        // rejection
                        throw new Error(reason.message);
                    })
                .then(
                    () => {
                        // fulfilled the check for an imsmanifest, so now we need to read it

                        var imsmanifestpath = path.join(fileExtractPath, 'imsmanifest.xml');
                        var launchPath = null;


                        //Now we need to check if the ZIP contained an imsmanifest.xml
                        if (fs.existsSync(imsmanifestpath)) {
                            //file exists

                            var content = fs.readFileSync(imsmanifestpath, 'utf8');

                            var xmlDoc = libxml.parseXmlString(content);
                            
                            //Filter from the erro list any with number 99 - XML_WAR_NS_URI
                            var errors = _.filter(xmlDoc.errors, function(o) { return o.code !== 99; });

                            //errors = xmlDoc.errors;
                            if (errors.length === 0) {
                                var namespaces = {xmlns: 'http://www.imsproject.org/xsd/imscp_rootv1p1p2', adlcp: 'http://www.adlnet.org/xsd/adlcp_rootv1p2', xsi: 'http://www.w3.org/2001/XMLSchema-instance'};

                                var xpathstr = '/xmlns:manifest/xmlns:resources/xmlns:resource[@adlcp:scormtype="sco"]';
                                var resource = xmlDoc.get(xpathstr,namespaces);
                                var resourceId = resource.get('@identifier',namespaces).value();
                                var resourceHref = resource.get('@href',namespaces).value();

                                xpathstr = `/xmlns:manifest/xmlns:organizations/xmlns:organization/xmlns:item[@identifierref="${resourceId}"]`;
                                var item = xmlDoc.get(xpathstr,namespaces);
                                var itemDataFromLMS = item.get('adlcp:datafromlms',namespaces);
                                var itemMastery = item.get('adlcp:masteryscore',namespaces);

                                var organization = item.parent();
                                var organizationTitle = organization.get('xmlns:title',namespaces);

                                if (!_.isNull(resourceHref)) {
                                    launchPath = urljoin('uploads', uniquePath, resourceHref).replace('\\','/');
                                } 

                                response.message = 'File uploaded and unzipped';
                                response.launch = launchPath;
                                response.title =  organizationTitle ? organizationTitle.text() : 'Unknown';
                                response.datafromlms = itemDataFromLMS ? itemDataFromLMS.text() : "";
                                response.mastery = itemMastery ? _.toNumber(itemMastery.text()) : 100;
                                response.success = true;
                                res.json(JSON.stringify(response));
                            } else {
                                response.errors.push('Error processing imsmanifest.xml');
                                response.xmlerrors = errors;
                                response.success = false;
                                res.json(JSON.stringify(response));
                            }
                        } else {
                            response.errors.push('File did not contain an imsmanifest.xml');
                            response.success = false;
                            res.json(JSON.stringify(response));
                        }
                        
                        //console.log('done');
                    }, (reason) => {
                        // rejection
                        response.errors.push(reason.message);
                        response.success = false;
                        res.json(JSON.stringify(response));
                    });
        }
    });

router.get('/', function (req, res) {
    res.render('uploadpif', {});
});

module.exports = router;
