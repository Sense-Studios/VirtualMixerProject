/**
* @summary
*   Helper classes that add on other classes in the mixer.
*
* @description
*   Helper classes that add on other classes in the mixer.
*   Addons are elements like filemanagers, bpm, etc.
*
* @constructor Addon
* @interface
* @author Sense Studios
*/

function Addon() {}

AudioAnalysis.prototype = new Addon();
AudioAnalysis.constructor = AudioAnalysis;

/**
* @summary
*   AudioAnalysis returns a BPM based on music analisis. Either mp3 or microphone
*  Audio Analysis Example on codepen:
*  <a href="https://codepen.io/xangadix/pen/VRGzdY" target="_blank">codepen</a>
*
*
* @description
*   see more at [Joe Sullivan]{@link http://joesul.li/van/beat-detection-using-web-audio/}
*   AudioAnalysis returns a floating point between 1 and 0, in sync with a bpm
*   the BPM is calculated based on an input music stream (mp3 file)
*
*   ```
*     options.audio (String) is a source, like /path/to/mymusic.mp3
*     options.microphone (Boolean) use microphone (true) or audiosource (false)
*   ```
*
*
* @example
* var mixer1 = new Mixer( _renderer, { source1: mySource, source2: myOtherSource })
* var analysis = new AudioAnalysis( renderer, { audio: 'mymusic.mp3' } );
* analysis.add( mixer1.pod )
* @constructor Addon#AudioAnalysis
* @implements Addon
* @param {GlRenderer} renderer - current {@link GlRenderer}
* @param {Object} options - object with several settings
*/

function AudioAnalysis( _renderer, _options ) {
  var _self = this

  // ---------------------------------------------------------------------------
  // exposed variables.
  _self.uuid = "Analysis_" + (((1+Math.random())*0x100000000)|0).toString(16).substring(1);
  _self.type = "Addon"

  /**
   * @description
   *  Audio element, HTMLMediaElement AUDIO reference
   *
   * @member Addon#AudioAnalysis#audio
   * @param {HTMLMediaElement} - reference to the virtual media element
  */
  _self.audio = ""

  /**  @member Controller#AudioAnalysis#bypass {boolean} */
  _self.bypass = false

  /**
   * @description (calculated) bpm
   * @member Addon#AudioAnalysis.bpm {number}
  */
  _self.bpm = 128

  /**
   * @description number of beats since start
   * @member Addon#AudioAnalysis.beats {number}
  */
  _self.beats = 0

  /**
  * @description delayed bpm is a 'tailing' bpm. it eases jumps in bpm
  * that may cause flashes and makes sure the bpm is always 'gliding' to new values
  * @member Controller#AudioAnalysis#delayed_bpm {number}
  */
  _self.delayed_bpm = 128

  /**
  * @description Use delay (default) enables a gliding scale for the bpm and
  * makes sure no flashes occur when the bpm jumps
  * @member Controller#AudioAnalysis#use_delay {boolean}
  */
  _self.use_delay = true

  /**
  * @description The bpm may never be higher then this number
  * @member Controller#AudioAnalysis#bpm_limit {number}
  */
  _self.bpm_limit = 256

  /**
   * @description
   *  the bpm float is a reference to the current beat-edge,
   *  it represents a float between 0 and 1, with ±1 being given back every beat
   * @member Addon#AudioAnalysis.bpm {number}
  */
  _self.bpm_float = 0

  /**
   * @description bpm mod, multiplyer for bpm output, usuall 0.125, 0.25, 0.5, 2, 4 etc.
   * @member Addon#AudioAnalysis#mod
  */
  _self.mod = 1

  /** @member Addon#AudioAnalysis.bps */
  _self.bps = 1

  /** @member Addon#AudioAnalysis.sec */
  _self.sec = 0

  /** @member Addon#AudioAnalysis.count */
  _self.count = 0

  /** @member Addon#AudioAnalysis.dataSet */
  _self.dataSet

  /**
   * @description tempodate gives you a peak into the inner workins of the sampler, including bpm and 'calibrating' status
   * @member Addon#AudioAnalysis.tempoData
  */
  _self.tempoData

  /** @member Addon#AudioAnalysis.audio_src */
  _self.audio_src

  // default options
  _self.options = {
    //audio: '/radio/nsb',
    audio: '/audio/fear_is_the_mind_killer_audio.mp3',
    microphone: false
  }

  if ( _options != undefined ) {
    _self.options = _options;
  }

  // ---------------------------------------------------------------------------
  // somewhat private private
  var calibrating = true
  var nodes = []
  var c = 0
  var starttime = (new Date()).getTime()

  // add to renderer
  _renderer.add(_self)

  // setup ---------------------------------------------------------------------
  var audio = new Audio()
  _self.audio = audio

  // on mobile this is only allowed AFTER user interaction
  // https://developers.google.com/web/updates/2017/09/autoplay-policy-changes#webaudio
  var context = new(window.AudioContext || window.webkitAudioContext); // AudioContext object instance  
  var source //= context.createMediaElementSource(audio);
  var bandpassFilter = context.createBiquadFilter();
  var analyser = context.createAnalyser();
  var start = Date.now();
  var d = 0; // counter for non-rendered bpm

  // config --------------------------------------------------------------------
  // with ~ 200 samples/s it takes ~ 20 seconds to adjust at 4000 sampleLength
  var sampleLength = 4000;
  _self.dataSet = new Array(sampleLength);
  var peaks = new Array(sampleLength);
  var bufferLength
  var dataArray
  var foundpeaks = [];
  var peak_max = 60;
  var peak_min = 15;
  var treshold = 1;
  var beats_set = false;
  var intervalCounts = [];

  audio.controls = true;
  audio.loop = true;
  audio.autoplay = true;
  audio.crossorigin = "anonymous"

  // or as argument(settings.passFreq ? settings.passFreq : 350);
  bandpassFilter.type = "lowpass";
  bandpassFilter.frequency.value = 350
  bandpassFilter.Q.value = 1
  analyser.fftSize = 128;
  bufferLength = analyser.frequencyBinCount;

  _self.context = context
  _self.analyser = context
  _self.bufferLength = bufferLength
  _self.dataArray = dataArray


  /**
   * @description
   *  disconnects audio to output, this will mute the analalyser, but won't stop analysing
   * @function Addon#AudioAnalysis#disconnectOutput
   *
  */
  _self.disconnectOutput = function() {
    source.disconnect(context.destination);
  }

  /**
   * @description
   *   connects the audio source to output, making it audible
   * @function Addon#AudioAnalysis#connectOutput
   *
  */
  _self.connectOutput = function() {
    source.connect(context.destination);
  }

  /**
   * @description
   *   helper function, get's the bpm and retursn is, useful for ```mixer.bind( func )```
   * @function Addon#AudioAnalysis#getBpm
   *
  */
  _self.getBpm = function() {
    return _self.bpm
  }

  /**
   * @description
   *  firstload for mobile, forces all control to the site on click
   *  tries and forces another play-event after a click
   * @function Addon#AudioAnalysis~forceAudio
   *
  */
  var forceAudio = function() {

    // no need to force if we already have playing audio    
    if (!_self.audio.paused) { 
      context.resume()
      document.body.removeEventListener('click', forceAudio);
      document.body.removeEventListener('touchstart', forceAudio);
      return
    }
    
    console.log("AudioAnalysis is re-intialized after click initialized!", audio.src);
    context.resume().then(() => {
      audio.play();
      console.log('Playback resumed successfully');
      document.body.removeEventListener('click', forceAudio);
      document.body.removeEventListener('touchstart', forceAudio);
    });
  }

  document.body.addEventListener('click', forceAudio)
  document.body.addEventListener('touchstart', forceAudio)


  // MAIN ----------------------------------------------------------------------

  // INIT
  /** @function Addon#AudioAnalysis~init */
  _self.init = function() {
    console.log("init AudioAnalysis Addon.")

    // set audio src to optioned value
    if ( !_self.options.microphone ) {
      source = context.createMediaElementSource(audio);
      audio.src = _self.options.audio  // NSB RADIO --> 'http://37.220.36.53:7904';
      _self.audio_src = _self.options.audio
      initializeAutoBpm()

    } else {
      console.log("Audio analisis using microphone.")
      navigator.mediaDevices.getUserMedia({ audio })
      .then(function(mediaStream) {
        source = context.createMediaStreamSource(mediaStream);
        initializeAutoBpm()
        _self.disconnectOutput()
      }).catch(function(err) {
        console.log(err.name + ": " + err.message);
      }); // always check for errors at the end.
    }
  }

  // RENDER
  // returns a floating point between 1 and 0, in sync with a bpm
  /** @function Addon#AudioAnalysis#render */
  _self.render = function() {
    // returns current bpm 'position' as a value between 0 - 1
    return _self.bpm_float
  }

  // ADD
  // Adds callback function from another node and gives the
  // bpm float ( result of render() ) as an argument to that function
  /** @function Addon#AudioAnalysis#add */
  _self.add = function( _callback ) {
    nodes.push( _callback )
  }

  // SYNC
  // syncs the bpm again on the first beat
  /** @function Addon#AudioAnalysis#sync */
  _self.sync = function() {    
    starttime = new Date().getTime()
  }

  // TODO: getBlackOut
  // tries and detects "blackouts", no sound or no-beat moments
  /** @function Addon#AudioAnalysis#getBlackOut */
  _self.getBlackOut = function() {

  }

  // TODO: getAmbience
  // tries and detects "ambience", or the complexity/ sphere of sounds
  /** @function Addon#AudioAnalysis#getAmbience */
  _self.getAmbience = function() {

  }

  // TODO: getHighLevels -> also check this tutorial
  // https://www.youtube.com/watch?v=gUELH_B2wsE
  // returns 1 on high level tick
  /** @function Addon#AudioAnalysis#getHighLevels */
  _self.getHighLevels = function() {

  }

  // TODO: getMidLevels
  // returns 1 on mid level tick
  /** @function Addon#AudioAnalysis#getMidLevels */
  _self.getMidLevels = function() {

  }

  // TODO: getLowLevels
  // returns 1 on low level tick
  /** @function Addon#AudioAnalysis#getLowLevels */
  _self.getLowLevels = function() {

  }


  // ----------------------------------------------------------------------------

  // UPDATE
  /** @function Addon#AudioAnalysis~update */
  var old_bpm = 0
  _self.update = function() {
    if ( _self.bypass ) return

    // var tempoData = getTempo(dataSet)
    // getBlackout // TODO
    // getAmbience // TODO

    // TODO: Nodebase execution seems to be causing race errors in the 
    // BPM engine, propose to use mixer1.pod( audioanalysis1.render() )
    // instead of this, it seems more accurate and less error prone.
    // right now I'll leave it as a recomendation, but later we should
    // depricate this function

    // update nodes
    if ( !_self.disabled ) {
      nodes.forEach( function( node ) {
        node( _self.render() );
      });
    }

    // TODO: shouldn't we have a "sync"
    // function here, that only updates after 4 beats
    // and resets to the first beat ?
    // --> resetting start time, should do this

    // TODO: if confidence is low, don't switch ?

    // set new numbers
    _self.bpm = _self.tempodata_bpm

    if (_self.bpm > _self.bpm_limit) {
      console.warn("reached bpm limit!: ", _self.bpm, "reset bpm to limit: ", _self.bpm_limit)
      _self.bpm = _self.bpm_limit
    }

    c = ((new Date()).getTime() - starttime) / 1000;    
    _self.count = c
    //c = 0

    // make it float toward the right number
    if ( _self.use_delay ) {
      if ( _self.delayed_bpm < _self.bpm  ) { _self.delayed_bpm += 0.1 }
      if ( _self.delayed_bpm > _self.bpm  ) { _self.delayed_bpm -= 0.1 }
    }else{
      _self.delayed_bpm = _self.bpm
    }

    // what the fuck is going on...
    // 
    // sec 
    // it takes the bpm and converts it in beats per second
    // than it multiplies with count time pi
    // count is rougly 1/60 in onanumteframe
    // it needs to go through a full cycle, hence Pi (up and down)
    // c is for moving it forward along the wave

    // then sec is multiplied by a number around one for the bpm difference

    // _self.sec = ( c * Math.PI * ( (_self.bpm  )  * _self.mod ) / 60 ) // * _self.mod
    _self.sec = ( c * Math.PI * ( _self.delayed_bpm ) / 60 )      // * _self.mod
    _self.sec = _self.sec * ( old_bpm / ( _self.delayed_bpm ) )
    
    _self.bpm_float = ( Math.sin( _self.sec * _self.mod  ) + 1 ) / 2    // Math.sin( 128 / 60 ) -> 0 - 1
    
    // so actually we should move the cursor here to the 'same' point on the float
    // 

    if (_self.bpm != old_bpm) {
      //starttime = (new Date()).getTime()
      old_bpm = ( _self.delayed_bpm * _self.mod)
      // _self.sec 
    }

    if ( _self.sec > _self.delayed_bpm ) {
       starttime = (new Date()).getTime()      
       //console.warn("reset bpm ", c, Math.PI * ( _self.delayed_bpm * _self.mod) / 60)
    }

    // calculate beats based on bpm_float
    if ( _self.bpm_float > 0.9 && !beats_set ) {
      _self.beats += 1
      beats_set = true
    }else if ( _self.bpm_float < 0.1 && beats_set ) {
      _self.beats += 1
      beats_set = false 
    }
  }

  // actual --------------------------------------------------------------------

  /**
   * @description
   *  initialize autobpm, after {@link Addon#AudioAnalysis.initializeAudio}
   *  start the {@link Addon#AudioAnalysis~sampler}
   *
   * @function Addon#AudioAnalysis~initializeAutoBpm
   *
  */

  var initializeAutoBpm = function() {
    // tries and play the audio
    audio.play();

    // connect the analysier and the filter
    source.connect(bandpassFilter);
    bandpassFilter.connect(analyser);

    // send it to the speakers (or not)
    source.connect(context.destination);

    // start the sampler

    // -------------------------------------------------------------------------
    /*
      Intercept HERE -- this part should be loaded of into a web worker so it
      can be offloaded into another thread -- also do this for gif!
    */
    // -------------------------------------------------------------------------

    // this is new
    // opens in domain.com/mixer.js
    if (window.Worker) {

      // https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers
      // var myWorker = new Worker('worker.js');
      // and myWorker.terminate();
      /*
       Inline worker (so we can pack it)
        var bb = new BlobBuilder();
        bb.append("onmessage =
        function(e)
        {
        postMessage('Inline worker creation');
        }");

        var blobURL = window.URL.createObjectURL(bb.getBlob());

        var worker = new Worker(blobURL);
        worker.onmessage = function(e) {
          alert(e.data)
        };
        worker.postMessage();
      */

      // this wil be replaced.
      // setInterval( sampler, 1);
      
      // https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers
      // var myWorker = new Worker('worker.js');
      // and myWorker.terminate();

      // Inline worker, so we can package it later
      // we only use the worker to load of this work to another thread
      console.log("go")      
      var data = `
      
        var _self = null;
        onmessage = function(e) {
          
          var data = JSON.parse(e.data)
          console.log("msgevent:", data.command );          
          _self = data.module
          if ( data.command == "start" ) {
            //setInterval( worker_sampler, 1);
            console.log("(TEST)start the worker!", _self)
          }          
        }

        postMessage('Inline worker created');          
      `

      // convert the worker to a blob and 'load' it
      var bb = new Blob([data]);
      var blobURL = window.URL.createObjectURL( bb );
      var worker = new Worker(blobURL);
      worker.onmessage = function(e) {
        console.log("module got worker message: ", e.data)
      };

      window.my_worker = worker
      //console.log("post message")      
      //worker.postMessage( JSON.stringify( {"command":"start", "module":_self }) );

      // =======================================================================            
      setInterval( sampler, 1);

    }else{
      // this is now the fallback
      setInterval( sampler, 1);
    }
  }

  // ANYLISIS STARTS HERE ------------------------------------------------------
  /**
   * @description
   *   gets the analyser.getByteTimeDomainData
   *   calculates the tempodata every 'slowpoke' (now set at samples 10/s)
   *   returns the most occuring bpm
   *
   * @function Addon#AudioAnalysis~sampler
   *
  */
  var warningWasSet = false

  // MAIN Sampler
  var sampler = function() {
    //if ( !_self.useAutoBpm ) return;
    if ( _self.audio.muted ) return;

    //if ( _self.audio_src != "" && !_self.useMicrophone ) return;
    if ( _self.bypass ) return;
    // if  no src && no mic -- return

    _self.dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(_self.dataArray)

    // precalculculations, push only the highest value of the frequency range
    var now = Date.now()
    var high = 0
    _self.dataArray.forEach( (d) => { if ( d > high ) high = d })
    _self.dataSet.push( [ now, high ] )

    // keep the set on sampleLength
    if (_self.dataSet.length > sampleLength) _self.dataSet.splice(0, _self.dataSet.length - sampleLength)
    d++

    // SLOWPOKE
    // take a snapshot every 1/10 second and calculate beat
    if ( ( now - start ) > 20 ) {

      var tempoData = getTempo(_self.dataSet)
      _self.tempoData = tempoData
      // Here are some ideas for a more complete analisis range

      // var tempoCounts = tempoData.tempoCounts
      // getBlackout // TODO -- detects blackout, prolonged, relative silence in sets
      // getAmbience // TODO -- detects overal 'business' of the sound, it's ambience

      if ( tempoData == undefined ) {
        if ( !warningWasSet ) console.warn(" WARNING: sampler is active, but no audio was detected after 20 seconds -- check your audiofile or your microphone and make sure you've clicked in the window and gave it access! Halting.")
        warningWasSet = true
        _self.tempodata_bpm = 128
        // return
      }else{
        _self.tempodata_bpm = tempoData.bpm
        warningWasSet = false
      }

      if ( _self.useAutoBPM ) _self.sec = c * Math.PI * (tempoData.bpm * _self.mod) / 60
      start = Date.now()
      d = 0
    }
  }

  // blink on the beat with element with class .blink
  var doBlink = function() {
    if ( document.getElementsByClassName('blink').length == 0 ) return
    if ( audio.paused ) {
      document.getElementsByClassName('blink')[0].style.opacity = 0
    }else{
      if (document.getElementsByClassName('blink')[0].style.opacity == 1) {
        document.getElementsByClassName('blink')[0].style.opacity = 0
      }else{
        document.getElementsByClassName('blink')[0].style.opacity = 1
      }
    }
    setTimeout( doBlink, (60/ (_self.bpm) )*1000 / _self.mod    )
  }
  doBlink()

  /**
   * @description
   *  returns 'tempodata', a list of found BPMs sorted on occurrence
   *  object includes: bpm (ie. 128), confidence (0-1), calibrating (true/false),
   *  treshold, tempocounts, foundpeaks and peaks
   * @function Addon#AudioAnalysis~getTempo
   * @params _date {object}
   *
  */
  var getTempo = function( _data ) {
    foundpeaks = []                    // reset foundpeaks
    peaks = new Array( _data.length )  // reset peaks

    // find peaks
    for ( var i = 0; i < _data.length; i++ ) {
      if ( _data[i] !== undefined && _data[i][1] > ( treshold * 128 ) ) {
        peaks[i] = [ _self.dataSet[i][0], 1 ];           // update in peaks
        foundpeaks.push( [ _data[i][0], 1 ] );     // add to foundpeaks
        i += 50;                                   // += 0.4s, to move past this peak
      }
    }

    // make sure we have enough peaks by adjusting the treshhold
    if ( foundpeaks.length < peak_min ) treshold -= 0.05;
    if ( foundpeaks.length > peak_max ) treshold += 0.05;
    if ( treshold > 2 ) treshold = 2;
    if ( treshold < 1 ) treshold = 1;

    // calculate tempo by grouping peaks and calculate interval between them
    // see: http://joesul.li/van/beat-detection-using-web-audio/
    // for more information on this method and the sources of the algroritm
    var tempoCounts = groupNeighborsByTempo( countIntervalsBetweenNearbyPeaks( foundpeaks ) );
    tempoCounts.sort( sortHelper );                             // sort tempo's by 'score', or most neighbours
    if ( tempoCounts.length == 0 ) {
      tempoCounts[0] = { tempo: 128 }; // if no temp is found, return 128

    }else{

      // DISPLAY, for debugging, requires element with an .info class
      var html = ""
      tempoCounts.reverse().forEach(function(v,i) {
        html += i + ", " + v.tempo + ", " + v.count + "\t ["
        var j = 0
        while( j < v.count) {
          html += '#'
          j++
        }
        html += ']<br/>'
      })

      if (document.getElementById('info') != null) {
        document.getElementById('info').html = html
      }

    }

    // Callibration feedback (~24 seconids)
    var confidence = "calibrating"
    calibrating = false
    
    if ( _data[0] === undefined ) {
      calibrating = true
      if ( document.getElementsByClassName('blink').length > 0 ) document.getElementsByClassName('blink')[0].style.backgroundColor = '#999999';
    }else{
      calibrating = false

      // race condition
      if (tempoCounts[0] === undefined  || tempoCounts[1] === undefined ) {
        // console.log("holdit")
        return
      }

      var confidence_mod = tempoCounts[0].count - tempoCounts[1].count
      if ( confidence_mod <= 2 ) {
        confidence = "low"
        if ( document.getElementsByClassName('blink').length > 0 ) document.getElementsByClassName('blink')[0].style.backgroundColor = '#990000';
      }else if( confidence_mod > 2 && confidence_mod <= 7) {
        confidence = "average"
        if ( document.getElementsByClassName('blink').length > 0 ) document.getElementsByClassName('blink')[0].style.backgroundColor = '#999900';
      }else if( confidence_mod > 7 ) {
        confidence = "high"
        if ( document.getElementsByClassName('blink').length > 0 ) document.getElementsByClassName('blink')[0].style.backgroundColor = '#CCCCCC';
      }
    }

    // return an object with all the necc. data.
    var tempoData = {
      bpm: tempoCounts[0].tempo,     // suggested bpm
      confidence: confidence,        // String
      calibrating: calibrating,      // ~24 seconds
      treshold: treshold,            // current treshold
      tempoCounts: tempoCounts,      // current tempoCounts
      foundpeaks: foundpeaks,        // current found peaks
      peaks: peaks                   // all peaks, for display only
    }

    //console.log(tempoData.bpm, tempoData.confidence)

    return tempoData;
  }

  // HELPERS
  // sort helper
  var sortHelper = function ( a,b ) {
    return parseInt( a.count, 10 ) - parseInt( b.count, 10 );
  }

  /**
   * @description Finds peaks in the audiodata and groups them together
   * @function Addon#AudioAnalysis~countIntervalsBetweenNearbyPeaks
   *
  */
  var countIntervalsBetweenNearbyPeaks = function( _peaks ) {

    // reset
    intervalCounts = [];

    _peaks.forEach(function(peak, index) {
      for(var i = 0; i < 10; i++) {
        if ( _peaks[index + i] !== undefined ) {
          var interval = _peaks[index + i][0] - peak[0];
          var foundInterval = intervalCounts.some( function(intervalCount) {
            if (intervalCount.interval === interval) return intervalCount.count++;
          });
          if (!foundInterval) intervalCounts.push({ interval: interval, count: 1 });
        }
      }
    });

    return intervalCounts;
  }

  // group intervalcounts by temp
  /**
   * @description
   *  map found intervals together and returns 'tempocounts', a list of found
   *  tempos and their occurences
   * @function Addon#AudioAnalysis~groupNeighborsByTempo
   *
  */
  var groupNeighborsByTempo = function( intervalCounts ) {

    // reset
    var tempoCounts = []
    var noTempo = false

    // start the interval counts
    intervalCounts.forEach(function(intervalCount, i) {

      // Convert an interval to tempo
      if (intervalCount.interval != 0 && !isNaN(intervalCount.interval)) {
        var theoreticalTempo = 60 / (intervalCount.interval / 1000)
      }

      // Adjust the tempo to fit within the 90-180 BPM range
      while (theoreticalTempo < 90) theoreticalTempo *= 2;
      while (theoreticalTempo > 180) theoreticalTempo /= 2;

      // round to 2 beat
      theoreticalTempo = Math.round( theoreticalTempo/2 ) * 2

      var foundTempo = tempoCounts.some(function(tempoCount) {
        if (tempoCount.tempo === theoreticalTempo && !noTempo )
          return tempoCount.count += intervalCount.count;
      });

      // add it to the tempoCounts
      if (!foundTempo) {
        if ( theoreticalTempo && !noTempo ) {
          tempoCounts.push({
            tempo: theoreticalTempo,
            count: intervalCount.count
          })
        }
      }
    });

    return tempoCounts
  } // end groupNeighborsByTempo
}// end AudioAnalysis

BPM.prototype = new Addon(); // assign prototype to marqer
BPM.constructor = BPM;  // re-assign constructor

/**
 * @summary
 *   BPM calculates beat per minutes based on a 'tap' function
 *   Tapped BPM Example on codepen:
 *   <a href="https://codepen.io/xangadix/pen/drqzPr" target="_blank">codepen</a>
 *
 * @description
 *   BPM returns a floating point between 1 and 0, in sync with a bpm the BPM is calculated based on a 'tap' function
 *
 * @example
 * var mixer1 = new Mixer( renderer, { source1: mySource, source2: myOtherSource })
 * var bpm = new BPM( renderer );
 * bpm.add( mixer1.pod )
 * window.addEventListener('keypress', function(ev) {
 *   if (ev.which == 13) bpm.tap()
 * })
 *
 * @constructor Addon#BPM
 * @implements Addon
 * @param {GlRenderer} renderer
 * @param {Object} options optional
 */

