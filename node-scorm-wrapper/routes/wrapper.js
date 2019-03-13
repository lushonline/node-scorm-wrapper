'use strict';
var express = require('express');
var router = express.Router();

/* POST */
router.post('/', function (req, res) {
    res.render('wrapper', { title: 'SCORM RTE Test Harness' , responsedata: JSON.parse(req.body.response)});
});

module.exports = router;