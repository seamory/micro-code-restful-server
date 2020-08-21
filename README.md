# Micro Code Restful Server
a useful tool for front developer. by sample setting (write a config file), and you will get a web-service backend. 

## Install

`npm install express moment mysql`

## Run
by configing as follow. run `node index.js`, you will get your own web-service backend to test your front web page.

## Config

### Config.json

**path: config/Config.json**

```json
{
    "database": {
        "host": "localhost",
        "port": "3306",
        "user": "your_username",
        "password": "your_password",
        "database": "mysql"
    },
    "http": {
        "listening": "0.0.0.0",
        "port": "80"
    },
    "https": {
        "listening_ip": "0.0.0.0",
        "port": "443",
        "cert": {
            "key": "./certs/server.key",
            "cert": "./certs/server.crt"
        }
    }
}
```

**https.cert.key**

https certs key. only support the key file.

**https.cert.cert**

https certs file. support the *.crt, *pem etc. file.

> Server Core Config file. The file should in configs dir.

### APIConfig.json

**path: config/APIConfig.json**

```json
[
  {
    "route": "/getUsers",
    "method": "get",
    "sql": "select * from users"
  },
  {
    "route": "/group/close",
    "method": "get, post",
    "sql": [
      "update users set username = '?:username' where id = ?:id",
      "select * from user where id = ?:id"
    ]
  }
]
```

> Server Base Config file. The file should in configs dir.

**route**

route path

**method**

request method

**sql**

the sql route path binding. use ?:field_name to bind the post or url arguments. if sql is a array, server will be create a sql transcation, and execution sequence is depend on the sql in which index in array. 

## New feature preview
1. support the auth of request.
2. rebuild by go language or rust language.
