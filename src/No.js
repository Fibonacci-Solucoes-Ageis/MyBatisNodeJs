var dir_xml = '',
    separador = ':::';

function Pedaco() {
    this.tipo = '';
    this.pedaco = '';
    this.pai = null;
    this.prefixo = '';
}

function Caminho() {
    this.pedacos = [];
}

Caminho.prototype.adicione = function(pedaco, tipo, noResultMap, ehColecao, prefixo) {
    var objPedaco = new Pedaco();
    objPedaco.pedaco = pedaco;
    objPedaco.tipo = tipo;
    objPedaco.noResultMap = noResultMap;
    objPedaco.ehColecao = ehColecao;
    objPedaco.prefixo = prefixo;

    if( this.pedacos.length > 0 ) {
        objPedaco.pai = this.pedacos[this.pedacos.length - 1];
    }

    this.pedacos.push(objPedaco);

    objPedaco.caminhoInteiro = this.pedacos.map( (item) => {
        return item.pedaco
    }).join(".");
}

Caminho.prototype.cloneCaminho = function() {
    var outro = new Caminho();

    for( var i = 0; i < this.pedacos.length; i++ ) {
        var pedaco = this.pedacos[i];

        outro.pedacos.push(pedaco);
    }

    return outro;
}

Caminho.prototype.obtenhaQtde = function() {
    return this.pedacos.length;
}

Caminho.prototype.obtenha = function(indice) {
    return this.pedacos[indice];
}

Caminho.prototype.toString = function() {
    if( this.pedacos.length > 0 ) {
        return this.pedacos[this.pedacos.length - 1].caminhoInteiro;
    }
    return '';
}

function Colecao() {
    this.mapaColecao = {}
    this.lista = []
    this.tipo = null;
}

Colecao.prototype.adicione = function(chaveColecao, instancia, registro, noResultMap, prefixo) {
    var objetoColecao = this.mapaColecao[chaveColecao];

    if( !objetoColecao ) {
        if( !instancia ) {
            const nomeModel = noResultMap.obtenhaNomeModel(registro, prefixo);
            var modelColecao = global.sessionFactory.models[nomeModel][nomeModel];

            if (global.es7) {
                instancia = new modelColecao();
            } else {
                instancia = Object.create(modelColecao.prototype);
                instancia.constructor.apply(instancia, []);
            }
        }

        this.mapaColecao[chaveColecao] = instancia;

        this.lista.push(instancia);
    }

    return instancia;
}

function chequeErros(chave, mapColunas, erros, noResultMap, novoCaminho) {
    if (mapColunas[chave] && mapColunas[chave].length > 0) {
        erros.qtde ++;
        erros.erros.push('erro: ');
        if( global.exibirWarnings ) {
            console.warn('-------------------------------------------------');
            console.warn('\tWarning: ' + erros.resultMap);
            console.warn('\t' + (erros.erros.length) + '. Erro ' + erros.qtde);
            console.warn('\t' + novoCaminho.toString() + " <-> " + mapColunas[chave][0].caminhoInteiro);
            console.warn("\tColuna " + chave + ' já está associada. ResultMap: ' + noResultMap.obtenhaNomeCompleto());
        }
    } else {
        mapColunas[chave] = [];
    }
}

function monteMapColunas(gerenciadorDeMapamentos, mapResultMaps, caminho, noResultMap, noPai, mapColunas, objCaminho, prefixoInteiro, erros) {
    var noCorrente = noPai ? noPai.noPai : null;
    while(noCorrente != null) {
        var nomeResultMap = noResultMap.obtenhaNomeCompleto();
        if( noCorrente.prop.resultMap === nomeResultMap ) {
            return;
        }

        noCorrente = noCorrente.noPai;
    }

    for( var i = 0; i < noResultMap.propriedadesId.length; i++ ) {
        var noPropriedade = noResultMap.propriedadesId[i];

        var novoCaminho = objCaminho.cloneCaminho();

        var prefixoPropriedade = prefixoInteiro + (noPropriedade.prefixo ? noPropriedade.prefixo : '');

        novoCaminho.adicione(noPropriedade.nome, null, noResultMap, false, (noPropriedade.prefixo ? noPropriedade.prefixo : ''));

        var propColuna = {
            caminho: stringToPath(caminho + noPropriedade.nome),
            caminhoInteiro: caminho + noPropriedade.nome,
            prop: noPropriedade,
            noPai: noPai,
            novoCaminho: novoCaminho
        };

        var chave = prefixoPropriedade + noPropriedade.coluna;

        if( noPropriedade.coluna ) {
            chequeErros(chave, mapColunas, erros, noResultMap, novoCaminho);

            mapColunas[chave].push(propColuna);
        }
    }

    for( var i = 0; i < noResultMap.propriedades.length; i++ ) {
        var noPropriedade = noResultMap.propriedades[i];

        var novoCaminho = objCaminho.cloneCaminho();

        var prefixoPropriedade = prefixoInteiro + (noPropriedade.prefixo ? noPropriedade.prefixo : '');

        var propColuna = {
            caminho: stringToPath(caminho + noPropriedade.nome),
            caminhoInteiro: caminho + noPropriedade.nome,
            prop: noPropriedade,
            noPai: noPai,
            novoCaminho: novoCaminho
        };

        var chave = prefixoPropriedade + noPropriedade.coluna;

        if( noPropriedade instanceof NoAssociacao ) {
            const noAssociacao = gerenciadorDeMapamentos.obtenhaResultMap(noPropriedade.resultMap);

            novoCaminho.adicione(noPropriedade.nome, noAssociacao.tipo, noAssociacao,false, (noPropriedade.prefixo ? noPropriedade.prefixo : ''));
            monteMapColunas( gerenciadorDeMapamentos, mapResultMaps,caminho + noPropriedade.nome + ".", noAssociacao, propColuna, mapColunas, novoCaminho, prefixoPropriedade, erros);
        } else if( noPropriedade instanceof  NoPropriedadeColecao ) {
            const noCollection = gerenciadorDeMapamentos.obtenhaResultMap(noPropriedade.resultMap);

            novoCaminho.adicione(noPropriedade.nome, noCollection.tipo, noCollection,true, (noPropriedade.prefixo ? noPropriedade.prefixo : ''));
            monteMapColunas( gerenciadorDeMapamentos, mapResultMaps, caminho + noPropriedade.nome + ".", noCollection, propColuna, mapColunas, novoCaminho, prefixoPropriedade, erros);
        } else {
            novoCaminho.adicione(noPropriedade.nome, null, false);

            if( noPropriedade.coluna ) {
                chequeErros(chave, mapColunas, erros, noResultMap, novoCaminho);

                mapColunas[chave].push(propColuna);
            }
        }
    }
}

function stringToPath(path) {

    // If the path isn't a string, return it
    if (typeof path !== 'string') return path;

    return path.split('.');
}

function atribuaValor(path, obj, val, fnProximo) {
    if( val == null ) {
        return;
    }
    // Cache the path length and current spot in the object
    var length = path.obtenhaQtde();
    var current = obj;

    var prefixo = '';

    // Loop through the path
    for( var index = 0; index < path.obtenhaQtde(); index++ ) {
        var pedaco = path.obtenha(index);

        // If this is the last item in the loop, assign the value
        if (index === length - 1 ) {
            if( current == null ) {
                current = fnCrieObjeto(current, pedaco);
            }

            current[pedaco.pedaco] = val;
        }

        // Otherwise, update the current place in the object
        else {
            prefixo += pedaco.prefixo;
            var proximoObjeto = fnProximo(current, path, pedaco, prefixo);

            if (proximoObjeto == null) {
                break;
            }
            // If the key doesn't exist, create it
            current = proximoObjeto;
        }
    }

    return current;
}

function camelToSnake(texto) {
    return texto.replace(/[\w]([A-Z])/g, function(m) {
        return m[0] + "_" + m[1];
    }).toLowerCase();
}

var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var fs = require('fs');
var path =  require('path');

var vm = require('vm');
var util = require('util');
var moment = require('moment');
var DOMParser = require('xmldom').DOMParser;
var Contexto = require('./Contexto');
const {active: dominio} = require("domain");

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.split(search).join(replacement);
};

function ComandoSql() {
    this.sql = '';
    this.parametros = [];
}

ComandoSql.prototype.adicioneParametro = function(valor) {
    this.parametros.push(valor);
}

