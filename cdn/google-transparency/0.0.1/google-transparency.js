/*******************************************************************************
Copyright (c) 2010-2012. Gavin Harriss
Site: http://www.gavinharriss.com/
Originally developed for: http://www.topomap.co.nz/

Licences: Creative Commons Attribution 3.0 New Zealand License
http://creativecommons.org/licenses/by/3.0/nz/
******************************************************************************/
OpacityControl = function (map, options) {
	var self = this;
	self._init = function(map, options) {
		self.map = map;

		self.initialOpacity = options.opacity ? options.opacity : 100;
		self.backgroundColor = options.backgroundColor ? options.backgroundColor : "transparent";
		self.getTileUrl = options.getTileUrl ? options.getTileUrl : function(coord, zoom) { return false; };
		self.sliderImageUrl = options.sliderImageUrl ? options.sliderImageUrl : "opacity-slider3d14.png";
		self.position = options.position ? options.position : google.maps.ControlPosition.RIGHT_TOP;
		self.OPACITY_MAX_PIXELS = 57; // Width of opacity control image

		self.overlay = new OpacityControl.TileOverlay(self.map, self.initialOpacity, self.getTileUrl, self.backgroundColor);
		self.overlay.show();

		google.maps.event.addListener(self.map, 'tilesloaded', function() {
			self.overlay.deleteHiddenTiles(self.map.getZoom());
		});

		// Add opacity control and set initial value
		self.createOpacityControl(self.initialOpacity);
	};

	self.createOpacityControl = function(opacity) {
		// Create main div to hold the control.
		var opacityDiv = document.createElement('DIV');
		opacityDiv.setAttribute("style", "margin:5px;overflow-x:hidden;overflow-y:hidden;background:url(" + self.sliderImageUrl + ") no-repeat;width:71px;height:21px;cursor:pointer;");

		// Create knob
		var opacityKnobDiv = document.createElement('DIV');
		opacityKnobDiv.setAttribute("style", "padding:0;margin:0;overflow-x:hidden;overflow-y:hidden;background:url(" + self.sliderImageUrl + ") no-repeat -71px 0;width:14px;height:21px;");
		opacityDiv.appendChild(opacityKnobDiv);

		self.opacityCtrlKnob = new OpacityControl.ExtDraggableObject(opacityKnobDiv, {
			restrictY: true,
			container: opacityDiv
		});

		google.maps.event.addListener(self.opacityCtrlKnob, "dragend", function() {
			self.setOpacity(self.opacityCtrlKnob.valueX());
		});

		google.maps.event.addDomListener(opacityDiv, "click", function(e) {
			var left = self.findPosLeft(this);
			var x = e.pageX - left - 5; // - 5 as we're using a margin of 5px on the div
			self.opacityCtrlKnob.setValueX(x);
			self.setOpacity(x);
		});

		self.map.controls[self.position].push(opacityDiv);

		// Set initial value
		var initialValue = self.OPACITY_MAX_PIXELS / (100 / opacity);
		self.opacityCtrlKnob.setValueX(initialValue);
		self.setOpacity(initialValue);
	};

	self.setOpacity = function(pixelX) {
		// Range = 0 to OPACITY_MAX_PIXELS
		var value = (100 / self.OPACITY_MAX_PIXELS) * pixelX;
		if (value < 0) value = 0;
		if (value == 0) {
			if (self.overlay.visible == true) {
				self.overlay.hide();
			}
		} else {
			self.overlay.setOpacity(value);
			if (self.overlay.visible == false) {
				self.overlay.show();
			}
		}
	};

	self.findPosLeft = function(obj) {
		var curleft = 0;
		if (obj.offsetParent) {
			do {
				curleft += obj.offsetLeft;
			} while (obj = obj.offsetParent);
			return curleft;
		}
		return undefined;
	};

	self._init(map, options);
}

/*******************************************************************************
Copyright (c) 2010-2012. Gavin Harriss
Site: http://www.gavinharriss.com/
Originally developed for: http://www.topomap.co.nz/

Licences: Creative Commons Attribution 3.0 New Zealand License
http://creativecommons.org/licenses/by/3.0/nz/
******************************************************************************/

OpacityControl.TileOverlay = function (map, opacity, getTileUrl, backgroundColor) {
	this.tileSize = new google.maps.Size(256, 256); // Change to tile size being used

	this.map = map;
	this.opacity = opacity;
	this.tiles = [];

	this.visible = false;
	this.initialized = false;

	this.getTileUrl = getTileUrl;
	this.backgroundColor = backgroundColor ? backgroundColor : '#000';

	this.self = this;
}

