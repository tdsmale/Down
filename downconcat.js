/*
 * @todo Point of collision
 * @todo Raycasting to prevent collision overshooting
 * @todo Touch Input
 * @todo Weight
 * @todo Force transfer
 * @todo Torque
 * @todo Friction
 * @todo Particle emitters
 * 
 * @todo WebGL / Shader Support
 * @todo 3D? :O
 */

var requestAnimFrame = (function() {
	return window.requestAnimationFrame ||
		window.webkitRequestAnimationFrame ||
		window.mozRequestAnimationFrame ||
		window.oRequestAnimationFrame ||
		window.msRequestAnimationFrame ||
		function(callback) {
			window.setTimeout(callback, 1000/60);
		};
})();

var Down = {
	srcRoot: 'down/',
	debug: false,
	pixel2meter: 1,
	
	context: null,
	canvas: null,
	allowWebGL: false,
	allowContextMenu: true,
	
	lastTime: 0,
	currentTime: 0,
	interval: 0,
	elapsedTime: 0,
	
	worlds: [],
	currentWorld: null,
	worldNames: {},
	
	keysPressed: [],
	prevKeys: [],
	mouse: null,
	prevMouse: null,
	mouseButtons: [],
	prevMouseButtons: [],
	
	ontouchstart: function(e) {
		
	},
	
	ontouchend: function(e) {
		
	},
	
	ontouchmove: function(e) {
		
	},
	
	ontouchcancel: function(e) {
		
	},
	
	onkeydown: function(e) {
		Down.keysPressed[e.keyCode] = true;
	},
	
	onkeyup: function(e) {
		Down.keysPressed[e.keyCode] = false;
	},
	
	onmousemove: function(e) {
		if(e.srcElement == undefined) {
			return;
		}
		
		if(e.srcElement.id != Down.canvas.id) {
			return;
		}
		
		Down.mouse.x = e.clientX - e.srcElement.offsetLeft;
		Down.mouse.y = e.clientY - e.srcElement.offsetTop;
	},
	
	onmousedown: function(e) {
		Down.mouseButtons[e.button] = true;
	},
	
	onmouseup: function(e) {
		Down.mouseButtons[e.button] = false;
	},
	
	oncontextmenu: function(e) {
		return Down.allowContextMenu;
	}
};

Down.Factory = {
	rectangleActor: function(x, y, sx, sy, name) {
		var actor = new Down.Actor(name);
		actor.shape.setPosition(x, y);
		actor.shape.setSize(sx, sy);
		actor.shape.setOrigin(sx / 2, sy / 2);
		return actor;
	},
	
	circleActor: function(x, y, radius, name) {
		var actor = new Down.Actor(name);
		actor.shape = new Down.Circle();
		actor.shape.setPosition(x, y);
		actor.shape.setRadius(radius);
		return actor;
	},
	
	triangleActor: function(x, y, width, name) {
		var actor = new Down.Actor(name);
		actor.shape = new Down.Polygon();
		actor.shape.addVertex(new Down.Vector2(x, y - width));
		actor.shape.addVertex(new Down.Vector2(x - width, y + width));
		actor.shape.addVertex(new Down.Vector2(x + width, y + width));
		return actor;
	}
};

Down.Resource = {
	numToLoad: 0,
	numLoaded: 0,
	
	images: [],
	imageKeys: {},
	sounds: [],
	soundKeys: {},
	data: [],
	dataKeys: {},
	
	loadMultiples: function(srcs, callback, loader) {
		
		var toLoad = srcs.length;
		var numLoaded = 0;
		var loaded = {};
		
		var counter = function(src, data) {
			numLoaded++;
			loaded[src] = data;
			if(numLoaded == toLoad) {
				callback(loaded);
			}
		};
		
		for(var i = 0; i < srcs.length; i++) {
			loader(srcs[i], counter);
		}
	},
	
	loadImages: function(srcs, callback) {
		Down.Resource.loadMultiples(srcs, callback, Down.Resource.loadImage);
	},
	
	loadImage: function(src, callback) {
		Down.log('loading external image "' + src + '"');
		
		if(Down.Resource.imageKeys[src] != undefined) {
			Down.log('returning existing image "' + src + '" ');
			var image = Down.Resource.images[Down.Resource.imageKeys[src]];
			if(callback) {
				callback(src, image);
			}
			return image;
		}
		
		var image = new Image();
		image.addEventListener('load', function() {
			Down.Resource.numToLoad--;
			Down.Resource.numLoaded++;
			if(callback) {
				callback(src, image);
			}
			Down.log('external image "' + src + '" loaded');
		}, false);
		Down.Resource.numToLoad++;
		image.src = src;
		
		Down.Resource.imageKeys[src] = Down.Resource.images.push(image) - 1;
		
		return image;
	},
	
	loadSounds: function(srcs, callback) {
		Down.Resource.loadMultiples(srcs, callback, Down.Resource.loadSound);
	},
	
	loadSound: function(src, callback) {
		Down.log('loading external sound "' + src + '"');
		
		if(Down.Resource.soundKeys[src] != undefined) {
			Down.log('returning existing sound "' + src + '" ');
			var sound = Down.Resource.sounds[Down.Resource.soundKeys[src]];
			if(callback) {
				callback(src, sound);
			}
			return sound;
		}
		
		var sound = new Audio();
		sound.addEventListener('canplaythrough', function() { 
			Down.Resource.numToLoad--;
			Down.Resource.numLoaded++;
			if(callback) {
				callback(src, sound);
			}
			Down.log('external sound "' + src + '" loaded');
		}, false);
		Down.Resource.numToLoad++;
		sound.src = src;
		
		Down.Resource.soundKeys[src] = Down.Resource.sounds.push(sound) - 1;
		return sound;
	},
	
	playSound: function(src) {
		if(Down.Resource.soundKeys[src] == undefined) {
			Down.Resource.loadSound(src, function(sound) {
				sound.play();
			});
			
		} else {
			Down.Resource.sounds[Down.Resource.soundKeys[src]].play();
		}
	},
	
	stopSound: function(src) {
		if(Down.Resource.soundKeys[src] == undefined) {
			return;
		}
		
		Down.Resource.sounds[Down.Resource.soundKeys[src]].stop();
	},
	
	loadScripts: function(srcs, callback) {
		Down.Resource.loadMultiples(srcs, callback, Down.Resource.loadScript);
	},
	
	loadScript: function(src, callback) {
		
		// local development - ajax won't work on a local machine
		
		if(/(file|http).*/.test(document.URL)) {
			var script = document.createElement("script");
			script.type = "text/javascript";
			document.getElementsByTagName('head').item(0).appendChild(script);
			script.async = true;
			script.src = src;
			script.onload = function() {callback(src, script.innerHTML);};
			return;
		}
		
		return Down.Resource.loadURL(src, function(name, data) {
			var script = document.createElement("script");
			script.type = "text/javascript";
			script.innerHTML = data;
			document.getElementsByTagName('head').item(0).appendChild(script);
			callback(name, data);
		});
	},
	
	loadURLs: function(srcs, callback) {
		Down.Resource.loadMultiples(srcs, callback, Down.Resource.loadURL);
	},
	
	loadURL: function(src, callback) {
		Down.log('loading external data "' + src + "'");
		
		if(Down.Resource.dataKeys[src] != undefined) {
			Down.log('returning existing data "' + src + '"');
			var data = Down.Resource.data[Down.Resource.dataKeys[src]];
			if(callback) {
				callback(src, data);
			}
			return data;
		}
		
		var request = new XMLHttpRequest;
		request.open("GET", src, true);
		request.addEventListener('readystatechange', function() {	
			if (request.readyState == 4) {
				var data = request.responseText;
				
				Down.Resource.numToLoad--;
				Down.Resource.numLoaded++;	
				Down.Resource.dataKeys[src] = Down.Resource.data.push(data) - 1;
				callback(src, data);
				Down.log('external data "' + src + '" loaded');
			}
			
		}, false);
		Down.Resource.numToLoad++;
		request.send();
	}
};

Down.Keys = {
	NUMBER_0: 48,
	NUMBER_1: 49,
	NUMBER_2: 50,
	NUMBER_3: 51,
	NUMBER_4: 52,
	NUMBER_5: 53,
	NUMBER_6: 54,
	NUMBER_7: 55,
	NUMBER_8: 56,
	NUMBER_9: 57,
	MOUSE_1: 0,
	MOUSE_2: 1,
	MOUSE_3: 2,
	LEFT: 37,
	UP: 38,
	RIGHT: 39,
	DOWN: 40,
	SPACE: 32,
	W: 87,
	A: 65,
	S: 83,
	D: 68
};