function BPM( renderer, options ) {

  var _self = this
  _self.function_list = [
    ["AUTO", "method", "toggleAutoBpm"],
    ["MODDOWN", "method", "modDown"],
    ["MODUP", "method", "modUp"],
    ["MOD", "method", "modNum"]
  ]

  // only return the functionlist
  if ( renderer == undefined ) return

  // exposed variables.
  _self.uuid = "BPM_" + (((1+Math.random())*0x100000000)|0).toString(16).substring(1);
  window["bpm_" + _self.uuid]
  _self.type = "Addon"

  // set options
  _self.options = {}
  if ( options != undefined ) _self.options = options
  /**
   * @description Beats Per Minute
   * @member Addon#BPM#bpm
   * @param {number} Beats per minute
   *
   *  actual Beats Per Minute
   *
  */
  _self.bpm = 128

  /**
   * @description Tapping beat control
   * @member Addon#BPM#bps
   *
   *  beats per second
   *
  */
  _self.bps = 2.133333         //


  /**
   * @description Second counter
   * @member Addon#BPM#sec
   *
   *  second counter, from which the actual float is calculated
   *
  */
  _self.sec = 0                //

  /**
   * @description
   *  BPM Float, current *position* of the BPM
   *  If the BMP is a Sinus going up and down, the float shows up where it is on the curve
   *  'up' is 1 and down is '0', oscillating.
   * @member Addon#BPM#bpm_float
  */
  _self.bpm_float = 0.46875    // 60 / 128, current float of bpm

  /**
   * @description Tapping beat control
   * @member Addon#BPM#mod
  */
  _self.mod = 1                // 0.25, 0.5, 1, 2, 4, etc.

  /**
   * @description Audio analysis
   * @member Addon#BPM#useAutoBpm#
   * @member Addon#BPM#autoBpmData#
   * @member Addon#BPM#tempodata_bpm#
   * @member Addon#BPM#audio_src
   * @member Addon#BPM#useMicrophone
   */
  _self.useAutoBpm = false      // auto bpm
  _self.tempodata_bpm = 128     // from music
  _self.mute = false
  _self.autoBpmData = {}       // info object for the auto bpm

  _self.audio_src = ""         // audio file or stream (useMicrophone = false)

  // TODO
  _self.useMicrophone = false  // use useMicrophone for autoBPM

  // DEPRICATED
  _self.bypass = false


  // source.renderer ?
  var nodes = []

  // counter
  var c = 0

  // add to renderer
  renderer.add( _self )


  // main ----------------------------------------------------------------------
  // init with a tap contoller
  _self.init = function() {
    console.log("init BPM contoller.")

    // initialize autoBPM with an audio object
    // initializeAutoBpm()
  }

  // UPDATE
  var starttime = (new Date()).getTime()
  _self.update = function() {

    if ( _self.bypass ) return
    // rename useAnalyser?
    //if ( _self.useAutoBpm ) {
    //  _self.bpm = _self.tempodata_bpm
    //}

    if ( !_self.disabled ) {
      nodes.forEach( function( node ) {
        node( _self.render() );
      });
    }

    c = ((new Date()).getTime() - starttime) / 1000;
    _self.sec = c * Math.PI * (_self.bpm * _self.mod) / 60            // * _self.mod
    _self.bpm_float = ( Math.sin( _self.sec ) + 1 ) / 2               // Math.sin( 128 / 60 )
  }

  // add nodes, implicit
  _self.add = function( _func ) {
    nodes.push( _func )
  }

  _self.render = function() {
    // returns current bpm 'position' as a value between 0 - 1
    return _self.bpm_float
  }


  // actual --------------------------------------------------------------------
  /**
   * @description double the bpm
   * @function Addon#BPM#modUp
  */
  _self.modUp = function() { _self.mod *= 2; }
  /**
   * @description half the bpm
   * @function Addon#BPM#modDown
  */
  _self.modDown = function() { _self.mod *= .5; }


  _self.modNum = function(_num) {
    console.log("MOD ", _num)
    var oldState = _self.useAutoBpm
    _self.mod = _num;
    _self.useAutoBpm = oldState
  }

  _self.toggleAutoBpm = function( _num ) {
    _self.useAutoBpm  = !_self.useAutoBpm
    console.log("--->", _self.useAutoBpm  )
  }

  _self.turnOff = function() {
    bpm.audio.muted = false
    bpm.useAutoBpm = false
  }

  // ---------------------------------------------------------------------------
  // Tapped beat control
  var last = Number(new Date());
  var bpms = [ 128, 128 ,128 ,128 ,128 ];
  var time = 0;
  var avg = 0;

  /**
   * @description Tapping beat control
   * @function Addon#BPM#tap
   */
  _self.tap = function() {
    _self.useAutoBPM = false
    time  = Number(new Date()) - last
    last = Number(new Date());
    if ( time < 10000 && time > 10 ) {
      bpms.splice(0,1)
      bpms.push( 60000/time )
      avg = bpms.reduce(function(a, b) { return a + b; }) / bpms.length;
      _self.bpm = avg
      _self.bps = avg/60
    }
  }

  /**
   * @description Gets the current BPM (in bpm, as render() gives a float)
   * @function Addon#BPM#getBpm
   */
  _self.getBpm = function() {
    return _self.bpm
  }

  console.log("set keypress")
  window.addEventListener('keypress', function(ev) {
    console.log(">>> ", ev.which)
    if ( ev.which == 116 || ev.which == 32    ) {
      _self.tap()
      console.log(_self.bpm)
    }
  })

} // end BPM

FileManager.prototype = new Addon();
FileManager.constructor = FileManager;

/**
* @summary
*  Allows for fast switching between a prefefined list of files (or 'sets' )
*
* @description
*  The filemanager allows you to load up a large number of video files and attach them to a VideoSource.
*
*  A 'set' is simply a .json file, with an array with sources like so:
*
*  ```
*   [
*    "https://some.domain.com/space/filename_1.mp4",
*    "https://some.domain.com/space/filename_2.mp4",
*    "https://some.domain.com/space/filename_3.mp4",
*    "https://some.domain.com/space/filename_4.mp4",
*    "https://some.domain.com/space/filename_5.mp4",
*    "https://some.domain.com/space/filename_6.mp4",
*   ]
*  ```
*
* if you use streamable.com, that lets you upload files for free, you can use
* the route for that, with the streamable id
*
*  ```
*   [
*    "/streamable/39xt5t",
*    "/streamable/99gag3",
*    "/streamable/vwg6r2",
*    "/streamable/jbeixg",
*    "/streamable/8h2r0u"
*   ]
*  ```
*
* @example
*   var source1 = new VideoSource( renderer )
*   var myFilemanager = new FileManager( source1 )
*   myFilemanager.load_set( "myset.json")
*
*   // randomly choose one from the set.
*   myFilemanager.change()
*
* @constructor Addon#FileManager
* @implements Addon
* @param source{Source#VideoSource} a reference to a (video) Source, or Gif source. Source needs to work with files
*/

function FileManager( _source ) {

  var _self = this
  _self.function_list = [["CHZ", "method","changez"]]

  _self.uuid = "Filemanager_" + (((1+Math.random())*0x100000000)|0).toString(16).substring(1);
  _self.type = "AddOn"
  _self.defaultQuality = ""
  _self.source = _source

  /** @member Addon#Filemanager#debug {boolean} */
  _self.debug = false

  /** @member Addon#Filemanager.set {array} */
  _self.set = []

  /**
   * @description
   *  select a source based on its number in the set
   * @function Addon#FileManager#load_set
   *
   * @param {object} json encoded array object
  */
  _self.load_set = function( _set ) {
    var u = new Utils()
    u.get( _set, function(d) {
      _self.set = JSON.parse(d)
    })
  }

  /**
   * @description
   *  init, should be automatic, but you can always call gamepad.init() yourself
   * @function Addon#FileManager#setSrc
   *
  */

  /* helper */
  if ( window.in_app != undefined ) {
    _self.eu = window.eu
  }

  _self.setSrc = function( file ) {
    if ( window.in_app == undefined ) {
      _self.source.src(file)
      console.log("filemanager: set normal source:", file)
    }else{
      _self.source.src(_self.eu.check_file(file) )
      console.log("filemanager: set checked source:", _self.eu.check_file(file) )
    }
  }

  // load entire set
  // filemanager.set.forEach(function(item) { window.eu.check_file(item) })

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  /**
   * @description
   *  update the current _set_ of files in the filemanager
   * @function Addon#FileManager#load
   * @param {string} reference to a json filewith the set
   *
  */
  _self.load = function( _file ) {
    var u = new Utils()
    u.get( _file, function(d) {
      _self.set = JSON.parse(d)
      if (_self.debug = false) console.log("got set: ",_self.set )
    })
  }

  /**
   * @description
   *  select a file based on its number in the set
   * @function Addon#FileManager#changeToNum
   * @params {integer} number of the file in the set
   *
  */
  _self.changeToNum = function( _num ) {
    _self.setSrc( _self.set[_num] );
    if (_self.debug = false) console.log("changed file: ", _num, self.set[_num] )
  }

  /**
   * @description
   *  select a file based on its url, regardless of the current set
   * @function Addon#FileManager#changeToUrl
   *
  */
  _self.changeToUrl = function( _url ) {
    _self.setSrc( _url );
    if (_self.debug = false) console.log("changed file from url: ", _num, self.set[_num] )
  }

  /**
   * @description
   *  selects another file from the set
   *  if a parameter is given, it will select that file from the set
   * @function Addon#FileManager#change
   * @param {integer} (optional) number of the file in the set
   *
  */
  _self.change = function( _num ) {
    if ( _self.set.length != 0 ) {
      if ( _num != undefined ) {
        _self.changeToNum( _num );
        return;
      }

      var r = _self.set[ Math.floor( Math.random() * _self.set.length ) ];
      _self.setSrc( r );
      if (_self.debug = false) console.log("changed file: ", r )
    }
    return;
  }

  /**
   * @description
   *  Alias for change
   * @alias Addon#FileManager#changez
   *
  */
  _self.changez = function( _num ){
    _self.change( _num )
  }

  /* TODO: would require more complex sets */
  _self.getSrcByTag = function( _tag ) {}
}

GiphyManager.prototype = new Addon();
GiphyManager.constructor = GiphyManager;

/**
 * @summary
 *   Aquires a set of Gif Files [Giphy](https://giphy.com/), based on tags, and allows choosing from that.
 *   Giphy Example on codepen:
 *   <a href="https://codepen.io/xangadix/pen/vqmWzN" target="_blank">codepen</a>
 *
 * @description
 *  Like the FileManager, the Giphymanager aquires a set of gif files between which you can choose. It connects to a Gifsource.
 *
 * @example
 *  var gifsource1 = new GifSource( renderer, {} )
 *  var gifmanager1 = new GiphyManager( gifsource1 )
 *  gifmanager1.search('vj', function(){ // search giphy and do the callback
 *    gifmanager1.change();     // changes from one giffile to the other in the set
 *  })
 *
 *  Thee is a working example on codepen: https://codepen.io/xangadix/pen/vqmWzN
 *
 * @constructor Addon#Gyphymanager
 * @implements Addon
 * @param {GifSource} some available gifsource source
 */

function GiphyManager( _source ) {

  var _self = this
  _self.uuid = "GiphyManager_" + (((1+Math.random())*0x100000000)|0).toString(16).substring(1);
  _self.type = "AddOn"
  _self.source = _source
  _self.file = ""
  _self.programs = []
  _self.program = ""

  // set in environment
  // this key is for demo purposes only
  var key = "tIovPHdiZhUF3w0UC6ETdEzjYOaFZQFu"

  /**
   * @description same as [search]{@link Addon#Needle#Gyphymanager#search}
   * @function Addon#Gyphymanager#needle
   * @param {string} query - Search term
   */

  _self.needle = function( _needle, _callback ) {
    var u = new Utils()
    u.get('//api.giphy.com/v1/gifs/search?api_key='+key+'&q='+_needle, function(d) {
      console.log(" === GIPHY (re)LOADED === ")
      _self.programs = JSON.parse(d).data
      if (_callback != undefined) _callback ()
    })
  }

   /**
    * @description
    *  loads a set of gif files from giphy based on
    * @function Addon#Gyphymanager#search
    * @param {string} query - Search term
    */
  _self.search = function( _query, _callback ) {
    _self.needle( _query, _callback );
  }

  /**
   * @description
   *  loads a set of gif files from giphy based on
   * @function Addon#Gyphymanager#setSrc
   * @param {string} file - set filename
   */
  _self.setSrc = function( _file ) {
    console.log("set source: ", _file)
    _self.source.src( _file )
  }

  // load another source from the stack
  /**
   * @description
   *  changes the gif file for another one in the collection
   *  loaded by [search()]{@link Addon#Gyphymanager#search}
   * @function Addon#Gyphymanager#change
   */
  _self.change = function() {
    if ( _self.programs.length == 0 ) return "no programs found :("
    _self.program = _self.programs[ Math.floor( Math.random() * _self.programs.length ) ]
    _self.file = _self.program
    _self.setSrc( _self.program.images.original.url );
  }

  /**
   * @description
   *  same as [change()]{@link Addon#Gyphymanager#change}
   * @alias Addon#Gyphymanager#changez
   */
  _self.changez = function(){
    _self.change()
  }

  // load it up with defaults
  //_self.needle("vj")
}

/*

1 ______________________________________________________________________________
2 ______________________________________________________________________________
3 ______________________________________________________________________________
4 ______________________________________________________________________________
5 ______________________________________________________________________________
6 ______________________________________________________________________________
7 ______________________________________________________________________________
8 ______________________________________________________________________________
9 ______________________________________________________________________________
0 ______________________________________________________________________________


THIS IS UNDER HEAVY CONSTRUCTION!

The idea of a 'behaviour' is to trigger certain functions on a set interval.
For instance; a behaviour could be to trigger 10s, 20s and 40s, every 2, 4 and
8 beats. of the song.

This is not to be confused with 'trackdata', which does pretty much the same
thing. trackdata should move over to "sheets", which in itself would qualitfy
as a behaviour in it's own right

So alternatively, behaviour could siply be random triggers, much like
autonomous controllers, setting changes, scratch and what not, every so
often.

*/


function Behaviour( _renderer, options ) {

  // create and instance
  var _self = this;

  // set or get uid
  _self.uuid = "Behaviour" + (((1+Math.random())*0x100000000)|0).toString(16).substring(1);
  _self.type = "Behaviour"

  // add to renderer
  _renderer.add(_self)

  _self.beats = 0
  _self.time = (new Date()).getTime()
  _self.script = {}
  _self.sheets = []
  _self.sheet_index = 0

  // requires a bpm
  _self.bpm = options.bpm

  function addTrigger( _obj ) {
    if ( _obj.mod.type == "seconds" ) {
      triggers.push( [_obj, _self.time + _obj.mod.value, null ] )
    }else if ( _obj.mod.type == "beats" ) {
      triggers.push( [_obj, _self.beats + _obj.mod.value ] )
    }else if ( _obj.mod.type == "random-seconds" ) {
      triggers.push( [_obj, _self.time + ( Math.random() * _obj.mod.value), null ] )
    }else if ( _obj.mod.type == "random-beats" ) {
      triggers.push( [_obj, _self.beats + ( Math.random() * _obj.mod.value ) ] )
    }else{

    }
  }

  //function fireTrigger( _obj ) {
  //  obj[trigger.action.method], trigger.action.args, trigger.mod
    // should repeat?
  //}

  triggers = []
  _self.tr = triggers
  old_bpm = 1

  _self.init = function (){}
  _self.update = function(){

    // updat time
    _self.time = (new Date()).getTime()
    // _self.beats = +1 if
    // bps

    // updat beats
    var bpsr = Math.round( bpm.render() * 4 )

    if ( bpsr != old_bpm ) {
      _self.beats += 1
      old_bpm = bpsr
    }
    //if ( bpsr == 0 ) old_bpm = 1

    // checkTriggers()
    // checkSheets()
  }

  // ---------------------------------------------------------------------------
  _self.load = function( _behaviour ) {
    _self.script = _behaviour
    _self.sheets = _behaviour.sheets
    console.log("loaded A BEHAVIOUR", _behaviour.title )

    _behaviour.triggers.forEach( function( trigger, i) {
      addTrigger(trigger)
    });


      //if ( trigger.action.on !== undefined) {
      //  trigger.action.on.forEach( function( obj, i ) {
      //    console.log(" ====> ", obj)
      //    addTrigger( obj )
      //    // filemanager1.changez()
      //  })
      //}

      //if ( trigger.action.with !== undefined ) {
      //  trigger.action.width.forEach( function( _src, i ) {
      //    // init.filemanager1 [trigger.action.method]()
          // mixer.pod = -1 ?

      //    _self.jump( _src )


      //  })
    //  }
    //});
  }

  _self.jump = function( _src ) {
    console.log("how high?", _src )
    _src.video.currentTime = Math.random() * _src.video.duration
  }

  // ---------------------------------------------------------------------------
  var sheet_pointer = 0
  var old_sheet_pointer = 0
  var sheet_index = 0

  _self.checkSheets = function() {
     // _self.beats%_self.sheets[0].length
     var __beats = sheet_pointer%_self.sheets[ sheet_index ].length
    // console.log("check", sheet_pointer,  sheet_pointer%_self.sheets[0].length)
    // if ( old_sheet_pointer != sheet_pointer ) {
      // console.log( "Boem:", __beats, sheet_pointer, "sheets:", _self.sheets[0][sheet_pointer%_self.sheets[0].length] )

      checkBeats(sheet_pointer%_self.sheets[ _self.sheet_index ].length)


      _self.sheets[ _self.sheet_index ][sheet_pointer%_self.sheets[ _self.sheet_index ].length].forEach( function( trigger_pointer ) {


        if ( trigger_pointer[0] != "....." ) {
          console.log(trigger_pointer)
          //console.log( _self.script.composition[ trigger_pointer[0] ] )

          var target = _self.script.composition[ trigger_pointer[0] ].target
          var _functions = _self.script.composition[ trigger_pointer[0] ].functions // BLEND

          var _function = null
          _functions.forEach( function( _func, i ) {
            // var _function = _self.script.composition[ trigger_pointer[0] ].functions // BLEND
            if ( trigger_pointer[1] == _func[0] ) {
              console.log("TRIGGERED", _function = _func[2])
              var _args = trigger_pointer[2]  // BLEND //isnan?
              if ( !isNaN(trigger_pointer[2]) ) {
                  _args = parseFloat(trigger_pointer[2])
              }else{
                  _args = trigger_pointer[2]  // BLEND //isnan?
              }

              target[ _func[2] ](_args);

              console.log(target, _function, _args)

            }
          })
        }

      })
    //}
    sheet_pointer += 1
    setTimeout( _self.checkSheets, ((60/bpm.bpm)*1000)/4 )
  }

  var fireTrigger = function(trigger) {
    if ( trigger[0].action.method !== undefined ) {
      trigger[0].action.on.forEach( function( _obj ) {
        console.log("DO", trigger[0].action.method, "on", _obj.uuid, "args",  trigger[0].action.args )
        //_obj[trigger[0].action.method]( trigger[0].action.args  )
      })
      return true
    }

    if ( trigger[0].action.set !== undefined ) {
      trigger[0].action.on.forEach( function( _obj ) {
        //console.log("SET", trigger[0].action.args, "on", trigger[0].action.set, "at", _obj.uuid )
        _obj[trigger[0].action.set] = trigger[0].action.args
      })
      return true
    }

    if ( trigger[0].action.internal !== undefined ) {
      trigger[0].action.on.forEach( function( _obj ) {
        _self[ trigger[0].action.internal ](_obj)
        //console.log("INTERNAL",  trigger[0].action.args, "on", _obj.uuid )
      })
      return true
    }
  }

  var checkTriggers = function()  {

    var kill = []

    triggers.forEach( function( trigger, i) {

      var had_update = false
      if ( trigger[0].mod.type == "seconds" || trigger[0].mod.type == "random-seconds" ) {
        if ( _self.time > trigger[1] ) {
          //console.log("TRAEDASDASASDADSDAS SECONDS", trigger[0].mod.type  )
          had_update = fireTrigger( trigger )
        }

      }else if ( trigger[0].mod.type == "beats" || trigger[0].mod.type == "random-beats" ) {
        //console.log("-->", trigger, trigger[0].mod.type, trigger[1], _self.beats, ">", trigger[1])
        if (  _self.beats > trigger[1] ) {
          had_update = fireTrigger( trigger )
        }
      }

      if (had_update) {
         if ( trigger[0].mod.repeat == true ) addTrigger( trigger[0] )
         if ( trigger[0].mod.after !== null ) addTrigger( _self.script.triggers[ trigger[0].mod.after ] )
         triggers.splice(i, 1)
      }
    })
  } //

  setTimeout( function() {
    // filemanager1.change()
    // filemanager2.change()
    // filemanager3.change()
    // filemanager4.change()

  }, 12000)


  var changez_mod = 8000
  var jump_mod = 7200
  var scratch_mod = 12000

  //setTimeout(function(){
  //  filemanager1.changez()
  //  filemanager2.changez()
  //  filemanager3.changez()
  //  filemanager4.changez()
  //}, 16000 )

  // this is a hokey pokey controller
  // call this a behaviour?

  /*
  function changez() {
    if (Math.random() > 0.25 ) {
      filemanager1.change();
    }else if (Math.random() > 0.50 ) {
      filemanager2.change();
    }else if (Math.random() > 0.75 ) {
      filemanager3.change();
    }else{
      filemanager4.change();
    }
    var r = Math.floor( Math.random() * changez_mod )
    setTimeout( function() {
      changez()
    }, r )
  };
  */
  //changez()


  /*
  function jumps() {
    var r = Math.floor( Math.random() * jump_mod )
    setTimeout( function() {
      jumps()
    }, r )

    try {
      if (Math.random() > 0.5 ) {
        testSource1.video.currentTime = Math.random() * testSource1.video.duration
        console.log("src 1 jumps")
      }else{
        testSource2.video.currentTime = Math.random() * testSource2.video.duration
        console.log("src 2 jumps")
      }
    }catch(err) {}
  };
  jumps()


  function scratch() {
    var r = Math.floor( Math.random() * scratch_mod )
    setTimeout( function() {
      scratch()
    }, r )

    try {
      var rq = ( Math.random() * 0.6 ) + 0.7
      //var rq = Math.pow( (Math.random() * 0.5), 0.3 )
      if ( Math.random() > 0.5 ) {
        testSource1.video.playbackRate = rq //+ 0.7
        console.log("src 1 scxratches", rq)
      }else{
        testSource2.video.playbackRate = rq //+ 0.7
        console.log("src 1 scxratches", rq)
      }
    }catch(err) { console.log("err:", err)}
  };
  scratch()
  */
}

 /**
  * @constructor Controller
  * @interface

  * @summary
  *   The Controller Class covers a range of input-output nodes in between either sources and mixers
  *
  * @description
  *   The Controller Class covers a range of interfaces to popular input devices. Keyoard, Midi, Gamepad and Sockets
  *
  *
  *
  *
  *
  *
  * @author Sense studios
  */

function Controller( options ) {
  var _self = this

  // set options
  var _options;
  if ( options != undefined ) _options = options;

  _self.type = "Controller"
  _self.testControllerVar = "test"

  // program interface
  _self.init =         function() {}
  _self.update =       function() {}
  _self.render =       function() {}
}

GamePadController.prototype = new Controller();
GamePadController.constructor = GamePadController;

/**
 * @summary
 *  Search and initialize a Gamepad and make event listeners available.
 *  tested with X Box controller
 *  Gamepad Example on codepen:
 *  <a href="https://codepen.io/xangadix/pen/gEzZgx" target="_blank">codepen</a>
 *
 *
 * @description
 *   Check for an example this [video on Youtue](https://www.youtube.com/watch?v=N1AOX8m6U04)
 *   This goes in part with this [Codepen Demo](https://codepen.io/xangadix/pen/gEzZgx)
 *   Buttons are on 0, 1, 2, 3, 4 ... n, axis are on 100, 101, 102, 103, ... 10n
 *
 *  ```
 *   1. button 1
 *   2. button 2
 *   3. button 3
 *   4. button 4
 *   ...
 *   n. button n
 *
 *   100. axis1 x
 *   101. axis1 y
 *   102. axis2 x
 *   103. axis2 y
 *   ...
 *   10n. axisn y
 *   10n. axisn y
 *  ```
 *  ---
 *
 * @example
 *
 *  var gamepad1 = new GamePadController( renderer, {});
 *  gamepad1.init()
 *  gamepad1.render()
 *
 *  // do something on button 1, should return [ 1, 1 ] on down and [ 1, 0 ] on keyup
 *  gamepad1.addEventListener( 1, function( _arr ) { console.log( _arr ) })
 *
 *  // do something with left-axis-x, should return [ 100, 0.34295876 ]
 *  gamepad1.addEventListener( 100, function( _arr ) { console.log( _arr ) })
 *
 *
 * @implements Controller
 * @constructor Controller#GamePadController
 * @param {GlRenderer} renderer - GlRenderer object
 * @param options:Object
 * @author Sense Studios
 */

