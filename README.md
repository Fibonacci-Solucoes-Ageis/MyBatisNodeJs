MyBatisNodeJs
=============

MyBatisNodeJs is a port from the The MyBatis data mapper framework for Node.Js.

MyBatisNodeJs understands the same xml files as input like MyBatis Java.

MyBatisNodeJs assumes that your POJO's (domains objects) exist on the directory domain:

- Project
   domain (put your domain classes here)

* How to use:

To process the xml mapping files and get an sessionFactory instance:

````javascript
var sessionFactory  = new mybatis.Principal().processe('/Volumes/1TB/Trabalho2/TwitRadio/grails-app/conf/ibatis/');
global.sessionFactory = sessionFactory;
```

The variable sessionFactory has methods for selectOne, selectMany, insert, update or delete objects.

```javascript
sessionFactory.selecioneUm('user.select', {id: 1}, this.pool, callback);
```

The callback function is called with the user or null if not found.
