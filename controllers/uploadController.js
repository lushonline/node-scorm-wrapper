/* eslint-disable no-async-promise-executor */
const fs = require('fs');
const path = require('path');
const zipfile = require('is-zip-file');
const _ = require('lodash');
const urljoin = require('url-join');
const xpath = require('xpath');
const Xmldom = require('xmldom').DOMParser;
const extract = require('extract-zip-promise');
const { uuid } = require('uuidv4');
const rimraf = require('rimraf');
const { promisify } = require('util');
const { accessSafe } = require('access-safe');

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);

const saveResponses = async (uploadPath, response) => {
  return new Promise(async (resolve, reject) => {
    try {
      const fullPath = path.join(uploadPath, 'uploads.json');
      if (!fs.existsSync(fullPath)) {
        const uploads = {};
        uploads.lastUpdated = new Date();
        uploads.scorms = [];
        uploads.scorms.push(response);
        await writeFile(fullPath, JSON.stringify(uploads)).then(resolve());
      } else {
        await readFile(fullPath).then(async (data) => {
          const uploads = JSON.parse(data);
          uploads.scorms.push(response);
          uploads.lastUpdated = new Date();
          await writeFile(fullPath, JSON.stringify(uploads)).then(resolve());
        });
      }
    } catch (error) {
      reject(error);
    }
  });
};
// Handle
const post = async (req, res) => {
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
  response.id = null;

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
    response.id = uuid();
    response.created = new Date();
    const fileExtractPath = path.join(process.cwd(), req.uploadPath, response.id);

    extract(req.file.path, { dir: fileExtractPath }).then(async () => {
      // extraction is complete. make sure to handle the err
      // if (err) throw err;

      // We unzipped so now delete the upload
      rimraf(req.file.path, () => {});

      if (!fs.existsSync(path.join(fileExtractPath, 'imsmanifest.xml'))) {
        throw new Error('File did not contain an imsmanifest.xml');
      }
      // fulfilled the check for an imsmanifest, so now we need to read it

      const imsmanifestpath = path.join(fileExtractPath, 'imsmanifest.xml');
      let launchPath = null;

      // Now we need to check if the ZIP contained an imsmanifest.xml
      if (fs.existsSync(imsmanifestpath)) {
        // XMLNS used for extracting info
        const namespaces = {
          xmlns: 'http://www.imsproject.org/xsd/imscp_rootv1p1p2',
          adlcp: 'http://www.adlnet.org/xsd/adlcp_rootv1p2',
          xsi: 'http://www.w3.org/2001/XMLSchema-instance',
        };

        // file exists
        const content = fs.readFileSync(imsmanifestpath, 'utf8');

        // Parse the XML
        try {
          const xmlDoc = new Xmldom().parseFromString(content);

          // Create an xpath selector
          const xpathSelect = xpath.useNamespaces(namespaces);

          let xpathstr = '/xmlns:manifest/xmlns:resources/xmlns:resource[@adlcp:scormtype="sco"]';
          const resource = xpathSelect(xpathstr, xmlDoc, true);
          const resourceId = xpathSelect('@identifier', resource, true).value;
          const resourceHref = xpathSelect('@href', resource, true).value;

          xpathstr = `/xmlns:manifest/xmlns:organizations/xmlns:organization/xmlns:item[@identifierref="${resourceId}"]`;
          const item = xpathSelect(xpathstr, xmlDoc, true);
          const itemDataFromLMS = accessSafe(
            () => xpathSelect('./adlcp:datafromlms', item, true).textContent,
            null
          );
          const itemMastery = accessSafe(
            () => xpathSelect('./adlcp:masteryscore', item, true).textContent,
            null
          );

          const organization = item.parentNode;
          const organizationTitle = xpathSelect('xmlns:title', organization, true).textContent;

          if (!_.isNull(resourceHref)) {
            launchPath = urljoin('/uploads', response.id, resourceHref).replace('\\', '/');
          }

          response.message = 'File uploaded and unzipped';
          response.launch = launchPath;
          response.title = organizationTitle || 'Unknown';
          response.datafromlms = itemDataFromLMS || '';
          response.mastery = itemMastery ? _.toNumber(itemMastery) : null;
          response.success = true;

          // Save a JSON file
          await saveResponses(path.join(process.cwd(), req.uploadPath), response);
          res.json(JSON.stringify(response));
        } catch (error) {
          response.errors.push('Error processing imsmanifest.xml');
          response.xmlerrors = error;
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
  view,
};
