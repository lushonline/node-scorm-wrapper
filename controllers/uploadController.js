const fs = require('fs');
const path = require('path');
const zipfile = require('is-zip-file');
const _ = require('lodash');
const urljoin = require('url-join');
const libxml = require('libxmljs');
const extract = require('extract-zip');

// Handle
const post = (req, res) => {
  req.setTimeout(500000);

  const response = {};
  response.errors = [];
  response.success = false;
  response.message = null;
  response.launch = null;
  response.title = null;
  response.datafromlms = null;
  response.mastery = null;
  response.sco = null;
  response.organization = null;
  response.organizationItem = null;

  const { file } = req;

  if (!file) {
    response.errors.push('Please upload a file');
    response.success = false;

    res.json(JSON.stringify(response));
  } else if (!zipfile.isZipSync(req.file.path)) {
    response.errors.push('Please upload a ZIP file');
    response.success = false;

    res.json(JSON.stringify(response));
  } else {
    const uniquePath = `${req.file.filename}_${Date.now()}`;
    const fileExtractPath = path.join(process.cwd(), req.uploadPath, uniquePath);

    extract(req.file.path, { dir: fileExtractPath }, err => {
      // extraction is complete. make sure to handle the err
      if (err) throw err;

      if (!fs.existsSync(path.join(fileExtractPath, 'imsmanifest.xml'))) {
        throw new Error('File did not contain an imsmanifest.xml');
      }
      // fulfilled the check for an imsmanifest, so now we need to read it

      const imsmanifestpath = path.join(fileExtractPath, 'imsmanifest.xml');
      let launchPath = null;

      // Now we need to check if the ZIP contained an imsmanifest.xml
      if (fs.existsSync(imsmanifestpath)) {
        // file exists

        const content = fs.readFileSync(imsmanifestpath, 'utf8');

        const xmlDoc = libxml.parseXmlString(content);

        // Filter from the erro list any with number 99 - XML_WAR_NS_URI
        const errors = _.filter(xmlDoc.errors, o => {
          return o.code !== 99;
        });

        // errors = xmlDoc.errors;
        if (errors.length === 0) {
          const namespaces = {
            xmlns: 'http://www.imsproject.org/xsd/imscp_rootv1p1p2',
            adlcp: 'http://www.adlnet.org/xsd/adlcp_rootv1p2',
            xsi: 'http://www.w3.org/2001/XMLSchema-instance'
          };

          let xpathstr = '/xmlns:manifest/xmlns:resources/xmlns:resource[@adlcp:scormtype="sco"]';
          const resource = xmlDoc.get(xpathstr, namespaces);
          const resourceId = resource.get('@identifier', namespaces).value();
          const resourceHref = resource.get('@href', namespaces).value();

          xpathstr = `/xmlns:manifest/xmlns:organizations/xmlns:organization/xmlns:item[@identifierref="${resourceId}"]`;
          const item = xmlDoc.get(xpathstr, namespaces);
          const itemDataFromLMS = item.get('adlcp:datafromlms', namespaces);
          const itemMastery = item.get('adlcp:masteryscore', namespaces);

          const organization = item.parent();
          const organizationTitle = organization.get('xmlns:title', namespaces);

          if (!_.isNull(resourceHref)) {
            launchPath = urljoin('uploads', uniquePath, resourceHref).replace('\\', '/');
          }

          response.message = 'File uploaded and unzipped';
          response.launch = launchPath;
          response.title = organizationTitle ? organizationTitle.text() : 'Unknown';
          response.datafromlms = itemDataFromLMS ? itemDataFromLMS.text() : '';
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
    });
  }
};

const view = (req, res) => {
  res.render('upload', {});
};

module.exports = {
  post,
  view
};