var No = (function () {
    function No(id, mapeamento) {
        this.id = id;
        this.mapeamento = mapeamento;
        this.filhos = [];
        this.nomeCompleto = this.mapeamento.nome + "." + this.id;
    }

    No.prototype.adicione = function (no) {
        this.filhos.push(no);
    };

    No.prototype.imprima = function () {
        if (this.id)
            console.log(this.id);

        for (var i in this.filhos) {
            var noFilho = this.filhos[i];

            noFilho.imprima();
        }
    };

    No.prototype.obtenhaSql = function (comandoSql, dados) {
        for (var i in this.filhos) {
            var noFilho = this.filhos[i];

            noFilho.obtenhaSql(comandoSql, dados);
        }

        return comandoSql;
    };

    No.prototype.getValue = function (data, path) {
        var i, len = path.length;

        for (i = 0; typeof data === 'object' && i < len; ++i) {
            if( data )
                data = data[path[i]];
        }
        return data;
    };

    No.prototype.obtenhaNomeCompleto = function () {
        return this.nomeCompleto;
    };

    No.prototype.processeExpressao = function (texto, comandoSql, dados) {
        var myArray;
        var regex = new RegExp('#\{([a-z.A-Z0-9_]+)}', 'ig');
        var expressao = texto;

        while ((myArray = regex.exec(texto)) !== null) {
            var trecho = myArray[0];
            var valorPropriedade = this.getValue(dados, myArray[1].split('.'));

            // console.log(trecho + " -> " + valorPropriedade);
            if (valorPropriedade == null) {
                expressao = expressao.replace(trecho, '?');
                comandoSql.adicioneParametro(null);
            } else if (typeof valorPropriedade == "number") {
                expressao = expressao.replace(trecho, '?');
                comandoSql.adicioneParametro(valorPropriedade);
            } else if (typeof valorPropriedade == 'string') {
                expressao = expressao.replace(trecho, '?');
                comandoSql.adicioneParametro(valorPropriedade);
            } else if (typeof valorPropriedade == 'boolean') {
                expressao = expressao.replace(trecho, '?');
                comandoSql.adicioneParametro(valorPropriedade);
            } else if (util.isDate(valorPropriedade)) {
                var valor = moment(valorPropriedade).format('YYYY-MM-DD HH:mm:ss');

                // console.log(valor);
                expressao = expressao.replace(trecho, '?');

                comandoSql.adicioneParametro(valor);
            } else if (util.isArray(valorPropriedade)) {
                throw new Error("Não pode traduzir trecho " + trecho + " pela coleção: " + valorPropriedade);
            }
        }

        return expressao;
    };
    return No;
})();
exports.No = No;

var NoSelect = (function (_super) {
    __extends(NoSelect, _super);
    function NoSelect(id, resultMap, javaType, mapeamento, valorPrefixo) {
        _super.call(this, id, mapeamento);

        this.resultMap = resultMap;
        this.javaType = javaType;
        this.prefixo = valorPrefixo;
    }
    return NoSelect;
})(No);
exports.NoSelect = NoSelect;

var NoString = (function (_super) {
    __extends(NoString, _super);
    function NoString(texto, mapeamento) {
        _super.call(this, '', mapeamento);
        this.texto = texto.trim();
    }
    NoString.prototype.imprima = function () {
        console.log(this.texto);
    };

    NoString.prototype.obtenhaSql = function (comandoSql, dados) {
        comandoSql.sql += _super.prototype.processeExpressao.call(this, this.texto, comandoSql, dados) + " ";
    };
    return NoString;
})(No);
exports.NoString = NoString;

var NoChoose = (function (_super) {
    __extends(NoChoose, _super);
    function NoChoose(mapeamento) {
        _super.call(this, '', mapeamento);
    }
    NoChoose.prototype.adicione = function (no) {
        _super.prototype.adicione.call(this, no);

        if (no instanceof NoOtherwise) {
            this.noOtherwise = no;
        }
    };

    NoChoose.prototype.obtenhaSql = function (comandoSql, dados) {
        for (var i in this.filhos) {
            var no = this.filhos[i];

            if (no instanceof NoWhen) {
                var noWhen = no;

                var expressao = noWhen.expressaoTeste.replace('#{', "dados.").replace("}", "");

                try  {
                    eval('if( ' + expressao + ' ) dados.valorExpressao = true; else dados.valorExpressao = false;');
                } catch (err) {
                    dados.valorExpressao = false;
                }

                if (dados.valorExpressao) {
                    return noWhen.obtenhaSql(comandoSql, dados);
                }
            }
        }

        if (this.noOtherwise) {
            return this.noOtherwise.obtenhaSql(comandoSql, dados);
        }

        return '';
    };
    return NoChoose;
})(No);
exports.NoChoose = NoChoose;

var NoWhen = (function (_super) {
    __extends(NoWhen, _super);
    function NoWhen(expressaoTeste, texto, mapeamento) {
        _super.call(this, '', mapeamento);
        this.expressaoTeste = expressaoTeste;
        this.texto = texto;

        var regex = new RegExp('[_a-zA-Z][_a-zA-Z0-9]{0,30}', 'ig');
        var identificadores = [];
        while ((myArray = regex.exec(expressaoTeste)) !== null) {
            var identificador = myArray[0];

            if( identificador == 'null' || identificador == 'true' || identificador == 'false' || identificador == 'and' ) continue;

            identificadores.push(identificador);
        }

        for( var i = 0; i < identificadores.length; i++ ) {
            var identificador = identificadores[i];

            this.expressaoTeste = this.expressaoTeste.replace(identificador, "dados." + identificador);
        }

        this.expressaoTeste = this.expressaoTeste.replaceAll('and', '&&').toString();
    }

    NoWhen.prototype.imprima = function () {
        console.log('when(' + this.expressaoTeste + '): ' + this.texto);
    };

    return NoWhen;
})(No);
exports.NoWhen = NoWhen;

var NoForEach = (function (_super) {
    __extends(NoForEach, _super);
    function NoForEach(item, index, separador, abertura, fechamento, texto, collection, mapeamento) {
        _super.call(this, '', mapeamento);

        this.item = item;
        this.index = index;
        this.separador = separador;
        this.abertura = abertura;
        this.fechamento = fechamento;
        this.collection = collection;
        this.texto = texto.trim();
    }
    NoForEach.prototype.obtenhaSql = function (comandoSql, dados) {
        var texto = [];

        var colecao = dados[this.collection];

        if (colecao == null) {
            if (util.isArray(dados)) {
                colecao = dados;
            } else {
                return this.abertura + this.fechamento;
            }
        }

        for (var i = 0; i < colecao.length; i++) {
            var item = colecao[i];

            var myArray;
            var regex = new RegExp('#\{([a-z.A-Z]+)}', 'ig');

            var expressao = this.texto;

            var novaExpressao = expressao;
            while ((myArray = regex.exec(expressao)) !== null) {
                var trecho = myArray[0];
                var propriedade = myArray[1].replace(this.item + ".", '');
                var valorPropriedade = this.getValue(item, propriedade.split("."));

                if (typeof valorPropriedade == "number") {
                    novaExpressao = novaExpressao.replace(trecho, '?');
                    comandoSql.adicioneParametro(valorPropriedade);
                } else if (typeof valorPropriedade == 'string') {
                    novaExpressao = novaExpressao.replace(trecho, '?');
                    comandoSql.adicioneParametro(valorPropriedade);
                } else if (typeof valorPropriedade == 'boolean') {
                    novaExpressao = novaExpressao.replace(trecho, '?');
                    comandoSql.adicioneParametro(valorPropriedade);
                }  else if (util.isDate(valorPropriedade)) {
                    var valor = moment(valorPropriedade).format('YYYY-MM-DD HH:mm:ss');

                    // console.log(valor);
                    expressao = expressao.replace(trecho, '?');

                    comandoSql.adicioneParametro(valor);
                } else {
                    novaExpressao = novaExpressao.replace(trecho, '?');
                    comandoSql.adicioneParametro(null);
                }
            }

            texto.push(novaExpressao);
        }

        var sql = this.abertura + texto.join(this.separador) + this.fechamento;

        comandoSql.sql += sql;

        return comandoSql;
    };
    return NoForEach;
})(No);
exports.NoForEach = NoForEach;

