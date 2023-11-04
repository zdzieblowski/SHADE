"use strict"

function buildInputsUI( me )
{
    me.mMarks = null;
    
    for( let i=0; i<4; i++ )
    {
        var par = document.getElementById( "texture" + i );
        var can = document.getElementById( "myUnitCanvas" + i);
        var bar = document.getElementById( "inputSelectorControls" + i);

          par.onmouseover = function(ev)
          {
              let ele = piGetSourceElement( ev );
              let pattern = "iChannel" + i;

              me.mMarks = new Array();
              var cm = me.mCodeEditor;
              const num = cm.lineCount();
              for( let j=0; j<num; j++ )
              {
                  var str = cm.getLine( j );
                  var res = str.indexOf( pattern );
                  if( res<0 ) continue;
                  cm.addLineClass( j, "background", "cm-highlight");
                  me.mMarks.push( j );
              }
          }

          par.onmouseout = function(ev)
          {
                let cm = me.mCodeEditor;
                if( me.mMarks===null ) return;
                let num = me.mMarks.length;
                for( let j=0; j<num; j++ )
                {
                    var l = me.mMarks.pop();
                    cm.removeLineClass( l, "background", "cm-highlight");
                }
                me.mMarks = null;
          }

          var ww = can.offsetWidth;
          var hh = can.offsetHeight;
          can.width = ww;
          can.height = hh;

          can.onclick = function (ev)
          {
              var passType = me.mEffect.GetPassType( me.mActiveDoc );
              overlay( i, passType );
          }

        var dei = document.getElementById( "myDeleteInput" + i);
        dei.id="myNoInput" + i;
        dei.onclick = function(ev) { me.SetTexture(i, { mType: null, mID: -1, mSrc: null, mSampler: {} }); }

        var z = document.createElement( "img" );
        z.src="/img/themes/" + gThemeName + "/pause.png";
        z.title="pause/resume";
        z.id="myPauseButton" + i;
        z.className = "uiButtonNew";
        z.style.visibility = 'hidden';
        z.onclick = function(ev) { var ele = piGetSourceElement(ev); var r = me.PauseInput( i ); if( r===true ) ele.src="/img/themes/" + gThemeName + "/play.png"; else ele.src="/img/themes/" + gThemeName + "/pause.png"; }
        bar.appendChild( z );

        z = document.createElement( "img" );
        z.src="/img/themes/" + gThemeName + "/rewind.png";
        z.title="rewind";
        z.id="myRewindButton" + i;
        z.className = "uiButtonNew";
        z.style.visibility = 'hidden';
        z.onclick = function(ev) { var ele = piGetSourceElement(ev); var r = me.RewindInput( i ); }
        bar.appendChild( z );

        z = document.createElement( "img" );
        z.src="/img/themes/" + gThemeName + "/speakerOff.png";
        z.title="mute";
        z.id="myMuteButton" + i;
        z.className = "uiButtonNew";
        z.style.visibility = 'hidden';
        z.onclick = function(ev) { var ele = piGetSourceElement(ev); var r = me.ToggleMuteInput( i ); if( r===true ) ele.src="/img/themes/" + gThemeName + "/speakerOff.png"; else ele.src="/img/themes/" + gThemeName + "/speakerOn.png";}
        bar.appendChild( z );

        z = document.createElement("img");
        z.src = "/img/themes/" + gThemeName + "/options.png";
        z.title = "sampler options";
        z.id = "mySamplingButton" + i;
        z.className = "uiButtonNew";

        z.onclick = function (ev) 
        { 
            var ele = piGetSourceElement(ev);
            var sam = document.getElementById("mySampler"+i);
            if( sam.className==="inputSampler visible")
            {
                sam.className = "inputSampler hidden";
            }
            else
            {
                var eleSamplerFilter = document.getElementById( "mySamplerFilter"+i);
                var eleSamplerWrap   = document.getElementById( "mySamplerWrap"+i);
                var eleSamplerVFlip  = document.getElementById( "mySamplerVFlip"+i);
                var eleSamplerVFlipLabel = document.getElementById( "mySamplerVFlipLabel"+i);

                eleSamplerFilter.value = me.GetSamplerFilter(i);
                eleSamplerWrap.value   = me.GetSamplerWrap(i);
                eleSamplerVFlip.checked = (me.GetSamplerVFlip(i)=="true");

                // see if this input accepts mipmapping
                var al = me.GetAcceptsLinear(i);
                eleSamplerFilter.options[1].style.display = (al==true)?'inherit':'none';
                var am = me.GetAcceptsMipmapping(i);
                eleSamplerFilter.options[2].style.display = (am==true)?'inherit':'none';
                var ar = me.GetAcceptsWrapRepeat(i);
                eleSamplerWrap.options[1].style.display = (ar==true)?'inherit':'none';
                var av = me.GetAcceptsVFlip(i);
                eleSamplerVFlip.style.display = (av==true)?'inherit':'none';
                eleSamplerVFlipLabel.style.display = (av==true)?'inherit':'none';

                sam.className = "inputSampler visible";
            }
        }

        bar.appendChild(z);
    }
}

