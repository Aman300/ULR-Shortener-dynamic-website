
const urlModel = require('../models/urlModel')
const validUrl = require('valid-url');
const shortId = require('shortid')

const redis = require("redis");

const { promisify } = require("util");

//Connect to redis
const redisClient = redis.createClient(
  18998,
  "redis-18998.c80.us-east-1-2.ec2.cloud.redislabs.com",
  { no_ready_check: true }
);
redisClient.auth("20s1SErw7F9z7P4ZTGMXsD83tVV26SdU", function (err) {
  if (err) throw err;
});

redisClient.on("connect", async function () {
  console.log("Connected to Redis.......");
});


//1. connect to the server
//2. use the commands :

//Connection setup for redis

const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);




let createShortUrl = async (req, res) => {

  try {
    let data = req.body

    if (Object.keys(data).length == 0) {
      return res.status(400).send({ status: false, message: "body is is required" })

    } else if (!data.longUrl) {
      return res.status(400).send({ status: false, message: "long url is missing" })

    } else if (!validUrl.isWebUri(data.longUrl)) {
      return res.status(401).send({ status: false, message: "please enter a valid long url" })

    } else if (!/^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/.test(data.longUrl)) {
      return res.status(401).send({ status: false, message: "please enter a valid long url" })

    }

    let cahcedUrlData = await GET_ASYNC(`${data.longUrl}`)

    let URL = JSON.parse(cahcedUrlData);

    if (cahcedUrlData) {
      return res.status(200).send({ status: true, message: "redis return", data: URL })

    }

    const baseUrl = 'http://localhost:3000'
    let urlCode = shortId.generate().toLowerCase();
    const shortUrl = baseUrl + '/' + urlCode;

    data.urlCode = urlCode;
    data.shortUrl = shortUrl;

    await urlModel.create(data)

    let bodyData = await urlModel.findOne({ urlCode: urlCode }).select({ _id: 0, __v: 0, createdAt: 0, updatedAt: 0 })

    await SET_ASYNC(`${data.longUrl}`, JSON.stringify(bodyData))

    res.status(201).send({ status: true, message: "URL create successfully", data: bodyData })

  } catch (err) {
    res.status(500).send({ status: false, message: err.message })

  }
}

//---------------------get url -------------------------------------------------------


let getUrl = async (req, res) => {

  try {
    let urlCode = req.params.urlCode;

    let cahcedUrlData = await GET_ASYNC(`${urlCode}`)

    if (cahcedUrlData) {
      return res.status(302).redirect(JSON.parse(cahcedUrlData))

    } else {

      let getUrl = await urlModel.findOne({ urlCode: urlCode })
      if (!getUrl) return res.status(404).send({ status: false, message: 'Url-code not found' });

      await SET_ASYNC(`${urlCode}`, JSON.stringify(getUrl.longUrl))
      return res.status(302).redirect(getUrl.longUrl)

    }
  } catch (err) {
    res.status(500).send({ status: false, error: err.message });
  }
}


module.exports = { createShortUrl, getUrl }


