var map;
var infowindow;
var markers = [];
	
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
		zoom: 15
	});

	infowindow = new google.maps.InfoWindow();
	var service = new google.maps.places.PlacesService(map);
	service.nearbySearch({
		location: positionInput,
		radius: radiusInput,
		type: [nearbySearchTypeInput]
	}, callback);
		
}

function callback(results, status) {
	markers = [];
	if (status === google.maps.places.PlacesServiceStatus.OK) {
		for (var i = 0; i < results.length; i++) {
			createMarker(results[i]);
			markers.push(results[i]);
		}
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
		infowindow.setContent(place.name);
		infowindow.open(map, this);
	});
	
	function toggleBounce() {
		if (marker.getAnimation() !== null) {
			marker.setAnimation(null);
		} else {
			marker.setAnimation(google.maps.Animation.BOUNCE);
		}
	}
}


var Model = function(data){
	
	this.coordinates = ko.observable(data.coordinates);			//search input
	this.searchString = ko.observable(data.searchString);		//search input
	this.searchRadius = ko.observable(data.searchRadius);		//search input
	this.currentItem = ko.observable(data.currentItem);			//name of the list item which has been clicked on (used for Wikipedia search)
	this.errorMessage = ko.observable(data.errorMessage);		//empty string if search was good, poulated with error string otherwise
	this.markersMap = ko.observableArray(data.markersMap);
	this.markersMapFiltered = ko.observableArray(data.markersMapFiltered);
	this.listFilter = ko.observable(data.listFilter);
	
	this.wikiResponse = ko.observable();						//JSON reponse object which is returned by the Wikipedia API
	ko.computed(function() {
		
		console.log("computing wikiResponse");
		// load wikipedia data
		
		if(this.currentItem()){
			
			console.log("actually computing wikiResponse");
			
			var wikiUrl = 'http://en.wikipedia.org/w/api.php?action=opensearch&search=' + this.currentItem() + '&format=json&callback=wikiCallback';
		
			$.ajax({
				url: wikiUrl,
				dataType: "jsonp",
				jsonp: "callback",
				success: this.wikiResponse
			});
			
		}else{
			console.log("not actually computing wikiResponse");
		}
		
	}, this);

	
	this.wikiJSON = ko.computed(function(){						//JSON object which is contains the name, description and URL of all Wikipedia articles which are returned
		
		var wikiJSONnew = [];
		
		console.log("computing wikiJSON");
		
		if(this.wikiResponse()){
			
			console.log("actually computing wikiJSON");
		
			var nameList = this.wikiResponse()[1];
			var descriptionList = this.wikiResponse()[2];
			var urlList = this.wikiResponse()[3];
			
			for (var i = 0; i < nameList.length; i++) {
				
				var nameStr = nameList[i];
				var descriptionStr = descriptionList[i];
				var urlStr = urlList[i];
				
				var wikiJSONpart = {
					"name":nameStr,
					"description":descriptionStr,
					"url":urlStr
				}
				
				wikiJSONnew.push(wikiJSONpart);
			};
		}else{
			console.log("not actually computing wikiJSON");
		}
		
		console.log("wikiJSONnew:");
		console.log(wikiJSONnew);
		
		return wikiJSONnew;
	},this);
	
}


var ViewModel = function(){
	
	// Initialize model with default data
	this.model = ko.observable(new Model({
		coordinates: {lat: 42.33800859999999, lng: -71.1251311},
		searchString: "Restaurant",
		searchRadius: 100,
		markersMap: sampleData,
		markersMapFiltered: sampleData,
		currentItem: "",
		errorMessage: "",
		listFilter: ""
	})) ;
	
	// Function which is called when someone clicks the search button
	this.search = function() {
		
		var inputSearchStrRaw = $('#searchLocation').val();
		var inputRadiusStrRaw = $('#searchRadius').val();
		var inputStringStrRaw = $('#searchString').val();
		
		this.errorMessage("");
		
		if(inputSearchStrRaw && inputRadiusStrRaw && inputStringStrRaw){
			//all inputs are provided
		
			inputSearchStrRaw.replace(/ /g, "+"); // Maps API needs inputs separated with a "+", not with spaces
			this.searchString(inputSearchStrRaw);
			this.searchRadius(inputRadiusStrRaw);
			this.searchString(inputStringStrRaw);
			
			var mapsGetResponse = $.ajax({
				url: 'http://maps.google.com/maps/api/geocode/json?address=' + inputSearchStrRaw,
				success: function (result) {
					if (result.isOk == false) alert(result.message);
				},
				async: false
			});
			
			if(mapsGetResponse.responseJSON.status == "OK"){
				
				//if Google Maps finds something, update coordinates and markers observables
				this.coordinates(mapsGetResponse.responseJSON.results[0].geometry.location);
				this.markersMap(markers);
				this.markersMapFiltered(markers);
				
				//reload map...
				initMap(this.coordinates(), this.searchRadius(), this.searchString());
				
			}else{
				this.errorMessage("Did not find a Google Maps Location");
			}
		}else{
			this.errorMessage("Please fill in all input forms!");
		}	
		
    };
	
	// this function is executed when somebody clicks on a list item next to the map
	this.setCurrentItem = function(searchStr) {

		this.model().currentItem(searchStr);
		
	};
	
	// this function is called when the filter input form is modified
	// Purpose: filter the list elements 
	this.filterList = function() {

		var filterInputRaw = $('#filter').val();
		var filterInputUpperCase = filterInputRaw.toUpperCase();
		
		this.model().listFilter(filterInputRaw);
		
		var currentMarkersMap = this.model().markersMap();
		var numberOfMarkers = currentMarkersMap.length;
		
		var newMarkersMap = [];
		for(var i = 0; i < numberOfMarkers; i++){
			
			var markerUpperCaseName = currentMarkersMap[i].name.toUpperCase();
			
			if(markerUpperCaseName.includes(filterInputUpperCase)){
				newMarkersMap.push(currentMarkersMap[i]);
			}
			
		}
		this.model().markersMapFiltered(newMarkersMap);
		
	};
	
}

var viewModel = new ViewModel();
ko.applyBindings(viewModel);

viewModel.model().listFilter.subscribe(function(){
    viewModel.filterList();
});