OpacityControl.TileOverlay.prototype = new google.maps.OverlayView();

OpacityControl.TileOverlay.prototype.getTile = function (p, z, ownerDocument) {
	// If tile already exists then use it
	for (var n = 0; n < this.tiles.length; n++) {
		if (this.tiles[n].id == 't_' + p.x + '_' + p.y + '_' + z) {
			return this.tiles[n];
		}
	}

	// If tile doesn't exist then create it
	var tile = ownerDocument.createElement('div');
	var tp = this.getTileUrlCoord(p, z);
	tile.id = 't_' + tp.x + '_' + tp.y + '_' + z
	tile.style.width = this.tileSize.width + 'px';
	tile.style.height = this.tileSize.height + 'px';

	var tileUrl = this.getTileUrl(tp, z);
	if(tileUrl){
		tile.style.backgroundImage = 'url(' + tileUrl + ')';
		tile.style.backgroundRepeat = 'no-repeat';
	}
	else {
		if(this.backgroundColor == "transparent"){
			this.backgroundColor = this.map.getDiv().firstChild.style.backgroundColor;
		}
		tile.style.backgroundColor = this.backgroundColor;
	}


	if (!this.visible) {
		tile.style.display = 'none';
	}

	this.tiles.push(tile)

	this.setObjectOpacity(tile);

	return tile;
}

// Save memory / speed up the display by deleting tiles out of view
// Essential for use on iOS devices such as iPhone and iPod!
OpacityControl.TileOverlay.prototype.deleteHiddenTiles = function (zoom) {
	var bounds = this.map.getBounds();
	var tileNE = this.getTileUrlCoordFromLatLng(bounds.getNorthEast(), zoom);
	var tileSW = this.getTileUrlCoordFromLatLng(bounds.getSouthWest(), zoom);

	var minX = tileSW.x - 1;
	var maxX = tileNE.x + 1;
	var minY = tileSW.y - 1;
	var maxY = tileNE.y + 1;

	var tilesToKeep = [];
	var tilesLength = this.tiles.length;
	for (var i = 0; i < tilesLength; i++) {
		var idParts = this.tiles[i].id.split("_");
		var tileX = Number(idParts[1]);
		var tileY = Number(idParts[2]);
		var tileZ = Number(idParts[3]);
		if ((
				(minX < maxX && (tileX >= minX && tileX <= maxX))
				|| (minX > maxX && ((tileX >= minX && tileX <= (Math.pow(2, zoom) - 1)) || (tileX >= 0 && tileX <= maxX))) // Lapped the earth!
			)
			&& (tileY >= minY && tileY <= maxY)
			&& tileZ == zoom) {
			tilesToKeep.push(this.tiles[i]);
		}
		else {
			delete this.tiles[i];
		}
	}

	this.tiles = tilesToKeep;
};

OpacityControl.TileOverlay.prototype.pointToTile = function (point, z) {
	var projection = this.map.getProjection();
	var worldCoordinate = projection.fromLatLngToPoint(point);
	var pixelCoordinate = new google.maps.Point(worldCoordinate.x * Math.pow(2, z), worldCoordinate.y * Math.pow(2, z));
	var tileCoordinate = new google.maps.Point(Math.floor(pixelCoordinate.x / this.tileSize.width), Math.floor(pixelCoordinate.y / this.tileSize.height));
	return tileCoordinate;
}

OpacityControl.TileOverlay.prototype.getTileUrlCoordFromLatLng = function (latlng, zoom) {
	return this.getTileUrlCoord(this.pointToTile(latlng, zoom), zoom)
}

OpacityControl.TileOverlay.prototype.getTileUrlCoord = function (coord, zoom) {
	var tileRange = 1 << zoom;
	var y = tileRange - coord.y - 1;
	var x = coord.x;
	if (x < 0 || x >= tileRange) {
		x = (x % tileRange + tileRange) % tileRange;
	}
	return new google.maps.Point(x, y);
}

// // Replace with logic for your own tile set
// OpacityControl.TileOverlay.prototype.getTileUrl = function (coord, zoom) {
// 	// Restricting tiles to the small tile set we have in the example
// 	if (zoom == 13 && coord.x >= 8004 && coord.x <= 8006 && coord.y >= 3013 && coord.y <= 3015) {
// 		return "http://www.gavinharriss.com/codefiles/opacity-control/tiles/" + zoom + "-" + coord.x + "-" + coord.y + ".png";
// 	}
// 	else {
// 		return "http://www.gavinharriss.com/codefiles/opacity-control/tiles/blanktile.png";
// 	}
// }