Down.start = function(canvas_id, callback) {
	Down.log('start');
	Down.currentTime = new Date().getTime();
		/*
	var boot = [
		Down.srcRoot + 'game.Down.js', 
		Down.srcRoot + 'geometry.Down.js', 
		Down.srcRoot + 'render.Down.js'];
	
	Down.Resource.loadScripts(boot, function() {*/
		Down.canvas = document.getElementById(canvas_id);
		if(!Down.canvas) {
			Down.log("Cannot retrieve canvas with id '" + canvas_id + "'");
			return;
		}

		Down.WebGL.active = false;

		if(Down.allowWebGL) {
			Down.context = Down.canvas.getContext('webgl') || Down.canvas.getContext('experimental-webgl');
		if(!Down.context) {
			Down.log("Cannot retrieve webgl context, reverting to 2d");

			Down.context = Down.canvas.getContext('2d');
			if(!Down.context) {
				Down.log("Could not get 2D context from canvas '" + canvas_id + "'");
				return;
			}

		} else {
			
			function throwOnGLError(err, funcName, args) {
				throw WebGLDebugUtils.glEnumToString(err) + " was caused by call to: " + funcName;
			};
			
			function logGLCall(functionName, args) {   
				//console.log("gl." + functionName + "(" + 
				//WebGLDebugUtils.glFunctionArgsToString(functionName, args) + ")");   
			} 
			
			function logAndValidate(functionName, args) {
				logGLCall(functionName, args);
				validateNoneOfTheArgsAreUndefined (functionName, args);
			}
			
			function validateNoneOfTheArgsAreUndefined(functionName, args) {
			  for (var ii = 0; ii < args.length; ++ii) {
				if (args[ii] === undefined) {
				  console.error("undefined passed to gl." + functionName + "(" +
								 WebGLDebugUtils.glFunctionArgsToString(functionName, args) + ")");
				}
			  }
			} 
			
			//Down.context = WebGLDebugUtils.makeDebugContext(Down.context, throwOnGLError, logAndValidate);
			Down.log("Using WebGL context");
			Down.WebGL.enable();
			Down.WebGL.active = true;
		}

		} else {
			Down.context = Down.canvas.getContext('2d');
			if(!Down.context) {
				Down.log("Could not get 2D context from canvas '" + canvas_id + "'");
				return;
			}
		}

		Down.mouse = new Down.Vector2();
		Down.prevMouse = new Down.Vector2();

		document.addEventListener('keyup', Down.onkeyup, false);
		document.addEventListener('keydown', Down.onkeydown, false);
		document.addEventListener('mousemove', Down.onmousemove, false);
		document.addEventListener('mouseup', Down.onmouseup, false);
		document.addEventListener('mousedown', Down.onmousedown, false);
		document.oncontextmenu = Down.oncontextmenu;

		callback();

		var world = Down.getCurrentWorld();

		if(!world.camera.size.x && !world.camera.size.y) {
			world.camera.size.x = Down.canvas.width;
			world.camera.size.y = Down.canvas.height;
		}

		Down.update();
	/*});*/
};

Down.log = function(msg) {
	if(Down.debug) {
		console.log('Down: ' + new Date() + ' ' + msg);
	}
};

Down.update = function() {
	Down.lastTime = Down.currentTime;
	Down.currentTime = new Date().getTime();
	Down.interval = Down.currentTime - Down.lastTime;
	Down.elapsedTime += Down.interval;
	
	var currentWorld = Down.getCurrentWorld();
	var i, j, k, actor, actor2;	
		
	var keys = Down.keysPressed.slice(0);
	var mouse = new Down.Vector2(Down.mouse.x, Down.mouse.y);
	var mouseButtons = Down.mouseButtons.slice(0);
	
	Down.clearCanvas();

	// keys
	for(i = 0; i < keys.length; i++) {	
				
		var callbacks = [];
		
		if(keys[i] == true) {
			
			if(!Down.prevKeys[i]) {
				//onkeydown
				if(currentWorld.onKeyDown[i] != undefined) {
					callbacks = callbacks.concat(currentWorld.onKeyDown[i]);
				}
				
			} else {
				//onkeypress
				if(currentWorld.onKeyPress[i] != undefined) {
					callbacks = callbacks.concat(currentWorld.onKeyPress[i]);
				}
			}	
			
		} else if(Down.prevKeys[i] == true) {
			//onkeyup
			if(currentWorld.onKeyUp[i] != undefined) {
				callbacks = callbacks.concat(currentWorld.onKeyUp[i]);
			}
		}
		
		if(callbacks != null) {
			for(j = 0; j < callbacks.length; j++) {
				if(callbacks[j]) {
					callbacks[j]();
				}
			}
		}
	}
	
	// mouse
	for(i = 0; i < mouseButtons.length; i++) {
		
		callbacks = [];
		
		if(mouseButtons[i] == true) {
			if(!Down.prevMouseButtons[i]) {
				//onmousedown
				if(currentWorld.onMouseDown[i] != undefined) {
					callbacks = callbacks.concat(currentWorld.onMouseDown[i]);
				}
				
			} else {
				//onmousepress
				if(currentWorld.onMousePress[i] != undefined) {
					callbacks = callbacks.concat(currentWorld.onMousePress[i]);
				}
			}	
			
		} else if(Down.prevMouseButtons[i] == true) {
			//onmouseup
			if(currentWorld.onMouseUp[i] != undefined) {
				callbacks = callbacks.concat(currentWorld.onMouseUp[i]);
			}
		}
		
		if(callbacks != null) {
			for(j = 0; j < callbacks.length; j++) {
				if(callbacks[j]) {
					callbacks[j]();
				}
			}
		}
	}
	
	// mouse move
	if(mouse.x != Down.prevMouse.x || mouse.y != Down.prevMouse.y) {
		for(i = 0; i < currentWorld.onMouseMove.length; i++) {
			if(currentWorld.onMouseMove[i]) {
				currentWorld.onMouseMove[i](mouse);
			}
		}
	}
	
	// ontick
	for(i = 0; i < currentWorld.onTick.length; i++) {
		if(currentWorld.onTick[i]) {
			currentWorld.onTick[i]();
		}
	}
	
	var actors = currentWorld.actors.slice(0);
	actors.sort(function(a, b) {
		if(!a && !b) {
			return false;
		}

		if(!a) {
			return -1;
		}

		if(!b) {
			return 1;
		}

		return (a.zIndex - b.zIndex);
	});
	
	for(i = 0; i < actors.length; i++) {
		actor = actors[i];
		
		if(!actor) {
			continue;
		}
		
		actor.velocity.x += actor.force.x;
		actor.velocity.y += actor.force.y;
		actor.torque += actor.impulse;
		
		if(actor.velocity.x != 0 || actor.velocity.y != 0) {
			actor.atRest = false;
		}
		
		if(!actor.immovable && !actor.atRest) {
			actor.velocity.x += currentWorld.gravity.x;
			actor.velocity.y += currentWorld.gravity.y;
		}
		
		actor.shape.move((actor.velocity.x * (Down.interval / 1000)) * Down.pixel2meter, (actor.velocity.y * (Down.interval / 1000)) * Down.pixel2meter);
		actor.shape.rotate(actor.torque);
		
		if(actor.noClip) {
			continue;
		}
		
		var collidingWithAnything = false;
		
		for(j = 0; j < actors.length; j++) {

			if(i == j) {
				continue;
			}

			actor2 = actors[j];

			if(!actor2) {
				continue;
			}

			if(actor2.noClip) {
				continue;
			}
			
			if(!actor.shape.aabb.collideRectangle(actor2.shape.aabb)) {
				continue;
			}

			var collision = false;

			// collision
			if(actor2.shape instanceof Down.Circle) {
				collision = actor.shape.collideCircle(actor2.shape);

			} else if(actor2.shape instanceof Down.Rectangle) {
				collision = actor.shape.collideRectangle(actor2.shape);

			} else if(actor2.shape instanceof Down.Polygon) {
				collision = actor.shape.collidePolygon(actor2.shape);
			}

			if(collision) {
				
				if(!actor.immovable && !actor.ghost && !actor2.ghost) {
					
					if(actor2.shape instanceof Down.Circle) {
						collision = actor.shape.resolveCollisionCircle(actor2.shape, collision);

					} else if(actor2.shape instanceof Down.Rectangle) {
						collision = actor.shape.resolveCollisionRectangle(actor2.shape, collision);

					} else if(actor2.shape instanceof Down.Polygon) {
						collision = actor.shape.resolveCollisionPolygon(actor2.shape, collision);
					}
					
					collidingWithAnything = true;
					if(collision instanceof Down.Vector2) {
						actor.shape.move(-collision.x, -collision.y);

						if(collision.x > 0 && currentWorld.gravity.x > 0) {
							//actor.velocity.x = -actor.velocity.x * actor.bounce.x;
							actor.velocity.x = 0;
							if(Math.abs(actor.velocity.x) <= 0.1) {
								actor.velocity.x = 0;
							}

						} else if(collision.x < 0 && currentWorld.gravity.x < 0) {
							//actor.velocity.x = -actor.velocity.x * actor.bounce.x;
							actor.velocity.x = 0;
							if(Math.abs(actor.velocity.x) <= 0.1) {
								actor.velocity.x = 0;
							}
						}

						if(collision.y > 0 && currentWorld.gravity.y > 0) {
							//actor.velocity.y = -actor.velocity.y * actor.bounce.y;
							actor.velocity.y = 0;
							if(Math.abs(actor.velocity.y) <= 0.1) {
								actor.velocity.y = 0;
							}

						} else if(collision.y < 0 && currentWorld.gravity.y < 0) {
							//actor.velocity.y = -actor.velocity.y * actor.bounce.y;
							actor.velocity.y = 0;
							if(Math.abs(actor.velocity.y) <= 0.1) {
								actor.velocity.y = 0;
							}	
						}
					}
				}

				if(!actor.isCollidingWith[actor2.name]) {
					actor.isCollidingWith[actor2.name] = true;

					for(k = 0; k < actor.onCollisionEnter.length; k++) {
						actor.onCollisionEnter[k](actor2, collision);
					}
				}

				if(!actor2.isCollidingWith[actor.name]) {
					actor2.isCollidingWith[actor.name] = true;

					for(k = 0; k < actor2.onCollisionEnter.length; k++) {
						actor2.onCollisionEnter[k](actor, collision);
					}
				}

			} else {
				if(actor.isCollidingWith[actor2.name]) {
					actor.isCollidingWith[actor2.name] = false;

					for(k = 0; k < actor.onCollisionLeave.length; k++) {
						actor.onCollisionLeave[k](actor2, collision);
					}
				}

				if(actor2.isCollidingWith[actor.name]) {
					actor2.isCollidingWith[actor.name] = false;

					for(k = 0; k < actor2.onCollisionLeave.length; k++) {
						actor2.onCollisionLeave[k](actor, collision);
					}
				}
			} // end collision check with specific actor
		} // end actor collision loop
		
		actor.force.x = 0;
		actor.force.y = 0;
		actor.impulse = 0;
		
		if(currentWorld.actorsAtRest[actor.name] == undefined) {
			currentWorld.actorsAtRest[actor.name] = false;
		}
		
		if(actor.velocity.x == 0 && actor.velocity.y == 0) {
			
			var atRest = false;
			
			if(currentWorld.gravity.x != 0 || currentWorld.gravity.y != 0) {
				atRest = collidingWithAnything;
				
			} else {
				atRest = true;
			}
			
			if(atRest) {
				if(!currentWorld.actorsAtRest[actor.name]) {
					currentWorld.actorsAtRest[actor.name] = true;

				} else {
					actor.atRest = true;
				}
				
			} else {
				currentWorld.actorsAtRest[actor.name] = false;
				actor.atRest = false;
			}
			
		} else {
			currentWorld.actorsAtRest[actor.name] = false;
			actor.atRest = false;
		}
	}
		
	for(i = 0; i < actors.length; i++) {
		actor = actors[i];
		
		if(!actor) {
			continue;
		}
		
		if(!actor.draw) {
			continue;
		}
		
		if(!actor.shape.collideRectangle(currentWorld.camera)) {
			continue;
		}
		
		if(actor.sprite.image.src) {
			actor.sprite.updateAnimation();
			Down.drawSprite(currentWorld.camera, actor.sprite, actor.shape);
			
		} else {
			
			if(actor.shape instanceof Down.Circle) {
				Down.drawCircle(currentWorld.camera, actor.shape, actor.colour, actor.stroke);
				
			} else if(actor.shape instanceof Down.Rectangle) {
				Down.drawRectangle(currentWorld.camera, actor.shape, actor.colour, actor.stroke);
				
			} else if(actor.shape instanceof Down.Polygon) {	
				Down.drawPolygon(currentWorld.camera, actor.shape, actor.colour, actor.stroke);
			}
		}
	}

	Down.prevKeys = keys;
	Down.prevMouse = mouse;
	Down.prevMouseButtons = mouseButtons;
	
	
	
	// ontickafter
	for(i = 0; i < currentWorld.onTickAfter.length; i++) {
		if(currentWorld.onTickAfter[i]) {
			currentWorld.onTickAfter[i]();
		}
	}
	
	requestAnimFrame(Down.update);
};

