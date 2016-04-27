var express = require('express'),
    bodyParser = require('body-parser'),
    https = require("https"),
    http = require("http"),
    fs = require("fs"),
    /*ncpi = require("./ncpi.js"),*/
    xmlparser = require('express-xml-bodyparser'),
    WebSocketServer = require("ws").Server,
    url = require('url'),
    app = express(),
    global = require('./global.js');

app.use(bodyParser.json());
app.use(bodyParser.text({type:'application/xml'}));
var router = require("./router.js")(app);

/*var secureServer = https.createServer({
    key: fs.readFileSync('./ssl/cpay-ssl.key'),
    cert: fs.readFileSync('./ssl/cpay-ssl.crt'),
    requestCert: true,
    rejectUnauthorized: false
}, app).listen('443', function() {
    console.log("Secure CPay server listening on port 443");
});*/

var server = http.createServer();
var wss = new WebSocketServer({server: server})
server.on('request', app);
server.listen(80);

wss.on("connection", function(ws) {
  var userKey = getParameterByName('user',ws.upgradeReq.url);
  global.clients[userKey] = ws;
  var result = {'status':'connected'}
  ws.send(JSON.stringify(result), function() {  })
  console.log("websocket connection open");
  ws.on('message', function incoming(message) {
    console.log('received: %s', message);
    try{
      message = JSON.parse(message);
    }catch(e){
      message={"text":"send message in json format"};
    }
    if(message.to && global.clients[message.to]){
      if(message.text==='PAY')
          router.pay(message);
      else
          global.clients[message.to].send(JSON.stringify(message), function(err){
              if(err)
              console.log('error while sending to webscoket client::'+err);
          });        
    }
  });
  ws.on("close", function() {
    console.log("websocket connection close");    
  });
});

/*ncpi.beat();
setInterval(ncpi.beat, 180000);*/
exports = module.exports = app;

function getParameterByName(name, url) {
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    var value = decodeURIComponent(results[2].replace(/\+/g, " "));
    return value;
}
