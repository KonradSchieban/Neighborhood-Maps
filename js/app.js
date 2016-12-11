var map;
var infowindow;
var markers = []; // list of JSON formatted results by google maps search
var markerGMapsObjects = []; // actual google maps marker objects in an array

function googleError(){
	viewModel.model().errorMessage('Failed to connect to Google Maps API');
}
	
//function to initialize google map
function initMap(positionInput, radiusInput, nearbySearchTypeInput) {
	
	// when map is created the first time, all inputs are set to default values
	if(!positionInput){
		positionInput = {lat: 42.33800859999999, lng: -71.1251311};
	}
	if(!radiusInput){
		radiusInput = 500;
	}
	if(!nearbySearchTypeInput){
		nearbySearchTypeInput = 'Restaurant';
	}

	map = new google.maps.Map(document.getElementById('map'), {
		center: positionInput,
		zoom: 15,
		fullscreenControl: true
	});

	infowindow = new google.maps.InfoWindow();
	var service = new google.maps.places.PlacesService(map);
	service.nearbySearch({
		location: positionInput,
		radius: radiusInput,
		type: [nearbySearchTypeInput]
	}, callback);
		
}

/*
function which is called on async ajax request
fills in markers array with response JSON objects
and store google maps marker objects in markerGMapsObjects array
*/
function callback(results, status) {
	markerGMapsObjects = [];
	markers = [];
	if (status === google.maps.places.PlacesServiceStatus.OK) {
		for (var i = 0; i < results.length; i++) {
			var newMarkerObject = createMarker(results[i]);
			markers.push(results[i]);
			markerGMapsObjects.push(newMarkerObject);
		}
	}else{
		viewModel.model().errorMessage('Failed to call Google Places API');
	}
}


function createMarker(place) {
	var placeLoc = place.geometry.location;
	var marker = new google.maps.Marker({
		map: map,
		position: place.geometry.location,
		draggable: true,
		animation: google.maps.Animation.DROP
	});
	
	marker.addListener('click', toggleBounce);
	
	google.maps.event.addListener(marker, 'click', function() {
		
		if(place.hasOwnProperty('photos')){
			var imgUrl = place.photos[0].getUrl({
				maxWidth: 160
			});
			infowindow.setContent('<b>' + place.name + '</b><br><p>' + place.vicinity + '</p><br><img src='+imgUrl+'>');
		}else{
			infowindow.setContent('<b>' + place.name + '</b><br><p>' + place.vicinity + '</p>');
		}
		
		infowindow.open(map, this);
	});
	
	function toggleBounce() {
		
		var numMarkers = markers.length;
		var thisMarkersIndex;
		for(var i = 0; i<numMarkers; i++){
			markerGMapsObjects[i].setAnimation(null);
			
			if(markerGMapsObjects[i] == this){
				thisMarkersIndex = i;
			}
		}
		
		marker.setAnimation(google.maps.Animation.BOUNCE);

		viewModel.highlightListEntry(markers[thisMarkersIndex].id);
		
	}
	
	return marker;
}


var Model = function(data){
	
	var self = this;
	
	this.coordinates = ko.observable(data.coordinates);
	this.searchLocation = ko.observable(data.searchLocation);	//search input	
	this.searchString = ko.observable(data.searchString);		//search input
	this.searchRadius = ko.observable(data.searchRadius);		//search input
	this.currentItem = ko.observable(data.currentItem);			//name of the list item which has been clicked on (used for Wikipedia search)
	this.errorMessage = ko.observable(data.errorMessage);		//empty string if search was good, poulated with error string otherwise
	this.markersMap = ko.observableArray(data.markersMap);
	this.markersMapFiltered = ko.observableArray(data.markersMapFiltered);
	this.listFilter = ko.observable(data.listFilter);
	
	this.wikiResponse = ko.observable();						//JSON reponse object which is returned by the Wikipedia API
	ko.computed(function() {

		// load wikipedia data
		if(this.currentItem()){
			
			// Timeout function for JSONp
			var wikiRequestTimeout = setTimeout(function(){
				self.errorMessage('Failed to connect to Wikipedia - Timeout reached!');
			}, 8000);
			
			var wikiUrl = 'http://en.wikipedia.org/w/api.php?action=opensearch&search=' + this.currentItem() + '&format=json&callback=wikiCallback';
		
			$.ajax({
				url: wikiUrl,
				dataType: 'jsonp',
				jsonp: 'callback',
				success: function(result){
					self.wikiResponse(result);
					clearTimeout(wikiRequestTimeout);
				}
			});
			
			
			
		}
		
	}, this);

	
	this.wikiJSON = ko.computed(function(){						//JSON object which is contains the name, description and URL of all Wikipedia articles which are returned
		
		var wikiJSONnew = [];
		
		if(this.wikiResponse()){
			// wikiResponse is undefined after loading the page
			var nameList = this.wikiResponse()[1];
			var descriptionList = this.wikiResponse()[2];
			var urlList = this.wikiResponse()[3];
			
			if(nameList.length != 0){
				// at least one Wikipedia record exists
				for (var i = 0; i < nameList.length; i++) {
					
					var nameStr = nameList[i];
					var descriptionStr = descriptionList[i];
					var urlStr = urlList[i];
					
					var wikiJSONpart = {
						'name':nameStr,
						'description':descriptionStr,
						'url':urlStr
					}
					
					wikiJSONnew.push(wikiJSONpart);
				};
			}else{
				var wikiJSONpart = {
					'name':'',
					'description':'no Wikipedia Entry Found',
					'url':''
				}
					
				wikiJSONnew.push(wikiJSONpart);
			}
		}
		
		return wikiJSONnew;
	},this);
	
}


