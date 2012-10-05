/**!
 * red dwarf v1.0.4
 * https://github.com/rviscomi/red-dwarf
 * 
 * Copyright 2012 Rick Viscomi
 * Released under the MIT License.
 * 
 * Date: October 5, 2012
 */

(function () {
	'use strict';
	
	function RedDwarf(options) {
		/* Validate options. */
		if (!options.user ||
				!options.repository ||
				!options.map_id) {
			throw 'RedDwarf requires an object with properties "user", "repository", and "map_id".';
		}
		
		/* Require jQuery. */
		if (!jQuery) {
			throw 'RedDwarf requires jQuery.';
		}
		
		/* Require JSON. */
		if (!JSON) {
			throw 'RedDwarf requires JSON. Check your browser support.';
		}
		
		this.user = options.user;
		this.repository = options.repository;
		this.map_id = options.map_id;
		this.cache_location = options.cache_location || '';
		this.num_stargazers = 0;
		this.num_cached_stargazers = 0;
		this.stargazers = {};
		this.points = [];
		this.locations = [];
		this.geocodes = {};
		
		/* Require Google Maps API. */
		if (this.hasMapsAPI()) {
			this.drawMap(options.map_zoom, options.map_lat, options.map_lng, options.map_type);
		}
		else {
			throw 'RedDwarf requires the Google Maps JavaScript API.';
		}
		
		/* Event hooks. */
		this.onRepositoryLoaded = options.onRepositoryLoaded || function () {};
		this.onCacheLoaded = options.onCacheLoaded || function () {};
		this.onStargazersUpdated = options.onStargazersUpdated || function () {};
		this.onStargazersLoaded = options.onStargazersLoaded || function () {};
		this.onLocationUpdated = options.onLocationUpdated || function () {};
		this.onLocationLoaded = options.onLocationLoaded || function () {};
		this.onPointsUpdated = options.onPointsUpdated || function () {};
		this.onPointsLoaded = options.onPointsLoaded || function () {};
		
		this.start();
	}
	
	RedDwarf.prototype.start = function () {
		var cache_loaded = false,
			repo_loaded = false,
			that = this;
		
		/* Load the JSON cache file. */
		if (this.cache_location) {
			this.loadCache(function () {
				/* After cache load and repo load are completed. */
				if (repo_loaded) {
					that.onInitialized();
				}
				
				cache_loaded = true;
			});
		}
		else {
			cache_loaded = true;
		}
		
		/* Load the repository info.*/
		this.loadRepository(function () {
			/* After cache load and repo load are completed. */
			if (cache_loaded) {
				that.onInitialized();
			}
			
			repo_loaded = true;
		});
	};
	
	RedDwarf.prototype.loadCache = function (onComplete) {
		var that = this;
		
		$.ajax({
			url: this.cache_location,
			dataType: 'json',
			success: function (data) {
				var location = null,
					geocode;
				
				if (data) {
					that.num_cached_stargazers = data.num_stargazers || 0;
					that.stargazers = data.stargazers || {};
					
					/* Convert geocodes to pairs of locations to LatLngs. */
					for (location in data.geocodes) {
						if (data.geocodes.hasOwnProperty(location)) {
							geocode = data.geocodes[location];
							that.geocodes[location] = geocode;
							that.points.push(new google.maps.LatLng(geocode.Xa, geocode.Ya));
						}
					}
				}
				
				that.onCacheLoaded();
			},
			error: function () {
				/* Show no errors. */
				return false;
			},
			complete: onComplete
		});
	};
	
	RedDwarf.prototype.loadRepository = function (onComplete) {
		var that = this;
		
		$.ajax({
			url: 'https://api.github.com/repos/' + this.user + '/' +
					this.repository,
			dataType: 'jsonp',
			success: function (data) {
				that.num_stargazers = data.data.watchers; // TODO data.stargazers?
				
				that.onRepositoryLoaded(data.data);
			},
			complete: onComplete
		});
	};
	
	RedDwarf.prototype.onInitialized = function () {
		if (this.num_stargazers <= this.num_cached_stargazers) {
			this.drawHeatmap();
		}
		else {
			this.appendStargazers();
		}
	};
	
	RedDwarf.prototype.appendStargazers = function () {
		var that = this,
			page = Math.ceil(this.num_cached_stargazers / 100) || 1,
			num_stargazers = this.num_cached_stargazers,
			stargazers = [];
		
		function loadStargazers() {
			$.ajax({
				url: 'https://api.github.com/repos/' + that.user + '/' +
						that.repository + '/stargazers',
				data: {
					page: page,
					per_page: 100
				},
				dataType: 'jsonp', 
				success: function (data, textStatus, xhr) {
					var i, n, stargazer;
					
					if (textStatus === 'success' && data.meta.status === 200) {
						n = data.data.length;
						
						/* Add new stargazers to instance property. */
						for (i = 0; i < n; i++) {
							stargazer = data.data[i];
							
							/* If this stargazer is not in cache, do lookup. */
							if (!that.stargazers[stargazer.login]) {
								that.stargazers[stargazer.login] = {
									login: stargazer.login,
									url: stargazer.url
								};
								
								stargazers.push({
									login: stargazer.login,
									url: stargazer.url
								});
								
								num_stargazers++;
							}
						}
						
						that.onStargazersUpdated(num_stargazers);
					}
					
					if (num_stargazers < that.num_stargazers) {
						page++;
						loadStargazers();
					}
					else {
						that.onStargazersLoaded();
						
						that.getStargazersLocation(stargazers);
					}
				}
			});
		}
		
		loadStargazers();
	};
	
	RedDwarf.prototype.getStargazersLocation = function (stargazers) {
		var that = this,
			n = stargazers.length,
			num_resolved_stargazers = 0;
		
		timedChunk(stargazers, function (stargazer) {
			/* Query the GitHub API for stargazer profile. */
			$.ajax({
				url: stargazer.url,
				dataType: 'jsonp',
				success: function (data, textStatus, xhr) {
					var location = '';
					
					if (textStatus === 'success' && data.meta.status === 200) {
						location = data.data.location;
					}
					
					if (location && !that.geocodes[location]) {
						that.locations.push(location);
					}
				},
				error: function () {
					console.warn('Error loading', stargazer.login);
				},
				complete: function () {
					num_resolved_stargazers++;
					
					that.onLocationUpdated(num_resolved_stargazers, n);
					
					if (num_resolved_stargazers === n) {
						that.onLocationLoaded();
						
						that.getGeoCoordinates();
					}
				}
			});
		}, null, function () {}, 7e2, 1); // load one every 700 ms
		
		if (!n) {
			that.onLocationLoaded();
			
			that.getGeoCoordinates();
		}
	};
	
	RedDwarf.prototype.getGeoCoordinates = function () {
		var that = this,
			geo = new google.maps.Geocoder(),
			OK = google.maps.GeocoderStatus.OK,
			locations = this.locations,
			n = locations.length;
		
		/* Delay to avoid maxing out Google API. */
		timedChunk(locations, function (location) {
			geo.geocode({address: location}, function (results, status) {
				if (status === OK) {
					that.points.push(results[0].geometry.location);
					that.geocodes[location] = results[0].geometry.location;
				}
				
				that.onPointsUpdated(that.points.length, that.num_stargazers);
				
				/* After all locations have been converted. */
				if (!--n) {
					that.drawHeatmap();
				}
			});
		}, this, function () {}, 15e3, 10);
		
		/* Passing an empty callback function to timedChunk because the */
		/* process function in turn makes an async request. So the callback */
		/* may be invoked before the async request of the final process. */
		/* Do nothing on callback, let the process function handle next step. */
		
		if (!locations.length) {
			that.drawHeatmap();
		}
	};
	
	RedDwarf.prototype.drawMap = function (zoom, lat, lng, type) {
		zoom = zoom || 2;
		lat = lat || 20;
		lng = lng || 0;
		type = type || google.maps.MapTypeId.ROADMAP;
		
		this.map = new google.maps.Map(document.getElementById(this.map_id), {
			zoom: zoom,
			center: new google.maps.LatLng(lat, lng),
			mapTypeId: type
		});
	};
	
	RedDwarf.prototype.drawHeatmap = function () {
		new google.maps.visualization.HeatmapLayer({
			data: this.points,
			map: this.map,
			radius: 25
		});
		
		this.onPointsLoaded();
	};
	
	RedDwarf.prototype.hasMapsAPI = function () {
		/* Check all Google API dependencies. */
		return (google &&
				google.maps &&
				google.maps.Map &&
				google.maps.MapTypeId &&
				google.maps.MapTypeId.ROADMAP &&
				google.maps.Geocoder &&
				google.maps.GeocoderStatus &&
				google.maps.GeocoderStatus.OK &&
				google.maps.LatLng &&
				google.maps.visualization &&
				google.maps.visualization.HeatmapLayer);
	};
	
	RedDwarf.prototype.toJSON = function () {
		return JSON.stringify({
			num_stargazers: this.num_stargazers,
			stargazers: this.stargazers,
			geocodes: this.geocodes
		});
	};
	
	/*! Copyright 2009 Nicholas C. Zakas. All rights reserved. MIT Licensed */
	function timedChunk(items, process, context, callback, delay, maxItems) {
		var n = items.length,
			delay = delay || 25,
			maxItems = maxItems || n,
			i = 0;
		
		setTimeout(function chunkTimer(){
			var start = +new Date(),
				j = i;
			
			while (i < n && (i - j) < maxItems && (new Date() - start < 50)) {
				process.call(context, items[i]);
				i += 1;
			}
			
			if (i < n) {
				setTimeout(chunkTimer, delay);
			}
			else {
				callback.call(context, items);
			}
		}, 25);
	}
	
	/* Expose as a global object. */
	window.RedDwarf = RedDwarf;
})();