Down.Actor = function(name) {
	this.shape = new Down.Rectangle();
	
	this.velocity = new Down.Vector2(0, 0);		// x & y movement, persists between ticks
	this.force = new Down.Vector2(0, 0);		// does not persist between ticks
	this.torque = 0;							// rotation, persists
	this.impulse = 0;							// does not persist
	this.atRest = false;
	
	this.draw = true;
	this.noClip = false;		// no collision detection performed
	this.ghost = false;			// collision detection performed, but not applied
	this.immovable = false;		// gravity ignored, collision detection performed, but not applied
	this.zIndex = 0;
	
	this.colour = '#fff';
	this.stroke = '#fff';
	this.sprite = new Down.Sprite();
	this.name = name;
	
	this.onCollisionEnter = [];
	this.onCollisionEnterNames = {};
	this.onCollisionLeave = [];
	this.onCollisionLeaveNames = {};
	this.isCollidingWith = {};
	this.onCollision = [];
	this.onCollisionNames = {};
};
Down.Actor.prototype = {
	move: function(x, y) {
		this.force.x += x;
		this.force.y += y;
	},
	
	rotate: function(rad) {
		this.impulse += rad;
	},
	
	addCollisionEnterEvent: function(callback, name) {
		var index = this.onCollisionEnter.push(callback) - 1;
		
		if(!name) {
			name = index;
			
		} else if(this.onCollisionEnterNames[name] != undefined) {
			throw "Collision Enter Event '" + name + "' already defined!";
		}
		
		this.onCollisionEnterNames[name] = index;
		Down.log("Added Collision Enter event '" + name + "' to actor '" + this.name + "' at index '" + index + "'");
		
		return index;
	},
	
	removeCollisionEnterEvent: function(key) {
		if(this.onCollisionEnterNames[key] == undefined) {
			throw "Collision Enter Event '" + key + "' undefined!";
		}
		
		var index = this.onCollisionEnterNames[key];
		this.onCollisionEnter[index] = null;
		Down.log("Removed Collision Enter event '" + key + "' from actor '" + this.name + "' at index '" + index + "'");
		
		return true;
	},
	
	addCollisionLeaveEvent: function(callback, name) {
		var index = this.onCollisionLeave.push(callback) - 1;
		
		if(!name) {
			name = index;
			
		} else if(this.onCollisionLeaveNames[name] != undefined) {
			throw "Collision Leave Event '" + name + "' already defined!";
		}
		
		this.onCollisionLeaveNames[name] = index;
		Down.log("Added Collision Leave event '" + name + "' for actor '" + this.name + "' at index '" + index + "'");
		
		return index;
	},
	
	removeCollisionLeaveEvent: function(key) {
		if(this.onCollisionLeaveNames[key] == undefined) {
			throw "Collision Leave Event '" + key + "' undefined!";
		}
		
		var index = this.onCollisionLeaveNames[key];
		this.onCollisionLeave[index] = null;
		Down.log("Removed Collision Leave event '" + key + "' from actor '" + this.name + "' at index '" + index + "'");
		
		return true;
	},
	
	addCollisionEvent: function(callback, name) {
		var index = this.onCollision.push(callback) - 1;
		
		if(!name) {
			name = index;
			
		} else if(this.onCollisionNames[name] != undefined) {
			throw "Collision Event '" + name + "' already defined!";
		}
		
		this.onCollisionNames[name] = index;
		Down.log("Added Collision event '" + name + "' for actor '" + this.name + "' at index '" + index + "'");
		
		return index;
	}
};

