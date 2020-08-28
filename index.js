/**
 * Created by Scorpio on 2020/6/4 14:30
 */
'use strict'

const http = require('http')
const https = require('https')
const express = require('express')
const fs = require('fs')
const mysql = require('mysql')
const moment = require('moment')

const apiConfig = require('./configs/api-config.js')
const config = require('./configs/config.js')


function registerExpress() {
  const app = express()

  app.use(express.json())
  app.use(express.urlencoded({extended: true}))
  app.use((req, res, next) => {
    console.log('-----------------------' + moment().format('YYYY-MM-DD HH:mm:SS') + '----------------------------')
    console.log('from: ' + req.hostname + ', url: ' + req.originalUrl + ', method: ' + req.method)
    console.log("request query:", req.query, "request body:", req.body)
    next()
  })

  app.all('*', function (req, res, next) {
    res.header("Access-Control-Allow-Origin", req.headers.origin)
    res.header("Access-Control-Allow-Credentials", true)
    res.header("Access-Control-Allow-Headers", "x-requested-with,Authorization,Content-Type")
    res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS")
    res.header("Content-Type", "application/json;charset=utf-8");
    if (req.method == 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });

  app.all('/', (req, res) => {
    res.send('express is starting, your hostname is:' + req.hostname)
  })

  return app
}

function registerAPIRouter(app) {
  const pool = mysql.createPool(config.database)
  function assembleSql(req, res, item) {
    const { middleware } = item
    const sql = 'function' === typeof middleware ? middleware(req, item.sql): item.sql
    const sqlListResult = []
    const argsErrorList = []
    let sqlList = []
    if ('string' === typeof sql) {
      sqlList.push(sql)
    } else {
      sqlList = sql
    }
    sqlList.forEach((sql, index) => {
      let sqlCopied = sql
      let sqlArgs = sqlCopied.match(/((\?:[a-z|A-Z|0-9|_]*))/ig)
      if (sqlArgs && 0 < sqlArgs.length) {
        console.log('arguments: ' + sqlArgs.join(', '))
        if ('get' === item.method.toLowerCase()) {
          sqlCopied = sqlCopied.replace(/(\?:[a-z|A-Z|0-9|_]*)/ig,
            (match) => {
              const arg = match.slice(2, match.length)
              const param = Reflect.get(req.query, arg)
              if (undefined === param){
                argsErrorList.push(arg)
              }
              return param
            })
        } else {
          sqlCopied = sqlCopied.replace(/(\?:[a-z|A-Z|0-9|_]*)/ig,
            (match) => {
              const arg = match.slice(2, match.length)
              const field = Reflect.get(req.body, arg)
              const param = Reflect.get(req.query, arg)
              if (undefined !== field) {
                return field
              }
              if (undefined !== param){
                return param
              }
              argsErrorList.push(arg)
              return undefined
            })
        }
      }
      sqlListResult.push(sqlCopied)
      console.log(sqlCopied)
    })
    if (argsErrorList.length > 0) {
      res.status(417).send({
        status: res.statusCode,
        data: null,
        msg: 'the following parameters are missing: ' + argsErrorList.join(', ')
      })
      return []
    }
    return sqlListResult
  }
  apiConfig.forEach((item) => {
    app.all(item.route, (req, res) => {
      if (req.method.toLowerCase() !== 'options') {
        if (item.method.toLowerCase() && item.method.toLowerCase().search(req.method.toLowerCase()) < 0) {
          res.status(405).send({status: res.statusCode, data: null, msg: 'request method should be ' + item.method})
          return
        }
      }
      let sqlList = assembleSql(req, res, item)
      if (sqlList.length !== 0) {
        pool.getConnection((err, connection) => {
          if (err) {
            throw err
          }
          function connStack(connection, res, index) {
            connection.query(sqlList[index], (err, results, fields) => {
              if (err) {
                return connection.rollback(() => {
                  res.status(500).send({status: res.statusCode, data: null, msg: 'transaction error.' + err})
                  console.log(err)
                })
              } else {
                if (index === sqlList.length - 1) {
                  res.send({status: res.statusCode, data: results, msg: 'success.'})
                } else {
                  console.log('>>>>>> ' + moment().format('YYYY-MM-DD HH:mm:SS') + ' stack ' + index)
                  console.log(sqlList[index])
                  console.log(results)
                  connStack(connection, res, index + 1)
                }
              }
            })
          }
          connection.beginTransaction((err) => {
            if (err) {
              res.status(500).send({status: res.statusCode, data: null, msg: 'transaction error. error: ' + err})
              throw err
            }
            connStack(connection, res, 0)
            connection.commit(function (err) {
              if (err) {
                return connection.rollback(function () {
                  res.status(500).send({status: res.statusCode, data: null, msg: 'transaction error. error: ' + err})
                  console.log(err)
                });
              }
            });
          })
          connection.release()
        })
      }
    })
  })
}

function runHttpServer(app) {
  const httpServer = http.createServer(app)
  httpServer.listen(config.http.port, config.http.listening)

  try {
    const httpsServer = https.createServer({
      key: fs.readFileSync(config.https.cert.key),
      cert: fs.readFileSync(config.https.cert.cert)
    }, app)
    httpsServer.listen(config.https.port, config.https.listening)
  } catch (err) {
    console.log('https cert is not setting or file can not access. https server will not be created.')
  }
}

(() => {
  const app = registerExpress()
  registerAPIRouter(app)
  runHttpServer(app)
})()
