var uuid = require('node-uuid');
var domain = require('domain');


function Contexto() {
    this.callbacks = [];
    this.id = uuid.v4();
}

function Conexao(connection) {
    this.connection = connection;
    this.temTransacao = false;
}

Conexao.prototype.beginTransaction = function(callback) {
    this.temTransacao = true;

    this.connection.beginTransaction(callback);
}

Conexao.prototype.release = function () {
    if( this.temTransacao ) {
        console.log('tem que fazer rollback antes');
        this.connection.rollback( () => {
            this.connection.release();
        });

        return;
    }

    this.connection.release();
}

Conexao.prototype.query = function(sql, values, cb) {
    this.connection.query(sql, values, cb);
}

Conexao.prototype.commit = function(options, callback) {
    this.temTransacao = false;
    this.connection.commit(options, callback);
}

Conexao.prototype.rollback = function(options, callback) {
    this.temTransacao = false;

    this.connection.rollback(options, callback);
}

Conexao.prototype.ping = function(options, callback) {
    this.connection.ping(options, callback);
}

Conexao.prototype.end = function end(options, callback) {
    this.connection.end(options, callback);
}

Conexao.prototype._handleNetworkError = function(err) {
    this.connection._handleNetworkError(err);
};

Conexao.prototype._handleProtocolError = function(err) {
    this.connection._handleProtocolError(err);
};

Conexao.prototype._handleProtocolDrain = function() {
    this.connection._handleProtocolDrain();
};

Conexao.prototype._handleProtocolConnect = function() {
    this.connection._handleProtocolConnect();
};

Conexao.prototype._handleProtocolHandshake = function() {
    this.connection._handleProtocolHandshake();
};

Conexao.prototype._handleProtocolInitialize = function(packet) {
    this.connection._handleProtocolInitialize(packet);
};

Conexao.prototype._handleProtocolEnd = function(err) {
    this.connection._handleProtocolEnd(err);
};

Conexao.prototype._handleProtocolEnqueue = function _handleProtocolEnqueue(sequence) {
    this.connection._handleProtocolEnqueue(sequence);
};

Conexao.prototype._implyConnect = function() {
    if (!this._connectCalled) {
        this.connect();
    }
};

Contexto.prototype = {

    carregou :function(connection) {
        this.conexao = new Conexao(connection);

        if( this.encerrou ) {

            this.release();
            return;
        }
        this.carregando = false;
        for(var i=0; i< this.callbacks.length; i++) {
            this.callbacks[i](this.conexao);
        }
    },

    obtenhaConexao: function(callback){
        var me = this;

        if(this.conexao) {
            return callback(this.conexao);
        }

        this.callbacks.push(callback);

        if( this.carregando ==true) return;


        this.carregando = true;
        pool.getConnection(function (err, connection) {
            if( err ) { console.log(err); }

            me.carregou(connection);
        });
    },

    inicieTransacao : function(callback){
        var me = this;

        var dominio = require('domain').active;

        function comTransacao(callback){
            me.conexao.beginTransaction(dominio.intercept(function() {
                return callback(me.conexao, function(success,error) {
                    me.commit(success);
                });
            }));
        }

        if(this.conexao)
            return comTransacao(callback)

        this.obtenhaConexao(function(conexao){
            comTransacao(callback);
        })
    },


    release:function(){
        if(this.conexao) {
            if (pool._freeConnections.indexOf(this.conexao) == -1) {
                //console.log('fazendo release');
                this.conexao.release();
            }
        } else {
            this.encerrou = true;
        }

    },

    commit:function(callback){
        if(!this.conexao) return;

        var me = this;

        var dominio = require('domain').active;

        me.conexao.commit(dominio.intercept(function(result,err) {
            if (err) {
                me.conexao.rollback(function() {
                    if(callback) callback(false);
                });
            } else  if(callback) callback(true);

        }));
    },

    roolback:function(){
        if(!this.conexao) return

        this.conexao.rollback(function() {

        });
    }
}

function domainMiddleware(req, res, next) {
    var reqDomain = domain.create();

    reqDomain.add(req);
    reqDomain.add(res);

    reqDomain.id = uuid.v4();
    reqDomain.contexto = new Contexto();

    res.on('close', function () {
        //reqDomain.dispose();
        if( reqDomain.contexto ) {
            reqDomain.contexto.release();
        }
    });

    res.on('finish', function () {
        if( reqDomain.contexto ) {
            reqDomain.contexto.release();
            reqDomain.contexto = null;
            reqDomain.id = null;
            //reqDomain.dispose();
        }
    });

    res.on('error', function() {
        if( reqDomain.contexto ) {
            reqDomain.contexto.release();
            reqDomain.contexto = null;
            reqDomain.id = null;
            //reqDomain.dispose();
        }
    });


    reqDomain.on('error', function (er) {
        try {
            if(reqDomain.contexto )
                reqDomain.contexto.release();

        } catch (er) {
            console.error('Error sending 500', er, req.url);
        }

        console.log('relancando o erro...')

        //throw er;
        next(er);
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

module.exports = Contexto;
module.exports.domainMiddleware = domainMiddleware;
module.exports.middlewareOnError = middlewareOnError;