var NoIf = (function (_super) {
    __extends(NoIf, _super);
    function NoIf(expressaoTeste, texto, mapeamento) {
        _super.call(this, '', mapeamento);
        this.expressaoTeste = expressaoTeste;
        this.texto = texto;

        var regex = new RegExp('[_a-zA-Z][_a-zA-Z0-9]{0,30}', 'ig');
        var identificadores = [];
        while ((myArray = regex.exec(expressaoTeste)) !== null) {
            var identificador = myArray[0];

            if( identificador == 'null' ) continue;

            identificadores.push(identificador);
        }

        for( var i = 0; i < identificadores.length; i++ ) {
            var identificador = identificadores[i];

            this.expressaoTeste = this.expressaoTeste.replace(identificador, "dados." + identificador);
        }
    }
    NoIf.prototype.imprima = function () {
        console.log('if(' + this.expressaoTeste + '): ' + this.texto);
    };

    NoIf.prototype.obtenhaSql = function(comandoSql, dados) {
        var expressao = this.expressaoTeste.replace('#{', "dados.").replace("}", "");

        try  {
            eval('if( ' + expressao + ' ) dados.valorExpressao = true; else dados.valorExpressao = false;');
        } catch (err) {
            dados.valorExpressao = false;
        }

        if (dados.valorExpressao == false) {
            return '';
        }

        //console.log(this.texto);
        //comandoSql.sql += _super.prototype.processeExpressao.call(this, this.texto, comandoSql, dados) + " ";
        _super.prototype.obtenhaSql.call(this, comandoSql, dados) + " ";
    };
    return NoIf;
})(No);
exports.NoIf = NoIf;

var NoOtherwise = (function (_super) {
    __extends(NoOtherwise, _super);
    function NoOtherwise(texto, mapeamento) {
        _super.call(this, '', mapeamento);

        this.texto = texto;
    }
    NoOtherwise.prototype.imprima = function () {
        console.log('otherwise(' + this.texto + ')');
    };

    NoOtherwise.prototype.obtenhaSql = function (comandoSql, dados) {
        var myArray;
        var regex = new RegExp('#\{([a-z.A-Z]+)}', 'ig');

        var expressao = this.texto;

        while ((myArray = regex.exec(this.texto)) !== null) {
            var trecho = myArray[0];
            var valorPropriedade = this.getValue(dados, myArray[1].split('.'));

            if (typeof valorPropriedade == "number") {
                expressao = expressao.replace(trecho, '?');
                comandoSql.adicioneParametro(valorPropriedade);
            } else if (typeof valorPropriedade == 'string') {
                expressao = expressao.replace(trecho, '?');
                comandoSql.adicioneParametro(valorPropriedade);
            } else if (typeof valorPropriedade == 'boolean') {
                expressao = expressao.replace(trecho, '?');
                comandoSql.adicioneParametro(valorPropriedade);
            } else if (util.isDate(valorPropriedade)) {
                var valor = moment(valorPropriedade).format('YYYY-MM-DD HH:mm:ss');

                // console.log(valor);
                expressao = expressao.replace(trecho, '?');

                comandoSql.adicioneParametro(valor);
            }
        }

        comandoSql.sql += expressao + " ";
    };

    return NoOtherwise;
})(No);
exports.NoOtherwise = NoOtherwise;

var NoPropriedade = (function () {
    function NoPropriedade(nome, coluna,prefixo) {
        this.nome = nome;
        this.coluna = coluna;
        this.prefixo = prefixo;
    }
    NoPropriedade.prototype.imprima = function () {
        console.log(this.nome + " -> " + this.obtenhaColuna());
    };

    NoPropriedade.prototype.obtenhaColuna = function(prefixo){
        return prefixo ? prefixo + this.coluna : this.coluna;
    }
    NoPropriedade.prototype.crieObjeto = function (gerenciadorDeMapeamentos, cacheDeObjetos, objeto, registro, chavePai) {
        return null;
    };
    return NoPropriedade;
})();
exports.NoPropriedade = NoPropriedade;


var NoPropriedadeId = (function (_super) {
    __extends(NoPropriedadeId, _super);
    function NoPropriedadeId(nome, coluna) {
        _super.call(this, nome, coluna);
    }

    return NoPropriedadeId;
})(NoPropriedade);
exports.NoPropriedadeId = NoPropriedadeId;

var NoAssociacao = (function (_super) {
    __extends(NoAssociacao, _super);
    function NoAssociacao(nome, coluna, columnPrefix,resultMap) {
        _super.call(this, nome, coluna,columnPrefix);

        this.resultMap = resultMap;
    }
    NoAssociacao.prototype.imprima = function () {
        console.log('associacao(' + this.nome + separador + this.obtenhaColuna(this.prefixo) + " -> " + this.resultMap);
    };

    NoAssociacao.prototype.obtenhaNomeCompleto = function() {
        if( this.resultMap.indexOf(".") == -1 ) {
            return this.nome + "." + this.resultMap;
        }

        return this.resultMap;
    }

    NoAssociacao.prototype.crieObjeto = function (gerenciadorDeMapeamentos, cacheDeObjetos, ancestorCache, objeto, registro, chavePai,prefixo) {
        var no = gerenciadorDeMapeamentos.obtenhaResultMap(this.resultMap);

        if(!no) throw  new Error('Nenhum nó com nome foi encontrado: ' + this.resultMap);

        var chaveObjeto = no.obtenhaChave(registro, chavePai,(this.prefixo || prefixo));
        var chaveCombinada = no.obtenhaChaveCombinada(chavePai, chaveObjeto);

        var objetoConhecido = cacheDeObjetos[chaveCombinada] != null;

        var objetoColecao = no.crieObjeto(gerenciadorDeMapeamentos, cacheDeObjetos, ancestorCache, registro, chavePai,(this.prefixo || prefixo));

        if (objetoColecao == null || objetoConhecido == true)
            return;

        objeto[this.nome] = objetoColecao;


    };
    return NoAssociacao;
})(NoPropriedade);
exports.NoAssociacao = NoAssociacao;

var NoPropriedadeColecao = (function (_super) {
    __extends(NoPropriedadeColecao, _super);

    function NoPropriedadeColecao(nome, coluna,prefixo, resultMap, ofType, tipoJava) {
        _super.call(this, nome, coluna,prefixo);

        this.resultMap = resultMap;

        this.ofType = ofType;
        this.tipoJava = tipoJava;
    }

    NoPropriedadeColecao.prototype.imprima = function () {
        console.log('colecao(' + this.nome + separador + this.coluna + " -> " + this.resultMap);
    };

    NoPropriedadeColecao.prototype.crieObjeto = function (gerenciadorDeMapeamentos, cacheDeObjetos, ancestorCache, objeto, registro, chavePai,prefixo) {
        var no = gerenciadorDeMapeamentos.obtenhaResultMap(this.resultMap);

        var chaveObjeto = no.obtenhaChave(registro, chavePai,(this.prefixo || prefixo));
        var chaveCombinada = chavePai + separador + chaveObjeto;

        var objetoConhecido = cacheDeObjetos[chaveCombinada] != null;

        var objetoColecao = no.crieObjeto(gerenciadorDeMapeamentos, cacheDeObjetos, ancestorCache, registro, chavePai,(this.prefixo || prefixo));

        if (objeto[this.nome] == null)
            objeto[this.nome] = [];


        if (objetoColecao == null || objetoConhecido == true)
            return;

        objeto[this.nome].push(objetoColecao);
    };

    return NoPropriedadeColecao;

})(NoPropriedade);
exports.NoPropriedadeColecao = NoPropriedadeColecao;