function ShaderToy( parentElement, editorParent, passParent )
{
    if( parentElement===null ) return;
    if( editorParent===null ) return;
    if( passParent===null ) return;

    var me = this;

    this.mPassParent = passParent
    this.mNeedsSave = false;
    this.mAreThereAnyErrors = false;
    this.mAudioContext = null;
    this.mCreated = false;
    this.mHttpReq = null;
    this.mEffect = null;
    this.mTo = null;
    this.mTOffset = 0;
    this.mCanvas = null;
    this.mFPS = piCreateFPSCounter();
    this.mIsPaused = false;
    this.mForceFrame = false;
    this.mInfo = null;
    this.mCharCounter = document.getElementById("numCharacters");
    this.mCharCounterTotal = document.getElementById("numCharactersTotal");
    this.mEleCompilerTime = document.getElementById("compilationTime");
    this.mPass = [];
    this.mActiveDoc = 0;
    this.mIsEditorFullScreen = false;
    this.mFontSize = 0;
    this.mVR = null;
    this.mState = 0;

    buildInputsUI( this );

    this.mCanvas = document.getElementById("demogl");
    this.mCanvas.tabIndex = "0"; // make it react to keyboard
    this.mCanvas.width = this.mCanvas.offsetWidth;
    this.mCanvas.height = this.mCanvas.offsetHeight;
    this.iSetResolution(this.mCanvas.width, this.mCanvas.height);

    // ---------------------------------------

    this.mHttpReq = new XMLHttpRequest();
    this.mTo = getRealTime();
    this.mTf = 0;
    this.mRestarted = true;
    this.mFPS.Reset( this.mTo );
    this.mMouseIsDown = false;
	this.mMouseSignalDown = false;
    this.mMouseOriX = 0;
    this.mMouseOriY = 0;
    this.mMousePosX = 0;
    this.mMousePosY = 0;
    this.mIsRendering = false;

    // --- audio context ---------------------

    this.mAudioContext = piCreateAudioContext();

    if( this.mAudioContext===null )
    {
         //alert( "no audio!" );
    }

    // --- vr susbsystem ---------------------
/*
    this.mVR = new WebVR( function(b) 
                          {
                               var ele = document.getElementById("myVR");
                               if( b )
                                   ele.style.background="url('/img/themes/" + gThemeName + "/vrOn.png')";
                               else
                                   ele.style.background="url('/img/themes/" + gThemeName + "/vrOff.png')";
                          },
                          this.mCanvas );
*/
    // --- soundcloud context ---------------------
    this.mSoundcloudImage = new Image();
    this.mSoundcloudImage.src = "/img/themes/" + gThemeName + "/soundcloud.png";

    window.onfocus = function()
    {
        if( !this.mIsPaused )
        {
            me.mTOffset = me.mTf;
            me.mTo = getRealTime();
            me.mRestarted = true;
        }
    };

    var refreshCharsAndFlags = function()
    {
         me.setChars();
         //me.setFlags();
         setTimeout( refreshCharsAndFlags, 1500 );
    }
    // ---------------

    this.mErrors = new Array();

    var ekeys = null;
    if( navigator.platform.match("Mac") )
    {
        ekeys = { "Ctrl-S":    function(instance) { doSaveShader(); } ,
                  "Cmd-S":     function(instance) { doSaveShader(); } ,
                  "Alt-Enter": function(instance) { me.SetShaderFromEditor(false,true); },
                  "Cmd-Enter": function(instance) { me.SetShaderFromEditor(false,true); },
                  "Alt--":     function(instance) { me.decreaseFontSize(); },
                  "Cmd--":     function(instance) { me.decreaseFontSize(); },
                  "Alt-=":     function(instance) { me.increaseFontSize(); },
                  "Cmd-=":     function(instance) { me.increaseFontSize(); },
                  "Cmd-Right": function(instance) { me.ChangeTabRight(); },
                  "Cmd-Left":  function(instance) { me.ChangeTabLeft(); },
                  "Cmd-Down":  function(instance) { me.resetTime(false); },
                  "Alt-Down":  function(instance) { me.resetTime(false); },
                  "Alt-Up":    function(instance) { me.pauseTime(false); },
                  "Cmd-Up":    function(instance) { me.pauseTime(false); },
                  "Shift-Tab": "indentLess",
                  "Tab":       "indentMore"
                  };
    }
    else
    {
        ekeys = { "Ctrl-S":    function(instance) { doSaveShader(); } ,
                  "Alt-Enter": function(instance) { me.SetShaderFromEditor(false,true); },
                  "Alt--":     function(instance) { me.decreaseFontSize(); },
                  "Alt-=":     function(instance) { me.increaseFontSize(); },
                  "Alt-Right": function(instance) { me.ChangeTabRight(); },
                  "Alt-Left":  function(instance) { me.ChangeTabLeft(); },
                  "Alt-Down":  function(instance) { me.resetTime(false); },
                  "Alt-Up":    function(instance) { me.pauseTime(false); },
                  "Shift-Tab": "indentLess",
                  "Tab":       "indentMore"
                  };
    }

    this.mCodeEditor = CodeMirror( editorParent,
                                   {
                                       lineNumbers: true,
                                       matchBrackets: true,
                                       indentWithTabs: false,
                                       tabSize: 4,
                                       indentUnit: 4,
                                       mode: "text/x-glsl",
                                       smartIndent: false,
                                       electricChars: false,
                                       foldGutter: true,
                                       gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
                                       extraKeys: ekeys
        });
    //this.mCodeEditor.setOption("readOnly", true);

    this.mCodeEditor.on( "change",         function(instance,ev) { me.mNeedsSave = true; me.mPass[me.mActiveDoc].mDirty=true; me.mPass[me.mActiveDoc].mCharCountDirty = true; } );

    //--------------

    refreshCharsAndFlags(this);
    //this.setCompilationTime();
    this.mEleCompilerTime.textContent = "";

    document.getElementById("uiFontSelector").addEventListener('click', function (ev) {
        me.setFontSize(this.selectedIndex, true);
    });


    this.mCanvas.onmousedown = function(ev)
    {
        var rect = me.mCanvas.getBoundingClientRect();
        me.mMouseOriX = Math.floor((ev.clientX-rect.left)/(rect.right-rect.left)*me.mCanvas.width);
        me.mMouseOriY = Math.floor(me.mCanvas.height - (ev.clientY-rect.top)/(rect.bottom-rect.top)*me.mCanvas.height);
        me.mMousePosX = me.mMouseOriX;
        me.mMousePosY = me.mMouseOriY;
        me.mMouseIsDown = true;
		me.mMouseSignalDown = true;
        if( me.mIsPaused ) me.mForceFrame = true;
//        return false; // prevent mouse pointer change
    }
    this.mCanvas.onmousemove = function(ev)
    {
        if( me.mMouseIsDown )
        {
            var rect = me.mCanvas.getBoundingClientRect();
            me.mMousePosX = Math.floor((ev.clientX-rect.left)/(rect.right-rect.left)*me.mCanvas.width);
            me.mMousePosY = Math.floor(me.mCanvas.height - (ev.clientY-rect.top)/(rect.bottom-rect.top)*me.mCanvas.height);
            if( me.mIsPaused ) me.mForceFrame = true;
        }
    }
    this.mCanvas.onmouseup = function(ev)
    {
        me.mMouseIsDown = false;
        if( me.mIsPaused ) me.mForceFrame = true;
    }

    this.mCanvas.addEventListener("keydown",function(ev)
    {
        me.mEffect.SetKeyDown( me.mActiveDoc, ev.keyCode );
        if( me.mIsPaused ) me.mForceFrame = true;
        ev.preventDefault();
    },false);

    this.mCanvas.addEventListener("keyup",function(ev)
    {
        if ((ev.keyCode == 82) && ev.altKey)
        {
            let r = document.getElementById("myRecord");
            r.click();
        }
        
        me.mEffect.SetKeyUp( me.mActiveDoc, ev.keyCode );
        if( me.mIsPaused ) me.mForceFrame = true;
        ev.preventDefault();
    },false);

    document.getElementById("myResetButton").addEventListener('click',  function( ev )
    {
        me.resetTime(true);
    } );
    document.getElementById("myPauseButton").addEventListener('click',  function() 
    {
        me.pauseTime(true);
    } );

    document.getElementById("myVolume").addEventListener('click',  function(ev)
    {
        var res = me.mEffect.ToggleVolume();
        if( res )
            this.style.background="url('/img/themes/" + gThemeName + "/speakerOff.png')";
        else
            this.style.background="url('/img/themes/" + gThemeName + "/speakerOn.png')";
    } );
/*
    document.getElementById("myVR").addEventListener('click',  function(ev)
    {
        var vr = me.mVR.IsSupported();
        if( !vr )
        {
            alert( "WebVR API is not supported in this browser" );
        }
        else
        {
            if (me.mEffect.IsEnabledVR())
                me.mEffect.DisableVR();
            else
                me.mEffect.EnableVR();
        }
    } );
*/
    var mFullScreenExitHandler= function ()
                                { 
                                    if( piIsFullScreen() ) 
                                    { 
                                    } 
                                    else 
                                    { 
                                        //if( me.mVR.IsSupported() )
                                        {
                                            //me.mEffect.DisableVR();
                                        }
                                    } 
                                };
    this.mCanvas.addEventListener('webkitfullscreenchange', mFullScreenExitHandler, false);
    this.mCanvas.addEventListener('mozfullscreenchange', mFullScreenExitHandler, false);
    this.mCanvas.addEventListener('fullscreenchange', mFullScreenExitHandler, false);
    this.mCanvas.addEventListener('MSFullscreenChange', mFullScreenExitHandler, false);

    document.getElementById("myFullScreen").addEventListener('click',  function( ev )
    {
        piRequestFullScreen( me.mCanvas );
        me.mCanvas.focus(); // put mouse/keyboard focus on canvas
    } );

    //-------------------------

    let resizeCB = function (xres, yres)
    {
        me.mForceFrame = true;
        me.iSetResolution(xres, yres);
    };

    let crashCB = function ()
    {
        me.mIsPaused = true;
        alert('Shadertoy: ooops, your WebGL implementation has crashed!');
    };

    this.mEffect = new Effect(this.mVR, this.mAudioContext, this.mCanvas, this.RefreshTexturThumbail, this, false, false, resizeCB, crashCB);
    if( !this.mEffect.mCreated )
    {
        let ele = document.getElementById("noWebGL");
        ele.style.visibility = "visible";
        this.mCanvas.style.visibility = "hidden";

        let img = document.getElementById("noWebGL_ShaderImage");
        let url = "/media/shaders/" + gShaderID + ".jpg";
        img.onerror = function (ev) { };
        img.src = url;

        this.mIsPaused = true;
        this.mForceFrame = false;
        this.mCreated = false;
        return;
    }
    
    // --- mediaRecorder ---------------------

    this.mMediaRecorder = null;

    document.getElementById("myRecord").onclick = function(ev)
    {
        if (me.mMediaRecorder === null)
        {
            me.mMediaRecorder = piCreateMediaRecorder(
                function (b)
                {
                    var ele = document.getElementById("myRecord");
                    if (b)
                        ele.style.background = "url('/img/themes/" + gThemeName + "/recordOn.png')";
                    else
                        ele.style.background = "url('/img/themes/" + gThemeName + "/recordOff.png')";
                }
                , me.mCanvas);
        }
        if( me.mMediaRecorder === null )
        {
            let ele = document.getElementById("myRecord");
            ele.style.background = "url('/img/themes/" + gThemeName + "/recordDisabled.png')";
            alert('MediaRecord API is not supported in this browser');
            return;
        }

        if (me.mMediaRecorder.state === "inactive") 
        {
            me.mMediaRecorder.start();
        } 
        else 
        {
            me.mMediaRecorder.stop();
        }
    }

    this.mCreated = true;
}

ShaderToy.prototype.saveScreenshot = function()
{
    this.mEffect.saveScreenshot( this.mActiveDoc);
}

ShaderToy.prototype.setFontSize = function( id, fromUI )
{
    if (id < 0) id = 0;
    if (id > 5) id = 5;
    if (id === this.mFontSize) return;

    this.mFontSize = id;
    var edi = document.getElementById("editor");
    edi.style.fontSize = '' + (1.0 + 0.25*id ).toFixed(2) + 'em';

    this.mCodeEditor.refresh();

    if (fromUI)
    {
        var httpReq = new XMLHttpRequest();
        //httpReq.onload = function () { var jsn = httpReq.response; };
        httpReq.open("POST", "/shadertoy", true);
        httpReq.responseType = "json";
        httpReq.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        httpReq.send("upo=1&sfs=" + id);
    }
    else
    {
        var ele = document.getElementById("uiFontSelector");
        ele.selectedIndex = id;
    }
}

ShaderToy.prototype.decreaseFontSize = function()
{
    this.setFontSize( this.mFontSize-1, true );
    var ele = document.getElementById("uiFontSelector");
    ele.selectedIndex = this.mFontSize;
}
ShaderToy.prototype.increaseFontSize = function()
{
    this.setFontSize( this.mFontSize+1, true );
    var ele = document.getElementById("uiFontSelector");
    ele.selectedIndex = this.mFontSize;
}
ShaderToy.prototype.GetNeedSave = function()
{
    return this.mNeedsSave;
}
ShaderToy.prototype.SetNeedSave = function(v)
{
    this.mNeedsSave = v;
}

ShaderToy.prototype.startRendering = function()
{
    this.mIsRendering = true;
    var me = this;

    function renderLoop2()
    {
        me.mEffect.RequestAnimationFrame(renderLoop2);

        if( me.mIsPaused && !me.mForceFrame )
        {
            me.mEffect.UpdateInputs( me.mActiveDoc, false );
            return;
        }
        me.mForceFrame = false;

        var time = getRealTime();

        var ltime = 0.0;
        var dtime = 0.0;
        if( me.mIsPaused ) 
        {
            ltime = me.mTf;
            dtime = 1000.0 / 60.0;
        }
        else
        {
            ltime = me.mTOffset + time - me.mTo;
            if( me.mRestarted )
                dtime = 1000.0/60.0;
            else
                dtime = ltime - me.mTf; 
            me.mTf = ltime;
        }
        me.mRestarted = false;

        var newFPS = me.mFPS.Count( time );

		let mouseOriX = Math.abs( me.mMouseOriX );
		let mouseOriY = Math.abs( me.mMouseOriY );
		if( !me.mMouseIsDown )     mouseOriX = -mouseOriX;
		if( !me.mMouseSignalDown ) mouseOriY = -mouseOriY;
        me.mMouseSignalDown = false;

        me.mEffect.Paint(ltime/1000.0, dtime/1000.0, me.mFPS.GetFPS(), mouseOriX, mouseOriY, me.mMousePosX, me.mMousePosY, me.mIsPaused );

        document.getElementById("myTime").textContent = (ltime/1000.0).toFixed(2);
        if( me.mIsPaused )
        {
        }
        else
        {
            if( newFPS )
            {
                document.getElementById("myFramerate").textContent = me.mFPS.GetFPS().toFixed(1) + " fps";
            }
        }
    }

    renderLoop2();
}

