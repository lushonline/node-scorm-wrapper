const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');
const { promisify } = require('util');

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);

// Handle Wrapper
const post = (req, res) => {
  res.render('wrapper', {
    title: 'SCORM RTE Test Harness',
    responsedata: JSON.parse(req.body.response)
  });
};

const getAllSCORM = async uploadPath => {
  return new Promise(async (resolve, reject) => {
    try {
      const fullPath = path.join(uploadPath, 'uploads.json');
      await readFile(fullPath).then(data => {
        const uploads = JSON.parse(data);
        resolve(uploads);
      });
    } catch (error) {
      reject(error);
    }
  });
};

const getSCORMByUUID = async (uploadPath, uuid) => {
  return new Promise(async (resolve, reject) => {
    try {
      await getAllSCORM(uploadPath).then(data => {
        const result = data.scorms.filter(value => {
          return value.id === uuid;
        });
        if (result.length === 0) throw new Error('SCORM Not Found');
        resolve(result[0]);
      });
    } catch (error) {
      reject(error);
    }
  });
};

const deleteSCORMByUUID = async (uploadPath, uuid) => {
  return new Promise(async (resolve, reject) => {
    try {
      await getAllSCORM(uploadPath).then(async data => {
        const updated = data;
        updated.lastUpdated = new Date();
        const results = data.scorms.filter(value => {
          return value.id !== uuid;
        });
        updated.scorms = results;
        await writeFile(path.join(uploadPath, 'uploads.json'), JSON.stringify(updated)).then(
          resolve()
        );
      });
    } catch (error) {
      reject();
    }
  });
};

const getByUUID = async (req, res, next) => {
  const { uuid } = req.params;
  await getSCORMByUUID(path.join(process.cwd(), req.uploadPath), uuid)
    .then(response => {
      res.render('wrapper', {
        title: 'SCORM RTE Test Harness',
        responsedata: response
      });
    })
    .catch(error => {
      next(error);
    });
};

const getAll = async (req, res, next) => {
  await getAllSCORM(path.join(process.cwd(), req.uploadPath))
    .then(response => {
      const scormList = response.scorms.map(value => {
        const result = value;
        result.wrapperurl = `wrapper/${result.id}`;
        result.wrapperdeleteurl = `wrapper/${result.id}/delete`;
        return result;
      });

      res.render('wrapper', {
        title: 'SCORM RTE Test Harness',
        responsedata: {},
        scormList
      });
    })
    .catch(error => {
      next(error);
    });
};

const deleteByUUID = async (req, res, next) => {
  const { uuid } = req.params;
  await deleteSCORMByUUID(path.join(process.cwd(), req.uploadPath), uuid)
    .then(() => {
      rimraf(path.join(process.cwd(), req.uploadPath, uuid), () => {
        res.redirect(req.baseUrl);
      });
    })
    .catch(error => {
      next(error);
    });
};

module.exports = {
  post,
  getByUUID,
  getAll,
  deleteByUUID
};