var NoResultMap = (function (_super) {
    __extends(NoResultMap, _super);
    function NoResultMap(id, tipo, mapeamento) {
        _super.call(this, id, mapeamento);
        this.tipo = tipo;
        this.propriedades = [];
        this.propriedadesId = [];
        this.mapColunas = {};
    }
    NoResultMap.prototype.definaPropriedadeId = function (propriedadeId) {
        this.propriedadesId.push(propriedadeId);
    };

    NoResultMap.prototype.encontrePropriedadeId = function () {
        var propriedade = null;
        var i;
        var encontrou = false;
        for (i = 0; i < this.propriedades.length; i++) {
            propriedade = this.propriedades[i];

            if (propriedade.nome == 'id') {
                encontrou = true;
                break;
            }
        }

        if(!encontrou) {
            //console.log("Sem propriedade id: " + this.id);
            return;
        }

        this.definaPropriedadeId(new NoPropriedadeId(propriedade.nome, propriedade.obtenhaColuna()));
        this.propriedades.splice(i, 1);
    };

    NoResultMap.prototype.definaDiscriminator = function (noDiscriminador) {
        this.noDiscriminador = noDiscriminador;
    };

    NoResultMap.prototype.adicione = function (propriedade) {
        this.propriedades.push(propriedade);

        if( propriedade.coluna == '' ) {
            return;
        }

        this.mapColunas[propriedade.coluna] = propriedade;
    };

    NoResultMap.prototype.imprima = function () {
        for (var i in this.propriedadesId) {
            var propId = this.propriedadesId[i];

            propId.imprima();
        }

        for (var i in this.propriedades) {
            var propriedade = this.propriedades[i];

            propriedade.imprima();
        }

        if (this.noDiscriminador)
            this.noDiscriminador.imprima();
    };

    NoResultMap.prototype.obtenhaChaveCombinada = function(chavePai, chave) {
        var chaveCombinada = chave;

        if( chavePai ) {
            chaveCombinada = chavePai + separador + chave;
        }

        return chaveCombinada;
    }

    NoResultMap.prototype.obtenhaID = function (registro, prefixo) {
        var pedacoObjeto = '';

        for (var i = 0; i < this.propriedadesId.length; i++) {
            var propriedade = this.propriedadesId[i];

            var valor = registro[propriedade.obtenhaColuna(prefixo)];
            if (valor) {
                pedacoObjeto += valor;
            }
        }

        var valor = pedacoObjeto;

        /*
        for (var i = 0 in this.propriedadesId) {
          var propriedade = this.propriedadesId[i];

          var valor = registro[propriedade.obtenhaColuna(prefixo)];

          if (valor != null) {
            pedacoObjeto += valor;
          } else {
            //throw new Error("Chave do objeto não pode ser calculada. \nColuna '" + propriedade.coluna + "' não encontrada para o resultMap '" + this.id + "'");
          }
        }

        if (pedacoObjeto == '') {
          return null;
        }
    */
        return valor;

        //return pedacoObjeto;
    };

    NoResultMap.prototype.obtenhaChave = function (registro, chavePai,prefixo) {
        var chave = this.obtenhaNomeCompleto() + separador;

        var pedacoObjeto = '';

        for (var i in this.propriedadesId) {
            var propriedade = this.propriedadesId[i];

            var valor = registro[propriedade.obtenhaColuna(prefixo)];

            if (valor != null) {
                pedacoObjeto += valor;
            } else {
                //throw new Error("Chave do objeto não pode ser calculada. \nColuna '" + propriedade.coluna + "' não encontrada para o resultMap '" + this.id + "'");
            }
        }

        if (pedacoObjeto == '') {
            return null;
        }

        chave += pedacoObjeto;

        return chave;
    };

    NoResultMap.prototype.crieObjetos2 = function(gerenciadorDeMapeamentos, registros) {
        let objetos = [];

        var mapaObjetos = {};
        var mapaColecoes = {};
        var listaDeColecoes = [];


        for( var i = 0; i < registros.length; i++ ) {
            let registro = registros[i];

            var nomeModel = this.obtenhaNomeModel(registro, '');

            var model = gerenciadorDeMapeamentos.obtenhaModel(nomeModel);

            model = model[nomeModel];

            var chavePrincipal = this.tipo + this.obtenhaID(registro, '');

            const objetoNaCache = mapaObjetos[chavePrincipal];

            var instancia = null;
            if( objetoNaCache ) {
                instancia = objetoNaCache;
            } else {
                if (global.es7) {
                    instancia = new model();
                } else {
                    instancia = Object.create(model.prototype);
                    instancia.constructor.apply(instancia, []);
                }
                objetos.push(instancia);
                mapaObjetos[chavePrincipal] = instancia;
            }

            for( const prop in registro) {
                var listaDeColunas = this.map2Colunas[prop];

                if( listaDeColunas == null ) {
                    continue;
                }

                for( var indice = 0; indice < listaDeColunas.length; indice ++ ) {
                    var propColuna = listaDeColunas[indice];

                    var valor = registro[prop];

                    if (valor instanceof Buffer) {
                        if (valor.length == 1) {
                            if (valor[0] == 0) {
                                valor = false;
                            } else {
                                valor = true;
                            }
                        }
                    }

                    atribuaValor(propColuna.novoCaminho, instancia, valor, (val, caminho, pedaco, prefixo) => {
                        if( pedaco.ehColecao ) {
                            var chave = '$$' + pedaco.pedaco;
                            var colecao = val[chave];

                            if( colecao == null ) {
                                colecao = new Colecao();
                                colecao.tipo = pedaco.tipo;
                                colecao.objeto = val;
                                colecao.propriedade = chave;

                                listaDeColecoes.push(colecao);

                                val[pedaco.pedaco] = colecao.lista;
                                val[chave] = colecao;
                            }

                            var chave = pedaco.noResultMap.obtenhaID(registro, prefixo);

                            if( chave === '') {
                                return null;
                            }

                            var chaveObjeto = pedaco.noResultMap.obtenhaNomeCompleto() + "::" + chave;
                            var objetoNaCache = mapaObjetos[chaveObjeto];

                            if( objetoNaCache ) {
                                return objetoNaCache;
                            }

                            var temNaCache = objetoNaCache != null;
                            objetoNaCache = colecao.adicione(chave, objetoNaCache, registro, pedaco.noResultMap, prefixo);

                            if( !temNaCache ) {
                                mapaObjetos[chaveObjeto] = objetoNaCache;
                            }

                            pedaco.noResultMap.atribuaPropriedadesId(objetoNaCache, registro, prefixo);

                            return objetoNaCache;
                        } else {
                            var objeto = val[pedaco.pedaco];

                            if( objeto == null ) {
                                const nomeModel = pedaco.noResultMap.obtenhaNomeModel(registro, prefixo);
                                const model = global.sessionFactory.models[nomeModel][nomeModel];


                                if (global.es7) {
                                    objeto = new model();
                                } else {
                                    objeto = Object.create(model.prototype);
                                    objeto.constructor.apply(objeto, []);
                                }

                                val[pedaco.pedaco] = objeto;
                            }

                            return objeto;
                        }

                        return val;
                    });
                }
            }
        }

        for( var i = 0; i < listaDeColecoes.length; i++ ) {
            var colecao = listaDeColecoes[i];

            delete colecao.objeto[colecao.propriedade]
        }

        return objetos;
    }

    NoResultMap.prototype.crieObjeto2 = function(gerenciadorDeMapeamentos, registro, mapaObjetos, mapaColecoes, listaDeColecoes) {
        var nomeModel = this.obtenhaNomeModel(registro, '');

        var model = gerenciadorDeMapeamentos.obtenhaModel(nomeModel);

        model = model[nomeModel];

        var chavePrincipal = this.tipo + this.obtenhaID(registro, '');

        const objetoNaCache = mapaObjetos[chavePrincipal];

        var instancia = null;
        var existia = false;
        if( objetoNaCache ) {
            instancia = objetoNaCache;
            existia = true;
        } else {
            if (global.es7) {
                instancia = new model();
            } else {
                instancia = Object.create(model.prototype);
                instancia.constructor.apply(instancia, []);
            }
            //objetos.push(instancia);
            mapaObjetos[chavePrincipal] = instancia;
        }

        for( const prop in registro) {
            var listaDeColunas = this.map2Colunas[prop];

            if( listaDeColunas == null ) {
                continue;
            }

            for( var indice = 0; indice < listaDeColunas.length; indice ++ ) {
                var propColuna = listaDeColunas[indice];

                var valor = registro[prop];

                if (valor instanceof Buffer) {
                    if (valor.length == 1) {
                        if (valor[0] == 0) {
                            valor = false;
                        } else {
                            valor = true;
                        }
                    }
                }

                atribuaValor(propColuna.novoCaminho, instancia, valor, (val, caminho, pedaco, prefixo) => {
                    if( pedaco.ehColecao ) {

                        var chave = '$$' + pedaco.pedaco;

                        var colecao = val[chave];


                        if( colecao == null ) {
                            colecao = new Colecao();
                            colecao.tipo = pedaco.tipo;
                            colecao.objeto = val;
                            colecao.propriedade = chave;

                            listaDeColecoes.push(colecao);

                            val[pedaco.pedaco] = colecao.lista;
                            val[chave] = colecao;
                        }


                        var chave = pedaco.noResultMap.obtenhaID(registro, prefixo);

                        if( chave === '') {
                            return null;
                        }
                        var chaveObjeto = pedaco.noResultMap.nomeCompleto + "::" + chave;
                        var objetoNaCache = mapaObjetos[chaveObjeto];

                        if( objetoNaCache ) {
                            return objetoNaCache;
                        }

                        var temNaCache = objetoNaCache != null;
                        objetoNaCache = colecao.adicione(chave, objetoNaCache, registro, pedaco.noResultMap, prefixo);


                        if( !temNaCache ) {
                            mapaObjetos[chaveObjeto] = objetoNaCache;
                        }

                        pedaco.noResultMap.atribuaPropriedadesId(objetoNaCache, registro, prefixo);
                        return objetoNaCache;
                    } else {
                        var objeto = val[pedaco.pedaco];

                        if( objeto == null ) {
                            const nomeModel = pedaco.noResultMap.obtenhaNomeModel(registro, prefixo);
                            const model = global.sessionFactory.models[nomeModel][nomeModel];


                            if (global.es7) {
                                objeto = new model();
                            } else {
                                objeto = Object.create(model.prototype);
                                objeto.constructor.apply(objeto, []);
                            }

                            val[pedaco.pedaco] = objeto;
                        }

                        return objeto;
                    }

                    return val;
                });
            }
        }

        return existia ? null : instancia;
    }

    NoResultMap.prototype.crieObjetos = function (gerenciadorDeMapeamentos, registros) {
        var objetos = [];
        var cacheDeObjetos = {};
        var ancestorCache = {};

        for (var i in registros) {
            var registro = registros[i];

            var chaveObjeto = this.obtenhaChave(registro, '');

            var objetoConhecido = cacheDeObjetos[chaveObjeto] != null;

            var objeto = this.crieObjeto(gerenciadorDeMapeamentos, cacheDeObjetos, ancestorCache, registro, '');

            if (!objetoConhecido && objeto) {
                objetos.push(objeto);
            } else {
            }
        }

        return objetos;
    };

    NoResultMap.prototype.crieObjeto = function (gerenciadorDeMapeamentos, cacheDeObjetos, ancestorCache, registro, chavePai,prefixo) {
        var chaveObjeto = this.obtenhaChave(registro, chavePai,prefixo);
        var chaveCombinada = this.obtenhaChaveCombinada(chavePai, chaveObjeto);

        if( chaveObjeto == null && this.propriedadesId.length != 0 ) {
            return null;
        }

        if( ancestorCache[chaveObjeto] != null ) {
            return ancestorCache[chaveObjeto];
        }
        if (cacheDeObjetos[chaveCombinada] != null) {
            var instance = cacheDeObjetos[chaveCombinada];

            ancestorCache[chaveObjeto] = instance;

            this.processeColecoes(gerenciadorDeMapeamentos, cacheDeObjetos, ancestorCache, instance, registro, chaveCombinada,prefixo);
            this.processeAssociacoes(gerenciadorDeMapeamentos, cacheDeObjetos, ancestorCache, instance, registro, chaveCombinada,prefixo);

            delete ancestorCache[chaveObjeto];
        } else {
            var nomeModel = this.obtenhaNomeModel(registro,prefixo),
                idChave = chaveObjeto && chaveObjeto.split(separador)[1];

            var model = gerenciadorDeMapeamentos.obtenhaModel(nomeModel);

            model = model[nomeModel];

            if (model == null) {
                throw new Error("Classe " + nomeModel + "." + nomeModel + " não encontrada");
            }

            var instance = null;

            if (global.es7) {
                instance = new model();
            } else {
                instance = Object.create(model.prototype);
                instance.constructor.apply(instance, []);
            }

            var encontrouValores = false;

            if(chaveObjeto)
                ancestorCache[chaveObjeto] = instance;

            encontrouValores = this.atribuaPropriedadesSimples(instance, registro,prefixo);

            if( chaveObjeto != null ) {
                encontrouValores = this.processeAssociacoes(gerenciadorDeMapeamentos, cacheDeObjetos, ancestorCache, instance, registro, chaveCombinada,prefixo) || encontrouValores;
            }

            if( chaveObjeto != null ) {
                encontrouValores = this.processeColecoes(gerenciadorDeMapeamentos, cacheDeObjetos, ancestorCache, instance, registro, chaveCombinada,prefixo) || encontrouValores;
            }

            delete ancestorCache[chaveObjeto];

            if( !encontrouValores || (idChave &&  instance.id && idChave != instance.id.toString())) {
                return null;
            }

            if (chaveCombinada && encontrouValores && instance.id != null && chaveCombinada.indexOf('null') < 0)
                cacheDeObjetos[chaveCombinada] = instance;

        }

        return instance;
    };

    NoResultMap.prototype.obtenhaNomeModel = function(registro,prefixo){
        var tipoNo;
        if(!this.noDiscriminador){
            tipoNo = this.tipo;
        } else {

            var valorTipo = registro[this.noDiscriminador.obtenhaColuna(prefixo)];

            for(var i in this.noDiscriminador.cases){
                if(this.noDiscriminador.cases[i].valor==valorTipo)
                    tipoNo = this.noDiscriminador.cases[i].tipo;
            }

            if(!tipoNo) tipoNo = this.tipo;
        }

        return   tipoNo.substring(tipoNo.lastIndexOf(".") + 1);
    };
    NoResultMap.prototype.processeAssociacoes = function (gerenciadorDeMapeamentos, cacheDeObjetos, ancestorCache, instance, registro, chaveObjeto,prefixo) {
        var encontrouValor = false;

        for (var i = 0; i < this.propriedades.length; i++) {
            var propriedade = this.propriedades[i];

            if( !(propriedade instanceof NoAssociacao)) {
                continue;
            }

            var objeto = propriedade.crieObjeto(gerenciadorDeMapeamentos, cacheDeObjetos, ancestorCache, instance, registro, chaveObjeto,prefixo);

            encontrouValor = encontrouValor || (objeto != null);
        }

        return encontrouValor;
    };
    NoResultMap.prototype.processeColecoes = function (gerenciadorDeMapeamentos, cacheDeObjetos, ancestorCache, instance, registro, chaveObjeto,prefixo) {
        var encontrouValor = false;

        for (var i = 0; i < this.propriedades.length; i++) {
            var propriedade = this.propriedades[i];

            if( !(propriedade instanceof NoPropriedadeColecao)) {
                continue;
            }

            var objeto = propriedade.crieObjeto(gerenciadorDeMapeamentos, cacheDeObjetos, ancestorCache, instance, registro, chaveObjeto,prefixo);

            encontrouValor = encontrouValor || (objeto != null);
        }

        return encontrouValor;
    };

    NoResultMap.prototype.atribuaPropriedadesId = function (instance,registro,prefixo) {
        for (var j = 0; j < this.propriedadesId.length; j++) {
            var propId = this.propriedadesId[j];

            var valor = registro[propId.obtenhaColuna(prefixo)];

            if (valor instanceof Buffer) {
                if (valor.length == 1) {
                    if (valor[0] == 0) {
                        valor = false;
                    } else {
                        valor = true;
                    }
                }
            }

            instance[propId.nome] = valor;

            if (valor)
                encontrouValores = true;
        }
    }

    NoResultMap.prototype.atribuaPropriedadesSimples = function (instance,registro,prefixo) {
        var encontrouValores = false;
        for (var j in this.propriedadesId) {
            var propId = this.propriedadesId[j];

            var valor = registro[propId.obtenhaColuna(prefixo)];

            if (valor instanceof Buffer) {
                if (valor.length == 1) {
                    if (valor[0] == 0) {
                        valor = false;
                    } else {
                        valor = true;
                    }
                }
            }

            instance[propId.nome] = valor;

            if (valor)
                encontrouValores = true;
        }

        for (var j in this.propriedades) {
            var propriedade = this.propriedades[j];

            if (propriedade instanceof NoPropriedadeColecao) {
                continue;
            } else if (propriedade instanceof NoAssociacao) {
                continue;
            }

            var valor = registro[propriedade.obtenhaColuna(prefixo)];

            if (valor instanceof Buffer) {
                if (valor.length == 1) {
                    if (valor[0] == 0) {
                        valor = false;
                    } else {
                        valor = true;
                    }
                }
            }

            instance[propriedade.nome] = valor;

            if (valor)
                encontrouValores = true;
        }

        return encontrouValores;
    };
    return NoResultMap;
})(No);
exports.NoResultMap = NoResultMap;