ShaderToy.prototype.iSetResolution = function (xres, yres)
{
    document.getElementById("myResolution").textContent =  "" + xres.toString() + " x "  + yres.toString();
}

ShaderToy.prototype.pauseTime = function(doFocusCanvas)
{
    if( !this.mIsPaused )
    {
        document.getElementById("myPauseButton").style.background="url('/img/themes/" + gThemeName + "/play.png')";
        this.mIsPaused = true;
        this.mEffect.StopOutputs();
    }
    else
    {
        document.getElementById("myPauseButton").style.background="url('/img/themes/" + gThemeName + "/pause.png')";
        this.mTOffset = this.mTf;
        this.mTo = getRealTime();
        this.mIsPaused = false;
        this.mRestarted = true;
        this.mEffect.ResumeOutputs();
        if( doFocusCanvas )
            this.mCanvas.focus();
    }
}

ShaderToy.prototype.resetTime = function(doFocusOnCanvas)
{
    this.mTOffset = 0;
    this.mTo = getRealTime();
    this.mTf = 0;
    this.mRestarted = true;
    this.mFpsTo = this.mTo;
    this.mFpsFrame = 0;
    this.mForceFrame = true;
    this.mEffect.ResetTime();
    if( doFocusOnCanvas )
        this.mCanvas.focus();
}

ShaderToy.prototype.SetErrors = function( isError, errorStr, fromScript )
{
    while( this.mErrors.length > 0 )
    {
        var mark = this.mErrors.pop();
        this.mCodeEditor.removeLineWidget( mark );
    }

    if( !isError )
    {
        this.mForceFrame = true;
    }
    else
    {
        var lineOffset = this.mEffect.GetHeaderSize( this.mActiveDoc );

        var lines = errorStr.split(/\r\n|\r|\n/);

        var maxLines = this.mCodeEditor.lineCount();

        for( let i=0; i<lines.length; i++ )
        {
            let parts = lines[i].split(":");
            if( parts.length===5 || parts.length===6 )
            {
                let lineAsInt = parseInt( parts[2] );

                if( isNaN(lineAsInt) ) // for non-webgl errors
                {
                  let msg = document.createElement("div");
                  msg.appendChild( document.createTextNode( "Unknown Error: " + lines[i] ));
                  msg.className = "errorMessage";
                  let mark = this.mCodeEditor.addLineWidget( 0, msg, {coverGutter: false, noHScroll: true} );
                  this.mErrors.push( mark );
                }
                else
                {
                  let lineNumber = lineAsInt - lineOffset;

                  let msg = document.createElement("div");
                  msg.appendChild(document.createTextNode( parts[3] + " : " + parts[4] ));
                  msg.className = "errorMessage";

                  if( lineNumber>maxLines ) lineNumber = maxLines;

                  let mark = this.mCodeEditor.addLineWidget( lineNumber, msg, {coverGutter: false, noHScroll: true} );
                  this.mErrors.push( mark );
                }
            }
            else if( lines[i] !== null && lines[i]!=="" && lines[i].length>1 && parts[0]!=="Warning")
            {
                let txt = "";
                if( parts.length===4 )
                    txt = parts[2] + " : " + parts[3];
                else
                    txt = "Unknown error: " + lines[i];

                let msg = document.createElement("div");
                msg.appendChild(document.createTextNode( txt ));
                msg.className = "errorMessage";
                let mark = this.mCodeEditor.addLineWidget( 0, msg, {coverGutter: false, noHScroll: true, above: true} );
                this.mErrors.push( mark );
            }
         }
    }
}

ShaderToy.prototype.AllowPublishing = function()
{
    if (this.mAreThereAnyErrors) return false;
    return true;
}

ShaderToy.prototype.GetTotalCompilationTime = function ()
{
    return this.mEffect.GetTotalCompilationTime();
}

ShaderToy.prototype.SetErrorsGlobal = function (areThereAnyErrors, fromScript)
{
    this.mAreThereAnyErrors = areThereAnyErrors;
    let eleWrapper = document.getElementById('editor');

    if( areThereAnyErrors===false )
    {
        this.mForceFrame = true;
        if( fromScript===false )
        {
            eleWrapper.classList.add("errorNo");
            setTimeout(function () { eleWrapper.classList.remove( "errorNo" ); }, 500 );
        }
    }
    else
    {
        if (fromScript === false)
        {
            eleWrapper.classList.add("errorYes");
            setTimeout(function () { eleWrapper.classList.remove("errorYes"); }, 500);
        }
    }
}

ShaderToy.prototype.SetTexture = function( slot, url )
{
    this.mNeedsSave = true;
    var res = this.mEffect.NewTexture( this.mActiveDoc, slot, url );
    if( res.mFailed===false )
    {
        this.mPass[this.mActiveDoc].mDirty = res.mNeedsShaderCompile;
    }
}
ShaderToy.prototype.PauseInput = function (id) { return this.mEffect.PauseInput(this.mActiveDoc, id); }
ShaderToy.prototype.ToggleMuteInput = function (id) { return this.mEffect.ToggleMuteInput(this.mActiveDoc, id); }
ShaderToy.prototype.RewindInput = function (id) { this.mEffect.RewindInput(this.mActiveDoc, id); }
ShaderToy.prototype.GetTexture = function( slot ) { return this.mEffect.GetTexture( this.mActiveDoc, slot ); }
ShaderToy.prototype.GetAcceptsLinear = function (slot) { return this.mEffect.GetAcceptsLinear(this.mActiveDoc, slot); }
ShaderToy.prototype.GetAcceptsMipmapping = function (slot) { return this.mEffect.GetAcceptsMipmapping(this.mActiveDoc, slot); }
ShaderToy.prototype.GetAcceptsWrapRepeat = function (slot) { return this.mEffect.GetAcceptsWrapRepeat(this.mActiveDoc, slot); }
ShaderToy.prototype.GetAcceptsVFlip = function (slot) { return this.mEffect.GetAcceptsVFlip(this.mActiveDoc, slot); }
ShaderToy.prototype.SetSamplerFilter = function (slot, str) { this.mEffect.SetSamplerFilter(this.mActiveDoc, slot, str);  this.mForceFrame = true; }
ShaderToy.prototype.GetSamplerFilter = function (slot) { return this.mEffect.GetSamplerFilter(this.mActiveDoc, slot); }
ShaderToy.prototype.SetSamplerWrap = function (slot, str) { this.mEffect.SetSamplerWrap(this.mActiveDoc, slot, str); this.mForceFrame = true; }
ShaderToy.prototype.GetSamplerWrap = function (slot) { return this.mEffect.GetSamplerWrap(this.mActiveDoc, slot); }
ShaderToy.prototype.SetSamplerVFlip = function (slot, str) { this.mEffect.SetSamplerVFlip(this.mActiveDoc, slot, str); this.mForceFrame = true; }
ShaderToy.prototype.GetSamplerVFlip = function (slot) { return this.mEffect.GetSamplerVFlip(this.mActiveDoc, slot); }

ShaderToy.prototype.ShowTranslatedSource = function()
{
    let str = this.mEffect.GetTranslatedShaderSource(this.mActiveDoc);
    let ve = document.getElementById("centerScreen" );
    doAlert( piGetCoords(ve), {mX:640,mY:512}, "Translated Shader Code", "<pre>"+str+"</pre>", false, null );
}

ShaderToy.prototype.UIStartCompiling = function (affectsUI)
{
    this.mState = 2;
    this.mEleCompilerTime.textContent = "Compiling...";
    if (affectsUI)
    {
        this.setActionsState(false);
    }
}

ShaderToy.prototype.UIEndCompiling = function (affectsUI)
{
    if( affectsUI ) this.setActionsState(true);

    let anyErrors = this.mEffect.GetErrorGlobal();
    this.setCompilationTime();
    this.setSaveOptions(anyErrors);

    for (let i = 0; i < this.mEffect.GetNumPasses(); i++)
    {
        let eleLab = document.getElementById("tab" + i);
        if (this.mEffect.GetError(i) )
            eleLab.classList.add("errorYes");
        else
            eleLab.classList.remove("errorYes");
    }

    this.SetErrors(this.mEffect.GetError(this.mActiveDoc),
                   this.mEffect.GetErrorStr(this.mActiveDoc), false);
    this.SetErrorsGlobal(anyErrors, false);
    this.setChars();
    this.setFlags();

    if (!anyErrors)
    {
        if (!this.mIsRendering)
        {
            this.startRendering();
            this.resetTime();
        }
        this.mForceFrame = true;
    }

    this.mState = 1;
}

ShaderToy.prototype.setActionsState = function (areEnabled)
{
    let eleSave = document.getElementById("saveButton");
    let eleComp = document.getElementById("compileButton");

    if (eleSave !== null)
        eleSave.disabled = !areEnabled;
    eleComp.disabled = !areEnabled;
}

ShaderToy.prototype.SetShaderFromEditor = function( forceall, affectsUI )
{
    if (this.mState!==1) return;

    let num = this.mEffect.GetNumPasses();
    for (let i = 0; i < num; i++)
    {
        if (this.mEffect.GetPassType(i) === "common" && this.mPass[i].mDirty)
        {
            forceall = true;
            break;
        }
    }

    this.UIStartCompiling(affectsUI);
    window.setTimeout(function ()
    {
        let passes = [];
        for( let i=0; i<num; i++ )
        {
            if( this.mPass[i].mDirty || forceall )
            {
                let shaderCode = this.mPass[i].mDocs.getValue();
                this.mEffect.SetCode(i, shaderCode);
                this.mPass[i].mDirty = false;
                this.mPass[i].mCharCount = minify(shaderCode).length;
                this.mPass[i].mCharCountDirty = false;
                passes.push( i );
            }
        }

        let me = this;
        this.mEffect.CompileSome(passes, true, function (worked)
        {
            me.UIEndCompiling(affectsUI)
        });
    }.bind(this), 10);
}


