'use strict'
const dayjs = require('dayjs')
const multer = require('multer')
const fs = require('fs')
const express = require('express')
const mysql = require('mysql')
const config = require('../configs/config.js')

const storage = multer.diskStorage({
  destination: `./uploads/${dayjs().format('YYYYMM')}/`,
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix)
  }
})

const upload = multer({storage: storage})

const dbPool = mysql.createPool(config.database)

function writeDB() {
  dbPool.getConnection(function (err, connection) {
    if (err) throw err;
    connection.query('SELECT something FROM sometable', function (error, results, fields) {
      connection.release();
      if (error) throw error;
    });
  });
}

function removeDB() {
  dbPool.getConnection(function (err, connection) {
    if (err) throw err;
    connection.query('SELECT something FROM sometable', function (error, results, fields) {
      connection.release();
      if (error) throw error;
    });
  });
}

function uploadHook(app) {
  app.use('/files', express.static(__rootname + '/uploads'))
  
  app.post('/upload', upload.array('files'), (req, res, next) => {
    // 上传成功执行数据库操作
    res.status(200).send({status: res.statusCode, data: req.files, msg: 'upload file success!'})
  })
  
  app.delete('/upload/remove', (req, res, next) => {
    const path = Reflect.get(req.body, 'path')
    console.log(path)
    if (undefined === path) {
      res.status(400).send({status: res.statusCode, data: null, msg: 'delete file error! argument path is required!'})
    }
    try {
      fs.unlink(__rootname + '\\' + path, err => {
        if (err) throw err
        // 执行数据库删除操作
        res.status(200).send({status: res.statusCode, data: null, msg: 'upload file success!'})
      })
    } catch (e) {
      res.status(400).send({status: res.statusCode, data: null, msg: 'delete file error! error: %o', e})
    }
  })
}

module.exports = uploadHook