OpacityControl.TileOverlay.prototype.initialize = function () {
	if (this.initialized) {
		return;
	}
	var self = this.self;
	// Insert this overlay map type as the first overlay map type at
	// position 0. Note that all overlay map types appear on top of
	// their parent base map.
	this.map.overlayMapTypes.insertAt(0, self);
	self.setMap(this.map);
	this.initialized = true;
}

OpacityControl.TileOverlay.prototype.hide = function () {
	this.visible = false;

	var tileCount = this.tiles.length;
	for (var n = 0; n < tileCount; n++) {
		this.tiles[n].style.display = 'none';
	}
}

OpacityControl.TileOverlay.prototype.show = function () {
	this.initialize();
	this.visible = true;
	var tileCount = this.tiles.length;
	for (var n = 0; n < tileCount; n++) {
		this.tiles[n].style.display = '';
	}
}

OpacityControl.TileOverlay.prototype.releaseTile = function (tile) {
	tile = null;
}

OpacityControl.TileOverlay.prototype.setOpacity = function (op) {
	this.opacity = op;

	var tileCount = this.tiles.length;
	for (var n = 0; n < tileCount; n++) {
		this.setObjectOpacity(this.tiles[n]);
	}
}

OpacityControl.TileOverlay.prototype.setObjectOpacity = function (obj) {
	if (this.opacity > 0) {
		if (typeof (obj.style.filter) == 'string') { obj.style.filter = 'alpha(opacity:' + this.opacity + ')'; }
		if (typeof (obj.style.KHTMLOpacity) == 'string') { obj.style.KHTMLOpacity = this.opacity / 100; }
		if (typeof (obj.style.MozOpacity) == 'string') { obj.style.MozOpacity = this.opacity / 100; }
		if (typeof (obj.style.opacity) == 'string') { obj.style.opacity = this.opacity / 100; }
	}
}

OpacityControl.TileOverlay.prototype.draw = function() {
	var self = this.self;
	if (!self.map.getMapPanes) {
		self.map.getMapPanes = function() {
			return self.getPanes();
		};
		//at this point, you can use map.getMapPanes() to get the MapPanes
		// object like so: var panes = map.getMapPanes();
	}
}

/**
 * @name ExtDraggableObject
 * @version 1.0
 * @author Gabriel Schneider
 * @copyright (c) 2009 Gabriel Schneider
 * @fileoverview This sets up a given DOM element to be draggable
 *     around the page.
 */

/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Sets up a DOM element to be draggable. The options available
 *     within {@link ExtDraggableObjectOptions} are: top, left, container,
 *     draggingCursor, draggableCursor, intervalX, intervalY,
 *     toleranceX, toleranceY, restrictX, and restrictY.
 * @param {HTMLElement} src The element to make draggable
 * @param {ExtDraggableObjectOptions} [opts] options
 * @constructor
 */