// guiID: { null, texture, cubemap, video, music, mic, keyb, webcam, musicstream, buffer }
ShaderToy.prototype.RefreshTexturThumbail = function( myself, slot, img, forceFrame, guiID, renderID, time, passID )
{
  if (passID !== myself.mActiveDoc) return;

  var canvas = document.getElementById('myUnitCanvas'+slot);
  var i0 = document.getElementById('myPauseButton' + slot);
  var i1 = document.getElementById('myRewindButton' + slot);
  var i2 = document.getElementById('myMuteButton' + slot);
  var i3 = document.getElementById('mySamplingButton' + slot);
  var i4 = document.getElementById('myNoInput' + slot);

  if (guiID === 0  )
  {
      i3.style.visibility = "hidden";
      i4.style.visibility = "hidden";
  }
  else
  {
      i3.style.visibility = "visible";
      i4.style.visibility = "visible";
  }

  if (guiID === 0 || guiID === 1 || guiID===2 || guiID===5 || guiID===6 || guiID===9  )
  {
      i0.style.visibility = "hidden";
      i1.style.visibility = "hidden";
      i2.style.visibility = "hidden";
  }
  else
  {
      i0.style.visibility = "visible";
      i1.style.visibility = "visible";
      i2.style.visibility = "visible";
  }

  var w = canvas.width;
  var h = canvas.height;

  var ctx = canvas.getContext('2d');

  if (guiID === 0)
  {
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, w, h);
  }
  else if (guiID === 1)
  {
      ctx.fillStyle = "#000000";
      if (renderID===0 )
          ctx.fillRect(0, 0, w, h+4);
      else 
      {
        ctx.fillRect(0, 0, w, h);  
        ctx.drawImage(img, 0, 0, w, h);
      }
  }
  else if (guiID === 2) 
  {
      ctx.fillStyle = "#000000";
      if (renderID===0 )
          ctx.fillRect(0, 0, w, h+4);
      else
          ctx.drawImage(img, 0, 0, w, h);
  }
  else if (guiID === 3) 
  {
      ctx.fillStyle = "#000000";
      if (renderID===0 )
          ctx.fillRect(0, 0, w, h+4);
      else
          ctx.drawImage(img, 0, 0, w, h);
  }
  else if (guiID === 4 || guiID === 5 || guiID === 8)
  {

      if (renderID === 0)
      {
          ctx.fillStyle = "#000000";
          ctx.fillRect(0, 0, w, h+4);

          ctx.strokeStyle = "#808080";
          ctx.lineWidth = 1;
          ctx.beginPath();
          let num = w / 2;
          for (let i = 0; i < num; i++)
          {
              let y = Math.sin(64.0 * 6.2831 * i / num + time) * Math.sin(2.0 * 6.2831 * i / num + time);
              let ix = w * i / num;
              let iy = h * (0.5 + 0.4 * y);
              if (i === 0) ctx.moveTo(ix, iy);
              else ctx.lineTo(ix, iy);
          }
          ctx.stroke();

          let str = "Audio not loaded";
          ctx.font = "normal bold 20px Arial";
          ctx.lineWidth = 4;
          ctx.strokeStyle = "#000000";
          ctx.strokeText(str, 14, h / 2);
          ctx.fillStyle = "#ff0000";
          ctx.fillText(str, 14, h / 2);

          document.getElementById("myPauseButton" + slot).src = "/img/themes/" + gThemeName + "/pause.png";
      }
      else 
      {
          var voff = 0;

          ctx.fillStyle = "#000000";
          ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = "#ffffff";

          var numfft = img.wave.length;
          numfft /= 2;
          if (numfft > 512) numfft = 512;
          let num = 32;
          var numb = (numfft / num) | 0;
          var s = ((w - 8 * 2) / num);
          var k = 0;
          for (let i = 0; i < num; i++)
          {
              let f = 0.0;
              for (let j = 0; j < numb; j++)
              {
                  f += img.wave[k++];
              }
              f /= numb;
              f /= 255.0;

              let fr = f;
              let fg = 4.0 * f * (1.0 - f);
              let fb = 1.0 - f;

              let rr = (255.0 * fr) | 0;
              let gg = (255.0 * fg) | 0;
              let bb = (255.0 * fb) | 0;

              let decColor = 0x1000000 + bb + 0x100 * gg + 0x10000 * rr;
              ctx.fillStyle = '#' + decColor.toString(16).substr(1);

              let a = Math.max(2, f * (h - 2 * 20));
              ctx.fillRect(8 + i * s, h - voff - a, 3 * s / 4, a);
          }

          // If it is a music stream then we want to show extra information
          if (guiID===8)
          {
              let str = img.info.user.username + " - " + img.info.title;
              let x = w - 10.0 * (time % 45.0);
              ctx.font = "normal normal 12px Arial";
              ctx.strokeStyle = "#000000";
              ctx.lineWidth = 4;
              ctx.strokeText(str,x,32);
              ctx.fillStyle = "#ffffff";
              ctx.fillText(str,x,32);
              ctx.drawImage(myself.mSoundcloudImage, 45, 0);
          }
      }
  }
  else if (guiID === 6) //kyeboard
  {
    var thereskey = false;
    ctx.fillStyle = "#ffffff";
    for( let i=0; i<256; i++ )
    {
        let x = (w*i/256) | 0;
        if( img.mData[i]>0 )
        {
            thereskey = true;
            break;
        }
    }

    ctx.drawImage( img.mImage, 0, 0, w, h );

    if( thereskey )
    {
        ctx.fillStyle = "#ff8040";
        ctx.globalAlpha = 0.4;
        ctx.fillRect(0,0,w,h);
        ctx.globalAlpha = 1.0;
    }
  }
  else if (guiID === 7) 
  {
      ctx.fillStyle = "#000000";
      if (renderID === 0)
          ctx.fillRect(0, 0, w, h);
      else
          ctx.drawImage(img, 0, 0, w, h);
  }
  else if (guiID === 9)
  {
      if (renderID === 0)
      {
          ctx.fillStyle = "#808080";
          ctx.fillRect(0, 0, w, h);
      }
      else
      {
          ctx.drawImage(img.texture, 0, 0, w, h);
          if( img.data !== null )
          {
                ctx.putImageData( img.data, 0, 0,  0, 0, w, h ); 
          }
      }
  }

  if (time > 0.0)
  {
      let str = time.toFixed(2) + "s";
      ctx.font="normal normal 10px Arial";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 4;
      ctx.strokeText(str,4,12);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(str,4,12);
  }

  myself.mForceFrame = forceFrame;
}

ShaderToy.prototype.setChars = function()
{
    if( this.mPass.length===1 )
    {
        if( this.mPass[0].mCharCountDirty )
        {
            this.mPass[0].mCharCount = minify( this.mCodeEditor.getValue() ).length;
            this.mPass[0].mCharCountDirty = false;
        }
        this.mCharCounter.textContent = this.mPass[0].mCharCount + " chars";
        this.mCharCounterTotal.textContent = "";
    }
    else
    {
        let currentPassCount = 0;
        let globalCount = 0;
        for( let i=0; i<this.mPass.length; i++ )
        {
            if( this.mPass[i].mCharCountDirty )
            {
                this.mPass[i].mCharCount = minify( this.mPass[i].mDocs.getValue() ).length;
                this.mPass[i].mCharCountDirty = false;
            }
            if( i===this.mActiveDoc ) currentPassCount = this.mPass[i].mCharCount;
            globalCount += this.mPass[i].mCharCount;
        }
        this.mCharCounter.textContent = currentPassCount;
        this.mCharCounterTotal.textContent = " / " + globalCount + " chars";
    }
}

ShaderToy.prototype.setSaveOptions = function(areThereErrors)
{
    let elePubished = document.getElementById('published');
    if (elePubished === null) return;

    //let compileTime = this.mEffect.GetTotalCompilationTime();
    let disableOptions = areThereErrors;// || (compileTime > kMaxCompileTime);
    elePubished.options[0].disabled = disableOptions;
    elePubished.options[1].disabled = disableOptions;
    if (disableOptions)
    {
        let str = "You can only publish shaders that compile";// in less that " + Math.floor(kMaxCompileTime) + " seconds";
        elePubished.options[0].title = str;
        elePubished.options[1].title = str;
    }
    else
    {
        elePubished.options[0].title = "";
        elePubished.options[1].title = "";
    }
}

ShaderToy.prototype.setCompilationTime = function()
{
    /*
    if( this.mPass.length===1 )
    {
        let ti = this.mEffect.GetCompilationTime(0);
        this.mEleCompilerTime.textContent = "Compiled in " + ti.toFixed(1) + " secs";
    }
    else
    {
        let lti = this.mEffect.GetCompilationTime(this.mActiveDoc);
        let gti = this.mEffect.GetTotalCompilationTime();
        this.mEleCompilerTime.textContent = "Compiled in " + lti.toFixed(1) + " / " + gti.toFixed(1) + " secs";
    }
    */
    let ti = this.mEffect.GetTotalCompilationTime();
    this.mEleCompilerTime.textContent = "Compiled in " + ti.toFixed(1) + " secs";
}

ShaderToy.prototype.setFlags = function()
{
    if( this.mEffect===null ) return;

    var flags = this.mEffect.calcFlags();
/*
    var eleVR = document.getElementById( "myVR" );
    eleVR.style.visibility = ( flags.mFlagVR==true ) ? "visible" : "hidden";
*/
}

