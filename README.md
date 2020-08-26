# Micro Code Restful Server
a useful tool for front developer. by sample setting (write a config file), and you will get a web-service backend. 

## Install

`npm install`

## Run

befor run `node index.js`. you should set as follows. you will get your own web-service backend to test your front web page.

## Configs

### config.js

**path: config/Config.js**

```javascript
module.exports = {
  "database": {
    "host": "localhost",
    "port": "3306",
    "user": "your_username",
    "password": "your_password",
    "database": "mysql"
  },
  "http": {
    "listening": "0.0.0.0",
    "port": 80
  },
  "https": {
    "listening_ip": "0.0.0.0",
    "port": 443,
    "cert": {
      "key": "",
      "cert": ""
    }
  }
}
```

> Server Core Config file. The file should in configs dir.

**https.cert.key**

https certs key. only support the key file.

**https.cert.cert**

https certs file. support the *.crt, *pem etc. file.

### api-config.js

**path: config/APIConfig.json**

```javascript
module.exports = [
  {
    route: "",
    method: "",
    sql: ""
  },
  {
    route: "",
    method: "",
    middleware: function (req) {
      // ...
      return []
    }
  }
]
```

> Server Base Config file. The file should in configs dir.

**route**

Route path. This argument must start of word `'/'`. 

ex: `'/helloworld'`

**method**

Request method. You can use single request method or multiple method both. If you use multiple method, between method you should split by a comma. 

single ex: `get`, `post`, `delete`, `put`

multiple ex: `get, post`, `post, put` 

**sql**

The sql which bind to the route. you can use `?:field_name` to bind the post or url arguments.

If sql is an array object, the server will be created a sql transaction, and execution sequence is depend on the sql in which index in the array object.

**middleware**

Middleware makes user could do more advance action in the route. 

The middleware function accept one argument `req`, the more information about `req` you could realize from express request.

The middleware function return a sql which you can use bind grammar as above sql part guide. if the function structure has any errors, you must return an empty array object.

## New feature preview
1. support the auth of request.
2. support the result process.
