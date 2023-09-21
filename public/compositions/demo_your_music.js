var renderer = new GlRenderer();
var source1 = new VideoSource(renderer, {});
var source2 = new VideoSource(renderer, {});
var mixer1 = new Mixer( renderer, { source1: source1, source2: source2 });
var output = new Output( renderer, mixer1 );
var audioanalysis1 = null
var filemanager = new FileManager( source1 )
var filemanager2 = new FileManager( source2 )
//renderer.init();
//renderer.render();

var sysinfoconfig = []
var keyboardconfig = []
var sound = document.getElementById('sound');

filemanager.load_set("/sets/programs_awesome_streamable.json")
filemanager2.load_set("/sets/programs_runner_streamable.json")

// start on load
document.getElementById('upload_button').onclick = function() {   
  document.getElementById('file_input').click() 
}

document.getElementById('go_button').onclick = function() { 
  start_mixer()
}

document.getElementById('source1_select').onchange = function() {   
  console.log("load:", this.value)
  filemanager.load_set(this.value)
}

document.getElementById('source2_select').onchange = function() {   
  console.log("load:", this.value)
  filemanager2.load_set(this.value)
}

document.getElementById('select_song').onchange = function() {     
  sound.src = this.value  
}

document.getElementById('go')

function start_mixer() {
  
  audioanalysis1 = new AudioAnalysis( renderer, { audio: sound.src } )
  audioanalysis1.add( mixer1.pod )
  audioanalysis1.mod = 1
  
  sysinfoconfig = [ source1, source2, mixer1, audioanalysis1 ]
  keyboardconfig = [ source1, source2, mixer1, audioanalysis1 ]
  
  // load sysinfo
  loadMixerInfo()

  // fizzle the page
  document.querySelector('.toolbox').classList.add('hidden')
  document.querySelector('.payoff').classList.remove('hidden')
  document.querySelector('.includes').classList.remove('hidden')
  document.getElementById('glcanvas').classList.remove('hidden')    
  document.getElementById('header_image').classList.add('smaller')

  // start the render
  renderer.init();
  renderer.render();  

  // start beats
  startBeats(audioanalysis1)
}

// after somebody uploads a file
document.getElementById('file_input').onchange = function(e) {

  // not really needed in this exact case, but since it is really important in other cases,
  // don't forget to revoke the blobURI when you don't need it
  sound.onend = function(e) { URL.revokeObjectURL(this.src) }
  sound.oncanplay = function(e) {}

  // create source of sound and go!
  sound.src = URL.createObjectURL(this.files[0]);
  var filename = this.value
  console.log("got file input",  filename )
  document.getElementById('upload_button').classList.add('green')
  document.getElementById('upload_button').innerText = filename.split('\\')[filename.split('\\').length-1]  
}

var program = 0 // default
document.getElementById('mix_preset_select').onchange = function() { 
  program = parseInt( this.value );
  console.log("Program set to: ", program)
}

// --------------------------------------------------------------------------------

// if (beats%24 == 0 && dice < 0.2 ) source1.jump()
// if (beats%32 == 0 && dice < 0.2 ) source2.jump()
// if (beats%32 == 0 && dice < 0.1 ) _analysis.mod = 0.5
// if (beats%32 == 0 && dice < 0.1 ) mixer2.pod(0.2)
// if (beats%32 == 0 && dice > 0.5 ) mixer2.pod(0.4)
// if (beats%16 == 0 && dice > 0.8  )mixer2.pod(0.8)

// --------------------------------------------------------------------------------


var oldbeat = 0
var oldProgram = 0
var newProgram = false
var useBlendmodes = [ 1, 7, 8, 9, 10, 13, 17, 18 ]
var useMixmodes = [ 1, 2, 3, 4, 5 ] //  6, 7, 8
var dice = 0
var jump_timeout_1 = null
var jump_timeout_2 = null

