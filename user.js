var otp = require("otplib/lib/authenticator");
var Q = require("q");
var connection = require('./connection.js');

var User = function(){};

User.prototype.isNew = function(email){
    var d = Q.defer();
    connection(function(db){
        var cursor =db.collection('users').find({"email":email});
        cursor.each(function(err, doc) {
            if (doc && doc.verified) {
                d.reject({error:"User already exists", errorCode:"121"});
                return;
            } 
            d.resolve(email);
        });
    });
    return d.promise;
};
User.prototype.get = function(email){
    var d = Q.defer();
    connection(function(db){
        var cursor =db.collection('users').find({"email":email});
        cursor.each(function(err, doc) {
            if(err) {
                d.reject({error:"User not found", errorCode:"122"});
                return;
            }
            d.resolve(doc);
        });
    });
    return d.promise;    
};
User.prototype.insert = function(email){
    var d = Q.defer();
    var code = otp.generate(otp.generateSecret());
    var user = {otp:code, verified:false, email:email};
    connection(function(db){
        db.collection('users').insertOne(user,  function(err, res) {
            if(err) {
                d.reject({error:"insert failed:"+err.message, errorCode:"123"});
                return;
            }
            d.resolve(user);
        });
    });
    return d.promise;
};
User.prototype.replace = function(email, user){
    var d = Q.defer();
    bucket.replace(email, user, function(err, res) {
        if(err) {
            d.reject({error:"replace failed:"+err.message, errorCode:"124"});
            return;
        }
        d.resolve({message:"user replaced"});
    });
    return d.promise;
};

module.exports = new User();

