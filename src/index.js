var domain = require('domain');
var uuid = require('node-uuid');
var Contexto = require('./Contexto');

function domainMiddleware(req, res, next) {
    var reqDomain = domain.create();

    reqDomain.add(req);
    reqDomain.add(res);

    reqDomain.id = uuid.v4();
    reqDomain.contexto = new Contexto();

    res.on('close', function () {
        //reqDomain.dispose();
    });


    res.on('finish', function () {
        if( reqDomain.contexto ) {
            reqDomain.contexto.release();
            reqDomain.contexto = null;
            reqDomain.id = null;
            //reqDomain.dispose();
        }
    });


    reqDomain.on('error', function (err) {
        //reqDomain.dispose();
        //reqDomain.contexto.release();

        console.log(err.message);
        throw err;
        console.log(3);
        //next(err);
    });

    reqDomain.run(next);

};

function middlewareOnError(err, req, res, next) {
    var reqDomain = domain.active;

    if( reqDomain.contexto ) {
        reqDomain.contexto.release();
        reqDomain.contexto = null;
    }

    reqDomain.id = null;

    next(err);
}

module.exports.domainMiddleware = domainMiddleware;
module.exports.middlewareOnError = middlewareOnError;