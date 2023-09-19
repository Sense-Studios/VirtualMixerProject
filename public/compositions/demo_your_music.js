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


document.getElementById('file_input').onchange = function(e){        
  // not really needed in this exact case, but since it is really important in other cases,
  // don't forget to revoke the blobURI when you don't need it
  sound.onend = function(e) {
    URL.revokeObjectURL(this.src);
  }

  sound.oncanplay = function(e) {    
  }

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

var oldbeat = 0
var useBlendmodes = [ 1, 7, 8, 9, 10, 13, 17, 18 ]
var useMixmodes = [ 1, 2, 3, 4, 5 ] //  6, 7, 8
var dice = 0
var jump_timeout_1 = null
var jump_timeout_2 = null

function startBeats( _analysis ) {
  setInterval( function() {
    //updateInfo()
    dice = Math.random()

    if ( _analysis.beats != oldbeat ) {
      //if (beats%24 == 0 && dice < 0.2 ) source1.jump()
      //if (beats%32 == 0 && dice < 0.2 ) source2.jump()
      //if (beats%32 == 0 && dice < 0.1 ) _analysis.mod = 0.5
      //if (beats%32 == 0 && dice < 0.1 ) mixer2.pod(0.2)
      //if (beats%32 == 0 && dice > 0.5 ) mixer2.pod(0.4)
      //if (beats%16 == 0 && dice > 0.8  )mixer2.pod(0.8)

      oldbeat = _analysis.beats
      var beats = _analysis.beats

      // reset on start
      if ( beats == 2) filemanager.changez()
      if ( beats == 6) filemanager2.changez()

      // default
      if ( program == 0 ) {

        // reset
        _analysis.mod = 1
        mixer1.blendMode(0)
        mixer1.mixMode(0)

        if ( beats%4 == 0) console.log("boem!")        
        if (beats%16 == 0 && dice < 0.42 ) {          
          filemanager.changez(); 
          clearTimeout(jump_timeout_1)
          jump_timeout_1 = setTimeout( function() { source1.jump();  console.log( `${(new Date()).getTime()} JUMP`) }, 1500 )
        }
        
        if (beats%12 == 0 && dice < 0.42 ) {
          console.log("changez 2")
          filemanager2.changez(); //
          clearTimeout(jump_timeout_2)
          jump_timeout_2 = setTimeout( function() { source2.jump();  console.log( `${(new Date()).getTime()} JUMP`) }, 1500 )
        }

        if (beats%9 == 0 && dice < 0.8 ) mixer1.blendMode( useBlendmodes[Math.floor( Math.random() * useBlendmodes.length )] );
        if (beats%18 == 0 && dice < 0.6 ) mixer1.mixMode( useMixmodes[Math.floor( Math.random() * useMixmodes.length )] );
        if (beats%32 == 0 && dice > 0.35 ) _analysis.mod = 1
      }

      // slideshow
      if ( program == 100 ) { 
        // reset
        _analysis.mod = 1
        mixer1.blendMode(0)
        mixer1.mixMode(0)
        
      }

      // easy going
      if ( program == 200 ) {
      }

      // exciting campfire
      if ( program == 300 ) {
      }

      // Average mixing
      if ( program == 400 ) {
      }

      // Average plus
      if ( program == 500 ) {        
      }

      // Eurohouse
      if ( program == 600 ) {
      }

      // EDM
      if ( program == 700 ) {
      }

      // Hardstyle
      if ( program == 800 ) {
      }

      // Breakcore
      if ( program == 900 ) {
      }
      
    }

  }, 1 )
}