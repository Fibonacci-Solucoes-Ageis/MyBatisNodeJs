var uuid = require('node-uuid');
var domain = require('domain');


function Contexto() {
    this.callbacks = [];
    this.id = uuid.v4();
}

Contexto.prototype = {

    carregou :function(connection){
        this.conexao = connection ;
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
        if(this.conexao){

            this.conexao.release();
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
    });


    res.on('finish', function () {
        if( reqDomain.contexto ) {
            reqDomain.contexto.release();
            reqDomain.contexto = null;
            reqDomain.id = null;
            //reqDomain.dispose();
        }
    });


    reqDomain.on('error', function (er) {
        try {
            //  console.error('Error', er, req.url);
            // console.error('Error', er.stack);
            if(req.xhr){
                res.json({sucesso:false,mensagem:'Ops! alguma coisa saiu errada.'});
            } else {
                res.writeHead(500);
                res.send('Ops! alguma coisa saiu errada.');
            }

        } catch (er) {
            console.error('Error sending 500', er, req.url);
        }

        throw er;
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