OpacityControl.ExtDraggableObject = function(src, opt_drag) {
  var self = this;
  var event_ = (window["GEvent"]||google.maps.Event||google.maps.event);
  var opt_drag_=opt_drag||{};
  var draggingCursor_ = opt_drag_.draggingCursor||"default";
  var draggableCursor_ = opt_drag_.draggableCursor||"default";
  var moving_ = false, preventDefault_;
  var currentX_, currentY_, formerY_, formerX_, formerMouseX_, formerMouseY_;
  var top_, left_;
  var mouseDownEvent_, mouseUpEvent_, mouseMoveEvent_;
  var originalX_, originalY_;
  var halfIntervalX_ = Math.round(opt_drag_.intervalX/2);
  var halfIntervalY_ = Math.round(opt_drag_.intervalY/2);
  var target_ = src.setCapture?src:document;

  if (typeof opt_drag_.intervalX !== "number") {
    opt_drag_.intervalX = 1;
  }
  if (typeof opt_drag_.intervalY !== "number") {
    opt_drag_.intervalY = 1;
  }
  if (typeof opt_drag_.toleranceX !== "number") {
    opt_drag_.toleranceX = Infinity;
  }
  if (typeof opt_drag_.toleranceY !== "number") {
    opt_drag_.toleranceY = Infinity;
  }

  mouseDownEvent_ = event_.addDomListener(src, "mousedown", mouseDown_);
  mouseUpEvent_ = event_.addDomListener(target_, "mouseup", mouseUp_);

  setCursor_(false);
  if (opt_drag_.container) {

  }
  src.style.position = "absolute";
  opt_drag_.left = opt_drag_.left||src.offsetLeft;
  opt_drag_.top = opt_drag_.top||src.offsetTop;
  opt_drag_.interval = opt_drag_.interval||1;
  moveTo_(opt_drag_.left, opt_drag_.top, false);

  /**
   * Set the cursor for {@link src} based on whether or not
   *     the element is currently being dragged.
   * @param {Boolean} a Is the element being dragged?
   * @private
   */
  function setCursor_(a) {
    if(a) {
      src.style.cursor = draggingCursor_;
    } else {
      src.style.cursor = draggableCursor_;
    }
  }

  /**
   * Moves the element {@link src} to the given
   *     location.
   * @param {Number} x The left position to move to.
   * @param {Number} y The top position to move to.
   * @param {Boolean} prevent Prevent moving?
   * @private
   */
  function moveTo_(x, y, prevent) {
    var roundedIntervalX_, roundedIntervalY_;
    left_ = Math.round(x);
    top_ = Math.round(y);
    if (opt_drag_.intervalX>1) {
      roundedIntervalX_ = Math.round(left_%opt_drag_.intervalX);
      left_ = (roundedIntervalX_<halfIntervalX_)?(left_-roundedIntervalX_):(left_+(opt_drag_.intervalX-roundedIntervalX_));
    }
    if (opt_drag_.intervalY>1) {
      roundedIntervalY_ = Math.round(top_%opt_drag_.intervalY);
      top_ = (roundedIntervalY_<halfIntervalY_)?(top_-roundedIntervalY_):(top_+(opt_drag_.intervalY-roundedIntervalY_));
    }
    if (opt_drag_.container&&opt_drag_.container.offsetWidth) {
      left_ = Math.max(0,Math.min(left_,opt_drag_.container.offsetWidth-src.offsetWidth));
      top_ = Math.max(0,Math.min(top_,opt_drag_.container.offsetHeight-src.offsetHeight));
    }
    if (typeof currentX_ === "number") {
      if (((left_-currentX_)>opt_drag_.toleranceX||(currentX_-(left_+src.offsetWidth))>opt_drag_.toleranceX)||((top_-currentY_)>opt_drag_.toleranceY||(currentY_-(top_+src.offsetHeight))>opt_drag_.toleranceY)) {
        left_ = originalX_;
        top_ = originalY_;
      }
    }
    if(!opt_drag_.restrictX&&!prevent) {
      src.style.left = left_ + "px";
    }
    if(!opt_drag_.restrictY&&!prevent) {
      src.style.top = top_ + "px";
    }
  }

  /**
   * Handles the mousemove event.
   * @param {event} ev The event data sent by the browser.
   * @private
   */
  function mouseMove_(ev) {
    var e=ev||event;
    currentX_ = formerX_+((e.pageX||(e.clientX+document.body.scrollLeft+document.documentElement.scrollLeft))-formerMouseX_);
    currentY_ = formerY_+((e.pageY||(e.clientY+document.body.scrollTop+document.documentElement.scrollTop))-formerMouseY_);
    formerX_ = currentX_;
    formerY_ = currentY_;
    formerMouseX_ = e.pageX||(e.clientX+document.body.scrollLeft+document.documentElement.scrollLeft);
    formerMouseY_ = e.pageY||(e.clientY+document.body.scrollTop+document.documentElement.scrollTop);
    if (moving_) {
      moveTo_(currentX_,currentY_, preventDefault_);
      event_.trigger(self, "drag", {mouseX: formerMouseX_, mouseY: formerMouseY_, startLeft: originalX_, startTop: originalY_, event:e});
    }
  }

  /**
   * Handles the mousedown event.
   * @param {event} ev The event data sent by the browser.
   * @private
   */
  function mouseDown_(ev) {
    var e=ev||event;
    setCursor_(true);
    event_.trigger(self, "mousedown", e);
    if (src.style.position !== "absolute") {
      src.style.position = "absolute";
      return;
    }
    formerMouseX_ = e.pageX||(e.clientX+document.body.scrollLeft+document.documentElement.scrollLeft);
    formerMouseY_ = e.pageY||(e.clientY+document.body.scrollTop+document.documentElement.scrollTop);
    originalX_ = src.offsetLeft;
    originalY_ = src.offsetTop;
    formerX_ = originalX_;
    formerY_ = originalY_;
    mouseMoveEvent_ = event_.addDomListener(target_, "mousemove", mouseMove_);
    if (src.setCapture) {
      src.setCapture();
    }
    if (e.preventDefault) {
      e.preventDefault();
      e.stopPropagation();
    } else {
      e.cancelBubble=true;
      e.returnValue=false;
    }
    moving_ = true;
    event_.trigger(self, "dragstart", {mouseX: formerMouseX_, mouseY: formerMouseY_, startLeft: originalX_, startTop: originalY_, event:e});
  }

  /**
   * Handles the mouseup event.
   * @param {event} ev The event data sent by the browser.
   * @private
   */
  function mouseUp_(ev) {
    var e=ev||event;
    if (moving_) {
      setCursor_(false);
      event_.removeListener(mouseMoveEvent_);
      if (src.releaseCapture) {
        src.releaseCapture();
      }
      moving_ = false;
      event_.trigger(self, "dragend", {mouseX: formerMouseX_, mouseY: formerMouseY_, startLeft: originalX_, startTop: originalY_, event:e});
    }
    currentX_ = currentY_ = null;
    event_.trigger(self, "mouseup", e);
  }

  /**
   * Move the element {@link src} to the given location.
   * @param {Point} point An object with an x and y property
   *     that represents the location to move to.
   */
  self.moveTo = function(point) {
    moveTo_(point.x, point.y, false);
  };

  /**
   * Move the element {@link src} by the given amount.
   * @param {Size} size An object with an x and y property
   *     that represents distance to move the element.
   */
  self.moveBy = function(size) {
    moveTo_(src.offsetLeft + size.width, src.offsetHeight + size.height, false);
  }

  /**
   * Sets the cursor for the dragging state.
   * @param {String} cursor The name of the cursor to use.
   */
  self.setDraggingCursor = function(cursor) {
    draggingCursor_ = cursor;
    setCursor_(moving_);
  };

  /**
   * Sets the cursor for the draggable state.
   * @param {String} cursor The name of the cursor to use.
   */
  self.setDraggableCursor = function(cursor) {
    draggableCursor_ = cursor;
    setCursor_(moving_);
  };

  /**
   * Returns the current left location.
   * @return {Number}
   */
  self.left = function() {
    return left_;
  };

  /**
   * Returns the current top location.
   * @return {Number}
   */
  self.top = function() {
    return top_;
  };

  /**
   * Returns the number of intervals the element has moved
   *     along the X axis. Useful for scrollbar type
   *     applications.
   * @return {Number}
   */
  self.valueX = function() {
    var i = opt_drag_.intervalX||1;
    return Math.round(left_ / i);
  };

  /**
   * Returns the number of intervals the element has moved
   *     along the Y axis. Useful for scrollbar type
   *     applications.
   * @return {Number}
   */
  self.valueY = function() {
    var i = opt_drag_.intervalY||1;
    return Math.round(top_ / i);
  };

  /**
   * Sets the left position of the draggable object based on
   *     intervalX.
   * @param {Number} value The location to move to.
   */
  self.setValueX = function(value) {
    moveTo_(value * opt_drag_.intervalX, top_, false);
  };

  /**
   * Sets the top position of the draggable object based on
   *     intervalY.
   * @param {Number} value The location to move to.
   */
  self.setValueY = function(value) {
    moveTo_(left_, value * opt_drag_.intervalY, false);
  };

  /**
   * Prevents the default movement behavior of the object.
   *     The object can still be moved by other methods.
   */
  self.preventDefaultMovement = function(prevent) {
    preventDefault_ = prevent;
  };
}
  /**
   * @name ExtDraggableObjectOptions
   * @class This class represents the optional parameter passed into constructor of
   * <code>ExtDraggableObject</code>.
   * @property {Number} [top] Top pixel
   * @property {Number} [left] Left pixel
   * @property {HTMLElement} [container] HTMLElement as container.
   * @property {String} [draggingCursor] Dragging Cursor
   * @property {String} [draggableCursor] Draggable Cursor
   * @property {Number} [intervalX] Interval in X direction
   * @property {Number} [intervalY] Interval in Y direction
   * @property {Number} [toleranceX] Tolerance X in pixel
   * @property {Number} [toleranceY] Tolerance Y in pixel
   * @property {Boolean} [restrictX] Whether to restrict move in X direction
   * @property {Boolean} [restrictY] Whether to restrict move in Y direction
   */
