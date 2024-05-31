const express = require("express"); // make flexible Node.js web application framework
var app = express(); // make variable
const mysql = require("mysql"); // make Node.js work with database (MYSQL)
const bodyparser = require("body-parser"); // Node.js body parsing middleware.
const req = require("express/lib/request");
app.use(bodyparser.json());
app.use(
  bodyparser.urlencoded({
    extended: true,
  })
);

app.use(function (req, res, next) {
  // Website you wish to allow to connect
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Request methods you wish to allow
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );

  // Request headers you wish to allow
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With,content-type"
  );

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader("Access-Control-Allow-Credentials", true);

  // Pass to next layer of middleware
  next();
});

app.all("*", function (req, res, next) {
  /**
   * Response settings
   * @type {Object}
   */
  var responseSettings = {
    AccessControlAllowOrigin: req.headers.origin,
    AccessControlAllowHeaders:
      "Content-Type,X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5,  Date, X-Api-Version, X-File-Name",
    AccessControlAllowMethods: "POST, GET, PUT, DELETE, OPTIONS",
    AccessControlAllowCredentials: true,
  };

  /**
   * Headers
   */
  res.header(
    "Access-Control-Allow-Credentials",
    responseSettings.AccessControlAllowCredentials
  );
  res.header(
    "Access-Control-Allow-Origin",
    responseSettings.AccessControlAllowOrigin
  );
  res.header(
    "Access-Control-Allow-Headers",
    req.headers["access-control-request-headers"]
      ? req.headers["access-control-request-headers"]
      : "x-requested-with"
  );
  res.header(
    "Access-Control-Allow-Methods",
    req.headers["access-control-request-method"]
      ? req.headers["access-control-request-method"]
      : responseSettings.AccessControlAllowMethods
  );

  if ("OPTIONS" == req.method) {
    res.send(200);
  } else {
    next();
  }
});

const mc = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "flightzone",
  multipleStatements: true,
});
function tokenize(username, password) {
  token = Buffer.from(username + ":" + password).toString("base64");
  return token;
}
function existsDb(tableName, column, name) {
  return new Promise((resolve, reject) => {
    mc.query(
      `SELECT * FROM ${tableName} WHERE ${column} = "${name}"`,
      function (error, results, fields) {
        if (results) {
          if (results.length != 0) {
            resolve(true);
          } else {
            resolve(false);
          }
        } else {
          resolve(false);
        }
      }
    );
  });
}
// open broswer on this -> "localhost:4000/"
var port = process.env.PORT || 4000;
console.log("Running on port:" + port);
app.listen(port);

////////////////////////////////////////////////////////////////////////////////
app.post("/login", async function (req, res) {
  phone_number = req.body.phone_number;
  password = req.body.password;
  token = tokenize(phone_number, password);
  data = {
    phone_number: phone_number,
    password: password,
  };
  numberExists = await existsDb("users", "phone_number", phone_number);
  if (!numberExists) {
    res.send({
      code: 400,
      message: "phone number is not registered",
    });
    return;
  }
  mc.query(
    `SELECT * FROM users WHERE users.phone_number = "${phone_number}" AND users.password = "${password}"`,
    function (error, results, fields) {
      if (error) {
        res.send({
          code: error.code,
          message: error.message,
        });
      } else if (results) {
        if (results.length > 0) {
          res.send({
            code: 200,
            message: "Login successfully",
            data: results[0]["token"],
          });
        } else {
          res.send({
            code: 400,
            message: "No user has this phone number or password",
          });
        }
      }
    }
  );
});
app.post("/signup", async function (req, res) {
  phone_number = req.body.phone_number;
  password = req.body.password;
  user_name = req.body.user_name;
  user_photo = req.body.user_photo;
  token = tokenize(phone_number, password);
  data = {
    phone_number: phone_number,
    password: password,
    user_name: user_name,
    user_photo: user_photo,
    token: token,
  };
  numberExists = await existsDb("users", "phone_number", phone_number);
  if (numberExists) {
    res.send({
      code: 400,
      message: "phone number is already taken",
    });
    return;
  }
  mc.query(`INSERT INTO users SET ?`, data, function (error, results, fields) {
    if (error) {
      res.send({
        code: error.code,
        message: error.message,
      });
    } else if (results) {
      res.send({
        code: 200,
        message: "Signup successfully",
        data: token,
      });
    }
  });
});

app.get("/available-flights", function (req, res) {
  mc.query(
    `
    SELECT airports.airport_name AS from_airport, cities.city_name AS from_city,
    airports2.airport_name AS to_airport, cities2.city_name AS to_city,
    airlines.airline_name, flights.price_USD, flights.flight_number, flights.distance_km, flights.duration_hrs ,flights.date_time, flights.status
    FROM flights JOIN airlines ON flights.airline_id = airlines.id
    JOIN airports ON flights.from_airport_id = airports.id
    JOIN airports AS airports2 ON flights.to_airport_id = airports2.id
    JOIN cities ON airports.city_id = cities.id
    JOIN cities AS cities2 ON airports2.city_id = cities2.id
    `,

    function (error, results, fields) {
      if (error) {
        res.send({
          code: error.code,
          message: error.message,
        });
      } else if (results) {
        if (results.length > 0) {
          res.send({
            code: 200,
            message: "Success",
            data: results,
          });
        } else {
          res.send({
            code: 400,
            message: "No flights available",
          });
        }
      }
    }
  );
});