ShaderToy.prototype.showChars = function()
{
    let str = this.mCodeEditor.getValue();
    str = minify( str );
    let ve = document.getElementById("centerScreen" );
    doAlert( piGetCoords(ve), {mX:480,mY:-1}, "Minimal Shader Code, (" + str.length + " chars)", "<pre>"+htmlEntities(str)+"</pre>", false, null );
}

ShaderToy.prototype.ChangeTabLeft = function()
{
    var num = this.mEffect.GetNumPasses();
    // find tab pointing to current pass
    var i; for( i=0; i<num; i++ ) if( this.mTab2Pass[i] === this.mActiveDoc ) break;
    // move left
    i = (i - 1 + num ) % num;
    // change
    this.ChangePass( this.mTab2Pass[i]);
}

ShaderToy.prototype.ChangeTabRight = function()
{
    var num = this.mEffect.GetNumPasses();
    // find tab pointing to current pass
    var i; for( i=0; i<num; i++ ) if( this.mTab2Pass[i] === this.mActiveDoc ) break;
    // move right
    i = (i + 1) % num;
    // change
    this.ChangePass( this.mTab2Pass[i]);
}

ShaderToy.prototype.ChangePass = function( id )
{
    this.mActiveDoc = id;
    this.mCodeEditor.swapDoc( this.mPass[id].mDocs );
    this.setChars();
    this.setCompilationTime();
    this.SetErrors( this.mEffect.GetError(id), this.mEffect.GetErrorStr(id), false);
    this.mEffect.UpdateInputs( id, true );

    let num = this.mEffect.GetNumPasses();
    for( let i=0; i<num; i++ )
    {
        let eleLab = document.getElementById( "tab" + i );
        if( i===id )
            eleLab.classList.add("selected");
        else
            eleLab.classList.remove("selected");
    }

    {
    let passType = this.mEffect.GetPassType(id);
    let ele = document.getElementById( "textures" );
    ele.style.visibility = (passType === "common")?"hidden":"visible";

    ele = document.getElementById( "screenshotButton" );
    ele.style.visibility = (passType === "sound" || passType === "buffer" || passType === "cubemap") ? "visible" : "hidden";
    }
}

ShaderToy.prototype.KillPass = function( id )
{
    let ret = confirm(gStrWantDeletePass);
    if (ret !== true)
        return;

    let wasCommon = (this.mEffect.GetPassType(id) === "common");

    this.mNeedsSave = true;
    this.mEffect.DestroyPass( id );
    this.mPass.splice(id, 1);
    this.BuildTabs();

    let activePass = this.mActiveDoc;
    if( activePass >= id )
    {
        activePass--;
        if( activePass<0 ) activePass=0;
    }

    this.ChangePass(activePass);

    this.SetShaderFromEditor(wasCommon, true);
}

ShaderToy.prototype.AddPass = function(passType,passName, outputID)
{
    let iCompiled = function ()
    {
    };

    let res = this.mEffect.AddPass( passType, passName, iCompiled );
    let id = res.mId;

    this.mEffect.SetOutputsByBufferID(id, 0, outputID );

    this.mPass[id] = { mDocs: CodeMirror.Doc( res.mShader, "text/x-glsl"),
                       mDirty: false,
                       mCharCount: minify(res.mShader).length,
                       mCharCountDirty: false };
    this.BuildTabs();

    this.ChangePass( id );
    this.mNeedsSave = true;
}

//-------------------------
const kPassTypes = ["common", "buffer", "cubemap", "image", "sound"];

ShaderToy.prototype.AddPlusTabs = function( passes )
{
    var me = this;

    var numS = this.mEffect.GetNumOfType( "sound" );
    var numB = this.mEffect.GetNumOfType( "buffer" );
    var numC = this.mEffect.GetNumOfType( "common" );
    var numR = this.mEffect.GetNumOfType( "cubemap" );

    if( numS<1 || numB<4 || numC<1 || numR<1)
    {
        var eleCon = document.createElement( "div" );
        eleCon.className = "tabAddContainer";

        var eleSel = document.createElement( "select" );
        eleSel.className = "tabAddSelect";

        var eleOpt = document.createElement("option");
        eleOpt.value = "";
        eleOpt.text = "";
        eleOpt.hidden = true;
        eleSel.appendChild(eleOpt);

        if( numC<1 )
        {
            let eleOpt = document.createElement("option");
            eleOpt.value = 0;
            eleOpt.text = "Common";
            eleSel.appendChild(eleOpt);
        }

        if( numS<1 )
        {
            let eleOpt = document.createElement("option");
            eleOpt.value = 1;
            eleOpt.text = "Sound";
            eleSel.appendChild(eleOpt);
        }

        if( numB<4 )
        {
            for (let i=0; i<4; i++ )
            {
                let isused = me.mEffect.IsBufferPassUsed( i );
                if( isused ) continue;
                let eleOpt = document.createElement("option");
                eleOpt.value = 2+i;
                eleOpt.text = "Buffer " +  String.fromCharCode(65+i);
                eleSel.appendChild(eleOpt);
            }
        }

        if( numR<1 )
        {
            let eleOpt = document.createElement("option");
            eleOpt.value = 6;
            eleOpt.text = "Cubemap A";
            eleSel.appendChild(eleOpt);
        }

        eleSel.onchange = function( ev ) 
                            { 
                                let val = parseInt( this.value );
                                var outputID = null;
                                var passType = "common";
                                var passName = "Common";
                                if( val === 0 )
                                {
                                    outputID = null;
                                    passType = "common";
                                    passName = "Common";
                                }
                                else if( val === 1)
                                {
                                    outputID = null;
                                    passType = "sound";
                                    passName = "Sound";
                                }
                                else if( val >= 2 && val<=5 )
                                {
                                    outputID = val - 2;
                                    passType = "buffer";
                                    passName = "Buffer " + String.fromCharCode(65+outputID);
                                }
                                else if( val === 6)
                                {
                                    outputID = 0;
                                    passType = "cubemap";
                                    passName = "Cube " + "A";
                                }

                                me.AddPass(passType, passName, outputID ); 
                                ev.stopPropagation();
                            }

        eleCon.appendChild( eleSel );

        this.mPassParent.appendChild( eleCon );
    }
}

ShaderToy.prototype.AddTab = function( passType, passName, id )
{
    var me = this;

    var eleTab = document.createElement( "div" );
    eleTab.mNum = id;
    eleTab.onclick = function( ev ) { me.ChangePass( this.mNum ); }
    eleTab.id = "tab"+id;
    eleTab.className = "tab";

    if (this.mEffect.GetError(id) )
    {
        eleTab.classList.add("errorYes");
    }
    else 
    {
        eleTab.classList.remove("errorYes");
    }

    {
    let eleImg = document.createElement( "img" );
    eleImg.className = "tabImage";
    if( passType === "sound" )  eleImg.src = "/img/music.png";
    if( passType === "common" ) eleImg.src = "/img/common.png";
    if( passType === "image" )  eleImg.src = "/img/image.png";
    if( passType === "buffer" ) eleImg.src = "/img/buffer.png";
    if( passType === "cubemap" ) eleImg.src = "/img/cubemap.png";
    eleTab.appendChild( eleImg );
    }

    {
    var eleLab = document.createElement( "label" );
    eleLab.textContent = passName;
    eleTab.appendChild( eleLab );
    }

    if( passType !== "image" )
    {
      let eleImg = document.createElement( "img" );
      eleImg.src = "/img/closeSmall.png";
      eleImg.className = "tabClose";
      eleImg.mNum = id;
      eleImg.onclick = function( ev ) { me.KillPass( this.mNum ); ev.stopPropagation();}
      eleTab.appendChild( eleImg );
    }

    this.mPassParent.appendChild( eleTab );
}

ShaderToy.prototype.BuildTabs = function()
{
    this.mPassParent.innerHTML = '';
    this.AddPlusTabs();

    const num = this.mEffect.GetNumPasses();

    this.mTab2Pass = [];
    let n = 0;
    for (let j = 0; j < 5; j++)
    {
        for (let i = 0; i < num; i++)
        {
            var passType = this.mEffect.GetPassType(i);
            if (passType !== kPassTypes[j] ) continue;
            var passName = this.mEffect.GetPassName(i);
            this.AddTab(passType, passName, i);
            this.mTab2Pass[n++] = i;
        }
    }
}

ShaderToy.prototype.Load = function( jsn, preventCache, doResolve )
{
    try
    {
        this.mEleCompilerTime.textContent = "Compiling...";

        let me = this;

        if (!this.mEffect.Load(jsn)) return;

        this.mPass = [];

        var num = this.mEffect.GetNumPasses();
        for( let i=0; i<num; i++ )
        {
            let shaderCode = this.mEffect.GetCode(i);
            this.mPass[i] = { mDocs:   CodeMirror.Doc( shaderCode, "text/x-glsl"),
                              mDirty:  false,
                              mCharCount: minify(shaderCode).length,
                              mCharCountDirty: false
                             };
        }
        this.mCodeEditor.clearHistory()
        this.BuildTabs();
        this.ChangePass(0);
        this.setSaveOptions(true);
        this.resetTime();

        this.UIStartCompiling(true);
        this.mEffect.Compile(true /*true due to crash reporting*/, function(worked)
        {
            me.UIEndCompiling(true);

            let compilationTime = me.mEffect.GetTotalCompilationTime();
            if (!gIsMyShader && (compilationTime > kMaxCompileTime)) {
                iReportCrash(gShaderID);
            }
        });

        this.mInfo = jsn.info;

        return { mDownloaded  : true,
                 mDate        : jsn.info.date,
                 mViewed      : jsn.info.viewed,
                 mName        : jsn.info.name,
                 mUserName    : jsn.info.username,
                 mDescription : jsn.info.description,
                 mLikes       : jsn.info.likes,
                 mPublished   : jsn.info.published,
                 mHasLiked    : jsn.info.hasliked,
                 mTags        : jsn.info.tags,
                 mParentId    : jsn.info.parentid,
                 mParentName  : jsn.info.parentname };
    }
    catch( e )
    {
        console.log( e );
    }
}