var ViewModel = function(){
	
	//store viewModel context in self
	var self = this;
	
	// Initialize model with default data
	this.model = ko.observable(new Model({
		coordinates: {lat: 42.33800859999999, lng: -71.1251311},
		searchLocation: 'Brookline',
		searchString: 'Restaurant',
		searchRadius: 500,
		markersMap: sampleData,
		markersMapFiltered: sampleData,
		currentItem: '',
		errorMessage: '',
		listFilter: ''
	})) ;
	
	// Function which is called when someone clicks the search button
	this.search = function() {
		
		this.errorMessage('');
		
		if(this.searchString() && this.searchRadius() && this.searchLocation()){
			//all inputs are provided
		
			var searchLocationEscaped = this.searchLocation().replace(/ /g, '+');
			
			var mapsGetResponse = $.ajax({
				url: 'http://maps.google.com/maps/api/geocode/json?address=' + searchLocationEscaped,
				success: function (result) {
					if(mapsGetResponse.responseJSON.status == 'OK'){
				
						//if Google Maps finds something, update coordinates and markers observables
						self.model().coordinates(mapsGetResponse.responseJSON.results[0].geometry.location);
						self.model().markersMap(markers);
						self.model().markersMapFiltered(markers);
						
						//reload map...
						initMap(self.model().coordinates(), self.model().searchRadius(), self.model().searchString());
						
					}else{
						self.model().errorMessage('Did not find a Google Maps Location');
					}
				}
			}).fail(function() {
				self.model().errorMessage('Failed to connect to Google Maps - Check your connectivity');
			});
			
			
		}else{
			this.errorMessage('Please fill in all input forms!');
		}	
		
    };
	
	// this function is executed when somebody clicks on a list item next to the map
	// purpose: set current item of knockout model and call function which highlights
	this.setCurrentItem = function(searchStr, markerId) {

		this.model().currentItem(searchStr);
		
		this.highlightListEntry(markerId);
		
		showMarkerOnMap(markerId);
		
	};
	
	// this function is called when the filter input form is modified
	// Purpose: filter the list elements 
	this.filterList = function() {

		var filterInputRaw = this.model().listFilter();
		var filterInputUpperCase = filterInputRaw.toUpperCase();
		
		this.model().listFilter(filterInputRaw);
		
		var currentMarkersMap = this.model().markersMap();
		var numberOfMarkers = currentMarkersMap.length;
		
		var newMarkersMap = [];
		for(var i = 0; i < numberOfMarkers; i++){
			
			var markerUpperCaseName = currentMarkersMap[i].name.toUpperCase();
			
			if(markerUpperCaseName.includes(filterInputUpperCase)){
				newMarkersMap.push(currentMarkersMap[i]);
				markerGMapsObjects[i].setVisible(true);
			}else{
				markerGMapsObjects[i].setVisible(false);
			}
			
		}
		this.model().markersMapFiltered(newMarkersMap);
		
	};
	
	// highlight list item in marker list, given its id
	this.highlightListEntry = function(markerId){
		
		var allListItemsJQ = $('#markers-list').children();;
		var numMarkers = allListItemsJQ.length;
		for(var i=0; i<numMarkers; i++){
			$('#'+allListItemsJQ[i].id).removeClass('active');
		}
		
		var currentListItemJQ = $('#'+markerId);
		currentListItemJQ.addClass('active');
		
	}
	
	// Simulate a click on marker with given markerId 
	function showMarkerOnMap(markerId) {
		
		var numMarkers = markers.length;
		for(var i = 0; i<numMarkers; i++){
	
			if(markers[i].id == markerId){
				google.maps.event.trigger(markerGMapsObjects[i], 'click');
			}
		}
	}
	
	
}

var viewModel = new ViewModel();
ko.applyBindings(viewModel);

// Subscriber added to listFilter form. Whenever something changes in the filter, the filterList function is executed
viewModel.model().listFilter.subscribe(function(){
    viewModel.filterList();
});