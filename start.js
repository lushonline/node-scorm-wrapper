const app = require('./app');

app.set('port', process.env.PORT || 3000);
const server = app.listen(app.get('port'), () => {
  // eslint-disable-next-line no-console
  console.log(`Express is running on port ${server.address().port}`);
});
