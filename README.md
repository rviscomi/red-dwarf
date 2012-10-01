Red Dwarf
=========

![trunk8 heatmap](http://jrvis.com/red-dwarf/img/trunk8-heatmap.jpg)

About
-----
**Red Dwarf** is a heatmap visualization of GitHub repository stargazers.

Play with the [live demo](http://jrvis.com/trunk8/stars.html?rel=github).

How it Works
------------
Red Dwarf uses the GitHub API to determine the locations of people who have starred a given repository. Then, using the Google Maps API, these locations are translated into geocoordinates and fed into a heatmap visualization. The result is a beautiful and detailed visualization of global positions of a repository's stargazers.

Getting Started
---------------
Red Dwarf depends on Google Maps for geocoding and mapping. You must get a [Google Maps API key](https://developers.google.com/maps/documentation/javascript/tutorial#api_key) to access these services.

Usage
-----
Instantiate a new RedDwarf object, the constructor of which accepts a configuration object (see [Settings](#settings)).

```js
var stars = new RedDwarf({
	user: config.user,
	repository: config.repository,
	map_id: config.map_id
});
```

Settings
--------
* **user** (required)
	The GitHub user login of the repository owner.
* **repository** (required)
	The GitHub repository name.
* **map_id** (required)
	The ID of the HTML element in which to draw the map.
* **cache_location**
	The path (relative or absolute) of a JSON file containing precomputed geolocation data. If omitted, Red Dwarf will compute all data from scratch (see [Performance](#performance)). *Note: this file's contents are equivalent to the output of the [toJSON](#methods) method.*
* **map_zoom** The initial zoom level of the heatmap. *Default: 2.* ([more info](https://developers.google.com/maps/documentation/javascript/tutorial#MapOptions))
* **map_lat** The initial latitude position on which the heatmap is centered. *Default: 20.* ([more info](https://developers.google.com/maps/documentation/javascript/tutorial#MapOptions))
* **map_lng** The initial longitude position on which the heatmap is centered. *Default: 0.* ([more info](https://developers.google.com/maps/documentation/javascript/tutorial#MapOptions))
* **map_type** The initial type of the heatmap: road, satellite, hybrid, or terrain. *Default: road.* ([more info](https://developers.google.com/maps/documentation/javascript/tutorial#MapOptions))

Methods
-------
* **toJSON** Returns a JSON representation of a mapping of string locations to geocodes, the number of repository stars, and a mapping of stargazers' user logins to their respective user objects.

Events
------
Red Dwarf will trigger each of the following events during processing. Arguments passed to the event handlers are listed below the event name (where applicable).

Event handlers are defined by including functions keyed by the respective event name in the settings object.

* **onRepositoryLoaded** Fired after successfully loading repository info from the GitHub API.
	* `data` The data object returned by GitHub.
* **onCacheLoaded** Fired after successfully loading the JSON cache file.
* **onStargazersUpdated** Fired after processing a chunk of at most 100 repository stargazers.
	* `num_stargazers` The number of stargazers processed so far.
* **onStargazersLoaded** Fired after successfully loading all stargazers.
* **onLocationUpdated** Fired after successfully loading a single stargazer's profile.
	* `num_resolved_stargazers` The number of stargazers whose profiles have been loaded so far.
	* `num_stargazers` The total number of profiles to load.
* **onLocationLoaded** Fired after successfully loading all stargazers' profiles.
* **onPointsUpdated** Fired after geocoding a chunk of at most 10 stargazer locations.
	* `num_resolved_points` The number of locations geocoded so far.
	* `num_stargazers` The total number of locations to geocode.
* **onPointsLoaded** Fired after successfully geocoding all locations and drawing the heatmap.
	
Performance
-----------
It's important to pre-cache the geolocation data because the Google Maps geocoding API places strict limits on the frequency of requests. Trial and error indicates that this limit is in the neighborhood of 40 requests per minute. This means repository with 200 stars would take 5 minutes to get all geocoordinates. By default, Red Dwarf rate limits requests to this API using a technique based on work by [Nicholas Zakas](http://www.nczonline.net/blog/2009/08/11/timed-array-processing-in-javascript/).

Also note that repositories with many thousands of stargazers will likely hit usuage limits on GitHub's API, because each stargazer's profile must be queried in order to get their location. Rate limiting is currently in development for this scenario.

For these reasons, it's best to pre-cache as frequently as possible. This will prevent each visitor to your page from incurring the usage limit penalizations.

Red Dwarf will only make API calls for data not already in the cache.

MIT License
-----------
Copyright (c) 2012 Rick Viscomi (rviscomi@gmail.com)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.