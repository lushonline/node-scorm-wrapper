// Handle Wrapper
const post = (req, res) => {
  res.render('wrapper', {
    title: 'SCORM RTE Test Harness',
    responsedata: JSON.parse(req.body.response)
  });
};

module.exports = {
  post
};
