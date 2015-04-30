var express = require('express');
var Env = require('./.env.json');
var Config = require('./Config.json');
var redis = require('redis');
var shortid = require('shortid');
var app = express();
var http = require('http');
var https = require('https');
var Promise = require('es6-promise').Promise;
var redisClient = redis.createClient();
var _ = require('underscore');
var server;

if (Env.secured === true) {
    var options = {
        key: fs.readFileSync(Env.cert_key),
        cert: fs.readFileSync(Env.cert_file)
    };

    server = https.createServer(options, app).listen(Env.secure_port);
} else {
    console.log('not secured');
    server = http.createServer(app).listen(Env.port);
}

var io = require('socket.io')(server);


var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', Env['client-domain']);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');

    // intercept OPTIONS method
    if ('OPTIONS' == req.method) {
        res.send(200);
    }
    else {
        next();
    }
};

var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(allowCrossDomain);

var namespaces = {};

_.forEach(_.keys(Config.app_events), function(appName) {
    var ioIns = io.of('/' + appName);
    ioIns.on('connection', function (socket) {
        console.log('someone connected to ' + appName + ' application (namespace)!!!' + new Date());
    });
    namespaces[appName] = ioIns;
});

app.post('/push', function (req, res) {
    var data = req.body;
    var appName = data.app_name;
    var eventName = data.event_name;
    if ( ! isValidEventName(appName, eventName)) {
        return null;
    }
    var payload = _.omit(data, ['app_name', 'event_name']);
    console.log(payload);
    if ( ! isValidAppName(appName)) {
        return res.status(400).json({message: 'not a valid namespace name'});
    }

    if ( ! isValidEventName(appName, eventName)) {
        return res.status(400).json({message: 'not a valid event name'});
    }

    console.log('got event: ' + eventName + ' from ' + appName + ' emitting now...');
    var app = namespaces[appName];
    if ( !! app) {
        app.emit(eventName, payload);
    }

    return res.json(_.omit(data, ['app_name', 'event_name']));
});


//function attemptClientToken(key, token) {
//    var pending = new Promise(function (resolve, reject) {
//        redisClient.get(key, function (error, result) {
//            if (!! error) {
//                reject(Error(error));
//            }
//            resolve(result);
//        });
//    });
//
//    return pending.then(function (result) {
//        if (result === token) {
//            return new Promise(function (resolve, reject) {
//                resolve(true);
//            });
//        }
//        return new Promise(function (resolve, reject) {
//            resolve(false);
//        });
//    });
//}

function isValidAppName(app) {
    return !! Config.app_events[app];
}
function isValidEventName(app, eventName) {
    if ( ! isValidAppName(app)) {
        return false;
    }
    return (Config.app_events[app].indexOf(eventName) > -1);
}

//app.get('/subscribe/:appName/:type/:event', function(req, res) {
//    var appName = req.params.appName;
//    var eventName = req.params.type + ':' + req.params.event;
//    var key = 'clientToken:' + req.params.appName + ':' + token;
//    var fullEventName = appName + ':' + eventName;
//
//    if ( ! isValidEventName(appName, eventName)) {
//        res.status(400).json({message: eventName + ' is not a valid event for ' + appName + ' application'});
//    }
//
//    attemptClientToken(key).then(function (validAuth) {
//        if (validAuth) {
//            subscribeEvent(fullEventName);
//        }
//    });
//});

function subscribeEvent(eventName) {

}

app.get('/set/:value', function(req, res) {
    console.log(req.params.value);
    redisClient.set('test', req.params.value);
    res.send('OK!');
});

//app.get('/generate/client-token/', function (req, res) {
//    //TODO: Check to see if server key that's pass is the one in the Env!
//    var token = shortid.generate();
//    var key = 'clientToken:' + req.params.appName + ':' + token;
//    redisClient.set(key, 'valid');
//    redisClient.expire(key, Config.expiration);
//    //res.status(403).json({message: 'not authorized'});
//    console.log('someone is requesting client token');
//    res.json({token: token});
//});

//app.get('/attempt/:appName/:token', function (req, res) {
//    var token = req.params.token;
//    var key = 'clientToken:' + req.params.appName + ':' + token;
//
//    attemptClientToken(key).then(function (valid) {
//        if (valid) {
//            res.json({message: 'OK!'});
//        }
//        res.status(403).json({message: 'Not Authorized'});
//    });
//
//});

app.get('/get/:dbname', function (req, res) {
    var pending = new Promise(function (resolve, reject) {
        redisClient.get(req.params.dbname, function (error, result) {
            if (!! error) {
                reject(Error(error));
            }
            resolve(result);
        });
    });

    pending.then(function (result) {
        res.send(result + '!!!');
    });
});

app.post('/emit', function (req, res) {

});

app.get('/', function (req, res) {
    res.send('I am here!');
});