Down.World = function(name) {
	this.name = name;
	this.actors = [];
	this.actorNames = {};
	this.actorsAtRest = {};
	
	this.onKeyUp = [];
	this.onKeyUpNames = {};
	this.onKeyDown = [];
	this.onKeyDownNames = {};
	this.onKeyPress = [];
	this.onKeyPressNames = {};
	
	this.onMouseUp = [];
	this.onMouseUpNames = {};
	this.onMouseDown = [];
	this.onMouseDownNames = {};
	this.onMouseMove = [];
	this.onMouseMoveNames = {};
	this.onMousePress = [];
	this.onMousePressNames = {};
	
	this.onTick = [];
	this.onTickNames = {};
	this.onTickAfter = [];
	this.onTickAfterNames = {};
	
	this.camera = new Down.Rectangle();
	this.gravity = new Down.Vector2(0, 0);
};
Down.World.prototype = {
	addActor: function(actor) {
		
		if(actor.name != null && this.actorNames[actor.name] != undefined) {
			Down.log("Actor '" + actor.name + "' already defined in world '" + this.name + "'");
			return false;
		}

		var index = this.actors.push(actor) - 1;
		
		if(actor.name == null) {
			actor.name = index;
		}
		
		this.actorNames[actor.name] = index;
		Down.log("Added actor '" + actor.name + "' to world '" + this.name + "' at index '" + index + "'");
				
		return index;
	},
	
	removeActor: function(name) {
		if(this.actorNames[name] == undefined) {
			Down.log("Actor '" + name + "' does not exist in world '" + this.name + "'");
			return false;
		}
		
		var key = this.actorNames[name];
		this.actors[key] = null;
		delete this.actorNames[name];
		Down.log("Removed actor '" + name + "' from world '" + this.name + "' at index '" + key + "'")
		
		return true;
	},
	
	addKeyUpEvent: function(keyCode, callback, name) {
		if(this.onKeyUp[keyCode] == undefined) {
			this.onKeyUp[keyCode] = [];
		}
		
		if(this.onKeyUpNames[keyCode] == undefined) {
			this.onKeyUpNames[keyCode] = {};
		}
		
		if(name && this.onKeyUpNames[keyCode][name] != undefined) {
			Down.log("Key up event '" + name + "' already defined in world '" + this.name + "'");
			return false;
		}
		
		var index = this.onKeyUp[keyCode].push(callback) - 1;
		
		if(!name) {
			name = index;	
		}
		
		this.onKeyUpNames[keyCode][name] = index;
		Down.log("Added Key Up event '" + name + "' for key code '" + keyCode + "' to world '" + this.name + "' at index '" + index + "'");
		
		return index;
	},
	
	removeKeyUpEvent: function(keyCode, name) {
		if(this.onKeyUpNames[keyCode] == undefined || this.onKeyUpNames[keyCode][name] == undefined) {
			Down.log("Key up event '" + name + "' does not exist in world '" + this.name + "' for keyCode '" + keyCode + "'");
			return false;
		}
		
		var index = this.onKeyUpNames[keyCode][name];
		this.onKeyUp[keyCode][index] = null;
		delete this.onKeyUpNames[keyCode][name];
		Down.log("Removed Key Up event '" + name + "' for key code '" + keyCode + "' from world '" + this.name + "' at index '" + index + "'");
		
		return true;
	},

	addKeyDownEvent: function(keyCode, callback, name) {
		
		if(this.onKeyDown[keyCode] == undefined) {
			this.onKeyDown[keyCode] = [];
		}
		
		if(this.onKeyDownNames[keyCode] == undefined) {
			this.onKeyDownNames[keyCode] = {};
		}
		
		if(this.onKeyDownNames[keyCode][name] != undefined) {
			Down.log("Key down event '" + name + "' already defined in world '" + this.name + "'");
			return false;
		}
		
		var index = this.onKeyDown[keyCode].push(callback) - 1;
		
		if(!name) {
			name = index;	
		}
		
		this.onKeyDownNames[keyCode][name] = index;
		Down.log("Added Key Down event '" + name + "' for key code '" + keyCode + "' to world '" + this.name + "' at index '" + index + "'");
		
		return index;
	},
	
	removeKeyDownEvent: function(keyCode, name) {
		if(this.onKeyDownNames[keyCode] == undefined || this.onKeyDownNames[keyCode][name] == undefined) {
			Down.log("Key down event '" + name + "' does not exist in world '" + this.name + "' for keyCode '" + keyCode + "'");
			return false;
		}
		
		var index = this.onKeyDownNames[keyCode][name];
		this.onKeyDown[keyCode][index] = null;
		delete this.onKeyDownNames[keyCode][name];
		Down.log("Removed Key Down event '" + name + "' for key code '" + keyCode + "' from world '" + this.name + "' at index '" + index + "'");
		
		return true;
	},

	addKeyPressEvent: function(keyCode, callback, name) {
		if(this.onKeyPress[keyCode] == undefined) {
			this.onKeyPress[keyCode] = [];
		}
		
		if(this.onKeyPressNames[keyCode] == undefined) {
			this.onKeyPressNames[keyCode] = {};
		}
		
		 if(this.onKeyPressNames[keyCode][name] != undefined) {
			Down.log("Key press event '" + name + "' already defined in world '" + this.name + "'");
			return false;
		}
		
		var index = this.onKeyPress[keyCode].push(callback) - 1;
		
		if(!name) {
			name = index;	
		}
		
		this.onKeyPressNames[keyCode][name] = index;
		Down.log("Added Key Press event '" + name + "' for key code '" + keyCode + "' to world '" + this.name + "' at index '" + index + "'");
		
		return index;
	},
	
	removeKeyPressEvent: function(keyCode, name) {
		if(this.onKeyPressNames[keyCode] == undefined || this.onKeyPressNames[keyCode][name] == undefined) {
			Down.log("Key press event '" + name + "' does not exist in world '" + this.name + "' for keyCode '" + keyCode + "'");
			return false;
		}
		
		var index = this.onKeyPressNames[keyCode][name];
		this.onKeyPress[keyCode][index] = null;
		delete this.onKeyPressNames[keyCode][name];
		Down.log("Removed Key Press event '" + name + "' for key code '" + keyCode + "' from world '" + this.name + "' at index '" + index + "'");
		
		return true;
	},
	
	addTickEvent: function(callback, name) {
		if(name && this.onTickNames[name] != undefined) {
			Down.log("Tick event '" + name + "' already defined in world '" + this.name + "'");
			return false;
		}
		
		var index = this.onTick.push(callback) - 1;
		
		if(!name) {
			name = index;	
		}
		
		this.onTickNames[name] = index;
		Down.log("Added Tick event '" + name + "' to world '" + this.name + "' at index '" + index + "'");
		
		return index;
	},
	
	removeTickEvent: function(key) {
		if(this.onTickNames[key] == undefined) {
			Down.log("Tick event '" +  key + "' does not exist in world '" + this.name + "'");
			return false;
		}
		
		var index = this.onTickNames[key];
		this.onTick[index] = null;
		delete this.onTickNames[key];
		Down.log("Removed Tick event '" + key + "' from world '" + this.name + "' at index '" + index + "'");
		
		return true;
	},
	
	addTickAfterEvent: function(callback, name) {
		if(name && this.onTickAfterNames[name] != undefined) {
			Down.log("Tick After event '" + name + "' already defined in world '" + this.name + "'");
			return false;
		}
		
		var index = this.onTickAfter.push(callback) - 1;
		
		if(!name) {
			name = index;	
		}
		
		this.onTickAfterNames[name] = index;
		Down.log("Added Tick After event '" + name + "' to world '" + this.name + "' at index '" + index + "'");
		
		return index;
	},
	
	removeTickAfterEvent: function(key) {
		if(this.onTickAfterNames[key] == undefined) {
			Down.log("Tick After event '" +  key + "' does not exist in world '" + this.name + "'");
			return false;
		}
		
		var index = this.onTickAfterNames[key];
		this.onTickAfter[index] = null;
		delete this.onTickAfterNames[key];
		Down.log("Removed Tick After event '" + key + "' from world '" + this.name + "' at index '" + index + "'");
		
		return true;
	},
	
	addOnMouseUpEvent: function(keyCode, callback, name) {
		if(this.onMouseUpNames[keyCode] == undefined) {
			this.onMouseUpNames[keyCode] = {};
		}
		
		if(this.onMouseUp[keyCode] == undefined) {
			this.onMouseUp[keyCode] = [];
		}
		
		if(name && this.onMouseUpNames[keyCode][name] != undefined) {
			Down.log("Mouse up '" + name + "' already defined in world '" + this.name + "' for key code '" + keyCode + "'");
			return false;
		}
		
		var index = this.onMouseUp[keyCode].push(callback) - 1;
		
		if(!name) {
			name = index;	
		}
		
		this.onMouseUpNames[keyCode][name] = index;
		Down.log("Added Mouse up event '" + name + "' to world '" + this.name + "' at index '" + index + "' for keyCode '" + keyCode + "'");
		
		return index;
	},
	
	removeOnMouseUpEvent: function(keyCode, key) {		
		if(this.onMouseUpNames[keyCode] == undefined || this.onMouseUpNames[keyCode][key] == undefined) {
			Down.log("Mouse Up event '" +  key + "' does not exist in world '" + this.name + "'");
			return false;
		}
		
		var index = this.onMouseUpNames[keyCode][key];
		this.onMouseUp[keyCode][index] = null;
		delete this.onMouseUpNames[keyCode][key];
		Down.log("Removed Mouse Up event '" + key + "' from world '" + this.name + "' at index '" + index + "' for key code '" + keyCode + "'");
		
		return true;
	},
	
	addOnMouseDownEvent: function(keyCode, callback, name) {
		if(this.onMouseDownNames[keyCode] == undefined) {
			this.onMouseDownNames[keyCode] = {};
		}
		
		if(this.onMouseDown[keyCode] == undefined) {
			this.onMouseDown[keyCode] = [];
		}
		
		if(name && this.onMouseDownNames[name] != undefined) {
			Down.log("Mouse Down '" + name + "' already defined in world '" + this.name + "'");
			return false;
		}
		
		var index = this.onMouseDown[keyCode].push(callback) - 1;
		
		if(!name) {
			name = index;	
		}
		
		this.onMouseDownNames[keyCode][name] = index;
		Down.log("Added Mouse Down event '" + name + "' to world '" + this.name + "' at index '" + index + "' for key code '" + keyCode + "'");
		
		return index;
	},
	
	removeOnMouseDownEvent: function(keyCode, key) {
		if(this.onMouseDownNames[keyCode] == undefined || this.onMouseDownNames[keyCode][key] == undefined) {
			Down.log("Mouse Down event '" +  key + "' does not exist in world '" + this.name + "'");
			return false;
		}
		
		var index = this.onMouseDownNames[keyCode][key];
		this.onMouseDown[keyCode][index] = null;
		delete this.onMouseDownNames[keyCode][key];
		Down.log("Removed Mouse Down event '" + key + "' from world '" + this.name + "' at index '" + index + "' for key code '" + keyCode + "'");
		
		return true;
	},
	
	addOnMousePressEvent: function(keyCode, callback, name) {
		if(this.onMousePressNames[keyCode] == undefined) {
			this.onMousePressNames[keyCode] = {};
		}
		
		if(this.onMousePress[keyCode] == undefined) {
			this.onMousePress[keyCode] = [];
		}
		
		if(name && this.onMousePressNames[name] != undefined) {
			Down.log("Mouse Press '" + name + "' already defined in world '" + this.name + "'");
			return false;
		}
		
		var index = this.onMousePress[keyCode].push(callback) - 1;
		
		if(!name) {
			name = index;	
		}
		
		this.onMousePressNames[keyCode][name] = index;
		Down.log("Added Mouse Press event '" + name + "' to world '" + this.name + "' at index '" + index + "' for key code '" + keyCode + "'");
		
		return index;
	},
	
	removeOnMousePressEvent: function(keyCode, key) {
		if(this.onMousePressNames[keyCode] == undefined || this.onMousePressNames[keyCode][key] == undefined) {
			Down.log("Mouse Down event '" +  key + "' does not exist in world '" + this.name + "'");
			return false;
		}
		
		var index = this.onMousePressNames[keyCode][key];
		this.onMousePress[keyCode][index] = null;
		delete this.onMousePressNames[keyCode][key];
		Down.log("Removed Mouse Press event '" + key + "' from world '" + this.name + "' at index '" + index + "' for key code '" + keyCode + "'");
		
		return true;
	},
	
	addMouseMoveEvent: function(callback, name) {
		if(name && this.onMouseMoveNames[name] != undefined) {
			Down.log("MouseMove event '" + name + "' already defined in world '" + this.name + "'");
			return false;
		}
		
		var index = this.onMouseMove.push(callback) - 1;
		
		if(!name) {
			name = index;	
		}
		
		this.onMouseMoveNames[name] = index;
		Down.log("Added Mouse Move event '" + name + "' to world '" + this.name + "' at index '" + index + "'");
		
		return index;
	},
	
	removeMouseMoveEvent: function(key) {
		if(this.onMouseMoveNames[key] == undefined) {
			Down.log("Mouse Move event '" +  key + "' does not exist in world '" + this.name + "'");
			return false;
		}
		
		var index = this.onMouseMoveNames[key];
		this.onMouseMove[index] = null;
		delete this.onMouseMoveNames[key];
		Down.log("Removed Mouse Move event '" + key + "' from world '" + this.name + "' at index '" + index + "'");
		
		return true;
	}
};


