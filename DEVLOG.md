# 28-08-2023
*by xangadix*

So I finally am set on a branching for the app.
We'll have a public repo under Sense Studios, and other developers
can just fork from there. I'll fork the website from there too 
to keep it all nice and clean. 

sense-studios
dev-public-repo:main
 |
 |
 |--- > xangadix: moet de test-main-private-live-production FORK hebben
 |--- > otherfork public ...
 |--- > otherfork public ...
 '--- > otherfork private ...

Do we maybe want to add mapping tools?

it appears I have now:"94GB bandwidth used in last 30 days"

**TODO**: Still on the list
- update site and git setup
- build a boilerplate template like the sense-studios site
- build a boilerplate template for a video left-right slide show site
- add a video tutorial for the cdn and npm options
- add a video tutorial for the mx50

# 24-08-2023
*by xangadix*

Pretty much done with most of the cleanup,
considering https://imba.io/ for replacement of most of express
considering http://regl.party/, https://github.com/regl-project/regl as replacement for three.js
I'm not going to do that tomorrow, but I wanted to make sure that I got that written down here.

**TODO**: Still on the list
- build a boilerplate template like the sense-studios site
- build a boilerplate template for a video left-right slide show site
~~- make sure client/remote works~~
- add a video tutorial for the cdn and npm options
- add a video tutorial for the mx50


# 22-08-2023
*by xangadix*

Signing off on the "have it your way" (i dont know where that came from)
i need to set some mixer presets, but it works out of the box now

I have now used 72GB and have 16GB in storage.
https://streamable.com/your_usage

So still a couple of things to do, but I like how this runs.
I think I have all the sets that i need. Abstract, dance,
the memology stuff, space and the veejays.

I like that **peter leung** is back

**TODO**: Still on the list
- build a boilerplate template like the sense-studios site
- build a boilerplate template for a video left-right slide show site
- make sure client/remote works
- add a video tutorial for the cdn and npm options
- add a video tutorial for the mx50

# 21-08-2023 
*by xangadix*

The **vmp-demo** page (the home page) has been updated with the thinking machines mixer and the upload your music mixer still needs thumbnails though

**demo_your_music** has been added, it borrows the design from the surface client remote SASS, which I thinnk is fine for now. still needs some wiring though

**Sysinfo** has been pretty much completed with a VU meter and a close button

**keyboard_control** partial has been added, in need to decide which one will be more importand, thte KeyboardControl class or this new partial, but for now this works

**Audioanalysis** has been expanded with a .beats system, that keeps track of the beats for you, no more need to do it `audioanalysis.beats`

Fixed composiion of Peter Leung (The same space)

**TODO**: Still on the list
- build a template like the sense-studios site
- build a template for a video left-right slide show site
- make sure client/remote works
- add a video tutorial for the cdn and npm options
- add a video tutorial for the mx50
- ~~finish up sysinfo~~
- ~~finish up a key controller~~
- ~~add 'thinking_machines' to the main site~~
- ~~add `beat_number` to audioanalysis and bpm modules~~
- ~~build a upload mp3 and play in `demo_your_music.js`~~

# 19-08-2023 by xangadix

So I decided it would be interesting to keep a devlog next to to the git comments.

We start here, when I'm moving into a new version of the code; most important because we are moving our videos into streamable.com from amazon, in order to save massively on streaming costs. 

In the **Router** I've been moving all the neccessary sets, and have added a couple of streamable/ routes
one for the thumbnails, and one for the regular video files.
there is `/streamable/[video_id]` for retreiving the video, which would lead the the
HD download link
and there is `/streambale_thumbnail/[video_id]` which retreives the video id through
the api. I might be running the first link through the api too, but I'm not sure if
i need to do that.

**Audioanalysis** has seen a lot of updates, it appeared that the bpm-float didn't behave as it shouldso I've been tinkering like forever to get it to work. I've also introduced a 'delayed' bpm, which does not makes hard-cuts between bpm changes, but tries to interpolate between changes in the bpm. 

I've also looked into movint part of the audioanalysis to a javascript worker, but decided that it would be overoptimalisation for now.

**Sysinfo** has been completely set up for audioanalysis, mixer and sources. It works but 
could still use some work in design (maybe bring it toward the client/remote?) - it also
needs some more interaction, like adding a I for toggling it ( or ~ ?)

---

**TODO**: Still on the list
- add `beat_number` to audioanalysis and bpm modules
- build a upload mp3 and play in `demo_your_music.js`
- build a template like the sense-studios site
- build a template for a video left-right slide show site
- finish up sysinfo
- finish up a key controller
- add 'thinking_machines' to the main site
- make sure client/remote works
- add a video tutorial for the cdn and npm options
- add a video tutorial for the mx50