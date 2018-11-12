/**
 * GeolocationControl
 * @param       {Object} map         - a valid google.maps.Map instance
 * @param       {number} defaultZoom - a valid positive Zoom Level
 * @constructor
 */
function GeolocationControl(map, defaultZoom) {
	var self = this;

	self._init = function(map, defaultZoom) {
		self.map = map;
		self.defaultZoom = defaultZoom;

		// Create the DIV to hold the control and call the constructor passing in this DIV
		self.geolocationDiv = document.createElement('div');
		self.controller = new self.GeolocationController(self.geolocationDiv, self.map);

		self.enabled = false;
		self.marker = null;
		self.circle = null;

		self.map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(self.geolocationDiv);
	};

	self.GeolocationController = function(controlDiv, map) {

		if (!(navigator.geolocation && 'https:' == location.protocol)) return;

		// Set CSS for the control btn
		var geolocationBtn = document.createElement('div');
		geolocationBtn.style.backgroundColor = "#fff";
		geolocationBtn.style.border = "2px solid #fff";
		geolocationBtn.style.padding = "9px"; //"3px";
		geolocationBtn.style.borderRadius = "2px";
		geolocationBtn.style.boxShadow = "rgba(0,0,0,0.298039) 0 1px 4px -1px";
		geolocationBtn.style.marginRight = "10px";
		geolocationBtn.style.cursor = "pointer";
		geolocationBtn.id = "geolocationBtn";

		// Set CSS for the control icon
		var geolocationIcon = document.createElement('div');
		geolocationIcon.style.backgroundSize = "36px 18px";
		geolocationIcon.style.width = "18px";
		geolocationIcon.style.height = "18px";
		geolocationIcon.style.opacity = 0.9;
		geolocationIcon.style.backgroundImage = "url(https://raruto.github.io/cdn/google-geolocate/0.0.1/geolocation.png)";
		geolocationIcon.id = "geolocationIcon";

		controlDiv.appendChild(geolocationBtn);
		geolocationBtn.appendChild(geolocationIcon);

		// Setup the click event listeners to geolocate user
		google.maps.event.addDomListener(geolocationBtn, 'click', self.geolocate);
	};

	self.geolocate = function() {
		self.enabled = !self.enabled;
		document.getElementById('geolocationIcon').style.backgroundPosition = self.enabled ? '-18px' : '';

		if (!self.enabled) {
			self.marker.setMap(null);
			self.circle.setMap(null);
			self.enabled = false;
			return;
		}

		if (navigator.geolocation) {

			navigator.geolocation.getCurrentPosition(function(position) {

				var pos = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);

				// Create a marker and center map on user location
				self.marker = new google.maps.Marker({
					position: pos,
					draggable: false,
					//animation: google.maps.Animation.DROP,
					map: self.map,
					clickable: false,
					icon: {
						path: google.maps.SymbolPath.CIRCLE,
						scale: 6,
						fillColor: '#3a84df',
						fillOpacity: 0.9,
						strokeColor: '#fff',
						strokeWeight: 2
					},
				});
				self.circle = new google.maps.Circle({
					clickable: false,
					strokeColor: '#3a84df',
					strokeOpacity: 0.8,
					strokeWeight: 0.5,
					fillColor: '#3a84df',
					fillOpacity: 0.25,
					map: self.map,
					center: pos,
					radius: position.coords.accuracy,
				});
				self.map.setCenter(pos);
				if (self.defaultZoom) {
					self.map.setZoom(self.defaultZoom);
				}
			}, void 0, {
				enableHighAccuracy: true
			});
		}
	};

	self._init(map, defaultZoom);
}