Down.ParticleEmitter = function(name) {
	this.position = new Down.Vector2();
	this.rotation = 0;
	
	this.emissionAngle = 0;
	this.emissionRate = 0;
	this.emmisionLifetime = 0;
	
	this.particle = new Down.Sprite();
	this.particleLimit = 0;
	this.particleLifetime = 0;	
	
	this.particles = [];
};

Down.Particle = function(name) {
	this.timeLeft = 0;
	this.sprite = new Down.Sprite();
};

Down.addWorld = function(world) {
	
	if(world.name != null) {
		if(Down.worldNames[world.name] != undefined) {
			throw world.name + " already defined";
		}
	}
	
	var index = Down.worlds.push(world) - 1;
	Down.worldNames[world.name] = index;
	Down.log("Added world '" + world.name + "' to index '" + index + "'");
	
	if(world.name == null) {
		world.name = index;
	}
	
	if(!Down.currentWorld) {
		Down.currentWorld = index;
	}
	
	return index;
};

Down.removeWorld = function(name) {
	var index = Down.worldNames[name];
	Down.worlds[index] = null;
}

Down.createWorld = function(name) {
	var world = new Down.World(name);
	Down.addWorld(world);
	return world;
};

Down.setCurrentWorld = function(name) {
	
	var index = Down.worldNames[name];
	if(isNaN(index)) {
		throw "No world with name '" + name + "'";
	}
	
	var world = Down.worlds[index];
	
	if(!world.camera.size.x && !world.camera.size.y && Down.canvas) {
		world.camera.size.x = Down.canvas.width;
		world.camera.size.y = Down.canvas.height;
	}
	
	Down.currentWorld = index;
};

Down.getCurrentWorld = function() {
	var world = Down.worlds[Down.currentWorld];
	if(!world) {
		throw "No current world";
	}
	return Down.worlds[Down.currentWorld];
};
Down.Circle = function() {
	this.position = new Down.Vector2(0, 0);
	this.origin = new Down.Vector2(0, 0);
	this.radius = 0;
	this.rotation = 0;
	this.aabb = this.computeAABB();
};
Down.Circle.prototype = {
	setPosition: function(x, y) {
		this.position.x = x;
		this.position.y = y;
		this.aabb = this.computeAABB();
	},
	
	setRadius: function(radius) {
		this.radius = radius;
		this.aabb = this.computeAABB();
	},
	
	computeAABB: function() {
		var rect = new Down.Rectangle();
		rect.position.x = this.position.x - this.radius;
		rect.position.y = this.position.y - this.radius;
		rect.size.x = this.radius * 2;
		rect.size.y = this.radius * 2;
		rect.origin.x = this.origin.x;
		rect.origin.y = this.origin.y;

		return rect;
	},
	
	move: function(x, y) {
		this.position.x += x;
		this.position.y += y;
		this.aabb = this.computeAABB();
	},
	
	rotate: function(rad) {
		this.rotation += rad;
		this.aabb = this.computeAABB();
	},
	
	collideRectangle: function(rect) {
		return Down.Collide.rectCirc(rect, this);
	},
	
	collideCircle: function(circ) {
		return Down.Collide.circCirc(circ, this);
	},
	
	collideLine: function(line) {
		return Down.Collide.circLine(this, line);
	},
	
	collidePolygon: function(poly) {
		return Down.Collide.circPoly(this, poly);
	},
	
	resolveCollisionRectangle: function(rect) {
		
	},
	
	resolveCollisionPolygon: function(poly) {
		
	},
	
	resolveCollisionCircle: function(circ) {
		return Down.Collide.resolveCircCirc(this, circ);
	}
};

Down.Line = function(ax, ay, bx, by) {
	this.start = new Down.Vector2(ax, ay);
	this.finish = new Down.Vector2(bx, by);
	this.origin = new Down.Vector2(0, 0);
	this.width = 1;
};
Down.Line.prototype = {
	move: function(x, y) {
		this.start.x += x;
		this.start.y += y;
		this.finish.x += x;
		this.finish.y += y;
		this.origin.x += x;
		this.origin.y += y;
	},
	
	rotate: function(rad) {
		this.start.rotateAroundPoint(rad, this.origin.x, this.origin.y);
		this.finish.rotateAroundPoint(rad, this.origin.x, this.origin.y);
	},
	
	getMagnitudeVector: function() {
		return this.finish.subtractVector(this.start);
	},
	
	getNormalVector: function() {
		var magnitudeVector = this.getMagnitudeVector();
		var normalVector = new Down.Vector2(-magnitudeVector.y, magnitudeVector.x);
		return normalVector;
	},
	
	getSlope: function() {
		return (this.start.y - this.finish.y) / (this.start.x - this.finish.x);
	},
	
	collideRectangle: function(rect) {
		return Down.Collide.rectLine(rect, this);
	},
	
	collideCircle: function(circ) {
		return Down.Collide.circLine(circ, this);
	},
	
	collideLine: function(line) {
		return Down.Collide.lineLine(line, this);
	},
	
	collidePolygon: function(poly) {
		return Down.Collide.polyLine(poly, this);
	}
};

Down.Ray = function() {
	this.start = new Down.Vector2();
	this.magnitude = new Down.Vector2();
};
Down.Ray.prototype = {
	move: function(x, y) {
		this.start.x += x;
		this.start.y += y;
	},
	
	rotate: function(rad) {
		this.start.rotateAroundPoint(rad, this.magnitude.x, this.magnitude.y);
	}
};


Down.Vector2 = function(x, y) {
	this.x = x ? x : 0;
	this.y = y ? y : 0;
};
Down.Vector2.prototype = {
	subtractVector: function(vect) {
		return new Down.Vector2(this.x - vect.x, this.y - vect.y);
	},
	
	addVector: function(vect) {
		return new Down.Vector2(this.x + vect.x, this.y + vect.y);
	},
	
	rotateAroundPoint: function(rad, x, y) {
		var newX = this.x;
		var newY = this.y;
		newX = Math.cos(rad) * (this.x - x) - Math.sin(rad) * (this.y - y) + x;
		newY = Math.sin(rad) * (this.x - x) + Math.cos(rad) * (this.y - y) + y;
		this.x = newX;
		this.y = newY;
	},
	
	dot: function(vect) {
		return (this.x * vect.x) + (this.y * vect.y);
	},
	
	getLength: function() {
		return Math.sqrt((this.x * this.x) + (this.y * this.y));
	},
	
	getNormalisedVector: function() {
		var length = this.getLength();
		return new Down.Vector2(this.x / length, this.y / length);
	},
	
	projectPolygon: function(poly) {
		var vertices = poly.getVertices();

		var min = this.dot(vertices[0]);
		var max = min;

		for (var i = 1; i < vertices.length; i++) {

			var p = this.dot(vertices[i]);
			if (p < min) {
				min = p;

			} else if (p > max) {
				max = p;
			}
		}

		return {min: min, max: max};
	},
	
	projectCircle: function(circ) {
		var projection = this.dot(circ.position);
		return {min: projection - circ.radius, max: projection + circ.radius};
	}
};

