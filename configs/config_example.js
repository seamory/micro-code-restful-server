/**
 * Created by Scorpio on 2020/8/14 13:04
 */

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
