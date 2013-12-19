MyBatisNodeJs
=============

MyBatisNodeJs is a port from the The MyBatis data mapper framework for Node.Js.

MyBatisNodeJs understands the same xml files as input like MyBatis Java.

MyBatisNodeJs assumes that your POJO's (domains objects) exist on the directory domain:

- Project
   domain (put your domain classes here)

* How to use:

1) Write your MyBatis mapping files:

To Know how to write mapping files read: 
http://mybatis.github.io/mybatis-3/

2) Create a connection to your database

```javascript
var mysql = require('mysql');
global.pool = mysql.createPool({
    host     : 'localhost',
    user     : '****',
    password : '****',
    database : 'database',
    typeCast : true,
    multipleStatements: true
});
```

3) To process the xml mapping files and get an sessionFactory instance:

```javascript
var mybatis = require('mybatisnodejs');

app.use(mybatis.Contexto.domainMiddleware);
app.use(mybatis.Contexto.middlewareOnError);

var sessionFactory  = new mybatis.Principal().processe(dir_xml);
global.sessionFactory = sessionFactory;
```

The string variable dir_xml points to the MyBatis mapping files directory.

The variable sessionFactory has methods for selectOne, selectMany, insert, update or delete objects.

4) Select one object:

```javascript
sessionFactory.selecioneUm('user.select', {id: 1}, pool, function(user) {
   //console.log(user);
});
```

The callback function is called with the user or null if not found.
