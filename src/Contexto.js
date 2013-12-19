var uuid = require('node-uuid');


function Contexto() {
    this.callbacks = [];
    this.id = uuid.v4();
}

Contexto.prototype = {

    carregou :function(connection){
        this.conexao = connection ;
        this.carregando = false;
        for(var i=0; i< this.callbacks.length; i++) {
            console.log('notificando callback: ' + this.conexao);
            this.callbacks[i](this.conexao);
        }
    },

    obtenhaConexao: function(callback){
        var me = this;

        if(this.conexao) {
            console.log('retornando conexao existente: ' + this.conexao);
            return callback(this.conexao);
        }

        this.callbacks.push(callback);

        if( this.carregando ==true) return;


        this.carregando = true;
        pool.getConnection(function (err, connection) {
            console.log('gerando conexao: ' + connection);
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

        this.conexao.commit(function(err) {
            if (err) {

                me.conexao.rollback(function() {
                    if(callback) callback(false);
                });
            }
            if(callback) callback(true);

        });
    },

    roolback:function(){
        if(!this.conexao) return

        this.conexao.rollback(function() {

        });
    }

}

module.exports = Contexto;

