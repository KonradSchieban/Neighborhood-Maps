var map;
var infowindow;
var markers = [];  
	
function initMap(positionInput, radiusInput, nearbySearchTypeInput) {
	
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
	var a = service.nearbySearch({
		location: positionInput,
		radius: radiusInput,
		type: [nearbySearchTypeInput]
	}, callback);
	
	console.log(a);
	
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
	
	this.coordinates = ko.observable(data.coordinates);	
	this.searchString = ko.observable(data.searchString);
	this.searchRadius = ko.observable(data.searchRadius);
	this.markersMap = ko.observableArray(data.markersMap);
	this.currentItem = ko.observable(data.currentItem);
	this.errorMessage = ko.observable(data.errorMessage);
	
	this.wikiResponse = ko.observable();
	ko.computed(function() {
		
		console.log("computing wikiResponse");
		// load wikipedia data
		
		if(this.currentItem()){
			
			console.log("actually computing wikiResponse");
			
			var wikiUrl = 'http://en.wikipedia.org/w/api.php?action=opensearch&search=' + this.currentItem() + '&format=json&callback=wikiCallback';
		
			// Whenever "pageIndex", "sortColumn", or "sortDirection" change, this function will re-run and issue
			// an Ajax request. When the Ajax request completes, assign the resulting value to "queryResults"
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

	
	this.wikiJSON = ko.computed(function(){
		
		var wikiJSONnew = [];
		
		console.log("computing wikiJSON");
		
		if(this.wikiResponse()){
			
			console.log("actually computing wikiJSON");
			console.log(this.wikiResponse);
			console.log(this.wikiResponse());
		
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
	
	this.model = ko.observable(new Model({
		coordinates: {lat: 42.33800859999999, lng: -71.1251311},
		searchString: "Cafe",
		searchRadius: 100,
		markersMap: markers,
		currentItem: "",
		errorMessage: ""
	})) ;
	
	this.search = function() {
		
		var inputSearchStrRaw = $('#searchLocation').val();
		var inputRadiusStrRaw = $('#searchRadius').val();
		var inputStringStrRaw = $('#searchString').val();
		
		this.errorMessage("");
		
		if(inputSearchStrRaw && inputRadiusStrRaw && inputStringStrRaw){
		
			inputSearchStrRaw.replace(/ /g, "+");
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
	
}

ko.applyBindings(new ViewModel());