function GamePadController( _renderer, _options  ) {
  var _self = this

  // exposed variables.
  _self.uuid = "GamePadController_" + (((1+Math.random())*0x100000000)|0).toString(16).substring(1);
  _self.type = "Control"
  _self.controllers = {};
  _self.gamepad = {}

  /**  @member Controller#GamePadController#bypass {boolean}*/
  _self.bypass = true

  /** @member Controller#GamePadController#debug {boolean}*/
  _self.debug = false

  /**
   * @description
   *  when multiple devices identify as gamepads, use ie. `gamepad1.gamepad_index = 1` to select the second gamepad [0, 1, 2,  ...]
   *  @member Controller#GamePadController#gamepad_index {integer}
  */
  _self.gamepad_index = 0

  if ( _options ) {
    if ("default" in _options) {}
  }

  // add to renderer
  _renderer.add(_self)

  // counter
  var c = 0

  /**
   * @description
   *  connect, should be automatic, but you can always call gamepad1.connect()
   * @function Controller#GamePadController.connect
   *
  */
  _self.connect =  function() {
    console.log("start gamepads")

    window.addEventListener("gamepadconnected", function(e) {
      console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.",
        e.gamepad.index, e.gamepad.id,
        e.gamepad.buttons.length, e.gamepad.axes.length);
      _self.init()
    });

    window.addEventListener("gamepaddisconnected", function(e) {
      console.log("Gamepad disconnected from index %d: %s",
        e.gamepad.index, e.gamepad.id);
    });

    _self.bypass = false
  }

  /**
   * @description
   *  init, should be automatic, but you can always call gamepad.init() yourself
   * @function Controller#GamePadController~init
   *
  */
  _self.init = function() {
    console.log("init GamePadController.")
    setTimeout( function() {
      try { // try connect
        _self.connect()
      }catch(e){
        console.log("Initial connect failed, hope somebody presses the button v14 ", _self, e)
      }
    }, 1200 )
  }

  /**
   * @description
   *  update, should be automatic, but you can always call gamepad1.update()
   * @function Controller#GamePadController~update
   *
  */
  _self.update = function() {
    if ( _self.bypass ) return;

    // too much info ?
    if ( _self.debug ) console.log( navigator.getGamepads()[0].axes )
    if ( _self.debug ) console.log( navigator.getGamepads()[0].buttons )

    if ( navigator.getGamepads()[_self.gamepad_index] === undefined || navigator.getGamepads()[0] === null ) {
      console.log("Gamepad: No gamepad could be found")
      _self.bypass = true
      return;
    }

    var last_axis = 0
    navigator.getGamepads()[_self.gamepad_index].axes.forEach( function(a, i) {
      dispatchGamePadEvent([i+100, a])

      /*
      if ( _self.easing ) {
        if ( ( a >= 0.12 || a <= -0.12 ) && a != last_axis ) {
          if (_self.debug) console.log(" Axis: ", i + 100, a )
          dispatchGamePadEvent([i+100, a])
          last_axis = a
        }else{
          if (last_axis != 0 ) {
            dispatchGamePadEvent([i+100, 0])
          }
          last_axis = 0
        }
      }
      */
    });

    navigator.getGamepads()[_self.gamepad_index].buttons.forEach(function(b, i){
      if ( b.pressed ) {
        if (_self.debug) console.log(" Button: ", i, b.value, b )
        dispatchGamePadEvent([i, b.value])
      }
    })
  }

  _self.render = function() {
    return _self.controllers
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  var nodes = []

  /**
   * @description
   *  removeEventListener
   * @example
   *  gamepad.removeEventListener(1)
   * @function Controller#GamePadController#removeEventListener
   * @param {integer} _target - the number of controller being pressed
   *
  */
  self.removeEventListener = function() {}

  /**
   * @description
   *  addEventListener
   * @example
   *  function doSomething(_arr ) {
   *    console.log('pressed1', arr)
   *  }
   *  gamepad.addEventListener(1, function() )
   *
   * @function Controller#GamePadController#addEventListener
   * @param {integer} _target - the number of controller being pressed
   * @param {function} _callback - the callback to be executed
   *
  */
  _self.addEventListener = function( _target, _callback ) {
    nodes.push( { target: _target, callback: _callback } )
    console.log("Gamepad listeners: ", nodes)
  }

  // private? const?
  var dispatchGamePadEvent = function( _arr ) {
    nodes.forEach( function( node, i ) {
      if ( _arr[0] == node.target ) {
        node.callback( _arr )
      }
    })
  }

  /**
   * @description
   *  getNodes -- helper, shows current nodes
   * @function Controller#GamePadController#getNodes
  */
  _self.getNodes = function() {
    return nodes
  }
}

KeyboardController.prototype = new Controller();
KeyboardController.constructor = KeyboardController;

/**
 * @summary
 *  implements keyboard [charcodes](https://www.cambiaresearch.com/articles/15/javascript-char-codes-key-codes) as controllerevents
 *  Keyboard Example on codepen:
 *  <a href="https://codepen.io/xangadix/pen/NJzxNy" target="_blank">codepen</a>
 *
 * @description
 *  This controller converts keyboard listeners to a Controller. Events are triggered through keyboard [charcodes](https://www.cambiaresearch.com/articles/15/javascript-char-codes-key-codes)
 *  It's mainly purposed as an identical interface to the other controllers. Nothing stops you from implementing your own keyboardlisteners
 *
 *
 * @example
 *  var keyboard = new KeyboardController( renderer, {});
 *  keyboard.init();
 *  keyboard.render();
 *
 *  // enter button, should return [13, 1] on keydown and [13,0] on keyup
 *  keyboard.addEventListener( 13, function(_arr) { console.log(_arr) })
 *
 *
 * @implements Controller
 * @constructor Controller#KeyboardController
 * @param options:Object
 * @author Sense Studios
 */

function KeyboardController( _renderer, _options  ) {
  // returns a floating point between 1 and 0, in sync with a bpm
  var _self = this

  // exposed variables.
  _self.uuid = "KeyboardController_" + (((1+Math.random())*0x100000000)|0).toString(16).substring(1);
  _self.type = "Control"
  _self.controllers = {};
  _self.keyboard = {}

  /** @member Controller#KeyboardController#debug {boolean} */
  _self.bypass = true

  /** @member Controller#KeyboardController#debug {boolean} */
  _self.debug = false

  if ( _options ) {
    if ("default" in _options) {}
  }

  // add to renderer
  _renderer.add(_self)

  var c = 0      // counter

  /**
   * @description
   *  init, should be automatic, but you can always call my_keyboard.init()
   * @function Controller#KeyboardController~init
   *
  */
  _self.init = function() {
    console.log("init KeyboardController.")

    document.addEventListener('keydown', (event) => {
      if (_self.debug) console.log( " down ", [ event.keyCode, 1 ] )
      dispatchkeyboardEvent( [ event.keyCode, 1 ] )
    })

    document.addEventListener('keyup', (event) => {
      // const keyName = event.key;
      if (_self.debug) console.log( " up ", [ event.keyCode, 0 ] )
      dispatchkeyboardEvent( [ event.keyCode, 0 ] )
    })

  }

  /**
   * @description
   *  update, should be automatic, but you can always call my_keyboard.update()
   * @function Controller#KeyboardController~update
   *
  */
  _self.update = function() {
    if ( _self.bypass ) return;

  }

  /**
   * @description
   *  render, should be automatic, but you can always call my_keyboard.render()
   * @function Controller#KeyboardController~render
   *
  */
  _self.render = function() {
    return _self.controllers
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  var nodes = []

  /**
   * @description
   *  removeEventListener
   * @example
   *  keyboard.removeEventListener(1)
   * @function Controller#KeyboardController#removeEventListener
   * @param {integer} _target - the number of controller being pressed
   *
  */
  self.removeEventListener = function() {}

  /**
   * @description
   *  addEventListener
   * @example
   *  function doSomething( _arr ) {
   *    console.log('pressed1', arr);
   *  }
   *  keyboard.addEventListener(1, function( _arr ) { console.log( _arr ) } );
   *
   * @function Controller#KeyboardController#addEventListener
   * @param {integer} _target - the number of controller being pressed keyboard [charcodes](https://www.cambiaresearch.com/articles/15/javascript-char-codes-key-codes) as controllerevents
   * @param {function} _callback - the callback to be executed
   *
  */
  _self.addEventListener = function( _target, _callback ) {
    nodes.push( { target: _target, callback: _callback } )
    console.log("Keyboard listeners: ", nodes)
  }

  /**
  * @function Controller#KeyboardController~dispatchkeyboardEvent
  */
  var dispatchkeyboardEvent = function( _arr ) {
    nodes.forEach( function( node, i ) {
      if ( _arr[0] == node.target ) {
        node.callback( _arr )
      }
    })
  }

  /**
   * @description
   *  getNodes, helper, shows current nodes
   * @function Controller#KeyboardController#getNodes
  */
  _self.getNodes = function() {
    return nodes
  }
}

MidiController.prototype = new Controller();
MidiController.constructor = MidiController;

/**
 * @summary
 *  Connects a midicontroller with a range of listeners. Can also send commands Back
 *  Midi Example on codepen: 
 *  <a href="https://codepen.io/xangadix/pen/BbVogR" target="_blank">codepen</a>
 *
 * @description
 *  The Midi class searches and Connects to a midicontroller with a range of listeners.
 *  You can also send commands _back_. This is especially handy when you can control
 *  lights or automatic faders on your MIDI Controller.
 *
 *  Here is a demo on [Codepen](https://codepen.io/xangadix/pen/BbVogR), which was tested with 2 AKAI midicontrollers
 *
 *  The original implementation is on GitHub in a [Gist](https://gist.github.com/xangadix/936ae1925ff690f8eb430014ba5bc65e).
 *
 * @example
 *  var midi1 = new MidiController();
 *  midi1.addEventListener( 0, function(_arr) { console.log( " Midi received", _arr ) } ) ;
 *  // button 0, returns [ 144, 0, 1 ]
 *
 *  // use debug for more information
 *  midi.debug = true;
 *
 * @implements Controller
 * @constructor Controller#MidiController
 * @param options:Object
 * @author Sense Studios
 */

function MidiController( _options ) {
  // base

  // returns a floating point between 1 and 0, in sync with a bpm
  var _self = this

  // exposed variables.
  _self.uuid = "MidiController_" + (((1+Math.random())*0x100000000)|0).toString(16).substring(1);
  _self.type = "MidiController"

  /** @member Controller#KeyboardController#debug {boolean} */
  _self.bypass = true

  /** @member Controller#KeyboardController#debug {boolean} */
  _self.debug = false

  /** @member Controller#KeyboardController~debug {boolean} */
  _self.ready = false

  /** @member Controller#KeyboardController~debug {object} */
  _self.controllers = {}
  var binds = []
  var nodes = []
  var c = 0 // counter
  var midi, input, output

  /** @function Controller#KeyboardController~success {object} */
  var success = function(_midi) {
  	midi = _midi
  	var inputs = midi.inputs.values();
  	var outputs = midi.outputs.values();

  	for (i = inputs.next(); i && !i.done; i = inputs.next()) {
  		input = i.value;
      input.onmidimessage = _self.onMIDIMessage;
  	}

  	for (o = outputs.next(); o && !o.done; o = outputs.next()) {
  		output = o.value;
      //if ( _self.debug ) console.log(" MIDI INITIALIZED", "ready")
  	}

    console.log("Midi READY? ", output, midi)
    if ( output != undefined ) _self.ready = true
    if ( output != undefined ) _self.bypass = false
  }

  // everything went wrong.
  /** @function Controller#KeyboardController~failure {object} */
  var failure = function (_fail) {
  	console.error('No access to your midi devices.', _fail);
  }

  // request MIDI access
  console.log("Midi check... ")
  if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess()
      .then( success, failure );
  }

  // some examples, this is the 'onpress' (and on slider) function
  var doubleclickbuffer = [ 0, 0, 0, 0 ]
  var doubleclickPattern = [ 128, 144, 128, 144 ]
  var doubleclick = false

  /** @function Controller#KeyboardController~onMIDIMessage {event} */
  _self.onMIDIMessage = function(e) {
    if (_self.debug) console.log(" MIDIMESSAGE >>", e.data)
    dispatchMidiEvent(e)

    // hello from midi
    // console.log(e.data)

    // Uint8Array(3) [176, 48, 117]
    // [ state, key, velocity ]
    // state
    // 144 = down
    // 112 = up
    // 176 = sliding ( fader )
    //

    // This is mainly experimental code for doubleclicking
    // we could return this as 256, 257 or higher state values (?)

    /*
    var opaque = false
    if (doubleclick) return
    doubleclickbuffer.unshift([ e.data[0], e.data[1] ])
    doubleclickbuffer.pop()

    if ( doubleclickbuffer.map(function(m) { return m[0] } ).join(",") == doubleclickPattern.join(",") ) {

      console.log("blink1")
      // update event listeners
      listeners.forEach( function( val, i ) {
        // doubleclick
        if ( val.btn == e.data[1] ) {
          val.cb( e.data, true )
        }
      })

      if ( doubleclickbuffer.map( function(m) { return m[1] } ).every( (val, i, arr) => val === arr[0] ) ) {
        doubleclickbuffer = [ 0, 0, 0, 0 ]

        // DO STUFF ON DOUBLECLICK
        _self.output.send( [ 0x90, e.data[1], GREEN_BLINK ] )
        doubleclick = true

        // chain1.setChainLink(e.data[1], faders[e.data[1]]/126)
        faders_opaque[e.data[1]] = 1
        // var source = chain1.getChainLink( e.data[1] )
        // if (source.video) source.video.currentTime = Math.random() * source.video.duration

        setTimeout(function() { doubleclickbuffer = [ 0, 0, 0, 0 ]; doubleclick = false}, 350)
        return
      }
    }

    // update event listeners
    listeners.forEach( function( val, i ) {
      // doubleclick
      if ( val.btn == e.data[1] ) {
        val.cb( e.data, false )
      }
    })

    setTimeout(function() { doubleclickbuffer = [ 0, 0, 0, 0 ]; doubleclick = false }, 350)
    //console.log( doubleclickbuffer )

    if (e.data[1] == 48) {
      //console.log( e.data[2] / 126 )
      //testSource2.video.playbackRate  = e.data[2] / 56
      //console.log(e.data[2])
      //if ( faders_opaque[0] ) chain1.setChainLink (0, e.data[2]/126 )
      faders[0] = e.data[2]
    }

    if (e.data[1] == 49) {
      //testSource3.video.playbackRate  = e.data[2] / 56
      //if ( faders_opaque[1] ) chain1.setChainLink (1, e.data[2]/126 )
      faders[1] = e.data[2]
    }

    if (e.data[1] == 50) {
      //testSource4.video.playbackRate  = e.data[2] / 56.0
      //if ( faders_opaque[2] ) chain1.setChainLink (2, e.data[2]/126 )
      faders[2] = e.data[2]
    }

    if (e.data[1] == 51) {
      //testSource4.video.playbackRate  = e.data[2] / 56.0
      //if ( faders_opaque[3] ) chain1.setChainLink (3, e.data[2]/126 )
      faders[3] = e.data[2]
    }

  	if (e.data[1] == 64) {
  		// switch everything off
  		var commands = []
  		midimap.forEach( function( row, i ) {
  			row.forEach( function( value, j ) {
  				commands.push(0x90, value, OFF)
  			})
  		})

  		rest.forEach( function( r, i ) {
  			commands.push( 0x90, r, OFF )
  		})
  		_self.output.send(commands)

  	}else if (e.data[1] == 65) {
  		// switch the main pads yellow
  		var commands = []
  		midimap.forEach( function( row, i ) {
  			row.forEach( function( value, j ) {
  				commands.push( 0x90, value, YELLOW )
  			})
  		})
      _self.output.send( commands )

  	}else{
  		// press a button, make it green
      if (e.data[0] == 128 ) {
        _self.output.send( [ 0x90, e.data[1], OFF ] );
        //chain1.setChainLink(e.data[1], 0)
        //console.log("toggle chain")
        doubleclick = false
      }

      if (e.data[0] == 144  ) {
        _self.output.send( [ 0x90, e.data[1], GREEN ] );
        //chain1.setChainLink(e.data[1], faders[e.data[1]]/126)
        //console.log("toggle chain", faders[e.data[1]], e.data[1] )
        faders_opaque[e.data[1]] = 0
        doubleclick = false
      }
  	}
    */
  }

  // ---------------------------------------------------------------------------
  /** @function Controller#KeyboardController~init  */
  _self.init = function() {}

  /** @function Controller#KeyboardController~update  */
  _self.update = function() {}

  /**
   * @description
   *  send midi data back to the controller. To switch a light on, or to make it
   *  change color. Theorettically you should be able to control motorized faders
   *  too, but I haven't tested that. Lights is nice though.
   *
   *  try to send evertything in one blob and try not to do all kinds of little
   *  updates, it'll crash your midi controller (it crashed mine)
   *
   *
   * @example
   *  // make button 0 yellow, if a video reports 'seeking'
   *  testSource1.video.addEventListener('seeking', function() { midi1.send([ 0x90, 0, 6] );} )
   *
   *  // don't forget to switch it off again
   *  testSource1.video.addEventListener('seeked', function() { midi1.send([ 0x90, 0, 5] );} )
   *
   *  // make button 8-11 and button 16-19 green (tested with an Akai APC Mini)
   *
   *  midi1.send([ 0x90, 8, 1, 0x90, 9, 1, 0x90, 10, 1, 0x90, 11, 1, 0x90, 16, 1, 0x90, 17, 1, 0x90, 18, 1, 0x90, 19, 1])
   *
   * @function Controller#MidiController#send
   * @param {array} commands - the sequence that needs execution
   *
  */
  _self.send = function( commands ) {
    if (_self.ready) {
      console.log("Midi send ", commands, "to", output)
      output.send( commands )
    }else{
      console.log("Midi is not ready yet")
    }
  }

  /**
   * @description
   *  clears all the buttons (sets them to 0)
   * @example
   *  midi.clear()
   * @function Controller#MidiController#clear
   *
  */
  _self.clear = function() {
    var commands = []
    for( var i = 0; i++; i < 100 ) commands.push( 0x90, i, 0 );
    output.send(commands)
  }

  /**
   * @description
   *  removeEventListener
   * @example
   *  midi.removeEventListener(1)
   * @function Controller#MidiController#removeEventListener
   * @param {integer} _target - the number of controller being pressed
   *
  */
  self.removeEventListener = function( _target ) {
    nodes.forEach( function(node, i ) {
      if ( node.target == _target ) {
        var removeNode = i
      }
    })
    nodes.splice(i, 1)
  }

  /**
   * @description
   *  addEventListener, expect an array of three values, representing the state and value of your controller
   *
   * @example
   *  function doSomething(_arr ) {
   *    console.log('pressed1', arr) // [ 144, 0, 1 ]
   *  }
   *  midicontroller.addEventListener(1, function() )
   *
   * @function Controller#MidiController#addEventListener
   * @param {integer} _target - the number of controller being pressed
   * @param {function} _callback - the callback to be executed
   *
  */
  _self.addEventListener = function( _target, _callback,  ) {
    nodes.push( { target: _target, callback: _callback } )
    console.log("MIDI listeners: ", nodes)
  }

  /** @function Controller#KeyboardController~dispatchMidiEvent {event}  */
  var dispatchMidiEvent = function(e) {
    nodes.forEach(function( _obj ){
      if ( _obj.target == e.data[1] ) {
        _obj.callback(e.data)
      }
    });
  }
}

SocketController.prototype = new Controller();
SocketController.constructor = SocketController;

/**
 * @summary
 *  A Socket controller connects a socket on the client with a sever. This only works if you run the app yourself with a server. And on our website
 *
 * @description
 *  To connect the controller with a client-mixer, you need to place a controller in both. The client will give you a code like _a7fw_ . Use that code in the client-mixer and receive events.
 *  If configured correctly you should be able to send events to multiple clients.
 *
 * @example
 *
 *  // in your client (output)
 *  // https://virtualmixproject.com/mixer/demo_socket_client
 *
 *  var socket1 = new SocketController( renderer )
 *  socket1.debug = true
 *
 *  // this should log a server welcome object with a uid
 *  // got command {command: "welcome", payload: "8170"}

 *  console.log(socket1.target)
 *  > 8170
 *
 *  // should give you an string:"8170",
 *  // make sure your user sees this string, so he can connects his _remote_ to this _client_
 *
 *  // optionally listen for the ready signal, which gives you the id too
 *  socket1.addEventListener("ready", function(d) console.log("client id:", d ));
 *  > client id: 8170
 *
 *  // write the rest of your listeners
 *  socket1.addEventListener( 1, function( _arr1 ) {
 *   // do something with _arr1
 *  })
 *
 *  socket1.addEventListener( 2, function( _arr2 ) {
 *   // do something with _arr2
 *  })
 *
 *  socket1.addEventListener( 3, function( _arr3 ) {
 *   // do something with _arr3
 *  })
 *
 *  - - -
 *
 *  // in your controller (input, 'remote control')
 *  // https://virtualmixproject.com/remotes/demo_socketcontroller_remote
 *
 *  var socketcontroller = new SocketController()
 *
 *  // make a way to enter the client-id: ( in this example: 8170 )
 *  var get_client_id = ()=> { return document.getElementById('socket_client_id').value }
 *
 *  // send trigger 1 to socket get_client_id, may send to multiple ids: "8170,af44" always lowecase
 *  // _commands are mostly arrays of numbers or strings, but can be interpreted on the client.
 *  // [ "mixer1", "blend", 6 ]
 *  // [ "mixer1", "pod", gamepad1.x-axis ]
 *  // etc.
 *
 *  socketcontroller.send( get_client_id(), 1, [1,1] );
 *  socketcontroller.send( get_client_id(), 1, [1,0] );
 *
 * @implements Controller
 * @constructor Controller#SocketController
 * @param options:Object
 * @author Sense Studios
 */

