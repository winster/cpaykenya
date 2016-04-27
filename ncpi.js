var otp = require("otplib/lib/authenticator"),
    Q = require("q"),
    https = require('https'),
    fs = require('fs')
    connection = require('./connection.js'),
    ca = fs.readFileSync('./ssl/upi-ssl.cer'),
    https = require("https"),
    upi = require("./upi.json"),
    xml2js = require('xml2js'),
    parseString = xml2js.parseString,
    pd = require('pretty-data').pd,
    oldMsgId='', newMsgId='', oldTxnId='', newTxnId='';


var NCPI = function(){};
NCPI.prototype.beat = function(){
    var d = Q.defer();
    var xmlReq = fs.readFileSync("./xml/Hbt.xml", "utf8");
    parseString(xmlReq, function(err, result) {
        oldMsgId = result['ns2:ReqHbt']['Head'][0]['$']['msgId'];
        newMsgId = randomString(35, 'aA#');
        oldTxnId = result['ns2:ReqHbt']['Txn'][0]['$']['id'];
        newTxnId = randomString(35, '#');
        xmlReq = xmlReq.replace(oldMsgId, newMsgId);
        xmlReq = xmlReq.replace(oldTxnId, newTxnId);
        fs.writeFileSync("./xml/Hbt.xml", xmlReq, "utf8");
        oldMsgId = newMsgId;
        oldTxnId = newTxnId;
    
        var cmd = require('child_process').spawnSync('java', ['SignatureGenUtil', 'Hbt']);
    	var body = fs.readFileSync("./xml/Hbt_signed.xml", "utf8");
    	var options = {
        	host: upi.host,
        	port: upi.port,
        	path: '/upi/ReqHbt/1.0/urn:txnid:'+newTxnId,
        	rejectUnauthorized: false,
        	requestCert: true,
        	agent: false,
        	method: "POST",
        	headers: {
        	    'Content-Type': 'application/xml',
        	    'Accept': 'application/xml'
        	}
    	};
    	options.agent = new https.Agent(options);
    	var req = https.request(options, function(res) {
    	   console.log( res.statusCode );
    	   var buffer = "";
    	   res.on( "data", function( data ) { buffer = buffer + data; } );
    	   res.on( "end", function( data ) { console.log('Heartbeat response');console.log( buffer ); d.resolve(buffer);} );
    	});
    	req.on('error', function(e) {
    	  	console.log('Heartbeat problem with request: ' + e.message);
      		d.reject({error:"User already exists", errorCode:"121"});
    	});
        console.log('Heartbeat request::'+options.path);
        console.log(body);
    	req.write( body );
    	req.end();
    });
    return d.promise; 
};
NCPI.prototype.pay = function(input){
    var d = Q.defer();
    var xmlReq = fs.readFileSync("./xml/ReqPay.xml", "utf8");
    parseString(xmlReq, function(err, result) {
        oldMsgId = result['upi:ReqPay']['Head'][0]['$']['msgId'];
        newMsgId = randomString(35, 'aA#');
        oldTxnId = result['upi:ReqPay']['Txn'][0]['$']['id'];
        newTxnId = randomString(35, '#');
        xmlReq = xmlReq.replace(oldMsgId, newMsgId);
        xmlReq = xmlReq.replace(oldTxnId, newTxnId);
        fs.writeFileSync("./xml/ReqPay.xml", xmlReq, "utf8");
        oldMsgId = newMsgId;
        oldTxnId = newTxnId;
        var cmd = require('child_process').spawnSync('java', ['SignatureGenUtil', 'ReqPay']);
        var body = fs.readFileSync("./xml/ReqPay_signed.xml", "utf8");
        var options = {
                host: upi.host,
                port: upi.port,
                path: '/upi/ReqPay/1.0/urn:txnid:'+newTxnId,
                rejectUnauthorized: false,
                requestCert: true,
                agent: false,
                method: "POST",
                headers: {
                    'Content-Type': 'application/xml',
                    'Accept': 'application/xml'
                }
        };
        options.agent = new https.Agent(options);
        var req = https.request(options, function(res) {
           console.log( res.statusCode );
           var buffer = "";
           res.on( "data", function( data ) { buffer = buffer + data; } );
           res.on( "end", function( data ) { console.log('ReqPay response');console.log( buffer ); d.resolve(buffer);} );
        });
        req.on('error', function(e) {
                console.log('ReqPay problem with request: ' + e.message);
                d.reject({error:"User already exists", errorCode:"121"});
        });
        console.log('ReqPay request::'+options.path);
        console.log(body);
        req.write( body );
        req.end();
    });
    return d.promise;
};
NCPI.prototype.respAuth = function(reqUpi){
    var d=Q.defer();
    var xmlReq = fs.readFileSync("./xml/RespAuthDetails.xml", "utf8");
    parseString(xmlReq, function(err, result) {
        oldMsgId = result['upi:RespAuthDetails']['Head'][0]['$']['msgId'];
        newMsgId = randomString(35, 'aA#');
        oldTxnId = reqUpi['ns2:ReqAuthDetails']['Txn'][0]['$']['id'];
        result['upi:RespAuthDetails']['Head'][0]['$']['msgId'] = newMsgId;
        result['upi:RespAuthDetails']['Resp'][0]['$']['reqMsgId'] = reqUpi['ns2:ReqAuthDetails']['Head'][0]['$']['msgId'];
        //result['upi:RespAuthDetails']['Txn'] = reqUpi['ns2:ReqAuthDetails']['Txn'];
        result['upi:RespAuthDetails']['Payer'] = reqUpi['ns2:ReqAuthDetails']['Payer'];
        result['upi:RespAuthDetails']['Payees'][0]['Payee'][0]['$']['addr'] = reqUpi['ns2:ReqAuthDetails']['Payees'][0]['Payee'][0]['$']['addr'];
        result['upi:RespAuthDetails']['Txn'][0]['$']['id'] = oldTxnId;
        var builder = new xml2js.Builder();
        var xmlReq = builder.buildObject(result);
        fs.writeFileSync("./xml/RespAuthDetails.xml", xmlReq, "utf8");
        var cmd = require('child_process').spawnSync('java', ['SignatureGenUtil', 'RespAuthDetails']);
        var body = fs.readFileSync("./xml/RespAuthDetails_signed.xml", "utf8");
        var options = {
                host: upi.host,
                port: upi.port,
                path: '/upi/RespAuthDetails/1.0/urn:txnid:'+oldTxnId,
                rejectUnauthorized: false,
                requestCert: true,
                agent: false,
                method: "POST",
                headers: {
                    'Content-Type': 'application/xml',
                    'Accept': 'application/xml'
                }
        };
        options.agent = new https.Agent(options);
        var req = https.request(options, function(res) {
           console.log( res.statusCode );
           var buffer = "";
           res.on( "data", function( data ) { buffer = buffer + data; } );
           res.on( "end", function( data ) { console.log('RespAuthDetails response');console.log( buffer ); d.resolve(buffer);} );
        });
        req.on('error', function(e) {
                console.log('RespAuthDetails problem with request: ' + e.message);
                d.reject({error:"User already exists", errorCode:"121"});
        });
        req.write( body );
        console.log('RespAuthDetails Request::'+options.path);
        console.log(body);
        req.end();
    });
    return d.promise;
};
function randomString(length, chars) {
    var mask = '';
    if (chars.indexOf('a') > -1) mask += 'abcdefghijklmnopqrstuvwxyz';
    if (chars.indexOf('A') > -1) mask += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (chars.indexOf('#') > -1) mask += '0123456789';
    if (chars.indexOf('!') > -1) mask += '~`!@#$%^&*()_+-={}[]:";\'<>?,./|\\';
    var result = '';
    for (var i = length; i > 0; --i) result += mask[Math.floor(Math.random() * mask.length)];
    return result;
}
NCPI.prototype.randomString = randomString;
module.exports = new NCPI();


