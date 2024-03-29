var express = require('express');
var request = require('postman-request');

var router = express.Router();

/* GET proxy listing. */
router.get('/1', function(req, res, next) {

  //var newurl = 'http://37.220.36.53:7904';
  var newurl = 'http://93.90.201.81:8000';
  request(newurl).pipe(res);

  /*

  https://directory.shoutcast.com/Search

  var request = require('request');
  app.get('/', function(req,res) {
    //modify the url in any way you want
    var newurl = 'http://google.com/';
    request(newurl).pipe(res);
  });

  */

});

// http://37.220.36.53:7904
// http://208.123.119.17:7904
// http://37.220.36.53:7904
/*
http://directory.shoutcast.com/?q=65_Breakbeat_61
[playlist]
numberofentries=4
File1=http://37.220.36.53:7904
Title1=(#1 - 8/1000) NSB Radio
Length1=-1
File2=http://208.123.119.17:7904
Title2=(#2 - 2/200) NSB Radio
Length2=-1
File3=http://37.220.36.53:8904
Title3=(#3 - 20/1000) NSB Radio
Length3=-1
File4=http://37.220.36.51:8906
Title4=(#4 - 3/10) NSB Radio
Length4=-1
Version=2
*/

// router.get('/nsb', function(req, res, next) { console.log("download"); request('http://5.39.71.159:8729/stream?type=http&nocache=49969').pipe(res); });
// router.get('/nsb', function(req, res, next) { console.log("download:play"); request('https://nsbradio.co.uk/play.php').pipe(res); });
// router.get('/nsb', function(req, res, next) { console.log("download:play"); request('https://443-1.autopo.st/130/;').pipe(res); });
// router.get('/nsb', function(req, res, next) { console.log("download:play"); request('https://livensb.b-cdn.net/;').pipe(res); });
router.get('/nsb', function(req, res, next) { console.log("download:play"); request('http://95.211.3.65:8525/;?type=http&nocache=44733').pipe(res); });

router.get('/dnb', function(req, res, next) { console.log("download:play"); request('http://95.211.3.65:8525/;?type=http&nocache=44733').pipe(res); });
// alternative http://play.sas-media.ru/play_256 ?



//router.get('/nsb', function(req, res, next) { console.log("download"); request('http://live.nsbradio.co.uk:8904/;?type=http&nocache=43144').pipe(res); });

// http://live.nsbradio.co.uk:8904/;?type=http&nocache=43148

router.get('/electrodancefloor', function(req, res, next) { request('http://listen.radionomy.com:80/electrodancefloor').pipe(res); });
router.get('/deepdanceradio', function(req, res, next) { request('https://streaming.radionomy.com/DeepDanceRadio').pipe(res); });
router.get('/hardstyle', function(req, res, next) { request('http://145.239.10.127:8326/streamTitle1').pipe(res); }); // dead
router.get('/rap', function(req, res, next) { request('http://149.56.157.81:8569/streamTitle1').pipe(res); });
// router.get( '/dunklenacht', function(req, res, next) { request('http://93.90.201.81:8000').pipe(res); }); //offline


router.get('/breakbeat', function(req, res, next) { request('http://178.33.115.87:8004/stream').pipe(res); });  // dead
router.get('/trance', function(req, res, next) { request('http://137.74.45.136:80/pulstranceAAC64.mp3').pipe(res); });
// router.get('/subfm', function(req, res, next) { request('http://5.39.71.159:8729/stream?type=http&nocache=49973').pipe(res); });
router.get('/subfm', function(req, res, next) { request('http://radio.mosco.win:2082/play').pipe(res); });

router.get('/lounge', function(req, res, next) { request('http://185.33.21.112:80/chilloutlounge_128').pipe(res); });
router.get('/psyradio', function(req, res, next) { request('http://65.109.32.21:8010/stream').pipe(res); });


//"https://streamable.com/l/fhppip/mp4.mp4",
//  "https://streamable.com/l/gvrubp/mp4.mp4",
//  "https://streamable.com/l/jp59ol/mp4.mp4"

/*
http://178.33.115.87:8004/stream .. breakbeat

File1=http://213.251.190.165:80/pulstranceAAC64.mp3
Title1=(#1 - 3/600) PulsRadio TRANCE
Length1=-1
File2=http://87.98.153.24:80/pulstranceAAC64.mp3
Title2=(#2 - 4/600) PulsRadio TRANCE
Length2=-1
File3=http://51.15.76.3:80/pulstranceAAC64.mp3
Title3=(#3 - 19/2000) PulsRadio TRANCE
Length3=-1
File4=http://193.200.42.211:80/pulstranceAAC64.mp3
Title4=(#4 - 19/1000) PulsRadio TRANCE
Length4=-1
File5=http://137.74.45.136:80/pulstranceAAC64.mp3
Title5=(#5 - 21/600) PulsRadio TRANCE
*/

// http://145.239.10.127:8326/streamTitle1 // hardstyle
// http://149.56.157.81:8569/streamTitle1 // RAP singing

module.exports = router;
