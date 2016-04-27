var https = require("https");
var Q = require("q");
var nodemailer = require("nodemailer");
var smtpTransport = require('nodemailer-smtp-transport');

var Email = function(){};

Email.prototype.send = function(user) {debugger;
    console.log(JSON.stringify(user));
    var d = Q.defer();
    var mailOptions = {
        from: 'registrations@cpay.com',
        to: user.email,
        subject: 'OTP CPay Registration ',
        text: 'Welcome to CPay',
        html: '<span>Your OTP <b>'+user.otp+'</b>'
    };
    var transporter = nodemailer.createTransport(smtpTransport({
        host: "smtp.gmail.com",
        secure: false,
        port: 587,
        auth: {
            user:"wtjose@gmail.com",
            pass:"cfbksmihwajbjgap"
        }
        /*logger: true*/
    }));
    transporter.sendMail(mailOptions, function(error, response){
        if(error){
            console.log(error);
            d.reject({status:"user created. otp not sent"});
        }else{
            console.log("Message sent: " + response);
            d.resolve({status:"otp sent"});
        }
    });
    return d.promise;
};

module.exports = new Email();