var NoDiscriminator = (function () {
    function NoDiscriminator(tipoJava, coluna) {
        this.tipoJava = tipoJava;
        this.coluna = coluna;

        this.cases = [];
    }
    NoDiscriminator.prototype.adicione = function (noCaseDiscriminator) {
        this.cases.push(noCaseDiscriminator);
    };

    NoDiscriminator.prototype.imprima = function () {
        console.log('discriminator(' + this.tipoJava + " " + this.coluna + ")");

        for (var i in this.cases) {
            var noCase = this.cases[i];

            noCase.imprima();
        }
    };

    NoDiscriminator.prototype.obtenhaColuna = function(prefixo){
        return prefixo ? prefixo + this.coluna : this.coluna;
    }

    return NoDiscriminator;
})();
exports.NoDiscriminator = NoDiscriminator;

var NoCaseDiscriminator = (function () {
    function NoCaseDiscriminator(valor, tipo) {
        this.valor = valor;
        this.tipo = tipo;
    }
    NoCaseDiscriminator.prototype.imprima = function () {
        console.log('\tcase(' + this.valor + " " + this.tipo + ")");
    };
    return NoCaseDiscriminator;
})();
exports.NoCaseDiscriminator = NoCaseDiscriminator;

var Principal = (function () {
    function Principal() {
    }
    Principal.prototype.leiaNoDiscriminator = function (noXml, noResultMap) {
        var noDiscriminator = new NoDiscriminator(noXml.getAttributeNode('javaType').value, noXml.getAttributeNode('column').value);

        for (var i = 0; i < noXml.childNodes.length; i++) {
            var no = noXml.childNodes[i];

            if (no.nodeName == 'case') {
                var valor = no.getAttributeNode('value').value;
                var tipo = no.getAttributeNode('resultType').value;

                var noCase = new NoCaseDiscriminator(valor, tipo);

                noDiscriminator.adicione(noCase);
            }
        }

        return noDiscriminator;
    };

    Principal.prototype.leiaAssociationProperty = function (no, noResultMap) {
        var atributoColuna = no.getAttributeNode('column');
        var valorColuna = '';

        if (atributoColuna)
            valorColuna = atributoColuna.value;

        var resultMap = no.getAttributeNode('resultMap').value;

        if( resultMap.indexOf(".") == -1 ) {
            resultMap = noResultMap.mapeamento.nome + "." + resultMap;
        }

        var columnPrefix = null;

        if(no.getAttributeNode('columnPrefix'))
            columnPrefix = no.getAttributeNode('columnPrefix').value;

        noResultMap.adicione(new NoAssociacao(no.getAttributeNode('property').value, valorColuna,columnPrefix, resultMap));
    };

    Principal.prototype.leiaCollectionProperty = function (no, noResultMap) {
        var valorResultMap = '';

        if (no.getAttributeNode('resultMap')) {
            valorResultMap = no.getAttributeNode('resultMap').value;
        }

        var valorOfType = '';

        if (no.getAttributeNode('ofType')) {
            valorOfType = no.getAttributeNode('ofType').value;
        }

        var valorColuna = '';
        if (no.getAttributeNode('column'))
            valorColuna = no.getAttributeNode('column').value;

        var valorTipoJava = '';
        if (no.getAttributeNode('javaType'))
            valorTipoJava = no.getAttributeNode('javaType').value;

        var columnPrefix = null;

        if(no.getAttributeNode('columnPrefix'))
            columnPrefix = no.getAttributeNode('columnPrefix').value;

        noResultMap.adicione(new NoPropriedadeColecao(no.getAttributeNode('property').value, valorColuna, columnPrefix,valorResultMap, valorOfType, valorTipoJava));
    };

    Principal.prototype.leiaResultProperty = function (no, noResultMap) {
        var tipo = '';

        noResultMap.adicione(new NoPropriedade(no.getAttributeNode('property').value, no.getAttributeNode('column').value));
    };

    Principal.prototype.leiaResultMap = function (nome, noXmlResultMap, mapeamento) {
        var nomeId = noXmlResultMap.getAttributeNode('id').value;
        var tipo = noXmlResultMap.getAttributeNode('type').value;

        var pedacos = tipo.split('.');
        tipo = pedacos[pedacos.length - 1];
        var noResultMap = new NoResultMap(nomeId, tipo, mapeamento);

        var possuiPropriedadeId = false;
        for (var i = 0; i < noXmlResultMap.childNodes.length; i++) {
            var no = noXmlResultMap.childNodes[i];

            if (no.nodeName == 'id') {
                var propriedadeId = new NoPropriedadeId(no.getAttributeNode('property').value, no.getAttributeNode('column').value);

                noResultMap.definaPropriedadeId(propriedadeId);
                possuiPropriedadeId = true;
            } else if (no.nodeName == 'result') {
                this.leiaResultProperty(no, noResultMap);
            } else if (no.nodeName == 'association') {
                this.leiaAssociationProperty(no, noResultMap);
            } else if (no.nodeName == 'collection') {
                this.leiaCollectionProperty(no, noResultMap);
            } else if (no.nodeName == 'discriminator') {
                var noDiscriminator = this.leiaNoDiscriminator(no, noResultMap);

                noResultMap.definaDiscriminator(noDiscriminator);
            }
        }

        if (!possuiPropriedadeId) {
            noResultMap.encontrePropriedadeId();
        }

        return noResultMap;
    };

    Principal.prototype.leia = function (nome, gchild, mapeamento) {
        if (gchild.nodeName == 'resultMap') {
            return this.leiaResultMap(nome, gchild, mapeamento);
        }

        var nomeId = gchild.getAttributeNode('id').value;

        var noComando;
        if (gchild.nodeName == 'select') {
            var noResultMap = gchild.getAttributeNode('resultMap');
            var valorResultMap = '';
            if (noResultMap)
                valorResultMap = noResultMap.value;

            var noPrefixo = gchild.getAttributeNode('prefix');
            var noJavaType = gchild.getAttributeNode('resultType');
            var valorJavaType = '';
            var valorPrefixo = false;
            if (noJavaType)
                valorJavaType = noJavaType.value;
            if( noPrefixo ) {
                valorPrefixo = noPrefixo.value;
            }

            noComando = new NoSelect(nomeId, valorResultMap, valorJavaType, mapeamento, valorPrefixo);
        } else {
            noComando = new No(nomeId, mapeamento);
        }

        for (var i = 0; i < gchild.childNodes.length; i++) {
            var no = gchild.childNodes[i];

            if (no.nodeName == 'choose') {
                this.leiaChoose('choose', no, noComando, mapeamento);
            } else if (no.nodeName == 'if') {
                this.leiaIf('choose', no, noComando, mapeamento);
            } else if (no.nodeName == 'foreach') {
                this.leiaForEach('foreach', no, noComando, mapeamento);
            } else {
                if (no.hasChildNodes() == false) {
                    var noString = new NoString(no.textContent, mapeamento);

                    noComando.adicione(noString);
                }
            }
        }

        return noComando;
    };

    Principal.prototype.leiaForEach = function (nome, no, noPrincipal, mapeamento) {
        var valorSeparador = '';
        if (no.getAttributeNode('separator')) {
            valorSeparador = no.getAttributeNode('separator').value;
        }

        var valorAbertura = '';
        if (no.getAttributeNode('open')) {
            valorAbertura = no.getAttributeNode('open').value;
        }

        var valorFechamento = '';
        if (no.getAttributeNode('close')) {
            valorFechamento = no.getAttributeNode('close').value;
        }

        var valorIndex = '';
        if (no.getAttributeNode('index')) {
            valorIndex = no.getAttributeNode('index').value;
        }

        var valorCollection = '';
        if (no.getAttributeNode('collection')) {
            valorCollection = no.getAttributeNode('collection').value;
        }

        var noForEach = new NoForEach(no.getAttributeNode('item').value, valorIndex, valorSeparador, valorAbertura,
            valorFechamento, no.textContent, valorCollection, mapeamento);

        noPrincipal.adicione(noForEach);
    };

    Principal.prototype.leiaIf = function (nome, no, noPrincipal, mapeamento) {
        var noIf = new NoIf(no.getAttributeNode('test').value, no.childNodes[0].toString(), mapeamento);

        for (var i = 0; i < no.childNodes.length; i++) {
            var noFilho = no.childNodes[i];

            if (noFilho.nodeName == 'choose') {
                this.leiaChoose('choose', noFilho, noIf, mapeamento);
            } else if (noFilho.nodeName == 'if') {
                this.leiaIf('choose', noFilho, noIf, mapeamento);
            } else if (noFilho.nodeName == 'foreach') {
                this.leiaForEach('foreach', noFilho, noIf, mapeamento);
            } else {
                if (noFilho.hasChildNodes() == false) {
                    var noString = new NoString(noFilho.textContent, mapeamento);

                    noIf.adicione(noString);
                }
            }
        }

        noPrincipal.adicione(noIf);
    };

    Principal.prototype.leiaChoose = function (nome, no, noPrincipal, mapeamento) {
        var noChoose = new NoChoose(mapeamento);

        for (var i = 0; i < no.childNodes.length; i++) {
            var filhos = no.childNodes;

            var noFilho = filhos[i];

            if (noFilho.nodeName == 'when') {
                noChoose.adicione(this.leiaNoWhen("when", noFilho, no, mapeamento));
            } else if (noFilho.nodeName == 'otherwise') {
                noChoose.adicione(new NoOtherwise(noFilho.childNodes[0].toString(), mapeamento));
            }
        }

        noPrincipal.adicione(noChoose);
    };

    Principal.prototype.leiaNoWhen = function(nome, no, noPricipal, mapeamento) {
        var expressaoTeste = no.getAttributeNode('test').value;

        var noWhen = new NoWhen(expressaoTeste, '', mapeamento);

        for (var i = 0; i < no.childNodes.length; i++) {
            var noFilho = no.childNodes[i];

            if (noFilho.nodeName == 'choose') {
                this.leiaChoose('choose', noFilho, noWhen, mapeamento);
            } else if (noFilho.nodeName == 'if') {
                this.leiaIf('choose', noFilho, noWhen, mapeamento);
            } else if (noFilho.nodeName == 'foreach') {
                this.leiaForEach('foreach', noFilho, noWhen, mapeamento);
            } else {
                if (noFilho.hasChildNodes() == false) {
                    var noString = new NoString(noFilho.textContent, mapeamento);

                    noWhen.adicione(noString);
                }
            }
        }

        return noWhen;
    }

    Principal.prototype.processe = function (dir_xml) {
        var mapaNos = {};

        var gerenciadorDeMapeamentos = new GerenciadorDeMapeamentos();

        var models = {};

        var walk = function(dir, done) {
            var results = [];
            var list = fs.readdirSync(dir) ;
            var pending = list.length;
            if (!pending) return done(null, results);
            list.forEach(function(file) {
                var arquivo = path.resolve(dir) + '/' + file;

                var stat = null;

                try {
                    stat = fs.statSync(arquivo);
                } catch(erro) {
                    arquivo = file;
                    stat = fs.statSync(arquivo);
                }

                if (stat && stat.isDirectory() && arquivo.indexOf('.svn') ==-1) {
                    walk(arquivo, function(err, res) {
                        results = results.concat(res);
                        if (!--pending) done(null, results);
                    });
                } else {
                    results.push(arquivo);
                    if (!--pending) done(null, results);
                }
            });
        };


        var ext =  global.domainExt || '.js',
            diretorioDominio = global.domainDir || './domain';

        walk(diretorioDominio,function(err, arquivos) {
            for (var i in arquivos) {
                var arquivo = arquivos[i];
                if( !arquivo.endsWith(ext) ) continue;

                var arquivoPath = arquivo;

                var nomeClasseDominio =  path.basename(arquivoPath).replace(ext,'');

                if(!fs.existsSync(arquivoPath)) throw new Error('Arquivo não encontrado:' + arquivoPath);

                var model = require(arquivoPath);

                gerenciadorDeMapeamentos.adicioneModel(nomeClasseDominio,model);
            }
        });

        var arquivos = fs.readdirSync(dir_xml);
        for (var i in arquivos) {
            var arquivo = arquivos[i];

            var mapeamento = this.processeArquivo(path.join(dir_xml, arquivo));

            gerenciadorDeMapeamentos.adicione(mapeamento);
        }

        var erros = {
            erros: [],
            qtde: 0
        };
        for( var i = 0; i < gerenciadorDeMapeamentos.resultMaps.length; i++ ) {
            var noResultMap = gerenciadorDeMapeamentos.resultMaps[i];

            const mapColunas = {};
            const mapResultMaps = {};

            erros.resultMap = noResultMap.nomeCompleto;
            erros.qtde = 0;

            monteMapColunas(gerenciadorDeMapeamentos, mapResultMaps, '', noResultMap, null, mapColunas, new Caminho(), '', erros);
            noResultMap.map2Colunas = mapColunas;
        }
        return gerenciadorDeMapeamentos;
    };


    Principal.prototype.processeArquivo = function (nomeArquivo) {
        if (fs.lstatSync(nomeArquivo).isDirectory())
            return null;

        var xml = fs.readFileSync(nomeArquivo).toString();

        var xmlDoc = new DOMParser().parseFromString(xml);

        if (xmlDoc.documentElement.nodeName != 'mapper') {
            return null;
        }

        var nos = xmlDoc.documentElement.childNodes;

        var mapeamento = new Mapeamento(xmlDoc.documentElement.getAttributeNode('namespace').value);
        for (var i = 0; i < nos.length; i++) {
            var noXml = nos[i];

            if(noXml.nodeName != '#text' && noXml.nodeName != '#comment') {
                var no = this.leia(noXml.nodeName, noXml, mapeamento);

                //no.imprima();
                mapeamento.adicione(no);
            }
        }

        return mapeamento;
    };
    return Principal;
})();
exports.Principal = Principal;