function SocketController( _options  ) {

  var _self = this;

  /** @member Controller#SocketController#io */
  _self.io = io.connect();

  // exposed variables.
  _self.uuid = "SocketController_" + (((1+Math.random())*0x100000000)|0).toString(16).substring(1);
  _self.type = "Control"
  _self.bypass = true
  _self.title = ""

  /** * @member Controller#SocketController#debug */
  _self.debug = false

  /** @member Controller#SocketController#socket_pairing_id */
  _self.socket_pairing_id = "no_paring_id"

  /** @member Controller#SocketController#target */
  _self.target = ""

  var nodes = []

  if ( _options ) {
    if ( "title" in _options ) _self.title = _options.title
  }

  // test
  _self.io.on('test', function( msg ) {
    console.log( 'got test', msg )
  })

  // command
  _self.io.on('command', function( _command ) {
    console.log( 'got command', _command )

    // always send the welcome command, might rename, it can be fired after server resets
    if ( _command.command == "welcome") {
      _self.target = _command.payload

      // dispatch it as welcome command
      nodes.forEach( function( node, i ) {
        if ( node.target == "welcome" || node.target == "ready" ) {
          node.callback(_command.payload)
        }
      })
    }

    // when a reset of the target is requested
    if ( _command.command == "reset_uuid") {
      console.log("reset uuid", _command.payload)
      _self.target = _command.payload

      // dispatch it as reset  command
      nodes.forEach( function( node, i ) {
        if ( node.target == "reset_uuid" || node.target == "reset" ) {
          node.callback(_command.payload)
        }
      })

    }

    // Depricated, write your own html to display
    if ( document.getElementById('sockets')) document.getElementById('sockets').innerHTML += "<div>" + _self.title  + " Socket: " + _self.target + "</div>"
  })

  // controller command
  _self.io.on('controller', function(_msg) {
    if ( _self.debug ) console.log( 'got controller', _msg )
    nodes.forEach( function( node, i ) {
      if ( _self.debug ) console.log("find node", i, node, _msg, _self.target)
      if (_msg.client == _self.target && node.target == _msg.trigger ) {
        if ( _self.debug ) console.log("execute callback!")
        node.callback(_msg.commands)
      }
    })
  })

  // ---
  // ---------------------------------------------------------------------------

  /**
   * @description
   *  send info, an _commands array, to a client
   * @example
   *  socketcontroller.send( "a78r", 0, [ "mixer1", "blend", 6 ] )
   *  socketcontroller.send( "a78r", 112, [ "mixer1", "pod", gamepad1.x-axis ] )
   *  socketcontroller.send( "a78r", 15, [ 1, 2, 3, 4 ] )
   *
   * @function Controller#SocketController#send
   * @param {string} _client - the client uid to be sent to, ie. ad48
   * @param {integer} _trigger - unique id of the command, to be interpreted on the client
   * @param {array} _commands - the actual _commands being send
   *
  */
  _self.send = function( _client, _trigger, _commands ) {
    if ( _self.debug ) console.log("Socket send to: ", _client, ", trigger:", _trigger, " commands ", _commands )
    _self.io.emit("controller", { client: _client, trigger: _trigger, commands: _commands } )
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * @description
   *  removeEventListener, removes event listeners.
   * @example
   *  socketcontroller.removeEventListener(1)
   * @function Controller#SocketController#removeEventListener
   * @param {integer} _trigger - the unique id of the command to be sent
   *
  */
  self.removeEventListener = function( _trigger ) {
    nodes.forEach( function(node, i ) {
      if ( node.target == _trigger ) {
        var removeNode = i
      }
    })
    nodes.splice(i, 1)
  }

  /**
   * @description
   *  addEventListener
   * @example
   *  function doSomething(_arr ) {
   *    console.log('pressed1', arr)
   *  }
   *  socketcontroller.addEventListener(1, function() )
   *
   * @function Controller#SocketController#addEventListener
   * @param {integer} _trigger - the unique id of the command to be sent
   * @param {function} _callback - a function that executes when the trigger fires
   *
  */
  _self.addEventListener = function( _trigger, _callback,  ) {
    nodes.push( { target: _trigger, callback: _callback } )
    console.log("Socket listeners: ", nodes)
  }

  /** @function Controller#KeyboardController~dispatchMidiEvent {event}  */
  var dispatchSocketEvent = function( _arr ) {
    nodes.forEach( function( node, i ) {
      if ( _arr[0] == node.target ) {
        node.callback( _arr )
      }
    })
  }
}

/*
 * Not sure what I meant by this
 *
*/

function SourceControl( renderer, source ) {}

/**
 * @constructor Effect
 * @interface

 * @summary
 *   The Effect Class covers a range of input-output-nodes.
 *   Effects example on codepen:
 *   <a href="https://codepen.io/xangadix/pen/eXLGwJ" target="_blank">codepen</a>
 *
 * @description
 *   The effect class covers a range of input-output nodes in between either sources and mixers
 *   Or mixers and mixers. It depends if the effect needs UV control whichj only works on samplers.
 *   Broadly I've split up a number of effects in
 *    * DistortionEffects, handling all kind of UV processes on samplers and more
 *    * FeedbackEffects, with an extra canvas all effects that involve layering are here
 *    * ColorEffects, all effects doing with colors, works on mixers as well
 *
 *   Connection flow:
 *   ```
 *     SOURCE ---> EFFECT1 --> MIXER --> EFFECT2 --> ... ---> OUTPUT
 *   ```
 *
 *   Effects example on codepen:
 *   <a href="https://codepen.io/xangadix/pen/eXLGwJ" target="_blank">codepen</a>
 *
 *
 * @author Sense studios
 */


 function Effect( renderer, options ) {
   var _self = this

   _self.type = "Effect"

   // program interface
   _self.init =         function() {}
   _self.update =       function() {}
   _self.render =       function() {}
 }

ColorEffect.prototype = new Effect(); // assign prototype to marqer
ColorEffect.constructor = ColorEffect;  // re-assign constructor

/**
 * @summary
 *   The color effect has a series of color effects, ie. implements a series of operations on rgba
 *   Effects Example on codepen:
 *   <a href="https://codepen.io/xangadix/pen/eXLGwJ" target="_blank">codepen</a>
 *
 *
 * @description
 *   Color effect allows for a series of color effect, mostly
 *   mimicing classic mixers like MX50 and V4
 *  ```
 *  1. Normal (default),
 *
 *  //  negatives
 *  2. Negative 1,
 *  3. Negative 2,
 *  4. Negative 3,
 *  5. Negative 4,
 *  6. Negative 5,
 *
 *  // monocolors
 *  10. Monocolor red,
 *  11. Monocolor blue,
 *  12. Monocolor green,
 *  13. Monocolor yellow,
 *  14. Monocolor turqoise,
 *  15. Monocolor purple,
 *  16. Sepia,
 *  17. Sepia,
 *
 *  // color swapping
 *  [20-46], swaps colors like rgb => gbg => rga => etc.
 *
 *  // keying, use extra(float) for finetuning
 *  50. Luma key (black key, white key?)
 *  51. Green key
 *
 *  // old school, use extra(float) for finetuning
 *  52. Paint
 *  53. Colorize
 *
 *  // image processing ( http://blog.ruofeidu.com/postprocessing-brightness-contrast-hue-saturation-vibrance/ )
 *  60. Brightness
 *  61. Contrast
 *  62. Saturation
 *  63. Hue
 *  64. Hard black edge. black/white.

    70. CCTV

 *  ```


 *
 * @example
 *   let myEffect = new ColorEffect( renderer, { source: myVideoSource, effect: 1 });
 *
 * @constructor Effect#ColorEffect
 * @implements Effect
 * @param renderer:GlRenderer
 * @param options:Object
 * @author Sense Studios
 */
function ColorEffect( _renderer, _options ) {

  // create and instance
  var _self = this;

  // set or get uid
  if ( _options.uuid == undefined ) {
    _self.uuid = "ColorEffect_" + (((1+Math.random())*0x100000000)|0).toString(16).substring(1);
  } else {
    _self.uuid = _options.uuid
  }

  // add to renderer
  _renderer.add(_self)

  _self.type = "Effect"
  _self.debug = false

  var source = _options.source // mandatory
  var currentEffect = 1
  if ( _options.effect != undefined ) currentEffect = _options.effect
  var currentExtra = 0.8
  if ( _options.extra != undefined ) currentExtra = _options.currentExtra

  _self.init = function() {
    // add uniforms to renderer
    _renderer.customUniforms[_self.uuid+'_currentcoloreffect'] = { type: "i", value: currentEffect}
    _renderer.customUniforms[_self.uuid+'_extra'] = { type: "f", value: currentExtra }

    // add uniforms to fragmentshader
    _renderer.fragmentShader = _renderer.fragmentShader.replace('/* custom_uniforms */', 'uniform vec4 '+_self.uuid+'_output;\n/* custom_uniforms */')
    _renderer.fragmentShader = _renderer.fragmentShader.replace('/* custom_uniforms */', 'uniform int '+_self.uuid+'_currentcoloreffect;\n/* custom_uniforms */')
    _renderer.fragmentShader = _renderer.fragmentShader.replace('/* custom_uniforms */', 'uniform float '+_self.uuid+'_extra;\n/* custom_uniforms */')

    if ( renderer.fragmentShader.indexOf('vec4 coloreffect ( vec4 src, int currentcoloreffect, float extra, vec2 vUv )') == -1 ) {
    _renderer.fragmentShader = _renderer.fragmentShader.replace('/* custom_helpers */',
`
/*
float rand ( float seed ) {
  return fract(sin(dot(vec2(seed) ,vec2(12.9898,78.233))) * 43758.5453);
}

vec2 displace(vec2 co, float seed, float seed2) {
  vec2 shift = vec2(0);
  if (rand(seed) > 0.5) {
      shift += 0.1 * vec2(2. * (0.5 - rand(seed2)));
  }
  if (rand(seed2) > 0.6) {
      if (co.y > 0.5) {
          shift.x *= rand(seed2 * seed);
      }
  }
  return shift;
}

vec4 interlace(vec2 co, vec4 col) {
  if (int(co.y) % 3 == 0) {
      return col * ((sin(time * 4.) * 0.1) + 0.75) + (rand(time) * 0.05);
  }
  return col;
}
*/

vec4 coloreffect ( vec4 src, int currentcoloreffect, float extra, vec2 vUv ) {
  if ( currentcoloreffect == 1 ) return vec4( src.rgba );                                                                                              // normal

  // negative
  // negative 3 (reversed channel)
  if ( currentcoloreffect == 2  ) return vec4( 1.-src.r, 1.-src.g, 1.-src.b, src.a );
  // negative 3 (inverted channel high)
  if ( currentcoloreffect == 3  ) return vec4( 1./src.r-1.0, 1./src.g-1.0, 1./src.b-1.0, src.a );
  // negative 3 (inverted channel, low)
  if ( currentcoloreffect == 4  ) return vec4( 1./src.r-2.0, 1./src.g-2.0, 1./src.b-2.0, src.a );
  // negative 4 (inverted colors, inverted bw )
  if ( currentcoloreffect == 5  ) return vec4( src.g + src.b / 2., src.r + src.b / 2., src.r + src.b / 2., src.a );
  // negative 5 (normal colors, inverted b/w)
  if ( currentcoloreffect == 6  ) return vec4( ( (src.r/2.) + ( ( ( (vec3( src.r + src.g + src.b ) / 3.) * -1.) + 1. ).r) ), ( (src.g/2.) + (( ( (vec3( src.r + src.g + src.b ) / 3.) * -1.) + 1. ).g) ), ( (src.b/2.) + ( ( ( (vec3( src.r + src.g + src.b ) / 3.) * -1.) + 1. ).b) ), src.a );

  // monocolor
  if ( currentcoloreffect == 10 ) return vec4( vec3( src.r + src.g + src.b ) / 3., src.a );                                                            // black and white
  if ( currentcoloreffect == 11 ) return vec4( vec3( (src.r+src.g+src.b) *3.  , (src.r+src.g+src.b)  /1.7 , (src.r+src.g+src.b) /1.7 ) / 3., src.a );  // mopnocolor red
  if ( currentcoloreffect == 12 ) return vec4( vec3( (src.r+src.g+src.b) /1.7 , (src.r+src.g+src.b)  *3.  , (src.r+src.g+src.b) /1.7 ) / 3., src.a );  // mopnocolor blue
  if ( currentcoloreffect == 13 ) return vec4( vec3( (src.r+src.g+src.b) /1.7 , (src.r+src.g+src.b)  /1.7 , (src.r+src.g+src.b) *3.  ) / 3., src.a );  // mopnocolor green
  if ( currentcoloreffect == 14 ) return vec4( vec3( (src.r+src.g+src.b) *2.  , (src.r+src.g+src.b)  *2.  , (src.r+src.g+src.b) /1.2 ) / 3., src.a );  // mopnocolor yellow
  if ( currentcoloreffect == 15 ) return vec4( vec3( (src.r+src.g+src.b) *1.2 , (src.r+src.g+src.b)  *2.  , (src.r+src.g+src.b) *2.  ) / 3., src.a );  // mopnocolor turqoise
  if ( currentcoloreffect == 16 ) return vec4( vec3( (src.r+src.g+src.b) *2.  , (src.r+src.g+src.b)  /1.2 , (src.r+src.g+src.b) *2.  ) / 3., src.a );  // mopnocolor purple
  if ( currentcoloreffect == 17 ) return vec4( vec3( src.r + src.g + src.b ) / 3. * vec3( 1.2, 1.0, 0.8 ), src.a);                                     // sepia

  // color swapping
  if ( currentcoloreffect == 20 ) return vec4( src.rrra );
  if ( currentcoloreffect == 21 ) return vec4( src.rrga );
  if ( currentcoloreffect == 22 ) return vec4( src.rrba );
  if ( currentcoloreffect == 23 ) return vec4( src.rgra );
  if ( currentcoloreffect == 24 ) return vec4( src.rgga );
  if ( currentcoloreffect == 25 ) return vec4( src.rbra );
  if ( currentcoloreffect == 26 ) return vec4( src.rbga );
  if ( currentcoloreffect == 27 ) return vec4( src.rbba );
  if ( currentcoloreffect == 28 ) return vec4( src.grra );
  if ( currentcoloreffect == 29 ) return vec4( src.grga );
  if ( currentcoloreffect == 30 ) return vec4( src.grba );
  if ( currentcoloreffect == 31 ) return vec4( src.ggra );
  if ( currentcoloreffect == 32 ) return vec4( src.ggga );
  if ( currentcoloreffect == 33 ) return vec4( src.ggba );
  if ( currentcoloreffect == 34 ) return vec4( src.gbra );
  if ( currentcoloreffect == 35 ) return vec4( src.gbga );
  if ( currentcoloreffect == 36 ) return vec4( src.gbba );
  if ( currentcoloreffect == 37 ) return vec4( src.brra );
  if ( currentcoloreffect == 38 ) return vec4( src.brga );
  if ( currentcoloreffect == 39 ) return vec4( src.brba );
  if ( currentcoloreffect == 40 ) return vec4( src.bgra );
  if ( currentcoloreffect == 41 ) return vec4( src.bgga );
  if ( currentcoloreffect == 42 ) return vec4( src.bgba );
  if ( currentcoloreffect == 43 ) return vec4( src.bbra );
  if ( currentcoloreffect == 44 ) return vec4( src.bbga );
  if ( currentcoloreffect == 45 ) return vec4( src.bbba );

  // lum key
  if ( currentcoloreffect == 50 ) {
    float red = clamp( src.r, extra, 1.) == extra ? .0 : src.r;
    float green = clamp( src.g, extra, 1.) == extra ? .0 : src.g;
    float blue = clamp( src.b, extra, 1.) == extra ? .0 : src.b;
    float alpha = red + green + blue == .0 ? .0 : src.a;
    return vec4( red, green, blue, alpha );
  }

  // color key; Greenkey
  if ( currentcoloreffect == 51 ) {
    return vec4( src.r, clamp( src.r, extra, 1.) == extra ? .0 : src.g, src.b, clamp( src.r, extra, 1.) == extra ? .0 : src.a );
  }

  // paint
  if ( currentcoloreffect == 52 ) {
    // return vec4( floor( src.r * extra ) / extra, floor( src.g * extra ) / extra, floor( src.b * extra ) / extra, src.a  );
    // devide the image up in color bars
    vec4 pnt = vec4(
      src.x < .1 ? .1 : src.x < .2 ? .2 : src.x < .3 ? .3 : src.x < .4 ? .4 : src.x < .5 ? .5 : src.x < .6 ? .6 : src.x < .7 ? .7 : src.x < .8 ? .8 : src.x < .9 ? .9 : src.x,
      src.y < .1 ? .1 : src.y < .2 ? .2 : src.y < .3 ? .3 : src.y < .4 ? .4 : src.y < .5 ? .5 : src.y < .6 ? .6 : src.y < .7 ? .7 : src.y < .8 ? .8 : src.y < .9 ? .9 : src.y,
      src.z < .1 ? .1 : src.z < .2 ? .2 : src.z < .3 ? .3 : src.z < .4 ? .4 : src.z < .5 ? .5 : src.z < .6 ? .6 : src.z < .7 ? .7 : src.z < .8 ? .8 : src.z < .9 ? .9 : src.z,
      src.a
    );

    return pnt;
  }

  // colorise
  if ( currentcoloreffect == 53 ) {

    // TODO: mix paint and colorize together?

    // devide the image up in color bars
    vec4 pnt = vec4(
      src.x < .1 ? .1 : src.x < .2 ? .2 : src.x < .3 ? .3 : src.x < .4 ? .4 : src.x < .5 ? .5 : src.x < .6 ? .6 : src.x < .7 ? .7 : src.x < .8 ? .8 : src.x < .9 ? .9 : src.x,
      src.y < .1 ? .1 : src.y < .2 ? .2 : src.y < .3 ? .3 : src.y < .4 ? .4 : src.y < .5 ? .5 : src.y < .6 ? .6 : src.y < .7 ? .7 : src.y < .8 ? .8 : src.y < .9 ? .9 : src.y,
      src.z < .1 ? .1 : src.z < .2 ? .2 : src.z < .3 ? .3 : src.z < .4 ? .4 : src.z < .5 ? .5 : src.z < .6 ? .6 : src.z < .7 ? .7 : src.z < .8 ? .8 : src.z < .9 ? .9 : src.z,
      src.a
    );

    // colorize effect, fill the colors with random values
    ( pnt.r == .1 || pnt.g == .1 || pnt.b == .1 ) ? pnt.rgb = vec3( 1.0, 0.0, 0.0) : pnt.rgb;
    ( pnt.r == .2 || pnt.g == .2 || pnt.b == .2 ) ? pnt.rgb = vec3( 0.0, 1.0, 0.0) : pnt.rgb;
    ( pnt.r == .3 || pnt.g == .3 || pnt.b == .3 ) ? pnt.rgb = vec3( 0.0, 0.0, 1.0) : pnt.rgb;
    ( pnt.r == .4 || pnt.g == .4 || pnt.b == .4 ) ? pnt.rgb = vec3( 1.0, 1.0, 0.0) : pnt.rgb;
    ( pnt.r == .5 || pnt.g == .5 || pnt.b == .5 ) ? pnt.rgb = vec3( 0.0, 1.0, 1.0) : pnt.rgb;
    ( pnt.r == .6 || pnt.g == .6 || pnt.b == .6 ) ? pnt.rgb = vec3( 1.0, 0.0, 1.0) : pnt.rgb;
    ( pnt.r == .7 || pnt.g == .7 || pnt.b == .7 ) ? pnt.rgb = vec3( 1.0, 0.49, 0.49) : pnt.rgb;
    ( pnt.r == .8 || pnt.g == .8 || pnt.b == .8 ) ? pnt.rgb = vec3( 0.49, 1.0, 0.49) : pnt.rgb;
    ( pnt.r == .9 || pnt.g == .9 || pnt.b == .9 ) ? pnt.rgb = vec3( 0.49, 0.49, 1.0) : pnt.rgb;

    return pnt;
  }

  // BRIGHTNESS [ 0 - 1 ]
  // http://blog.ruofeidu.com/postprocessing-brightness-contrast-hue-saturation-vibrance/
  if ( currentcoloreffect == 60 ) {
    return vec4( src.rgb + extra, src.a );
    //return vec4( src.rgb ^ (extra+1), src.a );
  }

  // CONTRAST [ 0 - 3 ]
  if ( currentcoloreffect == 61 ) {
    extra = extra * 3.;
    float t = 0.5 - extra * 0.5;
    src.rgb = src.rgb * extra + t;
    return vec4( src.rgb, src.a );
  }

  // SATURATION [ 0 - 5 ]
  if ( currentcoloreffect == 62 ) {
    extra = extra * 5.;
    vec3 luminance = vec3( 0.3086, 0.6094, 0.0820 );
    float oneMinusSat = 1.0 - extra;
    vec3 red = vec3( luminance.x * oneMinusSat );
    red.r += extra;

    vec3 green = vec3( luminance.y * oneMinusSat );
    green.g += extra;

    vec3 blue = vec3( luminance.z * oneMinusSat );
    blue.b += extra;

    return mat4(
      red,     0,
      green,   0,
      blue,    0,
      0, 0, 0, 1 ) * src;
  }

  // SHIFT HUE
  if ( currentcoloreffect == 63 ) {
    vec3 P = vec3(0.55735) * dot( vec3(0.55735), src.rgb );
    vec3 U = src.rgb - P;
    vec3 V = cross(vec3(0.55735), U);
    src.rgb = U * cos( extra * 6.2832) + V * sin( extra * 6.2832) + P;
    return src;
  }

  // hard black edge
  if ( currentcoloreffect == 64 ) {
    src.r + src.g + src.b > extra * 3.0? src.rgb = vec3( 1.0, 1.0, 1.0 ) : src.rgb = vec3( 0.0, 0.0, 0.0 );
    return src;
  }

  // greenkey
  if ( currentcoloreffect == 80 ) {
    float temp_g = src.g;

    //if ( src.g > 0.99 ) { // 135
    if ( src.g > 0.2 && src.r < 0.2 && src.b < 0.2 ){
      src.r = 0.0;
      src.g = 0.0;
      src.b = 0.0;
      src.a = 0.0;
    }

    if ( src.g > 0.2 && src.r < 0.2 && src.b < 0.2 ){
      src.r + src.g + src.b > extra * 3.0? src.rgb = vec3( 1.0, 1.0, 1.0 ) : src.rgb = vec3( 0.0, 0.0, 0.0 );
    }


    float maxrb = max( src.r, src.b );
    float k = clamp( (src.g-maxrb)*5.0, 0.0, 1.0 );

    //float ll = length( src );
    //src.g = min( src.g, maxrb*0.8 );
    //src = ll*normalize(src);

    return vec4( mix(src.xyz, vec3(0.0, 0.0, 0.0), k), src.a );

    //return vec4( src.xyz, src.a );
    //return src;
  }

  // greenkey 2
  if ( currentcoloreffect == 81 ) {

    float maxrb = max( src.r, src.b );
    float k = clamp( (src.g-maxrb)*5.0, 0.0, 1.0 );

    //

    //float ll = length( src );
    //src.g = min( src.g, maxrb*0.8 );
    //src = ll*normalize(src);

    //else

    //float dg = src.g;
    //src.g = min( src.g, maxrb*0.8 );
    //src += dg - src.g;

    //#endif

    vec3 bg = src.xyz;
    bg.r = 0.0;
    bg.g = 0.0;
    bg.b = 0.0;

    return vec4( mix(src.xyz, bg, k), mix( 1.0, 0.0, k) );
    //return src;
  }

  if ( currentcoloreffect == 70 ) {
    return src;
  }





  // default
  return src;
}

/* custom_helpers */
`
    );
  }

    _renderer.fragmentShader = _renderer.fragmentShader.replace('/* custom_main */', '\
vec4 '+_self.uuid+'_output = coloreffect( '+source.uuid+'_output, ' + _self.uuid+'_currentcoloreffect' + ', '+ _self.uuid+'_extra' +', vUv );\n  /* custom_main */');
  } // init

  _self.update = function() {}

  /* ------------------------------------------------------------------------ */

  /**
   * @description
   *  gets or sets the _effect_, there are 11 color EFFECTS available, numbered 1-11;
   *  ```
   *  1. Normal (default),
   *
   *  //  negatives
   *  2. Negative 1,
   *  3. Negative 2,
   *  4. Negative 3,
   *  5. Negative 4,
   *  6. Negative 5,
   *
   *  // monocolors
   *  10. Monocolor red,
   *  11. Monocolor blue,
   *  12. Monocolor green,
   *  13. Monocolor yellow,
   *  14. Monocolor turqoise,
   *  15. Monocolor purple,
   *  16. Sepia,
   *  17. Sepia,
   *
   *  // color swapping
   *  [20-46], swaps colors like rgb => gbg => rga => etc.
   *
   *  // other, use extra(float) for finetuning
   *  50. Luma key
   *  51. Green key
   *  52. Paint
   *  53. Colorize
   *  ```

   * @function Effect#ColorEffect#effect
   * @param {number} effect index of the effect
   */

   /**
    * @description currentColoreffect number
    * @function Effect#ColorEffect#effect
    * @param {Number} effectnumber currentColoreffect number 1
    */

  _self.effect = function( _num ){
    if ( _num != undefined ) {
      currentEffect = _num
      console.log("effect set to: ", currentEffect)
      renderer.customUniforms[_self.uuid+'_currentcoloreffect'].value = currentEffect
      // update uniform ?
    }

    return currentEffect
  }

  /**
   * @description the extra, for several effects
   * @function Effect#ColorEffect#extra
   * @param {float} floatValue between 0 and 1
   */

  _self.extra = function( _num ){
    if ( _num != undefined ) {
      currentExtra = _num
      renderer.customUniforms[_self.uuid+'_extra'].value = currentExtra
      // update uniform ?
    }

    if (_self.debug) console.log("extra set to: ", currentExtra)
    return currentExtra
  }
}

DistortionEffect.prototype = new Effect(); // assign prototype to marqer
DistortionEffect.constructor = DistortionEffect;  // re-assign constructor

/**
 * @summary
 *   The Distortion effect has a series of simple distortion effects, ie. it manipulates, broadly, the UV mapping and pixel placements
 *   Effects Example on codepen:
 *   <a href="https://codepen.io/xangadix/pen/eXLGwJ" target="_blank">codepen</a>
 *
 * @description
 *   Distortion  effect allows for a series of color Distortion, mostly
 *   mimicing classic mixers like MX50 and V4
 *   ```
 *    1. normal
 *    2. phasing sides
 *    3. multi
 *    4. PiP (Picture in picture)
 *
 *   ```
 *
 * @example
 *   let myEffect = new DistortionEffect( renderer, { source: myVideoSource, effect: 1 });
 *
 * @constructor Effect#DistortionEffect
 * @implements Effect
 * @param renderer:GlRenderer
 * @param options:Object
 * @author Sense Studios
 */

// fragment
// vec3 b_w = ( source.x + source.y + source.z) / 3
// vec3 amount = source.xyz + ( b_w.xyx * _alpha )
// col = vec3(col.r+col.g+col.b)/3.0;
// col = vec4( vec3(col.r+col.g+col.b)/3.0, _alpha );

// TO THINK ON: Seems we need to connect this to SOURCES somehow

function DistortionEffect( _renderer, _options ) {

  // create and instance
  var _self = this;

  // set or get uid
  if ( _options.uuid == undefined ) {
    _self.uuid = "DistortionEffect_" + (((1+Math.random())*0x100000000)|0).toString(16).substring(1);
  } else {
    _self.uuid = _options.uuid
  }

  // add to renderer
  _renderer.add(_self)
  _self.type = "Effect"

  var source = _options.source
  // var currentEffect = _options.effect
  // var currentEffect = 12

  var currentEffect = _options.effect
  var currentEffect = 1
  var currentExtra = 0.8

  _self.init = function() {
    // add uniforms to renderer
    _renderer.customUniforms[_self.uuid+'_currentdistortioneffect'] = { type: "i", value: 1 }
    _renderer.customUniforms[_self.uuid+'_extra'] = { type: "f", value: 2.0 }

    // add uniforms to fragmentshader
    _renderer.fragmentShader = _renderer.fragmentShader.replace('/* custom_uniforms */', 'uniform vec4 '+_self.uuid+'_output;\n/* custom_uniforms */')
    _renderer.fragmentShader = _renderer.fragmentShader.replace('/* custom_uniforms */', 'uniform int '+_self.uuid+'_currentdistortioneffect;\n/* custom_uniforms */')
    _renderer.fragmentShader = _renderer.fragmentShader.replace('/* custom_uniforms */', 'uniform float '+_self.uuid+'_extra;\n/* custom_uniforms */')

    if ( renderer.fragmentShader.indexOf('vec4 distortioneffect ( sampler2D src, int currentdistortioneffect, float extra, vec2 vUv )') == -1 ) {
    _renderer.fragmentShader = _renderer.fragmentShader.replace('/* custom_helpers */',
`
vec4 distortioneffect ( sampler2D src, int currentdistortioneffect, float extra, vec2 vUv ) {
  // normal
  if ( currentdistortioneffect == 1 ) {
    return texture2D( src, vUv ).rgba;
  }

  // phasing sides (test)
  if ( currentdistortioneffect == 2 ) {
    vec2 wuv = vec2(0,0);
    if ( gl_FragCoord.x > screenSize.x * 0.5 ) wuv = vUv * vec2( 1., cos( time * .01 ) * 1. );
    if ( gl_FragCoord.x < screenSize.x * 0.5 ) wuv = vUv * vec2( 1., sin( time * .01 ) * 1. );
    wuv = wuv + vec2( .0, .0 );
    return texture2D( src, wuv ).rgba;
  }

  // multi
  if ( currentdistortioneffect == 3 ) {
    vec2 wuv = vec2(0,0);
    wuv = vUv * vec2( extra*6., extra*6. ) - vec2( extra * 3., extra * 3. );
    // wuv = vUv + vec2( extra, extra );
    return texture2D( src, wuv ).rgba;
  }

  // pip
  if ( currentdistortioneffect == 4 ) {
    vec2 wuv = vec2(0,0);
    wuv = vUv * vec2( 2, 2 ) + vec2( 0., 0. );
    float sil = 1.;

    // top-left
    if ( gl_FragCoord.x < ( screenSize.x * 0.07 ) || ( gl_FragCoord.x > screenSize.x * 0.37 ) ) sil = 0.;
    if ( gl_FragCoord.y < ( screenSize.y * 0.60 ) || ( gl_FragCoord.y > screenSize.y * 0.97 ) ) sil = 0.;
    return texture2D( src, wuv ).rgba * vec4( sil, sil, sil, sil );
  }
}




  // -------------

  // wipes (move these to mixer?)
  //if ( gl_FragCoord.x > 200.0 ) {
  //  return vec4(0.0,0.0,0.0,0.0);
  //}else {
  //  return src;
  //}

/* custom_helpers */
`
  );
}

    // (re) use the sampler to make another output, with distortion
//    renderer.fragmentShader = renderer.fragmentShader.replace('/* custom_main */', '\
//vec4 '+_self.uuid+'_output = ( texture2D( '+_self.uuid+', vUv ).rgba * '+_self.uuid+'_alpha );\n  /* custom_main */')


//renderer.fragmentShader = renderer.fragmentShader.replace('/* custom_main */', 'vec4 '+_self.uuid+'_output = ( texture2D( '+_self.uuid+', vUv ).rgba * '+_self.uuid+'_alpha );\n  /* custom_main */')

    _renderer.fragmentShader = _renderer.fragmentShader.replace('/* custom_main */', '\
vec4 '+_self.uuid+'_output = distortioneffect( '+source.uuid+', ' + _self.uuid+'_currentdistortioneffect' + ', '+ _self.uuid+'_extra' +', vUv );\n  /* custom_main */');
} // init

  var i = 0.;
  _self.update = function() {
    i += 0.001
    // renderer.customUniforms[_self.uuid+'_uvmap'] = { type: "v2", value: new THREE.Vector2( 1 - Math.random() * .5, 1 - Math.random() * .5 ) }

    /*
    if (currentEffect == 1) {
      source.setUVMapMod(0., 0.)
      source.setUVMap(0., 0.)
    }

    // multi
    if (currentEffect == 2) {
      source.setUVMapMod(0.25, 0.25)
      source.setUVMap(2., 2.)
    }

    // pip
    if (currentEffect == 3 ) {
      source.setUVMapMod(0.2,0.2)
      source.setUVMap(0.5,0.4)
    }
    */

    if (currentEffect == 4) {
    }
    //--------------------------------------------------------------------------------------------------------
    // testSource1.setUVMapMod(0.25, 0.25)
    // testSource1.setUVMapMod(0.25, 0.25)

    // testSource1.setUVMap(1, 1)
    // testSource1.setUVMap(1, 1)

    // pip
    /*
    testSource1.setUVMapMod(0, 0)
    var c = 0
    setInterval( function() {
      c+= 0.02
      //testSource1.setUVMap( Math.sin(c)+2, Math.sin(c)+1 )
      testSource1.setUVMapMod( Math.sin(c)-1, -Math.cos(c)-1 )
    }, 50)
    */
    //--------------------------------------------------------------------------------------------------------


    // ONLY WORKS ON VIDEO SOURCE, IF IT WORKS
    //renderer.customUniforms[source.uuid+'_uvmap_mod'] = { type: "v2", value: new THREE.Vector2( i, Math.cos(i) ) }
    //renderer.customUniforms[source.uuid+'_uvmap'] = { type: "v2", value: new THREE.Vector2( 1 - Math.random() * .82, 1 - Math.random() * .82 ) }
  }

  /**
   * @description currentDistortionffect number
   * @function Effect#DistortionEffect#effect
   * @param {Number} effectnumber CurrentDistortionEffect number 1
   */

  _self.effect = function( _num ){
    if ( _num != undefined ) {
      currentEffect = _num
      if (renderer.customUniforms[_self.uuid+'_currentdistortioneffect']) renderer.customUniforms[_self.uuid+'_currentdistortioneffect'].value = _num
      // update uniform ?
    }

    return currentEffect
  }
  /**
   * @description the extra, for several effects, usually between 0 and 1, but go grazy
   * @function Effect#DistortionEffect#extra
   * @param {float} floatValue between 0 and 1
   */
  _self.extra = function( _num ){

    if ( _num != undefined ) {
      currentExtra = _num
      if (renderer.customUniforms[_self.uuid+'_extra']) renderer.customUniforms[_self.uuid+'_extra'].value = currentExtra
      // update uniform ?
    }
    return _num
  }
}

FeedbackEffect.prototype = new Effect(); // assign prototype to marqer
FeedbackEffect.constructor = FeedbackEffect;  // re-assign constructor

/**
 * @summary
 *   The Feedback effect has a series of tests for feedback like effects through redrawing on an extra canvas
 *   Effects Example on codepen:
 *   <a href="https://codepen.io/xangadix/pen/eXLGwJ" target="_blank">codepen</a>
 *
 * @description
 *   The Feedback effect has a series of tests for feedback like effects through redrawing on an extra canvas
 *   mimicing classic mixers like MX50 and V4
 *   ```
 *   100. you got to see for yourself
 *   101. they should have sent a poet
 *   ```
 *
 * @example
 *   let myEffect = new FeedbackEffect( renderer, { source: myVideoSource, effect: 1 });
 *
 * @constructor Effect#FeedbackEffect
 * @implements Effect
 * @param renderer:GlRenderer
 * @param options:Object
 * @author Sense Studios
 */

// fragment
// vec3 b_w = ( source.x + source.y + source.z) / 3
// vec3 amount = source.xyz + ( b_w.xyx * _alpha )
// col = vec3(col.r+col.g+col.b)/3.0;
// col = vec4( vec3(col.r+col.g+col.b)/3.0, _alpha );

function FeedbackEffect( _renderer, _options ) {

  // create and instance
  var _self = this;

  // set or get uid
  if ( _options.uuid == undefined ) {
    _self.uuid = "FeedbackEffect_" + (((1+Math.random())*0x100000000)|0).toString(16).substring(1);
  } else {
    _self.uuid = _options.uuid
  }

  // add to renderer
  _renderer.add(_self)

  _self.type = "Effect"

  var source = _options.source
  var currentEffect = _options.effect
  var currentEffect = 12
  var currentExtra = 0.8


  var dpr = window.devicePixelRatio;
  var textureSize = 128 * dpr;
  var data = new Uint8Array( textureSize * textureSize * 3 );
  //var dataTexture = new THREE.DataTexture( canvasElement );
  //var dataTexture = new THREE.DataTexture( data, textureSize, textureSize, THREE.RGBFormat );
  //dataTexture.minFilter = THREE.NearestFilter;
	//dataTexture.magFilter = THREE.NearestFilter;
	//dataTexture.needsUpdate = true;

  var canvasElement, canvasContext, effectsTexture


  _self.init = function() {

    // create canvas
    canvasElement = document.createElement('canvas');
    canvasElement.width = 1024;
    canvasElement.height = 1024;
    canvasElementContext = canvasElement.getContext( '2d' );
    canvasElementContext.fillStyle = "#000000";
    canvasElementContext.fillRect( 0, 0, 1024,1024)

    console.log("FeedbackEffect inits, with", _renderer)

    effectsTexture = new THREE.Texture( canvasElement );
    effectsTexture.wrapS = THREE.RepeatWrapping;
    effectsTexture.wrapT = THREE.RepeatWrapping;
    effectsTexture.repeat.set( 4, 4 );

    _renderer.customUniforms[_self.uuid+'_effectsampler'] = { type: "t", value: effectsTexture }
    _renderer.customUniforms[_self.uuid+'_currentfeedbackeffect'] = { type: "i", value: currentEffect }
    _renderer.customUniforms[_self.uuid+'_extra'] = { type: "i", value: currentExtra }

    _renderer.fragmentShader = _renderer.fragmentShader.replace('/* custom_uniforms */', 'uniform vec4 '+_self.uuid+'_output;\n/* custom_uniforms */')
    _renderer.fragmentShader = _renderer.fragmentShader.replace('/* custom_uniforms */', 'uniform sampler2D  '+_self.uuid+'_effectsampler;\n/* custom_uniforms */')
    _renderer.fragmentShader = _renderer.fragmentShader.replace('/* custom_uniforms */', 'uniform int  '+_self.uuid+'_currentfeedbackeffect;\n/* custom_uniforms */')
    _renderer.fragmentShader = _renderer.fragmentShader.replace('/* custom_uniforms */', 'uniform float  '+_self.uuid+'_extra;\n/* custom_uniforms */')


    if ( renderer.fragmentShader.indexOf('vec4 feedbackeffect ( vec4 src, int currentfeedbackeffect, vec2 vUv )') == -1 ) {

      _renderer.fragmentShader = _renderer.fragmentShader.replace('/* custom_helpers */',
`
  vec4 feedbackeffect ( vec4 src, int currentfeedbackeffect, vec2 vUv ) {

    if ( currentfeedbackeffect == 100 ) {
      // vec4 inbetween = vec4( src.r, src.g, src.b, vUv * 0.9. );
      // gl_Position = vec4( vec2(0.,0.), 0., 0.);
      // return inbetween.rrr;
      // return src;

      // return vec4(0., 0., 1., 1.);

      vec2 wuv = vec2(0.,0.);
      // wuv = vUv * vec2( 1.0, 1.0 ) - vec2( 0., 0. );
      wuv = vUv; //* vec2( 1.0, 1.0 ) - vec2( 0., 0. );
      //wuv = vUv - vec2( 0.1, 0. );
      // wuv = vUv + vec2( extra, extra );
      // return texture2D( src, wuv ).rgba;

      return vec4( vec4( ( texture2D( `+_self.uuid+`_effectsampler, wuv ).rgba * 0.9 ) + (src.rgba * .6 ) ).rgb, 1.);

      // return ( texture2D( , vUv + vec2( 1., 0.99999999) ).rgba ) + src * 0.3;

      // return ( texture2D( `+_self.uuid+`_effectsampler, vUv  ).rgb * 1.4 + src * .8) * 0.5; //* vec3(.5, .5, .5
      // return ( texture2D( src, vUv ).rgb );
      // return ( texture2D( `+_self.uuid+`_effectsampler, vUv  ).rgb ) * src + src;

      //vec4 wuv = wuv = vUv * vec2( extra*6., extra*6. ) - vec2( extra * 3., extra * 3. );
      //vec4 tex = texture2D( `+_self.uuid+`_effectsampler, wuv ); //+ vec4( src.r, src.g, src.b, vUv * 2. );

      // return src.rrr;
      // tex.rgb = vec3(src.r, src.g, src.b);
      // tex.xy = vec2(1.0,1.0);
      // tex = tex + vec4( src.r, src.g, src.b, vUv * 2. );


      // * 0.52 + vec4( src * 0.52, vUv ) *
      // vec4 tex = vec4( src, vUv * .5 );
      // return mix( tex, `+_self.uuid+`_effectsampler, 0.).rgb;
      // return mix(tex.rgb, src.rgb, 1.);
    }

    // uniform float noiseScale;
    // uniform float time;
    // uniform float baseSpeed;
    // uniform sampler2D noiseTexture;

    if ( currentfeedbackeffect == 101 ) {
      // vec2 uvTimeShift = vUv + vec2( -0.7, 1.5 ) * time * baseSpeed;
      // vec4 noiseGeneratorTimeShift = texture2D( noiseTexture, uvTimeShift );
      // vec2 uvNoiseTimeShift = vUv + noiseScale * vec2( noiseGeneratorTimeShift.r, noiseGeneratorTimeShift.a );

      // _effectsampler
      // return  vec4 texture2D( baseTexture1, uvNoiseTimeShift )

      // https://stackoverflow.com/questions/19872524/threejs-fragment-shader-using-recycled-frame-buffers
      // http://labs.sense-studios.com/webgl/index4.html?r=sdad

      // return _effectsampler.rgb
      return src;
    }

    return src;
  }

  /* custom_helpers */
`
  );
}

_renderer.fragmentShader = _renderer.fragmentShader.replace('/* custom_main */', '\
vec4 '+_self.uuid+'_output = feedbackeffect( '+source.uuid+'_output, ' + _self.uuid+'_currentfeedbackeffect' + ', vUv );\n  /* custom_main */')
} // init

/*
  Herunder is a script that uses a canvas to add feedback to the texture
  but to do it right, we need another scene. this has to do with the fact
  that three renders everything in a gl buffer, so we need another scene
  to get this done.
  https://github.com/samhains/minimal-threejs-feedback-glsl/blob/master/index.html

  Either we build another three JS texture here, OR we switch from render
  engine and move over to another core engine like reGL
*/

// -----------------------------------------------------------------------------

var vector = new THREE.Vector2();
//var glcanvas = document.getElementById('glcanvas');
//var glcanvas = _renderer.glrenderer.context.canvas
var i = 0
_self.update = function() {

  i++;

  // mixmode
  // blendmode
  // pod
  // console.log( "--", glcanvas.width, glcanvas.height )

  // glcanvas = _renderer.glrenderer.context.canvas
  // canvasElementContext.drawImage( glcanvas, Math.sin(i/20)*20-10, 1, glcanvas.width*1.0000000001, glcanvas.height*1.0000000001 );

  // vector.x = ( window.innerWidth * dpr / 2 ) - ( textureSize / 2 );
  // vector.y = ( window.innerHeight * dpr / 2 ) - ( textureSize / 2 );

  // _renderer.copyFramebufferToTexture( vector, dataTexture );

  glcanvas = document.getElementById('glcanvas');
  //glcanvas = renderer.glrenderer.getContext().canvas
  if ( i%4 == 0) {
    //canvasElementContext.drawImage( glcanvas, 128,128, 768, 768 );
    //canvasElementContext.drawImage( glcanvas, 128,128, 768, 768 );
    //canvasElementContext.drawImage( glcanvas, 100,100, 824, 824 );
    //canvasElementContext.drawImage( glcanvas, 110,110, 804, 804 );
    // [ 80-100 ]
    var e = (currentExtra * 1.6)
    var h = 1024 * e
    var w = (1024-h) / 2
    canvasElementContext.drawImage( glcanvas, w, w, h, h );
  }else{
    //canvasElementContext.fillStyle = "#000000";
    //canvasElementContext.fillRect( 0, 0, 1024,1024)
  }
  if ( effectsTexture ) effectsTexture.needsUpdate = true;
}

/* ------------------------------------------------------------------------ */

/**
 * @description currentFeedbackeffectffect number
 * @function Effect#FeedbackEffect#effect
 * @param {Number} effectnumber currentColoreffect number
 */
  _self.effect = function( _num ){
    if ( _num != undefined ) {
      currentEffect = _num
      renderer.customUniforms[_self.uuid+'_currentfeedbackeffect'].value = currentEffect
      // update uniform ?
    }
    return currentEffect
  }

  /**
   * @description currenFeedbackEffect extra try gently between 0-1, preferably around 0.5
   * @function Effect#FeedbackEffect#extra
   * @param {float} float currenFeedbackEffect extra
   */
  _self.extra = function( _num ){
      if ( _num != undefined ) {
        currentExtra = _num
        renderer.customUniforms[_self.uuid+'_extra'].value = currentExtra
        // update uniform ?
      }
    return currentExtra
  }
}


/**
 * @summery
 *  Wraps around a Three.js GLRenderer and sets up the scene and shaders.
 *
 * @description
 *  Wraps around a Three.js GLRenderer and sets up the scene and shaders.
 *
 * @constructor GlRenderer
 * @example
 *    <!-- a Canvas element with id: glcanvas is required! -->
 *    <canvas id="glcanvas"></canvas>
 *
 *
 *    <script>
 *      let renderer = new GlRenderer();
 *
 *      var red = new SolidSource( renderer, { color: { r: 1.0, g: 0.0, b: 0.0 } } );
 *      let output = new Output( renderer, red )
 *
 *      renderer.init();
 *      renderer.render();
 *    </script>
 */

 /*
    We might try and change THREEJS and move to regl;
    https://github.com/regl-project, http://regl.party/examples => video
    133.6 => ~26kb
 */

var GlRenderer = function( _options ) {

  var _self = this

  /** Set uop options */
  _self.options = { element: 'glcanvas' }
  if ( _options != undefined ) {
    _self.options = _options
  }

  // set up threejs scene
  //_self.element = _self.options.element
  _self.element = document.getElementById(_self.options.element)

  _self.onafterrender = function() {}
  
  // default
  // window.innerWidth, window.innerHeight
  _self.width = window.innerWidth //_self.element.offsetWidth
  _self.height = window.innerHeight //_self.element.offsetHeight

  _self.scene = new THREE.Scene();
  _self.camera = new THREE.PerspectiveCamera( 75, _self.width / _self.height, 0.1, 1000 );
  _self.camera.position.z = 20

  // container for all elements that inherit init() and update()
  _self.nodes = [] // sources modules and effects

  // containers for custom uniforms and cosutomDefines
  _self.customUniforms = {}
  _self.customDefines = {}

  // base config, screensize and time
  var cnt = 0.;
  _self.customUniforms['time'] = { type: "f", value: cnt }
  _self.customUniforms['screenSize'] = { type: "v2", value: new THREE.Vector2( _self.width,  _self.height ) }

  /**
   * The vertex shader
   * @member GlRenderer#vertexShader
   */
  _self.vertexShader = `
    varying vec2 vUv;\
    void main() {\
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\
      vUv = uv;\
    }
  `

   /**
    * The fragment shader
    * @member GlRenderer#fragmentShader
    */
     // base fragment shader
  _self.fragmentShader = `
    uniform float time;
    uniform vec2 screenSize;

    /* custom_uniforms */\
    /* custom_helpers */\
    varying vec2 vUv;\
    void main() {\
      /* custom_main */\
    }
  `

  // ---------------------------------------------------------------------------
  /** @function GlRenderer.init */
  _self.init = function(  ) {
    console.log("init renderer")
    _self.glrenderer = new THREE.WebGLRenderer( { canvas: glcanvas, alpha: false } );

    // init nodes
    // reset the renderer, for a new lay out
    /**
     * All the nodes currently added to this renderer
     * @member GlRenderer#nodes
     */
    _self.nodes.forEach(function(n){ n.init() });

    // create the shader
    _self.shaderMaterial = new THREE.ShaderMaterial({
       uniforms: _self.customUniforms,
       defines: _self.customDefines,
       vertexShader: _self.vertexShader,
       fragmentShader: _self.fragmentShader,
       side: THREE.DoubleSide,
       transparent: true
    })

    // apply the shader material to a surface
    _self.flatGeometry = new THREE.PlaneGeometry( 67, 38 );
    _self.flatGeometry.translate( 0, 0, 0 );
    _self.surface = new THREE.Mesh( _self.flatGeometry, _self.shaderMaterial );
    // surface.position.set(60,50,150);

    /**
     * A reference to the threejs scene
     * @member GlRenderer#scene
     */
    _self.scene.add( _self.surface );
  }

  // ---------------------------------------------------------------------------

  /** @function GlRenderer.render */
  _self.render = function() {
  	requestAnimationFrame( _self.render );
  	_self.glrenderer.render( _self.scene, _self.camera );
    _self.onafterrender()
    _self.glrenderer.setSize( _self.width, _self.height );
    _self.nodes.forEach( function(n) { n.update() } );

    cnt++;
    _self.customUniforms['time'].value = cnt;
  }

  // update size!
  _self.resize = function() {
    _self.customUniforms['screenSize'] = { type: "v2", value: new THREE.Vector2( _self.width,  _self.height ) }

    // resize viewport (write exception for width >>> height, now gives black bars )
    _self.camera.aspect = _self.width / _self.height;
    _self.camera.updateProjectionMatrix();
    _self.glrenderer.setSize( _self.width, _self.height );
  }

  window.addEventListener('resize', function() {
    _self.resize()
  })

  // ---------------------------------------------------------------------------
  // Helpers

  // adds nodes to the renderer
  // function is implicit, and is colled by the modules
  _self.add = function( module ) {
    _self.nodes.push( module )
  }

  // reset the renderer, for a new lay out
  /**
   * Disposes the renderer
   * @function GlRenderer#dispose
   */
  _self.dispose = function() {
    _self.shaderMaterial
    _self.flatGeometry
    _self.scene.remove(_self.surface)
    _self.glrenderer.resetGLState()
    _self.customUniforms = {}
    _self.customDefines = {}

    cnt = 0.;
    _self.customUniforms['time'] = { type: "f", value: cnt }
    _self.customUniforms['screenSize'] = { type: "v2", value: new THREE.Vector2( _self.width,  _self.height ) }

    // reset the vertexshader
    _self.vertexShader = `
      varying vec2 vUv;
      void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        vUv = uv;
      }
    `

    // reset the fragment shader
    _self.fragmentShader = `
      uniform int time;
      uniform vec2 screenSize;

      /* custom_uniforms */
      /* custom_helpers */
      varying vec2 vUv;
      void main() {
        /* custom_main */
      }
    `

    _self.nodes = []
  }
}

/**
 * @constructor Module
 * @interface
 * @summary
 *   Modules collect all the mixer elements
 *
 * @description
 *   Modules collect all the mixer elements
 *
 *
 * @author Sense studios
 */

function Module( renderer, options ) {
  var _self = this

  /*
   renderer
  */

  _self.type = "Module"

  // program interface
  _self.init =         function() {}
  _self.update =       function() {}
  _self.render =       function() {}
}

/**
 * @summary
 *    A Chain is string of sources, stacked on top of each other
 *    Chain Example on codepen:
 *    <a href="https://codepen.io/xangadix/pen/BbVogR" target="_blank">codepen</a>
 *
 * @description
 *   Chains together a string of sources, gives them an alpha channel, and allows for switching them on and off with fade effects. Ideal for a piano board or a midicontroller
 *
 * @example let myChain = new Chain( renderer, { sources: [ myVideoSource, myOtherMixer, yetAnotherSource ] } );
 * @constructor Module#Chain
 * @implements Module
 * @param renderer:GlRenderer
 * @param options:Object
 */
function Chain(renderer, options) {

  // create and instance
  var _self = this;

  // set or get uid
  if ( options.uuid == undefined ) {
    _self.uuid = "Chain_" + (((1+Math.random())*0x100000000)|0).toString(16).substring(1);
  } else {
    _self.uuid = options.uuid
  }

  // add to renderer
  renderer.add(_self)

  // set options
  var _options;
  if ( options != undefined ) _options = options

  _self.type = "Module"
  _self.sources = _options.sources

  // add source alpha to custom uniforms
  _self.sources.forEach( function( source, index ) {
    renderer.customUniforms[_self.uuid+'_source'+index+'_'+'alpha'] = { type: "f", value: 0.5 }
  })

  // add source uniforms to fragmentshader
  _self.sources.forEach( function( source, index ) {
    renderer.fragmentShader = renderer.fragmentShader.replace('/* custom_uniforms */', 'uniform float '+_self.uuid+'_source'+index+'_'+'alpha;\n/* custom_uniforms */')
  })

  // add chain output and chain alpha to shader
  renderer.fragmentShader = renderer.fragmentShader.replace('/* custom_uniforms */', 'uniform float '+_self.uuid+'_'+'alpha;\n/* custom_uniforms */')
  renderer.fragmentShader = renderer.fragmentShader.replace('/* custom_uniforms */', 'uniform vec3 '+_self.uuid+'_output;\n/* custom_uniforms */')

  _self.init = function() {
    // bould output module
    var generatedOutput = "vec4(0.0,0.0,0.0,0.0)"
    _self.sources.forEach( function( source, index ) {
      generatedOutput += ' + ('+source.uuid+'_'+'output * '+_self.uuid+'_source'+index+'_'+'alpha )'
    });
    //generatedOutput += ";\n"

    // put it in the shader
    renderer.fragmentShader = renderer.fragmentShader.replace('/* custom_main */', '\
vec4 '+_self.uuid+'_output = vec4( '+generatedOutput+'); \/* custom_main */')

  }

  _self.update = function() {}

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------
  _self.setChainLink = function( _num, _alpha ) {
    renderer.customUniforms[_self.uuid+'_source'+_num+'_'+'alpha'].value = _alpha
  }

  _self.getChainLink = function( _num ) {
    return renderer.customUniforms[_self.uuid+'_source'+_num+'_'+'alpha'].value
  }

  _self.setAll = function( _alpha = 0 ) {
    _self.sources.forEach( function( _num,i ) {
      renderer.customUniforms[_self.uuid+'_source'+i+'_'+'alpha'].value = _alpha
    })
  }

  _self.toggle = function( _num, _state ) {
    if ( _state !== undefined ) {
      renderer.customUniforms[_self.uuid+'_source'+_num+'_'+'alpha'].value = _state
      return;
    }

    if ( renderer.customUniforms[_self.uuid+'_source'+_num+'_'+'alpha'].value == 1 ) {
      renderer.customUniforms[_self.uuid+'_source'+_num+'_'+'alpha'].value = 0
    }else{
      renderer.customUniforms[_self.uuid+'_source'+_num+'_'+'alpha'].value = 1
      current = _num
    }
  }
}

/**
 * @summary
 *    A mixer mixes two sources together.
 *    Mixer example on codepen:
 *    <a href="https://codepen.io/xangadix/pen/zewydR" target="_blank">codepen</a>
 *
 * @description
 *   ### Mixmode
 Mixers support a [`Mixmode`](Mixer.html#mixMode).
 The Mixmode defines the curvature of the crossfade.

 In a regular crossfade, source 1 would fade out while source 2 fades in. At the center both sources are then both at 50% opacity; however, 2 sources with 50% opacity only add up to ~75% opacity, not to 100%. This means that the output is **darker** in the middle of  the crossfade then it is at both ends. This is the default _Mixmode_, the other modes play with these settings

 ```
   1: NORMAL (default),   regular, linear crossfade
   2: HARD,               switches with a hard cut at 50%
   3: NAM,                fades with an upward curvature forcing 100% opacity throughout the crossfade (lighter!)
   4: FAM,                fades with a downward curve, forcing a 'overlay' period
   5: NON DARK,           Never goes dark, 0-2 linear curve, capped at 1 and .36
   6: LEFT,               forces the pod on 0 (locks pod)
   7: RIGHT,              forces the pod on 1 (locks pod)
   8: CENTER,             forces both sources at ~66% (locks pod)
   9: BOOM                forces both sources at 100%, allows for overflow (lighter!) (locks pod)
 ```

 ### Blendmode
 Mixers also support a [`Blendmode`](Mixer.html#blendMode).
 Think of them as the a Photoshop Blendmodes. They tell the mixer how to blend Source 1 and Source 2 together.

 ```
   1 ADD (default),
   2 SUBSTRACT,
   3 MULTIPLY,
   4 DARKEN,
   5 COLOUR BURN,
   6 LINEAR_BURN,
   7 LIGHTEN,
   8 SCREEN,
   9 COLOUR_DODGE,
   10 LINEAR_DODGE,
   11 OVERLAY,
   12 SOFT_LIGHT,
   13 HARD_LIGHT,
   14 VIVID_LIGHT,
   15 LINEAR_LIGHT,
   16 PIN_LIGHT,
   17 DIFFERENCE,
   18 EXCLUSION
 ```

 Switch both mixer and blendmode in realtime:

 ```
 mixer1.mixMode()       // shows mixmode (default 1, NORMAL)
 mixer1.mixMode(8)      // set MixMode to BOOM
 mixer1.blendMode(1)    // set blendmode to ADD (default)
 mixer1.blendMode(14)   // set blendmode to VIVID_LIGHT
 ```

 Move the pod up and down over time, or fade from source1 to source2 and back
 again.
 ```
 ar c = 0;
 setInterval( function() {
   c += 0.01
   mixer1.pod ( ( Math.sin(c) * 0.5 ) + 0.5 );
 })
 ```

 *
 * @example let myMixer = new Mixer( renderer, { source1: myVideoSource, source2: myOtherMixer });
 * @constructor Module#Mixer
 * @implements Module
 * @param renderer:GlRenderer
 * @param options:Object
 * @author Sense Studios
 */

 // of 18: 1 ADD (default), 2 SUBSTRACT, 3 MULTIPLY, 4 DARKEN, 5 COLOUR BURN,
 // 6 LINEAR_BURN, 7 LIGHTEN,  8 SCREEN, 9 COLOUR_DODGE, 10 LINEAR_DODGE,
 // 11 OVERLAY, 12 SOFT_LIGHT, 13 HARD_LIGHT, 14 VIVID_LIGHT, 15 LINEAR_LIGHT,
 // 16 PIN_LIGHT, 17 DIFFERENCE, 18 EXCLUSION

 // of 8 1: NORMAL, 2: HARD, 3: NAM, 4: FAM, 5: LEFT, 6: RIGHT, 7: CENTER, 8: BOOM

/*
  class Polygon extend Shape {
    constructor(height, width) {
      this.x = super.x
      this.y = super.y
      this.height = height;
      this.width = width;
    }

    get area() {
      return this.calcArea()
    }

    // klass.area

    set area(a) {
   }

    // klass.area = 2

    calcArea() {
      return this.height * this.width;
    }

    // klass.calcArea( ... )

    static info() {
      return "lalalala info"
    }

    // Class.info()
  }
*/

var Mixer = class {

  static function_list() {
    return [["BLEND", "method","blendMode"], ["MIX", "method","mixMode"], ["POD", "set", "pod"] ]
  }

  constructor( renderer, options ) {

    // create and instance
    var _self = this;
    if (renderer == undefined) return

    // set or get uid
    if ( options.uuid == undefined ) {
      _self.uuid = "Mixer_" + (((1+Math.random())*0x100000000)|0).toString(16).substring(1);
    } else {
      _self.uuid = options.uuid
    }

    // add to renderer
    renderer.add(_self)

    // set options
    var _options;
    if ( options != undefined ) _options = options

    // set type
    _self.type = "Module";

    // add local variables
    var alpha1 = 1;
    var alpha2 = 0;
    var pod = 0;

    // hoist an own bpm here
    var currentBPM = 128
    var currentMOD = 1
    var currentBpmFunc = function() { return currentBPM; }
    _self.autoFade = false
    _self.fading = false

    var mixmode = 1;
    _self.mixmodes = [ 1, 2, 3, 4, 5, 6, 7, 8, 9 ];

    var blendmode = 1;
    _self.blendmodes = [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18 ];

    var source1, source2;
    source1 = options.source1 //|| options.src1;   // Mandatory
    source2 = options.source2 //|| options.src2;   // Mandatory

    _self.init = function() {

      // add uniforms to renderer
      renderer.customUniforms[_self.uuid+'_mixmode'] = { type: "i", value: 1 }
      renderer.customUniforms[_self.uuid+'_blendmode'] = { type: "i", value: 1 }
      //renderer.customUniforms[_self.uuid+'_pod'] = { type: "f", value: 0.5 }
      renderer.customUniforms[_self.uuid+'_alpha1'] = { type: "f", value: 0.5 }
      renderer.customUniforms[_self.uuid+'_alpha2'] = { type: "f", value: 0.5 }
      renderer.customUniforms[_self.uuid+'_sampler'] = { type: "t", value: null }

      // add uniforms to fragmentshader
      renderer.fragmentShader = renderer.fragmentShader.replace('/* custom_uniforms */', 'uniform int '+_self.uuid+'_mixmode;\n/* custom_uniforms */')
      renderer.fragmentShader = renderer.fragmentShader.replace('/* custom_uniforms */', 'uniform int '+_self.uuid+'_blendmode;\n/* custom_uniforms */')
      //renderer.fragmentShader = renderer.fragmentShader.replace('/* custom_uniforms */', 'uniform float '+_self.uuid+'_pod;\n/* custom_uniforms */')
      renderer.fragmentShader = renderer.fragmentShader.replace('/* custom_uniforms */', 'uniform float '+_self.uuid+'_alpha1;\n/* custom_uniforms */')
      renderer.fragmentShader = renderer.fragmentShader.replace('/* custom_uniforms */', 'uniform float '+_self.uuid+'_alpha2;\n/* custom_uniforms */')
      renderer.fragmentShader = renderer.fragmentShader.replace('/* custom_uniforms */', 'uniform vec4 '+_self.uuid+'_output;\n/* custom_uniforms */')

      // add blendmodes helper, we only need it once
      if ( renderer.fragmentShader.indexOf('vec4 blend ( vec4 src, vec4 dst, int blendmode )') == -1 ) {
        renderer.fragmentShader = renderer.fragmentShader.replace('/* custom_helpers */',
  `
  vec4 blend ( vec4 src, vec4 dst, int blendmode ) {
    if ( blendmode ==  1 ) return src + dst;
    if ( blendmode ==  2 ) return src - dst;
    if ( blendmode ==  3 ) return src * dst;
    if ( blendmode ==  4 ) return min(src, dst);
    if ( blendmode ==  5)  return vec4((src.x == 0.0) ? 0.0 : (1.0 - ((1.0 - dst.x) / src.x)), (src.y == 0.0) ? 0.0 : (1.0 - ((1.0 - dst.y) / src.y)), (src.z == 0.0) ? 0.0 : (1.0 - ((1.0 - dst.z) / src.z)),1.0);
    if ( blendmode ==  6 ) return (src + dst) - 1.0;
    if ( blendmode ==  7 ) return max(src, dst);
    if ( blendmode ==  8 ) return (src + dst) - (src * dst);
    if ( blendmode ==  9 ) return vec4((src.x == 1.0) ? 1.0 : min(1.0, dst.x / (1.0 - src.x)), (src.y == 1.0) ? 1.0 : min(1.0, dst.y / (1.0 - src.y)), (src.z == 1.0) ? 1.0 : min(1.0, dst.z / (1.0 - src.z)), 1.0);
    if ( blendmode == 10 ) return src + dst;
    if ( blendmode == 11 ) return vec4((dst.x <= 0.5) ? (2.0 * src.x * dst.x) : (1.0 - 2.0 * (1.0 - dst.x) * (1.0 - src.x)), (dst.y <= 0.5) ? (2.0 * src.y * dst.y) : (1.0 - 2.0 * (1.0 - dst.y) * (1.0 - src.y)), (dst.z <= 0.5) ? (2.0 * src.z * dst.z) : (1.0 - 2.0 * (1.0 - dst.z) * (1.0 - src.z)), 1.0);
    if ( blendmode == 12 ) return vec4((src.x <= 0.5) ? (dst.x - (1.0 - 2.0 * src.x) * dst.x * (1.0 - dst.x)) : (((src.x > 0.5) && (dst.x <= 0.25)) ? (dst.x + (2.0 * src.x - 1.0) * (4.0 * dst.x * (4.0 * dst.x + 1.0) * (dst.x - 1.0) + 7.0 * dst.x)) : (dst.x + (2.0 * src.x - 1.0) * (sqrt(dst.x) - dst.x))), (src.y <= 0.5) ? (dst.y - (1.0 - 2.0 * src.y) * dst.y * (1.0 - dst.y)) : (((src.y > 0.5) && (dst.y <= 0.25)) ? (dst.y + (2.0 * src.y - 1.0) * (4.0 * dst.y * (4.0 * dst.y + 1.0) * (dst.y - 1.0) + 7.0 * dst.y)) : (dst.y + (2.0 * src.y - 1.0) * (sqrt(dst.y) - dst.y))), (src.z <= 0.5) ? (dst.z - (1.0 - 2.0 * src.z) * dst.z * (1.0 - dst.z)) : (((src.z > 0.5) && (dst.z <= 0.25)) ? (dst.z + (2.0 * src.z - 1.0) * (4.0 * dst.z * (4.0 * dst.z + 1.0) * (dst.z - 1.0) + 7.0 * dst.z)) : (dst.z + (2.0 * src.z - 1.0) * (sqrt(dst.z) - dst.z))), 1.0);
    if ( blendmode == 13 ) return vec4((src.x <= 0.5) ? (2.0 * src.x * dst.x) : (1.0 - 2.0 * (1.0 - src.x) * (1.0 - dst.x)), (src.y <= 0.5) ? (2.0 * src.y * dst.y) : (1.0 - 2.0 * (1.0 - src.y) * (1.0 - dst.y)), (src.z <= 0.5) ? (2.0 * src.z * dst.z) : (1.0 - 2.0 * (1.0 - src.z) * (1.0 - dst.z)), 1.0);
    if ( blendmode == 14 ) return vec4((src.x <= 0.5) ? (1.0 - (1.0 - dst.x) / (2.0 * src.x)) : (dst.x / (2.0 * (1.0 - src.x))), (src.y <= 0.5) ? (1.0 - (1.0 - dst.y) / (2.0 * src.y)) : (dst.y / (2.0 * (1.0 - src.y))), (src.z <= 0.5) ? (1.0 - (1.0 - dst.z) / (2.0 * src.z)) : (dst.z / (2.0 * (1.0 - src.z))),1.0);
    if ( blendmode == 15 ) return 2.0 * src + dst - 1.0;
    if ( blendmode == 16 ) return vec4((src.x > 0.5) ? max(dst.x, 2.0 * (src.x - 0.5)) : min(dst.x, 2.0 * src.x), (src.x > 0.5) ? max(dst.y, 2.0 * (src.y - 0.5)) : min(dst.y, 2.0 * src.y), (src.z > 0.5) ? max(dst.z, 2.0 * (src.z - 0.5)) : min(dst.z, 2.0 * src.z),1.0);
    if ( blendmode == 17 ) return abs(dst - src);
    if ( blendmode == 18 ) return src + dst - 2.0 * src * dst;
    return src + dst;
  }
  /* custom_helpers */
  `
        );
      }

      var shadercode = ""
      shadercode += "vec4 "+_self.uuid+"_output = vec4( blend( "
      shadercode += source1.uuid+"_output * "+_self.uuid+"_alpha1, "
      shadercode += source2.uuid+"_output * "+_self.uuid+"_alpha2, "
      shadercode += _self.uuid+"_blendmode ) "
      shadercode += ")"
      shadercode += " + vec4(  "+source1.uuid+"_output.a < 1.0 ? "+source2.uuid+"_output.rgba * ( "+_self.uuid+"_alpha1 - "+source1.uuid+"_output.a ) : vec4( 0.,0.,0.,0. )  ) "
      shadercode += " + vec4(  "+source2.uuid+"_output.a < 1.0 ? "+source1.uuid+"_output.rgba * ( "+_self.uuid+"_alpha2 - - "+source2.uuid+"_output.a ) : vec4( 0.,0.,0.,0. )  ) "
      shadercode += ";\n"
      shadercode += "  /* custom_main */  "

      renderer.fragmentShader = renderer.fragmentShader.replace('/* custom_main */', shadercode )
    }

    // autofade bpm
    var starttime = (new Date()).getTime()
    var c = 0
    var cnt = 0

    // fade time
    var fadeAtTime = 0
    var fadeTime = 0
    var fadeTo = "b"
    var fadeDuration = 0

    /** @function Addon#Mixer~update */

    /**
     * @description
     *  binds _currentBpmFunc_ to a function
     *  whatever BPM _currentBpmFunc_ returns will be bpm used.
     *  it's called on update
     * @example
     *   var mixer1 = new Mixer( renderer, { source1: file, source2: file})
     *   var audioanalysis = new AudioAnalysis( renderer, { audio: file })
     *   audioanalysis.bindBPM( audioanalysis.getBPM() * 0.5 )
     * @function Module#Mixer#bindBpm
     * @param {function} binding allows for overriding internal bpm
     */

    _self.update = function() {

      if ( _self.autoFade ) { // maybe call this bpmFollow?
        // pod = currentBPM
        currentBPM = currentBpmFunc()
        c = ((new Date()).getTime() - starttime) / 1000;
        _self.pod( ( Math.sin( c * Math.PI * currentBPM * currentMOD / 60 ) / 2 + 0.5 ) )
      }

      if ( _self.fading ) { // then call this autoFade

        var now = (new Date()).getTime()
        fadeAtTime = (fadeTime - now);
        var _num = fadeAtTime/fadeDuration
        if (fadeTo =="b") _num = Math.abs(_num - 1)
        //console.log("fader...", _num, Math.abs(_num - 1), fadeAtTime, fadeTime, now, fadeDuration, fadeTo)
        if (_num < 0 ) _num = 0
        if (_num > 1 ) _num = 1

        _self.pod( _num )

        if ( fadeAtTime < 0 ) {
          _self.fading = false

          // allstop
          _num = Math.round(_num)
          _self.pod(_num)
        }
      }
    }

    /** @function Addon#Mixer~render */
    _self.render = function() {
      return pod
    }

    // ---------------------------------------------------------------------------
    // HELPERS
    // ---------------------------------------------------------------------------

    // you shouldnt be able to set these directly
    _self.alpha1 = function() { return alpha1 }
    _self.alpha2 = function() { return alpha2 }

    /**
     * @function Module#Mixer#mixMode
     * @param {integer} mixmode index of the Mixmode
     *
     * @description
     *  gets or sets the _mixMode_, there are 8 MixModes available, numbered 1-9;
     *  ```
     *  1: NORMAL (default),   regular, linear crossfade
     *  2: HARD,               switches with a hard cut at 50%
     *  3: NAM,                fades with an upward curvature forcing 100% opacity throughout the crossfade (lighter!)
     *  4: FAM,                fades with a downward curve, forcing a 'overlay' period
     *  5: NON DARK,           Never goes dark, 0-2 linear curve, capped at 1 and .36
     *  6: LEFT,               forces the pod on 0 (locks pod)
     *  7: RIGHT,              forces the pod on 1 (locks pod)
     *  8: CENTER,             forces both sources at ~66% (locks pod)
     *  9: BOOM                forces both sources at 100%, allows for overflow (lighter!) (locks pod)
     *  ```
     *
    */
    _self.mixMode = function( _num ) {
      if ( _num != undefined ) { mixmode = _num }
      return mixmode
    }

    /**
     * @description
     *  gets or sets the _blendMode_, there are 18 Blendmodes available, numbered 1-18;
     *  ```
     *  1 ADD (default),
     *  2 SUBSTRACT,
     *  3 MULTIPLY,
     *  4 DARKEN,
     *  5 COLOUR BURN,
     *  6 LINEAR_BURN,
     *  7 LIGHTEN,
     *  8 SCREEN,
     *  9 COLOUR_DODGE,
     *  10 LINEAR_DODGE,
     *  11 OVERLAY,
     *  12 SOFT_LIGHT,
     *  13 HARD_LIGHT,
     *  14 VIVID_LIGHT,
     *  15 LINEAR_LIGHT,
     *  16 PIN_LIGHT,
     *  17 DIFFERENCE,
     *  18 EXCLUSION
     *  ```
     * @function Module#Mixer#blendMode
     * @param {integer} blendmode index of the Blendmode
    */
    _self.blendMode = function( _num ) {
      if ( _num != undefined ) {
        blendmode = _num
        renderer.customUniforms[_self.uuid+'_blendmode'].value = blendmode
      }
      _self.pod( _self.pod() ) // update pod, precaution
      return blendmode
    }

    /**
     * @description the position of the handle, fader or pod. 0 is left, 1 is right
     * @function Module#Mixer#pod
     * @param {float} position position of the handle
     */
    _self.pod = function( _num ) {
      //console.log("---> POD:", _num)
      if ( _num != undefined ) {

        // set pod position
        pod = _num

        // evaluate current mix style
        // MIXMODE 1 normal mix
        if (mixmode == 1) {
          alpha1 = pod
          alpha2 = 1 - pod
        }

        // MIXMODE 2 hard mix
        if (mixmode == 2) {
          alpha1 = Math.round( pod )
          alpha2 = Math.round( 1-pod )
        }

        // MIXMODE 3 NAM mix
        if (mixmode == 3) {
          alpha1 = ( pod * 2 );
          alpha2 = 2 - ( pod * 2 );
          if ( alpha1 > 1 ) alpha1 = 1;
          if ( alpha2 > 1 ) alpha2 = 1;
        }

        // MIXMODE 4 FAM mix
        if (mixmode == 4) {
          alpha1 = ( pod * 2 );
          alpha2 = 2 - ( pod * 2 );
        }

        // MIXMODE 5 Non Dark mix
        if (mixmode == 5) {
          alpha1 = ( pod * 2 );
          alpha2 = 2 - ( pod * 2 );
          if ( alpha1 > 1 ) alpha1 = 1;
          if ( alpha2 > 1 ) alpha2 = 1;
          alpha1 += 0.36;
          alpha2 += 0.36;
        }

        // MIXMODE 6 left
        if (mixmode == 6) {
          alpha1 = 1;
          alpha2 = 0;
        }

        // MIXMODE 7 right
        if (mixmode == 7) {
          alpha1 = 0;
          alpha2 = 1;
        }

        // MIXMODE 8 center
        if (mixmode == 8) {
          alpha1 = 0.5;
          alpha2 = 0.5;
        }

        // MIXMODE 9 BOOM
        if (mixmode == 9) {
          alpha1 = 1;
          alpha2 = 1;
        }

        // DEPRICATED BECAUSE OF actual ALPHA
        // MIXMODE X ADDITIVE MIX LEFT (use with lumkey en chromkey)
        if (mixmode == 10 ) {
          alpha1 = pod
          alpha2 = 1;
        }

        // MIXMODE X ADDITIVE MIX RIGHT (use with lumkey en chromkey)
        if (mixmode == 11 ) {
          alpha1 = 1;
          alpha2 = pod
        }

        // send alphas to the shader
        renderer.customUniforms[_self.uuid+'_alpha1'].value = alpha1;
        renderer.customUniforms[_self.uuid+'_alpha2'].value = alpha2;
      }
      return pod;
    }

    /**
     * @description
     *  gets or sets the _bpm_ or beats per minutes, locally in this mixer
     *  defaults to 128
     * @function Module#Mixer#bpm
     * @param {number} bpm beats per minute
    */
    _self.bpm = function(_num) {
        if ( _num  != undefined ) currentBPM = _num
        return currentBPM
    }

    /**
     * @description
     *  gets or sets the _currentMOD_ or modifyer for the bpm
     *  this way you can modify the actual tempo, make the beats
     *  follow on half speed, or dubbel speed or *4, *2, /2, /4 etc.
     * @function Module#Mixer#bpmMod
     * @param {number} currentMod beat multiplyer for tempo
    */
    _self.bpmMod = function( _num ) {
      if ( _num  != undefined ) currentMOD = _num
      return currentMOD
    }

    /**
     * @description
     *  binds _currentBpmFunc_ to a function
     *  whatever BPM _currentBpmFunc_ returns will be bpm used.
     *  it's called on update
     * @example
     *   var mixer1 = new Mixer( renderer, { source1: file, source2: file})
     *   var audioanalysis = new AudioAnalysis( renderer, { audio: file })
     *   audioanalysis.bindBPM( audioanalysis.getBPM() * 0.5 )
     * @function Module#Mixer#bindBpm
     * @param {function} binding allows for overriding internal bpm
     */
    _self.bindBpm = function( _func ) {
        currentBpmFunc = _func
    }

    /**
     * @description
     *  sets setAutoFade true/false
     * @function Module#Mixer#setAutoFade
     * @param {boolean} autoFade to do, or do not
    */
    _self.setAutoFade = function( _bool ) {
      if ( _bool.toLowerCase() == "true" ) _self.autoFade = true
      if ( _bool.toLowerCase() == "false" ) _self.autoFade = false
    }

    /**
     * @description
     *  fades from one channel to the other in _duration_ milliseconds
     * @function Module#Mixer#fade
     * @param {float} fadeDuration the duration of the fade
    */
    _self.fade = function( _duration ) {
      var current = _self.pod()

      // starts the loop
      _self.fading = true

      var now = (new Date()).getTime()
      fadeTime = ( now + _duration );
      _self.pod() > 0.5 ? fadeTo = "a" : fadeTo = "b"
      console.log("fadeTo", fadeTo, fadeTime, now, _duration)
      fadeDuration = _duration
    }
  }
}

/**
  * @summary
  *  creates a preview of a certain point in the network
  * @description
  *  takes a node somewhere in your network, and previews the network untill
  *  there, and ignores the rest, this allows you to create previews on
  *  another canvas
  * @example
  *  This example would require 2 canvasses, glcanvas and monitoring_canvas
  *  to be on your page, the first one has a yellow filter, the preview has
  *  not
  *
  *  // create the main renderer
  * var renderer = new GlRenderer({element: 'glcanvas'});
  *
  * // sources
  * var source1 = new VideoSource(renderer, { src: "/video/placeholder.mp4" })
  * var source2 = new VideoSource(renderer, { src: "/video/16MMDUSTproc.mp4" })
  *
  * // mixer
  * var mixer1 = new Mixer( renderer, { source1: source1, source2: source2 });
  *
  * // preview out
  * var monitor = new Monitor( renderer, { source: mixer1, element: 'monitoring_canvas' })
  *
  * // add some effects
  * var contrast = new ColorEffect( renderer, { source: mixer1 } )
  * var c_effect = new ColorEffect( renderer, { source: contrast } )
  *
  * // final out
  * var output = new Output( renderer, c_effect )
  *
  * // initialize the renderer and start the renderer
  * renderer.init();         // init
  * renderer.render();       // start update & animation
  *
  * c_effect.effect(14)
  * contrast.effect(61)
  * contrast.extra(0.4)
  *
  * @example let myMixer = new Monitor( renderer, { source: node });
  * @constructor Module#Monitor
  * @implements Module
  * @param renderer:GlRenderer
  * @param options:Object
  * @author Sense Studios
  */


var Monitor = class {

  // information functions
  static function_list() {
    return []
  }

  static help() {
    return "ownoes"
  }

  constructor( renderer, options ) {

    // create and instance
    var _self = this;
    if (renderer == undefined) return

    // set or get uid
    if ( options.uuid == undefined ) {
      _self.uuid = "Mixer_" + (((1+Math.random())*0x100000000)|0).toString(16).substring(1);
    } else {
      _self.uuid = options.uuid
    }

    _self.renderer = renderer
    _self.source = options.source

    // add to renderer
    renderer.add(_self)

    // set options
    var _options;
    if ( options != undefined ) _options = options

    // set type
    _self.type = "Module";
    _self.internal_renderer = null

    /**
     * @description
     *  initializes the monitor through the (main) renderer
     * @example
     *  none
     * @function Addon#Monitor~init
     */

    _self.init = function() {

      /* TODO: rewrite into scenes?

        https://discourse.threejs.org/t/how-can-i-copy-a-webglrendertarget-texture-to-a-canvas/6897
        https://threejs.org/examples/webgl_multiple_canvases_grid.html
        https://stackoverflow.com/questions/41841441/three-js-drawing-texture-directly-to-canvas-without-creating-a-plane-in-a-bill
        https://threejs.org/docs/#api/en/renderers/WebGLRenderer.copyTextureToTexture

        okay, so this works, but! it could be more robust,
        if I read the documentation righg, there is a maximum of 8 canvasses
        for WebGL, but one renderer can adress different canvasses, so we might
        want to extend the original renderer with an extra scene, insteat of
        rewriting the whole thing
      */

      // create an internal renderer
      _self.internal_renderer = new GlRenderer({element: options.element});

      // copy the fragment and vertex shader so far
      _self.internal_renderer.fragmentShader = _self.renderer.fragmentShader
      _self.internal_renderer.vertexShader = _self.renderer.vertexShader

      // copy the uniforms and defines so far
      _self.internal_renderer.customUniforms = _self.renderer.customUniforms
      _self.internal_renderer.customDefines = _self.renderer.customDefines

      // add an output node
      var internal_output = new Output( _self.internal_renderer, _self.source )

      // initalize local rendering
      _self.internal_renderer.init()
      _self.internal_renderer.render()
    }

    /** @function Addon#Monitor~update */
    /**
     * @description
     *  description
     * @example
     *  example
     * @function Module#Monitor#update
     *
     */

    _self.update = function() {
      // TODO: we could handle render update functions locally, this would allow
      // to set lower framerate or color depth, making the previews less resource
      // intensive.
    }
  }
}

/**
 * @summary
 *   The output node is the mandatory last node of the mixer, it passes it's content directly to the @GlRenderer
 *
 * @description
 *   The output node is the mandatory last node of the mixer, it passes it's content directly to the {@link GlRenderer}
 *
 * @example
 *  let myChain = new output( renderer, source );
 *  renderer.init()
 *  renderer.render()
 * @implements Module
 * @constructor Module#Output
 * @param renderer{GlRenderer} a reference to the GLrenderer
 * @param source{Source} any valid source node
 * @author Sense Studios
 */

 // TODO: maybe remove this node, and change it for something on the renderer?
 // like:
 //
 // renderer.output( node )
 // renderer.init()
 // renderer.render()

function Output(renderer, _source ) {

  // create and instance
  var _self = this;

  // set or get uid
  _self.uuid = "Output_" + (((1+Math.random())*0x100000000)|0).toString(16).substring(1);
  _self.type = "Module"

  // add to renderer
  renderer.add(_self)

  // add source
  var source = _source

  _self.init = function() {
    // renderer.fragmentShader = renderer.fragmentShader.replace('/* custom_main */', 'final_output = '+ source.uuid +'_output;\n  /* custom_main */')
    renderer.fragmentShader = renderer.fragmentShader.replace('/* custom_main */', '\n  gl_FragColor = vec4( '+ source.uuid +'_output );\n')
  }

  _self.update = function() {}
}

/**
 * @summary
 *   A switcher selects either one of two sources
 *
 * @description
 *   Switcher
 *
 * @example
 *  let mySwitcher = new Switcher( renderer, [ source1, source2 ]] );
 * @constructor Module#Switcher
 * @implements Module
 * @param renderer{GlRenderer}
 * @param source{Source}
 * @author Sense Studios
 */

function Switcher(renderer, options ) {

  // create and instance
  var _self = this;

  // set or get uid
  _self.uuid = "Switcher_" + (((1+Math.random())*0x100000000)|0).toString(16).substring(1);
  _self.type = "Module"

  // add to renderer
  renderer.add(_self)

  // add sources, only 2 allowed, build mixers or use a chain
  _self.sources = [ options.source1, options.source2 ]; // array
  _self.active_source = 0

  _self.init = function() {

    console.log("Switcher", _self.uuid, _self.sources)

    renderer.customUniforms[_self.uuid+'_active_source'] = { type: "i", value: 1 }

    renderer.fragmentShader = renderer.fragmentShader.replace('/* custom_uniforms */', 'uniform int '+_self.uuid+'_active_source;\n/* custom_uniforms */')
    renderer.fragmentShader = renderer.fragmentShader.replace('/* custom_uniforms */', 'uniform vec4 '+_self.uuid+'_output;\n/* custom_uniforms */')

    // we actually need this for each instance itt. the Mixer
    renderer.fragmentShader = renderer.fragmentShader.replace('/* custom_helpers */',`
vec4 get_source_`+_self.uuid+` ( int active_source, vec4 src1, vec4 src2 ) {
  if ( active_source ==  0 ) return src1;\
  if ( active_source ==  1 ) return src2;\
}
/* custom_helpers */
`
    );

    // renderer.fragmentShader = renderer.fragmentShader.replace('/* custom_main */', 'final_output = '+ source.uuid +'_output;\n  /* custom_main */')
    renderer.fragmentShader = renderer.fragmentShader.replace('/* custom_main */', '\
vec4 '+_self.uuid+'_output = get_source_'+_self.uuid+'('+_self.uuid+'_active_source, '+_self.sources[0].uuid +'_output, '+_self.sources[1].uuid +'_output );\n  /* custom_main */')
  }

  _self.update = function() {}
  _self.render = function() {
    return _self.sources[ _self.active_source ]
  }

  _self.doSwitch = function( _num ) {
    if ( _num == undefined ) {
      if (_self.active_source == 0) {
        _self.active_source = 1
      }else{
        _self.active_source = 0
      }
    }else{
      if ( _num != 0 && _num != 1) {
        console.log( _self.uuid, _num, "not allowed")
      }else{
        _self.active_source = _num
      }
    }
    renderer.customUniforms[_self.uuid+'_active_source'] = { type: "i", value: _self.active_source }
    return _self.active_source
  }
}

/**
 * @constructor Source
 * @interface
 * @summary
 *   A source is the imput for a mixer. It can be an image, video, text etc.
 *
 * @description
 *   A source is the imput for a mixer. It can be an image, video, text etc.
 *
 *
 *
 * @author Sense studios
 */

function Source( renderer, options ) {
  var _self = this

  _self.type = "Source"
  _self.function_list = [["JUMP","method","jump"]]

  // override these
  // program interface
  _self.init =         function() {}
  _self.update =       function() {}
  _self.render =       function() {}
  _self.start =        function() {}

  // control interface
  _self.src =          function( _file ) {} // .gif
  _self.play =         function() {}
  _self.pause =        function() {}
  _self.paused =       function() {}
  _self.currentFrame = function( _num ) {}  // seconds
  _self.duration =     function() {}        // seconds

  _self.jump =         function() {}
  //_self.cue =          function() {}      // still no solid solution
}

GifSource.prototype = new Source(); // assign prototype to marqer
GifSource.constructor = GifSource;  // re-assign constructor

/**
 * @summary
 *  Allows for an (animated) GIF file to use as input for the mixer
 *  Giphy Example on codepen:
 *  <a href="https://codepen.io/xangadix/pen/vqmWzN" target="_blank">codepen</a>
 *
 * @description
 *  Allows for an (animated) GIF file to use as input for the mixer
 *
 * @implements Source
 * @constructor Source#GifSource
 * @param {GlRenderer} renderer - GlRenderer object
 * @param {Object} options - JSON Object
 */

function GifSource( renderer, options ) {

  // create and instance
  var _self = this;
  if ( options.uuid == undefined ) {
    _self.uuid = "GifSource_" + (((1+Math.random())*0x100000000)|0).toString(16).substring(1);
  } else {
    _self.uuid = options.uuid
  }

  // set type
  _self.type = "GifSource"

  // allow bypass
  _self.bypass = true;

  // add to renderer
  renderer.add(_self)

  // set options
  var _options;
  if ( options != undefined ) _options = options;

  // set the source
  if ( options.src == undefined ) {
     _self.currentSrc = 'https://virtualmixerproject.com/gif/a443ae90a963a657e12737c466ddff95.gif'
  } else {
    _self.currentSrc = options.src
  }

  // create elements (private)
  var canvasElement, gifElement, canvasElementContext, gifTexture, supergifelement; // wrapperElemen
  var alpha = 1;

  _self.init = function() {

    // create canvas
    canvasElement = document.createElement('canvas');
    canvasElement.width = 1024;
    canvasElement.height = 1024;
    canvasElementContext = canvasElement.getContext( '2d' );

    // create the texture
    gifTexture = new THREE.Texture( canvasElement );

    // set the uniforms on the renderer
    renderer.customUniforms[_self.uuid] = { type: "t", value: gifTexture }
    renderer.customUniforms[_self.uuid+'_alpha'] = { type: "f", value: alpha }

    // add uniforms to shader
    renderer.fragmentShader = renderer.fragmentShader.replace( '/* custom_uniforms */', 'uniform sampler2D '+_self.uuid+';\n/* custom_uniforms */' )
    renderer.fragmentShader = renderer.fragmentShader.replace( '/* custom_uniforms */', 'uniform vec4 '+_self.uuid+'_output;\n/* custom_uniforms */' )
    renderer.fragmentShader = renderer.fragmentShader.replace( '/* custom_uniforms */', 'uniform float '+_self.uuid+'_alpha;\n/* custom_uniforms */' )

    // add output to main function
    renderer.fragmentShader = renderer.fragmentShader.replace( '/* custom_main */', 'vec4 '+_self.uuid+'_output = ( texture2D( '+_self.uuid+', vUv ).rgba * '+_self.uuid+'_alpha );\n  /* custom_main */' )

    // expose gif and canvas
    _self.gif = supergifelement
    _self.canvas = canvasElement

    // actual gif stuff
    window.image_source = new Image()

    // $('body').append("<div id='gif_"+_self.uuid+"' rel:auto_play='1'></div>");
    gifElement = document.createElement('img')
    gifElement.setAttribute('id', 'gif_'+_self.uuid)
    gifElement.setAttribute('rel:auto_play', '1')
    supergifelement = new SuperGif( { gif: gifElement, c_w: "1024px", c_h: "576px" } );
    supergifelement.draw_while_loading = true

    // sup1.load();
    console.log(_self.uuid, " Load", _self.currentSrc, "..." )
    //supergifelement.load_url( _self.currentSrc )
    supergifelement.load_url( _self.currentSrc, function() {
      console.log("play initial source");
      supergifelement.play();
    } )

    console.log('Gifsource Loaded First source!', _self.currentSrc, "!")
     _self.bypass = false
  }

  var c = 0;
  _self.update = function() {

    // FIXME: something evil happened here.
    // if (_self.bypass == false) return
    try {
      // modulo is here because gif encoding is insanley expensive
      // TODO: MAKE THE MODULE SETTABLE.
      if (c%6 == 0) {
        canvasElementContext.clearRect(0, 0, 1024, 1024);
        canvasElementContext.drawImage( supergifelement.get_canvas(), 0, 0, 1024, 1024  );
        if ( gifTexture ) gifTexture.needsUpdate = true;
      }
      c++;
    }catch(e){
      // not yet
    }
  }

  _self.render = function() {
    return gifTexture
  }

  // Interface helpers ---------------------------------------------------------
  _self.src = function( _file ) {
    if ( _file == undefined ) return _self.currentSrc

    console.log("load new src: ", _file)
    _self.currentSrc = _file
    supergifelement.pause()
    supergifelement.load_url( _file, function() {
      console.log("play gif", _file);
      supergifelement.play();
    } )
  }

  _self.play =         function() { return supergifelement.play() }
  _self.pause =        function() { return supergifelement.pause() }
  _self.paused =       function() { return !supergifelement.get_playing() }
  _self.currentFrame = function( _num ) {
    if ( _num === undefined ) {
      return supergifelement.get_current_frame();
    } else {
      supergifelement.move_to(_num);
      return _num;
    }

  }
  // seconds
  _self.duration =     function() { return supergifelement.get_length() }
};

MultiVideoSource.prototype = new Source(); // assign prototype to marqer
MultiVideoSource.constructor = MultiVideoSource;  // re-assign constructor

  // TODO: implement these as arrays !
  // This is new, but better?
  // Or let file manager handle it?
  // var videos =        [];   // video1, video2, video3, ...
  // var videoTextures = [];   // videoTexture1, videoTextures,  ...
  // var bufferImages =  [];   // bufferImage1, bufferImage2, ...

/**
 *
 * @summary
 *  The MultiVideoSource allows for playback of video files in the Mixer project.
 *  And optimizes video playback in online scenarios
 *
 * @description
 *  The MultiVideoSource allows for playback of video files in the Mixer project.
 *  It is very similar to the regular videosource, however it used multiple references to the videofile.
 *  In doing so it allows for very fast jumping through the video even when it is loading from a remote server.
 *  The main features are random jumping and a cue list, allowing for smart referincing in video files.
 *
 * @implements Source
 * @constructor Source#MultiVideoSource
 * @example let myMultiVideoSource = new MultiVideoSource( renderer, { src: 'myfile.mp4', cues: [ 0, 10, 20, 30 ] } );
 * @param {GlRenderer} renderer - GlRenderer object
 * @param {Object} options - JSON Object, with src (file path) and cues, cuepoints in seconds
 */

function MultiVideoSource(renderer, options) {

  // create and instance
  var _self = this;

  if ( options.uuid == undefined ) {
    _self.uuid = "MultiVideoSource_" + (((1+Math.random())*0x100000000)|0).toString(16).substring(1);
  } else {
    _self.uuid = options.uuid
  }

  _self.type = "MultiVideoSource"
  _self.bypass = true;
  renderer.add(_self)

  var _options;
  if ( options != undefined ) _options = options;
  var canvasElement, canvasElementContext, videoTexture;
  var videoElements = []; // maybe as array?
  var currentVideo = null // the curret video

  var alpha = 1;

  // initialize
  _self.init = function() {

    // FIXME: Can we clean this up and split into several functions

    console.log("init video source", _self.uuid)

    // create video element
    videoElement = document.createElement('video');
    videoElement.setAttribute("crossorigin","anonymous")
    videoElement.muted= true

    // set the source
    if ( options.src == undefined ) {
      videoElement.src = "/streamable.com/w0skqb";
    } else {
      videoElement.src = options.src
    }
    console.log('loaded source: ', videoElement.src )

    // set properties
    videoElement.height = 1024
    videoElement.width = 1024
    videoElement.loop = true          // must call after setting/changing source
    videoElement.load();              // must call after setting/changing source
    _self.firstplay = false

    // Here we wait for a user to click and take over
    // especially for mobile
    var playInterval = setInterval( function() {
      if ( videoElement.readyState == 4 ) {
        var r = Math.random() * videoElement.duration
        videoElement.currentTime = r
        videoElement.play();
        _self.firstplay = true
        console.log(_self.uuid, "First Play; ", r)
        clearInterval(playInterval)
      }
    }, 400 )

    // firstload handler for mobile; neest at least 1 user click
    document.body.addEventListener('click', function() {
      videoElement.play();
      _self.firstplay = true
    });

    videoElement.volume = 0;

    // videoElement.currentTime = Math.random() * 60   // use random in point

    // FOR FIREBASE
    // listen for a timer update (as it is playing)
    // video1.addEventListener('timeupdate', function() {firebase.database().ref('/client_1/video1').child('currentTime').set( video1.currentTime );})
    // video2.currentTime = 20;

    // create canvas
    canvasElement = document.createElement('canvas');
    canvasElement.width = 1024;
    canvasElement.height = 1024;
    canvasElementContext = canvasElement.getContext( '2d' );

    // create the videoTexture
    videoTexture = new THREE.Texture( canvasElement );
    // videoTexture.minFilter = THREE.LinearFilter;

    // -------------------------------------------------------------------------
    // Set shader params
    // -------------------------------------------------------------------------

    // set the uniforms
    renderer.customUniforms[_self.uuid] = { type: "t", value: videoTexture }
    renderer.customUniforms[_self.uuid+'_alpha'] = { type: "f", value: alpha }

    // add uniform
    renderer.fragmentShader = renderer.fragmentShader.replace('/* custom_uniforms */', 'uniform sampler2D '+_self.uuid+';\n/* custom_uniforms */')
    renderer.fragmentShader = renderer.fragmentShader.replace('/* custom_uniforms */', 'uniform vec4 '+_self.uuid+'_output;\n/* custom_uniforms */')
    renderer.fragmentShader = renderer.fragmentShader.replace('/* custom_uniforms */', 'uniform float '+_self.uuid+'_alpha;\n/* custom_uniforms */')

    // add main
    renderer.fragmentShader = renderer.fragmentShader.replace('/* custom_main */', 'vec4 '+_self.uuid+'_output = ( texture2D( '+_self.uuid+', vUv ).rgba * '+_self.uuid+'_alpha );\n  /* custom_main */')

    // expose video and canvas
    /**
     * @description exposes the HTMLMediaElement Video for listeners and control
     * @member Source#MultiVideoSource#video
     */
    _self.video = videoElement
    _self.canvas = canvasElement

    // remove the bypass
    _self.bypass = false
  }

  _self.update = function() {
    if (_self.bypass = false) return
    if ( videoElement.readyState === videoElement.HAVE_ENOUGH_DATA && !videoElement.seeking) {
      canvasElementContext.drawImage( videoElement, 0, 0, 1024, 1024 );
      if ( videoTexture ) videoTexture.needsUpdate = true;
    }else{
      // canvasElementContext.drawImage( videoElement, 0, 0, 1024, 1024 );
      // console.log("SEND IN BLACK!")
      canvasElementContext.clearRect(0, 0, 1024, 1024);
      _self.alpha = 0
    }
  }

  // return the video texture, for direct customUniforms injection (or something)
  _self.render = function() {
    return videoTexture
  }

  // ===========================================================================
  // Actual HELPERS
  // ===========================================================================

  /**
   * @description
   *  gets or sets source @file for the MultiVideoSource
   *  file has to be compatible with HTMLMediaElement Video ie. webm, mp4 etc.
   *  We recommend **mp4**
   *
   * @function Source#MultiVideoSource#src
   * @param {file} Videofile - full path to file
   */
  _self.src = function( file ) {
    videoElement.src = file
    var playInterval = setInterval( function() {
      if ( videoElement.readyState == 4 ) {
        videoElement.play();
        console.log(_self.uuid, "First Play.")
        clearInterval(playInterval)
      }
    }, 400 )
  }

  /**
   * @description start the current video
   * @function Source#MultiVideoSource#play
   */
  _self.play =         function() { return videoElement.play() }

  /**
   * @description pauses the video
   * @function Source#MultiVideoSource#pause
   */
  _self.pause =        function() { return videoElement.pause() }

  /**
   * @description returns true then the video is paused. False otherwise
   * @function Source#MultiVideoSource#paused
   */
  _self.paused =       function() { return videoElement.paused }

  /**
   * @description skip to _time_ (in seconds) or gets `currentTime` in seconds
   * @function Source#MultiVideoSource#currentTime
   * @param {float} time - time in seconds
   */
  _self.currentTime = function( _num ) {
    if ( _num === undefined ) {
      return videoElement.currentTime;
    } else {
      console.log("set time", _num)
      videoElement.currentTime = _num;
      return _num;
    }

  }

  // seconds
  /**
   * @description give the duration of the video in seconds (cannot be changed)
   * @function Source#MultiVideoSource#duration
   */
  _self.duration =     function() { return videoElement.duration }    // seconds

  // ===========================================================================
  // For now only here, move to _source?
  // ===========================================================================

  _self.alpha = function(a) {
    if (a == undefined) {
      return renderer.customUniforms[_self.uuid+'_alpha'].value
    }else{
      renderer.customUniforms[_self.uuid+'_alpha'].value = a
    }
  }

  _self.jump = function( _num) {
    if ( _num == undefined || isNaN(_num) ) {
      try {
        videoElement.currentTime = Math.floor( ( Math.random() * _self.duration() ) )
      }catch(e){
        console.log("prevented a race error")
      }
    } else {
      videoElement.currentTime = _num
    }

    return videoElement.currentTime
  }

  // ===========================================================================
  // Rerturn a reference to self
  // ===========================================================================

  // _self.init()
}

SocketSource.prototype = new Source(); // assign prototype to marqer
SocketSource.constructor = SocketSource;  // re-assign constructor

/**
 * @summary
 *  This will serve as a 'receiver' or a send/receiver module for remote video
 *  viewing; ie. you should be able to send a stream, or part theirof to another machine
 *
 *
 * @description
 *
 *  This will serve as a 'receiver' or a send/receiver module for remote video
 *  viewing; ie. you should be able to send a stream, or part theirof to another machine
 *
 *
 * @example
 *  ...
 *
 *
 * @implements Soutce
 * @constructor Soutce#SocketSource
 * @author Sense Studios
 */

 function SocketSource(renderer, options) {
  var _self = this


   /*
    http://www.coding4developers.com/node-js/video-stream-with-node-js-socket-io-stream-data-in-node-js-using-socket-io/
    function viewVideo(video,context){
      context.drawImage(video,0,0,context.width,context.height);
      socket.emit('stream',canvas.toDataURL('image/webp'));
     }

     var socket = new WebSocket('ws://localhost');
     socket.binaryType = 'arraybuffer';
    socket.send(new ArrayBuffer);

    var theDataURL = canvas.toDataURL('image/jpeg',jpgQuality);

    // deserialize
    var img=new Image();
img.onload=start;
img.src=theBase64URL;
function start(){
    document.body.appendChild(img);
    // or
    context.drawImage(img,0,0);

  _self.addStream()
  _self.sendStream()
  _self.addListener()
  */
 }

//function SolidSource
// https://github.com/mrdoob/three.js/wiki/Uniforms-types

SolidSource.prototype = new Source(); // assign prototype to marqer
SolidSource.constructor = SolidSource;  // re-assign constructor

/**
 *
 * @summary
 *  Allows a solid color to serve as an input element
 *
 * @description
 *  Allows a solid color to serve as an input element
 *
 * @implements Source
 * @constructor Source#SolidSource
 * @example var red = new SolidSource( renderer, { color: { r: 1.0, g: 0.0, b: 0.0 } } );
 * @param {GlRenderer} renderer - GlRenderer object
 * @param {Object} options - JSON Object
 */

function SolidSource(renderer, options) {
  // vec3( 1.0, 0.0, 0.0 )

  var _self = this;
  if ( options.uuid == undefined ) {
    _self.uuid = "SolidSource_" + (((1+Math.random())*0x100000000)|0).toString(16).substring(1);
  } else {
    _self.uuid = options.uuid
  }

  // no updates
  _self.bypass = true;

  // add to renderer
  renderer.add(_self)

  // set options
  var _options;
  var color = { r:0.0, g:0.0, b:0.0, a: 1.0 }

  if ( options != undefined ) _options = options;

  _self.init = function() {
    console.log("init solid", _options)
    if (_options.color != undefined) color = _options.color

    // add uniforms
    renderer.customUniforms[_self.uuid + "_color"] = { type: "v4", value: new THREE.Vector4( color.r, color.g, color.b, color.a ) }

    // ad variables to shader
    renderer.fragmentShader = renderer.fragmentShader.replace('/* custom_uniforms */', 'uniform vec4 '+_self.uuid+'_color;\n/* custom_uniforms */')
    renderer.fragmentShader = renderer.fragmentShader.replace('/* custom_uniforms */', 'uniform vec4 '+_self.uuid+'_output;\n/* custom_uniforms */')

    // add output to shader
    renderer.fragmentShader = renderer.fragmentShader.replace('/* custom_main */', 'vec4 '+_self.uuid+'_output = '+_self.uuid+'_color;\n  /* custom_main */')
  }

  _self.update = function() {}
  _self.render = function() { return color; }

  // ---------------------------------------------------------------------------
  // Helpers
  /**
  * @implements Source
  * @function Source#SolidSource#color
  * @example red.color( { r: 0.0, g: 0.0, b: 1.0 } );
  * @param {float} r - red value
  * @param {float} g - green value
  * @param {float} b - blue value
  * @param {float} a - alpha value (optional)
  * @returns color
  */
  _self.color = function( c ) {
    if ( c != undefined ) {
      color = c
      if (color.a == undefined ) color.a = 1.0 // just to be sore
      console.log(_self.uuid, " sets color: ", color )
      renderer.customUniforms[_self.uuid + "_color"] = { type: "v4", value: new THREE.Vector4( color.r, color.g, color.b, color.a ) }
    }
    return color
  }

  _self.jump = function( _num ) {
    console.log("no")
  }
}


  // create and instance


SVGSource.prototype = new Source(); // assign prototype to marqer
SVGSource.constructor = SVGSource;  // re-assign constructor

// TODO
// hook Lottie up

function SVGSource(renderer, options) {}


TextSource.prototype = new Source(); // assign prototype to marqer
TextSource.constructor = TextSource;  // re-assign constructor

  // TODO: implement these as arrays ?
  // This is new, but better
  // var videos =        [];   // video1, video2, video3, ...
  // var divTextures = [];   // divTexture1, divTextures,  ...
  // var bufferImages =  [];   // bufferImage1, bufferImage2, ...

function TextSource(renderer, options) {

  // create and instance
  var _self = this;

  if ( options.uuid == undefined ) {
    _self.uuid = "TextSource_" + (((1+Math.random())*0x100000000)|0).toString(16).substring(1);
  } else {
    _self.uuid = options.uuid
  }

  _self.type = "TextSource"

  // allow bypass
  _self.bypass = true;

  // add to renderer
  renderer.add(_self)

  // set options
  var _options;
  if ( options != undefined ) _options = options;

  // create elements (private)
  var canvasElement, divElement, canvasElementContext, divTexture; // wrapperElemen
  var alpha = 1;

  // initialize
  _self.init = function() {

    console.log("init text source", _self.uuid)

    // create video element
    divElement = document.createElement('DIV');
    divElement.innerHTML = "<h1> Awaiting text </h1>"
    //divElement.setAttribute("crossorigin","anonymous")
    //divElement.muted= true

    // set the source
    //if ( options.src == undefined ) {
    //  divElement.src = "/streamable.com/w0skqb";
    //} else {
    //  divElement.src = options.src
    //}
    // console.log('created div element: ', divElement )

    // set properties
    divElement.height = 1024
    divElement.width = 1024
    //divElement.loop = true          // must call after setting/changing source
    //divElement.load();              // must call after setting/changing source
    _self.firstplay = false

    //var playInterval = setInterval( function() {
    //  if ( divElement.readyState == 4 ) {
    //    var r = Math.random() * divElement.duration
    //    divElement.currentTime = r
    //    divElement.play();
    //    _self.firstplay = true
    //    console.log(_self.uuid, "First Play; ", r)
    //    clearInterval(playInterval)
    //  }
    //}, 400 )

    // firstload for mobile
    //$("body").click(function() {
    //  divElement.play();
    //  _self.firstplay = true
    //});

    //divElement.volume = 0;
    //divElement.currentTime = Math.random() * 60   // use random in point

    // listen for a timer update (as it is playing)
    // video1.addEventListener('timeupdate', function() {firebase.database().ref('/client_1/video1').child('currentTime').set( video1.currentTime );})
    // video2.currentTime = 20;

    // create canvas
    canvasElement = document.createElement('canvas');
    document.body.appendChild(canvasElement)
    canvasElement.width = 1024;
    canvasElement.height = 1024;
    canvasElementContext = canvasElement.getContext( '2d' );

    // create the divTexture
    divTexture = new THREE.CanvasTexture( canvasElement );
    // divTexture.minFilter = THREE.LinearFilter;

    // -------------------------------------------------------------------------
    // Set shader params
    // -------------------------------------------------------------------------

    // set the uniforms
    renderer.customUniforms[_self.uuid] = { type: "t", value: divTexture }
    renderer.customUniforms[_self.uuid+'_alpha'] = { type: "f", value: alpha }

    // add uniform
    renderer.fragmentShader = renderer.fragmentShader.replace('/* custom_uniforms */', 'uniform sampler2D '+_self.uuid+';\n/* custom_uniforms */')
    renderer.fragmentShader = renderer.fragmentShader.replace('/* custom_uniforms */', 'uniform vec4 '+_self.uuid+'_output;\n/* custom_uniforms */')
    renderer.fragmentShader = renderer.fragmentShader.replace('/* custom_uniforms */', 'uniform float '+_self.uuid+'_alpha;\n/* custom_uniforms */')

    // add main
    renderer.fragmentShader = renderer.fragmentShader.replace('/* custom_main */', 'vec4 '+_self.uuid+'_output = ( texture2D( '+_self.uuid+', vUv ).rgba * '+_self.uuid+'_alpha );\n  /* custom_main */')

    // expose video and canvas
    _self.divElement = divElement
    _self.canvas = canvasElement

    // remove the bypass
    _self.bypass = false
  }

  // this should be set externally, of course
  var text = null; utils.get('/texts/fear_is_the_mind_killer.txt', function(d) { text = d; console.log("get text", d) })

  // textbehaviour should be loaded externally too
  var text_c = 0
  var current_text = ""
  var current_text_num = 0;
  var next_interval = 12;
  var big_text_y = 600
  var big_text_x = 300
  var title_text_font_size = 64
  var small_text_x = 512
  _self.update = function() {

    title_text_font_size *= 0.990

    if (_self.bypass = false) return
    if ( text == null ) return
    // alert('oi')
    //if ( divElement.readyState === divElement.HAVE_ENOUGH_DATA ) {
    //canvasElementContext.drawImage( divElement, 0, 0, 1024, 1024 );
    canvasElementContext.clearRect(0, 0, canvasElement.width, canvasElement.height);
    //canvasElementContext.fillStyle="#FF0000";
    //canvasElementContext.fillRect(0,0,canvasElement.width, canvasElement.height);

    canvasElementContext.fillStyle="rgba(60, 60, 60, 0.4)";
    canvasElementContext.font = "604px IMPACT";
    canvasElementContext.textAlign = "center";
    canvasElementContext.fillText( current_text.split(".").join(""), (bpm.render()*10)+big_text_x, big_text_y ); //(bpm.render()*200)+300

    canvasElementContext.fillStyle= "white";
    canvasElementContext.font = title_text_font_size + "px IMPACT";
    canvasElementContext.textAlign = "center";
    canvasElementContext.fillText( current_text.split(".").join(""), small_text_x,460); //(bpm.render()*200)+300

    //console.log( text_c, next_interval, current_text, current_text_num)
    if ( text_c > next_interval ) {
      current_text = text.split(",")[current_text_num]
      next_interval = ( text.split(",")[current_text_num].length * ( bpm.bpm / 72 ) ) + 3 // * bpm.render()

      current_text_num++
      if (current_text_num == text.split(",").length) current_text_num = 0
      text_c = 0

      big_text_y = Math.floor(Math.random()*200) + 600
      big_text_x = Math.floor(Math.random()*200) + 200
      small_text_x = Math.floor(Math.random()*100) + 470
      title_text_font_size = Math.floor(Math.random()*30) + 70
    }
    text_c++

    if ( divTexture ) divTexture.needsUpdate = true;
    //}
  }

  // return the video texture, for direct customUniforms injection (or something)
  _self.render = function() {
    return divTexture
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  /*
  _self.src = function( file ) {
    divElement.src = file
    var playInterval = setInterval( function() {
      if ( divElement.readyState == 4 ) {
        divElement.play();
        console.log(_self.uuid, "First Play.")
        clearInterval(playInterval)
      }
    }, 400 )
  }

  // Or use source.video[...]
  _self.play =         function() { return divElement.play() }
  _self.pause =        function() { return divElement.pause() }
  _self.paused =       function() { return divElement.paused }
  _self.currentTime = function( _num ) {
    if ( _num === undefined ) {
      return divElement.currentTime;
    } else {
      console.log("set time", _num)
      divElement.currentTime = _num;
      return _num;
    }

  }  // seconds
  _self.duration =     function() { return divElement.duration }    // seconds
  */
  // ===========================================================================
  // For now only here, move to _source?
  // ===========================================================================

  _self.alpha = function(a) {
    if (a == undefined) {
      return renderer.customUniforms[_self.uuid+'_alpha'].value
    }else{
      renderer.customUniforms[_self.uuid+'_alpha'].value = a
    }
  }

  // ===========================================================================
  // Rerturn a reference to self
  // ===========================================================================

  // _self.init()
}

VideoSource.prototype = new Source(); // assign prototype to marqer
VideoSource.constructor = VideoSource;  // re-assign constructor

/**
*
* @summary
*  The videosource allows for playback of video files in the Mixer project
*  VideoSource Example on codepen:
*  <a href="https://codepen.io/xangadix/pen/zewydR" target="_blank">codepen</a>
*
*
* @description
*  The videosource allows for playback of video files in the Mixer project
*
* @implements Source
* @constructor Source#VideoSource
* @example let myVideoSource = new VideoSource( renderer, { src: 'myfile.mp4' } );
* @param {GlRenderer} renderer - GlRenderer object
* @param {Object} options - JSON Object
*/

function VideoSource(renderer, options) {

  // create and instance
  var _self = this;

  var texture_size = 1024

  if ( options.uuid == undefined ) {
    _self.uuid = "VideoSource_" + (((1+Math.random())*0x100000000)|0).toString(16).substring(1);
  } else {
    _self.uuid = options.uuid
  }

  // set options
  var _options = {};
  if ( options != undefined ) _options = options;

  _self.currentSrc = "https://virtualmixproject.com/video/placeholder.mp4"
  _self.type = "VideoSource"
  _self.bypass = true;

  // create elements (private)
  var canvasElement, videoElement, canvasElementContext, videoTexture; // wrapperElemen
  var alpha = 1;

  // add to renderer
  renderer.add(_self)

  // initialize
  _self.init = function() {

    // FIXME: Can we clean this up and split into several functions

    console.log("init video source", _self.uuid)

    // create video element
    videoElement = document.createElement('video');
    videoElement.setAttribute("crossorigin","anonymous")
    videoElement.setAttribute("playsinline",true)
    videoElement.playsinline = true
    videoElement.preload = 'auto'
    videoElement.muted= true
    videoElement.poster= "https://virtualmixproject.com/gif/telephone-pole-wire-tennis-shoes.jpg"

    // set the source
    if ( options.src == undefined ) {
      videoElement.src = _self.currentSrc;
    } else {
      videoElement.src = options.src
    }
    console.log('loaded source: ', videoElement.src )

    // set properties
    videoElement.height = texture_size;
    videoElement.width = texture_size;
    videoElement.volume = 0;
    videoElement.loop = true          // must call after setting/changing source
    videoElement.load();              // must call after setting/changing source
    _self.firstplay = false

    // Here we wait for a user to click and take over
    var playInterval = setInterval( function() {
      if ( videoElement.readyState == 4 ) {
        var r = Math.random() * videoElement.duration
        //videoElement.currentTime = r
        videoElement.play();
        _self.firstplay = true
        console.log(_self.uuid, "First Play; ", r)
        clearInterval(playInterval)
      }
    }, 400 )

    function firstTouch() {
      //return
      videoElement.play();
      _self.firstplay = true
      document.body.removeEventListener('click', firstTouch)
      document.body.removeEventListener('touchstart', firstTouch)
      console.log("first touch was denied")
    }
    // firstload handler for mobile; neest at least 1 user click
    document.body.addEventListener('click', firstTouch)
    document.body.addEventListener('touchstart', firstTouch)



    // FOR FIREBASE
    // listen for a timer update (as it is playing)
    // video1.addEventListener('timeupdate', function() {firebase.database().ref('/client_1/video1').child('currentTime').set( video1.currentTime );})
    // video2.currentTime = 20;

    // create canvas
    canvasElement = document.createElement('canvas');
    canvasElement.width = texture_size;
    canvasElement.height = texture_size;
    canvasElementContext = canvasElement.getContext( '2d' );

    // create the videoTexture
    videoTexture = new THREE.Texture( canvasElement );
    videoTexture.wrapS = THREE.RepeatWrapping;
    videoTexture.wrapT = THREE.RepeatWrapping;
    // videoTexture.minFilter = THREE.LinearFilter;

    // -------------------------------------------------------------------------
    // Set shader params
    // -------------------------------------------------------------------------

    // set the uniforms
    renderer.customUniforms[_self.uuid] = { type: "t", value: videoTexture }
    renderer.customUniforms[_self.uuid+'_alpha'] = { type: "f", value: alpha }
    // renderer.customUniforms[_self.uuid+'_uvmap'] = { type: "v2", value: new THREE.Vector2( 0., 0. ) }
    // renderer.customUniforms[_self.uuid+'_uvmap_mod'] = { type: "v2", value: new THREE.Vector2( 1., 1. ) }

    // add uniform
    renderer.fragmentShader = renderer.fragmentShader.replace('/* custom_uniforms */', 'uniform sampler2D '+_self.uuid+';\n/* custom_uniforms */')
    renderer.fragmentShader = renderer.fragmentShader.replace('/* custom_uniforms */', 'uniform float '+_self.uuid+'_alpha;\n/* custom_uniforms */')
    // renderer.fragmentShader = renderer.fragmentShader.replace('/* custom_uniforms */', 'uniform vec2 '+_self.uuid+'_uvmap;\n/* custom_uniforms */')
    // renderer.fragmentShader = renderer.fragmentShader.replace('/* custom_uniforms */', 'uniform vec2 '+_self.uuid+'_uvmap_mod;\n/* custom_uniforms */')

    // add main
    // split output in distorted and orig?
    renderer.fragmentShader = renderer.fragmentShader.replace('/* custom_main */', 'vec4 '+_self.uuid+'_output = ( texture2D( '+_self.uuid+', vUv ).rgba * '+_self.uuid+'_alpha );\n  /* custom_main */')

    // expose video and canvas
    /**
     * @description exposes the HTMLMediaElement Video for listeners and control
     * @member Source#VideoSource#video
     */
    _self.video = videoElement
    _self.canvas = canvasElement

    // remove the bypass
    _self.bypass = false
  }

  var i = 0
  _self.update = function() {


    if (_self.bypass = false) return    
    if ( videoElement && videoElement.readyState.readyState === videoElement.HAVE_ENOUGH_DATA && !videoElement.seeking) {
      canvasElementContext.drawImage( videoElement, 0, 0, texture_size, texture_size );

      if ( videoTexture ) videoTexture.needsUpdate = true;
    }else{
      canvasElementContext.drawImage( videoElement, 0, 0, texture_size, texture_size );  // send last image
      // TODO: console.log("SEND IN BLACK!") ?
      // canvasElementContext.clearRect(0, 0, 1024, 1024); // send nothing
      //_self.alpha = 0
      if ( videoTexture ) videoTexture.needsUpdate = true;
    }
  }

  // return the video texture, for direct customUniforms injection (or something)
  _self.render = function() {
    return videoTexture
  }

  // ===========================================================================
  // Actual HELPERS
  // ===========================================================================

  /**
   * @description
   *  gets or sets source @file for the videosource
   *  file has to be compatible with HTMLMediaElement Video ie. webm, mp4 etc.
   *  We recommend **mp4**
   *
   * @function Source#VideoSource#src
   * @param {file} Videofile - full path to file
   */
  _self.src = function( _file ) {
    if ( _file == undefined ) return currentSrc

    try {
      _self.currentSrc = _file
    }catch(e){
      console.log("VideoSource returned empty promise, retrying ...")
      return;
    }
    videoElement.src = _file
    videoElement.play();

    // shouldn't be a defulat
    // setTimeout( function() { _self.jump() }, 300 )

    /*
    videoElement.oncanplay( function() {
      if ( videoElement.readyState == 4 ) {
        videoElement.play();
        console.log(_self.uuid, "First Play.")
      }
    })
    */

    //var playInterval = setInterval(
    //    clearInterval(playInterval)
    //  }
    //}, 400 )
  }

  /**
   * @description start the current video
   * @function Source#VideoSource#play
   */
  _self.play =         function() { return videoElement.play() }

  /**
   * @description pauses the video
   * @function Source#VideoSource#pause
   */
  _self.pause =        function() { return videoElement.pause() }

  /**
   * @description returns true then the video is paused. False otherwise
   * @function Source#VideoSource#paused
   */
  _self.paused =       function() { return videoElement.paused }

  /**
   * @description skip to _time_ (in seconds) or gets `currentTime` in seconds
   * @function Source#VideoSource#currentTime
   * @param {float} time - time in seconds
   */
  _self.currentTime = function( _num ) {
    if ( _num === undefined ) {
      return videoElement.currentTime;
    } else {
      console.log("set time", _num)
      videoElement.currentTime = _num;
      return _num;
    }
  }

  // seconds
  /**
   * @description give the duration of the video in seconds (cannot be changed)
   * @function Source#VideoSource#duration
   */
  _self.duration =     function() { return videoElement.duration }    // seconds

  // ===========================================================================
  // For now only here, move to _source?
  // ===========================================================================
  _self.setUVMap = function( _x, _y ) {
     renderer.customUniforms[_self.uuid+'_uvmap'].value = new THREE.Vector2( _x, _y )
  }

  _self.setUVMapMod = function( _x, _y ) {
    renderer.customUniforms[_self.uuid+'_uvmap_mod'].value = new THREE.Vector2( _x, _y )
  }


  _self.alpha = function(a) {
    if (a == undefined) {
      return renderer.customUniforms[_self.uuid+'_alpha'].value
    }else{
      renderer.customUniforms[_self.uuid+'_alpha'].value = a
    }
  }

  _self.jump = function( _num) {

    // failsafe
    if ( videoElement.readyState != 4 ) {
      console.warn("Not enough data for jumping through video...")
      return
    }

    // check num, with error handling
    if ( _num == undefined || isNaN(_num) ) {
      try {
        // var jumpto = Math.floor( ( Math.random() * videoElement.duration ) )
        var jumpto = Math.floor( ( Math.random() * videoElement.video.buffered.end(0) ) )        
        console.log("jump to ", jumpto)
        videoElement.currentTime = jumpto
      }catch(e){
        console.warn("video jump prevented a race error", e)
        videoElement.currentTime = 0
      }
    } else {
      videoElement.currentTime = _num
    }
    
    return videoElement.currentTime
  }

  // ===========================================================================
  // Rerturn a reference to self
  // ===========================================================================

  // _self.init()
}

WebcamSource.prototype = new Source(); // assign prototype to marqer
WebcamSource.constructor = WebcamSource;  // re-assign constructor

/**
 *
 * @summary
 *  The WebcamSource allows for playback of webcams in the Mixer project
 *  Webcam Example on codepen:
 *  <a href="https://codepen.io/xangadix/pen/moLayR" target="_blank">codepen</a>
 *
 * @description
 *  The WebcamSource allows for playback of webcams in the Mixer project
 *
 * @implements Source
 * @constructor Source#WebcamSource
 * @example let myWebcamSource = new WebcamSource( renderer, { src: 'myfile.mp4' } );
 * @param {GlRenderer} renderer - GlRenderer object
 * @param {Object} options - JSON Object
 */
function WebcamSource(renderer, options) {

  // create and instance
  var _self = this;

  if ( options.uuid == undefined ) {
    _self.uuid = "WebcamSource_" + (((1+Math.random())*0x100000000)|0).toString(16).substring(1);
  } else {
    _self.uuid = options.uuid
  }

  _self.type = "WebcamSource"

  // allow bypass
  _self.bypass = true;

  // add to renderer
  renderer.add(_self)

  // set options
  var _options;
  if ( options != undefined ) _options = options;

  // create elements (private)
  var canvasElement, videoElement, canvasElementContext, videoTexture; // wrapperElemen
  var alpha = 1;

  // initialize
  _self.init = function() {

    // FIXME: Can we clean this up and split into several functions
    console.log("init video source", _self.uuid)

    // create video element
    videoElement = document.createElement('video');
    videoElement.setAttribute("crossorigin","anonymous")
    //videoElement.muted = true

    // set properties
    videoElement.height = 1024
    videoElement.width = 1024
    videoElement.loop = true          // must call after setting/changing source
    videoElement.load();              // must call after setting/changing source
    _self.firstplay = false

    // here is the getUserMediaMagic, note that it only works in HTTPS
    // Prefer camera resolution nearest to 1280x720.
    var constraints = { audio: false, video: { width: 1024, height: 1024 } };

    //
    // Call the webcam, NOTE: you MUST run on HTTPS for this.
    // or make an exception
    //

    navigator.mediaDevices.getUserMedia(constraints)
    .then(function(mediaStream) {
      //var video = document.querySelector('video');
      videoElement.srcObject = mediaStream;
      videoElement.onloadedmetadata = function(e) {
        videoElement.play();
      };
    })
    .catch(function(err) { console.log(err.name + ": " + err.message); }); // always check for errors at the end.

    //ocument.body.appendChild(newChild)

    // Here we wait for a user to click and take over
    var playInterval = setInterval( function() {
      if ( videoElement.readyState == 4 ) {
        var r = Math.random() * videoElement.duration
        //videoElement.currentTime = r
        videoElement.play();
        _self.firstplay = true
        console.log(_self.uuid, "First Play; ", r)
        clearInterval(playInterval)
      }
    }, 400 )

    // firstload handler for mobile; neest at least 1 user click
    document.body.addEventListener('click', function() {
      videoElement.play();
      _self.firstplay = true
    });

    videoElement.volume = 0;

    // videoElement.currentTime = Math.random() * 60   // use random in point

    // FOR FIREBASE
    // listen for a timer update (as it is playing)
    // video1.addEventListener('timeupdate', function() {firebase.database().ref('/client_1/video1').child('currentTime').set( video1.currentTime );})
    // video2.currentTime = 20;

    // create canvas
    canvasElement = document.createElement('canvas');
    canvasElement.width = 1024;
    canvasElement.height = 1024;
    canvasElementContext = canvasElement.getContext( '2d' );

    // create the videoTexture
    videoTexture = new THREE.Texture( canvasElement );
    // videoTexture.minFilter = THREE.LinearFilter;

    // -------------------------------------------------------------------------
    // Set shader params
    // -------------------------------------------------------------------------

    // set the uniforms
    renderer.customUniforms[_self.uuid] = { type: "t", value: videoTexture }
    renderer.customUniforms[_self.uuid+'_alpha'] = { type: "f", value: alpha }

    // add uniform
    renderer.fragmentShader = renderer.fragmentShader.replace('/* custom_uniforms */', 'uniform sampler2D '+_self.uuid+';\n/* custom_uniforms */')
    renderer.fragmentShader = renderer.fragmentShader.replace('/* custom_uniforms */', 'uniform vec3 '+_self.uuid+'_output;\n/* custom_uniforms */')
    renderer.fragmentShader = renderer.fragmentShader.replace('/* custom_uniforms */', 'uniform float '+_self.uuid+'_alpha;\n/* custom_uniforms */')

    // add main
    renderer.fragmentShader = renderer.fragmentShader.replace('/* custom_main */', 'vec4 '+_self.uuid+'_output = ( texture2D( '+_self.uuid+', vUv ).rgba * '+_self.uuid+'_alpha );\n  /* custom_main */')

    // expose video and canvas
    /**
     * @description exposes the HTMLMediaElement Video for listeners and control
     * @member Source#WebcamSource#video
     */
    _self.video = videoElement
    _self.canvas = canvasElement

    // remove the bypass
    _self.bypass = false
  }

  _self.update = function() {
    if (_self.bypass = false) return
    if ( videoElement.readyState === videoElement.HAVE_ENOUGH_DATA && !videoElement.seeking) {
      canvasElementContext.drawImage( videoElement, 0, 0, 1024, 1024 );
      if ( videoTexture ) videoTexture.needsUpdate = true;
    }else{
      // canvasElementContext.drawImage( videoElement, 0, 0, 1024, 1024 );
      // console.log("SEND IN BLACK!")
      canvasElementContext.clearRect(0, 0, 1024, 1024);
      _self.alpha = 0
    }
  }

  // return the video texture, for direct customUniforms injection (or something)
  _self.render = function() {
    return videoTexture
  }

  // ===========================================================================
  // Actual HELPERS
  // ===========================================================================

  /**
   * @description start the current video
   * @function Source#WebcamSource#play
   */
  _self.play =         function() { return videoElement.play() }

  /**
   * @description pauses the video
   * @function Source#WebcamSource#pause
   */
  _self.pause =        function() { return videoElement.pause() }

  /**
   * @description returns true then the video is paused. False otherwise
   * @function Source#WebcamSource#paused
   */
  _self.paused =       function() { return videoElement.paused }

  /**
   * @description skip to _time_ (in seconds) or gets `currentTime` in seconds
   * @function Source#WebcamSource#currentTime
   * @param {float} time - time in seconds
   */
   /*
  _self.currentTime = function( _num ) {
    returns false
    if ( _num === undefined ) {
      return videoElement.currentTime;
    } else {
      console.log("set time", _num)
      videoElement.currentTime = _num;
      return _num;
    }

  }
  */

  // seconds
  /**
   * @description give the duration of the video in seconds (cannot be changed)
   * @function Source#WebcamSource#duration
   */
  _self.duration =     function() { return videoElement.duration }    // seconds

  // ===========================================================================
  // For now only here, move to _source?
  // ===========================================================================

  _self.alpha = function(a) {
    if (a == undefined) {
      return renderer.customUniforms[_self.uuid+'_alpha'].value
    }else{
      renderer.customUniforms[_self.uuid+'_alpha'].value = a
    }
  }

  // ===========================================================================
  // Rerturn a reference to self
  // ===========================================================================

  // _self.init()
}