ShaderToy.prototype.Save = function()
{
    var res = this.mEffect.Save();

    if( this.mNeedsSave )
    {
        for( let i=0; i<res.renderpass.length; i++ )
        {
            res.renderpass[i].code = this.mPass[i].mDocs.getValue();
        }
    }

    res.info = this.mInfo;

    return res;
}

// TODO: move this to Effect
ShaderToy.prototype.CheckShaderCorrectness = function ()
{
    let numPasses = this.mEffect.GetNumPasses();
    let countImage = 0;
    let countCommon = 0;
    let countSound = 0;
    let countCubemap = 0;
    let countBuffer = 0;
    for (let j = 0; j < numPasses; j++)
    {
        let passType = this.mEffect.GetPassType(j);
        if (passType === "image"  ) countImage++;
        if (passType === "common" ) countCommon++;
        if (passType === "sound"  ) countSound++;
        if (passType === "cubemap") countCubemap++;
        if (passType === "buffer" ) countBuffer++;
    }
    if (countImage !== 1) return false;
    if (countCommon  > 1) return false;
    if (countSound   > 1) return false;
    if (countCubemap > 1) return false;
    if (countBuffer  > 4) return false;
    return true;
}
//----------------------------------------------------------------------------

var gShaderToy = null;
var gCode = null;
var gIsLiked = 0;
var gRes = null;

function loadNew()
{
    const kk = {
	"ver" : "0.1",
	"info" : { "id":"-1", "date":"1358124981", "viewed":0, "name":"", "username": "None", "description":"", "likes":0, "hasliked":0, "tags":[], "published":0 },
    "flags" : { "mFlagVR" : "false", "mFlagWebcam" : "false", "mFlagSoundInput" : "false", "mFlagSoundOutput" : "false", "mFlagKeyboard" : "false" },
	"renderpass": [ { "inputs": [], "outputs": [ {"channel":0, "id":"4dfGRr" } ], "type":"image", "code": "void mainImage( out vec4 fragColor, in vec2 fragCoord )\n{\n    // Normalized pixel coordinates (from 0 to 1)\n    vec2 uv = fragCoord/iResolution.xy;\n\n    // Time varying pixel color\n    vec3 col = 0.5 + 0.5*cos(iTime+uv.xyx+vec3(0,2,4));\n\n    // Output to screen\n    fragColor = vec4(col,1.0);\n}", "name":"", "description":"" } ]
	};
    iLoadShader( [kk] );
}

//======= minify ==========================

function minify( str )
{
    function isSpace( str, i ) { return (str[i]===' ') || (str[i]==='\t'); }
    function isLine( str, i ) { return (str[i]==='\n'); }
    function replaceChars(str)
    {
        var dst = "";
        var num = str.length;
        var isPreprocessor = false;
        for( let i=0; i<num; i++ )
        {
                 if( str[i]==='#'  ) { isPreprocessor = true; }
            else if( str[i]==='\n' ) {  if( isPreprocessor ) { isPreprocessor = false; } else { dst = dst + " "; continue; } }
            else if( str[i]==='\r' ) { dst = dst + " "; continue; }
            else if( str[i]==='\t' ) { dst = dst + " "; continue; }
            else if( i<(num-1) && str[i]==='\\' && str[i+1]==='\n') { i+=1; continue; }
            dst = dst + str[i];
        }
        return dst;
    }
    function removeEmptyLines(str)
    {
        var dst = "";
        var num = str.length;
        var isPreprocessor = false;
        for( var i=0; i<num; i++ )
        {
            if( str[i]==='#' ) isPreprocessor = true;
            var isDestroyableChar = isLine(str,i);
            if( isDestroyableChar && !isPreprocessor ) continue;
            if( isDestroyableChar &&  isPreprocessor ) isPreprocessor = false;
            dst = dst + str[i];
        }
        return dst;
    }
    function removeMultiSpaces(str)
    {
        var dst = "";
        var num = str.length;
        for( var i=0; i<num; i++ )
        {
            if( isSpace(str,i) && (i===(num-1)) ) continue;
            if( isSpace(str,i) && isLine(str,i-1) ) continue;
            if( isSpace(str,i) && isLine(str,i+1) ) continue;
            if( isSpace(str,i) && isSpace(str,i+1) ) continue;
            dst = dst + str[i];
        }
        return dst;
    }
    function removeSingleSpaces(str)
    {
        var dst = "";
        var num = str.length;
        for( var i=0; i<num; i++ )
        {
            var iss = isSpace(str,i);
            if( i===0 && iss ) continue;

            if( i>0 )
            {
            if( iss && ( ( str[i-1]===';' ) || ( str[i-1]===',' ) || ( str[i-1]==='}' ) || ( str[i-1]==='{' ) ||
                         ( str[i-1]==='(' ) || ( str[i-1]===')' ) || ( str[i-1]==='+' ) || ( str[i-1]==='-' ) ||
                         ( str[i-1]==='*' ) || ( str[i-1]==='/' ) || ( str[i-1]==='?' ) || ( str[i-1]==='<' ) ||
                         ( str[i-1]==='>' ) || ( str[i-1]==='[' ) || ( str[i-1]===']' ) || ( str[i-1]===':' ) ||
                         ( str[i-1]==='=' ) || ( str[i-1]==='^' ) || ( str[i-1]==='%' ) || ( str[i-1]==='\n' ) ||
                         ( str[i-1]==='\r' ) ) ) continue;
            }
            if( i>1 )
            {
                if( iss && ( ( str[i-1]==='&' ) && ( str[i-2]==='&' ) ) ) continue;
                if( iss && ( ( str[i-1]==='|' ) && ( str[i-2]==='|' ) ) ) continue;
                if( iss && ( ( str[i-1]==='^' ) && ( str[i-2]==='^' ) ) ) continue;
                if( iss && ( ( str[i-1]==='!' ) && ( str[i-2]==='=' ) ) ) continue;
                if( iss && ( ( str[i-1]==='=' ) && ( str[i-2]==='=' ) ) ) continue;
            }

            if( iss && ( ( str[i+1]===';' ) || ( str[i+1]===',' ) || ( str[i+1]==='}' ) || ( str[i+1]==='{' ) ||
                         ( str[i+1]==='(' ) || ( str[i+1]===')' ) || ( str[i+1]==='+' ) || ( str[i+1]==='-' ) ||
                         ( str[i+1]==='*' ) || ( str[i+1]==='/' ) || ( str[i+1]==='?' ) || ( str[i+1]==='<' ) ||
                         ( str[i+1]==='>' ) || ( str[i+1]==='[' ) || ( str[i+1]===']' ) || ( str[i+1]===':' ) ||
                         ( str[i+1]==='=' ) || ( str[i+1]==='^' ) || ( str[i+1]==='%' ) || ( str[i+1]==='\n' ) ||
                         ( str[i+1]==='\r' ) ) ) continue;
            if( i<(num-2) )
            {
                if( iss && ( ( str[i+1]==='&' ) && ( str[i+2]==='&' ) ) ) continue;
                if( iss && ( ( str[i+1]==='|' ) && ( str[i+2]==='|' ) ) ) continue;
                if( iss && ( ( str[i+1]==='^' ) && ( str[i+2]==='^' ) ) ) continue;
                if( iss && ( ( str[i+1]==='!' ) && ( str[i+2]==='=' ) ) ) continue;
                if( iss && ( ( str[i+1]==='=' ) && ( str[i+2]==='=' ) ) ) continue;
            }
            dst = dst + str[i];
        }
        return dst;
    }

    function removeComments( str )
    {
        var dst = "";
        var num = str.length;
        var state = 0;
        for( var i=0; i<num; i++ )
        {
            if( i<=(num-2) )
            {
                if( state===0 && str[i]==='/' && str[i+1]==='*' ) { state = 1; i+=1; continue; }
                if( state===0 && str[i]==='/' && str[i+1]==='/' ) { state = 2; i+=1; continue; }
                if( state===1 && str[i]==="*" && str[i+1]==="/" ) { dst += ' '; state = 0; i+=1; continue; }
                if( state===2 && (str[i]==="\r" || str[i]==="\n") ) { state = 0; continue; }
            }
            if( state===0 )
                dst = dst + str[i];
        }
        return dst;
    }

    str = removeComments( str );
    str = replaceChars( str  );
    str = removeMultiSpaces( str );
    str = removeSingleSpaces( str );
    str = removeEmptyLines( str );
    return str;
}

//======= minify ==========================

function loadComments()
{
    try
    {
        var httpReq = new XMLHttpRequest();
        httpReq.onload = function()
        {
            var jsn = httpReq.response;
            updatepage( jsn );
        };
        httpReq.open( "POST", "/comment", true );
        httpReq.responseType = "json";
        httpReq.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        httpReq.send( "s=" + gShaderID );
    }
    catch(e)
    {
        return;
    }
}

