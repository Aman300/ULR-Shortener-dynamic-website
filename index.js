const express = require('express')
const mongoose= require('mongoose')
const app = express();
const ejs = require('ejs');
const urlModel = require("./models/urlModel")
const bodyParser = require('body-parser');
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


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.set ('view engine', 'ejs');

mongoose.connect("mongodb+srv://Aman300:ByXZ2qfTNQNWF7Uj@cluster0.o4rcy.mongodb.net/short-url-DB?retryWrites=true&w=majority", {
    useNewUrlParser: true
})
.then( () => console.log("MongoDb is connected"))
.catch ( err => console.log(err) )

app.get("/url", function (req, res) {   
    urlModel.find({}, function (err, allDetails) {
        if (err) {
            console.log(err);
        } else {
             res.render("index", { shortUrls: allDetails })
           // res.send({shortUrls: allDetails})
        }
    })
    })

    app.get("/url/del", function (req, res) {   
      urlModel.deleteMany({}, function (err, allDetails) {
          if (err) {
              console.log(err);
          } else {
               res.redirect('/')
             // res.send({shortUrls: allDetails})
          }
      })
      })


app.get('/',(req,res) =>{
    res.sendFile(__dirname + '/public/index.html')
})

// app.post('/', function(req, res){
//     let NewStudentData = new studentModule({
//         firstName: req.body.firstName,
//         lastName: req.body.lastName,
//         age: req.body.age,
//         className: req.body.className
//     })
//     // console.log(fname)
//     NewStudentData.save();
//     res.redirect('/view')
// })


app.post('/', async function(req, res){
    try {
        let data = req.body
    
        // let cahcedUrlData = await GET_ASYNC(`${data.longUrl}`)
    
        // let URL = JSON.parse(cahcedUrlData);
    
        // if (cahcedUrlData) {
          
        //   return res.status(200).send({ status: true, message: "redis return", data: URL })
    
        // }
    
        const baseUrl = 'https://amanshorturl.herokuapp.com'
        let urlCode = shortId.generate().toLowerCase();
        const shortUrl = baseUrl + '/' + urlCode;
    
        data.urlCode = urlCode;
        data.shortUrl = shortUrl;
    
        await urlModel.create(data)
    
        // let bodyData = await urlModel.findOne({ urlCode: urlCode }).select({ _id: 0, __v: 0, createdAt: 0, updatedAt: 0 })

    
        // await SET_ASYNC(`${data.longUrl}`, JSON.stringify(bodyData))
      
        // //res.status(201).send({ status: true, message: "URL create successfully", data: bodyData })       


        res.redirect('/url')

    
      } catch (err) {
        res.status(500).send({ status: false, message: err.message })
    
      }
})


app.use('/:urlCode', async (req, res) => {

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
})






app.listen(process.env.PORT || 3000, function () {
    console.log('Express app running on port ' + (process.env.PORT || 3000))
});