var GerenciadorDeMapeamentos = (function () {
    function GerenciadorDeMapeamentos() {
        this.mapeamentos = [];
        this.mapaMapeamentos = {};
        this.models = {};
        this.resultMaps = [];
    }
    GerenciadorDeMapeamentos.prototype.obtenhaModel = function (nome) {
        return this.models[nome];
    };

    GerenciadorDeMapeamentos.prototype.adicioneResultMap = function (resultMap) {
        this.resultMaps.push(resultMap);
    }

    GerenciadorDeMapeamentos.prototype.adicioneModel = function (nomeClasseDominio, classe) {
        if (this.models[nomeClasseDominio] != null)
            return;

        this.models[nomeClasseDominio] = classe;
    };

    GerenciadorDeMapeamentos.prototype.adicione = function (mapeamento) {
        if (mapeamento == null)
            return;

        this.mapaMapeamentos[mapeamento.nome] = mapeamento;

        this.mapeamentos.push(mapeamento);

        for( var i = 0; i < mapeamento.resultMaps.length; i++ ) {
            this.resultMaps.push(mapeamento.resultMaps[i]);
        }
    };

    GerenciadorDeMapeamentos.prototype.obtenhaResultMap = function (nomeCompletoResultMap) {
        var nomeNamespace = nomeCompletoResultMap.split(".")[0];
        var nomeResultMap = nomeCompletoResultMap.split(".")[1];

        var mapeamento = this.mapaMapeamentos[nomeNamespace];

        if (mapeamento == null) {
            throw new Error("Mapeamento " + nomeNamespace + " não encontrado");
        }

        var resultMap = mapeamento.obtenhaResultMap(nomeResultMap);

        return resultMap;

    };

    GerenciadorDeMapeamentos.prototype.obtenhaNo = function (nomeCompletoResultMap) {
        var nomeNamespace = nomeCompletoResultMap.split(".")[0];

        var idNo = nomeCompletoResultMap.split(".")[1];

        var mapeamento = this.mapaMapeamentos[nomeNamespace];

        return mapeamento.obtenhaNo(idNo);
    };

    GerenciadorDeMapeamentos.prototype.insiraGraph = function (nomeCompleto, objeto, callback, multicliente) {
        var colunas = [];
        var valores = [];
        var params = [];

        for( const prop in objeto) {
            //console.log(prop);
            const valor = objeto[prop];

            if( valor === undefined || valor === null ) {
                continue;
            }

            if( Array.isArray(valor)) {
                continue;
            }

            if( valor instanceof Date) {
                colunas.push(camelToSnake(prop));
                valores.push(valor);
            }
            else if (valor instanceof Object) {
                if( !valor.id ) {
                    continue;
                }
                colunas.push(camelToSnake(prop) + "_id");
                valores.push(valor.id);
            } else {
                colunas.push(camelToSnake(prop));
                valores.push(valor);
            }

            params.push('?');
        }

        const consulta = 'insert into ' + camelToSnake(objeto.constructor.name) +
            "(" + colunas.join(",") + ") values(" + params.join(',') + ")";

        console.log(consulta);

        return new Promise( (resolve, reject) => {
            var me = this;

            //console.log(comandoSql.sql);
            // console.log(comandoSql.parametros);

            var dominio = require('domain').active;

            this.conexao(function(connection) {
                if( me.antesDeExecutarAConsultaFn )
                    me.antesDeExecutarAConsultaFn({sql: consulta}, nomeCompleto, multicliente);

                connection.query(consulta,valores,dominio.intercept(function (rows, fields,err) {
                    if( err ) {
                        return reject(err);
                    }

                    if( rows.insertId ) {
                        objeto.id = rows.insertId;
                    }

                    resolve(objeto.id);
                }));
            });
        });
    }

    GerenciadorDeMapeamentos.prototype.insira = function (nomeCompleto, objeto, callback, multicliente) {
        this.insiraAsync(nomeCompleto, objeto, multicliente).then( (id) => {
            if( callback ) {
                callback();
            }
        }).catch( (erro) => {
            if( callback ) {
                callback();
            }
        });
    }

    GerenciadorDeMapeamentos.prototype.insiraAsync = function (nomeCompleto, objeto, multicliente) {
        return new Promise( (resolve, reject) => {
            var me = this;
            var no = this.obtenhaNo(nomeCompleto);

            var comandoSql = new ComandoSql();

            no.obtenhaSql(comandoSql, objeto);

            //console.log(comandoSql.sql);
            // console.log(comandoSql.parametros);

            var dominio = require('domain').active;

            this.conexao(function(connection){
                if( me.antesDeExecutarAConsultaFn )
                    me.antesDeExecutarAConsultaFn(comandoSql, nomeCompleto, multicliente);
                connection.query(comandoSql.sql,comandoSql.parametros,dominio.intercept(function (rows, fields,err) {
                    if( err ) {
                        return reject(err);
                    }

                    if( rows.insertId ) {
                        objeto.id = rows.insertId;
                    }

                    resolve(objeto.id);
                }));
            });
        });
    };

    GerenciadorDeMapeamentos.prototype.atualize = function (nomeCompleto, objeto, callback, multicliente) {
        this.atualizeAsync(nomeCompleto, objeto, multicliente).then( (id) => {
            if( callback ) {
                callback();
            }
        }).catch( (erro) => {
            if( callback ) {
                callback();
            }
        });
    };

    GerenciadorDeMapeamentos.prototype.atualizeAsync = function (nomeCompleto, objeto, multicliente) {
        return new Promise( (resolve, reject) => {
            var me = this;
            var no = this.obtenhaNo(nomeCompleto);

            var comandoSql = new ComandoSql();
            var sql = no.obtenhaSql(comandoSql, objeto);

            //console.log(sql);

            var dominio = require('domain').active;

            this.conexao(function (connection) {
                if (me.antesDeExecutarAConsultaFn)
                    me.antesDeExecutarAConsultaFn(comandoSql, nomeCompleto, multicliente);
                connection.query(comandoSql.sql, comandoSql.parametros, dominio.intercept(function (rows, fields, err) {
                    if (err) {
                        return reject(err);
                    }

                    resolve(rows.affectedRows);
                }));
            });
        });
    };

    GerenciadorDeMapeamentos.prototype.remova = function (nomeCompleto, objeto, callback, multicliente) {
        this.removaAsync(nomeCompleto, objeto, multicliente).then( (id) => {
            if( callback ) {
                callback();
            }
        }).catch( (erro) => {
            if( callback ) {
                callback();
            }
        });
    }

    GerenciadorDeMapeamentos.prototype.removaAsync = function (nomeCompleto, objeto, multicliente) {
        return new Promise( (resolve, reject) => {
            var me = this;
            var no = this.obtenhaNo(nomeCompleto);

            var comandoSql = new ComandoSql();
            var sql = no.obtenhaSql(comandoSql, objeto);

            var dominio = require('domain').active;

            console.log(sql);

            this.conexao(function(connection) {
                if( me.antesDeExecutarAConsultaFn )
                    me.antesDeExecutarAConsultaFn(comandoSql, nomeCompleto, multicliente);

                connection.query(comandoSql.sql, comandoSql.parametros, dominio.intercept(function (rows, fields,err) {
                    if (err) {
                        return reject(err);
                    }

                    resolve(rows.affectedRows);
                }));
            });
        });
    };

    GerenciadorDeMapeamentos.prototype.selecioneUm = function (nomeCompleto, dados, callback, multicliente) {
        var inicio = new Date();
        this.selecioneUmAsync(nomeCompleto, dados, multicliente).then( (objeto) => {
            if( callback ) {
                console.log("Tempo: " + nomeCompleto + " " + (new Date().getTime() - inicio.getTime()));
                callback(objeto);
            }
        }).catch( (erro) => {
            if( callback ) {
                callback(erro);
            }
        });
    }

    GerenciadorDeMapeamentos.prototype.selecioneUmAsync = function (nomeCompleto, dados, multicliente) {
        //var inicio = new Date();
        return new Promise( (resolve, reject) => {
            // console.log('buscando ' + nomeCompleto);
            this.selecioneVarios(nomeCompleto, dados, function (objetos) {
                if( objetos instanceof Error ) {
                    return reject(objetos);
                }

                if (objetos.length == 0)
                    return resolve(null);

                if (objetos.length > 1) {
                    return resolve(null);
                }

                //console.log("Tempo busca: " + nomeCompleto + " => " + (new Date().getTime() - inicio.getTime()));
                resolve(objetos[0]);
            }, multicliente);
        });
    };

    GerenciadorDeMapeamentos.prototype.selecioneVarios = function (nomeCompleto, dados, callback, multicliente) {
        this.selecioneVariosAsync(nomeCompleto, dados, multicliente).then( (objetos) => {
            if( callback ) {
                callback(objetos);
            }
        }).catch( (erro) => {
            if( callback ) {
                callback(erro);
            }
        });;
    }

    GerenciadorDeMapeamentos.prototype.selecioneVariosAsync = function (nomeCompleto, dados, multicliente) {
        return new Promise( (resolve, reject) => {
            var me = this;
            var no = this.obtenhaNo(nomeCompleto);

            var comandoSql = new ComandoSql();

            no.obtenhaSql(comandoSql, dados);

            var nomeResultMap = no.resultMap;

            if (no.resultMap.indexOf(".") == -1) {
                nomeResultMap = no.mapeamento.nome + "." + no.resultMap;
            }

            var noResultMap = this.obtenhaResultMap(nomeResultMap);

            if (no.resultMap && noResultMap == null) {
                throw new Error("Result map '" + no.resultMap + "' não encontrado");
            }

            var dominio = require('domain').active;
            this.conexao(function(connection){
                //console.log(comandoSql.sql);
                //console.log(comandoSql.parametros);

                if( me.antesDeExecutarAConsultaFn )
                    me.antesDeExecutarAConsultaFn(comandoSql, nomeCompleto, multicliente);

                const parametros = {sql: comandoSql.sql};
                if( no.prefixo ) {
                    parametros.nestTables = "_";
                }

                const tInicio = new Date();
                const query = connection.connection.query(parametros, comandoSql.parametros);

                let objetos = [];

                var mapaObjetos = {};
                var mapaColecoes = {};
                var listaDeColecoes = [];
                var qtdeRegistros = 0;
                query.on('result', dominio.bind(function(row, err) {
                    qtdeRegistros ++;
                    connection.connection.pause();
                    //  dominio.intercept( () => {


                    if (noResultMap) {
                        var inicio = new Date();
                        var objeto = noResultMap.crieObjeto2(me, row, mapaObjetos, mapaColecoes, listaDeColecoes);

                        if( objeto ) objetos.push(objeto);
                        //console.log('Tempo: ' + (new Date().getTime() - inicio.getTime()));
                        //console.log('Tempo')
                        //resolve(objetos);
                    } else {
                        if (no.javaType == 'String' || no.javaType == 'int' || no.javaType == 'long' || no.javaType == 'java.lang.Long') {


                            // for (var i in rows) {
                            //   var row = rows[i];

                            for (var j in row) {
                                objetos.push(row[j]);
                                //      break;
                            }
                            // }

                            //resolve(objetos);
                        }
                    }

                    connection.connection.resume();
                }));
                query.on('end', dominio.bind(function(err) {
                    //console.log('Tempo: ' + (new Date().getTime() - tInicio.getTime()));
                    if( qtdeRegistros > 1000 ) {
                        console.warn("Possível ponto de melhoria: " + nomeCompleto + " Trouxe: " + qtdeRegistros + " registros");
                    }

                    for (var i = 0; i < listaDeColecoes.length; i++) {
                        var colecao = listaDeColecoes[i];

                        delete colecao.objeto[colecao.propriedade]
                    }

                    resolve(objetos);
                }));
            });
        });
    };

    GerenciadorDeMapeamentos.prototype.crie = function () {
        var instance = Object.create(GerenciadorDeMapeamentos);
        instance.constructor.apply(instance, []);

        return instance;
    };

    GerenciadorDeMapeamentos.prototype.contexto=function(){
        var dominio = require('domain').active;

        return dominio.contexto;
    };

    GerenciadorDeMapeamentos.prototype.conexao=function(callback){
        this.contexto()
        return this.contexto().obtenhaConexao(callback);
    }

    GerenciadorDeMapeamentos.prototype.transacao=function(callback){
        return this.contexto().inicieTransacao(callback);
    }

    return GerenciadorDeMapeamentos;
})();
exports.GerenciadorDeMapeamentos = GerenciadorDeMapeamentos;

var Mapeamento = (function () {
    function Mapeamento(nome) {
        this.nome = nome;
        this.filhos = [];
        this.resultMaps = [];
        this.resultsMapsPorId = {};
        this.nosPorId = {};
    }
    Mapeamento.prototype.adicione = function (noFilho) {
        noFilho.mapeamento = this;

        this.filhos.push(noFilho);

        if (noFilho instanceof NoResultMap) {
            this.resultMaps.push(noFilho);

            this.resultsMapsPorId[noFilho.id] = noFilho;
        }

        this.nosPorId[noFilho.id] = noFilho;
    };

    Mapeamento.prototype.obtenhaResultMap = function (nomeResultMap) {
        return this.resultsMapsPorId[nomeResultMap];
    };

    Mapeamento.prototype.obtenhaNo = function (idNo) {
        return this.nosPorId[idNo];
    };
    return Mapeamento;
})();

exports.dir_xml = dir_xml;
exports.Mapeamento = Mapeamento;
exports.Contexto = Contexto;

//# sourceMappingURL=No.js.map
