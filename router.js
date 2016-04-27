var Q = require("q"),
    fs = require('fs'),
    otp = require('otplib/lib/authenticator'),
    crypto = require('crypto'),
    multer  = require('multer'),
    email = require("./email.js"),
    user = require("./user.js"),
    ncpi = require("./ncpi.js"),
    txn = require("./txn.js"),
    pd = require('pretty-data').pd,
    parseString = require('xml2js').parseString,
    global = require('./global.js');

var ackMsg = '<upi:Ack xmlns:upi="" api="" reqMsgId="" err="" ts=""/>';
var EXPIRE_MIN=2;
var upload = multer({ dest: __dirname+'/uploads' });

module.exports = function(app) {
    
    app.get('/*', function(req, res) {
        var msg = "You are locked!";
        sendResponse(res, msg);
        return;
    });

    app.post('/upi/*', function(req, res){
        console.log('from UPI');
        console.log(req.originalUrl);
        //res.send(ackMsg);
        if(req.originalUrl.indexOf('ReqAuthDetails')>0){
            console.log(pd.xml(req.body));
            parse(req.body)
            .then(function(upiReq){
                var d = Q.defer();
                var reqMsgId = upiReq['ns2:ReqAuthDetails']['Head'][0]['$']['msgId']
                ackMsg = ackMsg.replace('reqMsgId="', 'reqMsgId="'+reqMsgId);
                ackMsg = ackMsg.replace('api="', 'api="ReqAuthDetails');
                console.log('acknowledge to ReqAuthDetails');
                console.log(ackMsg);
                res.setHeader('Content-Type', 'application/xml');
                res.send(ackMsg);
                d.resolve(upiReq);
                return d.promise;
            })
            .then(ncpi.respAuth);
        }else if(req.originalUrl.indexOf('RespPay')>0){
            console.log(pd.xml(req.body));
        }
    });

    app.post('/register', function(req, res) {debugger;
        var input = JSON.parse(req.body);
        if(!input.email) {
            var msg = {error:"Invalid input",errorCode:"101"};
            sendResponse(res, msg);
            return;
        }
        user.isNew(input.email)
        .then(user.insert)
        .then(email.send)
        .then(function(msg){sendResponse(res, msg)})
        .catch(function(msg){sendResponse(res, msg)}); 
    });

    app.post('/pay', function(req, res) {
        var input = req.body;
        if(!input.payee){
            var msg = {error:"Payee not present",errorCode:"102"};
            sendResponse(res, msg);
            return;
        }
        ncpi.pay(input)
        .then(txn.insert)
        .then(function(msg){sendResponse(res,msg)})
        .catch(function(msg){sendResponse(res, msg)});
    });

    var parse = function(xml){
        var d = Q.defer();
        parseString(xml, function(err, result) {
            if(err) {
                d.reject({msg:'error parsing xml from upi'});
                return;
            }
            d.resolve(result);
        });
        return d.promise;
    };

    var sendResponse = function(res, msg){
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(msg));
    };

    var pay = function(message){
        ncpi.pay(message)
        .then(txn.insert)
        .then(function(msg){sendResponse(res,msg)})
        .catch(function(msg){sendResponse(res, msg)});
        var statuses = [{"from":"initiated","to":"initiated"}, {"from":"authorized","to":"payer authorized"}, 
           {"from":"debited","to":"debited from payer's bank"}, {"from":"credited to payee","to":"credited"}, {"from":"completed","to":"completed"}];
        statuses.forEach(function(status, index){
            setTimeout(sendStatus.bind(null, message, status), 3000*(index+1));
        });
    };

    var sendStatus = function(message, status, index, array){debugger;
        message.status = status.to;
        global.clients[message.to].send(JSON.stringify(message), function(err){
            if(err)
            console.log(err);
        });
        message.status = status.from;
        global.clients[message.from].send(JSON.stringify(message), function(err){
            if(err)
            console.log(err);
        });
    }

    return {pay:pay};
}
