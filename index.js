/**
 * Created by Scorpio on 2020/6/4 14:30
 */
'use strict'

const express = require('express')
const http = require('http')
const https = require('https')
const fs = require('fs')
const mysql = require('mysql')
const moment = require('moment')

const apiConfig = JSON.parse(fs.readFileSync('./configs/APIConfig.json', { encoding: "utf8", flag: '' }))
const config = JSON.parse(fs.readFileSync('./configs/Config.json', { encoding: "utf8", flag: '' }))

const app = express()
app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use((req, res, next) => {
  console.log('-----------------------' + moment().format('YYYY-MM-DD HH:mm:SS') + '----------------------------')
  console.log('from: ' + req.hostname + ', url: ' + req.originalUrl + ', method: ' + req.method)
  console.log("request query:", req.query, "request body:", req.body )
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

const pool = mysql.createPool(config.database)

apiConfig.forEach((item) => {
  app.all(item.route, (req, res) => {

    if (req.method.toLowerCase() !== 'options') {
      if (item.method.toLowerCase() && item.method.toLowerCase().search(req.method.toLowerCase()) < 0) {
        res.status(405).send({status: res.statusCode, data: null, msg: 'request method should be ' + item.method})
        return
      }
    }

    if (typeof item.sql === 'string') {
      let args = item.sql.match(/((\?:[a-z|A-Z|0-9|_]*))/ig)
      let sql = item.sql
      let sqlCheck = []
      if (args) {
        console.log('arguments: ' + args.join(', '))
        args.forEach((arg) => {
          let reqVal = undefined
          const sqlArg = arg.slice(2, arg.length)
          if (item.method.toLowerCase() === 'get') {
            reqVal = Reflect.get(req.query, sqlArg)
          } else {
            reqVal = Reflect.get(req.body, sqlArg)
          }
          if (reqVal === undefined) {
            sqlCheck.push(sqlArg)
          }
          sql = sql.replace(arg, reqVal)
        })
      }
      console.log(sql)

      if (sqlCheck.length > 0) {
        res.status(417).send({ status: res.statusCode, data: null, msg: 'the following parameters are missing: ' + sqlCheck.join(', ') })
        return
      }

      pool.getConnection((err, connection) => {
        if (err) {
          res.status(500).send({status: res.statusCode, data: null, msg: 'there is an error. ' + err})
          throw err
        }
        connection.query(sql, (error, results, fields) => {
          if (error) {
            res.status(500).send({status: res.statusCode, data: null, msg: 'please check out your sql or arguments.'})
          } else {
            res.send({status: res.statusCode, data: results, msg: 'success.'})
          }
        })
        connection.release()
      })
    } else {
      let sqlCheck = []
      let sqlArray = []
      item.sql.forEach((sql) => {

        let args = sql.match(/((\?:[a-z|A-Z|0-9|_]*))/ig)
        let sqlTemp = sql
        if (args) {
          console.log('arguments: ' + args.join(', '))
          args.forEach((arg) => {
            let reqVal = undefined
            const sqlArg = arg.slice(2, arg.length)
            if (item.method.toLowerCase() === 'get') {
              reqVal = Reflect.get(req.query, sqlArg)
            } else {
              reqVal = Reflect.get(req.body, sqlArg)
            }
            if (reqVal === undefined) {
              sqlCheck.push(sqlArg)
            }
            sqlTemp = sqlTemp.replace(arg, reqVal)
          })
        }
        sqlArray.push(sqlTemp)
        console.log(sqlTemp)
      })

      if (sqlCheck.length > 0) {
        res.status(417).send({ status: res.statusCode, data: null, msg: 'the following parameters are missing: ' + sqlCheck.join(', ') })
        return
      }

      pool.getConnection((err, connection) => {
        if (err) {
          throw err
        }
        function connStack(connection, res, level) {
          connection.query(sqlArray[level], (err, results, fields) => {
            if (err) {
              return connection.rollback(() => {
                res.status(500).send({ status: res.statusCode, data: null, msg: 'transaction error. ' + err })
                throw err
              })
            } else {
              if ( level === sqlArray.length - 1) {
                res.send({status: res.statusCode, data: results, msg: 'success.'})
              } else {
                console.log('>>>>>> ' + moment().format('YYYY-MM-DD HH:mm:SS') + ' stack ' + level)
                console.log(sqlArray[level])
                console.log(results)
                connStack(connection, res, level + 1)
              }
            }
          })
        }
        connection.beginTransaction((err) => {
          if (err) {
            res.status(500).send({ status: res.statusCode, data: null, msg: 'transaction error. error: ' + err })
            throw err
          }
          connStack(connection, res, 0)
          connection.commit(function(err) {
            if (err) {
              return connection.rollback(function() {
                res.status(500).send({ status: res.statusCode, data: null, msg: 'transaction error. error: ' + err })
                throw err;
              });
            }
          });
        })
        connection.release()
      })
    }
    return
  })
})

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
