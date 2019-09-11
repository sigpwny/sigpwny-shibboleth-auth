var restify = require("restify");

var server = restify.createServer();

function respond(req, res, next) {
  res.send('hello ' + req.params.name);
  next();
}


server.get('/', (req, res, next) => {
  res.send('hello world');
  return next();
});

server.get('/hello/:name', (req, res, next) => {
  res.send('hello ' + req.params.name);
  next();
});

server.listen(8080, function() {
  console.log('%s listening at %s', server.name, server.url);
});