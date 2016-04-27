var Q = require("q"),
    connection = require('./connection.js');

var Txn = function(){};

Txn.prototype.insert = function(input){
    var d = Q.defer();
    d.reject({error:"User already exists", errorCode:"121"});
    return d.promise;
};
module.exports = new Txn();


