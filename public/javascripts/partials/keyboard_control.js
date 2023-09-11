// helper
var selectRandomMovie = function( _source, _filemanager = null, _config = [] ) {
  console.log("[rr] select random movie: ", _source )

  // optional list of movies that should never play simulteneous
  var never_together = [
    // filename,
  ]

  // its all the same set anyway s
  // filemanager.setTimeout
  var rand = Math.floor( Math.random() * filemanager.set.length )
  var randomVideo = filemanager.set[ rand ]

  //filemanager.set.includes()
  // check_uniqueness, this should include current source
  if ( source1.video.src == randomVideo || source2.video.src == randomVideo ) { // || source3.video.src == randomVideo ) {
    console.log("[rr] return random movie")
    selectRandomMovie( _source )
    return
  }

  if ( never_together.includes(randomVideo) ) {
    console.log("[rr] movie is in never together")

    // check never together, this should NOT include current source
    // never_together.includes( decodeURI( source2.video.src ) )
    if (
      ( never_together.includes( decodeURI( source1.video.src ) ) && _source != source1 ) ||
      ( never_together.includes( decodeURI( source2.video.src ) ) && _source != source2 ) ) {
      //( never_together.includes( decodeURI( source3.video.src ) ) && _source != source3 ) ) {
      console.log("[rr] there is a never together on a different node")
      selectRandomMovie( _source )
      return
    }
  }

  _source.src(randomVideo)

  console.log("[rr] changed source!", rand, randomVideo)
  console.log("[rr] ", source1.video.src)
  console.log("[rr] ", source2.video.src)
  //console.log("[rr] ", source3.video.src)
}

var keyboardoconfig = []

function loadKeys() { 
  console.log("key!")

  // this should build up, on load, like the sysinfo
  //
  // temp
  var keyboardoconfig = [ mixer1 ]

  keyboardoconfig.forEach( function( node ) { 
  
    // we can probably rewrite this like
    // [ type, [ attributes ... ] ]
    // [ "Mixer", [".display_filename", ".display_time", ".display_duration", ".display_state", ".display_speed" ] ]

    if ( node.uuid.includes("Mixer") ) {
      console.log("add mixer keys for", node.uuid)
    }
  })

  document.onkeydown = function(e) { 
    console.log(" >>>> keydown", e)
    // poor mans version
    switch (e.key) {
      case 'c': // c
      selectRandomMovie(source1)
      selectRandomMovie(source2)
      //selectRandomMovie(source3)
      break;

      case 'v':      
      selectRandomMovie(source2)
      //selectRandomMovie(source3)
      break;


      case 'x':
      selectRandomMovie(source1)      
      //selectRandomMovie(source3)
      break;

      case 'd': 
      source1.jump()
      //selectRandomMovie(source3)
      break;

      case 'f': 
      source2.jump()
      //selectRandomMovie(source3)
      break;

      case 'b': // b
      mixer1.blendMode(1)
      mixer1.blendMode( Math.ceil( Math.random()*18) )
      //mixer2.blendMode( Math.ceil( Math.random()*18) )
      break;  

      case 'm': // m
      mixer1.mixMode( Math.ceil( Math.random()*9) )
      //mixer2.mixMode( Math.ceil( Math.random()*5) )
      break;

      case 'r': // r (eset)
      mixer1.blendMode(1)
      mixer1.mixMode(1)
      //mixer2.blendMode(1)
      //mixer2.mixMode(1)
      break;

      case '~': // r (eset)
        document.getElementById('sysinfo').classList.toggle("hidden")
      break 

      case 'ArrowLeft':
        audioanalysis1.mod /= 2
      break;

      case 'ArrowRight':
        audioanalysis1.mod *= 2
      break;

      case 'ArrowUp':        
        
      break;

      case 'ArrowDown':
      break;

      default:
      break;
    }
  }
}
loadKeys()