function iLoadShader( jsnShader )
{
    gRes = gShaderToy.Load( jsnShader[0], gIsMyShader );
    if( gRes.mDownloaded === false )
        return;

    document.title = (gRes.mName==="") ? "New" : gRes.mName;

    var st = document.getElementById( "shaderTitle" );      if( st ) { if( st.value === undefined ) { st.textContent = gRes.mName; st.title = gRes.mName; } else { st.value = gRes.mName;       } }
    var sd = document.getElementById( "shaderDescription"); if( sd ) { if( sd.value === undefined ) { sd.innerHTML = bbc2html(htmlEntities(gRes.mDescription),false); } else { sd.value = gRes.mDescription;} }
    var sp = document.getElementById( "published" );
    if( sp && sp!== undefined )
    {
        sp.selectedIndex = 2;
        for (let i = 0; i < sp.length; i++)
        {
            let option = sp.options[i];

            if (option.value == gRes.mPublished)
            {
                sp.selectedIndex = i;
                break;
            }
        }
    }

    updateLikes();
    var timeVar = "-";
    if( gRes.mDate !== 0 )
    {
        timeVar = piGetTime(gRes.mDate);
    }

    var shaderAuthorName = document.getElementById( "shaderAuthorName"); 
    if( shaderAuthorName) 
    {
        if (gRes.mUserName!=="") shaderAuthorName.innerHTML = "<a class='user' href='/user/" + htmlEntities(gRes.mUserName) +"'>" + htmlEntities(gRes.mUserName) + "</a>";
        else shaderAuthorName.innerHTML = "anonymous user";
    }
    var shaderAuthorDate = document.getElementById( "shaderAuthorDate"); 
    if( shaderAuthorDate ) shaderAuthorDate.innerHTML = timeVar;

    var txtHtml = "";
    var txtPlain = "";
    var numTags = gRes.mTags.length;
    for( let i=0; i<numTags; i++ )
    {
        txtHtml += "<a class='user' href='/results?query=tag%3D" + htmlEntities(gRes.mTags[i]) + "'>" + htmlEntities(gRes.mTags[i]) + "</a>";
        txtPlain += gRes.mTags[i];
        if( i !== (numTags-1) ) { txtHtml += ", "; txtPlain += ", "; }
    }
    var sts = document.getElementById( "shaderTags"); if( sts ) { if( sts.value === undefined ) sts.innerHTML = txtHtml; else sts.value = txtPlain; }

    var shareShader = document.getElementById("shaderShare");

    // like
    var shaderLike = document.getElementById("shaderLike");
    if( shaderLike !== null )
    {
        gIsLiked = gRes.mHasLiked;
        updateLikes();
        shaderLike.onclick = function()
        {
            var url = "s=" + gShaderID + "&l=" + ((gIsLiked==1)?0:1);
            var mHttpReq = new XMLHttpRequest();
            mHttpReq.open( "POST", "/shadertoy", true );
            mHttpReq.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            mHttpReq.onload = function()
            {
                var jsn = mHttpReq.response;
                if( jsn===null ) return;
                if( jsn.result!==0 )
                {
                    if( gIsLiked===1 ) gRes.mLikes--; else gRes.mLikes++;
                    gIsLiked = 1 - gIsLiked;
                    updateLikes();
                }
            }
            mHttpReq.send( url );
        }
    }

    // Forked
    var shaderForkedFrom = document.getElementById("shaderForkedFrom");
    if (shaderForkedFrom !== null ) {
        if (gRes.mParentId !== "" ) {
            if  (gRes.mParentName !== "") {
                shaderForkedFrom.innerHTML = gStrFork + " <a class='user' href='/view/" + gRes.mParentId + "'>" + gRes.mParentName + "</a>";
            } else {
                shaderForkedFrom.innerHTML = gStrForkDeleted;
            }
        }
    }
}

function loadShader()
{
    gShaderToy.mState = 0;

    try
    {
        var httpReq = new XMLHttpRequest();
        httpReq.addEventListener( 'load', function ( event ) 
        { 
            var jsnShader = event.target.response;
            if (jsnShader === null) { alert("Error loading shader"); return; };
            gShaderToy.mState = 1;
            iLoadShader( jsnShader );
        }, false );
        httpReq.addEventListener( 'error', function () { alert( "Error loading shader" ); }, false );

        httpReq.open( "POST", "/shadertoy", true );
        httpReq.responseType = "json";
        httpReq.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        var str = "{ \"shaders\" : [\"" + gShaderID + "\"] }";
        str = "s=" + encodeURIComponent(str) + "&nt=1&nl=1&np=1";
        httpReq.send( str  );
    }
    catch(e)
    {
         return;
    }
}

function watchInit()
{
    var editorParent = document.getElementById("editor");
    var viewerParent = document.getElementById("player");
    var passParent   = document.getElementById("passManager")

    // cancel/intercept browsers special keys
    document.addEventListener("keydown",function(e)
    {
        // intercept BACKSPACE
        if( e.keyCode===8 )
        {
            var ele = piGetSourceElement(e);

            if( ele.nodeName === "BODY")
            {
                e.preventDefault();
                return;
            }

            if( ele.id === "demogl" )
            {
                var me = gShaderToy;
                me.mEffect.SetKeyDown( me.mActiveDoc, e.keyCode );
                if( me.mIsPaused ) me.mForceFrame = true;
            }
        }
        // intercept CTRL+S (save the web page to disk)
        else if( e.keyCode===83 && (navigator.platform.match("Mac")?e.metaKey:e.ctrlKey))
        {
            e.preventDefault();
        }/*
        // intercept browsers default behaviour for CTRL+F (search)
        else if(e.keyCode===70 && (navigator.platform.match("Mac")?e.metaKey:e.ctrlKey))
        {
            e.preventDefault();
        }*/
    }, false);

    // cancel/intercept browsers default behaviour for ALT+LEFT (prev URL)
    if( !navigator.platform.match("Mac") )
        document.addEventListener("keydown",function(e){if(e.keyCode==37 && e.altKey){e.preventDefault();}}, false);

    // prevent unloading page without saving changes to shader
    window.onbeforeunload = function(e) { if( gShaderToy!==null && gShaderToy.GetNeedSave() ) return "You are about to lose your changes in the code editor."; };

    gShaderToy = new ShaderToy( viewerParent, editorParent, passParent );
    if( !gShaderToy.mCreated )
        return;

    gShaderToy.setFontSize(gFontSize, false);

    //-- get info --------------------------------------------------------

    if( gShaderID===null )
    {
         loadNew();
    }
    else
    {
         loadComments( gShaderID );
         loadShader( gShaderID );
    }
}

function updateLikes()
{
    var shaderLike = document.getElementById("shaderLike");
    if( shaderLike!==null )
    {
        if( gIsLiked==1 )
        {
            shaderLike.src = "/img/themes/" + gThemeName + "/likeYes.png";
        }
        else
        {
            shaderLike.src = "/img/themes/" + gThemeName + "/likeNo.png";
        }
    }

    var shaderStatsViewed  = document.getElementById( "shaderStatsViewed" );   if( shaderStatsViewed  )   shaderStatsViewed.innerHTML = "" + gRes.mViewed;
    var shaderStatsLikes   = document.getElementById( "shaderStatsLikes" );    if( shaderStatsLikes  )    shaderStatsLikes.innerHTML = "" + gRes.mLikes;
    var shaderStatsPrivacy = document.getElementById( "shaderStatsPrivacy" );  
    if( shaderStatsPrivacy ) 
    {
        if (gRes.mPublished == 2) 
        {
            shaderStatsPrivacy.innerHTML = ", Unlisted";
        }
    }
} 

function updatepage( jsn )
{
    var txt = "";
    var numComments = jsn.text ? jsn.text.length : 0;
    var shaderStatsComments = document.getElementById( "shaderStatsComments" ); if( shaderStatsComments  ) shaderStatsComments.innerHTML = "" + numComments;

    for( var i=0; i<numComments; i++ )
    {
    	var timeVar = "-";
        if( jsn.date[i] != 0 )
        {
	        timeVar = piGetTime(jsn.date[i]);
        }
        
        if( jsn.username[i]===gUserName )
        {
            txt += "<div class=\"commentSelf\">";
        }
        else 
        {
            txt += "<div class=\"comment\">";
        }
        txt +=   "<div><img class=\"userPictureSmall\" src=\"" + jsn.userpicture[i] + "\"></img></div>";
        txt +=   "<div class=\"commentContent\"><a class='user' href='/user/"+ htmlEntities(jsn.username[i]) +"'>" + htmlEntities(jsn.username[i]) + "</a>, " + timeVar + "<br>";
        if( jsn.hidden[i]==1) txt += "<i>";
        txt +=  bbc2html(htmlEntities(jsn.text[i]),true);
        if( jsn.hidden[i]==1) txt += "</i>";
        txt +=   "</div>";
        if( gIsMyShader )
        txt +=   "<div class='uiDivBUtton' title='" + ((jsn.hidden[i]==1)?"Unhide this comment":"Hide this comment from all users. You can always unhide it again at a later time.") + "' onclick='hideComment(\"" + jsn.id[i] + "\"," + ((jsn.hidden[i]==1)?"0":"1") + ");'>" + ((jsn.hidden[i]==1)?"unhide":"x") + "</div>";

        txt += "</div>";
    }

    var cc = document.getElementById("myComments");      if( cc ) cc.innerHTML = txt;
    var dd = document.getElementById("commentTextArea"); if( dd ) dd.value = "";
}

function hideComment(commentid, hidden)
{
	var xmlHttp = new XMLHttpRequest();
    if( xmlHttp===null ) return;
    var url = "s=" + gShaderID + "&c=" + commentid + "&hide=" + hidden;

    xmlHttp.open('POST', "/comment", true);
    xmlHttp.responseType = "json";
    xmlHttp.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xmlHttp.timeout = 15000; // 15 seconds
    xmlHttp.ontimeout = function()
    {
        var ve = document.getElementById("centerScreen" );
        doAlert( piGetCoords(ve), {mX:320,mY:-1}, "Error", "We are sorry, we couldn't (un)hide the comment", false, null );
        // reenable comment input elements
        form.mybutton.disabled = false;
        form.comment.disabled = false;
    }

    xmlHttp.onload = function()
    {
        var jsn = xmlHttp.response;
        if( jsn.hide && jsn.hide!=0 )
        {
            updatepage( jsn );
        }
        else
        {
            var ve = document.getElementById("centerScreen" );
            doAlert( piGetCoords(ve), {mX:320,mY:-1}, "Error", "We are sorry, we couldn't (un)hide the comment", false, null );
        }
        //form.mybutton.disabled = false;
        //form.comment.disabled = false;
    }

    xmlHttp.onerror = function()
    {
        var ve = document.getElementById("centerScreen" );
        doAlert( piGetCoords(ve), {mX:320,mY:-1}, "Error", "We are sorry, we couldn't submit your comment", false, null );
        //form.mybutton.disabled = false;
        //form.comment.disabled = false;
    }
    xmlHttp.send(url);
}