Down.Polygon = function() {
	this.vertices = [];
	this.rotation = 0;
	this.origin = new Down.Vector2(0, 0);
	this.aabb = this.computeAABB();
};
Down.Polygon.prototype = {
	addVertex: function(vertex) {
		this.vertices.push(vertex);
		this.aabb = this.computeAABB();
	},
	
	computeAABB: function() {
		if(!this.vertices.length) {
			return new Down.Rectangle();
		}
		
		var smallestVertex = new Down.Vector2(this.vertices[0].x, this.vertices[0].y);
		var largestVertex = new Down.Vector2(this.vertices[0].x, this.vertices[0].y);
		
		for(var i = 1; i < this.vertices.length; i++) {
			if(this.vertices[i].x < smallestVertex.x) {
				smallestVertex.x = this.vertices[i].x;
			}
			
			if(this.vertices[i].y < smallestVertex.y) {
				smallestVertex.y = this.vertices[i].y;
			}
			
			if(this.vertices[i].x > largestVertex.x) {
				largestVertex.x = this.vertices[i].x;
			}
			
			if(this.vertices[i].y > largestVertex.y) {
				largestVertex.y = this.vertices[i].y;
			}
		}
		
		var rect = new Down.Rectangle();
		rect.position.x = smallestVertex.x;
		rect.position.y = smallestVertex.y;
		rect.size.x = largestVertex.x - smallestVertex.x;
		rect.size.y = largestVertex.y - smallestVertex.y;
		rect.origin.x = this.origin.x;
		rect.origin.y = this.origin.y;
		
		return rect;
	},
	
	move: function(x, y) {
		for(var i = 0; i < this.vertices.length; i++) {
			this.vertices[i].x += x;
			this.vertices[i].y += y;
		}
		
		this.origin.x += x;
		this.origin.y += y;
		this.aabb = this.computeAABB();
	},
	
	scale: function(scale) {
		for(var i = 0; i < this.vertices.length; i++) {
			this.vertices[i].x *= scale;
			this.vertices[i].y *= scale;
		}
		
		this.origin.x *= scale;
		this.origin.y *= scale;
		this.aabb = this.computeAABB();
	},
	
	rotate: function(rad) {
		for(var i = 0; i < this.vertices.length; i++) {
			this.vertices[i].rotateAroundPoint(rad, this.origin.x, this.origin.y);
		}
		this.rotation += rad;
		this.aabb = this.computeAABB();
	},
	
	getEdges: function() {
		var edges = [];
		
		for(var i = 0; i < this.vertices.length; i++) {
			var start = this.vertices[i];
			var finish = null;
			
			if(this.vertices[i + 1] == undefined) {
				finish = this.vertices[0];
				
			} else {
				finish = this.vertices[i + 1];
			}
			
			var line = new Down.Line(start.x, start.y, finish.x, finish.y);
			edges.push(line);
		}
		
		return edges;
	},
	
	getVertices: function() {
		return this.vertices.slice(0);
	},
	
	collideRectangle: function(rect) {
		return Down.Collide.polyPoly(rect, this);
	},
	
	collideCircle: function(circ) {
		return Down.Collide.circPoly(circ, this);
	},
	
	collideLine: function(line) {
		return Down.Collide.polyLine(this, line);
	},
	
	collidePolygon: function(poly) {
		return Down.Collide.polyPoly(this, poly);
	},
	
	resolveCollisionRectangle: function(rect) {
		
	},
	
	resolveCollisionPolygon: function(poly) {
		
	},
	
	resolveCollisionCircle: function(circ) {
		
	}
};

Down.Rectangle = function() {
	this.position = new Down.Vector2(0, 0);
	this.size = new Down.Vector2(0, 0);
	this.origin = new Down.Vector2(0, 0);
	this.rotation = 0;
	this.aabb = this.computeAABB();
};
Down.Rectangle.prototype = {	
	setPosition: function(x, y) {
		this.position.x = x;
		this.position.y = y;
		this.aabb = this.computeAABB();
	},
	
	setSize: function(x, y) {
		this.size.x = x;
		this.size.y = y;
		this.aabb = this.computeAABB();
	},
	
	setOrigin: function(x, y) {
		this.origin.x = x;
		this.origin.y = y;
		this.aabb = this.computeAABB();
	},
	
	computeAABB: function() {
		if(this.rotation == 0) {
			return this;
		}
		
		var poly = new Down.Polygon();
		poly.vertices = this.getVertices();
		return poly.computeAABB();
	},
	
	move: function(x, y) {
		this.position.x += x;
		this.position.y += y;
		this.aabb = this.computeAABB();
	},
	
	rotate: function(rad) {
		this.rotation += rad;
		this.aabb = this.computeAABB();
	},
	
	getEdges: function() {
		var vertices = this.getVertices();
		
		return [
			new Down.Line(vertices[0].x, vertices[0].y, vertices[1].x, vertices[1].y),
			new Down.Line(vertices[1].x, vertices[1].y, vertices[2].x, vertices[2].y),
			new Down.Line(vertices[2].x, vertices[2].y, vertices[3].x, vertices[3].y),
			new Down.Line(vertices[3].x, vertices[3].y, vertices[0].x, vertices[0].y)
		];
	},
	
	getVertices: function() {
		var vertices = [
			new Down.Vector2(this.position.x, this.position.y),
			new Down.Vector2(this.position.x + this.size.x, this.position.y),
			new Down.Vector2(this.position.x + this.size.x, this.position.y + this.size.y),
			new Down.Vector2(this.position.x, this.position.y + this.size.y)
		];
		
		// rotate
		if(this.rotation != 0) {
			var origin = new Down.Vector2(this.position.x + this.origin.x, this.position.y + this.origin.y);
			
			for(var i = 0; i < vertices.length; i++) {
				vertices[i].rotateAroundPoint(this.rotation, origin.x, origin.y);
			}
		}
		
		return vertices;
	},
	
	collideRectangle: function(rect) {
		return Down.Collide.rectRect(rect, this);
	},
	
	collideCircle: function(circle) {
		return Down.Collide.rectCirc(this, circle);
	},
	
	collideLine: function(line) {
		return Down.Collide.rectLine(this, line);
	},
	
	collidePolygon: function(poly) {
		return Down.Collide.polyPoly(this, poly);
	},
	
	overlapRectangle: function(rect) {
		var newRect = new Down.Rectangle();
		
		newRect.position.x = Math.max(this.position.x, rect.position.x);
		newRect.position.y = Math.max(this.position.y, rect.position.y);
		newRect.size.x = Math.min(this.position.x + this.size.x, rect.position.x + rect.size.x) - newRect.position.x;
		newRect.size.y = Math.min(this.position.y + this.size.y, rect.position.y + rect.size.y) - newRect.position.y;
		return newRect;
	},
	
	resolveCollisionRectangle: function(rect) {
		return Down.Collide.resolveRectRect(rect, this);
	},
	
	resolveCollisionPolygon: function(poly) {
		
	},
	
	resolveCollisionCircle: function(circ) {
		
	}
};


