// Handle home
const view = (req, res) => {
  res.render('home', { title: 'SCORM Wrapper' });
};

module.exports = {
  view
};