function addComment(usr, form)
{
	var xmlHttp = new XMLHttpRequest();
    if( xmlHttp===null ) return;

    // disable comment input elements while we process the comment submision
    form.mybutton.disabled = true;
    form.comment.disabled = true;

    // encode comments
    var commentsformated = form.comment.value;
    commentsformated = encodeURIComponent( commentsformated );

    var url = "s=" + usr +"&comment=" + commentsformated;
    xmlHttp.open('POST', "/comment", true);
    xmlHttp.responseType = "json";
    xmlHttp.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xmlHttp.timeout = 60000; // 60 seconds
    xmlHttp.ontimeout = function()
    {
        var ve = document.getElementById("centerScreen" );
        doAlert( piGetCoords(ve), {mX:320,mY:-1}, "Error", "We are sorry, we couldn't submit your comment", false, null );
        // reenable comment input elements
        form.mybutton.disabled = false;
        form.comment.disabled = false;
    }

    xmlHttp.onload = function()
    {
        var jsn = xmlHttp.response;
        if( jsn.added && jsn.added>0 )
        {
            updatepage( jsn );
        }
        else
        {
            var ve = document.getElementById("centerScreen" );

            if (jsn.added && jsn.added == -1) {
                doAlert( piGetCoords(ve), {mX:320,mY:-1}, "Account verification required", "The comment could not be shared. Your account is not verified, please go to your Shadertoy profile for instructions.", false, null );
            } else if (jsn.added && jsn.added == -3) {
                doAlert( piGetCoords(ve), {mX:400,mY:-1}, "Reached maximum of daily comments", "The comment could not be shared. You have reached the maximum daily comments allowed with your current status. If you want to keep improving your status, participate more actively in the Shadertoy community. Please go to your Shadertoy profile for more details.", false, null );
            } else {
                doAlert( piGetCoords(ve), {mX:320,mY:-1}, "Error", "We are sorry, we couldn't submit your comment", false, null );                
            }
        }
        // reenable comment input elements
        form.mybutton.disabled = false;
        form.comment.disabled = false;
    }

    xmlHttp.onerror = function()
    {
        var ve = document.getElementById("centerScreen" );
        doAlert( piGetCoords(ve), {mX:320,mY:-1}, "Error", "We are sorry, we couldn't submit your comment", false, null );
        // reenable comment input elements
        form.mybutton.disabled = false;
        form.comment.disabled = false;
    }
    xmlHttp.send(url);
}

function checkFormComment(str)
{
    if( str == "" )
    {
        var ve = document.getElementById("centerScreen" );
        doAlert( piGetCoords(ve), {mX:320,mY:-1}, "Error", "You need to write at least 1 character", false, null );
        return false;
    }
    return true;
}

function validateComment( form )
{
   if(checkFormComment( form.comment.value ))
   {
        addComment(gShaderID, form);
        return true;
   }
   form.comment.focus();
   return false;
}

function shaderSaved( res, savedID, isUpdate, dataJSON )
{
    const ve = document.getElementById("centerScreen" );
    if( res===0 )
    {
        gShaderToy.SetNeedSave( false );
        if( isUpdate )
        {
            var eleWrapper = document.getElementById('editor');
            eleWrapper.classList.add("saved");
            setTimeout( function () { eleWrapper.classList.remove("saved"); }, 500 );
        }
        else
        {
            window.location="/view/" + savedID;
        }
	}
    else if( res===-2 ) { doAlert( piGetCoords(ve), {mX:400,mY:-1}, "Error", "Shader name \"" +  dataJSON.info.name + "\" is already used by another shader. Please change the name of your shader.", false, null ); }
    else if( res===-3 ) { doAlert( piGetCoords(ve), {mX:400,mY:-1}, "Error", "The shader could not be " + (isUpdate?"updated":"added") + ", you might not be logged in anymore, please Sign In again.", false, null); }
    else if( res===-13) { doAlert( piGetCoords(ve), {mX:400,mY:-1}, "Error", "The shader coubld not be saved, it is using private assets.", false, null); }
    else if( res===-15) { doAlert( piGetCoords(ve), {mX:400,mY:-1}, "Account verification required", "The shader could not be published. Your account is not verified, please go to your Shadertoy profile for instructions.", false, null ); }
    else if( res===-16) { doAlert( piGetCoords(ve), {mX:400,mY:-1}, "Reached maximum of daily shaders", "The shader could not be published. You have reached the maximum daily shaders allowed with your current status. If you want to keep improving your status, participate more actively in the Shadertoy community. Please go to your Shadertoy profile for more details.", false, null ); }
    else                { doAlert( piGetCoords(ve), {mX:400,mY:-1}, "Error", "The shader could not be " + (isUpdate?"updated":"added") + ", please try again. Error code : " + res, false, null); }
}

function openSubmitShaderForm( isUpdate )
{
    if (gShaderToy.mState !== 1) return;

    var ve = document.getElementById("centerScreen" );
    var s1 = document.getElementById('shaderTitle');
    var s2 = document.getElementById('shaderTags');
    var s3 = document.getElementById('shaderDescription');

    if( !s1.validity.valid ) { doAlert( piGetCoords(ve), {mX:320,mY:-1}, "Error", "You must give a name to your shader", false, null ); return; }
    if( !s2.validity.valid ) { doAlert( piGetCoords(ve), {mX:320,mY:-1}, "Error", "You must assign at least one tag to your shader", false, null ); return; }
    if( !s3.validity.valid ) { doAlert( piGetCoords(ve), {mX:320,mY:-1}, "Error", "You must give a description to your shader", false, null ); return; }
    if( !checkFormComment(s1.value) ) return false;
    if( !checkFormComment(s3.value) ) return false;
    if (!gShaderToy.CheckShaderCorrectness()) { doAlert(piGetCoords(ve), { mX: 400, mY: -1 }, "Error", "The shader can not be saved. Too many Image passes.", false, null); return; }

    gShaderToy.setActionsState(false);

    var sp = document.getElementById('published');
    const publishedStatus = sp.options[ sp.selectedIndex ].value;
    if( publishedStatus===1 || publishedStatus===3 )
    {
        gShaderToy.SetShaderFromEditor(true,false)
        if (!gShaderToy.AllowPublishing() )
        {
            let ve = document.getElementById("centerScreen" );
            doAlert( piGetCoords(ve), {mX:400,mY:-1}, "Error", "The shader can not be published. It does not compile.", false, null );
            gShaderToy.setActionsState(true);
            gShaderToy.mState = 1;
            return false;
        }

        let compileTime = gShaderToy.GetTotalCompilationTime();
        if (compileTime > kMaxCompileTime)
        {
            let ve = document.getElementById("centerScreen");
            doAlert(piGetCoords(ve), { mX: 400, mY: -1 }, "Warning", "This shader takes too long to compile. Shadertoy might disable real-time rendering when browsing.", false, null);
        }
    }

    var dataJSON = gShaderToy.Save();

    dataJSON.info.name        = s1.value;
    dataJSON.info.tags        = s2.value.split( "," );
    dataJSON.info.description = s3.value;
    dataJSON.info.published   = publishedStatus;

    // short wait to make sure the rendering is done
    // before reading the buffer from the gpu
    setTimeout(() => {
        // screenshot
        var canvas = document.getElementById("demogl");
        var dataURL = canvas.toDataURL("image/jpeg");

        var dataTXT = JSON.stringify( dataJSON, null );
        dataTXT = encodeURIComponent( dataTXT );

        // send
        var mHttpReq = new XMLHttpRequest();
        mHttpReq.open( "POST", "/shadertoy", true );
        mHttpReq.responseType = "json";
        mHttpReq.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

        var url = "a="; if( isUpdate ) url = "u=";
        url += dataTXT;
        
        if (dataJSON.flags.mFlagWebcam === false) { url += "&ss=" + dataURL; }

        mHttpReq.ontimeout = function (e)
        {
            console.log("TIMEOUT");
        };

        mHttpReq.onerror = function()
        {
            gShaderToy.setActionsState(true);
            gShaderToy.mState = 1;
            shaderSaved(-3, "NOID", isUpdate, dataJSON);
        }
        mHttpReq.onload = function()
        {
            gShaderToy.setActionsState(true);
            gShaderToy.mState = 1;
            try 
            {
                let jsn = mHttpReq.response;
                shaderSaved( jsn.result, jsn.id, isUpdate, dataJSON );
            } 
            catch(e) 
            {
                shaderSaved( -3, "NOID", isUpdate, dataJSON );
            }
        }
        mHttpReq.send( url );
    }, 100);
}

function doFork()
{
    var dataJSON = gShaderToy.Save();

    let eleButton = document.getElementById("myForkButton");
    if (eleButton.disabled) return; // prevent double save

    eleButton.disabled = true;

    let ve = document.getElementById("centerScreen");
    doAlert(piGetCoords(ve), { mX: 256, mY: 180 }, "Please Wait", "Forking Shader...", null);

    // short wait to make sure the rendering is done
    // before reading the buffer from the gpu
    setTimeout(() => {
        var dataTXT = JSON.stringify( dataJSON, null );
        dataTXT = encodeURIComponent( dataTXT );

        // Submit the values to the cloud
        var mHttpReq = new XMLHttpRequest();
        mHttpReq.open( "POST", "/shadertoy", true );
        mHttpReq.responseType = "json";
        mHttpReq.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

        var url = "f=" + dataTXT;

        mHttpReq.onerror = function()
        {
            shaderSaved(-3, "NOID", false, dataJSON);
            eleButton.disabled = false;
        }
        mHttpReq.onload = function()
        {
            eleButton.disabled = false;
            try 
            {
                var jsn = mHttpReq.response;
                shaderSaved( jsn.result, jsn.id, false, dataJSON );
            } 
            catch(e) 
            {
                shaderSaved( -3, "NOID", false, dataJSON );
            }
        }
        mHttpReq.send( url );
    }, 200);
}

//==================================================================