function startBeats( _analysis ) {

  setInterval( function() {

    // check if we are actually on a new beat
    if ( _analysis.beats != oldbeat ) {

      // reset the beat
      oldbeat = _analysis.beats
      var beats = _analysis.beats

      // God in fact *does* play dice
      dice = Math.random()
      
      // have a reset signal on the of change that the
      // program actually has changed
      if ( program != oldProgram ) {
        oldProgram = program
        newProgram = true 
      } else { 
        newProgram = false
      }

      // reset moveis on start
      if ( ( beats) == 2) filemanager.changez()
      if ( ( beats) == 6) filemanager2.changez()

      // --------------------------------------------------------------------------------
      // and now for the actual programs
      // --------------------------------------------------------------------------------

      // default is program 0
      if ( program == 0 ) {

        // reset for the new program
        if (newProgram) {
          _analysis.mod = 1
          mixer1.blendMode(1)
          mixer1.mixMode(1)
          useBlendmodes = [ 1, 7, 8, 9, 10, 13, 17, 18 ]
          useMixmodes = [ 1, 2, 3, 4, 5 ] //  6, 7, 8
          source1.video.playbackRate = 1
          source2.video.playbackRate = 1
        }

        if ( ( beats  )%4 == 0) console.log("boem! program 0")  // for testing
        if ( ( beats  )%16 == 0 && dice < 0.42 ) {          
          filemanager.changez(); 
          clearTimeout(jump_timeout_1)
          jump_timeout_1 = setTimeout( function() { source1.jump();  console.log( `${(new Date()).getTime()} JUMP`) }, 1500 )
        }
        
        if ( ( beats  )%12 == 0 && dice < 0.42 ) {
          console.log("changez 2")
          clearTimeout(jump_timeout_2)
          jump_timeout_2 = setTimeout( function() { source2.jump();  console.log( `${(new Date()).getTime()} JUMP`) }, 1500 )
        }
      
        if ( ( beats      )%  9 == 0 && dice < 0.8  ) mixer1.blendMode( useBlendmodes[Math.floor( Math.random() * useBlendmodes.length )] );
        if ( ( beats      )% 18 == 0 && dice < 0.6  ) mixer1.mixMode( useMixmodes[Math.floor( Math.random() * useMixmodes.length )] );
        if ( ( beats      )% 32 == 0 && dice > 0.35 ) _analysis.mod = 1
      }

      // ----------------------------------------------------------------------------
      // Slideshow
      if ( program == 100 ) {        

        // INIT PROGRAM
        if (newProgram) {
          document.querySelector('#sysinfo h2').innerHTML = "MIXER INFO:<small><br><br>Slideshow</small>"
          _analysis.mod = 0.125
          useBlendmodes = [ 1, 7, 8, 9, 10, 13, 17, 18 ]
          useMixmodes = [ 1, 2, 3, 4, 5 ] //  6, 7, 8
          mixer1.blendMode(1)
          mixer1.mixMode(1)
          source1.video.playbackRate = 0.42
          source2.video.playbackRate = 0.42
        }

        // THE RULES
        if ( ( beats      )%  2 == 0 && dice < 0.8  ) mixer1.blendMode( useBlendmodes[Math.floor( Math.random() * useBlendmodes.length )] );
        if ( ( beats      )%  4 == 0 && dice < 0.6  ) mixer1.mixMode( useMixmodes[Math.floor( Math.random() * useMixmodes.length )] );
        if ( ( beats - 4  )%  8 == 0 && dice < 0.71 ) filemanager.changez()
        if ( ( beats      )%  8 == 0 && dice < 0.71 ) filemanager2.changez()

        // TESTING
        if ( ( beats)%4 == 0) console.log("boem! program 100")  // for testing
        console.log("chk")  // for testing
      }

      // ----------------------------------------------------------------------------
      // Very Easy Going
      if ( program == 200 ) {
        if (newProgram) {
          document.querySelector('#sysinfo h2').innerHTML = "MIXER INFO:<small><br><br>Easy Going</small>"
          _analysis.mod = 0.25
          mixer1.blendMode(1)
          mixer1.mixMode(1)
          source1.video.playbackRate = 0.6
          source2.video.playbackRate = 0.6
        }

        // THE RULES
        if ( ( beats      )%2 == 0 && dice < 0.8  ) mixer1.blendMode( useBlendmodes[Math.floor( Math.random() * useBlendmodes.length )] );
        if ( ( beats      )%4 == 0 && dice < 0.6  ) mixer1.mixMode( useMixmodes[Math.floor( Math.random() * useMixmodes.length )] );
        if ( ( beats - 4  )%8 == 0 && dice < 0.71 ) filemanager.changez()
        if ( ( beats      )%8 == 0 && dice < 0.71 ) filemanager2.changez()

        // TESTING
        if ( ( beats      )%4 == 0 ) console.log("boem! program 200")  // for testing
      }

      // ----------------------------------------------------------------------------
      // Mellow Space
      if ( program == 300 ) {
        if (newProgram) {
          document.querySelector('#sysinfo h2').innerHTML = "MIXER INFO:<small><br><br>Mellow Space</small>"
          _analysis.mod = 0.5
          useBlendmodes = [ 1, 3, 4, 5, 6, 9, 10, 11, 13, 14, 16, 17 ]
          useMixmodes = [ 3, 4, 5 ] //  6, 7, 8
          mixer1.blendMode(1)
          mixer1.mixMode(3)
          source1.video.playbackRate = 0.9
          source2.video.playbackRate = 0.9
          filemanager.changez()
          filemanager2.changez()
        }

        // THE RULES
        if ( ( beats     )% 8  == 0 && dice < 0.8  ) mixer1.blendMode( useBlendmodes[Math.floor( Math.random() * useBlendmodes.length )] );
        if ( ( beats - 8 )% 16 == 0 && dice < 0.6  ) mixer1.mixMode( useMixmodes[Math.floor( Math.random() * useMixmodes.length )] );
        if ( ( beats - 16)% 32 == 0 && dice < 0.71 ) filemanager.changez()
        if ( ( beats     )% 32 == 0 && dice < 0.71 ) filemanager2.changez()

        // TESTING
        if ( ( beats)%4 == 0) console.log("boem! program 300")  // for testing
      }

      // ----------------------------------------------------------------------------
      // Clubbing
      if ( program == 400 ) {
        document.querySelector('#sysinfo h2').innerHTML = "MIXER INFO:<small><br><br>Clubbing</small>"
        if (newProgram) {
          _analysis.mod = 1
          mixer1.blendMode(1)
          mixer1.mixMode(1)
          source1.video.playbackRate = 1
          source2.video.playbackRate = 1
        }

        // THE RULES
        // video
        if ( ( beats -  8)%32 == 0 && dice < 0.8  ) filemanager.changez(); 
        if ( ( beats - 20)%32 == 0 && dice < 0.8  ) filemanager2.changez();
        if ( ( beats -  0)%32 == 0 && dice < 0.21 ) source1.jump();
        if ( ( beats - 16)%32 == 0 && dice < 0.21 ) source2.jump();

        // mixer 1
        if ( ( beats -  8)% 16 == 0 && dice < 0.72 ) mixer1.blendMode( useBlendmodes[Math.floor( Math.random() * useBlendmodes.length )] );
        if ( ( beats     )% 16 == 0 && dice < 0.5  ) mixer1.mixMode( useMixmodes[Math.floor( Math.random() * useMixmodes.length )] );

        if ( ( beats)%4 == 0) console.log("boem! program 400")  // for testing
      }

      // ----------------------------------------------------------------------------
      // Pink Floyd
      if ( program == 500 ) {
        document.querySelector('#sysinfo h2').innerHTML = "MIXER INFO:<small><br><br>Pink Floyd</small>"
        if (newProgram) {
          useBlendmodes = [ 1, 3, 4, 5, 6, 9, 10, 11, 13, 14, 16, 17 ]
          useMixmodes = [ 3, 4, 5 ] //  6, 7, 8
          _analysis.mod = 1
          mixer1.blendMode(1)
          mixer1.mixMode(3)
          source1.video.playbackRate = 1
          source2.video.playbackRate = 1
        }

        // THE RULES
        if ( ( beats      )%8  == 0 && dice < 0.8  ) mixer1.blendMode( useBlendmodes[Math.floor( Math.random() * useBlendmodes.length )] );
        if ( ( beats - 8  )%16 == 0 && dice < 0.6  ) mixer1.mixMode( useMixmodes[Math.floor( Math.random() * useMixmodes.length )] );
        if ( ( beats - 16 )%32 == 0 && dice < 0.71 ) filemanager.changez()
        if ( ( beats      )%32 == 0 && dice < 0.71 ) filemanager2.changez()

        // TESTING
        if ( ( beats)%4 == 0) console.log("boem! program 500")  // for testing     
      }

      // ----------------------------------------------------------------------------
      // Eurohouse
      if ( program == 600 ) {
        document.querySelector('#sysinfo h2').innerHTML = "MIXER INFO:<small><br><br>Eurohouse</small>"
        if (newProgram) {
          _analysis.mod = 1
          useBlendmodes = [ 1, 7, 8, 9, 10, 11 ]
          useMixmodes = [ 1, 2, 3, 4, 5, 6, 7 ] //  6, 7, 8
          mixer1.blendMode(1)
          mixer1.mixMode(1)
          source1.video.playbackRate = 1
          source2.video.playbackRate = 1
        }

        // THE RULES
        // video
        if ( ( beats -  0)%16 == 0 && dice < 0.8  ) filemanager.changez(); 
        if ( ( beats - 12)%16 == 0 && dice < 0.8  ) filemanager2.changez();
        if ( ( beats -  0)%32 == 0 && dice < 0.21 ) source1.jump();
        if ( ( beats - 16)%32 == 0 && dice < 0.21 ) source2.jump();

        // mixer 1
        if ( ( beats -  4)% 8 == 0 && dice < 0.72 ) mixer1.blendMode( useBlendmodes[Math.floor( Math.random() * useBlendmodes.length )] );
        if ( ( beats     )% 8 == 0 && dice < 0.5  ) mixer1.mixMode( useMixmodes[Math.floor( Math.random() * useMixmodes.length )] );

        // TESTING
        if ( ( beats     )% 4 == 0 ) console.log("boem! program 600")  // for testing
        if ( ( beats     )% 1 == 0 ) console.log("chk 600")  // for testing        
      }


      // EDM
      if ( program == 700 ) {
        
        // INIT PROGRAM
        if (newProgram) {
          document.querySelector('#sysinfo h2').innerHTML = "MIXER INFO:<small><br><br>EDM</small>"
          _analysis.mod = 1
          useBlendmodes = [ 1, 7, 8, 9, 10, 13, 17, 18 ]
          useMixmodes = [ 1, 2, 3, 4, 5 ] //  6, 7, 8
          mixer1.blendMode(1)
          mixer1.mixMode(1)
        }

        // THE RULES
        // video
        if ( ( beats -  0)%16 == 0 && dice < 0.8  ) filemanager.changez(); 
        if ( ( beats - 12)%16 == 0 && dice < 0.8  ) filemanager2.changez();
        if ( ( beats -  8)%32 == 0 && dice < 0.62 ) source1.jump();
        if ( ( beats - 16)%32 == 0 && dice < 0.42 ) source2.jump();

        // mixer 1
        if ( ( beats -  4)% 8 == 0 && dice < 0.8 ) mixer1.blendMode( useBlendmodes[Math.floor( Math.random() * useBlendmodes.length )] );
        if ( ( beats     )% 8 == 0 && dice < 0.6 ) mixer1.mixMode( useMixmodes[Math.floor( Math.random() * useMixmodes.length )] );

        // TESTING
        if ( ( beats     )% 4 == 0 ) console.log("boem! program 700: EDM")  // for testing
        if ( ( beats     )% 1 == 0 ) console.log("tsk 700", beats, ( (beats -  0)%16 == 0 ),  ( dice < 0.8 ) )  // for testing
      }

      // Hardstyle
      if ( program == 800 ) {
        document.querySelector('#sysinfo h2').innerHTML = "MIXER INFO:<small><br><br>Hardstyle</small>"
        if (newProgram) {
          _analysis.mod = 1.25
          useBlendmodes = [ 1, 7, 8, 9, 10, 13, 17, 18 ]
          useMixmodes = [ 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 4, 5 ] //  6, 7, 8
          mixer1.blendMode(1)
          mixer1.mixMode(1)
        }

        // THE RULES
        // video
        if ( ( beats -  0)%16 == 0 && dice < 0.8  ) filemanager.changez(); 
        if ( ( beats - 12)%16 == 0 && dice < 0.8  ) filemanager2.changez();
        if ( ( beats -  4)%16 == 0 && dice < 0.42 ) source1.jump();
        if ( ( beats -  8)%16 == 0 && dice < 0.32 ) source2.jump();

        // mixer 1
        if ( ( beats -  4 )% 8 == 0 && dice < 0.8 ) mixer1.blendMode( useBlendmodes[Math.floor( Math.random() * useBlendmodes.length )] );
        if ( ( beats      )% 8 == 0 && dice < 0.6 ) mixer1.mixMode( useMixmodes[Math.floor( Math.random() * useMixmodes.length )] );

        // TESTING
        if ( ( beats      )%4 == 0) console.log("boem! program 800")  // for testing
      }

      // Breakcore
      if ( program == 900 ) {
        document.querySelector('#sysinfo h2').innerHTML = "MIXER INFO:<small><br><br>Breakcore</small>"
        if (newProgram) {
          _analysis.mod = 2
          useBlendmodes = [ 1, 7, 8, 9, 10, 13, 17, 18 ]
          useMixmodes = [ 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 4, 5 ] //  6, 7, 8
          mixer1.blendMode(1)
          mixer1.mixMode(1)
        }

       // THE RULES
        // video
        if ( ( beats -  0) %16 == 0 && dice < 0.8  ) filemanager.changez(); 
        if ( ( beats - 12) %16 == 0 && dice < 0.8  ) filemanager2.changez();
        if ( ( beats -  4) %16 == 0 && dice < 0.42 ) source1.jump();
        if ( ( beats -  8) %16 == 0 && dice < 0.32 ) source2.jump();

        // mixer 1
        if ( ( beats -  4) % 8 == 0 && dice < 0.8 ) mixer1.blendMode( useBlendmodes[Math.floor( Math.random() * useBlendmodes.length )] );
        if ( ( beats     ) % 8 == 0 && dice < 0.6 ) mixer1.mixMode( useMixmodes[Math.floor( Math.random() * useMixmodes.length )] );

        // TESTING
        if ( ( beats)%4 == 0) console.log("boem! program 900")  // for testing
      }
    }

  }, 1 )
}