Down.Collide = {
	rectRect: function(rect, rect2) {
		if(rect.rotation == 0 && rect2.rotation == 0) {
			
			if(rect.position.x > rect2.position.x + rect2.size.x) {
				return false;
			}

			if(rect.position.y > rect2.position.y + rect2.size.y) {
				return false;
			}

			if(rect2.position.x > rect.position.x + rect.size.x) {
				return false;
			}

			if(rect2.position.y > rect.position.y + rect.size.y) {
				return false;
			}
			
			return true;
		}

		return Down.Collide.polyPoly(rect, rect2);
	},
	
	resolveRectRect: function(rect, rect2) {
		var overlap = rect.overlapRectangle(rect2);
		var collision = new Down.Vector2();

		if(Math.abs(overlap.size.x) < Math.abs(overlap.size.y)) {
			if(rect.position.x > rect2.position.x) {
				collision.x = overlap.size.x;

			} else {
				collision.x = -overlap.size.x;
			}

		} else {
			if(rect.position.y > rect2.position.y) {
				collision.y = overlap.size.y;

			} else {
				collision.y = -overlap.size.y;
			}
		}

		return collision;
	},

	rectCirc: function(rect, circ) {
		return Down.Collide.circPoly(circ, rect);
	},

	circCirc: function(circ, circ2) {
		return circ.position.subtractVector(circ2.position) < circ.radius + circ2.radius;
	},
	
	resolveCircCirc: function(circ, circ2) {
		var length = circ.position.subtractVector(circ2.position).getLength();
		var totalRadius = circ.radius + circ2.radius;
		
		var difference = totalRadius - length;
		return new Down.Vector2(difference, difference);
	},

	circPoly: function(circ, poly) {	

		//get edges
		var polyEdges = poly.getEdges();

		//get normals / perpendiculars
		var normals = [];

		for(var i = 0; i < polyEdges.length; i++) {
			normals.push(polyEdges[i].getNormalVector());
		}
		
		var vertices = poly.getVertices();
		for(var i = 0; i < vertices.length; i++) {
			normals.push(new Down.Line(vertices[i].x, vertices[i].y, circ.position.x, circ.position.y).getNormalVector());
		}
		
		var overlapAxis = null;
		var overlap = Number.MAX_VALUE;

		// get projections
		for(i = 0; i < normals.length; i++) {
			normals[i] = normals[i].getNormalisedVector();
			var proj1 = normals[i].projectCircle(circ);
			var proj2 = normals[i].projectPolygon(poly);

			// no overlap
			if((proj1.min > proj2.max || proj2.min > proj1.max)) {
				return false;
				
			} else {
				var newOverlap;
				if(proj1.max > proj2.min) {
					newOverlap = proj1.max - proj2.min;
					
				} else if(proj1.min > proj2.max) {
					newOverlap = proj1.min - proj2.max;
					
				} else {
					newOverlap = 0;
				}
				
				if(newOverlap < overlap) {
					overlap = newOverlap;
					overlapAxis = normals[i];	
				}
			}
		}
		
		overlapAxis.x *= overlap;
		overlapAxis.y *= overlap;
		return overlapAxis;
	},
	
	/*
	polyPoly: function(poly, poly2) {
		var poly1Vertices = poly.getVertices();
		var poly2Vertices = poly2.getVertices();
		
		var minkowskiDiff = [];
		
		for(var i = 0; i < poly1Vertices.length; i++) {
			for(var j = 0; j < poly2Vertices.length; j++) {
				minkowskiDiff.push(poly1Vertices[i].subtractVector(poly2Vertices[j]));
			}
		}
		
		var newPoly = new Down.Polygon();
		newPoly.vertices = minkowskiDiff;
		var aabb = newPoly.computeAABB();
		
		if(0 < aabb.position.x || 0 > aabb.position.x + aabb.size.x || 0 < aabb.position.y || 0 > aabb.position.y + aabb.size.y) {
			return false;
		}
		
		var edges = newPoly.getEdges();
		var i, j;
		var contains = false;
		
		for(i = 0; i < edges.length; i++) {
			var edge = edges[i];
			
			// check Y sits on line
			if((edge.start.y < 0 && edge.finish.y >= 0) || (edge.finish.y < 0 && edge.start.y >= 0)) {
				
				// @todo Understand this bit
				if(edge.start.x + (-edge.start.y) / (edge.finish.y - edge.start.y) * (edge.finish.x - edge.start.x) < 0) {
					contains = !contains;
				}
			}
		}
		
		return contains;
	}*/	
	
	polyPoly: function(poly, poly2) {

		//get edges
		var poly1Edges = poly.getEdges();
		var poly2Edges = poly2.getEdges();

		//get normals
		var normals = [];

		for(var i = 0; i < poly1Edges.length; i++) {
			normals.push(poly1Edges[i].getNormalVector());
		}

		for(i = 0; i < poly2Edges.length; i++) {
			normals.push(poly2Edges[i].getNormalVector());
		}

		var overlapAxis = null;
		var overlap = Number.MAX_VALUE;

		// get projections
		for(i = 0; i < normals.length; i++) {
			normals[i] = normals[i].getNormalisedVector();
			var proj1 = normals[i].projectPolygon(poly);
			var proj2 = normals[i].projectPolygon(poly2);

			// no overlap
			if((proj1.min > proj2.max || proj2.min > proj1.max)) {
				return false;
				
			} else {
				var newOverlap;
				if(proj1.max > proj2.min) {
					newOverlap = proj1.max - proj2.min;
					
				} else if(proj1.min > proj2.max) {
					newOverlap = proj1.min - proj2.max;
					
				} else {
					newOverlap = 0;
				}
				
				if(newOverlap < overlap) {
					overlap = newOverlap;
					overlapAxis = normals[i];	
				}
			}
		}
		
		overlapAxis.x *= overlap;
		overlapAxis.y *= overlap;
		return overlapAxis;
	}
};Down.WebGL = {
	active: false,
	vertexBuffer: 0,
	indexBuffer: 0,
	numVertices: 0,
	numIndices: 0,
	vertices: new Float32Array(30 * 150000),
	indices: new Uint16Array(6 * 50000),
	camPos: 0,
	camSize: 0,
	
	checkError: function() {
		var err = Down.context.getError();
		while(err != Down.context.NO_ERROR) {
			switch(err) {
				case Down.context.OUT_OF_MEMORY:
					console.log("OUT_OF_MEMORY");
					break;
					
				case Down.context.INVALID_ENUM:
					console.log("INVALID_ENUM");
					break;
					
				case Down.context.INVALID_OPERATION:
					console.log("INVALID_OPERATION");
					break;
					
				case Down.context.INVALID_FRAMEBUFFER_OPERATION:
					console.log("INVALID_FRAMEBUFFER_OPERATION");
					break;
					
				case Down.context.INVALID_VALUE:
					console.log("INVALID_VALUE");
					break;
					
				case Down.context.CONTEXT_LOST_WEBGL:
					console.log("CONTEXT_LOST_WEBGL");
					break;
					
				default:
					console.log("UNKNOWN ERROR");
					break;
			}
			
			err = Down.context.getError();
		}
	},
	
	loadShader: function(src, type) {
		//console.log(src, type);
		var shader = Down.context.createShader(type);
		Down.context.shaderSource(shader, src);
		Down.context.compileShader(shader);
		
		//this.checkError();
		
		if (!Down.context.getShaderParameter(shader, Down.context.COMPILE_STATUS)) {
			console.log(Down.context.getShaderInfoLog(shader));
		}
		
		return shader;
	},
	
	enable: function() {
		Down.context.clearColor(0.0, 0.0, 0.0, 1.0);
		Down.context.viewport(0, 0, Down.width, Down.height);
		
		var vertex = "attribute vec2 coord;" +
		"attribute vec3 colour;" +
		"uniform vec2 cameraSize;" +
		"uniform vec2 cameraPosition;" +
		"varying vec3 f_colour;" +
		"void main(void) {" +
			"vec2 newCoord;" +
			"newCoord.x = coord.x;" +
			"newCoord.y = coord.y;" + 
			"newCoord.x = newCoord.x - cameraPosition.x;" +
			"newCoord.y = newCoord.y - cameraPosition.y;" +
			"newCoord.x = (newCoord.x / cameraSize.x) * 2.0 - 1.0;" +
			"newCoord.y = -((newCoord.y / cameraSize.y) * 2.0 - 1.0);" +
			"f_colour = colour;" +
			"gl_Position = vec4(newCoord, 0, 1.0);" +
		"}";
		
		var fragment = "precision highp float;" +
		"varying vec3 f_colour;" +
		"void main(void) {" +
			"gl_FragColor = vec4(f_colour, 1.0);" +
		"}";
	
		this.vertexBuffer = Down.context.createBuffer();
		Down.context.bindBuffer(Down.context.ARRAY_BUFFER, this.vertexBuffer);
		Down.context.bufferData(Down.context.ARRAY_BUFFER, this.vertices.byteLength, Down.context.DYNAMIC_DRAW);
	
		this.indexBuffer = Down.context.createBuffer();
		Down.context.bindBuffer(Down.context.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
		Down.context.bufferData(Down.context.ELEMENT_ARRAY_BUFFER, this.indices.byteLength, Down.context.DYNAMIC_DRAW);
	
		var shaderProgram = Down.context.createProgram();
		console.log("vertex");
		Down.context.attachShader(shaderProgram, this.loadShader(vertex, Down.context.VERTEX_SHADER));
		console.log("fragment");
		Down.context.attachShader(shaderProgram, this.loadShader(fragment, Down.context.FRAGMENT_SHADER));
		Down.context.linkProgram(shaderProgram);
		
		this.camSize = Down.context.getUniformLocation(shaderProgram, "cameraSize");
		this.camPos = Down.context.getUniformLocation(shaderProgram, "cameraPosition");
		
		var coord = Down.context.getAttribLocation(shaderProgram, "coord");
		var colour = Down.context.getAttribLocation(shaderProgram, "colour");
		
		Down.context.useProgram(shaderProgram);
		Down.context.enableVertexAttribArray(coord);
		Down.context.enableVertexAttribArray(colour);
		Down.context.vertexAttribPointer(coord, 2, Down.context.FLOAT, 0, 5 * this.vertices.BYTES_PER_ELEMENT, 0);
		Down.context.vertexAttribPointer(colour, 3, Down.context.FLOAT, 0, 5 * this.vertices.BYTES_PER_ELEMENT, 2 * this.vertices.BYTES_PER_ELEMENT);
	},
	
	beginFrame: function(camera) {
		Down.context.uniform2fv(this.camSize, [camera.size.x, camera.size.y]);
		Down.context.uniform2fv(this.camPos, [camera.position.x, camera.position.y]);
	},
	
	endFrame: function() {
		Down.context.clear(Down.context.COLOR_BUFFER_BIT);
		Down.context.bufferSubData(Down.context.ARRAY_BUFFER, 0, this.vertices);
		
		//Down.context.drawElements(Down.context.TRIANGLES, this.numIndices, Down.context.UNSIGNED_SHORT, 0);
		Down.context.drawArrays(Down.context.TRIANGLES, 0, this.numVertices);
		this.numVertices = 0;
		this.numIndices = 0;
	},
	
	drawCircle: function(camera, shape, colour, stroke) {
		
	},
	
	drawPolygon: function(camera, shape, colour, stroke) {
		
	},
	
	drawRectangle: function(camera, shape, colour, stroke) {
		if(this.numVertices + 30 < this.vertices.length - 1) {
			this.vertices[this.numVertices++] = shape.position.x;
			this.vertices[this.numVertices++] = shape.position.y + shape.size.y;
			this.vertices[this.numVertices++] = colour[0];
			this.vertices[this.numVertices++] = colour[1];
			this.vertices[this.numVertices++] = colour[2];
			this.vertices[this.numVertices++] = shape.position.x;
			this.vertices[this.numVertices++] = shape.position.y;
			this.vertices[this.numVertices++] = colour[0];
			this.vertices[this.numVertices++] = colour[1];
			this.vertices[this.numVertices++] = colour[2];
			this.vertices[this.numVertices++] = shape.position.x + shape.size.x;
			this.vertices[this.numVertices++] = shape.position.y;
			this.vertices[this.numVertices++] = colour[0];
			this.vertices[this.numVertices++] = colour[1];
			this.vertices[this.numVertices++] = colour[2];
			this.vertices[this.numVertices++] = shape.position.x + shape.size.x;
			this.vertices[this.numVertices++] = shape.position.y;
			this.vertices[this.numVertices++] = colour[0];
			this.vertices[this.numVertices++] = colour[1];
			this.vertices[this.numVertices++] = colour[2];
			this.vertices[this.numVertices++] = shape.position.x + shape.size.x;
			this.vertices[this.numVertices++] = shape.position.y + shape.size.y;
			this.vertices[this.numVertices++] = colour[0];
			this.vertices[this.numVertices++] = colour[1];
			this.vertices[this.numVertices++] = colour[2];
			this.vertices[this.numVertices++] = shape.position.x;
			this.vertices[this.numVertices++] = shape.position.y + shape.size.y;
			this.vertices[this.numVertices++] = colour[0];
			this.vertices[this.numVertices++] = colour[1];
			this.vertices[this.numVertices++] = colour[2];
		}
	},
	
	drawSprite: function(camera, sprite, shape) {
		
	},
	
	drawSpriteCircle: function(camera, shape, sprite) {
		
	},
	
	drawSpritePolygon: function(camera, shape, sprite) {
		
	},
	
	drawSpriteRectangle: function(camera, shape, sprite) {
		
	}
};

Down.clearCanvas = function() {
	if(Down.WebGL.active) {
		Down.context.clear(Down.context.COLOR_BUFFER_BIT);
		
	} else {
		Down.context.clearRect(0, 0, Down.canvas.width, Down.canvas.height);
	}
}

Down.drawCircle = function(camera, shape, colour, stroke) {
	
	if(Down.WebGL.active) {
		Down.WebGL.drawCircle(camera, shape, colour, stroke);
		return;
	}
	
	if(colour != Down.context.fillStyle) {
		Down.context.fillStyle = colour;
	}

	if(stroke != Down.context.strokeStyle) {
		Down.context.strokeStyle = stroke;
	}
	
	Down.context.beginPath();
	Down.context.arc(shape.position.x - camera.position.x, shape.position.y - camera.position.y, shape.radius, 0, 2 * Math.PI, false);
	Down.context.closePath();
	Down.context.fill();
	
	if(Down.context.strokeStyle) {
		Down.context.stroke();
	}
};

Down.drawPolygon = function(camera, shape, colour, stroke) {
		
	if(Down.WebGL.active) {
		Down.WebGL.drawPolygon(camera, shape, colour, stroke);
		return;
	}
	
	if(colour != Down.context.fillStyle) {
		Down.context.fillStyle = colour;
	}

	if(stroke != Down.context.strokeStyle) {
		Down.context.strokeStyle = stroke;
	}
	
	var vertices = shape.getVertices();
	
	Down.context.beginPath();
	Down.context.moveTo(vertices[0].x, vertices[0].y);
	for(var i = 1; i < vertices.length; i++) {
		Down.context.lineTo(vertices[i].x - camera.position.x, vertices[i].y - camera.position.y);
	}
	
	Down.context.closePath();
	Down.context.fill();
	
	if(Down.context.strokeStyle) {
		Down.context.stroke();
	}
};

Down.drawSprite = function(camera, sprite, shape) {
	
	if(Down.WebGL.active) {
		Down.WebGL.drawSprite(camera, sprite, shape);
		return;
	}
	
	if (sprite.image.naturalWidth === 0 
		|| sprite.image.naturalHeight === 0 
		|| sprite.image.complete === false) {
		return;
	}

	if(sprite.frameSize.x < 1 && sprite.frameSize.y < 1) {
		return;
	}
	
	if(shape instanceof Down.Rectangle) {
		Down.drawSpriteRectangle(camera, shape, sprite);
	
	} else if(shape instanceof Down.Polygon) {
		Down.drawSpritePolygon(camera, shape, sprite);
		
	} else if(shape instanceof Down.Circle) {
		Down.drawSpriteCircle(camera, shape, sprite);	
	}
};

Down.drawSpriteRectangle = function(camera, shape, sprite) {

	var x = shape.position.x - camera.position.x;
	var y = shape.position.y - camera.position.y;

	if(shape.rotation != 0) {
		Down.context.translate(shape.position.x - camera.position.x + shape.origin.x, shape.position.y - camera.position.y + shape.origin.y);
		Down.context.rotate(shape.rotation);
		x = -shape.origin.x;
		y = -shape.origin.y;
	}

	if(shape.size.x > sprite.frameSize.x || shape.size.y > sprite.frameSize.y) {
		var pattern = Down.context.createPattern(sprite.image, "repeat");
		Down.context.fillStyle = pattern;
		Down.context.translate(x, y);
		Down.context.fillRect(0, 0, sprite.frameSize.x, sprite.frameSize.y);
		Down.context.translate(-x, -y);
		
	} else {
		Down.context.drawImage(
			sprite.image, 
			sprite.frameSize.x * sprite.currentFrame,
			sprite.frameSize.y * sprite.currentFrame, 
			sprite.frameSize.x, 
			sprite.frameSize.y,
			x, 
			y, 
			sprite.frameSize.x, 
			sprite.frameSize.y);
	}
	
	if(shape.rotation != 0) {
		Down.context.rotate(-shape.rotation);
		Down.context.translate(-(shape.position.x - camera.position.x + shape.origin.x), -(shape.position.y - camera.position.y + shape.origin.y));
	}
};

Down.drawSpritePolygon = function(camera, shape, sprite) {
	
	var vertices = shape.getVertices();
	
	Down.context.save();
	Down.context.beginPath();
	Down.context.moveTo(vertices[0].x, vertices[0].y);
	for(var i = 1; i < vertices.length; i++) {
		Down.context.lineTo(vertices[i].x - camera.position.x, vertices[i].y - camera.position.y);
	}
	
	Down.context.closePath();
	Down.context.fill();
	Down.context.clip();
	
	var position = new Down.Vector2(vertices[0].x, vertices[1].y);
	
	for(var i = 0; i < vertices.length; i++) {
		if(vertices[i].x < position.x) {
			position.x = vertices[i].x;
		}
		
		if(vertices[i].y < position.y) {
			position.y = vertices[i].y;
		}
	}
	
	var origin = new Down.Vector2(shape.origin.x - position.x, shape.origin.y - position.y);
	var x = position.x - camera.position.x;
	var y = position.y - camera.position.y;

	Down.context.translate(position.x - camera.position.x + origin.x, position.y - camera.position.y + origin.y);
	Down.context.rotate(shape.rotation);
	x = -origin.x;
	y = -origin.y;

	var newCanvas = document.createElement('canvas');
	newCanvas.width = sprite.frameSize.x;
	newCanvas.height = sprite.frameSize.y;
	var newContext = newCanvas.getContext('2d');
	
	newContext.drawImage(
		sprite.image, 
		sprite.frameSize.x * sprite.currentFrame,
		sprite.frameSize.y * sprite.currentFrame, 
		sprite.frameSize.x, 
		sprite.frameSize.y,
		0, 
		0, 
		sprite.frameSize.x, 
		sprite.frameSize.y);
	
	var pattern = Down.context.createPattern(newCanvas, "repeat");
	Down.context.fillStyle = pattern;
	Down.context.fill();
	
	Down.context.rotate(-shape.rotation);
	Down.context.translate(-(position.x - camera.position.x + origin.x), -(position.y - camera.position.y + origin.y));
	
	Down.context.restore();
};

Down.drawSpriteCircle = function(camera, shape, sprite) {
	
	Down.context.save();
	Down.context.beginPath();
	Down.context.arc(shape.position.x - camera.position.x, shape.position.y - camera.position.y, shape.radius, 0, 2 * Math.PI, false);
	Down.context.closePath();
	Down.context.fill();
	Down.context.clip();
	
	var x = shape.position.x - camera.position.x;
	var y = shape.position.y - camera.position.y;
	
	Down.context.translate(shape.position.x - camera.position.x + shape.origin.x, shape.position.y - camera.position.y + shape.origin.y);
	Down.context.rotate(shape.rotation);
	x = -shape.origin.x;
	y = -shape.origin.y;

	var newCanvas = document.createElement('canvas');
	newCanvas.width = sprite.frameSize.x;
	newCanvas.height = sprite.frameSize.y;
	var newContext = newCanvas.getContext('2d');
	
	newContext.drawImage(
		sprite.image, 
		sprite.frameSize.x * sprite.currentFrame,
		sprite.frameSize.y * sprite.currentFrame, 
		sprite.frameSize.x, 
		sprite.frameSize.y,
		0, 
		0, 
		sprite.frameSize.x, 
		sprite.frameSize.y);
	
	var pattern = Down.context.createPattern(newCanvas, "repeat");
	Down.context.fillStyle = pattern;
	Down.context.fill();
	
	Down.context.rotate(-shape.rotation);
	Down.context.translate(-(shape.position.x - camera.position.x + shape.origin.x), -(shape.position.y - camera.position.y + shape.origin.y));
	
	Down.context.restore();
};

Down.drawRectangle = function(camera, shape, colour, stroke) {
	
	if(Down.WebGL.active) {
		Down.WebGL.drawRectangle(camera, shape, colour, stroke);
		return;
	}
	
	if(colour != Down.context.fillStyle) {
		Down.context.fillStyle = colour;
	}

	if(stroke != Down.context.strokeStyle) {
		Down.context.strokeStyle = stroke;
	}
	
	var x = shape.position.x - camera.position.x;
	var y = shape.position.y - camera.position.y;

	if(shape.rotation != 0) {
		Down.context.translate(shape.position.x - camera.position.x + shape.origin.x, shape.position.y - camera.position.y + shape.origin.y);
		Down.context.rotate(shape.rotation);
		x = -shape.origin.x;
		y = -shape.origin.y;
	}
	
	Down.context.fillRect(x, y, shape.size.x, shape.size.y);	

	if(Down.context.strokeStyle) {
		Down.context.strokeRect(x, y, shape.size.x, shape.size.y);
	}
	
	if(shape.rotation != 0) {
		Down.context.rotate(-shape.rotation);
		Down.context.translate(-(shape.position.x - camera.position.x + shape.origin.x), -(shape.position.y - camera.position.y + shape.origin.y));
	}
};


Down.Sprite = function() {
	this.image = new Image();
	this.frameSize = new Down.Vector2();
	
	this.noOfFrames = 1;
	this.currentFrame = 0;
	this.animSpeed = 0;
	this.time = 0;
};
Down.Sprite.prototype = {
	
	updateAnimation: function() {
		this.time += Down.interval;
		if(this.time < this.animSpeed) {
			return;
		}
		
		this.time = 0;
		this.currentFrame++;
		if(this.currentFrame > this.noOfFrames - 1) {
			this.currentFrame = 0;
		}
	}
};